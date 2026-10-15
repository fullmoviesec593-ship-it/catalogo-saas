const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
if (!code.includes('express.static(__dirname)')) {
    code = code.replace(/const app\s*=\s*express\(\);?/, "const app = express();\napp.use(express.static(__dirname));\napp.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });");
    fs.writeFileSync('server.js', code);
    console.log('✅ Ruta del catálogo configurada con éxito');
} else {
    console.log('✅ La ruta ya estaba configurada');
}
