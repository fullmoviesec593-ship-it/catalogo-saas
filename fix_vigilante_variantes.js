const fs = require('fs');

const scriptVigilante = `
<!-- MOTOR DE DESPLEGABLES EN TIEMPO REAL -->
<script id="motor-variantes-vivo">
(function() {
    function agruparCatalogoEnVivo() {
        // Buscar todos los botones de compra visibles que aún no hayan sido procesados
        const botones = Array.from(document.querySelectorAll('a, button')).filter(el => {
            const txt = el.textContent.toLowerCase();
            return (txt.includes('comprar') || txt.includes('pedir')) && !el.dataset.procesado;
        });

        if (botones.length === 0) return;

        let productos = [];
        botones.forEach(btn => {
            // Subir por el árbol HTML hasta encontrar el contenedor exacto de la tarjeta
            let card = btn.parentElement;
            while (card && card !== document.body) {
                const tienePrecio = card.textContent.includes('$');
                const tieneTitulo = card.querySelector('h1, h2, h3, h4, h5, .titulo, [class*="title"], b, strong');
                if (tienePrecio && tieneTitulo && card.tagName === 'DIV') {
                    // Verificar que este contenedor solo tenga 1 botón de comprar (para no agarrar toda la cuadrícula)
                    const btnsAdentro = Array.from(card.querySelectorAll('a, button')).filter(b => b.textContent.toLowerCase().includes('comprar'));
                    if (btnsAdentro.length === 1) break;
                }
                card = card.parentElement;
            }

            if (!card || card === document.body) return;

            let tituloEl = card.querySelector('h2, h3, h4, h5, .titulo, [class*="title"]');
            let precioEl = Array.from(card.querySelectorAll('span, div, p, b, strong, h2, h3, h4')).find(el => 
                el.children.length === 0 && el.textContent.trim().startsWith('$')
            );

            if (tituloEl && precioEl) {
                btn.dataset.procesado = "true";
                productos.push({
                    card: card,
                    tituloOriginal: tituloEl.textContent.trim(),
                    tituloEl: tituloEl,
                    precioEl: precioEl,
                    boton: btn
                });
            }
        });

        if (productos.length === 0) return;

        // Agrupar por marcas principales
        let familias = {};
        productos.forEach(p => {
            let t = p.tituloOriginal.toLowerCase();
            let base = p.tituloOriginal;

            if (t.includes('spotify')) base = 'Spotify';
            else if (t.includes('flujo')) base = 'Flujo TV';
            else if (t.includes('netflix')) base = 'Netflix';
            else if (t.includes('disney')) base = 'Disney+ ESPN';
            else if (t.includes('prime')) base = 'Prime Video';
            else if (t.includes('hbo') || t.includes('max')) base = 'HBO Max';
            else if (t.includes('iptv') && t.includes('zona')) base = 'IPTV Zona Movie';
            else if (t.includes('iptv')) base = 'IPTV Stream Live';
            else if (t.includes('estella') || t.includes('stella')) base = 'Estella TV';
            else if (t.includes('oleada')) base = 'Oleada TV';
            else if (t.includes('vix')) base = 'ViX Premium';
            else if (t.includes('crunchyroll')) base = 'Crunchyroll';
            else if (t.includes('plex')) base = 'Plex';
            else if (t.includes('canva')) base = 'Canva Pro';
            else if (t.includes('gpt')) base = 'ChatGPT';

            if (!familias[base]) familias[base] = [];
            familias[base].push(p);
        });

        // Construir los menús desplegables en las tarjetas principales
        Object.keys(familias).forEach(base => {
            let lista = familias[base];
            if (lista.length > 1) {
                // Ordenar por precio de menor a mayor
                lista.sort((a, b) => {
                    let pa = parseFloat(a.precioEl.textContent.replace(/[^0-9.]/g, '')) || 0;
                    let pb = parseFloat(b.precioEl.textContent.replace(/[^0-9.]/g, '')) || 0;
                    return pa - pb;
                });

                let principal = lista[0];
                principal.tituloEl.textContent = base;

                // Ocultar las tarjetas repetidas
                for (let i = 1; i < lista.length; i++) {
                    lista[i].card.style.setProperty('display', 'none', 'important');
                }

                // Evitar duplicar el selector si ya existe
                if (principal.card.querySelector('.selector-planes-ia')) return;

                // Crear la caja del menú desplegable con estilo oscuro profesional
                let contenedorSelect = document.createElement('div');
                contenedorSelect.style.cssText = 'margin: 12px 0; background: #0f172a; padding: 10px; border-radius: 10px; border: 1px solid #1e293b; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);';
                
                let htmlSelect = '<label style="font-size: 10px; color: #38bdf8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 6px; letter-spacing: 0.5px;">⚡ ELIGE TU PLAN / DURACIÓN:</label>';
                htmlSelect += '<select class="selector-planes-ia" style="width: 100%; padding: 10px; border-radius: 8px; background: #0b1120; color: #f8fafc; font-weight: bold; font-size: 13px; border: 1px solid #0284c7; outline: none; cursor: pointer;">';

                lista.forEach((item, idx) => {
                    let variante = item.tituloOriginal.replace(new RegExp(base, 'ig'), '').replace(/[-+]/g, ' ').trim();
                    if (!variante || variante.length < 2) variante = 'Plan Estándar (1 Mes)';
                    // Capitalizar primera letra
                    variante = variante.charAt(0).toUpperCase() + variante.slice(1);
                    
                    let precio = item.precioEl.textContent.trim();
                    let link = item.boton.getAttribute('href') || '';
                    let onclickAttr = item.boton.getAttribute('onclick') || '';

                    htmlSelect += \`<option value="\${idx}" data-precio="\${precio}" data-link="\${link}" data-onclick="\${onclickAttr}">\${variante} ➔ \${precio}</option>\`;
                });

                htmlSelect += '</select>';
                contenedorSelect.innerHTML = htmlSelect;

                // Insertar justo encima del precio
                principal.precioEl.parentNode.insertBefore(contenedorSelect, principal.precioEl);
                principal.precioEl.style.transition = 'transform 0.2s, color 0.2s';

                // Actualizar precio y botón al cambiar de opción
                let selectElem = contenedorSelect.querySelector('select');
                selectElem.addEventListener('change', function() {
                    let opt = this.options[this.selectedIndex];
                    
                    // Pequeño efecto de destello en el precio
                    principal.precioEl.style.transform = 'scale(1.1)';
                    principal.precioEl.style.color = '#38bdf8';
                    principal.precioEl.textContent = opt.getAttribute('data-precio');
                    setTimeout(() => {
                        principal.precioEl.style.transform = 'scale(1)';
                        principal.precioEl.style.color = '';
                    }, 200);

                    let linkNuevo = opt.getAttribute('data-link');
                    let onclickNuevo = opt.getAttribute('data-onclick');
                    if (linkNuevo) principal.boton.setAttribute('href', linkNuevo);
                    if (onclickNuevo) principal.boton.setAttribute('onclick', onclickNuevo);
                });
            }
        });
    }

    // Ejecutar continuamente cada 800ms para atrapar cargas de Firebase o cambios de filtro
    setInterval(agruparCatalogoEnVivo, 800);
})();
</script>
`;

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
htmlFiles.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    // Limpiar motores anteriores
    html = html.replace(/<!-- SISTEMA DE VARIANTES PREMIUM -->[\s\S]*?<\/script>/g, '');
    html = html.replace(/<!-- MOTOR DE DESPLEGABLES INTELIGENTE PARA CLIENTES -->[\s\S]*?<\/script>/g, '');
    html = html.replace(/<!-- MOTOR DE DESPLEGABLES EN TIEMPO REAL -->[\s\S]*?<\/script>/g, '');

    html = html.replace('</body>', scriptVigilante + '\n</body>');
    fs.writeFileSync(file, html);
    console.log('✅ Vigilante de variantes en tiempo real instalado en: ' + file);
});
