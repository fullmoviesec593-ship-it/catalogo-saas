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
app.use(express.json({ limit: '25mb' }));
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

// OBTENER BASE DE DATOS COMPLETA
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
        usuarios: revendedores, // compatibilidad total
        tiendas
      });
    } catch (err) {
      console.error("Error leyendo colecciones Firestore:", err.message);
    }
  }
  const local = readLocalDB();
  local.usuarios = local.revendedores;
  res.json(local);
});

// GUARDAR / CREAR REVENDEDOR INDIVIDUAL
app.post('/api/revendedor/guardar', async (req, res) => {
  try {
    const { slug, revendedor, tienda } = req.body;
    if (!slug) return res.status(400).json({ error: "Falta slug" });

    // Guardar en copia local
    const local = readLocalDB();
    if (!local.revendedores) local.revendedores = {};
    if (!local.tiendas) local.tiendas = {};
    local.revendedores[slug] = revendedor;
    if (tienda) local.tiendas[slug] = tienda;
    writeLocalDB(local);

    // Guardar en Firestore como documentos individuales
    if (dbFirestore) {
      await dbFirestore.collection('saas_revendedores').doc(slug).set(revendedor, { merge: true });
      if (tienda) {
        await dbFirestore.collection('saas_tiendas').doc(slug).set(tienda, { merge: true });
      }
      console.log(`[Firestore] Revendedor guardado con éxito: ${slug}`);
    }

    res.json({ success: true, slug });
  } catch (err) {
    console.error("Error guardando revendedor:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ELIMINAR REVENDEDOR INDIVIDUAL
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
      console.log(`[Firestore] Revendedor eliminado con éxito: ${slug}`);
    }

    res.json({ success: true, slug });
  } catch (err) {
    console.error("Error eliminando revendedor:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// RUTA GENERAL DE GUARDADO (COMPATIBILIDAD)
app.post('/api/save', async (req, res) => {
  try {
    const data = req.body;
    writeLocalDB(data);

    if (dbFirestore) {
      const batch = dbFirestore.batch();
      
      const revs = data.revendedores || data.usuarios || {};
      for (const slug of Object.keys(revs)) {
        const ref = dbFirestore.collection('saas_revendedores').doc(slug);
        batch.set(ref, revs[slug], { merge: true });
      }

      const tiendas = data.tiendas || {};
      for (const slug of Object.keys(tiendas)) {
        const ref = dbFirestore.collection('saas_tiendas').doc(slug);
        batch.set(ref, tiendas[slug], { merge: true });
      }

      await batch.commit();
      console.log("[Firestore] Batch completado.");
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
