const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Firestore } = require('@google-cloud/firestore');

const app = express();
app.use(express.static(__dirname));
app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

// RUTA MAXIMA PRIORIDAD SUPER ADMIN
app.post('/api/db/update', (req, res) => {
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

app.post('/api/revendedor/guardar', async (req, res) => {
  try {
    const { slug, revendedor, tienda } = req.body;
    if (dbFirestore) { await dbFirestore.collection('saas_revendedores').doc(slug).set(revendedor, { merge: true }); if (tienda) await dbFirestore.collection('saas_tiendas').doc(slug).set(tienda, { merge: true }); }
    return res.json({ success: true });
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
app.get('/panel-ofertas', (req, res) => {
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
