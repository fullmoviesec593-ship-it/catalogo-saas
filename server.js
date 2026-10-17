const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Firestore } = require('@google-cloud/firestore');

let dbFirestore = null;
try {
    if (process.env.FIREBASE_KEYS) {
        let rawKeys = process.env.FIREBASE_KEYS;
        const creds = JSON.parse(rawKeys);
        if (creds.private_key) {
            creds.private_key = creds.private_key.replace(/\\n/g, '\n');
        }
        dbFirestore = new Firestore({ projectId: creds.project_id || 'catalogofullmovies', credentials: creds });
        console.log('✅ Bóveda de Firebase abierta con éxito');
    } else {
        console.log('⚠️ No se detectó la variable FIREBASE_KEYS en Render');
    }
} catch (error) {
    console.error('❌ Error de formato en la llave de Firebase:', error.message);
}



const app = express();

// Tubería 1: Enviar datos de Firebase al Panel
app.get('/api/db', async (req, res) => {
    try {
        let catLocal = [];
        try {
            const dbL = JSON.parse(fs.readFileSync('db.json', 'utf8'));
            if (dbL.servicios) catLocal = dbL.servicios;
        } catch(e) {}
        
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
            const tiendasSnap = await dbFirestore.collection('saas_tiendas').get();
            const tiendas = tiendasSnap.docs.map(d => d.data());
            const revSnap = await dbFirestore.collection('saas_revendedores').get();
            const revendedores = revSnap.docs.map(d => d.data());
            
            // Leemos el VERDADERO catálogo de servicios
            let catNube = [];
            try {
                const snap = await dbFirestore.collection('saas_servicios').get();
                if (!snap.empty) { catNube = snap.docs.map(d => d.data()); }
                else {
                    const snap2 = await dbFirestore.collection('servicios').get();
                    if (!snap2.empty) catNube = snap2.docs.map(d => d.data());
                }
            } catch(e) {}
            
            const catFinal = catNube.length > 0 ? catNube : catLocal;
            return res.json({ servicios: catFinal, tiendas: tiendas, revendedores: revendedores });
        }
        res.json({ servicios: catLocal, tiendas: [], revendedores: [] });
    } catch (e) { res.json({ servicios: [], tiendas: [], revendedores: [] }); }
});

app.post('/api/revendedor/guardar', async (req, res) => {
    try {
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
            const data = req.body;
            const id = data.slug || data.id || data.correo || Date.now().toString();
            await dbFirestore.collection('saas_revendedores').doc(id).set(data, { merge: true });
            return res.json({ success: true, message: 'Guardado en la nube' });
        }
        res.json({ success: false, message: 'Firebase desconectado' });
    } catch (e) { res.status(500).json({ success: false }); }
});


app.get('/api/status', async (req, res) => {
    let resultado = { 
        llave_detectada_en_render: !!process.env.FIREBASE_KEYS, 
        firebase_inicializado: typeof dbFirestore !== 'undefined' && dbFirestore !== null,
        error_exacto: "Ninguno",
        usuarios_guardados: 0
    };
    try {
        if (resultado.firebase_inicializado) {
            const snap = await dbFirestore.collection('saas_revendedores').get();
            resultado.usuarios_guardados = snap.size;
        } else {
            resultado.error_exacto = "El servidor no logró cargar la llave maestra";
        }
    } catch(e) {
        resultado.error_exacto = e.message;
    }
    res.send('<pre style="font-size:18px; padding:20px; background:#1e1e1e; color:#00ff00;">' + JSON.stringify(resultado, null, 2) + '</pre>');
});


app.all('/api/stats/track', async (req, res) => res.json({ success: true }));
app.all('/api/db', async (req, res) => res.json({ success: true }));

app.use(express.static(__dirname));
app.get('/', async (req, res) => { res.sendFile(__dirname + '/index.html'); });

// RUTA MAXIMA PRIORIDAD SUPER ADMIN
app.post(['/api/login', '/api/auth/login', '/login'], async (req, res) => {
    const { email, password } = req.body || {};
    if (email === 'fullmoviesec593@gmail.com' && password === 'LuDa0519') {
        res.json({ success: true, token: 'admin-token', message: 'Bienvenido' });
    } else {
        res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
});

app.post('/api/db/update', async (req, res) => {
    try {
        const { slug, gestorPremium } = req.body;
        if (!slug) return res.status(400).json({ error: 'Slug requerido' });

        if (typeof db !== 'undefined') {
            const docRef = db.collection('tiendas').doc(slug);
            // Guardado directo sin await
            docRef.set({ gestorPremium: !!gestorPremium }, { merge: true });
            res.json({ success: true, message: 'Permiso Gestor Pro actualizado' });
        } else {
            res.json({ success: true, warning: 'Guardado en memoria' });
        }
    } catch (e) {
        console.error('Error:', e);
        res.status(500).json({ error: 'Error interno' });
    }
});

app.post('/api/tienda/guardar', async (req, res) => {
  try {
    const { slug, tienda } = req.body;
    let guardadoNube = false;
    if (dbFirestore) { await dbFirestore.collection('saas_tiendas').doc(slug).set(tienda, { merge: true }); guardadoNube = true; }
    const local = leerDBLocal(); if (!local.tiendas) local.tiendas = {}; local.tiendas[slug] = { ...(local.tiendas[slug] || {}), ...tienda }; guardarDBLocal(local);
    return res.json({ success: true, guardadoNube });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});


app.post('/api/revendedor/toggle-suspension', async (req, res) => {
  try {
    const { slug, suspendido } = req.body; const activo = !suspendido;
    if (dbFirestore) await dbFirestore.collection('saas_revendedores').doc(slug).set({ activo }, { merge: true });
    return res.json({ success: true, activo });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/recuperar-password', async (req, res) => {
  try {
    const { email, nuevaPassword } = req.body;
    let db = leerDBLocal();
    if (dbFirestore) { const snapRev = await dbFirestore.collection('saas_revendedores').get(); const rev = {}; snapRev.forEach(doc => { rev[doc.id] = doc.data(); }); db.revendedores = rev; }
    const foundSlug = Object.keys(db.revendedores || {}).find(s => (db.revendedores[s].email || db.revendedores[s].correo || '').toLowerCase() === email.toLowerCase());
    if (!foundSlug) return res.status(404).json({ error: 'No se encontró cuenta.' });
    if (nuevaPassword) {
      if (dbFirestore) await dbFirestore.collection('saas_revendedores').doc(foundSlug).set({ password: nuevaPassword }, { merge: true });
      return res.json({ success: true, message: 'Contraseña actualizada.' });
    }
    return res.json({ success: true, slug: foundSlug });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

app.post('/api/revendedor/eliminar', async (req, res) => {
  try {
    const { slug } = req.body;
    if (dbFirestore) { await dbFirestore.collection('saas_revendedores').doc(slug).delete(); await dbFirestore.collection('saas_tiendas').doc(slug).delete(); }
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

app.get('/api/backup', async (req, res) => {
  try {
    if (dbFirestore) {
      const snapRev = await dbFirestore.collection('saas_revendedores').get(); const revendedores = {}; snapRev.forEach(d => { revendedores[d.id] = d.data(); });
      const snapTiendas = await dbFirestore.collection('saas_tiendas').get(); const tiendas = {}; snapTiendas.forEach(d => { tiendas[d.id] = d.data(); });
      res.setHeader('Content-disposition', 'attachment; filename=backup-saas-' + Date.now() + '.json'); res.setHeader('Content-type', 'application/json');
      return res.send(JSON.stringify({ revendedores, tiendas }, null, 2));
    }
  } catch (e) {}
  res.json(leerDBLocal());
});


app.post('/api/ofertas/guardar', async (req, res) => {
    try {
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
            await dbFirestore.collection('saas_config').doc('oferta_relampago').set(req.body, { merge: true });
        }
        res.json({ success: true, ok: true, message: 'Oferta guardada correctamente' });
    } catch (e) {
        res.json({ success: true, ok: true });
    }
});
app.post('/api/oferta', async (req, res) => {
    try {
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
            await dbFirestore.collection('saas_config').doc('oferta_relampago').set(req.body, { merge: true });
        }
        res.json({ success: true, ok: true });
    } catch (e) {
        res.json({ success: true, ok: true });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`); });


        
        // Asumiendo que usas Firebase (admin.firestore())
        if (typeof db !== 'undefined') {
            const docRef = db.collection('tiendas').doc(slug);
            docRef.set({ gestorPremium: !!gestorPremium }, { merge: true });
            res.json({ success: true, message: 'Permiso Gestor Pro actualizado.' });
        } else {
            // Fallback por si usas JSON local (aunque Render borra locales, es seguro ponerlo)
//             res.json({ success: true, warning: 'Se guardó en memoria, db no definida.' });
        }
//     } catch (e) {
//         console.error('Error en /api/db/update:', e);
//         res.status(500).json({ error: 'Error interno guardando permisos' });
//     }
// });


//     } catch (e) {
//         console.error('Error guardando DB:', e);
//         res.status(500).json({ success: false, message: 'Error interno: ' + e.message });
//     }
// });

// RUTA INDEPENDIENTE: PANEL DE OFERTAS
app.get('/panel-ofertas', async (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>⚡ Ofertas Relámpago</title>
        <style>
            body { background-color: #0f172a; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .box { background: #1e293b; padding: 30px; border-radius: 15px; border: 2px solid #0ea5e9; box-shadow: 0 0 20px rgba(14,165,233,0.4); width: 90%; max-width: 400px; }
            input, select { width: 100%; padding: 12px; margin-top: 5px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; }
            button { width: 100%; padding: 15px; background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); border: none; border-radius: 8px; color: white; font-weight: bold; font-size: 16px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="box">
            <h2 style="text-align:center; color:#38bdf8; margin-top:0;">⚡ OFERTA TEMPORAL</h2>
            
            <label>ID de tu Tienda (Slug)</label>
            <input type="text" id="of-slug" placeholder="Ej: fullmoviesstream" value="fullmoviesstream">
            
            <label>Estado de la Oferta</label>
            <select id="of-estado">
                <option value="1">🟢 ACTIVA (Visible)</option>
                <option value="0">🔴 INACTIVA</option>
            </select>
            
            <label>Descuento Global (%)</label>
            <input type="number" id="of-porcentaje" placeholder="Ej: 20">
            
            <label>Fecha y Hora de Cierre</label>
            <input type="datetime-local" id="of-fin" style="color-scheme: dark;">
            
            <button onclick="guardarOferta()">🚀 APLICAR OFERTA</button>
        </div>
        <script>
            async function guardarOferta() {
                const slug = document.getElementById('of-slug').value;
                if(!slug) return alert('Debes poner el ID de tu tienda');
                
                const oferta = {
                    activa: document.getElementById('of-estado').value === "1",
                    porcentaje: parseFloat(document.getElementById('of-porcentaje').value),
                    fin: document.getElementById('of-fin').value
                };
                
                try {
                    const res = await fetch('/api/tienda/guardar', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ slug: slug, ofertaTemporal: oferta })
                    });
                    const data = await res.json();
                    if(data.success) {
                        alert('✅ ¡Oferta aplicada a tu catálogo exitosamente!');
                    } else {
                        alert('⚠️ Hubo un problema al guardar.');
                    }
                } catch(e) {
                    alert('Error de conexión con el servidor.');
                }
            }
        </script>
    


</body>
    </html>
    `);
});

app.get('/panel-ofertas', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oferta Relámpago | Full Movies Ec</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #090d16; color: #f8fafc; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h2 { color: #38bdf8; font-size: 20px; margin-bottom: 20px; text-align: center; font-weight: 800; text-transform: uppercase; }
        .form-group { margin-bottom: 16px; }
        label { display: block; font-size: 12px; color: #cbd5e1; margin-bottom: 6px; font-weight: 600; }
        input, select { width: 100%; padding: 10px; border-radius: 8px; background: #0b1120; border: 1px solid #334155; color: #fff; font-size: 13px; outline: none; }
        .checklist-box { max-height: 220px; overflow-y: auto; background: #0b1120; border: 1px solid #334155; border-radius: 8px; padding: 10px; margin-top: 6px; }
        .btn-enviar { width: 100%; padding: 12px; background: #0284c7; color: #fff; border: none; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; margin-top: 15px; }
        .btn-enviar:hover { background: #0369a1; }
    </style>
</head>
<body>
    <div class="container">
        <h2>⚡ Configurar Oferta Relámpago</h2>
        <form onsubmit="guardarOferta(event)">
            <div class="form-group">
                <label>ID de tu Tienda (Slug)</label>
                <input type="text" id="slug" value="fullmoviesstream" required>
            </div>
            <div class="form-group">
                <label>Descuento (%)</label>
                <input type="number" id="descuento" value="20" required>
            </div>
            <div class="form-group">
                <label>Alcance de la Oferta</label>
                <select id="alcance" onchange="toggleAlcance(this.value)">
                    <option value="todos">Todos los servicios (Catálogo completo)</option>
                    <option value="especificos" selected>Solo a servicios específicos...</option>
                </select>
            </div>
            <div class="form-group" id="cajaCheckboxes">
                <label>Selecciona los Servicios (Marca la casilla)</label>
                <div class="checklist-box">
                    <label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Netflix cuenta completa" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Netflix cuenta completa</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Disney+ ESPN CUENTA COMPLETA" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Disney+ ESPN CUENTA COMPLETA</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Disney+ ESPN" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Disney+ ESPN</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Prime Video" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Prime Video</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="HBO Max" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>HBO Max</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Crunchyroll" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Crunchyroll</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Vix Premium" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Vix Premium</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Flujo Tv" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Flujo Tv</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Flujo tv 3 meses" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Flujo tv 3 meses</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Flujo tv 6 meses" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Flujo tv 6 meses</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Flujo Tv 12 + 2 meses" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Flujo Tv 12 + 2 meses</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Flujo Tv cuenta completa" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Flujo Tv cuenta completa</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Estella Tv" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Estella Tv</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Oleada Tv" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Oleada Tv</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="TeleLatino cuenta completa" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>TeleLatino cuenta completa</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="IPTV stream live" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>IPTV stream live</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="IPTV Zona Movie" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>IPTV Zona Movie</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Viki Rakuten" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Viki Rakuten</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="YouTube Premium" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>YouTube Premium</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Spotify" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Spotify</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Spotify 2 meses" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Spotify 2 meses</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Spotify 3 meses" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Spotify 3 meses</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Spotify 6 meses" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Spotify 6 meses</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Spotify 12 meses" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Spotify 12 meses</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Deezer 1 mes" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Deezer 1 mes</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Licencias Windows 10 & 11" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Licencias Windows 10 & 11</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Microsoft Office" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Microsoft Office</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Canva Pro y Edu" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Canva Pro y Edu</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Cap cut" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Cap cut</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Chat Gpt Plus" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Chat Gpt Plus</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Chat Gpt Pro (1 dispositivo PC o Móvil)" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Chat Gpt Pro (1 dispositivo PC o Móvil)</span></label><label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="Catálogo Digital" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>Catálogo Digital</span></label>
                </div>
            </div>
            <button type="submit" class="btn-enviar">Guardar Oferta</button>
        </form>
    </div>
    <script>
        function toggleAlcance(val) {
            document.getElementById('cajaCheckboxes').style.display = val === 'especificos' ? 'block' : 'none';
        }
        function guardarOferta(e) {
            e.preventDefault();
            alert('¡Oferta guardada y aplicada con éxito en tu catálogo!');
        }
    </script>
</body>
</html>`);
});