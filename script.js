// Nomor WhatsApp Penjual
const SELLER_WA_NUMBER = "6281233209503";

// State Pilihan Menu Utama
let currentSelection = { base: null, price: 0, node: null };
let currentToppings = new Map();
let currentQty = 0;
let directCheckoutCup = null;
let activeOrderListenerRef = null;

// Real-time Inventory State
let inventoryStock = { bases: {}, toppings: {} };

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

// Modal Elements & Steps
const qrisModal = document.getElementById('qris-modal');
const modalPayTotal = document.getElementById('modal-pay-total');
const closeQrisBtn = document.getElementById('close-qris-btn');
const confirmPayBtn = document.getElementById('confirm-pay-btn');

const stepInput = document.getElementById('modal-step-input');
const stepWaiting = document.getElementById('modal-step-waiting');
const waitingOrderId = document.getElementById('waiting-order-id');
const waitingStatusBadge = document.getElementById('waiting-status-badge');
const waConfirmLink = document.getElementById('wa-confirm-link');

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
 * LocalStorage Cart Management
 */
const getCartData = () => JSON.parse(localStorage.getItem('kacau_cart')) || [];
const saveCartData = (cart) => {
    localStorage.setItem('kacau_cart', JSON.stringify(cart));
    updateCartBadge();
};

const updateCartBadge = () => {
    const cart = getCartData();
    const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    if (domCartCount) domCartCount.textContent = totalItems;
};

/**
 * Hitung Sisa Stok Efektif (Stok Database dikurangi item yang sudah di Keranjang)
 */
const getAvailableBaseStock = () => {
    if (!currentSelection.base) return 99;

    const dbStock = (inventoryStock.bases && inventoryStock.bases[currentSelection.base] !== undefined)
        ? inventoryStock.bases[currentSelection.base]
        : 99;

    const cart = getCartData();
    const existingCartQty = cart
        .filter(item => item.base === currentSelection.base)
        .reduce((sum, item) => sum + (item.qty || 1), 0);

    return Math.max(0, dbStock - existingCartQty);
};

/**
 * Membuat URL WhatsApp dengan template bukti pembayaran lengkap
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
 * Listener Real-time Stok Pembeli (Disable Kartu Jika Stok <= 0)
 */
const initBuyerStockListener = () => {
    const updateBuyerStockUI = (stockData) => {
        inventoryStock = stockData || { bases: {}, toppings: {} };

        document.querySelectorAll('.card').forEach(card => {
            const isBase = card.dataset.type === 'base';
            const category = isBase ? 'bases' : 'toppings';
            const name = card.dataset.name;
            const dbStockVal = (inventoryStock[category] && inventoryStock[category][name] !== undefined) 
                ? inventoryStock[category][name] 
                : 99;
            const selectBtn = card.querySelector('.select-btn');

            let effectiveStock = dbStockVal;
            if (isBase) {
                const cart = getCartData();
                const existingCartQty = cart
                    .filter(item => item.base === name)
                    .reduce((sum, item) => sum + (item.qty || 1), 0);
                effectiveStock = Math.max(0, dbStockVal - existingCartQty);
            }

            if (effectiveStock <= 0) {
                card.classList.add('out-of-stock');
                card.style.opacity = '0.5';
                card.style.pointerEvents = 'none';

                if (isBase && currentSelection.base === name) {
                    resetSelection();
                } else if (!isBase && currentToppings.has(name)) {
                    currentToppings.delete(name);
                    updateSummaryUI();
                }

                if (selectBtn) {
                    selectBtn.textContent = 'HABIS';
                    selectBtn.style.background = '#7f8c8d';
                    selectBtn.style.borderColor = '#7f8c8d';
                    selectBtn.style.color = '#fff';
                }
            } else {
                card.classList.remove('out-of-stock');
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';

                if (selectBtn && !card.classList.contains('selected')) {
                    selectBtn.textContent = isBase ? 'PILIH' : 'TAMBAH';
                    selectBtn.style.background = '';
                    selectBtn.style.borderColor = '';
                    selectBtn.style.color = '';
                }
            }
        });
    };

    if (typeof db !== 'undefined') {
        db.ref('kacau_inventory').on('value', (snapshot) => {
            updateBuyerStockUI(snapshot.val());
        });
    } else {
        const localStock = JSON.parse(localStorage.getItem('kacau_stock'));
        updateBuyerStockUI(localStock);
    }
};

/**
 * Pengurangan Stok Otomatis di Database Saat Checkout
 */
const deductInventoryStock = (items) => {
    if (!items || !Array.isArray(items)) return;

    items.forEach(item => {
        const qty = item.qty || 1;

        if (item.base) {
            if (typeof db !== 'undefined') {
                db.ref(`kacau_inventory/bases/${item.base}`).transaction((current) => Math.max(0, (current || 0) - qty));
            }
            if (inventoryStock.bases && inventoryStock.bases[item.base] !== undefined) {
                inventoryStock.bases[item.base] = Math.max(0, inventoryStock.bases[item.base] - qty);
            }
        }

        if (item.toppings && Array.isArray(item.toppings)) {
            item.toppings.forEach(top => {
                if (typeof db !== 'undefined') {
                    db.ref(`kacau_inventory/toppings/${top}`).transaction((current) => Math.max(0, (current || 0) - qty));
                }
                if (inventoryStock.toppings && inventoryStock.toppings[top] !== undefined) {
                    inventoryStock.toppings[top] = Math.max(0, inventoryStock.toppings[top] - qty);
                }
            });
        }
    });

    localStorage.setItem('kacau_stock', JSON.stringify(inventoryStock));
};

/**
 * Kalkulasi Total Harga & Update UI Bottom Bar
 */
const updateSummaryUI = () => {
    let singleUnitPrice = currentSelection.price;
    currentToppings.forEach((price) => { singleUnitPrice += price; });

    const grandTotal = singleUnitPrice * currentQty;
    if (domTotal) domTotal.textContent = formatNumber(grandTotal);

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
 * Reset Pilihan Menu Utama
 */
const resetSelection = () => {
    currentSelection = { base: null, price: 0, node: null };
    currentToppings.clear();
    currentQty = 0;
    if (qtyValEl) qtyValEl.value = '0';
    directCheckoutCup = null;

    document.querySelectorAll('.card').forEach(card => {
        if (!card.classList.contains('out-of-stock')) {
            card.classList.remove('selected');
            const selectBtn = card.querySelector('.select-btn');
            if (selectBtn) {
                selectBtn.classList.remove('active-state');
                selectBtn.textContent = card.dataset.type === 'base' ? 'PILIH' : 'TAMBAH';
            }
        }
    });

    updateSummaryUI();
};

/**
 * Handling Klik Kartu Produk
 */
const handleCardSelection = (card, selectBtn, type, name, price) => {
    if (card.classList.contains('out-of-stock')) return;

    if (type === 'base') {
        if (currentSelection.node && currentSelection.node !== card) {
            currentSelection.node.classList.remove('selected');
            const prevBtn = currentSelection.node.querySelector('.select-btn');
            if (prevBtn && !currentSelection.node.classList.contains('out-of-stock')) {
                prevBtn.classList.remove('active-state');
                prevBtn.textContent = 'PILIH';
            }
        }

        if (currentSelection.base === name) {
            currentSelection = { base: null, price: 0, node: null };
            card.classList.remove('selected');
            if (selectBtn) {
                selectBtn.classList.remove('active-state');
                selectBtn.textContent = 'PILIH';
            }
            currentQty = 0;
            if (qtyValEl) qtyValEl.value = '0';
        } else {
            currentSelection = { base: name, price: price, node: card };
            card.classList.add('selected');
            if (selectBtn) {
                selectBtn.classList.add('active-state');
                selectBtn.textContent = 'TERPILIH';
            }
            
            const maxStock = getAvailableBaseStock();
            if (maxStock <= 0) {
                showCustomAlert(`Stok ${name} sudah habis atau ada di keranjang kamu.`);
                resetSelection();
                return;
            }

            if (currentQty === 0) {
                currentQty = 1;
                if (qtyValEl) qtyValEl.value = '1';
            } else if (currentQty > maxStock) {
                currentQty = maxStock;
                if (qtyValEl) qtyValEl.value = currentQty;
            }
        }
    } else if (type === 'topping') {
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

const validateBaseSelected = () => {
    if (!currentSelection.base) {
        showCustomAlert('Pilih varian rasa utamanya dulu ya.');
        return false;
    }
    return true;
};

// Kontrol Kuantitas (-)
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

// Kontrol Kuantitas (+) dengan Pembatasan Stok Efektif
if (qtyPlusBtn) {
    qtyPlusBtn.onclick = () => {
        if (!validateBaseSelected()) return;

        const maxStock = getAvailableBaseStock();
        if (currentQty >= maxStock) {
            showCustomAlert(`Stok ${currentSelection.base} cuma sisa ${maxStock} porsi!`);
            return;
        }

        currentQty++;
        if (qtyValEl) qtyValEl.value = currentQty;
        updateSummaryUI();
    };
}

// Input Kuantitas Manual dengan Pembatasan Stok Efektif
if (qtyValEl) {
    qtyValEl.onfocus = () => {
        if (!currentSelection.base) {
            qtyValEl.blur();
            showCustomAlert('Pilih varian rasa utamanya dulu ya.');
            return;
        }
        if (qtyValEl.value === '0' || qtyValEl.value === 0) qtyValEl.value = '';
        else qtyValEl.select();
    };

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

            const maxStock = getAvailableBaseStock();
            if (val > maxStock) {
                val = maxStock;
                showCustomAlert(`Stok ${currentSelection.base} cuma sisa ${maxStock} porsi!`);
            }
            currentQty = val;
        }
        updateSummaryUI();
    };

    qtyValEl.onblur = (e) => {
        if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
            qtyValEl.value = currentQty;
        }
    };
}

// Tombol Tambah ke Keranjang
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

        const maxStock = getAvailableBaseStock();
        if (currentQty > maxStock) {
            showCustomAlert(`Stok ${currentSelection.base} tidak mencukupi (sisa ${maxStock}).`);
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
        initBuyerStockListener();
    });
}

// Tombol Checkout Langsung
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

        const maxStock = getAvailableBaseStock();
        if (currentQty > maxStock) {
            showCustomAlert(`Stok ${currentSelection.base} tidak mencukupi (sisa ${maxStock}).`);
            return;
        }

        if (modalPayTotal && directCheckoutCup) {
            modalPayTotal.textContent = formatNumber(directCheckoutCup.total);
        }

        if (stepInput) stepInput.style.display = 'block';
        if (stepWaiting) stepWaiting.style.display = 'none';

        if (qrisModal) {
            qrisModal.classList.remove('hidden');
            qrisModal.classList.add('active');
        }
    });
}

if (closeQrisBtn) {
    closeQrisBtn.addEventListener('click', () => {
        if (activeOrderListenerRef) activeOrderListenerRef.off();
        if (qrisModal) {
            qrisModal.classList.add('hidden');
            qrisModal.classList.remove('active');
        }
    });
}

/**
 * Mendengarkan Konfirmasi Penjual secara Real-time via Firebase DB
 */
const listenForSellerConfirmation = (firebaseNodeKey) => {
    if (typeof db === 'undefined') return;

    if (activeOrderListenerRef) activeOrderListenerRef.off();

    activeOrderListenerRef = db.ref(`kacau_orders/${firebaseNodeKey}`);
    activeOrderListenerRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && (data.paymentStatus === 'PAID' || data.paymentStatus === 'LUNAS')) {
            activeOrderListenerRef.off();

            if (waitingStatusBadge) {
                waitingStatusBadge.style.background = '#27ae60';
                waitingStatusBadge.style.color = '#fff';
                waitingStatusBadge.textContent = 'PEMBAYARAN LUNAS! 🟢';
            }

            localStorage.setItem('kacau_latest_order', JSON.stringify(data));

            setTimeout(() => {
                resetSelection();
                if (qrisModal) {
                    qrisModal.classList.add('hidden');
                    qrisModal.classList.remove('active');
                }
                window.location.href = 'receipt.html';
            }, 1000);
        }
    });
};

/**
 * Konfirmasi Pembeli (SUDAH BAYAR) -> Kirim ke Firebase, Potong Stok, Set Link WA & Tunggu Konfirmasi Kasir
 */
if (confirmPayBtn) {
    confirmPayBtn.addEventListener('click', async () => {
        const nameInput = document.querySelector('#qris-modal #buyer-name') || document.getElementById('buyer-name');
        const prodiInput = document.querySelector('#qris-modal #buyer-prodi') || document.getElementById('buyer-prodi');

        const buyerName = nameInput ? nameInput.value.trim() : '';
        const buyerProdi = prodiInput ? prodiInput.value.trim() : '-';

        if (!buyerName) {
            showCustomAlert('Isi nama kamu dulu ya biar pesanannya nggak ketukar.');
            return;
        }

        if (!directCheckoutCup) {
            showCustomAlert('Pilih varian rasa utamanya dulu ya.');
            return;
        }

        // Potong Stok Produk di Database
        deductInventoryStock([directCheckoutCup]);

        const orderId = getNextOrderId();
        const now = new Date();
        const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };

        const payload = {
            id: orderId,
            date: now.toLocaleDateString('id-ID', dateOptions),
            time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            customer: buyerName,
            prodi: buyerProdi,
            items: [directCheckoutCup],
            total: directCheckoutCup.total,
            paymentMethod: 'QRIS GoPay',
            paymentStatus: 'UNPAID'
        };

        // Update Link WhatsApp dengan template pesan khusus
        if (waConfirmLink) {
            waConfirmLink.href = generateWALink(payload);
        }

        // Simpan transaksi awal ke LocalStorage
        let localOrders = JSON.parse(localStorage.getItem('kacau_orders')) || [];
        localOrders.push(payload);
        localStorage.setItem('kacau_orders', JSON.stringify(localOrders));
        localStorage.setItem('kacau_latest_order', JSON.stringify(payload));

        // Ubah Modal ke Step 2 (Menunggu Konfirmasi Kasir)
        if (stepInput) stepInput.style.display = 'none';
        if (stepWaiting) stepWaiting.style.display = 'block';
        if (waitingOrderId) waitingOrderId.textContent = orderId;
        if (waitingStatusBadge) {
            waitingStatusBadge.style.background = 'var(--c-yellow)';
            waitingStatusBadge.style.color = 'var(--c-purple)';
            waitingStatusBadge.textContent = 'STATUS: MENUNGGU KASIR... ⏳';
        }

        // Push ke Firebase DB & Listen Konfirmasi Penjual
        if (typeof db !== 'undefined') {
            const newRef = db.ref('kacau_orders').push();
            payload.firebaseKey = newRef.key;
            await newRef.set(payload);

            listenForSellerConfirmation(newRef.key);
        } else {
            console.error("Firebase Database 'db' tidak terdefinisi.");
        }
    });
}

// Inisialisasi Badge Keranjang & Listener Stok Pembeli
updateCartBadge();
initBuyerStockListener();

if (cartIconBtn) {
    cartIconBtn.addEventListener('click', () => {
        window.location.href = 'cart.html';
    });
}