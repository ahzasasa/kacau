// State pilihan racikan 1 cup aktif di index.html
let currentSelection = { base: null, price: 0, node: null };
let currentToppings = new Map();
let currentQty = 0; // Default kuantitas 0
let directCheckoutCup = null;

// Node DOM Reference
const domTotal = document.getElementById('total-price');
const domCartCount = document.getElementById('cart-count');
const addToCartBtn = document.getElementById('add-to-cart-btn');
const checkoutBtn = document.getElementById('checkout-btn');
const cartIconBtn = document.querySelector('.cart-icon');

// Kuantitas DOM
const qtyMinusBtn = document.getElementById('qty-minus');
const qtyPlusBtn = document.getElementById('qty-plus');
const qtyValEl = document.getElementById('qty-val');

// Custom Alert Elements
const alertModal = document.getElementById('alert-modal');
const alertMessage = document.getElementById('alert-message');
const btnCloseAlert = document.getElementById('close-alert-btn');

// Modal QRIS Elements
const qrisModal = document.getElementById('qris-modal');
const modalPayTotal = document.getElementById('modal-pay-total');
const buyerNameInput = document.getElementById('buyer-name-input');
const closeQrisBtn = document.getElementById('close-qris-btn');
const confirmPayBtn = document.getElementById('confirm-pay-btn');

const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const showCustomAlert = (pesan) => {
    if (alertMessage && alertModal) {
        alertMessage.textContent = pesan;
        alertModal.classList.remove('hidden');
        alertModal.classList.add('active');
    }
};

const getNextOrderId = () => {
    let currentCounter = parseInt(localStorage.getItem('kacau_order_counter')) || 0;
    currentCounter += 1;
    localStorage.setItem('kacau_order_counter', currentCounter);
    return 'REQ-' + String(currentCounter).padStart(3, '0');
};

/**
 * Akumulasi harga (Base + Topping) x Kuantitas
 */
const calculateActiveCupTotal = () => {
    if (!currentSelection.base || currentQty === 0) return 0;
    let toppingSum = 0;
    currentToppings.forEach(price => toppingSum += price);
    return (currentSelection.price + toppingSum) * currentQty;
};

const updateSummaryUI = () => {
    const activeTotal = calculateActiveCupTotal();
    if (domTotal) domTotal.textContent = formatNumber(activeTotal);
    
    const cart = JSON.parse(localStorage.getItem('kacau_cart')) || [];
    if (domCartCount) domCartCount.textContent = cart.length;
};

const resetSelection = () => {
    currentSelection = { base: null, price: 0, node: null };
    currentToppings.clear();
    currentQty = 0;
    if (qtyValEl) qtyValEl.textContent = '0';
    directCheckoutCup = null;
    
    document.querySelectorAll('.select-btn').forEach(btn => {
        btn.classList.remove('active-state');
        btn.textContent = btn.closest('.card').dataset.type === 'base' ? 'PILIH' : 'TAMBAH';
    });
    
    updateSummaryUI();
};

// Listener Tombol Kuantitas
if (qtyMinusBtn) {
    qtyMinusBtn.addEventListener('click', () => {
        if (currentQty > 0) {
            currentQty--;
            if (qtyValEl) qtyValEl.textContent = currentQty;
            updateSummaryUI();
        }
    });
}

if (qtyPlusBtn) {
    qtyPlusBtn.addEventListener('click', () => {
        currentQty++;
        if (qtyValEl) qtyValEl.textContent = currentQty;
        updateSummaryUI();
    });
}

// Listener Kartu Menu
document.querySelectorAll('.card').forEach(card => {
    const btn = card.querySelector('.select-btn');
    if (!btn) return;

    const type = card.dataset.type;
    const price = parseInt(card.dataset.price);
    const name = card.dataset.name;

    btn.addEventListener('click', () => {
        if (type === 'base') {
            if (currentSelection.node && currentSelection.node !== btn) {
                currentSelection.node.classList.remove('active-state');
                currentSelection.node.textContent = 'PILIH';
            }

            if (btn.classList.contains('active-state')) {
                btn.classList.remove('active-state');
                btn.textContent = 'PILIH';
                currentSelection = { base: null, price: 0, node: null };
                currentQty = 0;
                if (qtyValEl) qtyValEl.textContent = '0';
            } else {
                btn.classList.add('active-state');
                btn.textContent = 'TERPILIH';
                currentSelection = { base: name, price: price, node: btn };
                // Otomatis set ke 1 jika sebelumnya 0
                if (currentQty === 0) {
                    currentQty = 1;
                    if (qtyValEl) qtyValEl.textContent = '1';
                }
            }
        } else if (type === 'topping') {
            if (currentToppings.has(name)) {
                currentToppings.delete(name);
                btn.classList.remove('active-state');
                btn.textContent = 'TAMBAH';
            } else {
                currentToppings.set(name, price);
                btn.classList.add('active-state');
                btn.textContent = 'TERPILIH';
            }
        }
        updateSummaryUI();
    });
});

/**
 * Simpan ke localStorage
 */
const addCurrentToCart = () => {
    if (!currentSelection.base) return false;

    const toppingsArr = Array.from(currentToppings.keys()).sort();
    let toppingSum = 0;
    currentToppings.forEach(p => toppingSum += p);
    const unitPrice = currentSelection.price + toppingSum;

    let cart = JSON.parse(localStorage.getItem('kacau_cart')) || [];

    const existingIndex = cart.findIndex(item => {
        if (item.base !== currentSelection.base) return false;
        const itemToppings = (item.toppings || []).slice().sort();
        if (itemToppings.length !== toppingsArr.length) return false;
        return itemToppings.every((top, idx) => top === toppingsArr[idx]);
    });

    if (existingIndex !== -1) {
        const existingItem = cart[existingIndex];
        const newQty = (existingItem.qty || 1) + currentQty;
        existingItem.qty = newQty;
        existingItem.unitPrice = unitPrice;
        existingItem.total = unitPrice * newQty;
    } else {
        const newItem = {
            id: Date.now() + Math.random(),
            base: currentSelection.base,
            toppings: toppingsArr,
            qty: currentQty,
            unitPrice: unitPrice,
            total: unitPrice * currentQty,
            checked: false
        };
        cart.push(newItem);
    }

    localStorage.setItem('kacau_cart', JSON.stringify(cart));
    resetSelection();
    return true;
};

if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
        if (!currentSelection.base) {
            showCustomAlert('Pilih varian rasa utamanya dulu ya.');
            return;
        }

        if (currentQty <= 0) {
            showCustomAlert('Tambahkan kuantitas pesanan minimal 1.');
            return;
        }

        addCurrentToCart();

        addToCartBtn.classList.add('btn-shake');
        setTimeout(() => addToCartBtn.classList.remove('btn-shake'), 200);

        if (cartIconBtn) {
            cartIconBtn.classList.add('cart-pop');
            setTimeout(() => cartIconBtn.classList.remove('cart-pop'), 300);
        }

        showCustomAlert('Pesanan berhasil dimasukkan ke keranjang!');
    });
}

if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (!currentSelection.base) {
            showCustomAlert('Pilih varian rasa utamanya dulu ya untuk checkout langsung!');
            return;
        }

        if (currentQty <= 0) {
            showCustomAlert('Tambahkan kuantitas pesanan minimal 1.');
            return;
        }

        let toppingSum = 0;
        currentToppings.forEach(p => toppingSum += p);
        const unitPrice = currentSelection.price + toppingSum;
        const totalToPay = unitPrice * currentQty;

        directCheckoutCup = {
            id: Date.now() + Math.random(),
            base: currentSelection.base,
            toppings: Array.from(currentToppings.keys()),
            qty: currentQty,
            unitPrice: unitPrice,
            total: totalToPay
        };

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
        directCheckoutCup = null;
    });
}

if (confirmPayBtn) {
    confirmPayBtn.addEventListener('click', () => {
        const buyerName = buyerNameInput ? buyerNameInput.value.trim() : '';

        if (!buyerName) {
            showCustomAlert('Isi nama kamu dulu ya biar pesanannya nggak ketukar.');
            return;
        }

        if (!directCheckoutCup) {
            showCustomAlert('Pilih varian rasa utamanya dulu ya.');
            return;
        }

        const now = new Date();
        const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };

        const payload = {
            id: getNextOrderId(),
            date: now.toLocaleDateString('id-ID', dateOptions),
            time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            customer: buyerName,
            items: [directCheckoutCup],
            total: directCheckoutCup.total
        };

        let orderLog = JSON.parse(localStorage.getItem('kacau_orders')) || [];
        orderLog.push(payload);
        localStorage.setItem('kacau_orders', JSON.stringify(orderLog));

        localStorage.setItem('kacau_latest_order', JSON.stringify(payload));

        resetSelection();

        if (qrisModal) {
            qrisModal.classList.add('hidden');
            qrisModal.classList.remove('active');
        }
        if (buyerNameInput) buyerNameInput.value = '';

        window.location.href = 'receipt.html';
    });
}

if (btnCloseAlert) {
    btnCloseAlert.addEventListener('click', () => {
        if (alertModal) {
            alertModal.classList.add('hidden');
            alertModal.classList.remove('active');
        }
    });
}

if (cartIconBtn) {
    cartIconBtn.addEventListener('click', () => {
        window.location.href = 'cart.html';
    });
}

updateSummaryUI();