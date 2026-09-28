const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { superadmin: {}, revendedores: {}, tiendas: {} };
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (err) {
    return { superadmin: {}, revendedores: {}, tiendas: {} };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Rutas API
app.get('/api/db', (req, res) => {
  res.json(readDB());
});

app.post('/api/save', (req, res) => {
  try {
    writeDB(req.body);
    res.json({ success: true, message: 'Datos guardados correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ruta principal para manejar tiendas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});
