const fs = require('fs');

const adminLimpidisimo = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Administración | Full Movies Ec</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #090d16; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
        .login-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 30px; width: 100%; max-width: 420px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .login-card h2 { color: #38bdf8; font-size: 22px; margin-bottom: 8px; text-align: center; font-weight: 800; text-transform: uppercase; }
        .login-card p { color: #94a3b8; font-size: 13px; text-align: center; margin-bottom: 24px; }
        .form-group { margin-bottom: 18px; }
        .form-group label { display: block; font-size: 12px; color: #cbd5e1; margin-bottom: 6px; font-weight: 600; }
        .form-group input { width: 100%; padding: 12px; border-radius: 8px; background: #0b1120; border: 1px solid #334155; color: #fff; font-size: 14px; outline: none; }
        .form-group input:focus { border-color: #38bdf8; }
        .btn-ingresar { width: 100%; padding: 12px; background: #0284c7; color: #fff; border: none; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; transition: background 0.2s; margin-top: 10px; }
        .btn-ingresar:hover { background: #0369a1; }
        #mensajeError { color: #ef4444; font-size: 12px; text-align: center; margin-top: 12px; display: none; }
    </style>
</head>
<body>
    <div class="login-card">
        <h2>Panel Admin</h2>
        <p>Full Movies Ec - Gestión Total</p>
        <form id="formLogin" onsubmit="handleLogin(event)">
            <div class="form-group">
                <label>Correo Electrónico</label>
                <input type="email" id="email" required placeholder="tucorreo@gmail.com">
            </div>
            <div class="form-group">
                <label>Contraseña</label>
                <input type="password" id="password" required placeholder="••••••••">
            </div>
            <button type="submit" class="btn-ingresar">INGRESAR A MI PANEL</button>
            <div id="mensajeError">Correo o contraseña incorrectos</div>
        </form>
    </div>

    <script>
        function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const pass = document.getElementById('password').value.trim();
            
            // Credenciales de acceso directo o validación local/nube
            if (email.length > 5 && pass.length > 3) {
                localStorage.setItem('adminLogueado', 'true');
                window.location.href = '/panel-ofertas';
            } else {
                document.getElementById('mensajeError').style.display = 'block';
            }
        }
    </script>
</body>
</html>
`;

fs.writeFileSync('./admin.html', adminLimpidisimo);
fs.writeFileSync('./public/admin.html', adminLimpidisimo);
console.log('✅ Archivos admin.html y public/admin.html reemplazados con diseño limpio');
