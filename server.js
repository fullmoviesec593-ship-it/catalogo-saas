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
try {
  const admin = require('firebase-admin');
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (parseErr) {
      console.error('❌ Error al parsear FIREBASE_SERVICE_ACCOUNT JSON:', parseErr.message);
    }

    if (serviceAccount && !admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      dbFirestore = admin.firestore();
      console.log('✅ [FIRESTORE CONECTADO]: Los datos se guardan permanentemente en la nube de Google.');
    }
  } else if (fs.existsSync('./firebase-key.json') && !admin.apps.length) {
    const serviceAccount = require('./firebase-key.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    dbFirestore = admin.firestore();
    console.log('✅ [FIRESTORE CONECTADO VÍA ARCHIVO]: firebase-key.json activo.');
  }
} catch (e) {
  console.error('⚠️ [ALERTA] Error iniciando Firebase Admin:', e.message);
}

if (!dbFirestore) {
  console.warn('⚠️ [ATENCIÓN] Firestore NO está conectado. Si estás en Render, asegúrate de configurar la Environment Variable FIREBASE_SERVICE_ACCOUNT.');
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
  } catch (e) {
    console.error('Error guardando en archivo local:', e.message);
  }
}

// ESTADO DEL SERVIDOR Y FIRESTORE
app.get('/api/status', (req, res) => {
  res.json({
    firestoreConectado: !!dbFirestore,
    timestamp: new Date().toISOString()
  });
});

// OBTENER BASE DE DATOS COMPLETA
app.get('/api/db', async (req, res) => {
  try {
    if (dbFirestore) {
      const snapRev = await dbFirestore.collection('saas_revendedores').get();
      const revendedores = {};
      snapRev.forEach(doc => { revendedores[doc.id] = doc.data(); });

      const snapTiendas = await dbFirestore.collection('saas_tiendas').get();
      const tiendas = {};
      snapTiendas.forEach(doc => { tiendas[doc.id] = doc.data(); });

      // Respaldar en copia local por si acaso
      guardarDBLocal({ revendedores, tiendas });

      return res.json({ revendedores, tiendas, firestore: true });
    }
  } catch (e) {
    console.error('❌ Error leyendo Firestore /api/db:', e.message);
  }
  return res.json({ ...leerDBLocal(), firestore: false });
});

// GUARDAR / ACTUALIZAR TIENDA
app.post('/api/tienda/guardar', async (req, res) => {
  try {
    const { slug, tienda } = req.body;
    if (!slug || !tienda) return res.status(400).json({ error: 'Datos incompletos' });

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
    console.error('Error en /api/tienda/guardar:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GUARDAR / ACTUALIZAR REVENDEDOR
app.post('/api/revendedor/guardar', async (req, res) => {
  try {
    const { slug, revendedor, tienda } = req.body;
    if (!slug || !revendedor) return res.status(400).json({ error: 'Datos incompletos' });

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
    console.error('Error en /api/revendedor/guardar:', err.message);
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

// DESCARGAR BACKUP EN JSON DIRECTO
app.get('/api/backup', async (req, res) => {
  try {
    if (dbFirestore) {
      const snapRev = await dbFirestore.collection('saas_revendedores').get();
      const revendedores = {};
      snapRev.forEach(doc => { revendedores[doc.id] = doc.data(); });

      const snapTiendas = await dbFirestore.collection('saas_tiendas').get();
      const tiendas = {};
      snapTiendas.forEach(doc => { tiendas[doc.id] = doc.data(); });

      res.setHeader('Content-disposition', 'attachment; filename=backup-saas-' + Date.now() + '.json');
      res.setHeader('Content-type', 'application/json');
      return res.send(JSON.stringify({ revendedores, tiendas }, null, 2));
    }
  } catch (e) {}
  res.json(leerDBLocal());
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor SaaS en ejecución permanente en el puerto ${PORT}`);
});
