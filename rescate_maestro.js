const { execSync } = require('child_process');
const fs = require('fs');

// 1. Encontrar el archivo EXACTO de tu Súper Admin en el historial de Git
let adminOriginal = "";
try {
    console.log("Buscando tu panel SÚPER ADMIN SAAS en el historial...");
    const commits = execSync('git log --format="%H"').toString().trim().split('\n');
    for (let hash of commits) {
        if (!hash) continue;
        const rutas = ['public/admin.html', 'admin.html', 'gestor-streaming/public/admin.html'];
        for (let ruta of rutas) {
            try {
                let content = execSync(`git show ${hash}:${ruta} 2>/dev/null`).toString();
                if (content.includes("SÚPER ADMIN") && content.includes("Gestión de Revendedores")) {
                    adminOriginal = content;
                    break;
                }
            } catch(e) {}
        }
        if (adminOriginal) break;
    }
} catch(e) {}

if (adminOriginal) {
    // Matar el Service Worker (caché del celular) desde adentro del HTML
    if (!adminOriginal.includes('unregister()')) {
        adminOriginal = adminOriginal.replace('<head>', '<head>\n<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">\n<script>\nif("serviceWorker" in navigator){ navigator.serviceWorker.getRegistrations().then(r => { for(let i of r) i.unregister(); }); }\n</script>\n');
    }
    if (!fs.existsSync('public')) fs.mkdirSync('public');
    fs.writeFileSync('public/admin.html', adminOriginal);
    fs.writeFileSync('admin.html', adminOriginal);
    console.log("✅ Archivo original del Panel Revendedor extraído y restaurado con éxito.");
} else {
    console.log("⚠️ Restaurando backup de seguridad estricto del 15 de Octubre...");
    execSync('git checkout $(git rev-list -n 1 --before="2026-10-16 00:00" HEAD) -- public/admin.html admin.html || true');
}

// 2. Limpiar server.js para que entregue TU archivo real sin dañar el catálogo público
if (fs.existsSync('server.js')) {
    let srv = fs.readFileSync('server.js', 'utf8');
    
    // Quitar cualquier ruta /admin falsa que yo haya metido antes
    srv = srv.replace(/app\.get\('\/admin'[\s\S]*?\}\);\s*\}/g, '');
    srv = srv.replace(/app\.get\('\/admin'[\s\S]*?\}\);/g, '');
    
    // Inyectar la ruta correcta con bloqueo de caché estricto
    const rutaAdminSegura = `
app.get('/admin', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const fs = require('fs');
    const path = require('path');
    let p = path.join(__dirname, 'public', 'admin.html');
    if (!fs.existsSync(p)) p = path.join(__dirname, 'admin.html');
    res.sendFile(p);
});
`;
    srv = srv.replace('const PORT =', rutaAdminSegura + '\nconst PORT =');
    fs.writeFileSync('server.js', srv);
    console.log("✅ Backend configurado: server.js ahora enviará tu panel real.");
}

// 3. Destruir Service Workers físicos viejos
const swDestructor = 'self.addEventListener("install", () => self.skipWaiting()); self.addEventListener("activate", () => self.clients.claim());';
fs.writeFileSync('sw.js', swDestructor);
if (fs.existsSync('public')) fs.writeFileSync('public/sw.js', swDestructor);
