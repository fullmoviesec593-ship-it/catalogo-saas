const fs = require('fs');

const nuevoScript = `
    <script>
    // Catálogo Exacto extraído del panel de Full Movies Ec
    const catalogoOficial = [
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

    function actualizarCajaInvisible() {
        const checks = document.querySelectorAll('.check-servicio-oferta:checked');
        const seleccionados = Array.from(checks).map(c => c.value);
        const inputOculto = document.getElementById('ofertaServiciosNombres');
        if(inputOculto) {
            inputOculto.value = seleccionados.join(', ');
        }
    }

    async function poblarCheckboxesServicios() {
        const contenedor = document.getElementById('contenedorListaCheckboxes');
        if (!contenedor) return;
        contenedor.innerHTML = '<span style="color:#0ea5e9; font-size:12px;">Cargando catálogo maestro...</span>';
        
        try {
            let serviciosDB = [];
            try {
                const res = await fetch('/api/db');
                const data = await res.json();
                if (data.servicios) {
                    serviciosDB = data.servicios.map(s => s.nombre || s.titulo || s.servicio).filter(Boolean);
                }
            } catch(e) {}

            let listaFinal = [...new Set([...catalogoOficial, ...serviciosDB])].filter(Boolean);

            contenedor.innerHTML = '';
            listaFinal.forEach((nombre) => {
                const div = document.createElement('label');
                div.style.cssText = 'display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 6px; border-bottom: 1px solid #1e293b;';
                div.innerHTML = \`<input type="checkbox" class="check-servicio-oferta" value="\${nombre}" onchange="actualizarCajaInvisible()" style="accent-color: #0ea5e9; width: 18px; height: 18px; cursor: pointer;"> <span style="font-weight: 500;">\${nombre}</span>\`;
                contenedor.appendChild(div);
            });
        } catch(error) {
            contenedor.innerHTML = '<span style="color:#ef4444; font-size:12px;">Error al cargar catálogo.</span>';
        }
    }

    function toggleListaServicios(valor) {
        const caja = document.getElementById('cajaServiciosChecklist');
        const inputOculto = document.getElementById('ofertaServiciosNombres');
        if (!caja) return;
        
        if (valor === 'especificos') {
            caja.style.display = 'block';
            poblarCheckboxesServicios();
        } else {
            caja.style.display = 'none';
            if(inputOculto) inputOculto.value = ''; 
        }
    }
    </script>
`;

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    const scriptRegex = /<script>\s*\/\/\s*Catálogo Maestro[\s\S]*?<\/script>/i;
    
    if (scriptRegex.test(html)) {
        html = html.replace(scriptRegex, nuevoScript);
        fs.writeFileSync(file, html);
        console.log('✅ Catálogo exacto actualizado en: ' + file);
    }
});
