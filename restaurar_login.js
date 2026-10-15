const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
if (!code.includes('/api/login')) {
    const loginRoute = `app.post(['/api/login', '/api/auth/login', '/login'], (req, res) => {
    const { email, password } = req.body || {};
    if (email === 'fullmoviesec593@gmail.com' && password === 'LuDa0519') {
        res.json({ success: true, token: 'admin-token', message: 'Bienvenido' });
    } else {
        res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
});\n\n`;
    code = code.replace(/app\.post\(['"\`]\/api\/db\/update['"\`]/, loginRoute + "$&");
    fs.writeFileSync('server.js', code);
    console.log('✅ Ruta de Login restaurada exitosamente');
}
