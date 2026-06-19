const productCards = Array.from(document.querySelectorAll('.product-card'));

    const categoryLinks = document.querySelectorAll('.nav-dropdown-menu .nav-dropdown-item');
    const typeCheckboxes = document.querySelectorAll('#filter-device-type input[type="checkbox"]');
    const priceRadios = document.querySelectorAll('#filter-price input[type="radio"]');
    const ratingRadios = document.querySelectorAll('#filter-review input[type="radio"]');
    const materialCheckboxes = document.querySelectorAll('#filter-material input[type="checkbox"]');
    const offerCheckboxes = document.querySelectorAll('#filter-offer input[type="checkbox"]');

    const colorNamesMap = {
        "#000000": "Negro",
        "#ff7a00": "Naranja",
        "#333333": "Negro",
        "#f4f4f4": "Blanco",
        "#faf6ef": "Crema",
        "#faf4ee": "Alabastro",
        "#fcfaf0": "Hueso",
        "#eadecd": "Beige",
        "#3e5a7a": "Azul Acero",
        "#e2e8e4": "Gris Claro",
        "#e7eee9": "Verde Menta",
        "#b0b0b0": "Gris",
        "#8b5a2b": "Marrón",
        "#b22222": "Rojo",
        "#4169e1": "Azul Eléctrico",
        "#1d2a44": "Azul Acero",
        "#c68a4c": "Camel",
        "#7c9e83": "Verde Cargo",
        "#0b1d3a": "Azul Marino",
        "#a0e0ff": "Celeste",
        "#1a5fb4": "Azul",
        "#76e5c1": "Cemento",
        "#ffd54f": "Amarillo",
        "#a3e12c": "Verde Olivo"
    };

    const activeFilters = {
        category: 'all',
        searchQuery: '',
        types: [],
        priceRange: 'all',
        minRating: 0,
        materials: [],
        offers: []
    };




    productCards.forEach(card => {

        const favBtn = card.querySelector('.favorite-toggle-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            favBtn.classList.toggle('liked');
            
            const title = card.querySelector('.product-title').textContent;
            const isLiked = favBtn.classList.contains('liked');
            if (isLiked) {
                showToast(`¡"${title}" añadido a la lista de deseos! ❤️`);

                const heart = favBtn.querySelector('.heart-icon');
                heart.style.transform = 'scale(1.3)';
                setTimeout(() => heart.style.transform = '', 200);
            } else {
                showToast(`"${title}" eliminado de la lista de deseos.`);
            }
        });
    });

    function addToCart(title, price, qty, img, size = 'Única', color = 'Único') {
        const existingItem = cartItems.find(item => item.title === title && item.size === size && item.color === color);
        if (existingItem) {
            existingItem.qty += qty;
        } else {
            cartItems.push({ title, price, qty, img, size, color, id: Date.now() });
        }
        updateCartBadge();
        renderCart();
    }

    function updateCartBadge() {
        const totalQty = cartItems.reduce((acc, item) => acc + item.qty, 0);
        cartCountBadge.textContent = totalQty;
        cartCountBadge.classList.add('bump');
        setTimeout(() => {
            cartCountBadge.classList.remove('bump');
        }, 300);
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <span class="toast-success-icon">✓</span>
            <span class="toast-message">${message}</span>
        `;
        toastHub.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }




    function initFilterListeners() {

        searchInput.addEventListener('input', (e) => {
            activeFilters.searchQuery = e.target.value.toLowerCase().trim();
            applyFilters();
        });

        categoryLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedCat = link.getAttribute('data-category');
                activeFilters.category = selectedCat;

                categoryLinks.forEach(l => l.style.fontWeight = '500');
                link.style.fontWeight = '700';
                
                applyFilters();

                const targetSection = document.getElementById('products-grid-section');
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        typeCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                updateCheckboxFilter('types', typeCheckboxes);
                toggleFilterBtnActive('filter-device-type', activeFilters.types.length > 0);
                applyFilters();
            });
        });

        priceRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                activeFilters.priceRange = radio.value;
                toggleFilterBtnActive('filter-price', radio.value !== 'all');
                applyFilters();
            });
        });

        ratingRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                activeFilters.minRating = parseFloat(radio.value);
                toggleFilterBtnActive('filter-review', parseFloat(radio.value) > 0);
                applyFilters();
            });
        });

        materialCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                updateCheckboxFilter('materials', materialCheckboxes);
                toggleFilterBtnActive('filter-material', activeFilters.materials.length > 0);
                applyFilters();
            });
        });

        offerCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                updateCheckboxFilter('offers', offerCheckboxes);
                toggleFilterBtnActive('filter-offer', activeFilters.offers.length > 0);
                applyFilters();
            });
        });

        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', resetAllFilters);
        }
    }

    function updateCheckboxFilter(stateKey, checkboxes) {
        activeFilters[stateKey] = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
    }

    function toggleFilterBtnActive(btnId, isActive) {
        const btn = document.getElementById(btnId);
        if (btn) {
            if (isActive) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    }

    function applyFilters() {
        let visibleCount = 0;

        productCards.forEach(card => {
            const price = parseFloat(card.getAttribute('data-price'));
            const rating = parseFloat(card.getAttribute('data-rating'));
            const category = card.getAttribute('data-category');
            const type = card.getAttribute('data-type');
            const material = card.getAttribute('data-material');
            const offer = card.getAttribute('data-offer');
            
            const title = card.querySelector('.product-title').textContent.toLowerCase();
            const subtext = card.querySelector('.product-subtext').textContent.toLowerCase();

            const matchesCategory = activeFilters.category === 'all' || category === activeFilters.category;

            const colorsJson = card.getAttribute('data-colors');
            const colorsList = colorsJson ? JSON.parse(colorsJson) : [];
            const colorNames = colorsList.map(hex => (colorNamesMap[hex] || '').toLowerCase());

            const matchesSearch = activeFilters.searchQuery === '' || 
                                  title.includes(activeFilters.searchQuery) || 
                                  subtext.includes(activeFilters.searchQuery) ||
                                  colorNames.some(name => name.includes(activeFilters.searchQuery));

            const matchesType = activeFilters.types.length === 0 || activeFilters.types.includes(type);

            let matchesPrice = true;
            if (activeFilters.priceRange === 'under-150') {
                matchesPrice = price < 150;
            } else if (activeFilters.priceRange === '150-300') {
                matchesPrice = price >= 150 && price <= 300;
            } else if (activeFilters.priceRange === 'over-300') {
                matchesPrice = price > 300;
            }

            const matchesRating = rating >= activeFilters.minRating;

            const matchesMaterial = activeFilters.materials.length === 0 || activeFilters.materials.includes(material);

            const matchesOffer = activeFilters.offers.length === 0 || activeFilters.offers.includes(offer);

            const isVisible = matchesCategory && matchesSearch && matchesType && matchesPrice && 
                              matchesRating && matchesMaterial && matchesOffer;

            if (isVisible) {
                card.classList.remove('hidden');
                visibleCount++;
            } else {
                card.classList.add('hidden');
            }
        });

        if (visibleCount === 0) {
            cardsGrid.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            cardsGrid.classList.remove('hidden');
            emptyState.classList.add('hidden');
        }
    }

    function resetAllFilters() {

        searchInput.value = '';
        activeFilters.searchQuery = '';

        activeFilters.category = 'all';
        categoryLinks.forEach(l => l.style.fontWeight = '500');

        typeCheckboxes.forEach(cb => cb.checked = false);
        activeFilters.types = [];
        toggleFilterBtnActive('filter-device-type', false);

        priceRadios.forEach(radio => {
            radio.checked = radio.value === 'all';
        });
        activeFilters.priceRange = 'all';
        toggleFilterBtnActive('filter-price', false);

        ratingRadios.forEach(radio => {
            radio.checked = radio.value === '0';
        });
        activeFilters.minRating = 0;
        toggleFilterBtnActive('filter-review', false);

        materialCheckboxes.forEach(cb => cb.checked = false);
        activeFilters.materials = [];
        toggleFilterBtnActive('filter-material', false);

        offerCheckboxes.forEach(cb => cb.checked = false);
        activeFilters.offers = [];
        toggleFilterBtnActive('filter-offer', false);

        applyFilters();
        showToast('Todos los filtros han sido restablecidos.');
    }



    
    function initSorting() {
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const criteria = e.target.value;
                sortGridItems(criteria);
            });
        }
    }

    function sortGridItems(criteria) {
        if (criteria === 'default') {

            productCards.sort((a, b) => {
                const idA = parseInt(a.id.replace('card-', ''));
                const idB = parseInt(b.id.replace('card-', ''));
                return idA - idB;
            });
        } else if (criteria === 'price-asc') {

            productCards.sort((a, b) => {
                return parseFloat(a.getAttribute('data-price')) - parseFloat(b.getAttribute('data-price'));
            });
        } else if (criteria === 'price-desc') {

            productCards.sort((a, b) => {
                return parseFloat(b.getAttribute('data-price')) - parseFloat(a.getAttribute('data-price'));
            });
        } else if (criteria === 'rating-desc') {

            productCards.sort((a, b) => {
                return parseFloat(b.getAttribute('data-rating')) - parseFloat(a.getAttribute('data-rating'));
            });
        }

        productCards.forEach(card => {
            cardsGrid.appendChild(card);
        });

        cardsGrid.style.opacity = '0.3';
        cardsGrid.style.transform = 'translateY(5px)';
        setTimeout(() => {
            cardsGrid.style.opacity = '1';
            cardsGrid.style.transform = '';
        }, 150);

        showToast('Productos reordenados.');
    }
