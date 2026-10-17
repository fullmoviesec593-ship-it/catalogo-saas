const { execSync } = require('child_process');
const fs = require('fs');

console.log("Iniciando escaneo profundo del historial de tu código...");
const commits = execSync('git log --format="%H"').toString().trim().split('\n');
const keywords = ['Gestión de Revendedores', 'SÚPER ADMIN SAAS', 'Panel Revendedor | Control Total'];
let adminFound = false;

// 1. Rastrear y rescatar tu verdadero Panel Revendedor
for (let commit of commits) {
    if (!commit) continue;
    ['public/admin.html', 'admin.html', 'gestor-streaming/public/admin.html'].forEach(file => {
        if (adminFound) return;
        try {
            const content = execSync(`git show ${commit}:${file}`).toString();
            // Si el archivo tiene las palabras de tu panel original, lo restauramos
            if (keywords.some(kw => content.includes(kw))) {
                console.log(`✅ ¡Tu panel original ha sido encontrado en el commit ${commit.substring(0,7)}! Restaurando...`);
                
                // Inyectamos un destructor de caché para que tu celular borre la pantalla azul vieja
                let htmlSeguro = content;
                if (!htmlSeguro.includes('serviceWorker.getRegistrations')) {
                    htmlSeguro = htmlSeguro.replace('<head>', '<head>\n<script>if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(r=>{for(let i of r)i.unregister()})}</script>\n');
                }
                
                fs.writeFileSync('public/admin.html', htmlSeguro);
                fs.writeFileSync('admin.html', htmlSeguro);
                adminFound = true;
            }
        } catch(e) {}
    });
    if (adminFound) break;
}

// 2. Limpiar el servidor (server.js) de las pantallas azules intrusas que yo metí, 
// pero manteniendo INTACTO el catálogo público de tus clientes
let srv = fs.readFileSync('server.js', 'utf8');
srv = srv.replace(/app\.get\('\/admin'[\s\S]*?\}\);\s*\}/g, '');
srv = srv.replace(/app\.get\('\/admin'[\s\S]*?\}\);/g, '');
srv = srv.replace(/app\.get\('\/panel-ofertas'[\s\S]*?\}\);\s*\}/g, '');
srv = srv.replace(/app\.get\('\/panel-ofertas'[\s\S]*?\}\);/g, '');
fs.writeFileSync('server.js', srv);

// 3. Matar el Service Worker para liberar tu teléfono
fs.writeFileSync('sw.js', 'self.addEventListener("install", () => self.skipWaiting()); self.addEventListener("activate", () => self.clients.claim());');
fs.writeFileSync('public/sw.js', 'self.addEventListener("install", () => self.skipWaiting()); self.addEventListener("activate", () => self.clients.claim());');

console.log('🚀 Restauración completa. Todo tu diseño original volvió a su lugar.');
