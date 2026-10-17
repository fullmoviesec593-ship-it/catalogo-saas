const fs = require('fs');

// Quitar modales de oferta que se hayan quedado pegados estorbando tu login original
['./admin.html', './public/admin.html'].forEach(ruta => {
    if (fs.existsSync(ruta)) {
        let html = fs.readFileSync(ruta, 'utf8');
        html = html.replace(/<div[^>]*id="modalOferta"[^>]*>[\s\S]*?<\/div>/gi, '');
        fs.writeFileSync(ruta, html);
    }
});

let srv = fs.readFileSync('server.js', 'utf8');
let rutaFisica = fs.existsSync('./public/admin.html') ? '/public/admin.html' : '/admin.html';
const nuevaRuta = "\napp.get('/admin', (req, res) => { res.sendFile(__dirname + '" + rutaFisica + "'); });\n";

// Limpiar cualquier ruta falsa de admin y conectar tu archivo físico original
let idx = srv.indexOf("app.get('/admin'");
if (idx !== -1) {
    let nextGet = srv.indexOf("app.get", idx + 10);
    let nextPost = srv.indexOf("app.post", idx + 10);
    let nextListen = srv.indexOf("app.listen", idx + 10);
    let nextPort = srv.indexOf("const PORT", idx + 10);
    let limites = [nextGet, nextPost, nextListen, nextPort].filter(x => x !== -1);
    let fin = limites.length > 0 ? Math.min(...limites) : srv.length;
    
    srv = srv.substring(0, idx) + nuevaRuta + srv.substring(fin);
} else {
    srv = srv.replace('const PORT =', nuevaRuta + 'const PORT =');
}

fs.writeFileSync('server.js', srv);
console.log('✅ Tu panel de control original ha sido restaurado con éxito.');
