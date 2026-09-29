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
app.use(express.json({ limit: '20mb' }));
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
    console.log(">>> FIREBASE FIRESTORE CONECTADO AL 100% <<<");
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
      return { superadmin: {}, usuarios: {}, revendedores: {}, tiendas: {} };
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    return { superadmin: {}, usuarios: {}, revendedores: {}, tiendas: {} };
  }
}

function writeLocalDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}
}

// OBTENER BASE DE DATOS
app.get('/api/db', async (req, res) => {
  let data = null;
  if (dbFirestore) {
    try {
      const doc = await dbFirestore.collection('saas_data').doc('principal').get();
      if (doc.exists) {
        data = doc.data();
      } else {
        data = readLocalDB();
        await dbFirestore.collection('saas_data').doc('principal').set(data);
      }
    } catch (err) {
      console.error("Error leyendo Firestore:", err.message);
      data = readLocalDB();
    }
  } else {
    data = readLocalDB();
  }

  // Homogeneizar usuarios y revendedores para que nada se pierda
  if (!data.usuarios && data.revendedores) data.usuarios = data.revendedores;
  if (!data.revendedores && data.usuarios) data.revendedores = data.usuarios;

  res.json(data);
});

// GUARDAR BASE DE DATOS
app.post('/api/save', async (req, res) => {
  try {
    let data = req.body;

    // Asegurar que siempre se guarden en ambos campos por compatibilidad
    if (data.usuarios && !data.revendedores) data.revendedores = data.usuarios;
    if (data.revendedores && !data.usuarios) data.usuarios = data.revendedores;

    writeLocalDB(data);

    if (dbFirestore) {
      await dbFirestore.collection('saas_data').doc('principal').set(data);
      console.log("Guardado permanente en Firestore confirmado.");
    }
    res.json({ success: true, firestore: !!dbFirestore });
  } catch (err) {
    console.error("Error guardando:", err.message);
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
