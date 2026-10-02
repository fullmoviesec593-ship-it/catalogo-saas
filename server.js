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

// CLIENTE NATIVO DE FIRESTORE
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
    errorDiagnostico = 'Credenciales no encontradas';
  }
} catch (e) {
  errorDiagnostico = e.message;
  console.error('Error al inicializar Firestore:', e);
}

// ESTADO
app.get('/api/status', async (req, res) => {
  let pruebaEscritura = false;
  if (dbFirestore) {
    try {
      await dbFirestore.collection('_test').doc('ping').set({ ok: true, t: Date.now() });
      pruebaEscritura = true;
    } catch (err) {
      errorDiagnostico = err.message;
    }
  }

  res.json({
    firestoreConectado: !!dbFirestore && pruebaEscritura,
    diagnostico: (dbFirestore && pruebaEscritura) ? "Conectado y escribiendo con éxito en Google Cloud" : errorDiagnostico,
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

// ALTERNAR SUSPENSIÓN POR FALTA DE PAGO DIRECTA
app.post('/api/revendedor/toggle-suspension', async (req, res) => {
  try {
    const { slug, suspendido } = req.body;
    if (!slug) return res.status(400).json({ error: 'Falta slug' });

    const activo = !suspendido;
    if (dbFirestore) {
      await dbFirestore.collection('saas_revendedores').doc(slug).set({ activo }, { merge: true });
    }

    const local = leerDBLocal();
    if (local.revendedores && local.revendedores[slug]) {
      local.revendedores[slug].activo = activo;
      guardarDBLocal(local);
    }

    return res.json({ success: true, activo });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// RECUPERAR CONTRASEÑA CON TOKEN / CÓDIGO TEMPORAL
app.post('/api/auth/recuperar-password', async (req, res) => {
  try {
    const { email, nuevaPassword } = req.body;
    if (!email) return res.status(400).json({ error: 'Falta correo' });

    let db = leerDBLocal();
    if (dbFirestore) {
      const snapRev = await dbFirestore.collection('saas_revendedores').get();
      const revendedores = {};
      snapRev.forEach(doc => { revendedores[doc.id] = doc.data(); });
      db.revendedores = revendedores;
    }

    const revendedores = db.revendedores || {};
    const foundSlug = Object.keys(revendedores).find(slug => {
      const r = revendedores[slug];
      return (r.email || r.correo || '').toLowerCase() === email.toLowerCase();
    });

    if (!foundSlug) {
      return res.status(404).json({ error: 'No se encontró ninguna cuenta asociada a este correo electrónico.' });
    }

    if (nuevaPassword) {
      if (dbFirestore) {
        await dbFirestore.collection('saas_revendedores').doc(foundSlug).set({ password: nuevaPassword }, { merge: true });
      }
      if (db.revendedores && db.revendedores[foundSlug]) {
        db.revendedores[foundSlug].password = nuevaPassword;
        guardarDBLocal(db);
      }
      return res.json({ success: true, message: '¡Tu contraseña ha sido restablecida exitosamente!' });
    }

    return res.json({ success: true, slug: foundSlug, message: 'Correo verificado. Procede a ingresar la nueva clave.' });
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
  console.log(`🚀 Servidor SaaS ejecutándose en puerto ${PORT}`);
});
