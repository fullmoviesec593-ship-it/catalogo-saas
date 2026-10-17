const fs = require('fs');

let srv = fs.readFileSync('server.js', 'utf8');

// 1. Mostrar líneas 45 a 115 para ver las rutas estáticas
console.log("=== SERVER.JS (Líneas 45 a 115) ===");
console.log(srv.split('\n').slice(45, 115).join('\n'));
console.log("===================================");

// 2. Reemplazar cualquier "Netflix Premium" o función vieja que esté incrustada DENTRO de server.js
const scriptIncrustado = `
<script>
(function() {
    const listaMaestra = [
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

    window.actualizarCajaInvisible = function() {
        const checks = document.querySelectorAll('.check-servicio-oferta:checked');
        const seleccionados = Array.from(checks).map(function(c) { return c.value; });
        let inputOculto = document.getElementById('ofertaServiciosNombres');
        if (inputOculto) inputOculto.value = seleccionados.join(', ');
    };

    function poblar() {
        const contenedor = document.getElementById('contenedorListaCheckboxes');
        if (!contenedor) return;
        if (contenedor.querySelectorAll('input[type="checkbox"]').length < 5) {
            contenedor.innerHTML = '';
            listaMaestra.forEach(function(nombre) {
                const div = document.createElement('label');
                div.style.cssText = 'display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;';
                div.innerHTML = '<input type="checkbox" class="check-servicio-oferta" value="' + nombre + '" onchange="window.actualizarCajaInvisible()" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>' + nombre + '</span>';
                contenedor.appendChild(div);
            });
        }
    }
    setInterval(poblar, 300);
})();
</script>
`;

// Si server.js tiene HTML incrustado al final, le inyectamos el script antes de </body>
const ultimoBody = srv.lastIndexOf('</body>');
if (ultimoBody !== -1) {
    srv = srv.substring(0, ultimoBody) + scriptIncrustado + '\n</body>' + srv.substring(ultimoBody + 7);
    fs.writeFileSync('server.js', srv);
    console.log('✅ HTML interno de server.js actualizado con los 32 servicios');
}
