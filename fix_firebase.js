const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Encender la variable de conexión a Firebase
if (!code.includes('const dbFirestore =')) {
    code = code.replace(/const \{ Firestore \} = require\('@google-cloud\/firestore'\);/, "const { Firestore } = require('@google-cloud/firestore');\nconst dbFirestore = new Firestore();");
}

// 2. Configurar el catálogo para que lea los datos de la nube
const dbRouteFirebase = `app.get('/api/db', async (req, res) => {
    if (typeof dbFirestore !== 'undefined' && dbFirestore) {
        try {
            const tiendasSnap = await dbFirestore.collection('saas_tiendas').get();
            const tiendas = tiendasSnap.docs.map(doc => doc.data());
            
            const revSnap = await dbFirestore.collection('saas_revendedores').get();
            const revendedores = revSnap.docs.map(doc => doc.data());
            
            return res.json({ servicios: tiendas, tiendas: tiendas, revendedores: revendedores });
        } catch (error) { console.error('Error leyendo Firebase:', error); }
    }
    const dbPath = __dirname + '/db.json';
    if (fs.existsSync(dbPath)) res.sendFile(dbPath);
    else res.json({ servicios: [], tiendas: [], revendedores: [] });
});`;

code = code.replace(/app\.get\('\/api\/db', \(req, res\) => \{[\s\S]*?\}\);/, dbRouteFirebase);

fs.writeFileSync('server.js', code);
console.log('✅ Conexión con Firebase restaurada');
