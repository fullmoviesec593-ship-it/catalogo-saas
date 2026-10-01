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

// CARGAR FIRESTORE
let dbFirestore = null;
try {
  const admin = require('firebase-admin');
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    dbFirestore = admin.firestore();
    console.log('✅ Firestore Cloud conectado exitosamente');
  } else if (fs.existsSync('./firebase-key.json')) {
    const serviceAccount = require('./firebase-key.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    dbFirestore = admin.firestore();
    console.log('✅ Firestore conectado vía firebase-key.json');
  }
} catch (e) {
  console.log('⚠️ Operando con persistencia local / fallback:', e.message);
}

const LOCAL_DB_PATH = path.join(__dirname, 'database.json');
function leerDBLocal() {
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try { return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8')); } catch (e) {}
  }
  return { revendedores: {}, tiendas: {}, stock: {}, clientes: {} };
}

function guardarDBLocal(data) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

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

      const snapStock = await dbFirestore.collection('saas_stock').get();
      const stock = {};
      snapStock.forEach(doc => { stock[doc.id] = doc.data(); });

      const snapClientes = await dbFirestore.collection('saas_clientes').get();
      const clientes = {};
      snapClientes.forEach(doc => { clientes[doc.id] = doc.data(); });

      return res.json({ revendedores, tiendas, stock, clientes });
    }
  } catch (e) {
    console.error('Error Firestore /api/db:', e);
  }
  return res.json(leerDBLocal());
});

// GUARDAR TIENDA
app.post('/api/tienda/guardar', async (req, res) => {
  try {
    const { slug, tienda } = req.body;
    if (!slug) return res.status(400).json({ error: 'Falta slug' });

    if (dbFirestore) {
      await dbFirestore.collection('saas_tiendas').doc(slug).set(tienda, { merge: true });
    }
    const local = leerDBLocal();
    if (!local.tiendas) local.tiendas = {};
    local.tiendas[slug] = tienda;
    guardarDBLocal(local);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GUARDAR / ACTUALIZAR REVENDEDOR
app.post('/api/revendedor/guardar', async (req, res) => {
  try {
    const { slug, revendedor, tienda } = req.body;
    if (!slug) return res.status(400).json({ error: 'Falta slug' });

    if (dbFirestore) {
      await dbFirestore.collection('saas_revendedores').doc(slug).set(revendedor, { merge: true });
      if (tienda) {
        await dbFirestore.collection('saas_tiendas').doc(slug).set(tienda, { merge: true });
      }
    }
    const local = leerDBLocal();
    if (!local.revendedores) local.revendedores = {};
    local.revendedores[slug] = revendedor;
    if (tienda) {
      if (!local.tiendas) local.tiendas = {};
      local.tiendas[slug] = tienda;
    }
    guardarDBLocal(local);

    return res.json({ success: true });
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
      await dbFirestore.collection('saas_stock').doc(slug).delete();
      await dbFirestore.collection('saas_clientes').doc(slug).delete();
    }
    const local = leerDBLocal();
    if (local.revendedores) delete local.revendedores[slug];
    if (local.tiendas) delete local.tiendas[slug];
    if (local.stock) delete local.stock[slug];
    if (local.clientes) delete local.clientes[slug];
    guardarDBLocal(local);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GUARDAR STOCK DE CUENTAS
app.post('/api/stock/guardar', async (req, res) => {
  try {
    const { slug, items } = req.body;
    if (!slug) return res.status(400).json({ error: 'Falta slug' });

    if (dbFirestore) {
      await dbFirestore.collection('saas_stock').doc(slug).set({ items: items || [] }, { merge: true });
    }
    const local = leerDBLocal();
    if (!local.stock) local.stock = {};
    local.stock[slug] = { items: items || [] };
    guardarDBLocal(local);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GUARDAR CLIENTES Y RECORDATORIOS
app.post('/api/clientes/guardar', async (req, res) => {
  try {
    const { slug, items } = req.body;
    if (!slug) return res.status(400).json({ error: 'Falta slug' });

    if (dbFirestore) {
      await dbFirestore.collection('saas_clientes').doc(slug).set({ items: items || [] }, { merge: true });
    }
    const local = leerDBLocal();
    if (!local.clientes) local.clientes = {};
    local.clientes[slug] = { items: items || [] };
    guardarDBLocal(local);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor SaaS ejecutándose en el puerto ${PORT}`);
});
