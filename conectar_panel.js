const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const rutasFirebase = `
// Tubería 1: Enviar datos de Firebase al Panel
app.get('/api/db', async (req, res) => {
    try {
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
            const tiendasSnap = await dbFirestore.collection('saas_tiendas').get();
            const tiendas = tiendasSnap.docs.map(d => d.data());
            const revSnap = await dbFirestore.collection('saas_revendedores').get();
            const revendedores = revSnap.docs.map(d => d.data());
            return res.json({ servicios: tiendas, tiendas: tiendas, revendedores: revendedores });
        }
        res.json({ servicios: [], tiendas: [], revendedores: [] });
    } catch (e) { res.json({ servicios: [], tiendas: [], revendedores: [] }); }
});

// Tubería 2: Guardar nuevos usuarios en Firebase
app.post('/api/revendedor/guardar', async (req, res) => {
    try {
        if (typeof dbFirestore !== 'undefined' && dbFirestore) {
            const data = req.body;
            const id = data.slug || data.id || data.correo || Date.now().toString();
            await dbFirestore.collection('saas_revendedores').doc(id).set(data, { merge: true });
            return res.json({ success: true, message: 'Guardado en la nube' });
        }
        res.json({ success: false, message: 'Firebase desconectado' });
    } catch (e) { res.status(500).json({ success: false }); }
});
`;

// Borrar rutas viejas o vacías para evitar conflictos
code = code.replace(/app\.get\('\/api\/db'[\s\S]*?\}\);/g, '');
code = code.replace(/app\.post\('\/api\/revendedor\/guardar'[\s\S]*?\}\);/g, '');

// Insertar las nuevas tuberías
code = code.replace(/(const app = express\(\);)/, "$1\n" + rutasFirebase);

fs.writeFileSync('server.js', code);
console.log('✅ Tuberías del panel conectadas a Firebase');
