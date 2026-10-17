const fs = require('fs');

['./admin.html', './public/admin.html', './gestor-streaming/public/admin.html'].forEach(ruta => {
    if (fs.existsSync(ruta)) {
        let html = fs.readFileSync(ruta, 'utf8');
        
        // Eliminar los scripts globales que rompieron el diseño de tu panel
        html = html.replace(/<!-- ACTUALIZACION FORZADA V5[\s\S]*?<\/script>/g, '');
        html = html.replace(/<!-- MOTOR DE VARIANTES PUBLICO V4[\s\S]*?<\/script>/g, '');
        html = html.replace(/<!-- MOTOR UNIVERSAL DE VARIANTES[\s\S]*?<\/script>/g, '');
        
        fs.writeFileSync(ruta, html);
        console.log('✅ Panel Revendedor original rescatado y purgado en: ' + ruta);
    }
});
