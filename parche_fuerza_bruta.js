const fs = require('fs');

// 1. Mostrar qué rutas sirve server.js para no adivinar más
const srv = fs.readFileSync('server.js', 'utf8');
console.log("=== RUTAS EN SERVER.JS ===");
srv.split('\n').forEach((line, idx) => {
    if (line.includes('sendFile') || line.includes('express.static') || line.includes('app.get')) {
        console.log((idx + 1) + ': ' + line.trim());
    }
});
console.log("==========================");

// 2. Parche de Fuerza Bruta que pisa cualquier función vieja
const scriptFuerzaBruta = `
<!-- PARCHE FUERZA BRUTA OFERTAS Y VARIANTES -->
<script id="parche-fuerza-bruta">
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
        if (!inputOculto) {
            inputOculto = document.createElement('input');
            inputOculto.type = 'hidden';
            inputOculto.id = 'ofertaServiciosNombres';
            document.body.appendChild(inputOculto);
        }
        inputOculto.value = seleccionados.join(', ');
    };

    function forzarListaCompleta() {
        const contenedor = document.getElementById('contenedorListaCheckboxes');
        if (!contenedor) return;

        // Si tiene menos de 5 servicios (ej. cuando solo sale "Netflix Premium" o "Cargando..."), inyectar los 32 a la fuerza
        const checksActuales = contenedor.querySelectorAll('input[type="checkbox"]');
        if (checksActuales.length < 5) {
            contenedor.innerHTML = '';
            listaMaestra.forEach(function(nombre) {
                const div = document.createElement('label');
                div.style.cssText = 'display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b; user-select: none;';
                div.innerHTML = '<input type="checkbox" class="check-servicio-oferta" value="' + nombre + '" onchange="window.actualizarCajaInvisible()" style="accent-color: #0ea5e9; width: 18px; height: 18px; cursor: pointer;"> <span style="font-weight: 500;">' + nombre + '</span>';
                contenedor.appendChild(div);
            });
        }
    }

    // Sobrescribir las funciones globales por si el select las llama
    window.poblarCheckboxesServicios = forzarListaCompleta;
    window.toggleListaServicios = function(valor) {
        const caja = document.getElementById('cajaServiciosChecklist');
        if (!caja) return;
        if (valor === 'especificos') {
            caja.style.display = 'block';
            forzarListaCompleta();
        } else {
            caja.style.display = 'none';
        }
    };

    // Vigilante permanente cada 400ms que reemplaza "Netflix Premium" apenas aparezca
    setInterval(forzarListaCompleta, 400);
})();
</script>
`;

function inyectarEnTodos(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(function(f) {
        if (f === 'node_modules' || f === '.git') return;
        const full = dir + '/' + f;
        if (fs.statSync(full).isDirectory()) {
            inyectarEnTodos(full);
        } else if (f.endsWith('.html')) {
            let html = fs.readFileSync(full, 'utf8');
            html = html.replace(/<!-- PARCHE FUERZA BRUTA[\s\S]*?<\/script>/g, '');
            if (html.indexOf('</body>') !== -1) {
                html = html.replace('</body>', scriptFuerzaBruta + '\n</body>');
                fs.writeFileSync(full, html);
                console.log('✅ Parche Fuerza Bruta inyectado en: ' + full);
            }
        }
    });
}

inyectarEnTodos('.');
