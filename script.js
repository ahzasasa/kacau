/**
 * KACAU (Statistika Cincau) - Customer Catalog Logic (script.js)
 * Real-time Firebase Database Integration & LocalStorage Sync
 */

// State Pilihan Menu Utama
let currentSelection = { base: null, price: 0, node: null };
let currentToppings = new Map();
let currentQty = 0; // Default kuantitas 0
let directCheckoutCup = null;

// Reference DOM Elements
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

/**
 * Format Angka ke Rupiah
 */
const formatNumber = (num) => {
    const val = parseInt(num) || 0;
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * Custom Alert Pop-up
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
 * Generate Next Order ID (REQ-001, REQ-002, dst.)
 */
const getNextOrderId = () => {
    let counter = parseInt(localStorage.getItem('kacau_order_counter')) || 0;
    counter++;
    localStorage.setItem('kacau_order_counter', counter);
    return `REQ-${String(counter).padStart(3, '0')}`;
};

/**
 * LocalStorage Cart Management
 */
const getCartData = () => {
    return JSON.parse(localStorage.getItem('kacau_cart')) || [];
};

const saveCartData = (cart) => {
    localStorage.setItem('kacau_cart', JSON.stringify(cart));
    updateCartBadge();
};

const updateCartBadge = () => {
    const cart = getCartData();
    const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    if (domCartCount) {
        domCartCount.textContent = totalItems;
    }
};

/**
 * Kalkulasi Total Harga & Update UI Bottom Bar
 */
const updateSummaryUI = () => {
    let singleUnitPrice = currentSelection.price;
    currentToppings.forEach((price) => {
        singleUnitPrice += price;
    });

    const grandTotal = singleUnitPrice * currentQty;

    if (domTotal) {
        domTotal.textContent = formatNumber(grandTotal);
    }

    // Simpan state cup aktif jika sudah pilih rasa utama
    if (currentSelection.base && currentQty > 0) {
        const toppingList = Array.from(currentToppings.keys());
        directCheckoutCup = {
            base: currentSelection.base,
            toppings: toppingList,
            qty: currentQty,
            unitPrice: singleUnitPrice,
            total: grandTotal
        };
    } else {
        directCheckoutCup = null;
    }
};

/**
 * Reset Pilihan Menu
 */
const resetSelection = () => {
    currentSelection = { base: null, price: 0, node: null };
    currentToppings.clear();
    currentQty = 0;
    if (qtyValEl) qtyValEl.value = '0';
    directCheckoutCup = null;

    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('selected');
        const selectBtn = card.querySelector('.select-btn');
        if (selectBtn) {
            selectBtn.classList.remove('active-state');
            selectBtn.textContent = card.dataset.type === 'base' ? 'PILIH' : 'TAMBAH';
        }
    });

    updateSummaryUI();
};

/**
 * Handling Klik Kartu Produk (Base Flavor & Topping)
 */
const handleCardSelection = (card, selectBtn, type, name, price) => {
    if (type === 'base') {
        // Pilihan Varian Rasa Utama (Single Select)
        if (currentSelection.node && currentSelection.node !== card) {
            currentSelection.node.classList.remove('selected');
            const prevBtn = currentSelection.node.querySelector('.select-btn');
            if (prevBtn) {
                prevBtn.classList.remove('active-state');
                prevBtn.textContent = 'PILIH';
            }
        }

        if (currentSelection.base === name) {
            // Deselect jika diklik ulang
            currentSelection = { base: null, price: 0, node: null };
            card.classList.remove('selected');
            if (selectBtn) {
                selectBtn.classList.remove('active-state');
                selectBtn.textContent = 'PILIH';
            }
            currentQty = 0;
            if (qtyValEl) qtyValEl.value = '0';
        } else {
            // Select Base Rasa
            currentSelection = { base: name, price: price, node: card };
            card.classList.add('selected');
            if (selectBtn) {
                selectBtn.classList.add('active-state');
                selectBtn.textContent = 'TERPILIH';
            }

            // Otomatis set kuantitas = 1 saat varian pertama kali dipilih
            if (currentQty === 0) {
                currentQty = 1;
                if (qtyValEl) qtyValEl.value = '1';
            }
        }
    } else if (type === 'topping') {
        // Pilihan Topping Tambahan (Multi Select)
        if (currentToppings.has(name)) {
            currentToppings.delete(name);
            card.classList.remove('selected');
            if (selectBtn) {
                selectBtn.classList.remove('active-state');
                selectBtn.textContent = 'TAMBAH';
            }
        } else {
            currentToppings.set(name, price);
            card.classList.add('selected');
            if (selectBtn) {
                selectBtn.classList.add('active-state');
                selectBtn.textContent = 'TERPILIH';
            }
        }
    }

    updateSummaryUI();
};

document.querySelectorAll('.card').forEach(card => {
    const selectBtn = card.querySelector('.select-btn');
    const type = card.dataset.type;
    const name = card.dataset.name;
    const price = parseInt(card.dataset.price) || 0;

    card.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        handleCardSelection(card, selectBtn, type, name, price);
    });

    if (selectBtn) {
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleCardSelection(card, selectBtn, type, name, price);
        });
    }
});

/**
 * Validasi Rasa Utama Sebelum Mengubah Kuantitas
 */
const validateBaseSelected = () => {
    if (!currentSelection.base) {
        showCustomAlert('Pilih varian rasa utamanya dulu ya.');
        return false;
    }
    return true;
};

/**
 * LOGIKA KUANTITAS (PLUS, MINUS, & DIRECT INPUT KETIK)
 */
if (qtyMinusBtn) {
    qtyMinusBtn.onclick = () => {
        if (!validateBaseSelected()) return;

        if (currentQty > 0) {
            currentQty--;
            if (qtyValEl) qtyValEl.value = currentQty;
            updateSummaryUI();
        }
    };
}

if (qtyPlusBtn) {
    qtyPlusBtn.onclick = () => {
        if (!validateBaseSelected()) return;

        currentQty++;
        if (qtyValEl) qtyValEl.value = currentQty;
        updateSummaryUI();
    };
}

if (qtyValEl) {
    // Saat diklik/fokus: bersihkan angka '0' agar siap ketik angka baru
    qtyValEl.onfocus = () => {
        if (!currentSelection.base) {
            qtyValEl.blur();
            showCustomAlert('Pilih varian rasa utamanya dulu ya.');
            return;
        }

        if (qtyValEl.value === '0' || qtyValEl.value === 0) {
            qtyValEl.value = '';
        } else {
            qtyValEl.select();
        }
    };

    // Saat diketik langsung dari keyboard
    qtyValEl.oninput = (e) => {
        if (!currentSelection.base) {
            qtyValEl.value = '0';
            currentQty = 0;
            showCustomAlert('Pilih varian rasa utamanya dulu ya.');
            updateSummaryUI();
            return;
        }

        let valStr = e.target.value;
        if (valStr === '') {
            currentQty = 0;
        } else {
            let val = parseInt(valStr);
            if (isNaN(val) || val < 0) val = 0;
            currentQty = val;
        }
        updateSummaryUI();
    };

    // Saat kursor meninggalkan input box
    qtyValEl.onblur = (e) => {
        if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
            qtyValEl.value = currentQty;
        }
    };
}

/**
 * Tambah ke Keranjang (+ KERANJANG)
 */
if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
        if (!currentSelection.base) {
            showCustomAlert('Pilih varian rasa utamanya dulu ya.');
            return;
        }
        if (currentQty <= 0) {
            showCustomAlert('Tentukan jumlah/kuantitas pesanan kamu dulu.');
            return;
        }

        const cart = getCartData();
        const toppingList = Array.from(currentToppings.keys());
        let singleUnitPrice = currentSelection.price;
        currentToppings.forEach(p => singleUnitPrice += p);

        cart.push({
            id: Date.now(),
            base: currentSelection.base,
            toppings: toppingList,
            qty: currentQty,
            unitPrice: singleUnitPrice,
            total: singleUnitPrice * currentQty,
            checked: true
        });

        saveCartData(cart);
        showCustomAlert('Pesanan berhasil ditambahkan ke keranjang!');
        resetSelection();
    });
}

/**
 * Langsung Checkout (CHECKOUT) -> Buka Modal QRIS
 */
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (!currentSelection.base) {
            showCustomAlert('Pilih varian rasa utamanya dulu ya.');
            return;
        }
        if (currentQty <= 0) {
            showCustomAlert('Tentukan jumlah/kuantitas pesanan kamu dulu.');
            return;
        }

        if (modalPayTotal) {
            modalPayTotal.textContent = formatNumber(directCheckoutCup.total);
        }

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
 * Konfirmasi Pembayaran (SELESAI BAYAR) -> Firebase Sync & Redirect Receipt
 */
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

        // Simpan transaksi terbaru ke localStorage untuk receipt.html
        localStorage.setItem('kacau_latest_order', JSON.stringify(payload));

        confirmPayBtn.disabled = true;
        confirmPayBtn.textContent = 'MEMPROSES...';

        const navigateToReceipt = () => {
            resetSelection();
            if (qrisModal) {
                qrisModal.classList.add('hidden');
                qrisModal.classList.remove('active');
            }
            if (buyerNameInput) buyerNameInput.value = '';
            confirmPayBtn.disabled = false;
            confirmPayBtn.textContent = 'SELESAI BAYAR';
            window.location.href = 'receipt.html';
        };

        // Push ke Firebase Realtime Database lalu redirect setelah sukses
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
    });
}

// Inisialisasi awal angka badge keranjang
updateCartBadge();

// Event Listener Klik Tombol Keranjang (Redirect ke cart.html)
if (cartIconBtn) {
    cartIconBtn.addEventListener('click', () => {
        window.location.href = 'cart.html';
    });
}