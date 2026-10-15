const fs = require('fs');

const nuevoCampo = `
    <!-- Nuevo campo: Alcance de la oferta -->
    <div style="margin-bottom: 15px;">
        <label style="display: block; color: #8e9cb1; font-size: 10px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase;">Alcance de la Oferta</label>
        <select id="ofertaAlcance" style="width: 100%; padding: 12px; background: #0f172a; border: 1px solid #1e293b; color: #fff; border-radius: 8px; outline: none; appearance: none;" onchange="document.getElementById('cajaEspecificos').style.display = this.value === 'especificos' ? 'block' : 'none'">
            <option value="todos">Todos los servicios</option>
            <option value="especificos">Solo a servicios específicos...</option>
        </select>
    </div>
    
    <!-- Caja oculta que aparece solo si eligen 'especificos' -->
    <div id="cajaEspecificos" style="display: none; margin-bottom: 15px;">
        <label style="display: block; color: #8e9cb1; font-size: 10px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase;">¿A cuáles servicios? (Escribe los nombres)</label>
        <input type="text" id="ofertaServiciosNombres" placeholder="Ej: Netflix, Prime Video, Combos..." style="width: 100%; padding: 12px; background: #0f172a; border: 1px solid #1e293b; color: #fff; border-radius: 8px; outline: none; box-sizing: border-box;">
    </div>
`;

const archivos = fs.readdirSync('.').filter(f => f.endsWith('.html'));

archivos.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    // Esta vez usamos una regla estricta que SOLO busca el botón exacto de la oferta
    const botonExacto = /(<button[^>]*>\s*Guardar Oferta\s*<\/button>)/i;
    
    if (botonExacto.test(html) && !html.includes('ofertaAlcance')) {
        html = html.replace(botonExacto, nuevoCampo + '\n$1');
        fs.writeFileSync(file, html);
        console.log('✅ Filtro de oferta colocado correctamente en: ' + file);
    }
});
