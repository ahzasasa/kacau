// Node DOM References Keranjang
const container = document.getElementById('cart-items-container');
const selectAllBar = document.getElementById('select-all-bar');
const selectAllCheckbox = document.getElementById('select-all-checkbox');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');
const grandTotalEl = document.getElementById('cart-grand-total');
const checkedCountEl = document.getElementById('checked-count');
const checkoutBtn = document.getElementById('cart-checkout-btn');

// Modal Elements
const qrisModal = document.getElementById('cart-qris-modal');
const modalPayTotal = document.getElementById('modal-pay-total');
const buyerNameInput = document.getElementById('buyer-name-input');
const closeQrisBtn = document.getElementById('close-qris-btn');
const confirmPayBtn = document.getElementById('confirm-pay-btn');

const alertModal = document.getElementById('alert-modal');
const alertMessage = document.getElementById('alert-message');
const closeAlertBtn = document.getElementById('close-alert-btn');

/**
 * Format Angka ke Rupiah
 */
const formatNumber = (num) => {
    const val = parseInt(num) || 0;
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const showAlert = (msg) => {
    if (alertMessage && alertModal) {
        alertMessage.textContent = msg;
        alertModal.classList.remove('hidden');
        alertModal.classList.add('active');
    }
};

if (closeAlertBtn) {
    closeAlertBtn.addEventListener('click', () => {
        if (alertModal) {
            alertModal.classList.add('hidden');
            alertModal.classList.remove('active');
        }
    });
}

const getNextOrderId = () => {
    let currentCounter = parseInt(localStorage.getItem('kacau_order_counter')) || 0;
    currentCounter += 1;
    localStorage.setItem('kacau_order_counter', currentCounter);
    return 'REQ-' + String(currentCounter).padStart(3, '0');
};

const getCartData = () => JSON.parse(localStorage.getItem('kacau_cart')) || [];
const saveCartData = (data) => localStorage.setItem('kacau_cart', JSON.stringify(data));

/**
 * Update Total Harga & Jumlah Pesanan Tercentang
 */
const updateTotals = () => {
    const cart = getCartData();
    let total = 0;
    let count = 0;

    cart.forEach(item => {
        if (item.checked) {
            const qty = item.qty || 1;
            const itemTotal = item.total || ((item.unitPrice || 5000) * qty);
            total += itemTotal;
            count += qty;
        }
    });

    if (grandTotalEl) grandTotalEl.textContent = formatNumber(total);
    if (checkedCountEl) checkedCountEl.textContent = count;

    if (selectAllCheckbox) {
        selectAllCheckbox.checked = cart.length > 0 && cart.every(i => i.checked);
    }
};

/**
 * Ubah Kuantitas Item (- [N] +)
 */
window.updateCartItemQty = (index, delta) => {
    let cart = getCartData();
    if (!cart[index]) return;

    let currentQty = cart[index].qty || 1;
    let unitPrice = cart[index].unitPrice || (cart[index].total / currentQty) || 5000;
    let newQty = currentQty + delta;

    if (newQty < 1) return;

    cart[index].qty = newQty;
    cart[index].unitPrice = unitPrice;
    cart[index].total = unitPrice * newQty;

    saveCartData(cart);
    renderCart();
};

/**
 * Render Kartu Pesanan di Keranjang
 */
const renderCart = () => {
    const cart = getCartData();
    if (!container) return;
    container.innerHTML = '';

    if (cart.length === 0) {
        if (selectAllBar) selectAllBar.style.display = 'none';
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 10px; background: var(--c-green-light); border: 4px solid var(--c-purple);">
                <p style="font-size: 0.65rem; color: var(--c-purple); margin-bottom: 15px;">KERANJANG KAMU MASIH KOSONG</p>
                <a href="index.html" class="btn btn-invert" style="display: inline-block; padding: 10px 15px; text-decoration: none; font-size: 0.6rem;">+ PILIH MENU</a>
            </div>
        `;
        updateTotals();
        return;
    }

    if (selectAllBar) selectAllBar.style.display = 'flex';

    cart.forEach((item, index) => {
        const qty = item.qty || 1;
        const totalToDisplay = item.total || ((item.unitPrice || 5000) * qty);
        const topStr = item.toppings && item.toppings.length > 0 ? item.toppings.join(', ') : '-';

        const card = document.createElement('div');
        card.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: var(--c-yellow); border: 3px solid var(--c-purple); padding: 12px; margin-bottom: 12px; box-shadow: 3px 3px 0 rgba(69, 12, 63, 0.2); gap: 10px; flex-wrap: wrap;';

        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 140px;">
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" class="item-checkbox" data-index="${index}" ${item.checked ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--c-purple);">
                </label>

                <div>
                    <div style="font-size: 0.65rem; font-weight: bold; color: var(--c-purple); margin-bottom: 4px;">${item.base}</div>
                    <div style="font-size: 0.5rem; color: var(--c-purple); opacity: 0.8; margin-bottom: 6px;">Topping: ${topStr}</div>
                    <div style="font-size: 0.6rem; font-weight: bold; color: var(--c-purple);">RP ${formatNumber(totalToDisplay)}</div>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px; margin-left: auto;">
                <div class="qty-control" style="display: inline-flex; align-items: center; border: 2px solid var(--c-purple); background: var(--c-green-light);">
                    <button onclick="updateCartItemQty(${index}, -1)" style="background: var(--c-purple); color: var(--c-yellow); border: none; font-family: 'Press Start 2P', cursive; font-size: 0.6rem; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;">-</button>
                    <span style="font-family: 'Press Start 2P', cursive; font-size: 0.55rem; color: var(--c-purple); padding: 0 6px; min-width: 18px; text-align: center;">${qty}</span>
                    <button onclick="updateCartItemQty(${index}, 1)" style="background: var(--c-purple); color: var(--c-yellow); border: none; font-family: 'Press Start 2P', cursive; font-size: 0.6rem; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
                </div>

                <button onclick="removeSingleItem(${index})" style="background: none; border: none; font-family: 'Press Start 2P', cursive; font-size: 0.5rem; color: #c0392b; cursor: pointer; padding: 4px;">[HAPUS]</button>
            </div>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.item-checkbox').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            const currentCart = getCartData();
            if (currentCart[idx]) {
                currentCart[idx].checked = e.target.checked;
                saveCartData(currentCart);
                updateTotals();
            }
        });
    });

    updateTotals();
};

window.removeSingleItem = (index) => {
    let cart = getCartData();
    cart.splice(index, 1);
    saveCartData(cart);
    renderCart();
};

if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
        let cart = getCartData();
        cart.forEach(item => item.checked = e.target.checked);
        saveCartData(cart);
        renderCart();
    });
}

if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', () => {
        let cart = getCartData();
        const hasChecked = cart.some(i => i.checked);

        if (!hasChecked) {
            showAlert('Pilih minimal satu pesanan yang ingin dihapus.');
            return;
        }

        cart = cart.filter(i => !i.checked);
        saveCartData(cart);
        renderCart();
    });
}

if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        const cart = getCartData();
        const selectedItems = cart.filter(i => i.checked);

        if (selectedItems.length === 0) {
            showAlert('Centang minimal satu pesanan yang mau di-checkout!');
            return;
        }

        const totalToPay = selectedItems.reduce((sum, item) => {
            const qty = item.qty || 1;
            return sum + (item.total || ((item.unitPrice || 5000) * qty));
        }, 0);

        if (modalPayTotal) modalPayTotal.textContent = formatNumber(totalToPay);
        
        if (qrisModal) {
            qrisModal.classList.remove('hidden');
            qrisModal.classList.add('active');
        }
    });
}

if (closeQrisBtn) {
    closeQrisBtn.addEventListener('click', () => {
        if (qrisModal) {
            qrisModal.classList.add('hidden');
            qrisModal.classList.remove('active');
        }
    });
}

/**
 * Konfirmasi Bayar & Push ke Firebase Realtime Database
 */
if (confirmPayBtn) {
    confirmPayBtn.addEventListener('click', () => {
        const buyerName = buyerNameInput ? buyerNameInput.value.trim() : '';

        if (!buyerName) {
            showAlert('Isi nama kamu dulu ya biar pesanannya nggak ketukar.');
            return;
        }

        let cart = getCartData();
        const selectedItems = cart.filter(i => i.checked);
        const remainingItems = cart.filter(i => !i.checked);
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

        // Simpan order terbaru di localStorage & sisa keranjang
        localStorage.setItem('kacau_latest_order', JSON.stringify(payload));
        saveCartData(remainingItems);

        // Ubah status tombol saat mengirim data
        confirmPayBtn.disabled = true;
        confirmPayBtn.textContent = 'MEMPROSES...';

        const navigateToReceipt = () => {
            if (qrisModal) {
                qrisModal.classList.add('hidden');
                qrisModal.classList.remove('active');
            }
            if (buyerNameInput) buyerNameInput.value = '';
            confirmPayBtn.disabled = false;
            confirmPayBtn.textContent = 'SELESAI BAYAR';
            window.location.href = 'receipt.html';
        };

        // Kirim ke Firebase lalu redirect setelah BERHASIL
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
            console.error("Firebase Database 'db' belum terdefinisi.");
            navigateToReceipt();
        }
    });
}

renderCart();