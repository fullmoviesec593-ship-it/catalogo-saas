const fs = require('fs');

const motorV3 = `
<!-- MOTOR UNIVERSAL DE VARIANTES V3 -->
<script id="motor-universal-variantes">
(function() {
    function fusionarTarjetas() {
        const botones = Array.from(document.querySelectorAll('button, a')).filter(function(b) {
            const t = (b.textContent || '').trim().toLowerCase();
            return t.indexOf('comprar') !== -1 || t.indexOf('pedir') !== -1;
        });

        if (botones.length < 2) return;

        let tarjetas = [];
        botones.forEach(function(btn) {
            if (btn.closest('#modalOferta') || btn.closest('form') || btn.closest('nav') || btn.closest('header')) return;

            let card = btn.parentElement;
            while (card && card !== document.body) {
                const parent = card.parentElement;
                if (!parent) break;
                const btnsEnParent = Array.from(parent.querySelectorAll('button, a')).filter(function(b) {
                    const t = (b.textContent || '').trim().toLowerCase();
                    return t.indexOf('comprar') !== -1 || t.indexOf('pedir') !== -1;
                });
                if (btnsEnParent.length > 1) break;
                card = parent;
            }

            if (!card || card === document.body || card.dataset.oculto === 'true') return;

            const todos = Array.from(card.querySelectorAll('*'));
            const precioEl = todos.find(function(el) {
                if (el.children.length > 0) return false;
                const txt = (el.textContent || '').trim();
                return txt.charAt(0) === '$' && txt.length >= 2 && txt.length <= 12;
            });

            const ignorar = ['streaming', 'video', 'música', 'musica', 'software', 'ia', 'top', 'popular', 'streaming y tv', 'streaming y deportes', 'streaming, anime', 'comprar ahora!', 'pedir'];
            let tituloEl = card.querySelector('h1, h2, h3, h4, .card-title, .service-title, .titulo');
            
            if (!tituloEl) {
                for (let i = 0; i < todos.length; i++) {
                    let el = todos[i];
                    if (el.children.length === 0) {
                        let txt = (el.textContent || '').trim();
                        let low = txt.toLowerCase();
                        if (txt.length > 2 && txt.charAt(0) !== '$' && txt.charAt(0) !== '✓' && txt.charAt(0) !== '✔' && low.indexOf('1 mes') === -1 && ignorar.indexOf(low) === -1) {
                            tituloEl = el;
                            break;
                        }
                    }
                }
            }

            if (tituloEl && precioEl) {
                if (!tituloEl.dataset.originalTitle) {
                    tituloEl.dataset.originalTitle = tituloEl.textContent.trim();
                }
                let numStr = precioEl.textContent.replace('$', '').trim();
                tarjetas.push({
                    card: card,
                    tituloOriginal: tituloEl.dataset.originalTitle,
                    tituloEl: tituloEl,
                    precioEl: precioEl,
                    precioNum: parseFloat(numStr) || 0,
                    boton: btn
                });
            }
        });

        let familias = {};
        tarjetas.forEach(function(t) {
            let low = t.tituloOriginal.toLowerCase();
            let base = t.tituloOriginal;

            if (low.indexOf('spotify') !== -1) base = 'Spotify';
            else if (low.indexOf('flujo') !== -1) base = 'Flujo TV';
            else if (low.indexOf('netflix') !== -1) base = 'Netflix';
            else if (low.indexOf('disney') !== -1) base = 'Disney+ ESPN';
            else if (low.indexOf('prime') !== -1) base = 'Prime Video';
            else if (low.indexOf('hbo') !== -1 || low.indexOf('max') !== -1) base = 'HBO Max';
            else if (low.indexOf('zona movie') !== -1) base = 'IPTV Zona Movie';
            else if (low.indexOf('stream live') !== -1 || low.indexOf('iptv') !== -1) base = 'IPTV Stream Live';
            else if (low.indexOf('estella') !== -1 || low.indexOf('stella') !== -1) base = 'Estella TV';
            else if (low.indexOf('oleada') !== -1) base = 'Oleada TV';
            else if (low.indexOf('vix') !== -1) base = 'ViX Premium';
            else if (low.indexOf('crunchyroll') !== -1) base = 'Crunchyroll';
            else if (low.indexOf('canva') !== -1) base = 'Canva Pro';
            else if (low.indexOf('gpt') !== -1) base = 'ChatGPT';

            if (!familias[base]) familias[base] = [];
            familias[base].push(t);
        });

        Object.keys(familias).forEach(function(base) {
            let grupo = familias[base];
            if (grupo.length > 1) {
                grupo.sort(function(a, b) { return a.precioNum - b.precioNum; });

                let principal = grupo[0];
                principal.tituloEl.textContent = base;

                for (let i = 1; i < grupo.length; i++) {
                    grupo[i].card.dataset.oculto = 'true';
                    grupo[i].card.style.setProperty('display', 'none', 'important');
                }

                if (principal.card.querySelector('.selector-planes-fm')) return;

                let cajaSelect = document.createElement('div');
                cajaSelect.style.cssText = 'margin: 10px 0; background: #0f172a; padding: 8px 10px; border-radius: 10px; border: 1px solid #0284c7; width: 100%; box-sizing: border-box;';
                
                let html = '<label style="font-size: 10px; color: #38bdf8; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 5px; text-align: left;">⚡ ELIGE TU PLAN / OPCIÓN:</label>';
                html += '<select class="selector-planes-fm" style="width: 100%; padding: 8px; border-radius: 6px; background: #090d16; color: #fff; font-weight: bold; font-size: 13px; border: 1px solid #1e293b; outline: none; cursor: pointer;">';

                grupo.forEach(function(item, idx) {
                    let nombreVar = item.tituloOriginal;
                    if (nombreVar.toLowerCase().indexOf(base.toLowerCase()) === 0) {
                        nombreVar = nombreVar.substring(base.length).trim();
                    }
                    if (nombreVar.toLowerCase().indexOf('tv') === 0) {
                        nombreVar = nombreVar.substring(2).trim();
                    }
                    
                    if (!nombreVar || nombreVar.length < 2) {
                        nombreVar = idx === 0 ? 'Plan Estándar (1 Mes)' : (item.precioNum >= 7 ? 'Cuenta Completa / Plus' : 'Opción ' + (idx + 1));
                    } else {
                        nombreVar = nombreVar.charAt(0).toUpperCase() + nombreVar.slice(1);
                    }

                    let precioTxt = item.precioEl.textContent.trim();
                    html += '<option value="' + idx + '" data-precio="' + precioTxt + '">' + nombreVar + ' ➔ ' + precioTxt + '</option>';
                });

                html += '</select>';
                cajaSelect.innerHTML = html;

                principal.precioEl.parentNode.insertBefore(cajaSelect, principal.precioEl);

                let selectEl = cajaSelect.querySelector('select');
                selectEl.addEventListener('change', function() {
                    let idxElegido = parseInt(this.value, 10);
                    let itemElegido = grupo[idxElegido];
                    
                    principal.precioEl.textContent = itemElegido.precioEl.textContent;
                    
                    principal.boton.onclick = function(e) {
                        if (idxElegido !== 0) {
                            e.preventDefault();
                            e.stopPropagation();
                            itemElegido.boton.click();
                        }
                    };
                });
            }
        });
    }

    setInterval(fusionarTarjetas, 600);
})();
</script>
`;

['./index.html', './public/index.html', './gestor-streaming/public/index.html'].forEach(ruta => {
    if (fs.existsSync(ruta)) {
        let html = fs.readFileSync(ruta, 'utf8');
        html = html.replace(/<!-- MOTOR UNIVERSAL DE VARIANTES[\s\S]*?<\/script>/g, '');
        html = html.replace('</body>', motorV3 + '\n</body>');
        fs.writeFileSync(ruta, html);
        console.log('✅ Motor V3 inyectado limpiamente (0 errores de bash) en: ' + ruta);
    }
});
