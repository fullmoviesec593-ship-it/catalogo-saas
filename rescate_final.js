const fs = require('fs');
const { execSync } = require('child_process');

// 1. Extraer el HTML exacto de tu Panel Revendedor original
const commits = execSync('git log --format="%H" -n 50').toString().trim().split('\n');
let htmlRescatado = '';
for (let hash of commits) {
    try {
        let content = execSync(`git show ${hash}:admin.html 2>/dev/null`).toString();
        if (content.includes('PANEL REVENDEDOR') && content.includes('gestionar tu catálogo')) {
            htmlRescatado = content;
            break;
        }
    } catch(e) {}
}

if (htmlRescatado) {
    // Eliminar cualquier modal de oferta que se haya pegado
    htmlRescatado = htmlRescatado.replace(/<div[^>]*id="modalOferta"[^>]*>[\s\S]*?<\/div>/gi, '');
    // Inyectar destructor de caché
    htmlRescatado = htmlRescatado.replace('<head>', '<head>\n<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n<script>if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(r=>{for(let i of r)i.unregister()})}</script>\n');
    
    fs.writeFileSync('admin.html', htmlRescatado);
    if (fs.existsSync('public')) fs.writeFileSync('public/admin.html', htmlRescatado);
}

// 2. Interceptar la ruta en server.js con máxima prioridad
if (fs.existsSync('server.js')) {
    let code = fs.readFileSync('server.js', 'utf8');
    
    // Limpiar rutas corruptas anteriores
    code = code.replace(/app\.get\('\/admin'[\s\S]*?res\.sendFile[\s\S]*?\}\);/g, '');
    
    const rutaSegura = `\n// Ruta garantizada al Panel Revendedor
app.get('/admin', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    const fs = require('fs');
    const path = require('path');
    let file = path.join(__dirname, 'public', 'admin.html');
    if (!fs.existsSync(file)) file = path.join(__dirname, 'admin.html');
    res.sendFile(file);
});\n`;

    // Inyectar la ruta al inicio para que el servidor la ejecute antes que cualquier otro error
    if (code.includes('const app = express();')) {
        code = code.replace('const app = express();', 'const app = express();\n' + rutaSegura);
    } else {
        code = rutaSegura + '\n' + code;
    }
    
    fs.writeFileSync('server.js', code);
}
