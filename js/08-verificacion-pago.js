// ============================================
// 08 — Verificación de Pago (Yape)
// ============================================

(function () {
    'use strict';

    // --- CONFIG KEYS ---
    const PAYMENT_CONFIG_KEY = 'outsilver_payment_config';
    const USED_CODES_KEY = 'outsilver_used_codes';

    // --- GOOGLE SHEETS ---
    // La URL se lee de la configuración guardada en metodo-pago.html
    function getGoogleScriptUrl() {
        try {
            const config = JSON.parse(localStorage.getItem(PAYMENT_CONFIG_KEY) || '{}');
            return config.sheets_url || '';
        } catch (e) { return ''; }
    }

    // --- STATE ---
    let currentStep = 1;
    let selectedMethod = null; // 'yape'
    let uploadedFile = null;
    let uploadedPreviewUrl = null;
    let ocrResult = { code: '', amount: '' };
    let checkoutData = null; // saved from cart checkout

    // --- DOM REFERENCES ---
    const modal = document.getElementById('payment-verification-modal');
    const closeBtn = document.getElementById('payment-modal-close-btn');
    const steps = [
        document.getElementById('payment-step-1'),
        document.getElementById('payment-step-2'),
        document.getElementById('payment-step-3')
    ];
    const progressSteps = document.querySelectorAll('.payment-progress-step');
    const progressLines = document.querySelectorAll('.payment-progress-line');
    const btnBack = document.getElementById('payment-btn-back');
    const btnNext = document.getElementById('payment-btn-next');
    const dropZone = document.getElementById('payment-drop-zone');
    const fileInput = document.getElementById('payment-screenshot-input');
    const previewContainer = document.getElementById('payment-screenshot-preview');
    const previewImg = document.getElementById('payment-preview-img');
    const removePreviewBtn = document.getElementById('payment-remove-preview');
    const ocrProgressEl = document.getElementById('payment-ocr-progress');
    const ocrBarEl = document.getElementById('payment-ocr-bar');
    const ocrStatusEl = document.getElementById('payment-ocr-status');
    const confirmCodeInput = document.getElementById('payment-confirm-code');
    const confirmAmountEl = document.getElementById('payment-confirm-amount');
    const confirmMethodEl = document.getElementById('payment-confirm-method');
    const confirmPreviewImg = document.getElementById('payment-confirm-preview-img');
    const duplicateWarning = document.getElementById('payment-duplicate-warning');
    const codeValidationBadge = document.getElementById('payment-code-validation');

    // --- LOAD PAYMENT CONFIG ---
    function loadPaymentConfig() {
        try {
            const data = localStorage.getItem(PAYMENT_CONFIG_KEY);
            if (data) return JSON.parse(data);
        } catch (e) {
            console.warn('Error loading payment config:', e);
        }
        // Default config
        return {
            titular: 'Out Silver Perú',
            yape_number: '966314626',
            yape_qr: ''
        };
    }

    // --- LOAD USED CODES ---
    function loadUsedCodes() {
        try {
            const data = localStorage.getItem(USED_CODES_KEY);
            if (data) return JSON.parse(data);
        } catch (e) { /* ignore */ }
        return [];
    }

    function saveUsedCodeLocal(code, imageUrl) {
        // Guardar en localStorage (fallback local / historial offline)
        const codes = loadUsedCodes();

        let productsSummary = '';
        if (checkoutData && checkoutData.items) {
            productsSummary = checkoutData.items.map(item =>
                `${item.qty}x ${item.title} (Talla: ${item.size}, Color: ${item.color || 'Único'})`
            ).join(' | ');
        }

        codes.push({
            code: code,
            date: new Date().toISOString(),
            method: 'Yape',
            amount: checkoutData ? 'S/ ' + checkoutData.total.toFixed(2) : '',
            client: checkoutData ? checkoutData.name : '',
            document: checkoutData ? `${checkoutData.docType} ${checkoutData.docNumber}` : '',
            products: productsSummary,
            destination: checkoutData ? `${checkoutData.agency} - ${checkoutData.destination}` : '',
            status: 'Pendiente',
            imageUrl: imageUrl || ''
        });
        localStorage.setItem(USED_CODES_KEY, JSON.stringify(codes));
    }

    // Registra el pago en Google Sheets (sube también el comprobante a Drive) y
    // devuelve la URL pública de la imagen para poder incluirla en el mensaje de WhatsApp.
    // Nunca rechaza la promesa: ante cualquier falla o demora resuelve con '' para no
    // bloquear el envío del pedido.
    function registerPaymentRemote(code) {
        const scriptUrl = getGoogleScriptUrl();
        if (!scriptUrl) {
            console.warn('Google Sheets URL no configurada. El pago solo se guarda localmente.');
            return Promise.resolve('');
        }

        let productsSummary = '';
        if (checkoutData && checkoutData.items) {
            productsSummary = checkoutData.items.map(item =>
                `${item.qty}x ${item.title} (Talla: ${item.size}, Color: ${item.color || 'Único'})`
            ).join(' | ');
        }

        const payload = {
            code: code,
            method: 'Yape',
            amount: checkoutData ? 'S/ ' + checkoutData.total.toFixed(2) : '',
            clientName: checkoutData ? checkoutData.name : '',
            document: checkoutData ? `${checkoutData.docType} ${checkoutData.docNumber}` : '',
            products: productsSummary,
            destination: checkoutData ? `${checkoutData.agency} - ${checkoutData.destination}` : ''
        };

        // text/plain evita el preflight de CORS que Apps Script no puede responder,
        // permitiendo leer la respuesta (a diferencia del modo 'no-cors' usado antes).
        const postPayload = (finalPayload) => {
            return fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(finalPayload)
            })
                .then(res => res.json())
                .then(result => {
                    if (result && result.success) {
                        console.log('✅ Pago registrado en Google Sheets');
                        return result.imageUrl || '';
                    }
                    console.warn('⚠️ Google Sheets respondió con error:', result && result.error);
                    return '';
                })
                .catch(err => {
                    console.warn('⚠️ No se pudo registrar en Google Sheets:', err);
                    return '';
                });
        };

        const withTimeout = (promise, ms) => Promise.race([
            promise,
            new Promise(resolve => setTimeout(() => resolve(''), ms))
        ]);

        const request = uploadedPreviewUrl
            ? compressImageForUpload(uploadedPreviewUrl)
                .then(compressedDataUrl => {
                    const commaIdx = compressedDataUrl.indexOf(',');
                    payload.imageMime = compressedDataUrl.substring(5, compressedDataUrl.indexOf(';'));
                    payload.imageBase64 = compressedDataUrl.substring(commaIdx + 1);
                    return postPayload(payload);
                })
                .catch(() => postPayload(payload))
            : postPayload(payload);

        // Máximo 8s de espera: si la red está muy lenta, el pedido igual se envía por
        // WhatsApp (sin el link de la foto) y el registro en Sheets sigue en curso.
        return withTimeout(request, 8000);
    }

    // --- IMAGE COMPRESSION (para no saturar Drive/Sheets con capturas de varios MB) ---
    function compressImageForUpload(dataUrl, maxWidth = 1000, quality = 0.72) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    function isCodeDuplicate(code) {
        if (!code || code.length < 4) return false;
        // Verificar en localStorage (inmediato)
        const codes = loadUsedCodes();
        return codes.some(entry => entry.code === code);
    }

    // --- OPEN / CLOSE MODAL ---
    window.openPaymentModal = function (data) {
        checkoutData = data;
        currentStep = 1;
        selectedMethod = 'yape';
        uploadedFile = null;
        uploadedPreviewUrl = null;
        ocrResult = { code: '', amount: '' };

        // Reset UI
        resetAllSteps();
        updateProgressBar();
        updateButtons();
        goToStep(1);

        // Deselect method cards
        document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));

        // Reset upload
        if (fileInput) fileInput.value = '';
        if (previewContainer) previewContainer.classList.remove('visible');
        if (dropZone) {
            dropZone.classList.remove('has-file');
            dropZone.style.display = '';
        }
        if (ocrProgressEl) ocrProgressEl.classList.remove('visible');
        if (duplicateWarning) duplicateWarning.classList.remove('visible');

        modal.classList.remove('hidden');
    };

    function closeModal() {
        modal.classList.add('hidden');
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                closeModal();
            }
        });
    }

    // --- STEP NAVIGATION ---
    function goToStep(step) {
        currentStep = step;
        steps.forEach((s, i) => {
            if (s) {
                s.classList.remove('active');
                if (i === step - 1) s.classList.add('active');
            }
        });
        updateProgressBar();
        updateButtons();

        // Populate step 2 if going there
        if (step === 2 && selectedMethod) {
            populatePaymentInfo();
        }
        // Populate step 3 if going there
        if (step === 3) {
            populateConfirmation();
        }
    }

    function updateProgressBar() {
        progressSteps.forEach((ps, i) => {
            ps.classList.remove('active', 'completed');
            if (i + 1 === currentStep) ps.classList.add('active');
            if (i + 1 < currentStep) ps.classList.add('completed');
        });
        progressLines.forEach((pl, i) => {
            pl.classList.remove('completed');
            if (i + 1 < currentStep) pl.classList.add('completed');
        });
    }

    function updateButtons() {
        if (!btnBack || !btnNext) return;

        // Back button
        if (currentStep === 1) {
            btnBack.style.display = 'none';
        } else {
            btnBack.style.display = '';
        }

        // Next button
        if (currentStep === 1) {
            btnNext.textContent = 'Continuar';
            btnNext.className = 'payment-btn payment-btn-next';
            btnNext.disabled = !selectedMethod;
            btnNext.innerHTML = 'Continuar →';
        } else if (currentStep === 2) {
            btnNext.textContent = 'Verificar Pago';
            btnNext.className = 'payment-btn payment-btn-next';
            btnNext.disabled = !uploadedFile;
            btnNext.innerHTML = '🔍 Verificar Pago';
        } else if (currentStep === 3) {
            btnNext.className = 'payment-btn payment-btn-whatsapp';
            btnNext.disabled = false;
            btnNext.innerHTML = '📱 Confirmar y Enviar por WhatsApp';
        }
    }

    function resetAllSteps() {
        steps.forEach(s => { if (s) s.classList.remove('active'); });
    }

    if (btnBack) {
        btnBack.addEventListener('click', () => {
            if (currentStep > 1) goToStep(currentStep - 1);
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (currentStep === 1 && selectedMethod) {
                goToStep(2);
            } else if (currentStep === 2 && uploadedFile) {
                // Run OCR and go to step 3
                runOCRAndAdvance();
            } else if (currentStep === 3) {
                confirmAndSendWhatsApp();
            }
        });
    }

    // --- STEP 1: METHOD SELECTION ---
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.addEventListener('click', () => {
            selectedMethod = card.dataset.method;
            document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            updateButtons();

            // Auto-advance after a small delay
            setTimeout(() => goToStep(2), 300);
        });
    });

    // --- STEP 2: PAYMENT INFO ---
    function populatePaymentInfo() {
        const config = loadPaymentConfig();
        const infoCard = document.getElementById('payment-info-card');
        const infoNumber = document.getElementById('payment-info-number');
        const infoTitular = document.getElementById('payment-info-titular');
        const infoAmount = document.getElementById('payment-info-amount-value');
        const qrContainer = document.getElementById('payment-qr-container');
        const qrImg = document.getElementById('payment-qr-img');

        if (infoCard) {
            infoCard.className = 'payment-info-card yape-theme';
        }

        if (infoNumber) infoNumber.textContent = config.yape_number || '966314626';
        if (infoTitular) infoTitular.textContent = 'Titular: ' + (config.titular || 'Out Silver Perú');

        // Calculate total
        if (checkoutData && infoAmount) {
            infoAmount.textContent = 'S/ ' + checkoutData.total.toFixed(2);
        }

        // QR
        const qrData = config.yape_qr;
        if (qrContainer && qrImg) {
            if (qrData) {
                qrImg.src = qrData;
                qrContainer.style.display = '';
            } else {
                qrContainer.style.display = 'none';
            }
        }

        // Update header
        const infoHeader = document.getElementById('payment-info-header');
        if (infoHeader) {
            infoHeader.textContent = 'Pagar con Yape';
        }
    }

    // --- STEP 2: FILE UPLOAD ---
    if (dropZone) {
        dropZone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) handleFile(files[0]);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
        });
    }

    if (removePreviewBtn) {
        removePreviewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearUpload();
        });
    }

    function handleFile(file) {
        // Validate type
        if (!file.type.startsWith('image/')) {
            showToast('⚠️ Solo se aceptan imágenes (JPG, PNG, etc.)');
            return;
        }
        // Validate size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('⚠️ La imagen es muy grande. Máximo 5MB.');
            return;
        }

        uploadedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedPreviewUrl = e.target.result;
            if (previewImg) previewImg.src = uploadedPreviewUrl;
            if (previewContainer) previewContainer.classList.add('visible');
            if (dropZone) {
                dropZone.classList.add('has-file');
                dropZone.querySelector('.drop-text').textContent = '✅ Imagen cargada';
                dropZone.querySelector('.drop-hint').textContent = file.name;
                dropZone.querySelector('.drop-browse').textContent = 'Cambiar imagen';
            }
            updateButtons();
        };
        reader.readAsDataURL(file);
    }

    function clearUpload() {
        uploadedFile = null;
        uploadedPreviewUrl = null;
        if (fileInput) fileInput.value = '';
        if (previewContainer) previewContainer.classList.remove('visible');
        if (dropZone) {
            dropZone.classList.remove('has-file');
            dropZone.querySelector('.drop-text').textContent = 'Arrastra tu comprobante aquí';
            dropZone.querySelector('.drop-hint').textContent = 'o haz clic para seleccionar';
            dropZone.querySelector('.drop-browse').textContent = 'Seleccionar Archivo';
        }
        updateButtons();
    }

    // --- OCR ---
    async function runOCRAndAdvance() {
        if (!uploadedPreviewUrl) return;

        // Show OCR progress
        if (ocrProgressEl) ocrProgressEl.classList.add('visible');
        if (ocrBarEl) ocrBarEl.style.width = '0%';
        if (ocrStatusEl) ocrStatusEl.textContent = 'Inicializando análisis...';
        if (btnNext) btnNext.disabled = true;

        try {
            // Check if Tesseract is available
            if (typeof Tesseract !== 'undefined') {
                const result = await Tesseract.recognize(
                    uploadedPreviewUrl,
                    'spa',
                    {
                        logger: (m) => {
                            if (m.status === 'recognizing text') {
                                const progress = Math.round(m.progress * 100);
                                if (ocrBarEl) ocrBarEl.style.width = progress + '%';
                                if (ocrStatusEl) ocrStatusEl.textContent = `Analizando comprobante... ${progress}%`;
                            }
                        }
                    }
                );

                ocrResult.code = extractOperationCode(result.data.text);
                ocrResult.amount = extractAmount(result.data.text);
            } else {
                // Fallback: no OCR available
                console.warn('Tesseract.js not loaded, skipping OCR');
                if (ocrBarEl) ocrBarEl.style.width = '100%';
                if (ocrStatusEl) ocrStatusEl.textContent = 'OCR no disponible. Ingresa el código manualmente.';
                await new Promise(r => setTimeout(r, 800));
            }
        } catch (error) {
            console.error('OCR Error:', error);
            if (ocrStatusEl) ocrStatusEl.textContent = 'No se pudo leer la imagen. Ingresa el código manualmente.';
            await new Promise(r => setTimeout(r, 800));
        }

        if (ocrProgressEl) ocrProgressEl.classList.remove('visible');
        goToStep(3);
    }

    function extractOperationCode(text) {
        if (!text) return '';
        
        // Common patterns for Yape operation codes
        // Yape: "Nº de operación: XXXXXXXX" or similar
        
        const patterns = [
            /(?:n[°ºo]?\s*(?:de\s+)?operaci[oó]n|c[oó]digo|code|referencia|ref)\s*[:\-]?\s*([A-Za-z0-9\-]{6,20})/i,
            /(?:operaci[oó]n|transacci[oó]n)\s*(?:n[°ºo]?)?\s*[:\-]?\s*([A-Za-z0-9\-]{6,20})/i,
            /\b(\d{8,12})\b/,  // Standalone 8-12 digit number (common in Yape)
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        return '';
    }

    function extractAmount(text) {
        if (!text) return '';
        
        // Look for S/ or PEN amounts
        const patterns = [
            /S\/?\s*\.?\s*(\d+[.,]\d{2})/i,
            /PEN\s*(\d+[.,]\d{2})/i,
            /(\d+[.,]\d{2})\s*(?:soles|pen)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1].replace(',', '.');
            }
        }

        return '';
    }

    // --- STEP 3: CONFIRMATION ---
    function populateConfirmation() {
        // Method
        if (confirmMethodEl) {
            const methodName = 'Yape';
            const methodColor = '#6B2FA0';
            confirmMethodEl.innerHTML = `<span style="color: ${methodColor}; font-weight: 800;">${methodName}</span>`;
        }

        // Operation code
        if (confirmCodeInput) {
            confirmCodeInput.value = ocrResult.code || '';
            confirmCodeInput.placeholder = ocrResult.code ? '' : 'Escribe el código de operación aquí';
        }

        // Amount
        if (confirmAmountEl && checkoutData) {
            const expected = checkoutData.total.toFixed(2);
            const detected = ocrResult.amount;

            if (detected) {
                const detectedNum = parseFloat(detected);
                const expectedNum = parseFloat(expected);
                const match = Math.abs(detectedNum - expectedNum) < 0.01;
                confirmAmountEl.innerHTML = `
                    S/ ${expected}
                    ${match
                        ? '<span class="validation-badge success">✓ Monto coincide</span>'
                        : `<span class="validation-badge warning">⚠ OCR detectó: S/ ${detected}</span>`
                    }
                `;
            } else {
                confirmAmountEl.innerHTML = `S/ ${expected}`;
            }
        }

        // Preview
        if (confirmPreviewImg && uploadedPreviewUrl) {
            confirmPreviewImg.src = uploadedPreviewUrl;
        }

        // Check duplicate
        checkDuplicateUI();

        // Code validation badge
        updateCodeValidation();
    }

    if (confirmCodeInput) {
        confirmCodeInput.addEventListener('input', () => {
            checkDuplicateUI();
            updateCodeValidation();
        });
    }

    function checkDuplicateUI() {
        if (!confirmCodeInput || !duplicateWarning) return;
        const code = confirmCodeInput.value.trim();
        if (isCodeDuplicate(code)) {
            duplicateWarning.classList.add('visible');
        } else {
            duplicateWarning.classList.remove('visible');
        }
    }

    function updateCodeValidation() {
        if (!codeValidationBadge || !confirmCodeInput) return;
        const code = confirmCodeInput.value.trim();

        if (!code) {
            codeValidationBadge.innerHTML = '<span class="validation-badge warning">⚠ Ingresa el código</span>';
        } else if (code.length < 6) {
            codeValidationBadge.innerHTML = '<span class="validation-badge warning">⚠ Código muy corto</span>';
        } else if (isCodeDuplicate(code)) {
            codeValidationBadge.innerHTML = '<span class="validation-badge error">✕ Código ya usado</span>';
        } else {
            codeValidationBadge.innerHTML = '<span class="validation-badge success">✓ Código válido</span>';
        }
    }

    // --- CONFIRM & SEND WHATSAPP ---
    async function confirmAndSendWhatsApp() {
        const code = confirmCodeInput ? confirmCodeInput.value.trim() : '';

        if (!code) {
            showToast('⚠️ Por favor ingresa el código de operación de tu comprobante.');
            if (confirmCodeInput) confirmCodeInput.focus();
            return;
        }

        if (code.length < 6) {
            showToast('⚠️ El código de operación parece muy corto. Verifica que sea el correcto.');
            if (confirmCodeInput) confirmCodeInput.focus();
            return;
        }

        // Abrir la pestaña ya (dentro del gesto de clic del usuario) para que el navegador
        // no la bloquee como pop-up; la URL real se completa cuando termine la subida.
        const whatsappWindow = window.open('', '_blank');

        if (btnNext) {
            btnNext.disabled = true;
            btnNext.innerHTML = '⏳ Subiendo comprobante...';
        }

        let imageUrl = await registerPaymentRemote(code);
        
        // Si no hay URL remota (Google Sheets no configurado o falló), guardar base64 localmente
        if (!imageUrl && uploadedPreviewUrl) {
            try {
                imageUrl = await compressImageForUpload(uploadedPreviewUrl, 600, 0.5);
            } catch (e) {
                imageUrl = uploadedPreviewUrl;
            }
        }
        
        saveUsedCodeLocal(code, imageUrl);

        // Build WhatsApp message
        const message = buildWhatsAppMessage(code, imageUrl);
        const encodedMessage = encodeURIComponent(message);
        const phoneNumber = '51966314626';
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

        if (whatsappWindow) {
            whatsappWindow.location.href = whatsappUrl;
        } else {
            window.open(whatsappUrl, '_blank');
        }
        closeModal();

        // Clear cart
        if (typeof cartItems !== 'undefined') {
            cartItems.length = 0;
            if (typeof updateCartBadge === 'function') updateCartBadge();
            if (typeof renderCart === 'function') renderCart();
        }

        showToast('✅ ¡Pedido enviado! Revisa tu WhatsApp para coordinar con el vendedor.');
    }

    function buildWhatsAppMessage(operationCode, imageUrl) {
        if (!checkoutData) return '';

        const methodName = 'Yape';
        let message = '¡Hola! Quisiera comprar los siguientes productos en Out Silver:\n\n';

        // Items
        let subtotal = 0;
        checkoutData.items.forEach(item => {
            const itemTotal = item.price * item.qty;
            subtotal += itemTotal;
            message += `- ${item.qty}x ${item.title} (Talla: ${item.size}, Color: ${item.color || 'Único'}) - S/ ${itemTotal.toFixed(2)}\n`;
        });

        // Buyer info
        message += `\n*Datos del Comprador:*\n`;
        message += `- Nombre Completo: ${checkoutData.name}\n`;
        message += `- Documento: ${checkoutData.docType} (${checkoutData.docNumber})\n\n`;

        // Shipping
        message += `*Datos de Envío:*\n`;
        message += `- Agencia: ${checkoutData.agency}\n`;
        message += `- Destino: ${checkoutData.destination}\n\n`;

        // Totals
        message += `*Subtotal:* S/ ${subtotal.toFixed(2)}\n`;
        if (checkoutData.shippingCost > 0) {
            message += `- Costo de Envío: S/ ${checkoutData.shippingCost.toFixed(2)} (Otra Agencia)\n`;
        } else {
            message += `- Costo de Envío: Gratis (Agencia Shalom)\n`;
        }
        message += `*Total Final:* S/ ${checkoutData.total.toFixed(2)}\n\n`;

        // Payment verification
        message += `━━━━━━━━━━━━━━━━━━━━\n`;
        message += `💳 *COMPROBANTE DE PAGO*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n`;
        message += `- Método: ${methodName}\n`;
        message += `- Código de Operación: *${operationCode}*\n`;
        message += `- Monto Pagado: S/ ${checkoutData.total.toFixed(2)}\n\n`;
        message += `📸 _Por favor, adjunta también la captura del comprobante en este chat._\n\n`;
        message += `Por favor, verifica el pago y confirma mi pedido. ¡Gracias! 🙏`;

        return message;
    }

    // --- UTILITY ---
    function showToast(msg) {
        if (typeof window.showToast === 'function') {
            window.showToast(msg);
        } else {
            // Fallback - use existing toast system
            const toastHub = document.getElementById('toast-notification-hub');
            if (toastHub) {
                const toast = document.createElement('div');
                toast.className = 'toast-notification';
                toast.textContent = msg;
                toastHub.appendChild(toast);
                setTimeout(() => {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 300);
                }, 3500);
            } else {
                alert(msg);
            }
        }
    }

})();
