// Node DOM Reference Struk
const recId = document.getElementById('rec-id');
const recDate = document.getElementById('rec-date');
const recName = document.getElementById('rec-name');
const recItemsList = document.getElementById('rec-items-list');
const recTotal = document.getElementById('rec-total');

/**
 * Format Angka ke Rupiah
 */
const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/**
 * Load & Render Data Struk dari localStorage
 */
const renderReceiptPage = () => {
    const latestOrder = JSON.parse(localStorage.getItem('kacau_latest_order'));
    if (!latestOrder) {
        window.location.href = 'index.html';
        return;
    }

    if (recId) recId.textContent = latestOrder.id;
    if (recDate) recDate.textContent = `${latestOrder.date} ${latestOrder.time}`;
    if (recName) recName.textContent = latestOrder.customer;
    if (recTotal) recTotal.textContent = formatNumber(latestOrder.total);

    if (recItemsList) {
        recItemsList.innerHTML = '';
        latestOrder.items.forEach(item => {
            const qty = item.qty || 1;
            const topStr = item.toppings && item.toppings.length > 0 ? ` (+${item.toppings.join(', ')})` : '';
            const row = document.createElement('div');
            row.className = 'receipt-item-row';
            row.innerHTML = `
                <div style="flex: 1; padding-right: 8px;">${qty}x ${item.base}${topStr}</div>
                <div>RP ${formatNumber(item.total)}</div>
            `;
            recItemsList.appendChild(row);
        });
    }
};

renderReceiptPage();