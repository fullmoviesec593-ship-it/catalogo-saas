const fs = require('fs');

// 1. Arreglamos el cableado cruzado en el servidor
let serverCode = fs.readFileSync('server.js', 'utf8');

const backendFix = `app.get('/api/db', async (req, res) => {
    try {
        let catLocal = [];
        try {
            const dbL = JSON.parse(fs.readFileSync('db.json', 'utf8'));
            if (dbL.servicios) catLocal = dbL.servicios;
        } catch(e) {}
        
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
            const tiendasSnap = await dbFirestore.collection('saas_tiendas').get();
            const tiendas = tiendasSnap.docs.map(d => d.data());
            const revSnap = await dbFirestore.collection('saas_revendedores').get();
            const revendedores = revSnap.docs.map(d => d.data());
            
            // Leemos el VERDADERO catálogo de servicios
            let catNube = [];
            try {
                const snap = await dbFirestore.collection('saas_servicios').get();
                if (!snap.empty) { catNube = snap.docs.map(d => d.data()); }
                else {
                    const snap2 = await dbFirestore.collection('servicios').get();
                    if (!snap2.empty) catNube = snap2.docs.map(d => d.data());
                }
            } catch(e) {}
            
            const catFinal = catNube.length > 0 ? catNube : catLocal;
            return res.json({ servicios: catFinal, tiendas: tiendas, revendedores: revendedores });
        }
        res.json({ servicios: catLocal, tiendas: [], revendedores: [] });
    } catch (e) { res.json({ servicios: [], tiendas: [], revendedores: [] }); }
});`;

// Buscamos la tubería vieja y la reemplazamos con seguridad
const p1 = serverCode.indexOf("app.get('/api/db'");
if (p1 !== -1) {
    const p2 = serverCode.indexOf("app.post('/api/revendedor", p1);
    if (p2 !== -1) {
        serverCode = serverCode.substring(0, p1) + backendFix + "\n\n" + serverCode.substring(p2);
    } else {
        const p3 = serverCode.indexOf("});", p1);
        serverCode = serverCode.substring(0, p1) + backendFix + "\n" + serverCode.substring(p3 + 3);
    }
    fs.writeFileSync('server.js', serverCode);
}

// 2. Quitamos la instrucción temporal en la página web
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
htmlFiles.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    if (html.includes('data.servicios || data.tiendas')) {
        html = html.replace('const servicios = data.servicios || data.tiendas || [];', 'const servicios = data.servicios && data.servicios.length > 0 ? data.servicios : [];');
        fs.writeFileSync(file, html);
    }
});
console.log('✅ Cruce de cables reparado. El catálogo real está conectado.');
