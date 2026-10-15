const fs = require('fs');

const nuevoModulo = `
    <!-- Filtro Interactivo de Ofertas -->
    <div style="margin-bottom: 15px;">
        <label style="display: block; color: #8e9cb1; font-size: 11px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Alcance de la Oferta</label>
        <select id="ofertaAlcance" style="width: 100%; padding: 12px; background: #0f172a; border: 1px solid #1e293b; color: #fff; border-radius: 8px; outline: none; appearance: auto;" onchange="toggleListaServicios(this.value)">
            <option value="todos">Todos los servicios (Catálogo completo)</option>
            <option value="especificos">Solo a servicios específicos...</option>
        </select>
    </div>
    
    <div id="cajaServiciosChecklist" style="display: none; margin-bottom: 15px;">
        <label style="display: block; color: #8e9cb1; font-size: 11px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Selecciona los servicios (Marca la casilla)</label>
        <div id="contenedorListaCheckboxes" style="max-height: 160px; overflow-y: auto; background: #0b1120; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
            <!-- Los checks aparecerán aquí mágicamente -->
        </div>
    </div>

    <script>
    function toggleListaServicios(valor) {
        const caja = document.getElementById('cajaServiciosChecklist');
        if (!caja) return;
        if (valor === 'especificos') {
            caja.style.display = 'block';
            poblarCheckboxesServicios();
        } else {
            caja.style.display = 'none';
        }
    }

    function poblarCheckboxesServicios() {
        const contenedor = document.getElementById('contenedorListaCheckboxes');
        if (!contenedor) return;
        contenedor.innerHTML = '';
        
        let lista = [];
        
        // 1. Buscar nombres de servicios directamente en las tarjetas de la pantalla
        const tarjetas = document.querySelectorAll('.servicio-card h3, .servicio-card h4, .titulo, [data-servicio]');
        tarjetas.forEach(el => {
            const nombre = el.getAttribute('data-servicio') || el.textContent.trim();
            if (nombre && !lista.includes(nombre)) lista.push(nombre);
        });

        // 2. Si la pantalla está vacía, buscar en la memoria de Firebase del navegador
        if (lista.length === 0 && window.db && window.db.servicios) {
            lista = window.db.servicios.map(s => s.nombre || s.servicio || s.titulo);
        }

        if (lista.length === 0) {
            contenedor.innerHTML = '<span style="color:#64748b; font-size:12px;">No se detectaron servicios. Asegúrate de tener servicios registrados en tu catálogo.</span>';
            return;
        }

        // Crear los checkboxes
        lista.forEach((nombre, index) => {
            const div = document.createElement('label');
            div.style.cssText = 'display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 6px; border-radius: 4px; user-select: none; border-bottom: 1px solid #1e293b;';
            div.innerHTML = \`<input type="checkbox" class="check-servicio-oferta" value="\${nombre}" style="accent-color: #0ea5e9; width: 18px; height: 18px; cursor: pointer;"> <span style="font-weight: 500;">\${nombre}</span>\`;
            contenedor.appendChild(div);
        });
    }
    </script>
`;

const archivos = fs.readdirSync('.').filter(f => f.endsWith('.html'));

archivos.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    
    // APLANADORA: Borrar cualquier rastro del menú anterior usando el botón como límite
    html = html.replace(/<!-- Nuevo campo: Alcance de la oferta -->[\s\S]*?(<button[^>]*>\s*Guardar Oferta\s*<\/button>)/ig, '$1');
    html = html.replace(/<!-- Alcance de la Oferta -->[\s\S]*?(<button[^>]*>\s*Guardar Oferta\s*<\/button>)/ig, '$1');
    html = html.replace(/<!-- Filtro Interactivo de Ofertas -->[\s\S]*?(<button[^>]*>\s*Guardar Oferta\s*<\/button>)/ig, '$1');

    // Insertar el nuevo bloque limpio
    if (html.includes('Guardar Oferta')) {
        const regexBoton = /(<button[^>]*>\s*Guardar Oferta\s*<\/button>)/i;
        html = html.replace(regexBoton, nuevoModulo + '\n$1');
        fs.writeFileSync(file, html);
        console.log('✅ Checkboxes de ofertas instalados a la fuerza en: ' + file);
    }
});
