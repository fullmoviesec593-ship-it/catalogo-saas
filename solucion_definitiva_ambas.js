const fs = require('fs');

// ==========================================
// 1. SOLUCIÓN PARA EL ADMIN (OFERTA RELÁMPAGO)
// ==========================================
const scriptOfertasAdmin = `
    <script id="script-ofertas-maestro">
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
        const seleccionados = Array.from(checks).map(function(c) { return c.value; });
        const inputOculto = document.getElementById('ofertaServiciosNombres');
        if (inputOculto) {
            inputOculto.value = seleccionados.join(', ');
        }
    }

    async function poblarCheckboxesServicios() {
        const contenedor = document.getElementById('contenedorListaCheckboxes');
        if (!contenedor) return;
        contenedor.innerHTML = '<span style="color:#38bdf8; font-size:12px;">Cargando todos tus servicios...</span>';
        
        let serviciosExtraidos = [];
        try {
            const res = await fetch('/api/db');
            const data = await res.json();
            
            // 1. Extraer de servicios globales si existen
            if (Array.isArray(data.servicios)) {
                data.servicios.forEach(function(s) {
                    let n = s.nombre || s.titulo || s.servicio || s.name || s.title;
                    if (n && n !== 'Netflix Premium') serviciosExtraidos.push(n.trim());
                });
            }
            // 2. Extraer de las tiendas registradas (donde están los servicios reales de Full Movies Ec)
            if (Array.isArray(data.tiendas)) {
                data.tiendas.forEach(function(t) {
                    const listaProd = t.servicios || t.catalogo || t.productos || t.items || [];
                    if (Array.isArray(listaProd)) {
                        listaProd.forEach(function(p) {
                            let n = p.nombre || p.titulo || p.servicio || p.name || p.title;
                            if (n) serviciosExtraidos.push(n.trim());
                        });
                    }
                });
            }
        } catch(e) {}

        // Combinar los de la base de datos con tu catálogo oficial completo sin repetir
        let unicos = [];
        let combinados = serviciosExtraidos.concat(catalogoOficial);
        combinados.forEach(function(item) {
            if (item && unicos.indexOf(item) === -1) {
                unicos.push(item);
            }
        });

        contenedor.innerHTML = '';
        unicos.forEach(function(nombre) {
            const div = document.createElement('label');
            div.style.cssText = 'display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b; user-select: none;';
            div.innerHTML = '<input type="checkbox" class="check-servicio-oferta" value="' + nombre + '" onchange="actualizarCajaInvisible()" style="accent-color: #0ea5e9; width: 18px; height: 18px; cursor: pointer;"> <span style="font-weight: 500;">' + nombre + '</span>';
            contenedor.appendChild(div);
        });
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
            if (inputOculto) inputOculto.value = ''; 
        }
    }
    </script>
`;

// ==========================================
// 2. SOLUCIÓN PARA EL CLIENTE (DESPLEGABLES)
// ==========================================
const motorVariantesV4 = `
<!-- MOTOR UNIVERSAL DE VARIANTES V4 -->
<script id="motor-universal-variantes">
(function() {
    function obtenerPrecioElemento(card) {
        const todos = Array.from(card.querySelectorAll('*'));
        let candidatos = todos.filter(function(el) {
            if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SELECT' || el.tagName === 'OPTION') return false;
            if (el.classList && el.classList.contains('selector-planes-fm')) return false;
            const txt = (el.textContent || '').trim();
            return txt.charAt(0) === '$' && txt.length >= 2 && txt.length <= 12 && /[0-9]/.test(txt);
        });
        // Tomar el elemento más específico (el último en la jerarquía)
        return candidatos.length > 0 ? candidatos[candidatos.length - 1] : null;
    }

    function obtenerTituloElemento(card) {
        let directo = card.querySelector('h1, h2, h3, h4, .card-title, .service-title, .titulo, .prod-title');
        if (directo) return directo;

        const ignorar = ['streaming', 'video', 'música', 'musica', 'software', 'ia', 'top', 'popular', 'streaming y tv', 'streaming y deportes', 'streaming, anime', 'comprar ahora!', 'pedir', 'app'];
        const todos = Array.from(card.querySelectorAll('div, span, p, b, strong'));
        
        for (let i = 0; i < todos.length; i++) {
            let el = todos[i];
            if (el.children.length === 0) {
                let txt = (el.textContent || '').trim();
                let low = txt.toLowerCase();
                if (txt.length > 2 && txt.length < 48 && txt.charAt(0) !== '$' && txt.charAt(0) !== '✓' && txt.charAt(0) !== '✔' && low.indexOf('1 mes') === -1 && ignorar.indexOf(low) === -1) {
                    return el;
                }
            }
        }
        return null;
    }

    function fusionarTarjetas() {
        const botones = Array.from(document.querySelectorAll('button, a')).filter(function(b) {
            const t = (b.textContent || '').trim().toLowerCase();
            return t.indexOf('comprar ahora') !== -1;
        });

        if (botones.length < 2) return;

        let tarjetas = [];
        botones.forEach(function(btn) {
            let card = btn.parentElement;
            while (card && card !== document.body) {
                const parent = card.parentElement;
                if (!parent) break;
                const btnsEnParent = Array.from(parent.querySelectorAll('button, a')).filter(function(b) {
                    const t = (b.textContent || '').trim().toLowerCase();
                    return t.indexOf('comprar ahora') !== -1;
                });
                if (btnsEnParent.length > 1) break;
                card = parent;
            }

            if (!card || card === document.body || card.dataset.oculto === 'true') return;

            const precioEl = obtenerPrecioElemento(card);
            const tituloEl = obtenerTituloElemento(card);

            if (tituloEl && precioEl) {
                if (!tituloEl.dataset.originalTitle) {
                    tituloEl.dataset.originalTitle = tituloEl.textContent.trim();
                }
                let numStr = precioEl.textContent.replace(/[^0-9.]/g, '');
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
                        nombreVar = idx === 0 ? 'Plan 1 Mes / Perfil' : (item.precioNum >= 7 ? 'Cuenta Completa / Plus' : 'Opción ' + (idx + 1));
                    } else {
                        nombreVar = nombreVar.charAt(0).toUpperCase() + nombreVar.slice(1);
                    }

                    let precioTxt = item.precioEl.textContent.trim();
                    html += '<option value="' + idx + '" data-precio="' + precioTxt + '">' + nombreVar + ' ➔ ' + precioTxt + '</option>';
                });

                html += '</select>';
                cajaSelect.innerHTML = html;

                // Insertar justo antes del botón Comprar ahora! o antes del precio
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

    setInterval(fusionarTarjetas, 500);
})();
</script>
`;

// Recorrer absolutamente todos los archivos HTML en todas las carpetas
function actualizarTodo(dir) {
    const archivos = fs.readdirSync(dir);
    archivos.forEach(function(f) {
        if (f === 'node_modules' || f === '.git') return;
        const fullPath = dir + '/' + f;
        if (fs.statSync(fullPath).isDirectory()) {
            actualizarTodo(fullPath);
        } else if (f.endsWith('.html')) {
            let html = fs.readFileSync(fullPath, 'utf8');
            let modificado = false;

            // 1. Si tiene la función de ofertas relámpago, reemplazar su script por el nuevo
            if (html.indexOf('poblarCheckboxesServicios') !== -1) {
                html = html.replace(/<script[^>]*>[\s\S]*?function poblarCheckboxesServicios[\s\S]*?<\/script>/gi, scriptOfertasAdmin);
                modificado = true;
                console.log('✅ Lista completa de Ofertas actualizada en: ' + fullPath);
            }

            // 2. Actualizar el motor de variantes en todas las vistas
            html = html.replace(/<!-- MOTOR UNIVERSAL DE VARIANTES[\s\S]*?<\/script>/g, '');
            if (html.indexOf('</body>') !== -1) {
                html = html.replace('</body>', motorVariantesV4 + '\n</body>');
                modificado = true;
                console.log('✅ Motor de Desplegables V4 instalado en: ' + fullPath);
            }

            if (modificado) {
                fs.writeFileSync(fullPath, html);
            }
        }
    });
}

actualizarTodo('.');
