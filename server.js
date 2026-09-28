const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Inicializar Firebase Firestore con la variable de Render
let dbFirestore = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    dbFirestore = admin.firestore();
    console.log("Conectado exitosamente a Firebase Firestore.");
  } catch (err) {
    console.error("Error al iniciar Firebase:", err.message);
  }
}

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

// Rutas de API para lectura y escritura perpetua
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
      await dbFirestore.collection('saas_data').doc('principal').set(data, { merge: true });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rutas para servir páginas
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
  console.log(`Servidor SaaS activo en el puerto ${PORT}`);
});
