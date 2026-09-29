const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

let dbFirestore = null;
let firebaseStatus = "Variable no configurada";

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    if (raw.startsWith("'") && raw.endsWith("'")) {
      raw = raw.slice(1, -1);
    }
    const serviceAccount = JSON.parse(raw);

    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount)
      });
    }

    dbFirestore = getFirestore();
    firebaseStatus = "Conectado exitosamente";
    console.log(">>> FIRESTORE MULTI-TENANT CONECTADO <<<");
  } catch (err) {
    firebaseStatus = "Error de conexion: " + err.message;
    console.error("Error al inicializar Firebase:", err.message);
  }
}

app.get('/api/status', (req, res) => {
  res.json({
    firebase_conectado: !!dbFirestore,
    detalle: firebaseStatus,
    tiempo: new Date().toISOString()
  });
});

function readLocalDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { superadmin: {}, revendedores: {}, tiendas: {} };
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    return { superadmin: {}, revendedores: {}, tiendas: {} };
  }
}

function writeLocalDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}
}

// OBTENER BASE DE DATOS
app.get('/api/db', async (req, res) => {
  if (dbFirestore) {
    try {
      const snapUsers = await dbFirestore.collection('saas_revendedores').get();
      const revendedores = {};
      snapUsers.forEach(doc => {
        revendedores[doc.id] = doc.data();
      });

      const snapTiendas = await dbFirestore.collection('saas_tiendas').get();
      const tiendas = {};
      snapTiendas.forEach(doc => {
        tiendas[doc.id] = doc.data();
      });

      const docConfig = await dbFirestore.collection('saas_data').doc('superadmin').get();
      const superadmin = docConfig.exists ? docConfig.data() : { correo: "admin@fullmovies.ec", clave: "superadmin2026" };

      return res.json({
        superadmin,
        revendedores,
        usuarios: revendedores,
        tiendas
      });
    } catch (err) {
      console.error("Error leyendo Firestore:", err.message);
    }
  }
  const local = readLocalDB();
  local.usuarios = local.revendedores;
  res.json(local);
});

// GUARDAR DATOS DE LA TIENDA DEL REVENDEDOR (ATÓMICO Y DIRECTO)
app.post('/api/tienda/guardar', async (req, res) => {
  try {
    const { slug, tienda } = req.body;
    if (!slug || !tienda) {
      return res.status(400).json({ error: "Faltan parámetros requeridos (slug o tienda)" });
    }

    // Respaldo local
    const local = readLocalDB();
    if (!local.tiendas) local.tiendas = {};
    local.tiendas[slug] = Object.assign(local.tiendas[slug] || {}, tienda);
    
    // Si viene nombre o whatsapp, sincronizar con el revendedor también
    if (!local.revendedores) local.revendedores = {};
    if (local.revendedores[slug]) {
      if (tienda.nombre) local.revendedores[slug].nombre = tienda.nombre;
      if (tienda.whatsapp) local.revendedores[slug].whatsapp = tienda.whatsapp;
    }
    writeLocalDB(local);

    // Guardado persistente individual en Firestore
    if (dbFirestore) {
      await dbFirestore.collection('saas_tiendas').doc(slug).set(tienda, { merge: true });
      
      const updateRev = {};
      if (tienda.nombre) updateRev.nombre = tienda.nombre;
      if (tienda.whatsapp) updateRev.whatsapp = tienda.whatsapp;
      if (Object.keys(updateRev).length > 0) {
        await dbFirestore.collection('saas_revendedores').doc(slug).set(updateRev, { merge: true });
      }
      console.log(`[Firestore] Tienda guardada exitosamente: ${slug}`);
    }

    res.json({ success: true, slug });
  } catch (err) {
    console.error("Error guardando tienda:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GUARDAR REVENDEDOR (SUPERADMIN)
app.post('/api/revendedor/guardar', async (req, res) => {
  try {
    const { slug, revendedor, tienda } = req.body;
    if (!slug) return res.status(400).json({ error: "Falta slug" });

    const local = readLocalDB();
    if (!local.revendedores) local.revendedores = {};
    if (!local.tiendas) local.tiendas = {};
    local.revendedores[slug] = revendedor;
    if (tienda) local.tiendas[slug] = tienda;
    writeLocalDB(local);

    if (dbFirestore) {
      await dbFirestore.collection('saas_revendedores').doc(slug).set(revendedor, { merge: true });
      if (tienda) {
        await dbFirestore.collection('saas_tiendas').doc(slug).set(tienda, { merge: true });
      }
    }

    res.json({ success: true, slug });
  } catch (err) {
    console.error("Error guardando revendedor:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ELIMINAR REVENDEDOR (SUPERADMIN)
app.post('/api/revendedor/eliminar', async (req, res) => {
  try {
    const { slug } = req.body;
    if (!slug) return res.status(400).json({ error: "Falta slug" });

    const local = readLocalDB();
    if (local.revendedores) delete local.revendedores[slug];
    if (local.tiendas) delete local.tiendas[slug];
    writeLocalDB(local);

    if (dbFirestore) {
      await dbFirestore.collection('saas_revendedores').doc(slug).delete();
      await dbFirestore.collection('saas_tiendas').doc(slug).delete();
    }

    res.json({ success: true, slug });
  } catch (err) {
    console.error("Error eliminando revendedor:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// RUTA GENERAL DE GUARDADO
app.post('/api/save', async (req, res) => {
  try {
    const data = req.body;
    writeLocalDB(data);

    if (dbFirestore) {
      const batch = dbFirestore.batch();
      const revs = data.revendedores || data.usuarios || {};
      for (const slug of Object.keys(revs)) {
        batch.set(dbFirestore.collection('saas_revendedores').doc(slug), revs[slug], { merge: true });
      }
      const tiendas = data.tiendas || {};
      for (const slug of Object.keys(tiendas)) {
        batch.set(dbFirestore.collection('saas_tiendas').doc(slug), tiendas[slug], { merge: true });
      }
      await batch.commit();
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error en /api/save:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/:page', (req, res) => {
  const filePath = path.join(__dirname, req.params.page);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});
