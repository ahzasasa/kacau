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

// List Produk Resmi (Match 100% dengan index.html, cart.html & script.js)
const baseList = [
    "Original", "Blueberry", "Grape", "Guava", "Mango", 
    "Melon", "Strawberry", "Bubble Gum", "Cookies and Cream", "Chocolate"
];

const toppingList = [
    "Cereal Choco Chips", "Cereal Froot Loops", "Cheese", "Chocolate Sprinkles", "Cookie Crumble"
];

// Default Stock diset 0 untuk seluruh produk
const defaultStock = {
    bases: {
        "Original": 0, "Blueberry": 0, "Grape": 0, "Guava": 0, "Mango": 0,
        "Melon": 0, "Strawberry": 0, "Bubble Gum": 0, "Cookies and Cream": 0, "Chocolate": 0
    },
    toppings: {
        "Cereal Choco Chips": 0, "Cereal Froot Loops": 0, "Cheese": 0, "Chocolate Sprinkles": 0, "Cookie Crumble": 0
    }
};

let activeOrdersList = [];
let completedOrdersList = [];
let currentStock = JSON.parse(JSON.stringify(defaultStock));

/**
 * Format Angka ke Rupiah
 */
const formatNumber = (num) => {
    const val = parseInt(num) || 0;
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * Tab Navigation Handler
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
        renderStockManagementUI();
    });
}

/**
 * Inisialisasi Database (Orders & Stock)
 */
const initSellerDatabaseListeners = () => {
    const localOrders = JSON.parse(localStorage.getItem('kacau_orders')) || [];

    if (typeof db !== 'undefined') {
        // Listener Pesanan Masuk Real-time
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

            localOrders.forEach(localOrd => {
                const exists = activeOrdersList.some(fOrd => fOrd.id === localOrd.id);
                if (!exists) {
                    activeOrdersList.push(localOrd);
                }
            });

            activeOrdersList.sort((a, b) => {
                const numA = parseInt((a.id || '').replace('REQ-', '')) || 0;
                const numB = parseInt((b.id || '').replace('REQ-', '')) || 0;
                return numA - numB;
            });

            renderSellerDashboard();
        });

        // Listener Pesanan Selesai Real-time
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

        // Listener Stok Produk Real-time
        db.ref('kacau_inventory').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.bases && data.toppings) {
                currentStock = data;
            } else {
                db.ref('kacau_inventory').set(defaultStock);
                currentStock = JSON.parse(JSON.stringify(defaultStock));
            }
            localStorage.setItem('kacau_stock', JSON.stringify(currentStock));
            renderStockManagementUI();
        });
    } else {
        // LocalStorage Fallback
        activeOrdersList = localOrders;
        activeOrdersList.sort((a, b) => {
            const numA = parseInt((a.id || '').replace('REQ-', '')) || 0;
            const numB = parseInt((b.id || '').replace('REQ-', '')) || 0;
            return numA - numB;
        });

        completedOrdersList = JSON.parse(localStorage.getItem('kacau_completed_orders')) || [];
        
        const localStock = JSON.parse(localStorage.getItem('kacau_stock'));
        if (localStock && localStock.bases && localStock.toppings) {
            currentStock = localStock;
        } else {
            currentStock = JSON.parse(JSON.stringify(defaultStock));
            localStorage.setItem('kacau_stock', JSON.stringify(currentStock));
        }

        renderSellerDashboard();
        renderRekapStats();
        renderStockManagementUI();
    }
};

/**
 * Render Antrean Pesanan Aktif
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
                const baseName = item.base || item.name || item.title || 'Varian Cincau';
                
                let topStr = '-';
                if (item.toppings && Array.isArray(item.toppings) && item.toppings.length > 0) {
                    topStr = item.toppings.join(', ');
                } else if (typeof item.toppings === 'string' && item.toppings.trim() !== '') {
                    topStr = item.toppings;
                }

                itemsHtml += `
                    <div style="font-size: 0.55rem; color: var(--c-purple); margin-bottom: 8px; line-height: 1.5; background: rgba(255,255,255,0.4); padding: 6px; border: 1px dashed var(--c-purple);">
                        <div><strong>QTY:</strong> ${qty}x</div>
                        <div><strong>BASE:</strong> ${baseName}</div>
                        <div><strong>EXT:</strong> ${topStr}</div>
                    </div>
                `;
            });
        } else {
            itemsHtml = `<div style="font-size: 0.55rem; color: #c0392b;">Detail menu tidak terbaca</div>`;
        }

        const firebaseKey = order.key || '';
        const isPaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'LUNAS';

        const statusBadgeHtml = isPaid
            ? `<span style="background: #27ae60; color: #fff; padding: 3px 6px; font-size: 0.5rem; border: 2px solid var(--c-purple); font-weight: bold;">[LUNAS]</span>`
            : `<span style="background: #e74c3c; color: #fff; padding: 3px 6px; font-size: 0.5rem; border: 2px solid var(--c-purple); font-weight: bold;">[BELUM BAYAR]</span>`;

        const confirmPayBtnHtml = !isPaid
            ? `<button class="btn" onclick="confirmPayment('${firebaseKey}', '${order.id}')" style="font-size: 0.55rem; padding: 6px 10px; cursor: pointer; background: #27ae60; color: #fff;">KONFIRMASI LUNAS</button>`
            : '';

        const customerInfo = order.prodi && order.prodi !== '-' 
            ? `${order.customer || 'Pembeli'} (${order.prodi})` 
            : (order.customer || 'Pembeli');

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 8px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="background: var(--c-purple); color: var(--c-yellow); padding: 5px 8px; font-size: 0.65rem; font-weight: bold;">
                        [${order.id || 'REQ-001'}]
                    </div>
                    ${statusBadgeHtml}
                </div>

                <div style="display: flex; gap: 6px; align-items: center;">
                    ${confirmPayBtnHtml}
                    <button class="btn btn-invert" onclick="completeOrder('${firebaseKey}', '${order.id}')" style="font-size: 0.55rem; padding: 6px 12px; cursor: pointer;">DONE</button>
                </div>
            </div>
            
            <div style="font-size: 0.75rem; font-weight: bold; color: var(--c-purple); margin-bottom: 10px;">
                > ${customerInfo}
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
 * Render Grafik & Rekap Stats
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
                const rawBase = item.base || item.name || item.title;
                if (rawBase) {
                    const matchedBase = baseList.find(b => b.toLowerCase().trim() === rawBase.toLowerCase().trim()) || rawBase;
                    baseCounts[matchedBase] = (baseCounts[matchedBase] || 0) + qty;
                }

                if (item.toppings && Array.isArray(item.toppings)) {
                    item.toppings.forEach(top => {
                        const matchedTop = toppingList.find(t => t.toLowerCase().trim() === top.toLowerCase().trim()) || top;
                        toppingCounts[matchedTop] = (toppingCounts[matchedTop] || 0) + qty;
                    });
                }
            });
        }
    });

    const maxBaseCount = Math.max(...Object.values(baseCounts), 1);
    const maxToppingCount = Math.max(...Object.values(toppingCounts), 1);

    const sortedBases = Object.keys(baseCounts).sort((a, b) => {
        const countDiff = baseCounts[b] - baseCounts[a];
        if (countDiff !== 0) return countDiff;
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    const baseContainer = document.getElementById('base-rekap-list');
    if (baseContainer) {
        baseContainer.innerHTML = '';
        sortedBases.forEach(name => {
            const count = baseCounts[name];
            const barWidth = (count / maxBaseCount) * 100;

            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; gap: 10px; font-size: 0.55rem; color: var(--c-purple); margin-bottom: 6px;';
            row.innerHTML = `
                <div style="width: 110px; flex-shrink: 0; font-weight: bold;">${name}</div>
                <div style="flex: 1; height: 18px; border: 3px solid var(--c-purple); background: var(--c-yellow); position: relative; box-sizing: border-box;">
                    <div style="height: 100%; width: ${barWidth}%; background: var(--c-purple); transition: width 0.3s ease;"></div>
                </div>
                <div style="width: 25px; text-align: right; font-weight: bold; font-size: 0.6rem;">${count}</div>
            `;
            baseContainer.appendChild(row);
        });
    }

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
            row.style.cssText = 'display: flex; align-items: center; gap: 10px; font-size: 0.55rem; color: var(--c-purple); margin-bottom: 6px;';
            row.innerHTML = `
                <div style="width: 110px; flex-shrink: 0; font-weight: bold;">${name}</div>
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
 * Render Input Controls Manajemen Stok (Default 0 & Konsisten)
 */
const renderStockManagementUI = () => {
    const baseStockContainer = document.getElementById('seller-base-stock-list');
    const toppingStockContainer = document.getElementById('seller-topping-stock-list');

    if (!currentStock.bases) currentStock.bases = { ...defaultStock.bases };
    if (!currentStock.toppings) currentStock.toppings = { ...defaultStock.toppings };

    const btnStyle = "background: var(--c-purple); color: var(--c-yellow); border: none; width: 24px; height: 24px; font-family: 'Press Start 2P', cursive; font-size: 0.6rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0;";
    const inputStyle = "width: 45px; height: 24px; text-align: center; border: 2px solid var(--c-purple); font-family: inherit; font-size: 0.6rem; padding: 0; box-sizing: border-box;";

    if (baseStockContainer) {
        baseStockContainer.innerHTML = '';
        baseList.forEach(baseName => {
            const val = currentStock.bases[baseName] !== undefined ? currentStock.bases[baseName] : 0;
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; font-size: 0.55rem; background: #fff; padding: 6px 10px; border: 2px solid var(--c-purple); margin-bottom: 4px;';
            row.innerHTML = `
                <span style="font-weight: bold; color: var(--c-purple);">${baseName}</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button onclick="updateStockItem('bases', '${baseName}', -1)" style="${btnStyle}">-</button>
                    <input type="number" value="${val}" onchange="setStockItem('bases', '${baseName}', this.value)" style="${inputStyle}">
                    <button onclick="updateStockItem('bases', '${baseName}', 1)" style="${btnStyle}">+</button>
                </div>
            `;
            baseStockContainer.appendChild(row);
        });
    }

    if (toppingStockContainer) {
        toppingStockContainer.innerHTML = '';
        toppingList.forEach(topName => {
            const val = currentStock.toppings[topName] !== undefined ? currentStock.toppings[topName] : 0;
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; font-size: 0.55rem; background: #fff; padding: 6px 10px; border: 2px solid var(--c-purple); margin-bottom: 4px;';
            row.innerHTML = `
                <span style="font-weight: bold; color: var(--c-purple);">${topName}</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button onclick="updateStockItem('toppings', '${topName}', -1)" style="${btnStyle}">-</button>
                    <input type="number" value="${val}" onchange="setStockItem('toppings', '${topName}', this.value)" style="${inputStyle}">
                    <button onclick="updateStockItem('toppings', '${topName}', 1)" style="${btnStyle}">+</button>
                </div>
            `;
            toppingStockContainer.appendChild(row);
        });
    }
};

/**
 * Functions Update Stok Manual Dari Input Kasir
 */
window.updateStockItem = (type, itemKey, delta) => {
    const currentVal = currentStock[type][itemKey] !== undefined ? currentStock[type][itemKey] : 0;
    const newVal = Math.max(0, currentVal + delta);
    setStockItem(type, itemKey, newVal);
};

window.setStockItem = (type, itemKey, newVal) => {
    const val = Math.max(0, parseInt(newVal) || 0);
    if (!currentStock[type]) currentStock[type] = {};
    currentStock[type][itemKey] = val;

    if (typeof db !== 'undefined') {
        db.ref(`kacau_inventory/${type}/${itemKey}`).set(val);
    }
    localStorage.setItem('kacau_stock', JSON.stringify(currentStock));
    renderStockManagementUI();
};

/**
 * Pemotongan Stok Produk di Database Saat Pesanan Dikonfirmasi Lunas
 */
const deductStockForOrder = (items) => {
    if (!items || !Array.isArray(items)) return;

    items.forEach(item => {
        const qty = item.qty || 1;
        const rawBase = item.base || item.name || item.title;

        if (rawBase) {
            const matchedBase = baseList.find(b => b.toLowerCase().trim() === rawBase.toLowerCase().trim()) || rawBase;
            if (currentStock.bases && currentStock.bases[matchedBase] !== undefined) {
                currentStock.bases[matchedBase] = Math.max(0, currentStock.bases[matchedBase] - qty);
            }
        }

        if (item.toppings && Array.isArray(item.toppings)) {
            item.toppings.forEach(top => {
                const matchedTop = toppingList.find(t => t.toLowerCase().trim() === top.toLowerCase().trim()) || top;
                if (currentStock.toppings && currentStock.toppings[matchedTop] !== undefined) {
                    currentStock.toppings[matchedTop] = Math.max(0, currentStock.toppings[matchedTop] - qty);
                }
            });
        }
    });

    if (typeof db !== 'undefined') {
        db.ref('kacau_inventory').set(currentStock);
    }
    localStorage.setItem('kacau_stock', JSON.stringify(currentStock));
    renderStockManagementUI();
};

/**
 * Konfirmasi Lunas & Complete Order (LANGSUNG POTONG STOK DI SINI)
 */
window.confirmPayment = (firebaseKey, orderId) => {
    const targetOrder = activeOrdersList.find(o => (o.key && o.key === firebaseKey) || o.id === orderId);

    // 1. Potong Stok Otomatis Saat Tombol Konfirmasi Lunas Diklik
    if (targetOrder && targetOrder.items) {
        deductStockForOrder(targetOrder.items);
    }

    // 2. Update Status Pembayaran di Firebase DB
    if (typeof db !== 'undefined' && firebaseKey) {
        db.ref('kacau_orders/' + firebaseKey).update({
            paymentStatus: 'PAID'
        });
    }

    // 3. Update LocalStorage Status
    let localOrders = JSON.parse(localStorage.getItem('kacau_orders')) || [];
    localOrders = localOrders.map(o => {
        if (o.id === orderId) {
            return { ...o, paymentStatus: 'PAID' };
        }
        return o;
    });
    localStorage.setItem('kacau_orders', JSON.stringify(localOrders));

    if (typeof db === 'undefined') {
        activeOrdersList = localOrders;
        renderSellerDashboard();
    }
};

window.completeOrder = (firebaseKey, orderId) => {
    const targetOrder = activeOrdersList.find(o => (o.key && o.key === firebaseKey) || o.id === orderId);
    if (!targetOrder) return;

    const orderData = { ...targetOrder, paymentStatus: 'PAID' };
    delete orderData.key;

    if (typeof db !== 'undefined' && firebaseKey) {
        db.ref('kacau_completed_orders').push(orderData);
        db.ref('kacau_orders/' + firebaseKey).remove();
    }

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
 * Wipe / Format Data Handler
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
            db.ref('kacau_inventory').set(defaultStock);
        }
        localStorage.removeItem('kacau_orders');
        localStorage.removeItem('kacau_completed_orders');
        localStorage.removeItem('kacau_order_counter');
        localStorage.setItem('kacau_stock', JSON.stringify(defaultStock));
        
        activeOrdersList = [];
        completedOrdersList = [];
        currentStock = JSON.parse(JSON.stringify(defaultStock));

        renderSellerDashboard();
        renderRekapStats();
        renderStockManagementUI();

        if (confirmModal) {
            confirmModal.classList.add('hidden');
            confirmModal.classList.remove('active');
        }
    });
}

// Inisialisasi Utama
initSellerDatabaseListeners();