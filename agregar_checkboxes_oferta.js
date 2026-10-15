const fs = require('fs');

const nuevoModuloCheckboxes = `
    <!-- Alcance de la Oferta -->
    <div style="margin-bottom: 15px;">
        <label style="display: block; color: #8e9cb1; font-size: 11px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Alcance de la Oferta</label>
        <select id="ofertaAlcance" style="width: 100%; padding: 12px; background: #0f172a; border: 1px solid #1e293b; color: #fff; border-radius: 8px; outline: none;" onchange="toggleListaServicios(this.value)">
            <option value="todos">Todos los servicios</option>
            <option value="especificos">Solo a servicios específicos...</option>
        </select>
    </div>
    
    <!-- Lista interactiva con checkboxes para servicios -->
    <div id="cajaServiciosChecklist" style="display: none; margin-bottom: 15px;">
        <label style="display: block; color: #8e9cb1; font-size: 11px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Selecciona los servicios con descuento</label>
        <div id="contenedorListaCheckboxes" style="max-height: 160px; overflow-y: auto; background: #0b1120; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
            <!-- Generado dinámicamente -->
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
        if (typeof catalogo !== 'undefined' && Array.isArray(catalogo)) {
            lista = catalogo;
        } else if (typeof servicios !== 'undefined' && Array.isArray(servicios)) {
            lista = servicios;
        } else if (window.db && window.db.servicios) {
            lista = window.db.servicios;
        }

        // Si no detectó variables globales, intenta extraerlos del DOM o fallback básico
        if (!lista || lista.length === 0) {
            const items = document.querySelectorAll('.servicio-card, .card-item, [data-servicio]');
            items.forEach(el => {
                const nombre = el.getAttribute('data-servicio') || el.querySelector('h3, h4, .titulo')?.textContent?.trim();
                if (nombre && !lista.includes(nombre)) lista.push(nombre);
            });
        }

        if (lista.length === 0) {
            contenedor.innerHTML = '<span style="color:#64748b; font-size:12px;">Cargando servicios o no hay registrados aún...</span>';
            return;
        }

        lista.forEach((item, index) => {
            const nombre = typeof item === 'object' ? (item.nombre || item.titulo || item.servicio || 'Servicio ' + (index+1)) : item;
            const idCheck = 'check_srv_' + index;
            const div = document.createElement('label');
            div.style.cssText = 'display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 4px 6px; border-radius: 4px; user-select: none;';
            div.innerHTML = \`<input type="checkbox" class="check-servicio-oferta" value="\${nombre}" style="accent-color: #0284c7; width: 16px; height: 16px; cursor: pointer;"> <span>\${nombre}</span>\`;
            contenedor.appendChild(div);
        });
    }
    </script>
`;

const archivos = fs.readdirSync('.').filter(f => f.endsWith('.html'));

archivos.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    
    // Limpiar cualquier residuo previo de campos de oferta
    html = html.replace(/<!-- Nuevo campo: Alcance de la oferta -->[\s\S]*?<\/div>\s*<\/div>/g, '');
    html = html.replace(/<div style="margin-bottom: 15px;">\s*<label[^>]*>Alcance de la Oferta[\s\S]*?<\/div>\s*<\/div>/g, '');

    // Inyectar justo antes del botón "Guardar Oferta" dentro del modal
    const regexBoton = /(<button[^>]*>\s*Guardar Oferta\s*<\/button>)/i;
    if (regexBoton.test(html)) {
        html = html.replace(regexBoton, nuevoModuloCheckboxes + '\n$1');
        fs.writeFileSync(file, html);
        console.log('✅ Lista de checks inyectada en: ' + file);
    }
});
