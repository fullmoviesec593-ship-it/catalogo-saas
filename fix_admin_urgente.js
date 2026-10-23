const fs = require('fs');
const { execSync } = require('child_process');

console.log("Restaurando archivos del Panel Revendedor...");
try {
    const hashes = execSync('git log --format="%H"').toString().trim().split('\n');
    let htmlEncontrado = false;
    for (let h of hashes) {
        if (!h) continue;
        const rutas = ['admin.html', 'public/admin.html'];
        for (let ruta of rutas) {
            try {
                let html = execSync('git show ' + h + ':' + ruta + ' 2>/dev/null').toString();
                if (html.includes('PANEL REVENDEDOR') && html.includes('gestionar tu catálogo')) {
                    // Limpiar modal erróneo de la oferta si se había pegado aquí
                    html = html.replace(/<div[^>]*id="modalOferta"[^>]*>[\s\S]*?<\/div>/gi, '');
                    if (!fs.existsSync('public')) fs.mkdirSync('public');
                    fs.writeFileSync('public/admin.html', html);
                    fs.writeFileSync('admin.html', html);
                    console.log("✅ HTML original restaurado correctamente.");
                    htmlEncontrado = true;
                    break;
                }
            } catch(e) {}
        }
        if (htmlEncontrado) break;
    }
} catch(e) {
    console.log("Error buscando en git:", e);
}

console.log("Inyectando ruta /admin en server.js...");
if (fs.existsSync('server.js')) {
    let code = fs.readFileSync('server.js', 'utf8');
    
    // Remover cualquier bloque de ruta /admin existente para evitar bloqueos
    code = code.replace(/app\.get\(['"]\/admin['"][\s\S]*?\}\);/g, '');
    
    const rutaSegura = `\napp.get('/admin', (req, res) => {
    const fs = require('fs');
    const p = fs.existsSync(__dirname + '/public/admin.html') ? (__dirname + '/public/admin.html') : (__dirname + '/admin.html');
    res.sendFile(p);
});\n`;

    // Inyectar con máxima prioridad justo después de inicializar la app express
    if (code.includes('const app = express();')) {
        code = code.replace('const app = express();', 'const app = express();' + rutaSegura);
    } else if (code.includes('app = express();')) {
        code = code.replace('app = express();', 'app = express();' + rutaSegura);
    } else {
        // Si no se encuentra la variable express estándar, se añade al inicio
        code = rutaSegura + '\n' + code;
    }
    
    fs.writeFileSync('server.js', code);
    console.log("✅ Servidor actualizado con ruta prioritaria.");
}
