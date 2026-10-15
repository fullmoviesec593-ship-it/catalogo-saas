const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Escanear todas las rutas de Express y agregarles 'async' si no lo tienen
code = code.replace(/app\.(get|post|put|delete|all)\((.*?),\s*\(\s*req\s*,\s*res\s*\)\s*=>/g, "app.$1($2, async (req, res) =>");

fs.writeFileSync('server.js', code);
console.log('✅ Etiquetas async restauradas en todas las rutas');
