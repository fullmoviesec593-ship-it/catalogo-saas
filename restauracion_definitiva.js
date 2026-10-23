const fs = require('fs');

// 1. Restaurar Panel Revendedor (Acceso Revendedor + Menú Hamburguesa)
if (fs.existsSync('codigos_limpios/2_Panel_Revendedor.txt')) {
    let adminHtml = fs.readFileSync('codigos_limpios/2_Panel_Revendedor.txt', 'utf8');
    // Inyectar bloqueo de caché para forzar al celular a mostrar la versión correcta
    adminHtml = adminHtml.replace('<head>', '<head>\n<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate, max-age=0">\n');
    
    if (!fs.existsSync('public')) fs.mkdirSync('public');
    fs.writeFileSync('public/admin.html', adminHtml);
    fs.writeFileSync('admin.html', adminHtml);
}

// 2. Restaurar Catálogo Público a su estado previo sin ofertas
if (fs.existsSync('codigos_limpios/1_Catalogo_Publico.txt')) {
    let indexHtml = fs.readFileSync('codigos_limpios/1_Catalogo_Publico.txt', 'utf8');
    fs.writeFileSync('public/index.html', indexHtml);
    fs.writeFileSync('index.html', indexHtml);
}

// 3. Limpiar server.js de las rutas de ofertas y configurar el acceso limpio
if (fs.existsSync('server.js')) {
    let srv = fs.readFileSync('server.js', 'utf8');
    
    // Purgar rutas rotas de intentos anteriores
    srv = srv.replace(/app\.get\(['"]\/admin['"][\s\S]*?\}\);/g, '');
    srv = srv.replace(/app\.get\(['"]\/panel-ofertas['"][\s\S]*?\}\);/g, '');
    
    const rutaLimpia = `\napp.get('/admin', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    const fs = require('fs');
    const path = require('path');
    let file = path.join(__dirname, 'public', 'admin.html');
    if (!fs.existsSync(file)) file = path.join(__dirname, 'admin.html');
    res.sendFile(file);
});\n`;

    if (srv.includes('const app = express();')) {
        srv = srv.replace('const app = express();', 'const app = express();\n' + rutaLimpia);
    } else {
        srv = rutaLimpia + srv;
    }
    
    fs.writeFileSync('server.js', srv);
}
