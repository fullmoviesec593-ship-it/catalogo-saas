const fs = require('fs');

const parcheEstetico = `
<script id="remover-boton-rojo">
    // Escáner visual para ocultar el botón rojo gigante sin dañar el menú
    setInterval(() => {
        document.querySelectorAll('a, button, div').forEach(el => {
            if (el.textContent.trim() === '⚡ CREAR OFERTA' || el.textContent.trim() === 'CREAR OFERTA') {
                el.style.setProperty('display', 'none', 'important');
                // Si el botón está dentro de un contenedor flotante, también lo ocultamos
                if (el.parentElement && window.getComputedStyle(el.parentElement).position === 'fixed') {
                    el.parentElement.style.setProperty('display', 'none', 'important');
                }
            }
        });
    }, 300);
</script>
</body>`;

const archivos = fs.readdirSync('.').filter(f => f.endsWith('.html'));

archivos.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    if (html.includes('CREAR OFERTA') && !html.includes('remover-boton-rojo')) {
        html = html.replace(/<\/body>/i, parcheEstetico);
        fs.writeFileSync(file, html);
        console.log('✅ Botón rojo flotante eliminado de: ' + file);
    }
});
