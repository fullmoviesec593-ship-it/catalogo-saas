const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Normalizar: quitar cualquier 'async' duplicado o mal puesto
code = code.replace(/async\s+\(\s*req\s*,\s*res\s*\)\s*=>/g, "(req, res) =>");
code = code.replace(/async\s+function\s*\(\s*req\s*,\s*res\s*\)/g, "function(req, res)");

// 2. Inyectar: forzar 'async' en ABSOLUTAMENTE TODAS las rutas de Express
code = code.replace(/\(\s*req\s*,\s*res\s*\)\s*=>/g, "async (req, res) =>");
code = code.replace(/function\s*\(\s*req\s*,\s*res\s*\)/g, "async function(req, res)");

fs.writeFileSync('server.js', code);
console.log('✅ Reparación definitiva: Todas las rutas ahora soportan await sin estrellarse');
