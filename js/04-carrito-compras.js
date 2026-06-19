const cartDrawer = document.getElementById('cart-drawer');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartItemsList = document.getElementById('cart-items-list');
    const cartSubtotalPrice = document.getElementById('cart-subtotal-price');
    const cartDrawerCount = document.getElementById('cart-drawer-count');

    const headerCartBtn = document.getElementById('cart-btn');
    if (headerCartBtn) {
        headerCartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            renderCart();
            cartDrawer.classList.remove('hidden');
        });
    }
    
    closeCartBtn.addEventListener('click', () => cartDrawer.classList.add('hidden'));
    
    cartDrawer.addEventListener('click', (e) => {
        if (e.target === cartDrawer) cartDrawer.classList.add('hidden');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!cartDrawer.classList.contains('hidden')) {
                cartDrawer.classList.add('hidden');
            }
        }
    });
    
    function renderCart() {
        const buyerForm = document.getElementById('cart-buyer-form');
        if (cartItems.length === 0) {
            cartItemsList.innerHTML = `
                <div class="empty-cart-msg">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    <p>Tu carrito está vacío</p>
                    <button class="btn btn-primary" onclick="document.getElementById('cart-drawer').classList.add('hidden')" style="margin-top: 15px;">Seguir Comprando</button>
                </div>
            `;
            if (cartSubtotalPrice) cartSubtotalPrice.textContent = 'S/ 0.00';
            const cartShippingPrice = document.getElementById('cart-shipping-price');
            const cartTotalPrice = document.getElementById('cart-total-price');
            if (cartShippingPrice) cartShippingPrice.textContent = 'Gratis';
            if (cartTotalPrice) cartTotalPrice.textContent = 'S/ 0.00';
            cartDrawerCount.textContent = '0';
            if (buyerForm) buyerForm.classList.add('hidden');
            return;
        }
        
        if (buyerForm) buyerForm.classList.remove('hidden');
        
        let subtotal = 0;
        let totalItems = 0;
        cartItemsList.innerHTML = '';
        
        cartItems.forEach((item, index) => {
            subtotal += item.price * item.qty;
            totalItems += item.qty;
            
            const cartItemEl = document.createElement('div');
            cartItemEl.className = 'cart-item';
            cartItemEl.innerHTML = `
                <div class="cart-item-img">${item.img}</div>
                <div class="cart-item-details">
                    <div class="cart-item-title">
                        <span>${item.title}</span>
                        <button class="cart-item-remove" data-index="${index}">&times;</button>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 5px;">Talla: <strong style="color: var(--color-text-main);">${item.size}</strong> | Color: <strong style="color: var(--color-text-main);">${item.color || 'Único'}</strong></div>
                    <div class="cart-item-price">S/ ${item.price.toFixed(2)}</div>
                    <div class="cart-qty-controls">
                        <button class="cart-qty-btn decrease-qty" data-index="${index}">&minus;</button>
                        <span class="cart-qty-val">${item.qty}</span>
                        <button class="cart-qty-btn increase-qty" data-index="${index}">&plus;</button>
                    </div>
                </div>
            `;
            cartItemsList.appendChild(cartItemEl);
        });

        const agencySelect = document.getElementById('buyer-agency');
        const shippingCost = (agencySelect && agencySelect.value === 'Otra') ? 20 : 0;
        const total = subtotal + shippingCost;

        if (cartSubtotalPrice) cartSubtotalPrice.textContent = `S/ ${subtotal.toFixed(2)}`;
        
        const cartShippingPrice = document.getElementById('cart-shipping-price');
        const cartTotalPrice = document.getElementById('cart-total-price');
        
        if (cartShippingPrice) {
            cartShippingPrice.textContent = shippingCost > 0 ? `S/ ${shippingCost.toFixed(2)}` : 'Gratis';
            cartShippingPrice.style.color = shippingCost > 0 ? 'var(--color-accent)' : 'var(--color-primary-light)';
            cartShippingPrice.style.fontWeight = '700';
        }
        if (cartTotalPrice) cartTotalPrice.textContent = `S/ ${total.toFixed(2)}`;
        
        cartDrawerCount.textContent = totalItems;

        document.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                cartItems.splice(idx, 1);
                updateCartBadge();
                renderCart();
            });
        });
        document.querySelectorAll('.decrease-qty').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                if (cartItems[idx].qty > 1) {
                    cartItems[idx].qty--;
                } else {
                    cartItems.splice(idx, 1);
                }
                updateCartBadge();
                renderCart();
            });
        });
        document.querySelectorAll('.increase-qty').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                cartItems[idx].qty++;
                updateCartBadge();
                renderCart();
            });
        });
    }

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cartItems.length === 0) {
                showToast('Tu carrito está vacío. Añade algunas prendas para comprar.');
                return;
            }

            const nameInput = document.getElementById('buyer-name');
            const docTypeSelect = document.getElementById('buyer-doc-type');
            const docNumberInput = document.getElementById('buyer-doc-number');
            const agencySelect = document.getElementById('buyer-agency');
            const customAgencyInput = document.getElementById('buyer-custom-agency');
            const destinationInput = document.getElementById('buyer-destination');
            const btnOpenShalomSelector = document.getElementById('btn-open-shalom-selector');
            
            const name = nameInput.value.trim();
            const docType = docTypeSelect.value;
            const docNumber = docNumberInput.value.trim();
            const agency = agencySelect.value;
            const customAgency = customAgencyInput.value.trim();
            const destination = destinationInput.value.trim();

            let hasErrors = false;

            const allInputs = [nameInput, docNumberInput, customAgencyInput, destinationInput];
            if (btnOpenShalomSelector) allInputs.push(btnOpenShalomSelector);
            allInputs.forEach(el => el.classList.remove('input-error'));
            
            if (!name) {
                nameInput.classList.add('input-error');
                hasErrors = true;
            }

            if (docType === 'DNI') {
                const dniRegex = /^\d{8}$/;
                if (!dniRegex.test(docNumber)) {
                    docNumberInput.classList.add('input-error');
                    hasErrors = true;
                }
            } else if (docType === 'CE') {
                const ceRegex = /^\d{9}$/;
                if (!ceRegex.test(docNumber)) {
                    docNumberInput.classList.add('input-error');
                    hasErrors = true;
                }
            }

            if (agency === 'Otra' && !customAgency) {
                customAgencyInput.classList.add('input-error');
                hasErrors = true;
            }
            if (agency === 'Shalom' && !selectedShalomAgency) {
                if (btnOpenShalomSelector) btnOpenShalomSelector.classList.add('input-error');
                hasErrors = true;
            }
            if (!destination) {
                destinationInput.classList.add('input-error');
                hasErrors = true;
            }
            
            if (hasErrors) {
                showToast('⚠️ Completa tus datos, agencia y destino de envío de forma correcta.');
                return;
            }
            
            let message = '¡Hola! Quisiera comprar los siguientes productos en Out Silver:\n\n';
            let subtotal = 0;
            
            cartItems.forEach(item => {
                const itemTotal = item.price * item.qty;
                subtotal += itemTotal;
                message += `- ${item.qty}x ${item.title} (Talla: ${item.size}, Color: ${item.color || 'Único'}) - S/ ${itemTotal.toFixed(2)}\n`;
            });
            
            message += `\n*Datos del Comprador:*\n`;
            message += `- Nombre Completo: ${name}\n`;
            message += `- Documento: ${docType} (${docNumber})\n\n`;

            const finalAgency = agency === 'Shalom' && selectedShalomAgency 
                ? `Shalom (Agencia: ${selectedShalomAgency.name})` 
                : customAgency;
            const finalDestination = agency === 'Shalom' && selectedShalomAgency
                ? selectedShalomAgency.address
                : destination;

            message += `*Datos de Envío:*\n`;
            message += `- Agencia: ${finalAgency}\n`;
            message += `- Destino: ${finalDestination}\n\n`;
            
            const shippingCost = agency === 'Otra' ? 20 : 0;
            const total = subtotal + shippingCost;
            
            message += `*Subtotal:* S/ ${subtotal.toFixed(2)}\n`;
            if (shippingCost > 0) {
                message += `- Costo de Envío: S/ ${shippingCost.toFixed(2)} (Otra Agencia)\n`;
            } else {
                message += `- Costo de Envío: Gratis (Agencia Shalom)\n`;
            }
            message += `*Total Final:* S/ ${total.toFixed(2)}\n\n`;
            message += 'Por favor, confírmame disponibilidad y los pasos para el pago. ¡Gracias!';
            
            const encodedMessage = encodeURIComponent(message);
            const phoneNumber = '51966314626'; 
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
            
            window.open(whatsappUrl, '_blank');
        });
    }

    const docTypeSelect = document.getElementById('buyer-doc-type');
    const docNumberInput = document.getElementById('buyer-doc-number');
    if (docTypeSelect && docNumberInput) {

        docNumberInput.placeholder = 'Número de DNI (8 dígitos)';
        docNumberInput.maxLength = 8;

        docTypeSelect.addEventListener('change', (e) => {
            const docType = e.target.value;
            if (docType === 'DNI') {
                docNumberInput.placeholder = 'Número de DNI (8 dígitos)';
                docNumberInput.maxLength = 8;
            } else if (docType === 'CE') {
                docNumberInput.placeholder = 'Número de CE (9 dígitos)';
                docNumberInput.maxLength = 9;
            }

            docNumberInput.value = '';
            docNumberInput.classList.remove('input-error');
        });
    }

    const agencySelect = document.getElementById('buyer-agency');
    const customAgencyGroup = document.getElementById('buyer-custom-agency-group');
    const customAgencyInput = document.getElementById('buyer-custom-agency');
    const shalomAgencyGroup = document.getElementById('shalom-agency-finder-group');
    const btnOpenShalomSelector = document.getElementById('btn-open-shalom-selector');
    const destinationInput = document.getElementById('buyer-destination');

    if (agencySelect) {
        agencySelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'Otra') {
                if (customAgencyGroup) customAgencyGroup.classList.remove('hidden');
                if (shalomAgencyGroup) shalomAgencyGroup.classList.add('hidden');
                if (customAgencyInput) customAgencyInput.focus();

                clearShalomSelection();
                closeShalomSelector();
            } else if (val === 'Shalom') {
                if (customAgencyGroup) customAgencyGroup.classList.add('hidden');
                if (shalomAgencyGroup) shalomAgencyGroup.classList.remove('hidden');
                if (customAgencyInput) {
                    customAgencyInput.value = '';
                    customAgencyInput.classList.remove('input-error');
                }

                openShalomSelector();
            }

            renderCart();
        });
    }
