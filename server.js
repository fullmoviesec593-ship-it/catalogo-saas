const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const firebaseAdmin = require('firebase-admin');

// Soporte robusto de importacion CJS / ESM
const admin = firebaseAdmin.default || firebaseAdmin;

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(__dirname));

let dbFirestore = null;
let firebaseStatus = "No configurado";

// Inicializacion blindada
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

    const certFn = (admin.credential && admin.credential.cert) 
      ? admin.credential.cert 
      : firebaseAdmin.credential.cert;

    if (!admin.apps || admin.apps.length === 0) {
      admin.initializeApp({
        credential: certFn(serviceAccount)
      });
    }

    dbFirestore = admin.firestore();
    firebaseStatus = "Conectado exitosamente";
    console.log(">>> FIREBASE FIRESTORE CONECTADO EXITOSAMENTE <<<");
  } catch (err) {
    firebaseStatus = "Error de conexion: " + err.message;
    console.error("Error al conectar Firebase:", err.message);
  }
}

// Ruta de estado en vivo
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

app.get('/api/db', async (req, res) => {
  if (dbFirestore) {
    try {
      const doc = await dbFirestore.collection('saas_data').doc('principal').get();
      if (doc.exists) {
        return res.json(doc.data());
      } else {
        const initial = readLocalDB();
        await dbFirestore.collection('saas_data').doc('principal').set(initial);
        return res.json(initial);
      }
    } catch (err) {
      console.error("Error leyendo Firestore:", err.message);
      return res.json(readLocalDB());
    }
  }
  res.json(readLocalDB());
});

app.post('/api/save', async (req, res) => {
  try {
    const data = req.body;
    writeLocalDB(data);

    if (dbFirestore) {
      await dbFirestore.collection('saas_data').doc('principal').set(data);
    }
    res.json({ success: true, firestore: !!dbFirestore });
  } catch (err) {
    console.error("Error guardando en Firestore:", err.message);
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
