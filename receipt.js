// Node DOM Reference Struk
const recId = document.getElementById('rec-id');
const recDate = document.getElementById('rec-date');
const recName = document.getElementById('rec-name');
const recItemsList = document.getElementById('rec-items-list');
const recTotal = document.getElementById('rec-total');

/**
 * Format Angka ke Rupiah
 */
const formatNumber = (num) => {
    const val = parseInt(num) || 0;
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * Load & Render Data Struk
 */
const renderReceiptPage = () => {
    const rawData = localStorage.getItem('kacau_latest_order');
    
    if (!rawData) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const latestOrder = JSON.parse(rawData);

        // Validasi kelengkapan data
        if (!latestOrder || !latestOrder.id) {
            window.location.href = 'index.html';
            return;
        }

        if (recId) recId.textContent = latestOrder.id;
        if (recDate) recDate.textContent = `${latestOrder.date || ''} ${latestOrder.time || ''}`;
        if (recName) recName.textContent = latestOrder.customer || '-';
        if (recTotal) recTotal.textContent = formatNumber(latestOrder.total);

        if (recItemsList) {
            recItemsList.innerHTML = '';
            if (latestOrder.items && Array.isArray(latestOrder.items)) {
                latestOrder.items.forEach(item => {
                    const qty = item.qty || 1;
                    const baseName = item.base || item.name || 'Cincau';
                    const topStr = item.toppings && item.toppings.length > 0 ? ` (+${item.toppings.join(', ')})` : '';
                    const itemTotal = item.total || ((item.unitPrice || 5000) * qty);

                    const row = document.createElement('div');
                    row.style.cssText = 'display: flex; justify-content: space-between; font-size: 0.55rem; color: var(--c-purple); margin-bottom: 6px;';
                    row.innerHTML = `
                        <div style="flex: 1; padding-right: 8px;">${qty}x ${baseName}${topStr}</div>
                        <div>RP ${formatNumber(itemTotal)}</div>
                    `;
                    recItemsList.appendChild(row);
                });
            }
        }
    } catch (e) {
        console.error("Gagal membaca data struk:", e);
        window.location.href = 'index.html';
    }
};

renderReceiptPage();