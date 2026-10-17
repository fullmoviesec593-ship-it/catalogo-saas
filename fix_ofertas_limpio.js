const fs = require('fs');

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

function actualizarOfertasSinRegex(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(function(f) {
        if (f === 'node_modules' || f === '.git' || f.endsWith('.js')) return;
        const full = dir + '/' + f;
        if (fs.statSync(full).isDirectory()) {
            actualizarOfertasSinRegex(full);
        } else if (f.endsWith('.html')) {
            let txt = fs.readFileSync(full, 'utf8');
            if (txt.indexOf('contenedorListaCheckboxes') !== -1 || txt.indexOf('Netflix Premium') !== -1) {
                // Reemplazar arrays literales de forma segura con split/join
                txt = txt.split('["Netflix Premium"]').join(JSON.stringify(lista32));
                txt = txt.split("['Netflix Premium']").join(JSON.stringify(lista32));

                // Reemplazar el contenido inicial de contenedorListaCheckboxes directamente
                const marcador = 'id="contenedorListaCheckboxes"';
                const pos = txt.indexOf(marcador);
                if (pos !== -1) {
                    const cierreTag = txt.indexOf('>', pos);
                    const finDiv = txt.indexOf('</div>', cierreTag);
                    if (cierreTag !== -1 && finDiv !== -1) {
                        txt = txt.substring(0, cierreTag + 1) + '\n' + htmlCheckboxes32 + '\n' + txt.substring(finDiv);
                    }
                }

                fs.writeFileSync(full, txt);
                console.log('✅ Lista de 32 servicios estampada limpiamente en: ' + full);
            }
        }
    });
}

actualizarOfertasSinRegex('.');

// Asegurar también en server.js si tiene el contenedor incrustado
let srv = fs.readFileSync('server.js', 'utf8');
if (srv.indexOf('Netflix Premium') !== -1) {
    srv = srv.split('["Netflix Premium"]').join(JSON.stringify(lista32));
    srv = srv.split("['Netflix Premium']").join(JSON.stringify(lista32));
    const marcador = 'id="contenedorListaCheckboxes"';
    const pos = srv.indexOf(marcador);
    if (pos !== -1) {
        const cierreTag = srv.indexOf('>', pos);
        const finDiv = srv.indexOf('</div>', cierreTag);
        if (cierreTag !== -1 && finDiv !== -1) {
            srv = srv.substring(0, cierreTag + 1) + '\n' + htmlCheckboxes32 + '\n' + srv.substring(finDiv);
        }
    }
    fs.writeFileSync('server.js', srv);
    console.log('✅ Lista de 32 servicios estampada limpiamente en: server.js');
}
