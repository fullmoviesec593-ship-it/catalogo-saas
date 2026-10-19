const fs = require('fs');
const { execSync } = require('child_process');

// 1. Inyectar la ruta faltante en el servidor para arreglar el error "Cannot GET"
let srv = fs.readFileSync('server.js', 'utf8');
srv = srv.replace(/app\.get\(['"]\/admin['"][\s\S]*?\}\);/g, ''); // Limpiar cualquier ruta rota

const rutaAdmin = `
app.get('/admin', (req, res) => {
    const path = require('path');
    const fs = require('fs');
    let file = path.join(__dirname, 'public', 'admin.html');
    if (!fs.existsSync(file)) file = path.join(__dirname, 'admin.html');
    res.sendFile(file);
});
`;

if (srv.includes('app.listen')) {
    srv = srv.replace('app.listen', rutaAdmin + 'app.listen');
} else {
    srv += rutaAdmin;
}
fs.writeFileSync('server.js', srv);

// 2. Extraer exactamente tu diseño original buscando las palabras de tu captura
try {
    const commits = execSync('git log -n 100 --format="%H"').toString().trim().split('\n');
    let htmlEncontrado = '';
    for (let hash of commits) {
        try {
            let content = execSync(`git show ${hash}:admin.html 2>/dev/null`).toString();
            // Buscar la vista que dice "PANEL REVENDEDOR"
            if (content.includes('PANEL REVENDEDOR') && content.includes('gestionar tu catálogo')) {
                htmlEncontrado = content;
                break;
            }
        } catch(e) {}
    }
    
    if (htmlEncontrado) {
        // Quitar los botones flotantes grises de la oferta que lo dañaron al inicio
        htmlEncontrado = htmlEncontrado.replace(/<div[^>]*id="modalOferta"[^>]*>[\s\S]*?<\/div>/gi, ''); 
        if (!fs.existsSync('public')) fs.mkdirSync('public');
        fs.writeFileSync('public/admin.html', htmlEncontrado);
        fs.writeFileSync('admin.html', htmlEncontrado);
    }
} catch(e) {}
