const fs = require('fs');

// Buscar el archivo admin.html original o el panel principal y renombrarlo/copiarlo para acceso directo
['./admin.html', './public/admin.html'].forEach(function(ruta) {
    if (fs.existsSync(ruta)) {
        // Crear un panel admin de acceso directo libre de login
        const panelDirecto = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel Admin | Full Movies Ec</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #090d16; color: #f8fafc; padding: 20px; }
        .header { background: #0f172a; border: 1px solid #1e293b; padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .header h1 { color: #38bdf8; font-size: 20px; font-weight: 800; }
        .btn-volver { background: #0284c7; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; }
        .iframe-container { width: 100%; height: 80vh; border: 1px solid #1e293b; border-radius: 12px; background: #0b1120; }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚡ Panel de Control - Full Movies Ec</h1>
        <a href="/" class="btn-volver">Ver Tienda Pública</a>
    </div>
    <iframe src="/panel-ofertas" class="iframe-container"></iframe>
</body>
</html>
`;
        fs.writeFileSync(ruta, panelDirecto);
        console.log('✅ Panel admin convertido a acceso directo en: ' + ruta);
    }
});
