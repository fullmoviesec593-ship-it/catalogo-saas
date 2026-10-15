const fs = require('fs');

const motorNativo = `
    <!-- MOTOR DE AGRUPACIÓN NATIVO -->
    <script>
    // Interceptar la creación de tarjetas para unirlas automáticamente por familia
    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(fusionarTarjetasCatalogo, 800);
    });

    function fusionarTarjetasCatalogo() {
        // Buscar todas las tarjetas de productos en la tienda
        const cards = Array.from(document.querySelectorAll('div')).filter(el => {
            const text = el.innerText || '';
            return text.includes('Comprar ahora!') && text.includes('$');
        });

        // Si no son tarjetas individuales directas, buscar contenedores generales
        let items = document.querySelectorAll('.card, [class*="product"], [class*="item"]');
        if (items.length < 2) {
            // Intentar detectar por estructura de botones de compra
            const botones = document.querySelectorAll('button, a');
            items = [];
            botones.forEach(b => {
                if(b.textContent.trim().toLowerCase().includes('comprar')) {
                    let padre = b.closest('div');
                    if(padre && !items.includes(padre)) items.push(padre);
                }
            });
        }

        console.log("🔍 Escaneando productos para agrupar variantes...");
    }
    </script>
`;

// Vamos a inyectar una solución directa basada en cómo renderiza tu script principal
let serverCode = fs.readFileSync('server.js', 'utf8');
console.log('✅ Analizando estructura de renderizado...');
