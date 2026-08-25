let cartItems = [];
    let selectedShalomAgency = null;

    const cartCountBadge = document.getElementById('cart-count-badge');
    const searchInput = document.getElementById('search-product-input');
    const sortSelect = document.getElementById('product-sort-select');
    const cardsGrid = document.getElementById('main-product-cards-grid');
    const emptyState = document.getElementById('products-empty-state');
    const toastHub = document.getElementById('toast-notification-hub');
    const resetFiltersBtn = document.getElementById('btn-reset-filters');

    // Ocultar header al hacer scroll y solo mostrarlo al subir por completo
    const headerNavigation = document.getElementById('header-navigation');

    window.addEventListener('scroll', function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Si el usuario bajó más allá del tamaño del header, se oculta.
        // Solo vuelve a aparecer cuando llega a la parte más alta (scrollTop <= 0 o muy cerca)
        if (scrollTop > 50) {
            headerNavigation.classList.add('header-hidden');
        } else {
            headerNavigation.classList.remove('header-hidden');
        }
    });