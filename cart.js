// Nomor WhatsApp Penjual
const SELLER_WA_NUMBER = "6281233209503";

let activeCartListenerRef = null;
let inventoryStock = { bases: {}, toppings: {} };

// DOM Custom Alert Elements
const alertModal = document.getElementById('alert-modal');
const alertMessage = document.getElementById('alert-message');
const btnCloseAlert = document.getElementById('close-alert-btn');

/**
 * Custom Retro Alert Popup
 */
const showCustomAlert = (pesan) => {
    if (alertMessage && alertModal) {
        alertMessage.textContent = pesan;
        alertModal.classList.remove('hidden');
        alertModal.classList.add('active');
    } else {
        alert(pesan);
    }
};

if (btnCloseAlert) {
    btnCloseAlert.addEventListener('click', () => {
        if (alertModal) {
            alertModal.classList.add('hidden');
            alertModal.classList.remove('active');
        }
    });
}

/**
 * Format Angka ke Rupiah
 */
const formatNumber = (num) => {
    const val = parseInt(num) || 0;
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const getCartData = () => JSON.parse(localStorage.getItem('kacau_cart')) || [];
const saveCartData = (cart) => localStorage.setItem('kacau_cart', JSON.stringify(cart));

/**
 * Helper untuk Mengambil Stok Database (Case-Insensitive & Anti-Typo)
 */
const getStockValue = (categoryObj, targetName) => {
    if (!categoryObj) return 99;
    if (categoryObj[targetName] !== undefined) return categoryObj[targetName];

    const targetLower = targetName.toLowerCase().trim();
    const foundKey = Object.keys(categoryObj).find(k => k.toLowerCase().trim() === targetLower);

    return foundKey !== undefined ? categoryObj[foundKey] : 99;
};

/**
 * Listener Stok Real-time di Halaman Keranjang
 */
const initCartStockListener = () => {
    const updateStockData = (stockData) => {
        inventoryStock = stockData || { bases: {}, toppings: {} };
    };

    if (typeof db !== 'undefined') {
        db.ref('kacau_inventory').on('value', (snapshot) => {
            updateStockData(snapshot.val());
        });
    } else {
        const localStock = JSON.parse(localStorage.getItem('kacau_stock'));
        updateStockData(localStock);
    }
};

/**
 * Generator Pesan WhatsApp Format Lengkap
 */
const generateWALink = (payload) => {
    const itemsText = payload.items.map(item => {
        const topStr = item.toppings && item.toppings.length > 0 ? ` (+ ${item.toppings.join(', ')})` : '';
        return `- ${item.qty}x ${item.base}${topStr}`;
    }).join('\n');

    const messageTemplate = 
`LAMPIRKAN BUKTI PEMBAYARAN!
harap mengisi data berikut.
NAMA: ${payload.customer}
PRODI: ${payload.prodi}

--- DETAIL PESANAN [${payload.id}] ---
${itemsText}
TOTAL: RP ${formatNumber(payload.total)}
-------------------------------------
(Silakan lampirkan foto/screenshot bukti transfer QRIS di bawah pesan ini)`;

    return `https://wa.me/${SELLER_WA_NUMBER}?text=${encodeURIComponent(messageTemplate)}`;
};

/**
 * Auto Increment Order ID (REQ-001, REQ-002, dst.)
 */
const getNextOrderId = () => {
    let maxNum = 0;
    const localActive = JSON.parse(localStorage.getItem('kacau_orders')) || [];
    const localCompleted = JSON.parse(localStorage.getItem('kacau_completed_orders')) || [];
    const allOrders = [...localActive, ...localCompleted];

    allOrders.forEach(ord => {
        if (ord && ord.id) {
            const num = parseInt(ord.id.replace('REQ-', ''), 10) || 0;
            if (num > maxNum) maxNum = num;
        }
    });

    const lastCounter = parseInt(localStorage.getItem('kacau_order_counter'), 10) || 0;
    if (lastCounter > maxNum) maxNum = lastCounter;

    const nextNum = maxNum + 1;
    localStorage.setItem('kacau_order_counter', nextNum);

    return `REQ-${String(nextNum).padStart(3, '0')}`;
};

/**
 * Update Total Kuantitas dan Harga di Bottom Bar Keranjang
 */
const updateCartTotals = () => {
    const cart = getCartData();
    const checkedCountEl = document.getElementById('checked-count');
    const grandTotalEl = document.getElementById('cart-grand-total');
    const selectAllCb = document.getElementById('select-all-checkbox');

    const checkedItems = cart.filter(item => item.checked !== false);
    const totalQty = checkedItems.reduce((sum, item) => sum + (parseInt(item.qty) || 1), 0);
    const totalPrice = checkedItems.reduce((sum, item) => {
        const itemTotal = parseInt(item.total) || ((parseInt(item.unitPrice) || 5000) * (parseInt(item.qty) || 1));
        return sum + itemTotal;
    }, 0);

    if (checkedCountEl) checkedCountEl.textContent = totalQty;
    if (grandTotalEl) grandTotalEl.textContent = formatNumber(totalPrice);

    if (selectAllCb) {
        selectAllCb.checked = cart.length > 0 && checkedItems.length === cart.length;
    }
};

/**
 * Render Daftar Item Keranjang
 */
const renderCart = () => {
    const cartContainer = document.getElementById('cart-items-container');
    if (!cartContainer) return;

    let cart = getCartData();
    cartContainer.innerHTML = '';

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 10px; background: var(--c-yellow); border: 4px solid var(--c-purple); margin-top: 20px;">
                <p style="font-size: 0.65rem; color: var(--c-purple);">KERANJANG KAMU MASIH KOSONG</p>
            </div>
        `;
        updateCartTotals();
        return;
    }

    cart.forEach((item, index) => {
        const itemCard = document.createElement('div');
        itemCard.className = 'cart-card';
        itemCard.style.cssText = 'background: var(--c-yellow); border: 4px solid var(--c-purple); padding: 12px 15px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;';

        const toppingStr = item.toppings && item.toppings.length > 0 ? item.toppings.join(', ') : '-';
        const isChecked = item.checked !== false;
        const currentQty = item.qty || 1;
        const currentTotal = item.total || ((item.unitPrice || 5000) * currentQty);

        itemCard.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <input type="checkbox" class="cart-item-checkbox" data-index="${index}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--c-purple);">
                <div>
                    <div style="font-size: 0.65rem; font-weight: bold; color: var(--c-purple);">${item.base}</div>
                    <div style="font-size: 0.5rem; color: var(--c-purple); margin: 3px 0;">Topping: ${toppingStr}</div>
                    <div style="font-size: 0.6rem; font-weight: bold; color: var(--c-purple);">RP ${formatNumber(currentTotal)}</div>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="display: inline-flex; align-items: center; background: var(--c-purple); border: 2px solid var(--c-purple); height: 28px; padding: 0;">
                    <button class="cart-qty-btn cart-qty-minus" data-index="${index}" style="background: var(--c-purple); color: var(--c-yellow); border: none; font-family: 'Press Start 2P', cursive; font-size: 0.65rem; width: 24px; height: 100%; cursor: pointer;">-</button>
                    <input type="number" class="cart-qty-input" data-index="${index}" value="${currentQty}" min="1" autocomplete="off">
                    <button class="cart-qty-btn cart-qty-plus" data-index="${index}" style="background: var(--c-purple); color: var(--c-yellow); border: none; font-family: 'Press Start 2P', cursive; font-size: 0.65rem; width: 24px; height: 100%; cursor: pointer;">+</button>
                </div>
                <button class="cart-delete-btn" data-index="${index}" style="background: none; border: none; color: #c0392b; font-family: 'Press Start 2P', cursive; font-size: 0.5rem; cursor: pointer;">[HAPUS]</button>
            </div>
        `;
        cartContainer.appendChild(itemCard);
    });

    attachCartEventListeners();
    updateCartTotals();
};

/**
 * Event Listeners untuk Interaksi Item Keranjang
 */
const attachCartEventListeners = () => {
    let cart = getCartData();

    document.querySelectorAll('.cart-item-checkbox').forEach(cb => {
        cb.onchange = (e) => {
            const idx = e.target.dataset.index;
            cart[idx].checked = e.target.checked;
            saveCartData(cart);
            updateCartTotals();
        };
    });

    document.querySelectorAll('.cart-qty-minus').forEach(btn => {
        btn.onclick = (e) => {
            const idx = e.target.dataset.index;
            if (cart[idx].qty > 1) {
                cart[idx].qty--;
                cart[idx].total = (cart[idx].unitPrice || 5000) * cart[idx].qty;
                saveCartData(cart);
                renderCart();
            }
        };
    });

    document.querySelectorAll('.cart-qty-plus').forEach(btn => {
        btn.onclick = (e) => {
            const idx = e.target.dataset.index;
            const item = cart[idx];
            const maxStock = getStockValue(inventoryStock.bases, item.base);

            if (item.qty >= maxStock) {
                showCustomAlert(`Stok ${item.base} cuma sisa ${maxStock} porsi!`);
                return;
            }

            cart[idx].qty++;
            cart[idx].total = (cart[idx].unitPrice || 5000) * cart[idx].qty;
            saveCartData(cart);
            renderCart();
        };
    });

    document.querySelectorAll('.cart-qty-input').forEach(input => {
        input.onfocus = (e) => { e.target.select(); };
        input.oninput = (e) => {
            const idx = e.target.dataset.index;
            const item = cart[idx];
            let val = parseInt(e.target.value);
            if (isNaN(val) || val < 1) val = 1;

            const maxStock = getStockValue(inventoryStock.bases, item.base);

            if (val > maxStock) {
                val = maxStock;
                showCustomAlert(`Stok ${item.base} cuma sisa ${maxStock} porsi!`);
            }

            cart[idx].qty = val;
            cart[idx].total = (cart[idx].unitPrice || 5000) * val;
            saveCartData(cart);
            updateCartTotals();
        };
        input.onblur = (e) => {
            const idx = e.target.dataset.index;
            if (e.target.value === '' || parseInt(e.target.value) < 1) {
                e.target.value = cart[idx].qty;
            }
            renderCart();
        };
    });

    document.querySelectorAll('.cart-delete-btn').forEach(btn => {
        btn.onclick = (e) => {
            const idx = e.target.dataset.index;
            cart.splice(idx, 1);
            saveCartData(cart);
            renderCart();
        };
    });
};

const selectAllCb = document.getElementById('select-all-checkbox');
if (selectAllCb) {
    selectAllCb.onchange = (e) => {
        const isChecked = e.target.checked;
        let cart = getCartData();
        cart.forEach(item => item.checked = isChecked);
        saveCartData(cart);
        renderCart();
    };
}

const deleteSelectedBtn = document.getElementById('delete-selected-btn');
if (deleteSelectedBtn) {
    deleteSelectedBtn.onclick = () => {
        let cart = getCartData();
        cart = cart.filter(item => item.checked === false);
        saveCartData(cart);
        renderCart();
    };
}

// Element Modal QRIS
const cartCheckoutBtn = document.getElementById('cart-checkout-btn');
const cartQrisModal = document.getElementById('cart-qris-modal') || document.getElementById('qris-modal');
const modalPayTotal = document.getElementById('modal-pay-total') || document.getElementById('cart-modal-pay-total');
const closeQrisBtn = document.getElementById('close-qris-btn') || document.getElementById('cart-close-qris-btn');
const confirmPayBtn = document.getElementById('confirm-pay-btn') || document.getElementById('cart-confirm-pay-btn');

/**
 * Listener Real-time Konfirmasi Pembayaran Kasir via Firebase
 */
const listenForSellerConfirmation = (firebaseNodeKey) => {
    if (typeof db === 'undefined') return;

    if (activeCartListenerRef) activeCartListenerRef.off();

    activeCartListenerRef = db.ref(`kacau_orders/${firebaseNodeKey}`);
    activeCartListenerRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && (data.paymentStatus === 'PAID' || data.paymentStatus === 'LUNAS')) {
            activeCartListenerRef.off();

            const waitingStatusBadge = document.getElementById('waiting-status-badge');
            if (waitingStatusBadge) {
                waitingStatusBadge.style.background = '#27ae60';
                waitingStatusBadge.style.color = '#fff';
                waitingStatusBadge.textContent = 'PEMBAYARAN LUNAS! 🟢';
            }

            localStorage.setItem('kacau_latest_order', JSON.stringify(data));

            setTimeout(() => {
                if (cartQrisModal) {
                    cartQrisModal.classList.add('hidden');
                    cartQrisModal.classList.remove('active');
                }
                window.location.href = 'receipt.html';
            }, 1000);
        }
    });
};

/**
 * Buka Modal Checkout Keranjang & Check Stok Porsi
 */
if (cartCheckoutBtn) {
    cartCheckoutBtn.onclick = () => {
        const cart = getCartData();
        const selectedItems = cart.filter(item => item.checked !== false);

        if (selectedItems.length === 0) {
            showCustomAlert('Pilih minimal satu pesanan di keranjang untuk dicheckout!');
            return;
        }

        // Pengecekan Stok Sebelum Buka Modal
        for (let item of selectedItems) {
            const maxStock = getStockValue(inventoryStock.bases, item.base);
            if (item.qty > maxStock) {
                showCustomAlert(`Pesanan ${item.base} berjumlah ${item.qty} melebihi sisa stok (${maxStock}). Kurangi jumlahnya dulu ya!`);
                return;
            }
        }

        const totalToPay = selectedItems.reduce((sum, item) => {
            const qty = item.qty || 1;
            return sum + (item.total || ((item.unitPrice || 5000) * qty));
        }, 0);

        if (modalPayTotal) modalPayTotal.textContent = formatNumber(totalToPay);

        const stepInput = document.getElementById('modal-step-input');
        const stepWaiting = document.getElementById('modal-step-waiting');
        if (stepInput) stepInput.style.display = 'block';
        if (stepWaiting) stepWaiting.style.display = 'none';

        if (cartQrisModal) {
            cartQrisModal.classList.remove('hidden');
            cartQrisModal.classList.add('active');
        }
    };
}

if (closeQrisBtn) {
    closeQrisBtn.onclick = () => {
        if (activeCartListenerRef) activeCartListenerRef.off();
        if (cartQrisModal) {
            cartQrisModal.classList.add('hidden');
            cartQrisModal.classList.remove('active');
        }
    };
}

/**
 * Tombol SUDAH BAYAR di Halaman Keranjang
 */
if (confirmPayBtn) {
    confirmPayBtn.onclick = async () => {
        const nameInput = document.querySelector('#qris-modal #buyer-name') || document.getElementById('buyer-name');
        const prodiInput = document.querySelector('#qris-modal #buyer-prodi') || document.getElementById('buyer-prodi');

        const buyerName = nameInput ? nameInput.value.trim() : '';
        const buyerProdi = prodiInput ? prodiInput.value.trim() : '-';

        if (!buyerName) {
            showCustomAlert('Isi nama kamu dulu ya biar pesanannya nggak ketukar.');
            return;
        }

        let cart = getCartData();
        const selectedItems = cart.filter(item => item.checked !== false);
        const remainingItems = cart.filter(item => item.checked === false);

        if (selectedItems.length === 0) return;

        // Pengecekan ulang stok
        for (let item of selectedItems) {
            const maxStock = getStockValue(inventoryStock.bases, item.base);
            if (item.qty > maxStock) {
                showCustomAlert(`Stok ${item.base} tidak mencukupi (sisa ${maxStock}). Mohon sesuaikan pesanan.`);
                return;
            }
        }

        const totalToPay = selectedItems.reduce((sum, item) => {
            const qty = item.qty || 1;
            return sum + (item.total || ((item.unitPrice || 5000) * qty));
        }, 0);

        const orderId = getNextOrderId();
        const now = new Date();
        const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };

        const payload = {
            id: orderId,
            date: now.toLocaleDateString('id-ID', dateOptions),
            time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            customer: buyerName,
            prodi: buyerProdi,
            items: selectedItems,
            total: totalToPay,
            paymentMethod: 'QRIS GoPay',
            paymentStatus: 'UNPAID'
        };

        // Update Link WhatsApp Kasir dengan Template Pesan Lengkap
        const waConfirmLink = document.getElementById('wa-confirm-link');
        if (waConfirmLink) {
            waConfirmLink.href = generateWALink(payload);
        }

        let localOrders = JSON.parse(localStorage.getItem('kacau_orders')) || [];
        localOrders.push(payload);
        localStorage.setItem('kacau_orders', JSON.stringify(localOrders));
        localStorage.setItem('kacau_latest_order', JSON.stringify(payload));

        // Hapus barang yang dibayar dari keranjang lokal
        saveCartData(remainingItems);
        renderCart();

        const stepInput = document.getElementById('modal-step-input');
        const stepWaiting = document.getElementById('modal-step-waiting');
        const waitingOrderId = document.getElementById('waiting-order-id');
        const waitingStatusBadge = document.getElementById('waiting-status-badge');

        if (stepInput) stepInput.style.display = 'none';
        if (stepWaiting) stepWaiting.style.display = 'block';
        if (waitingOrderId) waitingOrderId.textContent = orderId;
        if (waitingStatusBadge) {
            waitingStatusBadge.style.background = 'var(--c-yellow)';
            waitingStatusBadge.style.color = 'var(--c-purple)';
            waitingStatusBadge.textContent = 'STATUS: MENUNGGU KASIR... ⏳';
        }

        // Simpan ke Firebase DB & Listen Konfirmasi Penjual
        if (typeof db !== 'undefined') {
            const newRef = db.ref('kacau_orders').push();
            payload.firebaseKey = newRef.key;
            await newRef.set(payload);

            listenForSellerConfirmation(newRef.key);
        } else {
            console.error("Firebase DB 'db' tidak terdefinisi.");
        }
    };
}

// Inisialisasi awal
initCartStockListener();
renderCart();