document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('main-product-cards-grid');
    if (!gridContainer) return;

    function crearTarjetaProducto(producto) {
        // Parsear colores y sus imágenes
        const hexes = producto.colores_hex || [];
        const coloresHex = JSON.stringify(hexes);
        const coloresImagenes = JSON.stringify(producto.colores_imagenes || {});
        
        const caracteristicas = JSON.stringify(producto.caracteristicas || []);
        
        const precioRegularHtml = producto.precio_regular ? `<span class="product-price-regular" style="text-decoration: line-through; color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 2px;">S/ ${producto.precio_regular}</span>` : '';
        
        let badgeHtml = '';
        if (producto.oferta) {
            const label = producto.oferta.toLowerCase() === 'sale' ? 'Oferta' : (producto.oferta.toLowerCase() === 'nuevo' ? 'Nuevo' : producto.oferta);
            badgeHtml = `<span class="product-badge" style="background: linear-gradient(135deg, var(--color-accent) 0%, #ff5000 100%); box-shadow: 0 4px 10px rgba(255, 122, 0, 0.25);">${label}</span>`;
        }

        // Generar las estrellas de rating (aproximación visual)
        const ratingNum = parseFloat(producto.rating) || 5;
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= ratingNum) {
                starsHtml += `<svg class="star-icon filled" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>`;
            } else if (i - 0.5 <= ratingNum) {
                starsHtml += `<svg class="star-icon filled half" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>`;
            } else {
                starsHtml += `<svg class="star-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>`;
            }
        }

        const div = document.createElement('div');
        div.className = 'product-card';
        div.id = producto.id;
        div.setAttribute('data-price', producto.precio);
        if (producto.precio_regular) div.setAttribute('data-price-regular', producto.precio_regular);
        div.setAttribute('data-rating', producto.rating);
        div.setAttribute('data-category', producto.categoria);
        div.setAttribute('data-type', producto.tipo);
        div.setAttribute('data-sizes', producto.tallas);
        div.setAttribute('data-material', producto.material);
        if (producto.oferta) div.setAttribute('data-offer', producto.oferta);
        div.setAttribute('data-colors', coloresHex);
        div.setAttribute('data-color-images', coloresImagenes);
        div.setAttribute('data-features', caracteristicas);

        div.innerHTML = `
            <div class="card-image-box">
                ${badgeHtml}
                <button class="favorite-toggle-btn" id="favorite-btn-${producto.id}" aria-label="Añadir a la lista de deseos">
                    <svg class="heart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </button>
                <div class="vector-art-container">
                    <img src="${producto.imagen_principal}" alt="${producto.titulo}" class="product-img-cover" onerror="this.src='images/placeholder.jpg'">
                </div>
            </div>
            <div class="card-details">
                <div class="card-header-row">
                    <h3 class="product-title">${producto.titulo}</h3>
                    <div class="price-container" style="display: flex; flex-direction: column; align-items: flex-end;">
                        ${precioRegularHtml}
                        <span class="product-price" style="color: var(--color-accent); font-weight: 800;">S/ ${producto.precio}</span>
                    </div>
                </div>
                <p class="product-subtext">${producto.descripcion}</p>
                <div class="rating-row">
                    <div class="stars-container" aria-label="${producto.rating} estrellas de valoración">
                        ${starsHtml}
                    </div>
                    <span class="review-count">(${producto.reviews || 0})</span>
                </div>
                <button class="btn btn-secondary add-to-cart-btn" id="add-to-cart-${producto.id}">Añadir al Carrito</button>
            </div>
        `;
        return div;
    }

    // Usar la base de datos local definida en productos-db.js
    if (window.productosData && Array.isArray(window.productosData)) {
        gridContainer.innerHTML = ''; // Limpiar grilla original si existía algo
        
        window.productosData.forEach(producto => {
            const tarjeta = crearTarjetaProducto(producto);
            gridContainer.appendChild(tarjeta);
        });

        // Notificar a los otros scripts que los productos ya están en la página
        document.dispatchEvent(new Event('productosCargados'));

        // Cargar scripts que dependen de que las tarjetas existan en el DOM de forma dinámica
        const scriptsDependientes = [
            "js/02-filtros-y-favoritos.js",
            "js/03-ventana-detalles.js",
            "js/04-carrito-compras.js"
        ];
        
        scriptsDependientes.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            document.body.appendChild(script);
        });
    } else {
        gridContainer.innerHTML = '<p>Error: No se encontró la base de datos de productos.</p>';
    }
});
