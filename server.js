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
app.use(express.static(path.join(__dirname, '.')));

// CLIENTE NATIVO DIRECTO DE FIRESTORE
let dbFirestore = null;
let errorDiagnostico = null;

try {
  let creds = null;
  if (fs.existsSync('./firebase-config.js')) {
    creds = require('./firebase-config.js');
  }

  if (creds && creds.project_id && creds.client_email && creds.private_key) {
    dbFirestore = new Firestore({
      projectId: creds.project_id,
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key
      }
    });
    console.log('✅ FIRESTORE NATIVO CONECTADO');
  } else {
    errorDiagnostico = 'Las credenciales en firebase-config.js están incompletas o no existen.';
  }
} catch (e) {
  errorDiagnostico = e.message;
  console.error('Error al inicializar Firestore:', e);
}

// ESTADO DE CONEXIÓN
app.get('/api/status', async (req, res) => {
  let pruebaEscritura = false;
  if (dbFirestore) {
    try {
      await dbFirestore.collection('_test').doc('ping').set({ ok: true, t: Date.now() });
      pruebaEscritura = true;
    } catch (err) {
      errorDiagnostico = 'Fallo de acceso a la base de datos: ' + err.message;
    }
  }

  res.json({
    firestoreConectado: !!dbFirestore && pruebaEscritura,
    diagnostico: (dbFirestore && pruebaEscritura) ? "Conectado y escribiendo con éxito en Google Cloud" : errorDiagnostico,
    timestamp: new Date().toISOString()
  });
});

// BASE LOCAL DE RESPALDO
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

// OBTENER BASE DE DATOS
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
    console.error('Error leyendo Firestore:', e);
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
  console.log(`🚀 Servidor SaaS ejecutándose en puerto ${PORT}`);
});
