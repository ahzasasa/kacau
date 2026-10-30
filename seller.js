/**
 * KACAU (Statistika Cincau) - Seller Dashboard Logic (seller.js)
 * Real-time synchronization via Firebase Realtime Database with LocalStorage fallback.
 */

// Node DOM References Seller Dashboard
const tabOrdersBtn = document.getElementById('tab-orders-btn');
const tabRekapBtn = document.getElementById('tab-rekap-btn');
const tabOrdersContent = document.getElementById('tab-orders');
const tabRekapContent = document.getElementById('tab-rekap');

const questLogContainer = document.getElementById('quest-log-container');
const omzetEl = document.getElementById('total-omzet');
const totalOrdersCountEl = document.getElementById('total-orders-count');
const btnFormatData = document.getElementById('btn-format-data');

const confirmModal = document.getElementById('confirm-modal');
const cancelConfirmBtn = document.getElementById('cancel-confirm-btn');
const actionConfirmBtn = document.getElementById('action-confirm-btn');

// Master List Produk untuk Analytics Rekap Penjualan
const baseList = ["Original", "Pop Ice Coklat", "Pop Ice Melon", "Pop Ice Strawberry", "Pop Ice Taro", "Pop Ice Vanilla"];
const toppingList = ["Oreo", "Crumble", "Keju", "Meses"];

let activeOrdersList = [];
let completedOrdersList = [];

/**
 * Utility: Format Angka ke Rupiah (Defensif)
 */
const formatNumber = (num) => {
    const val = parseInt(num) || 0;
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * Tab Navigation Handler (Pesanan Masuk vs Rekap Penjualan)
 */
if (tabOrdersBtn && tabRekapBtn) {
    tabOrdersBtn.addEventListener('click', () => {
        tabOrdersBtn.classList.add('active');
        tabRekapBtn.classList.remove('active');
        if (tabOrdersContent) tabOrdersContent.style.display = 'block';
        if (tabRekapContent) tabRekapContent.style.display = 'none';
    });

    tabRekapBtn.addEventListener('click', () => {
        tabRekapBtn.classList.add('active');
        tabOrdersBtn.classList.remove('active');
        if (tabRekapContent) tabRekapContent.style.display = 'block';
        if (tabOrdersContent) tabOrdersContent.style.display = 'none';
        renderRekapStats();
    });
}

/**
 * Load & Real-time Listener Data (Firebase Realtime + LocalStorage Sync)
 */
const initSellerDatabaseListeners = () => {
    const localOrders = JSON.parse(localStorage.getItem('kacau_orders')) || [];

    if (typeof db !== 'undefined') {
        // 1. Listen Antrean Pesanan Aktif dari Cloud Firebase
        db.ref('kacau_orders').on('value', (snapshot) => {
            const data = snapshot.val();
            activeOrdersList = [];

            if (data) {
                Object.keys(data).forEach(key => {
                    activeOrdersList.push({
                        key: key,
                        ...data[key]
                    });
                });
            }

            // Sync LocalStorage orders jika ada transaksi offline yang belum terdorong
            localOrders.forEach(localOrd => {
                const exists = activeOrdersList.some(fOrd => fOrd.id === localOrd.id);
                if (!exists) {
                    activeOrdersList.push(localOrd);
                }
            });

            renderSellerDashboard();
        });

        // 2. Listen Riwayat Pesanan Selesai dari Cloud Firebase
        db.ref('kacau_completed_orders').on('value', (snapshot) => {
            const data = snapshot.val();
            completedOrdersList = [];

            if (data) {
                Object.keys(data).forEach(key => {
                    completedOrdersList.push(data[key]);
                });
            }

            renderRekapStats();
        });
    } else {
        // Fallback jika Firebase offline / belum terinisialisasi
        console.warn("Firebase Database 'db' tidak terdeteksi. Menggunakan mode LocalStorage.");
        activeOrdersList = localOrders;
        completedOrdersList = JSON.parse(localStorage.getItem('kacau_completed_orders')) || [];
        renderSellerDashboard();
        renderRekapStats();
    }
};

/**
 * Render Antrean Pesanan Aktif di Quest Log (FIFO Order)
 */
const renderSellerDashboard = () => {
    if (!questLogContainer) return;
    questLogContainer.innerHTML = '';

    if (activeOrdersList.length === 0) {
        questLogContainer.innerHTML = `
            <div style="text-align: center; padding: 30px 10px; background: var(--c-green-light); border: 4px solid var(--c-purple); margin-top: 15px;">
                <p style="font-size: 0.65rem; color: var(--c-purple);">BELUM ADA PESANAN MASUK</p>
            </div>
        `;
        return;
    }

    activeOrdersList.forEach((order) => {
        const card = document.createElement('div');
        card.style.cssText = 'background: var(--c-yellow); border: 4px solid var(--c-purple); padding: 15px; margin-bottom: 15px; box-shadow: 4px 4px 0 rgba(69, 12, 63, 0.2);';

        let itemsHtml = '';
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const qty = item.qty || 1;
                const baseName = item.base || item.name || '-';
                const topStr = item.toppings && item.toppings.length > 0 ? item.toppings.join(', ') : '-';
                itemsHtml += `
                    <div style="font-size: 0.55rem; color: var(--c-purple); margin-bottom: 8px; line-height: 1.5;">
                        <div><strong>QTY:</strong> ${qty}x</div>
                        <div><strong>BASE:</strong> ${baseName}</div>
                        <div><strong>EXT:</strong> ${topStr}</div>
                    </div>
                `;
            });
        }

        const firebaseKey = order.key || '';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div style="background: var(--c-purple); color: var(--c-yellow); padding: 5px 8px; font-size: 0.65rem; font-weight: bold;">
                    [${order.id || 'REQ-001'}]
                </div>
                <button class="btn btn-invert" onclick="completeOrder('${firebaseKey}', '${order.id}')" style="font-size: 0.55rem; padding: 8px 14px; cursor: pointer;">DONE</button>
            </div>
            
            <div style="font-size: 0.75rem; font-weight: bold; color: var(--c-purple); margin-bottom: 10px;">
                > ${order.customer || 'Pembeli'}
            </div>

            ${itemsHtml}

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 0.65rem; font-weight: bold; color: var(--c-purple); border-top: 2px dashed var(--c-purple); padding-top: 8px;">
                <span style="color: #728c28;">RP ${formatNumber(order.total || 0)}</span>
                <span>${order.time || ''}</span>
            </div>
        `;
        questLogContainer.appendChild(card);
    });
};

/**
 * Render Analytics & Rekap Penjualan (Terurut berdasarkan Frekuensi Descending -> Alfabet A-Z)
 */
const renderRekapStats = () => {
    const totalOmzet = completedOrdersList.reduce((sum, o) => sum + (parseInt(o.total) || 0), 0);
    if (omzetEl) omzetEl.textContent = formatNumber(totalOmzet);
    if (totalOrdersCountEl) totalOrdersCountEl.textContent = completedOrdersList.length;

    const baseCounts = {};
    baseList.forEach(b => baseCounts[b] = 0);

    const toppingCounts = {};
    toppingList.forEach(t => toppingCounts[t] = 0);

    completedOrdersList.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const qty = item.qty || 1;
                if (item.base) {
                    const matchedBase = baseList.find(b => b.toLowerCase() === item.base.toLowerCase()) || item.base;
                    baseCounts[matchedBase] = (baseCounts[matchedBase] || 0) + qty;
                }
                if (item.toppings && Array.isArray(item.toppings)) {
                    item.toppings.forEach(top => {
                        const matchedTop = toppingList.find(t => t.toLowerCase() === top.toLowerCase()) || top;
                        toppingCounts[matchedTop] = (toppingCounts[matchedTop] || 0) + qty;
                    });
                }
            });
        }
    });

    const maxBaseCount = Math.max(...Object.values(baseCounts), 1);
    const maxToppingCount = Math.max(...Object.values(toppingCounts), 1);

    // Sorting Base Varian
    const sortedBases = Object.keys(baseCounts).sort((a, b) => {
        const countDiff = baseCounts[b] - baseCounts[a];
        if (countDiff !== 0) return countDiff;
        return a.replace('Pop Ice ', '').toLowerCase().localeCompare(b.replace('Pop Ice ', '').toLowerCase());
    });

    const baseContainer = document.getElementById('base-rekap-list');
    if (baseContainer) {
        baseContainer.innerHTML = '';
        sortedBases.forEach(name => {
            const count = baseCounts[name];
            const displayName = name.replace('Pop Ice ', '');
            const barWidth = (count / maxBaseCount) * 100;

            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 10px; font-size: 0.55rem; color: var(--c-purple);';
            row.innerHTML = `
                <div style="width: 100px; flex-shrink: 0;">${displayName}</div>
                <div style="flex: 1; height: 18px; border: 3px solid var(--c-purple); background: var(--c-yellow); position: relative; box-sizing: border-box;">
                    <div style="height: 100%; width: ${barWidth}%; background: var(--c-purple); transition: width 0.3s ease;"></div>
                </div>
                <div style="width: 25px; text-align: right; font-weight: bold; font-size: 0.6rem;">${count}</div>
            `;
            baseContainer.appendChild(row);
        });
    }

    // Sorting Topping
    const sortedToppings = Object.keys(toppingCounts).sort((a, b) => {
        const countDiff = toppingCounts[b] - toppingCounts[a];
        if (countDiff !== 0) return countDiff;
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    const toppingContainer = document.getElementById('topping-rekap-list');
    if (toppingContainer) {
        toppingContainer.innerHTML = '';
        sortedToppings.forEach(name => {
            const count = toppingCounts[name];
            const barWidth = (count / maxToppingCount) * 100;

            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 10px; font-size: 0.55rem; color: var(--c-purple);';
            row.innerHTML = `
                <div style="width: 100px; flex-shrink: 0;">${name}</div>
                <div style="flex: 1; height: 18px; border: 3px solid var(--c-purple); background: var(--c-yellow); position: relative; box-sizing: border-box;">
                    <div style="height: 100%; width: ${barWidth}%; background: var(--c-purple); transition: width 0.3s ease;"></div>
                </div>
                <div style="width: 25px; text-align: right; font-weight: bold; font-size: 0.6rem;">${count}</div>
            `;
            toppingContainer.appendChild(row);
        });
    }
};

/**
 * Menyelesaikan Pesanan (Tombol DONE) -> Pindah ke kacau_completed_orders
 */
window.completeOrder = (firebaseKey, orderId) => {
    const targetOrder = activeOrdersList.find(o => (o.key && o.key === firebaseKey) || o.id === orderId);
    if (!targetOrder) return;

    const orderData = { ...targetOrder };
    delete orderData.key;

    // 1. Update Firebase jika ada
    if (typeof db !== 'undefined' && firebaseKey) {
        db.ref('kacau_completed_orders').push(orderData);
        db.ref('kacau_orders/' + firebaseKey).remove();
    }

    // 2. Fallback update LocalStorage
    let localOrders = JSON.parse(localStorage.getItem('kacau_orders')) || [];
    localOrders = localOrders.filter(o => o.id !== orderId);
    localStorage.setItem('kacau_orders', JSON.stringify(localOrders));

    let localCompleted = JSON.parse(localStorage.getItem('kacau_completed_orders')) || [];
    localCompleted.push(orderData);
    localStorage.setItem('kacau_completed_orders', JSON.stringify(localCompleted));

    if (typeof db === 'undefined') {
        activeOrdersList = localOrders;
        completedOrdersList = localCompleted;
        renderSellerDashboard();
        renderRekapStats();
    }
};

/**
 * Modal Confirm & Wipe Database Handler
 */
if (btnFormatData) {
    btnFormatData.addEventListener('click', () => {
        if (confirmModal) {
            confirmModal.classList.remove('hidden');
            confirmModal.classList.add('active');
        }
    });
}

if (cancelConfirmBtn) {
    cancelConfirmBtn.addEventListener('click', () => {
        if (confirmModal) {
            confirmModal.classList.add('hidden');
            confirmModal.classList.remove('active');
        }
    });
}

if (actionConfirmBtn) {
    actionConfirmBtn.addEventListener('click', () => {
        if (typeof db !== 'undefined') {
            db.ref('kacau_orders').remove();
            db.ref('kacau_completed_orders').remove();
        }
        localStorage.removeItem('kacau_orders');
        localStorage.removeItem('kacau_completed_orders');
        localStorage.removeItem('kacau_order_counter');
        
        activeOrdersList = [];
        completedOrdersList = [];

        renderSellerDashboard();
        renderRekapStats();

        if (confirmModal) {
            confirmModal.classList.add('hidden');
            confirmModal.classList.remove('active');
        }
    });
}

// Inisialisasi Listener & Render Utama
initSellerDatabaseListeners();