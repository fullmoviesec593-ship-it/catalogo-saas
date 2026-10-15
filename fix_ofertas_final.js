const fs = require('fs');

const nuevoModulo = `
    <!-- Filtro Interactivo de Ofertas -->
    <div style="margin-bottom: 15px;">
        <label style="display: block; color: #8e9cb1; font-size: 11px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase;">Alcance de la Oferta</label>
        <select id="ofertaAlcance" style="width: 100%; padding: 12px; background: #0f172a; border: 1px solid #1e293b; color: #fff; border-radius: 8px; outline: none; appearance: auto;" onchange="toggleListaServicios(this.value)">
            <option value="todos">Todos los servicios (Catálogo completo)</option>
            <option value="especificos">Solo a servicios específicos...</option>
        </select>
    </div>
    
    <div id="cajaServiciosChecklist" style="display: none; margin-bottom: 15px;">
        <label style="display: block; color: #8e9cb1; font-size: 11px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase;">Selecciona los servicios (Marca la casilla)</label>
        <div id="contenedorListaCheckboxes" style="max-height: 160px; overflow-y: auto; background: #0b1120; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
            <!-- Aquí cargarán los servicios desde la base de datos -->
        </div>
        
        <!-- CAJA INVISIBLE: Esto evita que el botón Guardar se estrelle -->
        <input type="hidden" id="ofertaServiciosNombres" value="">
    </div>

    <script>
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
        contenedor.innerHTML = '<span style="color:#0ea5e9; font-size:12px;">Cargando catálogo desde Firebase...</span>';
        
        try {
            // Llamada directa y segura a tu servidor
            const res = await fetch('/api/db');
            const data = await res.json();
            const servicios = data.servicios || data.tiendas || [];
            
            if (servicios.length === 0) {
                contenedor.innerHTML = '<span style="color:#ef4444; font-size:12px;">No se encontraron servicios registrados.</span>';
                return;
            }

            contenedor.innerHTML = '';
            servicios.forEach((srv) => {
                const nombre = srv.nombre || srv.titulo || srv.servicio;
                if (!nombre) return;
                
                const div = document.createElement('label');
                div.style.cssText = 'display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 6px; border-bottom: 1px solid #1e293b;';
                div.innerHTML = \`<input type="checkbox" class="check-servicio-oferta" value="\${nombre}" onchange="actualizarCajaInvisible()" style="accent-color: #0ea5e9; width: 18px; height: 18px; cursor: pointer;"> <span style="font-weight: 500;">\${nombre}</span>\`;
                contenedor.appendChild(div);
            });
        } catch(error) {
            contenedor.innerHTML = '<span style="color:#ef4444; font-size:12px;">Error al conectar con la base de datos.</span>';
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
            if(inputOculto) inputOculto.value = ''; // Limpiamos la caja invisible
        }
    }
    </script>
`;

const archivos = fs.readdirSync('.').filter(f => f.endsWith('.html'));

archivos.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    
    // APLANADORA: Borrar nuestro intento fallido anterior
    html = html.replace(/<!-- Filtro Interactivo de Ofertas -->[\s\S]*?(<button[^>]*>\s*Guardar Oferta\s*<\/button>)/ig, '$1');

    // Inyectar el código perfecto
    if (html.includes('Guardar Oferta')) {
        const regexBoton = /(<button[^>]*>\s*Guardar Oferta\s*<\/button>)/i;
        html = html.replace(regexBoton, nuevoModulo + '\n$1');
        fs.writeFileSync(file, html);
        console.log('✅ Problema de lista vacía y error al guardar solucionados en: ' + file);
    }
});
