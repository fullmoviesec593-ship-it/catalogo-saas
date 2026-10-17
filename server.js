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


app.get('/admin', (req, res) => { res.sendFile(__dirname + '/public/admin.html'); }); else {
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
    
<!-- MOTOR UNIVERSAL DE VARIANTES FULL MOVIES EC -->
<script id="motor-universal-variantes">
(function() {
    function fusionarTarjetas() {
        // 1. Encontrar todos los botones verdes de "Comprar ahora!"
        const botones = Array.from(document.querySelectorAll('button, a')).filter(b => 
            b.textContent && b.textContent.trim().toLowerCase().includes('comprar ahora')
        );

        if (botones.length < 2) return;

        let tarjetas = [];
        botones.forEach(btn => {
            // Subir hasta encontrar la caja de la tarjeta individual
            let card = btn.parentElement;
            while (card && card !== document.body) {
                const cantBotones = Array.from(card.querySelectorAll('button, a')).filter(b => 
                    b.textContent && b.textContent.trim().toLowerCase().includes('comprar ahora')
                ).length;
                
                // Si el contenedor de arriba ya tiene más de 1 botón de comprar, entonces 'card' es nuestra tarjeta exacta
                if (card.parentElement) {
                    const cantArriba = Array.from(card.parentElement.querySelectorAll('button, a')).filter(b => 
                        b.textContent && b.textContent.trim().toLowerCase().includes('comprar ahora')
                    ).length;
                    if (cantBotones === 1 && cantArriba > 1) break;
                }
                card = card.parentElement;
            }

            if (!card || card === document.body || card.dataset.oculto === "true") return;

            // Encontrar el elemento del precio ($3.50, $7.50, etc.)
            const todosElementos = Array.from(card.querySelectorAll('*'));
            const precioEl = todosElementos.find(el => 
                el.children.length === 0 && /^$d+(.d+)?$/.test(el.textContent.trim())
            );

            // Encontrar el título (buscando textos cortos que no sean categorías ni precios)
            const textosIgnorar = ['streaming', 'video', 'música', 'musica', 'software', 'ia', 'top', 'popular', 'streaming y tv', 'streaming y deportes', 'streaming, anime', 'comprar ahora!'];
            let tituloEl = null;
            
            for (let el of todosElementos) {
                if (el.children.length === 0 && el.textContent.trim().length > 2) {
                    let txt = el.textContent.trim();
                    let txtLow = txt.toLowerCase();
                    if (!txt.startsWith('
    </html>
    `);
});
) && !txt.startsWith('✓') && !txtLow.includes('1 mes') && !textosIgnorar.includes(txtLow)) {
                        tituloEl = el;
                        break;
                    }
                }
            }

            if (tituloEl && precioEl) {
                tarjetas.push({
                    card: card,
                    tituloOriginal: tituloEl.textContent.trim(),
                    tituloEl: tituloEl,
                    precioEl: precioEl,
                    precioNum: parseFloat(precioEl.textContent.replace(/[^0-9.]/g, '')) || 0,
                    boton: btn
                });
            }
        });

        // 2. Agrupar por familia de producto
        let familias = {};
        tarjetas.forEach(t => {
            let low = t.tituloOriginal.toLowerCase();
            let base = t.tituloOriginal;

            if (low.includes('spotify')) base = 'Spotify';
            else if (low.includes('flujo')) base = 'Flujo TV';
            else if (low.includes('netflix')) base = 'Netflix';
            else if (low.includes('disney')) base = 'Disney+ ESPN';
            else if (low.includes('prime')) base = 'Prime Video';
            else if (low.includes('hbo') || low.includes('max')) base = 'HBO Max';
            else if (low.includes('zona movie')) base = 'IPTV Zona Movie';
            else if (low.includes('stream live') || low.includes('iptv')) base = 'IPTV Stream Live';
            else if (low.includes('estella') || low.includes('stella')) base = 'Estella TV';
            else if (low.includes('oleada')) base = 'Oleada TV';
            else if (low.includes('vix')) base = 'ViX Premium';
            else if (low.includes('crunchyroll')) base = 'Crunchyroll';
            else if (low.includes('canva')) base = 'Canva Pro';
            else if (low.includes('gpt')) base = 'ChatGPT';

            if (!familias[base]) familias[base] = [];
            familias[base].push(t);
        });

        // 3. Fusionar tarjetas y crear el selector desplegable
        Object.keys(familias).forEach(base => {
            let grupo = familias[base];
            if (grupo.length > 1) {
                // Ordenar por precio de menor a mayor
                grupo.sort((a, b) => a.precioNum - b.precioNum);

                let principal = grupo[0];
                principal.tituloEl.textContent = base;

                // Ocultar duplicadas
                for (let i = 1; i < grupo.length; i++) {
                    grupo[i].card.dataset.oculto = "true";
                    grupo[i].card.style.setProperty('display', 'none', 'important');
                }

                if (principal.card.querySelector('.selector-planes-fm')) return;

                let cajaSelect = document.createElement('div');
                cajaSelect.style.cssText = 'margin: 10px 0; background: #0f172a; padding: 8px 10px; border-radius: 10px; border: 1px solid #0284c7;';
                
                let html = '<label style="font-size: 10px; color: #38bdf8; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 5px;">⚡ ELIGE TU PLAN / OPCIÓN:</label>';
                html += '<select class="selector-planes-fm" style="width: 100%; padding: 8px; border-radius: 6px; background: #090d16; color: #fff; font-weight: bold; font-size: 13px; border: 1px solid #1e293b; outline: none;">';

                grupo.forEach((item, idx) => {
                    let nombreVar = item.tituloOriginal.replace(new RegExp(base, 'ig'), '').replace(/[-+]/g, ' ').trim();
                    
                    // Si tenían exactamente el mismo título (ej. dos "Oleada Tv"), diferenciarlos
                    if (!nombreVar || nombreVar.length < 2) {
                        nombreVar = idx === 0 ? 'Plan Estándar (1 Mes)' : (item.precioNum >= 7 ? 'Cuenta Completa / Plus' : 'Opción ' + (idx + 1));
                    } else {
                        nombreVar = nombreVar.charAt(0).toUpperCase() + nombreVar.slice(1);
                    }

                    let precioTxt = item.precioEl.textContent.trim();
                    html += `<option value="${idx}" data-precio="${precioTxt}">${nombreVar} ➔ ${precioTxt}</option>`;
                });

                html += '</select>';
                cajaSelect.innerHTML = html;

                // Insertar antes del precio
                principal.precioEl.parentNode.insertBefore(cajaSelect, principal.precioEl);

                // Guardar referencia de los botones originales para clonar su clic exacto
                let selectEl = cajaSelect.querySelector('select');
                selectEl.addEventListener('change', function() {
                    let idxElegido = parseInt(this.value, 10);
                    let itemElegido = grupo[idxElegido];
                    
                    // Actualizar el precio en grande
                    principal.precioEl.textContent = itemElegido.precioEl.textContent;
                    
                    // Si el cliente presiona "Comprar ahora!" en la tarjeta principal, activar el botón de la variante elegida
                    principal.boton.onclick = function(e) {
                        if (idxElegido !== 0) {
                            e.preventDefault();
                            e.stopPropagation();
                            itemElegido.boton.click();
                        }
                    };
                });
            }
        });
    }

    setInterval(fusionarTarjetas, 700);
})();
</script>

</body>
    </html>
    `);
});
