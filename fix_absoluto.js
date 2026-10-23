const fs = require('fs');
const { execSync } = require('child_process');

let htmlCorrecto = '';

// 1. Escanear el historial de más reciente a más antiguo buscando tu panel real
const commits = execSync('git log --format="%H" -n 200').toString().trim().split('\n');
for (const hash of commits) {
    if (!hash) continue;
    try {
        // Buscar primero en public/admin.html, luego en admin.html
        let html = execSync(`git show ${hash}:public/admin.html 2>/dev/null`).toString();
        if (!html.includes('Acceso Revendedor')) {
            html = execSync(`git show ${hash}:admin.html 2>/dev/null`).toString();
        }
        
        // Si tiene tu diseño de login, lo tomamos
        if (html.includes('Acceso Revendedor') && html.includes('Ingresar a mi Panel')) {
            htmlCorrecto = html;
            break; // Tomamos el más reciente (el que ya tenía el menú hamburguesa)
        }
    } catch(e) {}
}

if (htmlCorrecto) {
    console.log('✅ Versión original con Acceso Revendedor encontrada.');
    
    // 2. Destruir cualquier rastro del modal de Oferta Temporal que se haya filtrado
    htmlCorrecto = htmlCorrecto.replace(/<div[^>]*id="modalOferta"[^>]*>[\s\S]*?<\/div>/gi, '');
    htmlCorrecto = htmlCorrecto.replace(/<div[^>]*class="[^"]*oferta[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // 3. Forzar al navegador a borrar la caché
    htmlCorrecto = htmlCorrecto.replace('<head>', '<head>\n<script>if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(r=>{for(let i of r)i.unregister()})}</script>\n');
    
    if (!fs.existsSync('public')) fs.mkdirSync('public');
    fs.writeFileSync('public/admin.html', htmlCorrecto);
    fs.writeFileSync('admin.html', htmlCorrecto);
} else {
    console.log('⚠️ No se encontró en el historial rápido, por favor revisa.');
}

// 4. Limpiar server.js de rutas infectadas y asegurar la correcta
if (fs.existsSync('server.js')) {
    let srv = fs.readFileSync('server.js', 'utf8');
    
    // Borrar TODAS las rutas de /admin y /panel-ofertas que estén estorbando
    srv = srv.replace(/app\.get\(['"]\/admin['"][\s\S]*?\}\);/g, '');
    srv = srv.replace(/app\.get\(['"]\/panel-ofertas['"][\s\S]*?\}\);/g, '');
    
    // Escribir la ruta blindada
    const rutaBlindada = `\napp.get('/admin', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    const path = require('path');
    const fs = require('fs');
    let file = path.join(__dirname, 'public', 'admin.html');
    if (!fs.existsSync(file)) file = path.join(__dirname, 'admin.html');
    res.sendFile(file);
});\n`;

    if (srv.includes('const PORT =')) {
        srv = srv.replace('const PORT =', rutaBlindada + 'const PORT =');
    } else {
        srv += rutaBlindada;
    }
    
    fs.writeFileSync('server.js', srv);
    console.log('✅ Servidor limpiado y configurado correctamente.');
}
