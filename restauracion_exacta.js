const { execSync } = require('child_process');
const fs = require('fs');

const commits = execSync('git log -n 150 --format="%H"').toString().trim().split('\n');
let found = false;

for (let hash of commits) {
    try {
        const files = execSync(`git ls-tree -r --name-only ${hash} | grep "\\.html$" || true`).toString().trim().split('\n');
        for (let file of files) {
            if (!file) continue;
            const content = execSync(`git show ${hash}:${file} 2>/dev/null`).toString();
            
            // Buscar las palabras exactas de tus capturas de pantalla
            if (content.includes('Acceso Revendedor') && content.includes('Ingresar a mi Panel')) {
                console.log(`✅ Panel original encontrado en el commit ${hash.substring(0,7)}. Restaurando sistema...`);
                
                // Restaurar servidor y todos los HTML de ese momento exacto
                execSync(`git checkout ${hash} -- server.js *.html public/*.html gestor-streaming/public/*.html 2>/dev/null || true`);
                
                // Destruir la caché rebelde de la pantalla de ofertas
                if (fs.existsSync(file)) {
                    let html = fs.readFileSync(file, 'utf8');
                    if (!html.includes('unregister')) {
                        html = html.replace('<head>', '<head>\n<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n<script>if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(r=>{for(let i of r)i.unregister()})}</script>\n');
                        fs.writeFileSync(file, html);
                    }
                }
                found = true;
                break;
            }
        }
    } catch(e) {}
    if (found) break;
}

if (!found) console.log("⚠️ No se encontró la frase exacta en los últimos 150 cambios.");
