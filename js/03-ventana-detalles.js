const productModal = document.getElementById('product-detail-modal');
    const closeProductModalBtn = document.getElementById('close-modal-btn');
    
    const modalImageContainer = document.getElementById('modal-image-container');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalPrice = document.getElementById('modal-price');
    const modalFinancing = document.getElementById('modal-financing');
    const modalRatingContainer = document.getElementById('modal-rating-container');
    const modalCategory = document.getElementById('modal-breadcrumb-category');
    const modalProductTitle = document.getElementById('modal-breadcrumb-title');
    const modalStock = document.getElementById('modal-stock');
    
    const qtyMinus = document.getElementById('qty-minus');
    const qtyPlus = document.getElementById('qty-plus');
    const qtyValue = document.getElementById('qty-value');
    let currentQty = 1;
    
    productCards.forEach(card => {
        card.style.cursor = 'pointer'; 
        card.addEventListener('click', (e) => {

            if (e.target.closest('.favorite-toggle-btn')) {
                return;
            }
            
            const title = card.querySelector('.product-title').textContent;
            const price = parseFloat(card.getAttribute('data-price'));
            const desc = card.querySelector('.product-subtext').textContent;
            const category = card.getAttribute('data-category');
            const ratingHtml = card.querySelector('.stars-container').innerHTML;
            const reviewCount = card.querySelector('.review-count').textContent;
            const svgArt = card.querySelector('.vector-art-container').innerHTML;
            
            modalTitle.textContent = title;
            modalProductTitle.textContent = title;
            modalCategory.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            modalDesc.textContent = desc;

            const featuresJson = card.getAttribute('data-features');
            const modalFeatures = document.getElementById('modal-features');
            if (modalFeatures) {
                if (featuresJson) {
                    modalFeatures.innerHTML = '';
                    const features = JSON.parse(featuresJson);
                    features.forEach(feat => {
                        const li = document.createElement('li');
                        li.innerHTML = feat.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        li.style.marginBottom = '8px';
                        modalFeatures.appendChild(li);
                    });
                    modalFeatures.style.display = 'block';
                } else {
                    modalFeatures.style.display = 'none';
                }
            }

            const priceRegular = card.getAttribute('data-price-regular');
            modalPrice.textContent = `S/ ${price.toFixed(2)}`;
            const modalPriceRegular = document.getElementById('modal-price-regular');
            if (modalPriceRegular) {
                if (priceRegular) {
                    modalPriceRegular.textContent = `S/ ${parseFloat(priceRegular).toFixed(2)}`;
                    modalPriceRegular.style.display = 'inline';
                    modalPrice.style.color = 'var(--color-accent)'; 
                } else {
                    modalPriceRegular.style.display = 'none';
                    modalPrice.style.color = 'var(--color-text-main)'; 
                }
            }
            
            if(modalFinancing) modalFinancing.style.display = 'none';
            
            const colorImagesJson = card.getAttribute('data-color-images');
            if (colorImagesJson) {
                const colorImages = JSON.parse(colorImagesJson);
                const colors = JSON.parse(card.getAttribute('data-colors') || '[]');
                const firstColor = colors[0];
                const imageUrl = colorImages[firstColor] || card.querySelector('img').src;
                modalImageContainer.innerHTML = `<img src="${imageUrl}" alt="${title}" class="product-img-display">`;
            } else {
                modalImageContainer.innerHTML = svgArt;
            }
            
            modalRatingContainer.innerHTML = `<div class="stars-container" style="display:flex;">${ratingHtml}</div> <span class="modal-review-count">${reviewCount}</span>`;
            
            const randomStock = Math.floor(Math.random() * 15) + 2;
            modalStock.textContent = `${randomStock} unidades`;
            
            currentQty = 1;
            qtyValue.textContent = currentQty;

            const colorOptionsContainer = document.querySelector('.modal-details-col .color-options');
            if (colorOptionsContainer) {
                colorOptionsContainer.innerHTML = '';
                const colorsJson = card.getAttribute('data-colors');
                const colors = colorsJson ? JSON.parse(colorsJson) : ["#f4f4f4"];
                


                const colorImages = JSON.parse(card.getAttribute('data-color-images') || '{}');

                colors.forEach((color, idx) => {
                    const btn = document.createElement('button');
                    btn.className = `color-btn${idx === 0 ? ' active' : ''}`;
                    btn.setAttribute('data-color', color);
                    const colorName = colorNamesMap[color] || color;
                    btn.setAttribute('data-color-name', colorName);
                    
                    const dot = document.createElement('span');
                    dot.className = 'color-swatch-dot';
                    dot.style.backgroundColor = color;
                    btn.appendChild(dot);
                    
                    const label = document.createElement('span');
                    label.className = 'color-name-label';
                    label.textContent = colorName;
                    btn.appendChild(label);
                    
                    btn.addEventListener('click', () => {
                        colorOptionsContainer.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        
                        if (colorImages[color]) {
                            const imgEl = modalImageContainer.querySelector('img');
                            if (imgEl) {
                                imgEl.src = colorImages[color];
                            }
                        } else {
                            const svgPaths = modalImageContainer.querySelectorAll('svg path');
                            svgPaths.forEach(path => {
                                const currentFill = path.getAttribute('fill');
                                if (currentFill && currentFill !== 'none') {
                                    path.setAttribute('fill', color);
                                }
                            });
                        }
                    });
                    
                    colorOptionsContainer.appendChild(btn);
                });
            }
            
            productModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    });
    
    const closeModal = () => {
        productModal.classList.add('hidden');
        document.body.style.overflow = '';
    };
    
    closeProductModalBtn.addEventListener('click', closeModal);
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) closeModal();
    });
    
    document.addEventListener('keydown', (e) => {

    });
    
    qtyMinus.addEventListener('click', () => {
        if (currentQty > 1) {
            currentQty--;
            qtyValue.textContent = currentQty;
        }
    });
    
    qtyPlus.addEventListener('click', () => {
        currentQty++;
        qtyValue.textContent = currentQty;
    });
    
    const colorBtns = document.querySelectorAll('.color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    const sizeBtns = document.querySelectorAll('.size-btn');
    sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    const sizeGuideModal = document.getElementById('size-guide-modal');
    const openSizeGuideBtn = document.getElementById('open-size-guide');
    const closeSizeGuideBtn = document.getElementById('close-size-guide-btn');
    
    const closeSizeGuide = () => {
        sizeGuideModal.classList.add('hidden');
    };
    
    openSizeGuideBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sizeGuideModal.classList.remove('hidden');
    });
    
    closeSizeGuideBtn.addEventListener('click', closeSizeGuide);
    sizeGuideModal.addEventListener('click', (e) => {
        if (e.target === sizeGuideModal) closeSizeGuide();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!sizeGuideModal.classList.contains('hidden')) {
                closeSizeGuide();
            } else if (!productModal.classList.contains('hidden')) {
                closeModal();
            }
        }
    });
    
    document.getElementById('modal-add-cart').addEventListener('click', () => {
        const title = modalTitle.textContent;
        const price = parseFloat(modalPrice.textContent.replace('S/', '').trim());
        const svgArt = modalImageContainer.innerHTML;
        const activeSizeBtn = document.querySelector('.size-btn.active');
        const size = activeSizeBtn ? activeSizeBtn.textContent : 'Única';
        const activeColorBtn = document.querySelector('.modal-details-col .color-btn.active');
        const color = activeColorBtn ? (activeColorBtn.getAttribute('data-color-name') || 'Único') : 'Único';
        
        addToCart(title, price, currentQty, svgArt, size, color);
        showToast(`¡${currentQty}x "${title}" (Talla ${size}, Color ${color}) añadido al carrito!`);
        closeModal();
    });
    
    document.getElementById('modal-buy-now').addEventListener('click', () => {
        const title = modalTitle.textContent;
        const price = parseFloat(modalPrice.textContent.replace('S/', '').trim());
        const svgArt = modalImageContainer.innerHTML;
        const activeSizeBtn = document.querySelector('.size-btn.active');
        const size = activeSizeBtn ? activeSizeBtn.textContent : 'Única';
        const activeColorBtn = document.querySelector('.modal-details-col .color-btn.active');
        const color = activeColorBtn ? (activeColorBtn.getAttribute('data-color-name') || 'Único') : 'Único';
        
        addToCart(title, price, currentQty, svgArt, size, color);
        closeModal();
        cartDrawer.classList.remove('hidden');
    });
