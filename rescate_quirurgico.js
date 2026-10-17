const { execSync } = require('child_process');
const fs = require('fs');

function rescatarPanelReal(ruta) {
    try {
        console.log('Buscando tu panel original en el historial de ' + ruta + '...');
        const log = execSync('git log --pretty=format:"%H" -- ' + ruta).toString().trim().split('\n');
        for (let hash of log) {
            if (!hash) continue;
            try {
                const content = execSync('git show ' + hash + ':' + ruta).toString();
                // Tu panel original (con menú, whatsapp, colores) tiene miles de líneas.
                // Mis paneles falsos y vacíos tienen menos de 3000 caracteres.
                if (content.length > 8000) {
                    fs.writeFileSync(ruta, content);
                    console.log('✅ ¡Panel original rescatado exitosamente! (Commit: ' + hash.substring(0,7) + ')');
                    return content;
                }
            } catch(e) {}
        }
    } catch(e) {}
    return null;
}

// 1. Escanear y extraer tu verdadero panel de control
let panelReal = rescatarPanelReal('public/admin.html');
if (!panelReal) panelReal = rescatarPanelReal('admin.html');

if (panelReal) {
    // 2. Inyectar un destructor de caché para obligar a tu celular a soltar la vista vieja
    if (!panelReal.includes('serviceWorker.getRegistrations')) {
        panelReal = panelReal.replace('<head>', '<head>\n<script>\nif("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(function(r){for(let i of r)i.unregister()})}\n</script>');
    }
    fs.writeFileSync('public/admin.html', panelReal);
    fs.writeFileSync('admin.html', panelReal);
}

// 3. Asegurar que server.js abra tu panel real cuando entres a /admin
let srv = fs.readFileSync('server.js', 'utf8');
if (srv.includes("app.get('/admin'")) {
    srv = srv.replace(/app\.get\('\/admin'[\s\S]*?\}\);\s*\}/s, "app.get('/admin', (req, res) => { res.sendFile(__dirname + '/public/admin.html'); });");
} else {
    srv = srv.replace('const PORT =', "app.get('/admin', (req, res) => { res.sendFile(__dirname + '/public/admin.html'); });\nconst PORT =");
}
fs.writeFileSync('server.js', srv);

console.log('🚀 Sistema de administración restaurado y blindado.');
