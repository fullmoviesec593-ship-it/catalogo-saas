const fs = require('fs');

let srv = fs.readFileSync('server.js', 'utf8');

// Eliminar cualquier ruta o bloque HTML incrustado dentro de server.js que afecte al admin
// Dejando que server.js devuelva los archivos estáticos limpios
if (srv.includes('app.get(\'/admin\'')) {
    // Reemplazar la ruta interna del admin para que cargue directamente el archivo físico limpio
    srv = srv.replace(/app\.get\('\/admin'[^}]+\}\);/s, 'app.get(\'/admin\', (req, res) => { res.sendFile(__dirname + \'/public/admin.html\'); });');
}

fs.writeFileSync('server.js', srv);
console.log('✅ server.js corregido para servir el admin limpio');
