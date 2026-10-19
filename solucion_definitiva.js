const { execSync } = require('child_process');
const fs = require('fs');

// 1. Encontrar el punto exacto antes de que yo insertara los errores (ignorando mis commits de "Fix")
const log = execSync('git log --format="%H|%s"').toString().trim().split('\n');
let commitSeguro = null;
for (let linea of log) {
    const [hash, mensaje] = linea.split('|');
    if (!mensaje.includes('Fix') && !mensaje.includes('Rescate') && !mensaje.includes('Reparar') && !mensaje.includes('Restaurar')) {
        commitSeguro = hash;
        break;
    }
}

// 2. Extraer ÚNICAMENTE tus archivos originales del Panel Revendedor desde ese punto seguro
if (commitSeguro) {
    execSync(`git checkout ${commitSeguro} -- admin.html public/admin.html gestor-streaming/public/admin.html 2>/dev/null || true`);
}

// 3. Purgar el código intruso del servidor (server.js) de forma quirúrgica
if (fs.existsSync('server.js')) {
    let srv = fs.readFileSync('server.js', 'utf8');
    let lineas = srv.split('\n');
    let filtrado = [];
    let omitiendo = false;
    
    for (let l of lineas) {
        if (l.includes("app.get('/admin'") || l.includes('app.get("/admin"')) omitiendo = true;
        if (l.includes("app.get('/panel-ofertas'") || l.includes('app.get("/panel-ofertas"')) omitiendo = true;
        
        if (!omitiendo) filtrado.push(l);
        if (omitiendo && l.trim() === '});') omitiendo = false;
    }
    
    srv = filtrado.join('\n');
    
    // Inyectar la ruta limpia que conecta directamente a tu diseño original
    const rutaLimpia = `\napp.get('/admin', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    const path = require('path');
    const fs = require('fs');
    let p = path.join(__dirname, 'public', 'admin.html');
    if (!fs.existsSync(p)) p = path.join(__dirname, 'admin.html');
    res.sendFile(p);
});\n`;

    if (srv.includes('const PORT =')) {
        srv = srv.replace('const PORT =', rutaLimpia + 'const PORT =');
    } else if (srv.includes('app.listen')) {
        srv = srv.replace('app.listen', rutaLimpia + 'app.listen');
    } else {
        srv += rutaLimpia;
    }
    
    fs.writeFileSync('server.js', srv);
}
