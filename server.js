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

// INICIALIZACIÓN ROBUSTA DE FIRESTORE
let dbFirestore = null;
let errorDiagnostico = null;

try {
  const admin = require('firebase-admin');
  const secretPath = '/etc/secrets/firebase-key.json';

  let credenciales = null;

  // 1. Probar Secret File de Render
  if (fs.existsSync(secretPath)) {
    credenciales = require(secretPath);
    console.log('Detectado Secret File en /etc/secrets/firebase-key.json');
  } 
  // 2. Probar archivo local
  else if (fs.existsSync('./firebase-key.json')) {
    credenciales = require('./firebase-key.json');
    console.log('Detectado archivo local ./firebase-key.json');
  } 
  // 3. Probar variable en Base64 (la más confiable)
  else if (process.env.FIREBASE_KEY_BASE64) {
    const jsonStr = Buffer.from(process.env.FIREBASE_KEY_BASE64, 'base64').toString('utf8');
    credenciales = JSON.parse(jsonStr);
    console.log('Detectada variable FIREBASE_KEY_BASE64');
  }
  // 4. Probar variable estándar
  else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    credenciales = (typeof raw === 'string') ? JSON.parse(raw) : raw;
    console.log('Detectada variable FIREBASE_SERVICE_ACCOUNT');
  }

  if (credenciales && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credenciales)
    });
    dbFirestore = admin.firestore();
    console.log('✅ Firestore inicializado con éxito');
  } else if (!credenciales) {
    errorDiagnostico = "No se encontró ningún archivo ni variable de credenciales (revisar /etc/secrets o variables de Render).";
  }
} catch (e) {
  errorDiagnostico = e.message;
  console.error('Error inicializando Firestore:', e);
}

const LOCAL_DB_PATH = path.join(__dirname, 'database.json');
function leerDBLocal() {
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try { return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8')); } catch (e) {}
  }
  return { revendedores: {}, tiendas: {} };
}

function guardarDBLocal(data) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {}
}

// ESTADO Y DIAGNÓSTICO DETALLADO
app.get('/api/status', (req, res) => {
  res.json({
    firestoreConectado: !!dbFirestore,
    diagnosticoError: errorDiagnostico || "Sin errores reportados",
    archivosDetectados: {
      secretFile: fs.existsSync('/etc/secrets/firebase-key.json'),
      localFile: fs.existsSync('./firebase-key.json'),
      hasBase64Var: !!process.env.FIREBASE_KEY_BASE64,
      hasEnvVar: !!process.env.FIREBASE_SERVICE_ACCOUNT
    },
    timestamp: new Date().toISOString()
  });
});

// OBTENER TODOS LOS DATOS
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

// GUARDAR TIENDA
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

// GUARDAR REVENDEDOR
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

// ELIMINAR REVENDEDOR
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
  console.log(`🚀 Servidor SaaS iniciado en puerto ${PORT}`);
});
