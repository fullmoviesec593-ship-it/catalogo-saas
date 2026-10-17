const { execSync } = require('child_process');
const fs = require('fs');

// 1. Verificar si server.js tiene algún error de sintaxis
try {
    execSync('node -c server.js', { stdio: 'pipe' });
    console.log('✅ Sintaxis de server.js correcta');
} catch (err) {
    console.log('⚠️ Reparando sintaxis de server.js desde el commit estable...');
    // Restaurar server.js al punto antes de la inyección que rompió el cierre
    execSync('git checkout 75ea85f -- server.js');
    console.log('✅ server.js restaurado limpiamente');
}

// 2. Ver el final de server.js para revisar la ruta de guardar ofertas y cómo sirve los archivos
const srv = fs.readFileSync('server.js', 'utf8');
const lineas = srv.split('\n');
console.log("=== ULTIMAS 85 LINEAS DE SERVER.JS ===");
console.log(lineas.slice(-85).join('\n'));
console.log("======================================");
