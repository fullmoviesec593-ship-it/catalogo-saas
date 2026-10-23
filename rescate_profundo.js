const { execSync } = require('child_process');
const fs = require('fs');

console.log("Iniciando escaneo profundo sin límites en todo el historial...");
const commits = execSync('git log --format="%H"').toString().trim().split('\n');
let rescatado = false;

for (let hash of commits) {
    if (!hash) continue;
    // Revisar todos los nombres posibles que pudo haber tenido tu panel
    const rutas = ['admin.html', 'public/admin.html', 'login.html', 'dashboard.html', 'gestor-streaming/public/admin.html'];
    
    for (let ruta of rutas) {
        try {
            let content = execSync(`git show ${hash}:${ruta} 2>/dev/null`).toString();
            
            if (content.includes('Acceso Revendedor') || content.includes('TIENDA & LOGO')) {
                console.log(`✅ Diseño original encontrado en el commit ${hash.substring(0,7)}. Restaurando...`);
                
                // Asegurar que no quede rastro de la Oferta Temporal
                content = content.replace(/<div[^>]*id="modalOferta"[^>]*>[\s\S]*?<\/div>/gi, '');
                
                // Bloquear la caché del navegador de tu celular
                if (!content.includes('unregister')) {
                    content = content.replace('<head>', '<head>\n<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n<script>if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(r=>{for(let i of r)i.unregister()})}</script>\n');
                }
                
                if (!fs.existsSync('public')) fs.mkdirSync('public');
                fs.writeFileSync('public/admin.html', content);
                fs.writeFileSync('admin.html', content);
                rescatado = true;
                break;
            }
        } catch(e) {}
    }
    if (rescatado) break;
}

if (!rescatado) {
    console.log("⚠️ Extrayendo copia de seguridad de emergencia...");
    execSync('git checkout $(git rev-list -n 1 --before="2026-10-15 00:00" HEAD) -- *.html public/*.html 2>/dev/null || true');
}
