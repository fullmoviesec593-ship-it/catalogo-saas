const fs = require('fs');

const codigoMotor = `
<!-- MOTOR UNIVERSAL DE VARIANTES FULL MOVIES EC -->
<script id="motor-universal-variantes">
(function() {
    function fusionarTarjetas() {
        // 1. Encontrar todos los botones verdes de "Comprar ahora!"
        const botones = Array.from(document.querySelectorAll('button, a')).filter(b => 
            b.textContent && b.textContent.trim().toLowerCase().includes('comprar ahora')
        );

        if (botones.length < 2) return;

        let tarjetas = [];
        botones.forEach(btn => {
            // Subir hasta encontrar la caja de la tarjeta individual
            let card = btn.parentElement;
            while (card && card !== document.body) {
                const cantBotones = Array.from(card.querySelectorAll('button, a')).filter(b => 
                    b.textContent && b.textContent.trim().toLowerCase().includes('comprar ahora')
                ).length;
                
                // Si el contenedor de arriba ya tiene más de 1 botón de comprar, entonces 'card' es nuestra tarjeta exacta
                if (card.parentElement) {
                    const cantArriba = Array.from(card.parentElement.querySelectorAll('button, a')).filter(b => 
                        b.textContent && b.textContent.trim().toLowerCase().includes('comprar ahora')
                    ).length;
                    if (cantBotones === 1 && cantArriba > 1) break;
                }
                card = card.parentElement;
            }

            if (!card || card === document.body || card.dataset.oculto === "true") return;

            // Encontrar el elemento del precio ($3.50, $7.50, etc.)
            const todosElementos = Array.from(card.querySelectorAll('*'));
            const precioEl = todosElementos.find(el => 
                el.children.length === 0 && /^\$\d+(\.\d+)?$/.test(el.textContent.trim())
            );

            // Encontrar el título (buscando textos cortos que no sean categorías ni precios)
            const textosIgnorar = ['streaming', 'video', 'música', 'musica', 'software', 'ia', 'top', 'popular', 'streaming y tv', 'streaming y deportes', 'streaming, anime', 'comprar ahora!'];
            let tituloEl = null;
            
            for (let el of todosElementos) {
                if (el.children.length === 0 && el.textContent.trim().length > 2) {
                    let txt = el.textContent.trim();
                    let txtLow = txt.toLowerCase();
                    if (!txt.startsWith('$') && !txt.startsWith('✓') && !txtLow.includes('1 mes') && !textosIgnorar.includes(txtLow)) {
                        tituloEl = el;
                        break;
                    }
                }
            }

            if (tituloEl && precioEl) {
                tarjetas.push({
                    card: card,
                    tituloOriginal: tituloEl.textContent.trim(),
                    tituloEl: tituloEl,
                    precioEl: precioEl,
                    precioNum: parseFloat(precioEl.textContent.replace(/[^0-9.]/g, '')) || 0,
                    boton: btn
                });
            }
        });

        // 2. Agrupar por familia de producto
        let familias = {};
        tarjetas.forEach(t => {
            let low = t.tituloOriginal.toLowerCase();
            let base = t.tituloOriginal;

            if (low.includes('spotify')) base = 'Spotify';
            else if (low.includes('flujo')) base = 'Flujo TV';
            else if (low.includes('netflix')) base = 'Netflix';
            else if (low.includes('disney')) base = 'Disney+ ESPN';
            else if (low.includes('prime')) base = 'Prime Video';
            else if (low.includes('hbo') || low.includes('max')) base = 'HBO Max';
            else if (low.includes('zona movie')) base = 'IPTV Zona Movie';
            else if (low.includes('stream live') || low.includes('iptv')) base = 'IPTV Stream Live';
            else if (low.includes('estella') || low.includes('stella')) base = 'Estella TV';
            else if (low.includes('oleada')) base = 'Oleada TV';
            else if (low.includes('vix')) base = 'ViX Premium';
            else if (low.includes('crunchyroll')) base = 'Crunchyroll';
            else if (low.includes('canva')) base = 'Canva Pro';
            else if (low.includes('gpt')) base = 'ChatGPT';

            if (!familias[base]) familias[base] = [];
            familias[base].push(t);
        });

        // 3. Fusionar tarjetas y crear el selector desplegable
        Object.keys(familias).forEach(base => {
            let grupo = familias[base];
            if (grupo.length > 1) {
                // Ordenar por precio de menor a mayor
                grupo.sort((a, b) => a.precioNum - b.precioNum);

                let principal = grupo[0];
                principal.tituloEl.textContent = base;

                // Ocultar duplicadas
                for (let i = 1; i < grupo.length; i++) {
                    grupo[i].card.dataset.oculto = "true";
                    grupo[i].card.style.setProperty('display', 'none', 'important');
                }

                if (principal.card.querySelector('.selector-planes-fm')) return;

                let cajaSelect = document.createElement('div');
                cajaSelect.style.cssText = 'margin: 10px 0; background: #0f172a; padding: 8px 10px; border-radius: 10px; border: 1px solid #0284c7;';
                
                let html = '<label style="font-size: 10px; color: #38bdf8; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 5px;">⚡ ELIGE TU PLAN / OPCIÓN:</label>';
                html += '<select class="selector-planes-fm" style="width: 100%; padding: 8px; border-radius: 6px; background: #090d16; color: #fff; font-weight: bold; font-size: 13px; border: 1px solid #1e293b; outline: none;">';

                grupo.forEach((item, idx) => {
                    let nombreVar = item.tituloOriginal.replace(new RegExp(base, 'ig'), '').replace(/[-+]/g, ' ').trim();
                    
                    // Si tenían exactamente el mismo título (ej. dos "Oleada Tv"), diferenciarlos
                    if (!nombreVar || nombreVar.length < 2) {
                        nombreVar = idx === 0 ? 'Plan Estándar (1 Mes)' : (item.precioNum >= 7 ? 'Cuenta Completa / Plus' : 'Opción ' + (idx + 1));
                    } else {
                        nombreVar = nombreVar.charAt(0).toUpperCase() + nombreVar.slice(1);
                    }

                    let precioTxt = item.precioEl.textContent.trim();
                    html += \`<option value="\${idx}" data-precio="\${precioTxt}">\${nombreVar} ➔ \${precioTxt}</option>\`;
                });

                html += '</select>';
                cajaSelect.innerHTML = html;

                // Insertar antes del precio
                principal.precioEl.parentNode.insertBefore(cajaSelect, principal.precioEl);

                // Guardar referencia de los botones originales para clonar su clic exacto
                let selectEl = cajaSelect.querySelector('select');
                selectEl.addEventListener('change', function() {
                    let idxElegido = parseInt(this.value, 10);
                    let itemElegido = grupo[idxElegido];
                    
                    // Actualizar el precio en grande
                    principal.precioEl.textContent = itemElegido.precioEl.textContent;
                    
                    // Si el cliente presiona "Comprar ahora!" en la tarjeta principal, activar el botón de la variante elegida
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

    setInterval(fusionarTarjetas, 700);
})();
</script>
`;

// 1. Inyectar en todos los archivos .html (en cualquier carpeta)
function inyectarEnCarpeta(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === '.git') return;
        const fullPath = dir + '/' + file;
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            inyectarEnCarpeta(fullPath);
        } else if (file.endsWith('.html')) {
            let html = fs.readFileSync(fullPath, 'utf8');
            html = html.replace(/<!-- MOTOR UNIVERSAL DE VARIANTES[\s\S]*?<\/script>/g, '');
            html = html.replace(/<!-- MOTOR DE DESPLEGABLES EN TIEMPO REAL -->[\s\S]*?<\/script>/g, '');
            if (html.includes('</body>')) {
                html = html.replace('</body>', codigoMotor + '\n</body>');
                fs.writeFileSync(fullPath, html);
                console.log('✅ Inyectado en archivo HTML: ' + fullPath);
            }
        }
    });
}
inyectarEnCarpeta('.');

// 2. Por si server.js genera el HTML dinámicamente, lo inyectamos también ahí
let srv = fs.readFileSync('server.js', 'utf8');
if (srv.includes('</body>') && !srv.includes('motor-universal-variantes')) {
    srv = srv.replace('</body>', codigoMotor + '\n</body>');
    fs.writeFileSync('server.js', srv);
    console.log('✅ Inyectado directamente en el generador de server.js');
}
