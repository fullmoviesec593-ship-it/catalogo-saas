const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
const dummyRoutes = `
app.all('/api/stats/track', (req, res) => res.json({ success: true }));
app.all('/api/db', (req, res) => res.json({ success: true }));
`;
if (!code.includes('/api/stats/track')) {
    code = code.replace(/const app\s*=\s*express\(\);?/, "const app = express();\n" + dummyRoutes);
    fs.writeFileSync('server.js', code);
    console.log('✅ Rutas de carga estabilizadas');
}
