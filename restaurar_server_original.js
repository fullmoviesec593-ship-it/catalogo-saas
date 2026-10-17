const fs = require('fs');

let srv = fs.readFileSync('server.js', 'utf8');

// Hacer que /admin cargue el archivo admin.html físico original de tu gestor
if (srv.includes("app.get('/admin'")) {
    srv = srv.replace(/app\.get\('\/admin'[\s\S]*?\}\);\s*\}/s, 'app.get(\'/admin\', (req, res) => { res.sendFile(__dirname + \'/admin.html\'); });');
} else {
    // Si no encuentra la ruta, la agregamos limpia antes de app.listen
    srv = srv.replace('const PORT =', 'app.get(\'/admin\', (req, res) => { res.sendFile(__dirname + \'/admin.html\'); });\n\nconst PORT =');
}

fs.writeFileSync('server.js', srv);
console.log('✅ server.js ajustado para servir el admin.html original completo');
