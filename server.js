const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Firestore } = require('@google-cloud/firestore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, '.'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.json')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// RUTA RAÍZ EXPLÍCITA PARA EVITAR EL "Cannot GET /"
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let dbFirestore = null;
let errorDiagnostico = null;

try {
  let creds = null;
  if (fs.existsSync('./firebase-config.js')) creds = require('./firebase-config.js');
  if (creds && creds.project_id && creds.client_email && creds.private_key) {
    dbFirestore = new Firestore({ projectId: creds.project_id, credentials: { client_email: creds.client_email, private_key: creds.private_key } });
    console.log('✅ FIRESTORE NATIVO CONECTADO');
  } else { errorDiagnostico = 'Credenciales no encontradas'; }
} catch (e) { errorDiagnostico = e.message; }

const LOCAL_DB_PATH = path.join(__dirname, 'database.json');
function leerDBLocal() {
  if (fs.existsSync(LOCAL_DB_PATH)) { try { return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8')); } catch (e) {} }
  return { revendedores: {}, tiendas: {} };
}
function guardarDBLocal(data) { try { fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2)); } catch (e) {} }

// MÓDULO 1: RASTREAR ESTADÍSTICAS
app.post('/api/stats/track', async (req, res) => {
  try {
    const { slug, tipo, producto } = req.body;
    if (!slug || !dbFirestore) return res.json({ success: false });

    const ref = dbFirestore.collection('saas_estadisticas').doc(slug);
    const doc = await ref.get();
    let data = doc.exists ? doc.data() : { vistas: 0, clics: 0, top: {} };

    if (tipo === 'vista') data.vistas = (data.vistas || 0) + 1;
    if (tipo === 'clic') {
      data.clics = (data.clics || 0) + 1;
      if (producto) {
        if (!data.top) data.top = {};
        data.top[producto] = (data.top[producto] || 0) + 1;
      }
    }
    await ref.set(data, { merge: true });
    return res.json({ success: true });
  } catch (e) { return res.json({ success: false }); }
});

app.get('/api/stats/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    if (dbFirestore) {
      const doc = await dbFirestore.collection('saas_estadisticas').doc(slug).get();
      if (doc.exists) return res.json(doc.data());
    }
    return res.json({ vistas: 0, clics: 0, top: {} });
  } catch (e) { return res.json({ vistas: 0, clics: 0, top: {} }); }
});

app.get('/manifest.json', async (req, res) => {
  const slug = req.query.tienda || ''; let nombreTienda = "Catálogo Oficial";
  try {
    let db = leerDBLocal();
    if (dbFirestore && slug) { const docTienda = await dbFirestore.collection('saas_tiendas').doc(slug).get(); if (docTienda.exists && docTienda.data().nombre) nombreTienda = docTienda.data().nombre; }
    else if (slug && db.tiendas && db.tiendas[slug]) nombreTienda = db.tiendas[slug].nombre || nombreTienda;
  } catch (err) {}
  const startUrl = slug ? `/?tienda=${encodeURIComponent(slug)}&source=pwa` : `/?source=pwa`;
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.json({ name: nombreTienda, short_name: nombreTienda.substring(0, 12), start_url: startUrl, display: "standalone", background_color: "#090a0f", theme_color: "#ff6a00", orientation: "portrait", icons: [{ src: "https://cdn-icons-png.flaticon.com/512/3074/3074767.png", sizes: "192x192", type: "image/png" }, { src: "https://cdn-icons-png.flaticon.com/512/3074/3074767.png", sizes: "512x512", type: "image/png" }] });
});

app.get('/api/status', async (req, res) => {
  let pruebaEscritura = false;
  if (dbFirestore) { try { await dbFirestore.collection('_test').doc('ping').set({ ok: true, t: Date.now() }); pruebaEscritura = true; } catch (err) {} }
  res.json({ firestoreConectado: !!dbFirestore && pruebaEscritura, diagnostico: pruebaEscritura ? "Conectado" : errorDiagnostico });
});

app.get('/api/db', async (req, res) => {
  try {
    if (dbFirestore) {
      const snapRev = await dbFirestore.collection('saas_revendedores').get(); const revendedores = {}; snapRev.forEach(doc => { revendedores[doc.id] = doc.data(); });
      const snapTiendas = await dbFirestore.collection('saas_tiendas').get(); const tiendas = {}; snapTiendas.forEach(doc => { tiendas[doc.id] = doc.data(); });
      guardarDBLocal({ revendedores, tiendas }); return res.json({ revendedores, tiendas, firestore: true });
    }
  } catch (e) {}
  return res.json({ ...leerDBLocal(), firestore: false });
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

app.listen(PORT, () => { console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`); });
