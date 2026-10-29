const container = document.getElementById('order-container');
const btnClear = document.getElementById('clear-all-btn');

// selector tab navigation
const tabOrdersBtn = document.getElementById('tab-orders-btn');
const tabStatsBtn = document.getElementById('tab-stats-btn');
const tabOrdersContent = document.getElementById('tab-orders');
const tabStatsContent = document.getElementById('tab-stats');

// selector custom confirm modal
const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const btnYesConfirm = document.getElementById('btn-yes-confirm');
const btnCancelConfirm = document.getElementById('btn-cancel-confirm');

// daftar varian dan topping
const ALL_VARIANTS = [
    'Original',
    'Coklat',
    'Strawberry',
    'Melon',
    'Vanilla',
    'Taro'
];

const ALL_TOPPINGS = [
    'Oreo',
    'Crumble',
    'Meses',
    'Keju'
];

let onConfirmAction = null;

// --- switch tab handler
tabOrdersBtn.addEventListener('click', () => {
    tabOrdersBtn.classList.add('active');
    tabStatsBtn.classList.remove('active');
    tabOrdersContent.classList.add('active');
    tabStatsContent.classList.remove('active');
});

tabStatsBtn.addEventListener('click', () => {
    tabStatsBtn.classList.add('active');
    tabOrdersBtn.classList.remove('active');
    tabStatsContent.classList.add('active');
    tabOrdersContent.classList.remove('active');
    renderStats();
});

// custom confirm modal helper
const showCustomConfirm = (pesan, action) => {
    confirmMessage.textContent = pesan;
    onConfirmAction = action;
    confirmModal.classList.add('active');
};

btnYesConfirm.addEventListener('click', () => {
    if (onConfirmAction) onConfirmAction();
    confirmModal.classList.remove('active');
});

btnCancelConfirm.addEventListener('click', () => {
    confirmModal.classList.remove('active');
});

// render pesanan masuk
const renderBoard = () => {
    const logs = JSON.parse(localStorage.getItem('kacau_orders')) || [];
    container.innerHTML = '';

    if (logs.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px;">NO ACTIVE DATA</div>';
        return;
    }

    logs.slice().reverse().forEach(log => {
        const card = document.createElement('div');
        card.className = 'quest-card';
        card.innerHTML = `
            <div class="quest-data">
                <div style="background: var(--c-purple); color: var(--c-yellow); padding: 5px; display: inline-block;">[${log.id}]</div>
                <div style="margin-top: 15px; font-weight: bold; color: var(--c-purple); font-size: 0.9rem;">> ${log.customer}</div>
                <div style="margin-top: 5px;">BASE: ${log.base}</div>
                <div>EXT: ${log.toppings}</div>
                <div style="color: var(--c-green-dark); margin-top: 10px; font-weight: bold;">RP ${log.total.toLocaleString('id-ID')} | ${log.time}</div>
            </div>
            <button class="btn btn-invert" style="padding: 15px;" onclick="resolveQuest('${log.id}')">DONE</button>
        `;
        container.appendChild(card);
    });
};

// render diagram batang
const renderBarChart = (targetElId, dataMap) => {
    const containerEl = document.getElementById(targetElId);
    containerEl.innerHTML = '';

    const entries = Object.entries(dataMap);
    if (entries.length === 0) {
        containerEl.innerHTML = '<div style="font-size: 0.6rem; color: var(--c-purple); padding: 10px 0;">BELUM ADA DATA</div>';
        return;
    }

    entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    const maxVal = Math.max(...Object.values(dataMap), 1);

    entries.forEach(([label, count]) => {
        const percentage = (count / maxVal) * 100;
        const barRow = document.createElement('div');
        barRow.className = 'bar-item';
        barRow.innerHTML = `
            <div class="bar-label" title="${label}">${label}</div>
            <div class="bar-track">
                <div class="bar-fill" style="width: ${percentage}%;"></div>
            </div>
            <div class="bar-count">${count}</div>
        `;
        containerEl.appendChild(barRow);
    });
};

// render omzet dan data statistik
const renderStats = () => {
    const history = JSON.parse(localStorage.getItem('kacau_history')) || [];

    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const todayStr = new Date().toLocaleDateString('id-ID', dateOptions);

    const statDateEl = document.getElementById('stat-date');
    if (statDateEl) {
        statDateEl.textContent = `TANGGAL: ${todayStr}`;
    }
    
    let totalOmzet = 0;

    let variantCount = {};
    ALL_VARIANTS.forEach(v => variantCount[v] = 0);

    let toppingCount = {};
    ALL_TOPPINGS.forEach(t => toppingCount[t] = 0);

    const todayHistory = history.filter(order => {
        return order.date ? order.date === todayStr : true;
    });

    todayHistory.forEach(order => {
        totalOmzet += order.total;
        
        if (order.base && variantCount.hasOwnProperty(order.base)) {
            variantCount[order.base] += 1;
        } else if (order.base) {
            variantCount[order.base] = (variantCount[order.base] || 0) + 1;
        }

        if (order.toppings && order.toppings !== '-') {
            const arrToppings = order.toppings.split(', ');
            arrToppings.forEach(t => {
                if (toppingCount.hasOwnProperty(t)) {
                    toppingCount[t] += 1;
                } else {
                    toppingCount[t] = (toppingCount[t] || 0) + 1;
                }
            });
        }
    });

    document.getElementById('stat-omzet').textContent = totalOmzet.toLocaleString('id-ID');
    
    renderBarChart('chart-varian-list', variantCount);
    renderBarChart('chart-topping-list', toppingCount);
};

// selesaikan pesanan
window.resolveQuest = (id) => {
    let logs = JSON.parse(localStorage.getItem('kacau_orders')) || [];
    const targetOrder = logs.find(item => item.id === id);
    
    if (targetOrder) {
        let history = JSON.parse(localStorage.getItem('kacau_history')) || [];
        history.push(targetOrder);
        localStorage.setItem('kacau_history', JSON.stringify(history));
    }

    logs = logs.filter(item => item.id !== id);
    localStorage.setItem('kacau_orders', JSON.stringify(logs));
    
    renderBoard();
    renderStats();
};

// reset data
btnClear.addEventListener('click', () => {
    showCustomConfirm('Yakin reset DB? Data antrean aktif dan riwayat omzet akan di-wipe.', () => {
        localStorage.removeItem('kacau_orders');
        localStorage.removeItem('kacau_history');
        renderBoard();
        renderStats();
    });
});

window.addEventListener('click', (e) => {
    if (e.target === confirmModal) confirmModal.classList.remove('active');
});

window.addEventListener('storage', (e) => {
    if (e.key === 'kacau_orders' || e.key === 'kacau_history') {
        renderBoard();
        renderStats();
    }
});

renderBoard();
renderStats();