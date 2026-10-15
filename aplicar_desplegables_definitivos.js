const fs = require('fs');

const scriptDefinitivo = `
<!-- MOTOR DE DESPLEGABLES INTELIGENTE PARA CLIENTES -->
<script>
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(organizarVariantesCatalogo, 1000);
});

function organizarVariantesCatalogo() {
    // Buscar todos los bloques que contengan productos
    const botones = Array.from(document.querySelectorAll('a, button')).filter(el => 
        el.textContent.toLowerCase().includes('comprar') || el.textContent.toLowerCase().includes('pedir')
    );

    let productos = [];
    botones.forEach(btn => {
        let card = btn.closest('.card, [class*="product"], [class*="item"]') || btn.parentElement.parentElement;
        if (!card) return;

        let tituloEl = card.querySelector('h2, h3, h4, h5, .titulo, [class*="title"]');
        let precioEl = Array.from(card.querySelectorAll('span, div, p, b, strong')).find(el => el.textContent.trim().startsWith('$'));

        if (tituloEl && precioEl) {
            productos.чити = true;
            productos.push({
                card: card,
                tituloOriginal: tituloEl.textContent.trim(),
                tituloEl: tituloEl,
                precioEl: precioEl,
                boton: btn
            });
        }
    });

    // Agrupar por marcas principales
    let familias = {};
    productos.forEach(p => {
        let t = p.tituloOriginal.toLowerCase();
        let base = p.tituloOriginal;

        if (t.includes('spotify')) base = 'Spotify';
        else if (t.includes('flujo')) base = 'Flujo TV';
        else if (t.includes('netflix')) base = 'Netflix';
        else if (t.includes('disney')) base = 'Disney+';
        else if (t.includes('prime')) base = 'Prime Video';
        else if (t.includes('hbo') || t.includes('max')) base = 'HBO Max';
        else if (t.includes('iptv')) base = 'IPTV';
        else if (t.includes('estella') || t.includes('stella')) base = 'Estella TV';
        else if (t.includes('oleada')) base = 'Oleada TV';
        else if (t.includes('vix')) base = 'ViX Premium';
        else if (t.includes('crunchyroll')) base = 'Crunchyroll';
        else if (t.includes('plex')) base = 'Plex';
        else if (t.includes('canva')) base = 'Canva Pro';

        if (!familias[base]) familias[base] = [];
        familias[base].push(p);
    });

    // Construir los menús desplegables en las tarjetas principales
    Object.keys(familias).forEach(base => {
        let lista = familias[base];
        if (lista.length > 1) {
            // Ordenar por precio menor a mayor
            lista.sort((a, b) => parseFloat(a.precioEl.textContent.replace('$', '')) - parseFloat(b.precioEl.textContent.replace('$', '')));

            let principal = lista[0];
            principal.tituloEl.textContent = base;

            // Ocultar las tarjetas duplicadas
            for (let i = 1; i < lista.length; i++) {
                lista[i].card.style.display = 'none';
            }

            // Crear el menú desplegable con estilo oscuro profesional
            let contenedorSelect = document.createElement('div');
            contenedorSelect.style.cssText = 'margin: 10px 0; background: #0f172a; padding: 8px; border-radius: 8px; border: 1px solid #1e293b;';
            
            let htmlSelect = '<label style="font-size: 9px; color: #94a3b8; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 4px;">⏳ Selecciona tu plan:</label>';
            htmlSelect += '<select class="selector-planes-ia" style="width: 100%; padding: 8px; border-radius: 6px; background: #0b1120; color: #0ea5e9; font-weight: bold; font-size: 12px; border: 1px solid #334155; outline: none;">';

            lista.forEach((item, idx) => {
                let variante = item.tituloOriginal.replace(new RegExp(base, 'ig'), '').trim();
                if (!variante) variante = 'Plan Estándar';
                let precio = item.precioEl.textContent.trim();
                let link = item.boton.getAttribute('href') || '';

                htmlSelect += \`<option value="\${idx}" data-precio="\${precio}" data-link="\${link}">\${variante} ➔ \${precio}</option>\`;
            });

            htmlSelect += '</select>';
            contenedorSelect.innerHTML = htmlSelect;

            principal.precioEl.parentNode.insertBefore(contenedorSelect, principal.precioEl);

            // Evento al cambiar de opción en el menú
            let selectElem = contenedorSelect.querySelector('select');
            selectElem.addEventListener('change', function() {
                let opt = this.options[this.selectedIndex];
                principal.precioEl.textContent = opt.getAttribute('data-precio');
                let linkNuevo = opt.getAttribute('data-link');
                if (linkNuevo) principal.boton.setAttribute('href', linkNuevo);
            });
        }
    });
}
</script>
`;

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
htmlFiles.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    if (!html.includes('MOTOR DE DESPLEGABLES INTELIGENTE')) {
        html = html.replace('</body>', scriptDefinitivo + '\n</body>');
        fs.writeFileSync(file, html);
        console.log('✅ Desplegables inteligentes aplicados en: ' + file);
    }
});
