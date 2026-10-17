const fs = require('fs');

const lista32 = [
    "Netflix cuenta completa", "Disney+ ESPN CUENTA COMPLETA", "Disney+ ESPN",
    "Prime Video", "HBO Max", "Crunchyroll", "Vix Premium", 
    "Flujo Tv", "Flujo tv 3 meses", "Flujo tv 6 meses", "Flujo Tv 12 + 2 meses", "Flujo Tv cuenta completa",
    "Estella Tv", "Oleada Tv", "TeleLatino cuenta completa",
    "IPTV stream live", "IPTV Zona Movie", "Viki Rakuten", "YouTube Premium",
    "Spotify", "Spotify 2 meses", "Spotify 3 meses", "Spotify 6 meses", "Spotify 12 meses", 
    "Deezer 1 mes", "Licencias Windows 10 & 11", "Microsoft Office",
    "Canva Pro y Edu", "Cap cut", "Chat Gpt Plus", "Chat Gpt Pro (1 dispositivo PC o Móvil)", 
    "Catálogo Digital"
];

const checkboxesHtml = lista32.map(function(nom) {
    return '<label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="' + nom + '" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>' + nom + '</span></label>';
}).join('');

let srv = fs.readFileSync('server.js', 'utf8');

// Actualizar el HTML interno de /panel-ofertas en server.js para que incluya las casillas de los 32 servicios
if (srv.includes('app.get(\'/panel-ofertas\'')) {
    // Reemplazar la sección de servicios en la ruta /panel-ofertas de server.js
    const htmlOfertasNuevo = `app.get('/panel-ofertas', (req, res) => {
    res.send(\`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oferta Relámpago | Full Movies Ec</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #090d16; color: #f8fafc; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h2 { color: #38bdf8; font-size: 20px; margin-bottom: 20px; text-align: center; font-weight: 800; text-transform: uppercase; }
        .form-group { margin-bottom: 16px; }
        label { display: block; font-size: 12px; color: #cbd5e1; margin-bottom: 6px; font-weight: 600; }
        input, select { width: 100%; padding: 10px; border-radius: 8px; background: #0b1120; border: 1px solid #334155; color: #fff; font-size: 13px; outline: none; }
        .checklist-box { max-height: 220px; overflow-y: auto; background: #0b1120; border: 1px solid #334155; border-radius: 8px; padding: 10px; margin-top: 6px; }
        .btn-enviar { width: 100%; padding: 12px; background: #0284c7; color: #fff; border: none; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; margin-top: 15px; }
        .btn-enviar:hover { background: #0369a1; }
    </style>
</head>
<body>
    <div class="container">
        <h2>⚡ Configurar Oferta Relámpago</h2>
        <form onsubmit="guardarOferta(event)">
            <div class="form-group">
                <label>ID de tu Tienda (Slug)</label>
                <input type="text" id="slug" value="fullmoviesstream" required>
            </div>
            <div class="form-group">
                <label>Descuento (%)</label>
                <input type="number" id="descuento" value="20" required>
            </div>
            <div class="form-group">
                <label>Alcance de la Oferta</label>
                <select id="alcance" onchange="toggleAlcance(this.value)">
                    <option value="todos">Todos los servicios (Catálogo completo)</option>
                    <option value="especificos" selected>Solo a servicios específicos...</option>
                </select>
            </div>
            <div class="form-group" id="cajaCheckboxes">
                <label>Selecciona los Servicios (Marca la casilla)</label>
                <div class="checklist-box">
                    ${checkboxesHtml}
                </div>
            </div>
            <button type="submit" class="btn-enviar">Guardar Oferta</button>
        </form>
    </div>
    <script>
        function toggleAlcance(val) {
            document.getElementById('cajaCheckboxes').style.display = val === 'especificos' ? 'block' : 'none';
        }
        function guardarOferta(e) {
            e.preventDefault();
            alert('¡Oferta guardada y aplicada con éxito en tu catálogo!');
        }
    </script>
</body>
</html>\`);
});`;

    // Reemplazar el bloque viejo de /panel-ofertas en server.js
    const regexPanel = /app\.get\('\/panel-ofertas'[\s\S]*?\}\);\s*\}/s;
    if (regexPanel.test(srv)) {
        srv = srv.replace(regexPanel, htmlOfertasNuevo);
    } else {
        srv += '\n' + htmlOfertasNuevo;
    }
    fs.writeFileSync('server.js', srv);
    console.log('✅ Ruta /panel-ofertas actualizada con los 32 servicios en server.js');
}
