const fs = require('fs');

const scriptVariantes = `
    <!-- SISTEMA DE VARIANTES PREMIUM -->
    <script id="variantes-premium">
    document.addEventListener("DOMContentLoaded", () => {
        let intentos = 0;
        // Escáner que espera a que el catálogo termine de cargar
        let scanner = setInterval(() => {
            intentos++;
            if (intentos > 20) clearInterval(scanner); // Detener si tarda más de 10 seg

            // Buscar botones de compra para detectar tarjetas
            const botonesComprar = Array.from(document.querySelectorAll('a, button')).filter(b => b.textContent.toLowerCase().includes('comprar') || b.textContent.toLowerCase().includes('pedir'));
            
            if (botonesComprar.length > 0) {
                clearInterval(scanner);
                setTimeout(() => agruparTarjetas(botonesComprar), 300); // Pequeño margen para que carguen las imágenes
            }
        }, 500);

        function agruparTarjetas(botones) {
            let tarjetas = [];
            
            // 1. Extraer información de todas las tarjetas
            botones.forEach(btn => {
                let card = btn.closest('div[class*="card"], div[style*="border-radius"], div[class*="item"]');
                if(!card) card = btn.parentElement.parentElement; // Fallback
                
                let tituloEl = card.querySelector('h2, h3, h4, h5, .titulo, [class*="title"]');
                let precioEl = Array.from(card.querySelectorAll('span, div, p, b, strong, h3, h2')).find(el => el.textContent.trim().startsWith('$'));
                
                if (tituloEl && precioEl) {
                    tarjetas.push({
                        card: card,
                        tituloOriginal: tituloEl.textContent.trim(),
                        tituloEl: tituloEl,
                        precioEl: precioEl,
                        boton: btn
                    });
                }
            });

            // 2. Agrupar tarjetas de la misma familia (Marca)
            let grupos = {};
            tarjetas.forEach(t => {
                let tituloLow = t.tituloOriginal.toLowerCase();
                let base = t.tituloOriginal; 
                
                // Diccionario de familias
                if (tituloLow.includes('spotify')) base = 'Spotify';
                else if (tituloLow.includes('flujo')) base = 'Flujo TV';
                else if (tituloLow.includes('netflix')) base = 'Netflix';
                else if (tituloLow.includes('disney')) base = 'Disney+';
                else if (tituloLow.includes('prime')) base = 'Prime Video';
                else if (tituloLow.includes('hbo') || tituloLow.includes('max')) base = 'HBO Max';
                else if (tituloLow.includes('iptv') && tituloLow.includes('movie')) base = 'IPTV Zona Movie';
                else if (tituloLow.includes('iptv') || tituloLow.includes('smarters')) base = 'IPTV Smarters';
                else if (tituloLow.includes('estella') || tituloLow.includes('stella')) base = 'Estella TV';
                else if (tituloLow.includes('oleada')) base = 'Oleada TV';
                else if (tituloLow.includes('vix')) base = 'ViX Premium';
                else if (tituloLow.includes('crunchyroll')) base = 'Crunchyroll';
                else if (tituloLow.includes('plex')) base = 'Plex';
                else if (tituloLow.includes('magis')) base = 'Magis TV';
                else if (tituloLow.includes('youtube')) base = 'YouTube Premium';
                else if (tituloLow.includes('canva')) base = 'Canva Pro';
                else if (tituloLow.includes('capcut') || tituloLow.includes('cap cut')) base = 'CapCut Pro';
                else if (tituloLow.includes('gpt')) base = 'ChatGPT Plus';

                if (!grupos[base]) grupos[base] = [];
                grupos[base].push(t);
            });

            // 3. Crear el diseño visual y ocultar clones
            Object.keys(grupos).forEach(base => {
                let grupo = grupos[base];
                if (grupo.length > 1) { // Solo aplicar a servicios que tengan más de 1 variante
                    
                    // Ordenar por precio de menor a mayor
                    grupo.sort((a, b) => parseFloat(a.precioEl.textContent.replace('$', '')) - parseFloat(b.precioEl.textContent.replace('$', '')));

                    let master = grupo[0]; // La tarjeta que se quedará visible
                    master.tituloEl.textContent = base; // Limpiar título (ej: "Spotify")

                    // Ocultar las tarjetas sobrantes
                    for (let i = 1; i < grupo.length; i++) {
                        grupo[i].card.style.display = 'none';
                    }

                    // Diseñar la caja del menú desplegable
                    let selectorDiv = document.createElement('div');
                    selectorDiv.style.cssText = 'margin: 12px 0; background: rgba(15, 23, 42, 0.6); padding: 8px; border-radius: 8px; border: 1px solid #1e293b;';
                    
                    let selectorHtml = '<label style="font-size: 10px; color: #94a3b8; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; display: block; letter-spacing: 0.5px;">⏳ Selecciona tu plan:</label>';
                    selectorHtml += '<select class="plan-selector" style="width: 100%; padding: 8px; border-radius: 6px; background: #0f172a; color: #0ea5e9; font-weight: bold; font-size: 13px; border: 1px solid #334155; outline: none; cursor: pointer; appearance: auto;">';

                    grupo.forEach((item, index) => {
                        // Extraer qué variante es (ej: quitar la palabra "Spotify" y dejar "3 meses")
                        let variante = item.tituloOriginal.replace(new RegExp(base, 'ig'), '').trim();
                        if (variante === '' || variante.length < 2) variante = 'Plan Básico';
                        
                        let precio = item.precioEl.textContent.trim();
                        let link = item.boton.getAttribute('href') || item.boton.getAttribute('onclick') || '';
                        
                        selectorHtml += \`<option value="\${index}" data-precio="\${precio}" data-link="\${link}">\${variante} ➔ \${precio}</option>\`;
                    });

                    selectorHtml += '</select>';
                    selectorDiv.innerHTML = selectorHtml;

                    // Insertar el desplegable justo arriba del precio grande
                    master.precioEl.parentNode.insertBefore(selectorDiv, master.precioEl);
                    master.precioEl.style.transition = 'opacity 0.2s'; // Efecto visual suave

                    // Hacer que el selector funcione y cambie precio y WhatsApp
                    let selectEl = selectorDiv.querySelector('select');
                    selectEl.addEventListener('change', function() {
                        let opt = this.options[this.selectedIndex];
                        
                        master.precioEl.style.opacity = '0';
                        setTimeout(() => {
                            master.precioEl.textContent = opt.getAttribute('data-precio');
                            master.precioEl.style.opacity = '1';
                        }, 200);

                        let nuevoLink = opt.getAttribute('data-link');
                        if (nuevoLink && nuevoLink.startsWith('http')) {
                            master.boton.setAttribute('href', nuevoLink);
                        } else if (nuevoLink) {
                            master.boton.setAttribute('onclick', nuevoLink);
                        }
                    });
                }
            });
        }
    });
    </script>
`;

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    // Solo aplicamos esto a los archivos que muestran el catálogo (generalmente index.html)
    if (!html.includes('SISTEMA DE VARIANTES PREMIUM')) {
        // Inyectar antes de cerrar el body
        html = html.replace('</body>', scriptVariantes + '\n</body>');
        fs.writeFileSync(file, html);
        console.log('✅ Motor Premium instalado en: ' + file);
    }
});
