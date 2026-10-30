/**
 * KACAU (Statistika Cincau) - Cart Logic (cart.js)
 */

const formatNumber = (num) => {
    const val = parseInt(num) || 0;
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const getCartData = () => {
    return JSON.parse(localStorage.getItem('kacau_cart')) || [];
};

const saveCartData = (cart) => {
    localStorage.setItem('kacau_cart', JSON.stringify(cart));
};

/**
 * Update Total Harga & Sinkronkan Checkbox PILIH SEMUA
 */
const updateCartTotals = () => {
    const cart = getCartData();
    const checkedCountEl = document.getElementById('checked-count');
    const grandTotalEl = document.getElementById('cart-grand-total');
    const selectAllCb = document.getElementById('select-all-checkbox');

    // Filter item yang dicentang
    const checkedItems = cart.filter(item => item.checked !== false);

    // Hitung total item & total harga
    const totalQty = checkedItems.reduce((sum, item) => sum + (parseInt(item.qty) || 1), 0);
    const totalPrice = checkedItems.reduce((sum, item) => {
        const itemTotal = parseInt(item.total) || ((parseInt(item.unitPrice) || 5000) * (parseInt(item.qty) || 1));
        return sum + itemTotal;
    }, 0);

    if (checkedCountEl) checkedCountEl.textContent = totalQty;
    if (grandTotalEl) grandTotalEl.textContent = formatNumber(totalPrice);

    // Otomatis centang PILIH SEMUA jika semua item di keranjang tercentang
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
 * Event Listener Item di Cart
 */
const attachCartEventListeners = () => {
    let cart = getCartData();

    // 1. Checkbox Per Item
    document.querySelectorAll('.cart-item-checkbox').forEach(cb => {
        cb.onchange = (e) => {
            const idx = e.target.dataset.index;
            cart[idx].checked = e.target.checked;
            saveCartData(cart);
            updateCartTotals();
        };
    });

    // 2. Tombol Minus (-)
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

    // 3. Tombol Plus (+)
    document.querySelectorAll('.cart-qty-plus').forEach(btn => {
        btn.onclick = (e) => {
            const idx = e.target.dataset.index;
            cart[idx].qty = (cart[idx].qty || 1) + 1;
            cart[idx].total = (cart[idx].unitPrice || 5000) * cart[idx].qty;
            saveCartData(cart);
            renderCart();
        };
    });

    // 4. Input Ketik Kuantitas
    document.querySelectorAll('.cart-qty-input').forEach(input => {
        input.onfocus = (e) => {
            e.target.select();
        };

        input.oninput = (e) => {
            const idx = e.target.dataset.index;
            let val = parseInt(e.target.value);

            if (isNaN(val) || val < 1) {
                val = 1;
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

    // 5. Tombol Hapus Single Item
    document.querySelectorAll('.cart-delete-btn').forEach(btn => {
        btn.onclick = (e) => {
            const idx = e.target.dataset.index;
            cart.splice(idx, 1);
            saveCartData(cart);
            renderCart();
        };
    });
};

// Checkbox "PILIH SEMUA"
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

// Tombol "HAPUS TERPILIH"
const deleteSelectedBtn = document.getElementById('delete-selected-btn');
if (deleteSelectedBtn) {
    deleteSelectedBtn.onclick = () => {
        let cart = getCartData();
        cart = cart.filter(item => item.checked === false);
        saveCartData(cart);
        renderCart();
    };
}

/**
 * Helper: Generate Order ID (REQ-001, REQ-002, dst.)
 */
const getNextOrderId = () => {
    let counter = parseInt(localStorage.getItem('kacau_order_counter')) || 0;
    counter++;
    localStorage.setItem('kacau_order_counter', counter);
    return `REQ-${String(counter).padStart(3, '0')}`;
};

// DOM Modal QRIS Keranjang
const cartCheckoutBtn = document.getElementById('cart-checkout-btn');
const cartQrisModal = document.getElementById('cart-qris-modal') || document.getElementById('qris-modal');
const modalPayTotal = document.getElementById('modal-pay-total') || document.getElementById('cart-modal-pay-total');
const buyerNameInput = document.getElementById('buyer-name-input') || document.getElementById('cart-buyer-name-input');
const closeQrisBtn = document.getElementById('close-qris-btn') || document.getElementById('cart-close-qris-btn');
const confirmPayBtn = document.getElementById('confirm-pay-btn') || document.getElementById('cart-confirm-pay-btn');

/**
 * 1. KLIK TOMBOL CHECKOUT -> Buka Modal QRIS
 */
if (cartCheckoutBtn) {
    cartCheckoutBtn.onclick = () => {
        const cart = getCartData();
        const selectedItems = cart.filter(item => item.checked !== false);

        if (selectedItems.length === 0) {
            alert('Pilih minimal satu pesanan di keranjang untuk dicheckout!');
            return;
        }

        const totalToPay = selectedItems.reduce((sum, item) => {
            const qty = item.qty || 1;
            return sum + (item.total || ((item.unitPrice || 5000) * qty));
        }, 0);

        if (modalPayTotal) {
            modalPayTotal.textContent = formatNumber(totalToPay);
        }

        if (cartQrisModal) {
            cartQrisModal.classList.remove('hidden');
            cartQrisModal.classList.add('active');
        }
    };
}

/**
 * 2. TUTUP MODAL QRIS
 */
if (closeQrisBtn) {
    closeQrisBtn.onclick = () => {
        if (cartQrisModal) {
            cartQrisModal.classList.add('hidden');
            cartQrisModal.classList.remove('active');
        }
    };
}

/**
 * 3. KLIK SELESAI BAYAR -> Push ke Firebase & Redirect Receipt
 */
if (confirmPayBtn) {
    confirmPayBtn.onclick = () => {
        const buyerName = buyerNameInput ? buyerNameInput.value.trim() : '';

        if (!buyerName) {
            alert('Isi nama kamu dulu ya biar pesanannya nggak ketukar.');
            return;
        }

        let cart = getCartData();
        const selectedItems = cart.filter(item => item.checked !== false);
        const remainingItems = cart.filter(item => item.checked === false);

        if (selectedItems.length === 0) return;

        const totalToPay = selectedItems.reduce((sum, item) => {
            const qty = item.qty || 1;
            return sum + (item.total || ((item.unitPrice || 5000) * qty));
        }, 0);

        const now = new Date();
        const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };

        const payload = {
            id: getNextOrderId(),
            date: now.toLocaleDateString('id-ID', dateOptions),
            time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            customer: buyerName,
            items: selectedItems,
            total: totalToPay
        };

        // Simpan transaksi terbaru & sisa item keranjang yang belum dicentang
        localStorage.setItem('kacau_latest_order', JSON.stringify(payload));
        saveCartData(remainingItems);

        confirmPayBtn.disabled = true;
        confirmPayBtn.textContent = 'MEMPROSES...';

        const navigateToReceipt = () => {
            if (cartQrisModal) {
                cartQrisModal.classList.add('hidden');
                cartQrisModal.classList.remove('active');
            }
            if (buyerNameInput) buyerNameInput.value = '';
            confirmPayBtn.disabled = false;
            confirmPayBtn.textContent = 'SELESAI BAYAR';
            window.location.href = 'receipt.html';
        };

        // Push Async ke Firebase Realtime Database
        if (typeof db !== 'undefined') {
            db.ref('kacau_orders').push(payload)
                .then(() => {
                    navigateToReceipt();
                })
                .catch((error) => {
                    console.error("Gagal push ke Firebase:", error);
                    navigateToReceipt();
                });
        } else {
            console.error("Firebase Database 'db' tidak terdefinisi.");
            navigateToReceipt();
        }
    };
}

// Inisialisasi Render
renderCart();