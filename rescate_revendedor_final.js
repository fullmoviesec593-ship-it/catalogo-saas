const { execSync } = require('child_process');
const fs = require('fs');

console.log("Buscando tu Panel Revendedor original...");
let panelEncontrado = "";
const commits = execSync('git log --format="%H"').toString().trim().split('\n');

for (let hash of commits) {
    if (!hash) continue;
    const rutas = ['public/admin.html', 'admin.html'];
    for (let ruta of rutas) {
        try {
            let content = execSync(`git show ${hash}:${ruta} 2>/dev/null`).toString();
            // Buscamos las palabras exactas de tu diseño original
            if (content.includes("PANEL REVENDEDOR") && content.includes("Ingresa tus credenciales para gestionar tu catálogo")) {
                panelEncontrado = content;
                break;
            }
        } catch(e) {}
    }
    if (panelEncontrado) break;
}

if (panelEncontrado) {
    // Limpiamos los botones grises flotantes que lo dañaron al inicio
    panelEncontrado = panelEncontrado.replace(/<div[^>]*id="modalOferta"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Inyectamos un código para destruir la caché rebelde de tu celular
    if (!panelEncontrado.includes('unregister')) {
        panelEncontrado = panelEncontrado.replace('<head>', '<head>\n<script>if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(r=>{for(let i of r)i.unregister()})}</script>\n');
    }
    
    if (!fs.existsSync('public')) fs.mkdirSync('public');
    fs.writeFileSync('public/admin.html', panelEncontrado);
    fs.writeFileSync('admin.html', panelEncontrado);
    console.log("✅ Tu Panel Revendedor original ha sido extraído y restaurado con éxito.");
} else {
    console.log("⚠️ No se encontró la frase exacta, restaurando versión de hace 3 días...");
    execSync('git checkout HEAD~15 -- public/admin.html admin.html || true');
}

// Asegurarnos de que el servidor muestre este panel y no otro
if (fs.existsSync('server.js')) {
    let srv = fs.readFileSync('server.js', 'utf8');
    
    // Borramos cualquier ruta /admin corrupta
    srv = srv.replace(/app\.get\('\/admin'[\s\S]*?\}\);/g, '');
    
    const rutaCorrecta = `
app.get('/admin', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const path = require('path');
    const fs = require('fs');
    let p = path.join(__dirname, 'public', 'admin.html');
    if (!fs.existsSync(p)) p = path.join(__dirname, 'admin.html');
    res.sendFile(p);
});
`;
    if (srv.includes('const PORT =')) {
        srv = srv.replace('const PORT =', rutaCorrecta + '\nconst PORT =');
    } else {
        srv += rutaCorrecta;
    }
    fs.writeFileSync('server.js', srv);
}
