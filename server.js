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

// Ruta garantizada al Panel Revendedor
app.get('/admin', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    const fs = require('fs');
    const path = require('path');
    let file = path.join(__dirname, 'public', 'admin.html');
    if (!fs.existsSync(file)) file = path.join(__dirname, 'admin.html');
    res.sendFile(file);
});


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







