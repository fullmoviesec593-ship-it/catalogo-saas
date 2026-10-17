const fs = require('fs');

// =========================================================
// 1. REEMPLAZAR renderGrid DIRECTAMENTE EN INDEX.HTML
// =========================================================
const nuevoRenderGrid = `function renderGrid(productos) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    if (productos.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; color:#94a3b8; padding:30px;">No hay servicios.</div>';
        return;
    }

    function obtenerFamilia(nombre) {
        let low = (nombre || '').toLowerCase().trim();
        if (low.indexOf('spotify') !== -1) return 'Spotify';
        if (low.indexOf('flujo') !== -1) return 'Flujo TV';
        if (low.indexOf('netflix') !== -1) return 'Netflix';
        if (low.indexOf('disney') !== -1) return 'Disney+ ESPN';
        if (low.indexOf('prime') !== -1) return 'Prime Video';
        if (low.indexOf('hbo') !== -1 || low.indexOf('max') !== -1) return 'HBO Max';
        if (low.indexOf('zona movie') !== -1) return 'IPTV Zona Movie';
        if (low.indexOf('stream live') !== -1 || low.indexOf('iptv') !== -1) return 'IPTV Stream Live';
        if (low.indexOf('estella') !== -1 || low.indexOf('stella') !== -1) return 'Estella TV';
        if (low.indexOf('oleada') !== -1) return 'Oleada TV';
        if (low.indexOf('vix') !== -1) return 'ViX Premium';
        if (low.indexOf('crunchyroll') !== -1) return 'Crunchyroll';
        if (low.indexOf('canva') !== -1) return 'Canva Pro';
        if (low.indexOf('gpt') !== -1) return 'ChatGPT';
        return nombre;
    }

    // Agrupar productos que pertenecen a la misma marca
    let grupos = [];
    let mapaGrupos = {};

    productos.forEach(function(p) {
        if (p.isCombo) {
            grupos.push({ base: p.nombre, items: [p], isCombo: true });
            return;
        }
        let base = obtenerFamilia(p.nombre);
        if (!mapaGrupos[base]) {
            mapaGrupos[base] = { base: base, items: [], isCombo: false };
            grupos.push(mapaGrupos[base]);
        }
        mapaGrupos[base].items.push(p);
    });

    grupos.forEach(function(grupo, gIdx) {
        // Ordenar variantes de menor a mayor precio
        if (grupo.items.length > 1) {
            grupo.items.sort(function(a, b) {
                return (parseFloat(a.precio) || 0) - (parseFloat(b.precio) || 0);
            });
        }

        const p = grupo.items[0];
        const idx = itemsParaMostrar.indexOf(p);
        const tag = p.tag ? \`<span class="card-tag \${p.isCombo ? 'discount' : ''}">\${p.tag}</span>\` : '';
        const featuresHtml = (p.features || ["Garantía"]).map(function(f) { return \`<li>\${f}</li>\`; }).join('');
        
        let selectVariantesHtml = '';
        if (grupo.items.length > 1) {
            let opciones = grupo.items.map(function(item, i) {
                let itemIdx = itemsParaMostrar.indexOf(item);
                let varName = (item.nombre || '').trim();
                if (varName.toLowerCase().indexOf(grupo.base.toLowerCase()) === 0) {
                    varName = varName.substring(grupo.base.length).trim();
                }
                if (varName.toLowerCase().indexOf('tv') === 0) {
                    varName = varName.substring(2).trim();
                }
                if (!varName || varName.length < 2) {
                    varName = item.sub ? item.sub : (i === 0 ? 'Plan Estándar (1 Mes)' : (parseFloat(item.precio) >= 7 ? 'Cuenta Completa / Plus' : 'Opción ' + (i + 1)));
                } else {
                    varName = varName.charAt(0).toUpperCase() + varName.slice(1);
                }
                return \`<option value="\${itemIdx}" data-precio="\${item.precio}" data-sub="\${item.sub || ''}">\${varName} ➔ \${tiendaActiva.moneda}\${item.precio}</option>\`;
            }).join('');

            selectVariantesHtml = \`
            <div style="margin: 8px 0 10px 0; background: #0f172a; padding: 8px; border-radius: 10px; border: 1px solid #0284c7; text-align: left;">
                <label style="font-size: 10px; color: #38bdf8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">⚡ ELIGE TU PLAN / DURACIÓN:</label>
                <select onchange="cambiarVarianteCard(this, \${gIdx})" style="width: 100%; padding: 8px; border-radius: 6px; background: #090d16; color: #fff; font-weight: bold; font-size: 12.5px; border: 1px solid #1e293b; outline: none; cursor: pointer;">
                    \${opciones}
                </select>
            </div>\`;
        }

        const tituloMostrar = grupo.items.length > 1 ? grupo.base : p.nombre;
        const priceHtml = p.isCombo 
            ? \`<div style="margin-bottom:10px;"><span style="color:#22c55e; font-size:17px; font-weight:bold;">\${p.descuento}% OFF</span></div>\` 
            : \`<div style="margin-bottom:10px;"><span id="price-card-\${gIdx}" style="color:var(--primary-accent); font-weight:bold; font-size:20px;">\${tiendaActiva.moneda}\${p.precio}</span></div>\`;
        const clickFn = p.isCombo ? \`abrirModalCombo(\${p.comboIdx})\` : \`abrirModal(\${idx})\`;

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = \`<div class="card-thumb"><img src="\${p.img || ''}">\${tag}</div><div class="card-body"><div style="font-weight:800; font-size:15px; color:#fff;">\${tituloMostrar}</div><div id="sub-card-\${gIdx}" style="font-size:11px; color:#7b8293; margin-bottom:6px;">\${p.sub || ''}</div><ul class="card-features">\${featuresHtml}</ul>\${selectVariantesHtml}\${priceHtml}<button id="btn-card-\${gIdx}" class="btn-buy-ws" onclick="\${clickFn}">\${tiendaActiva.textoBoton}</button></div>\`;
        grid.appendChild(card);
    });
}

window.cambiarVarianteCard = function(selectEl, gIdx) {
    const nuevoIdx = selectEl.value;
    const opt = selectEl.options[selectEl.selectedIndex];
    const nuevoPrecio = opt.getAttribute('data-precio');
    const nuevoSub = opt.getAttribute('data-sub');

    const priceSpan = document.getElementById('price-card-' + gIdx);
    if (priceSpan) priceSpan.innerText = tiendaActiva.moneda + nuevoPrecio;

    const subDiv = document.getElementById('sub-card-' + gIdx);
    if (subDiv && nuevoSub) subDiv.innerText = nuevoSub;

    const btn = document.getElementById('btn-card-' + gIdx);
    if (btn) btn.setAttribute('onclick', 'abrirModal(' + nuevoIdx + ')');
};`;

['./index.html', './public/index.html', './gestor-streaming/public/index.html'].forEach(function(ruta) {
    if (fs.existsSync(ruta)) {
        let content = fs.readFileSync(ruta, 'utf8');
        // Reemplazar desde function renderGrid(productos) hasta antes de function formatearCuentas
        const regexRender = /function renderGrid\(productos\)\s*\{[\s\S]*?(?=function formatearCuentas)/;
        if (regexRender.test(content)) {
            content = content.replace(regexRender, nuevoRenderGrid + '\n\n');
            fs.writeFileSync(ruta, content);
            console.log('✅ Función renderGrid nativa reemplazada con éxito en: ' + ruta);
        }
    }
});

// =========================================================
// 2. REEMPLAZAR "Netflix Premium" FIJO EN TODOS LOS ARCHIVOS
// =========================================================
const lista32 = [
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

const htmlCheckboxes32 = lista32.map(function(nom) {
    return '<label style="display: flex; align-items: center; gap: 10px; color: #e2e8f0; font-size: 13px; cursor: pointer; padding: 7px 6px; border-bottom: 1px solid #1e293b;"><input type="checkbox" class="check-servicio-oferta" value="' + nom + '" onchange="if(window.actualizarCajaInvisible) window.actualizarCajaInvisible()" style="accent-color: #0ea5e9; width: 18px; height: 18px;"> <span>' + nom + '</span></label>';
}).join('');

function limpiarNetflixPremiumFijo(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(function(f) {
        if (f === 'node_modules' || f === '.git' || f === 'solucion_nativa_exacta.js') return;
        const full = dir + '/' + f;
        if (fs.statSync(full).isDirectory()) {
            limpiarNetflixPremiumFijo(full);
        } else if (f.endsWith('.html') || f === 'server.js') {
            let txt = fs.readFileSync(full, 'utf8');
            if (txt.indexOf('Netflix Premium') !== -1) {
                // Reemplazar cualquier array o bloque que tenga solo "Netflix Premium"
                txt = txt.replace(/["Netflix Premium"]/g, JSON.stringify(lista32));
                txt = txt.replace(/['Netflix Premium']/g, JSON.stringify(lista32));
                // Si está puesto como un label HTML fijo en el contenedor, reemplazarlo por los 32
                txt = txt.replace(/<label[^>]*>[\s\S]*?Netflix Premium[\s\S]*?<\/label>/gi, htmlCheckboxes32);
                fs.writeFileSync(full, txt);
                console.log('✅ Reemplazado "Netflix Premium" fijo por los 32 servicios en: ' +

full);
            }
        }
    });
}

limpiarNetflixPremiumFijo('.');
