let cartItems = [];
    let selectedShalomAgency = null;

    const cartCountBadge = document.getElementById('cart-count-badge');
    const searchInput = document.getElementById('search-product-input');
    const sortSelect = document.getElementById('product-sort-select');
    const cardsGrid = document.getElementById('main-product-cards-grid');
    const emptyState = document.getElementById('products-empty-state');
    const toastHub = document.getElementById('toast-notification-hub');
    const resetFiltersBtn = document.getElementById('btn-reset-filters');