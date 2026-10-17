const fs = require('fs');

// 1. Asegurar que db.json tenga los 32 servicios por si server.js usa catLocal
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

let dbLocal = { servicios: [], tiendas: [], revendedores: [] };
if (fs.existsSync('db.json')) {
    try { dbLocal = JSON.parse(fs.readFileSync('db.json', 'utf8')); } catch(e) {}
}
dbLocal.servicios = catalogoMaestroNombres.map((nom, i) => ({ id: 'srv_' + i, nombre: nom, titulo: nom, servicio: nom }));
fs.writeFileSync('db.json', JSON.stringify(dbLocal, null, 2));
console.log('✅ db.json actualizado con los 32 servicios oficiales');

// 2. Ver cómo public/index.html dibuja las tarjetas (líneas 175 a 265)
const idxHtml = fs.readFileSync('./public/index.html', 'utf8');
console.log("=== PUBLIC/INDEX.HTML (Líneas 175 a 265) ===");
console.log(idxHtml.split('\n').slice(175, 265).join('\n'));
console.log("============================================");
