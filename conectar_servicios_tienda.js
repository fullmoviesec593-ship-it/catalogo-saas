const fs = require('fs');

let srv = fs.readFileSync('server.js', 'utf8');

// 1. Mostrar de la línea 90 en adelante para ver cómo entrega los archivos HTML
console.log("=== SERVER.JS (Líneas 90 a 220) ===");
console.log(srv.split('\n').slice(90, 220).join('\n'));
console.log("===================================");

// 2. Hacer que /api/db incluya automáticamente todos los servicios de saas_tiendas y el catálogo completo
const reemplazoApiDb = `const catFinal = catNube.length > 0 ? catNube : catLocal;
            let todosLosServicios = [...catFinal];
            if (Array.isArray(tiendas)) {
                tiendas.forEach(t => {
                    const prods = t.servicios || t.catalogo || t.productos || t.items || [];
                    if (Array.isArray(prods)) {
                        prods.forEach(p => todosLosServicios.push(p));
                    }
                });
            }
            const catalogoMaestroNombres = [
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
            catalogoMaestroNombres.forEach(nom => {
                if (!todosLosServicios.some(s => (s.nombre || s.titulo || s.name) === nom)) {
                    todosLosServicios.push({ nombre: nom, titulo: nom, servicio: nom });
                }
            });
            return res.json({ servicios: todosLosServicios, tiendas: tiendas, revendedores: revendedores });`;

if (srv.includes('const catFinal = catNube.length > 0 ? catNube : catLocal;')) {
    srv = srv.replace(
        /const catFinal = catNube\.length > 0 \? catNube : catLocal;\s*return res\.json\(\{ servicios: catFinal, tiendas: tiendas, revendedores: revendedores \}\);/,
        reemplazoApiDb
    );
    fs.writeFileSync('server.js', srv);
    console.log('✅ Base de datos /api/db actualizada en server.js con todos los servicios');
}
