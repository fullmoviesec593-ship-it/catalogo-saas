const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '.')));

// CONEXIÓN DIRECTA Y ROBUSTA A FIRESTORE
let dbFirestore = null;
let errorDiagnostico = null;

try {
  const admin = require('firebase-admin');
  
  if (fs.existsSync('./firebase-config.js')) {
    const creds = require('./firebase-config.js');
    
    // Verificación segura de inicialización sin evaluar .length de undefined
    const appsActivas = admin.apps || [];
    const appFirebase = appsActivas.length > 0 
      ? appsActivas[0] 
      : admin.initializeApp({
          credential: admin.credential.cert(creds)
        });

    dbFirestore = admin.firestore(appFirebase);
    console.log('✅ FIRESTORE CONECTADO EXITOSAMENTE');
  } else {
    errorDiagnostico = 'No se encontró el archivo firebase-config.js';
  }
} catch (e) {
  errorDiagnostico = e.message;
  console.error('Error cargando Firebase:', e);
}

app.get('/api/status', (req, res) => {
  res.json({
    firestoreConectado: !!dbFirestore,
    diagnostico: dbFirestore ? "Conectado y protegido" : errorDiagnostico,
    timestamp: new Date().toISOString()
  });
});

const LOCAL_DB_PATH = path.join(__dirname, 'database.json');
function leerDBLocal() {
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try { return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8')); } catch (e) {}
  }
  return { revendedores: {}, tiendas: {} };
}

function guardarDBLocal(data) {
  try { fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2)); } catch (e) {}
}

app.get('/api/db', async (req, res) => {
  try {
    if (dbFirestore) {
      const snapRev = await dbFirestore.collection('saas_revendedores').get();
      const revendedores = {};
      snapRev.forEach(doc => { revendedores[doc.id] = doc.data(); });

      const snapTiendas = await dbFirestore.collection('saas_tiendas').get();
      const tiendas = {};
      snapTiendas.forEach(doc => { tiendas[doc.id] = doc.data(); });

      guardarDBLocal({ revendedores, tiendas });
      return res.json({ revendedores, tiendas, firestore: true });
    }
  } catch (e) {
    console.error('Error Firestore /api/db:', e);
  }
  return res.json({ ...leerDBLocal(), firestore: false });
});

app.post('/api/tienda/guardar', async (req, res) => {
  try {
    const { slug, tienda } = req.body;
    if (!slug || !tienda) return res.status(400).json({ error: 'Faltan datos' });

    let guardadoNube = false;
    if (dbFirestore) {
      await dbFirestore.collection('saas_tiendas').doc(slug).set(tienda, { merge: true });
      guardadoNube = true;
    }

    const local = leerDBLocal();
    if (!local.tiendas) local.tiendas = {};
    local.tiendas[slug] = { ...(local.tiendas[slug] || {}), ...tienda };
    guardarDBLocal(local);

    return res.json({ success: true, guardadoNube });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/revendedor/guardar', async (req, res) => {
  try {
    const { slug, revendedor, tienda } = req.body;
    if (!slug || !revendedor) return res.status(400).json({ error: 'Faltan datos' });

    let guardadoNube = false;
    if (dbFirestore) {
      await dbFirestore.collection('saas_revendedores').doc(slug).set(revendedor, { merge: true });
      if (tienda) {
        await dbFirestore.collection('saas_tiendas').doc(slug).set(tienda, { merge: true });
      }
      guardadoNube = true;
    }

    const local = leerDBLocal();
    if (!local.revendedores) local.revendedores = {};
    local.revendedores[slug] = { ...(local.revendedores[slug] || {}), ...revendedor };
    if (tienda) {
      if (!local.tiendas) local.tiendas = {};
      local.tiendas[slug] = { ...(local.tiendas[slug] || {}), ...tienda };
    }
    guardarDBLocal(local);

    return res.json({ success: true, guardadoNube });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/revendedor/eliminar', async (req, res) => {
  try {
    const { slug } = req.body;
    if (!slug) return res.status(400).json({ error: 'Falta slug' });

    if (dbFirestore) {
      await dbFirestore.collection('saas_revendedores').doc(slug).delete();
      await dbFirestore.collection('saas_tiendas').doc(slug).delete();
    }
    const local = leerDBLocal();
    if (local.revendedores) delete local.revendedores[slug];
    if (local.tiendas) delete local.tiendas[slug];
    guardarDBLocal(local);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor SaaS ejecutándose en puerto ${PORT}`);
});
