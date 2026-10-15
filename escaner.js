const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const statusRoute = `
app.get('/api/status', async (req, res) => {
    let resultado = { 
        llave_detectada_en_render: !!process.env.FIREBASE_KEYS, 
        firebase_inicializado: typeof dbFirestore !== 'undefined' && dbFirestore !== null,
        error_exacto: "Ninguno",
        usuarios_guardados: 0
    };
    try {
        if (resultado.firebase_inicializado) {
            const snap = await dbFirestore.collection('saas_revendedores').get();
            resultado.usuarios_guardados = snap.size;
        } else {
            resultado.error_exacto = "El servidor no logró cargar la llave maestra";
        }
    } catch(e) {
        resultado.error_exacto = e.message;
    }
    res.send('<pre style="font-size:18px; padding:20px; background:#1e1e1e; color:#00ff00;">' + JSON.stringify(resultado, null, 2) + '</pre>');
});
`;

if (!code.includes('/api/status')) {
    code = code.replace(/const app = express\(\);/, "const app = express();\n" + statusRoute);
    
    // Pequeño parche preventivo por si Render modificó los saltos de línea de tu llave
    if (code.includes('JSON.parse(process.env.FIREBASE_KEYS)')) {
        code = code.replace(/JSON\.parse\(process\.env\.FIREBASE_KEYS\)/, "JSON.parse(String(process.env.FIREBASE_KEYS).replace(/\\\\n/g, '\\n'))");
    }
    
    fs.writeFileSync('server.js', code);
    console.log('✅ Escáner de diagnóstico instalado');
} else {
    console.log('✅ El escáner ya estaba instalado');
}
