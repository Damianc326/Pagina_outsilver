const shalomFloatingSelector = document.getElementById('shalom-floating-selector');
    const closeShalomSelectorBtn = document.getElementById('close-shalom-selector');
    const shalomSearchInput = document.getElementById('shalom-search-input');
    const clearShalomSearchBtn = document.getElementById('clear-shalom-search');
    const shalomSelectorResults = document.getElementById('shalom-selector-results');
    const selectedAgencyBadge = document.getElementById('selected-agency-badge');
    const selectedAgencyInfo = document.getElementById('selected-agency-info');

    let highlightedIndex = -1;
    let filteredAgencies = [];

    function openShalomSelector() {
        if (shalomFloatingSelector) {
            shalomFloatingSelector.classList.remove('hidden');
            if (shalomSearchInput) {
                shalomSearchInput.focus();

                if (!shalomSearchInput.value.trim()) {
                    if (typeof SHALOM_AGENCIES !== 'undefined') {
                        filteredAgencies = SHALOM_AGENCIES.slice(0, 30);
                        renderAgencyResults();
                    }
                }
            }
        }
    }

    function closeShalomSelector() {
        if (shalomFloatingSelector) {
            shalomFloatingSelector.classList.add('hidden');
            highlightedIndex = -1;
        }
    }

    function clearShalomSelection() {
        selectedShalomAgency = null;
        
        if (btnOpenShalomSelector) {
            btnOpenShalomSelector.innerHTML = '<span>🔍 Seleccionar Agencia Shalom...</span>';
            btnOpenShalomSelector.classList.remove('input-error');
        }
        
        if (selectedAgencyBadge) selectedAgencyBadge.classList.add('hidden');
        if (selectedAgencyInfo) selectedAgencyInfo.innerHTML = 'Ninguna';
        
        if (destinationInput) {
            destinationInput.value = '';
            destinationInput.classList.remove('input-error');
        }
        
        if (shalomSearchInput) {
            shalomSearchInput.value = '';
            shalomSearchInput.classList.remove('input-error');
        }
        if (clearShalomSearchBtn) clearShalomSearchBtn.classList.add('hidden');
        
        if (shalomSelectorResults) {
            shalomSelectorResults.innerHTML = '';
        }
        
        filteredAgencies = [];
        highlightedIndex = -1;
    }

    if (btnOpenShalomSelector) {
        btnOpenShalomSelector.addEventListener('click', (e) => {
            e.stopPropagation();
            openShalomSelector();
        });
    }

    if (closeShalomSelectorBtn) {
        closeShalomSelectorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeShalomSelector();
        });
    }

    if (clearShalomSearchBtn) {
        clearShalomSearchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (shalomSearchInput) {
                shalomSearchInput.value = '';
                clearShalomSearchBtn.classList.add('hidden');
                shalomSearchInput.focus();

                if (typeof SHALOM_AGENCIES !== 'undefined') {
                    filteredAgencies = SHALOM_AGENCIES.slice(0, 30);
                    renderAgencyResults();
                }
            }
        });
    }

    if (shalomSearchInput) {
        shalomSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            
            if (!query) {
                if (clearShalomSearchBtn) clearShalomSearchBtn.classList.add('hidden');
                if (typeof SHALOM_AGENCIES !== 'undefined') {
                    filteredAgencies = SHALOM_AGENCIES.slice(0, 30);
                    renderAgencyResults();
                }
                return;
            }

            if (clearShalomSearchBtn) clearShalomSearchBtn.classList.remove('hidden');

            if (typeof SHALOM_AGENCIES !== 'undefined') {
                filteredAgencies = SHALOM_AGENCIES.filter(agency => 
                    agency.name.toLowerCase().includes(query) || 
                    agency.address.toLowerCase().includes(query)
                ).slice(0, 30); 
            }

            renderAgencyResults();
        });

        shalomSearchInput.addEventListener('keydown', (e) => {
            if (shalomFloatingSelector.classList.contains('hidden') || filteredAgencies.length === 0) return;

            const cards = shalomSelectorResults.querySelectorAll('.shalom-panel-agency-card');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                highlightedIndex = (highlightedIndex + 1) % cards.length;
                updateHighlightedCard(cards);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                highlightedIndex = (highlightedIndex - 1 + cards.length) % cards.length;
                updateHighlightedCard(cards);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredAgencies.length) {
                    selectAgency(filteredAgencies[highlightedIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeShalomSelector();
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (shalomFloatingSelector && !shalomFloatingSelector.classList.contains('hidden')) {
            const clickedInsidePanel = shalomFloatingSelector.contains(e.target);
            const clickedTriggerBtn = btnOpenShalomSelector && btnOpenShalomSelector.contains(e.target);
            
            if (!clickedInsidePanel && !clickedTriggerBtn) {
                closeShalomSelector();
            }
        }
    });

    function renderAgencyResults() {
        if (!shalomSelectorResults) return;
        
        highlightedIndex = -1;
        shalomSelectorResults.innerHTML = '';
        
        if (filteredAgencies.length === 0) {
            shalomSelectorResults.innerHTML = '<div class="no-results-msg">No se encontraron agencias coincidentes</div>';
            return;
        }

        filteredAgencies.forEach((agency, index) => {
            const card = document.createElement('div');
            card.className = 'shalom-panel-agency-card';

            if (selectedShalomAgency && selectedShalomAgency.name === agency.name) {
                card.classList.add('active');
            }
            
            card.setAttribute('data-index', index);
            card.innerHTML = `
                <span class="shalom-panel-agency-name">${agency.name}</span>
                <span class="shalom-panel-agency-address">${agency.address}</span>
                <span class="shalom-panel-agency-select-indicator">Seleccionar →</span>
            `;
            
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                selectAgency(agency);
            });

            shalomSelectorResults.appendChild(card);
        });
    }

    function updateHighlightedCard(cards) {
        cards.forEach(card => card.classList.remove('active'));
        if (highlightedIndex >= 0 && highlightedIndex < cards.length) {
            const activeCard = cards[highlightedIndex];
            activeCard.classList.add('active');

            activeCard.scrollIntoView({ block: 'nearest' });
        }
    }

    function selectAgency(agency) {
        selectedShalomAgency = agency;

        if (btnOpenShalomSelector) {
            btnOpenShalomSelector.innerHTML = `<span>🔍 ${agency.name}</span>`;
            btnOpenShalomSelector.classList.remove('input-error');
        }

        if (selectedAgencyInfo) {
            selectedAgencyInfo.innerHTML = `<strong>${agency.name}</strong><br><small style="color: var(--color-text-muted); font-size: 0.8rem;">${agency.address}</small>`;
        }
        if (selectedAgencyBadge) {
            selectedAgencyBadge.classList.remove('hidden');
        }

        if (destinationInput) {
            destinationInput.value = `${agency.name} - ${agency.address}`;
            destinationInput.classList.remove('input-error');
        }

        closeShalomSelector();
    }
