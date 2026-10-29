const container = document.getElementById('cart-items-container');
const selectAllBar = document.getElementById('select-all-bar');
const selectAllCheckbox = document.getElementById('select-all-checkbox');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');
const grandTotalEl = document.getElementById('cart-grand-total');
const checkedCountEl = document.getElementById('checked-count');
const checkoutBtn = document.getElementById('cart-checkout-btn');

const qrisModal = document.getElementById('cart-qris-modal');
const modalPayTotal = document.getElementById('modal-pay-total');
const buyerNameInput = document.getElementById('buyer-name-input');
const closeQrisBtn = document.getElementById('close-qris-btn');
const confirmPayBtn = document.getElementById('confirm-pay-btn');

const alertModal = document.getElementById('alert-modal');
const alertMessage = document.getElementById('alert-message');
const closeAlertBtn = document.getElementById('close-alert-btn');

const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const showAlert = (msg) => {
    if (alertMessage && alertModal) {
        alertMessage.textContent = msg;
        alertModal.classList.remove('hidden');
        alertModal.classList.add('active');
    }
};

if (closeAlertBtn) {
    closeAlertBtn.addEventListener('click', () => {
        alertModal.classList.add('hidden');
        alertModal.classList.remove('active');
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

const updateTotals = () => {
    const cart = getCartData();
    let total = 0;
    let count = 0;

    cart.forEach(item => {
        if (item.checked) {
            total += item.total;
            count += (item.qty || 1);
        }
    });

    if (grandTotalEl) grandTotalEl.textContent = formatNumber(total);
    if (checkedCountEl) checkedCountEl.textContent = count;

    if (selectAllCheckbox) {
        selectAllCheckbox.checked = cart.length > 0 && cart.every(i => i.checked);
    }
};

window.updateCartItemQty = (index, delta) => {
    let cart = getCartData();
    if (!cart[index]) return;

    let currentQty = cart[index].qty || 1;
    let unitPrice = cart[index].unitPrice || (cart[index].total / currentQty);
    let newQty = currentQty + delta;

    if (newQty < 1) return;

    cart[index].qty = newQty;
    cart[index].unitPrice = unitPrice;
    cart[index].total = unitPrice * newQty;

    saveCartData(cart);
    renderCart();
};

const renderCart = () => {
    const cart = getCartData();
    if (!container) return;
    container.innerHTML = '';

    if (cart.length === 0) {
        if (selectAllBar) selectAllBar.style.display = 'none';
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 10px; background: var(--c-green-light); border: 4px solid var(--c-purple);">
                <p style="font-size: 0.7rem; color: var(--c-purple); margin-bottom: 15px;">KERANJANG KAMU MASIH KOSONG</p>
                <a href="index.html" class="btn btn-invert" style="display: inline-block; padding: 10px 15px; text-decoration: none;">+ PILIH MENU</a>
            </div>
        `;
        updateTotals();
        return;
    }

    if (selectAllBar) selectAllBar.style.display = 'flex';

    cart.forEach((item, index) => {
        const topStr = item.toppings && item.toppings.length > 0 ? item.toppings.join(', ') : '-';
        const card = document.createElement('div');
        card.className = 'cart-item-card';

        card.innerHTML = `
            <label class="custom-checkbox-label">
                <input type="checkbox" class="item-checkbox" data-index="${index}" ${item.checked ? 'checked' : ''}>
                <span class="checkbox-box"></span>
            </label>
            <div class="cart-item-details" style="flex: 1;">
                <div class="cart-item-title">${item.base}</div>
                <div class="cart-item-topping">Topping: ${topStr}</div>
                <div class="cart-item-price">RP ${formatNumber(item.total)}</div>
            </div>
            
            <!-- Tombol Kuantitas di Keranjang -->
            <div class="qty-control" style="margin: 0 10px;">
                <button class="qty-btn" onclick="updateCartItemQty(${index}, -1)">-</button>
                <span class="qty-val">${item.qty || 1}</span>
                <button class="qty-btn" onclick="updateCartItemQty(${index}, 1)">+</button>
            </div>

            <button class="btn-text-danger" onclick="removeSingleItem(${index})">[HAPUS]</button>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.item-checkbox').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.index);
            const currentCart = getCartData();
            currentCart[idx].checked = e.target.checked;
            saveCartData(currentCart);
            updateTotals();
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

        const totalToPay = selectedItems.reduce((sum, item) => sum + item.total, 0);
        modalPayTotal.textContent = formatNumber(totalToPay);
        qrisModal.classList.remove('hidden');
        qrisModal.classList.add('active');
    });
}

if (closeQrisBtn) {
    closeQrisBtn.addEventListener('click', () => {
        qrisModal.classList.add('hidden');
        qrisModal.classList.remove('active');
    });
}

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
        const totalToPay = selectedItems.reduce((sum, item) => sum + item.total, 0);

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

        let orderLog = JSON.parse(localStorage.getItem('kacau_orders')) || [];
        orderLog.push(payload);
        localStorage.setItem('kacau_orders', JSON.stringify(orderLog));

        localStorage.setItem('kacau_latest_order', JSON.stringify(payload));
        saveCartData(remainingItems);

        qrisModal.classList.add('hidden');
        qrisModal.classList.remove('active');
        buyerNameInput.value = '';

        window.location.href = 'receipt.html';
    });
}

renderCart();