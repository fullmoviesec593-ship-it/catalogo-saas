const fs = require('fs');

// Buscar el archivo admin.html o public/admin.html y limpiar modales flotantes sueltos
['./admin.html', './public/admin.html', './gestor-streaming/public/admin.html'].forEach(function(ruta) {
    if (fs.existsSync(ruta)) {
        let html = fs.readFileSync(ruta, 'utf8');
        
        // Si el modal de oferta relampago esta abierto o mal metido en el HTML principal, removerlo del body inicial
        html = html.replace(/<div[^>]*id="modalOferta"[^>]*>[\s\S]*?<\/div>/gi, '');
        html = html.replace(/<div[^>]*id="modalOfertaRelampago"[^>]*>[\s\S]*?<\/div>/gi, '');
        
        // Asegurar que el contenedor principal tenga ancho completo (100% o max-width limpio)
        if (html.includes('grid') || html.includes('flex')) {
            html = html.replace(/overflow:\s*hidden;/gi, '');
        }

        fs.writeFileSync(ruta, html);
        console.log('✅ admin.html limpiado de modales fantasmas en: ' + ruta);
    }
});
