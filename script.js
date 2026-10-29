// State objek pesanan klien
let state = {
    baseMenu: { name: null, price: 0, node: null },
    toppings: new Map(),
    total: 0,
    itemCount: 0
};

// selector DOM 
const domTotal = document.getElementById('total-price');
const domCartCount = document.getElementById('cart-count');
const modalTotalPrice = document.getElementById('modal-total-price');
const qrisModal = document.getElementById('qris-modal');
const nameInput = document.getElementById('buyer-name');

// custom alert
const alertModal = document.getElementById('alert-modal');
const alertMessage = document.getElementById('alert-message');
const btnCloseAlert = document.getElementById('close-alert-btn');

/**
 * string numerik ke bentuk representasi currency
 */
const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const showCustomAlert = (pesan) => {
    alertMessage.textContent = pesan;
    alertModal.classList.add('active');
};

/**
 * kalkulasi state harga dan sinkronisasi ke node DOM
 */
const updateSummary = () => {
    let toppingSum = 0;
    state.toppings.forEach(price => toppingSum += price);
    
    state.total = state.baseMenu.price + toppingSum;
    state.itemCount = (state.baseMenu.price > 0 ? 1 : 0) + state.toppings.size;

    domTotal.textContent = formatNumber(state.total);
    domCartCount.textContent = state.itemCount;
};

/**
 * reset state memori pasca transaksi sukses
 */
const resetState = () => {
    state = { baseMenu: { name: null, price: 0, node: null }, toppings: new Map(), total: 0, itemCount: 0 };
    document.querySelectorAll('.select-btn').forEach(btn => {
        btn.classList.remove('active-state');
        btn.textContent = btn.closest('.card').dataset.type === 'base' ? 'PILIH' : 'TAMBAH';
    });
    updateSummary();
};

// listener iteratif untuk operasi klik kartu katalog
document.querySelectorAll('.card').forEach(card => {
    const btn = card.querySelector('.select-btn');
    const type = card.dataset.type;
    const price = parseInt(card.dataset.price);
    const name = card.dataset.name;

    btn.addEventListener('click', () => {
        if (type === 'base') {
            if (state.baseMenu.node && state.baseMenu.node !== btn) {
                state.baseMenu.node.classList.remove('active-state');
                state.baseMenu.node.textContent = 'PILIH';
            }

            if (btn.classList.contains('active-state')) {
                btn.classList.remove('active-state');
                btn.textContent = 'PILIH';
                state.baseMenu = { name: null, price: 0, node: null };
            } else {
                btn.classList.add('active-state');
                btn.textContent = 'TERPILIH';
                state.baseMenu = { name, price, node: btn };
            }
        } else if (type === 'topping') {
            if (state.toppings.has(name)) {
                state.toppings.delete(name);
                btn.classList.remove('active-state');
                btn.textContent = 'TAMBAH';
            } else {
                state.toppings.set(name, price);
                btn.classList.add('active-state');
                btn.textContent = 'TERPILIH';
            }
        }
        updateSummary();
    });
});

// listener validasi pra-checkout dan invoke modal QRIS
document.getElementById('checkout-btn').addEventListener('click', () => {
    if (state.total === 0 || !state.baseMenu.name) {
        showCustomAlert('Gagal checkout. Jangan lupa pilih varian rasa utamanya dulu ya.');
        return;
    }
    modalTotalPrice.textContent = formatNumber(state.total);
    qrisModal.classList.add('active');
});

// handler penutupan modal QRIS dan custom alert
document.getElementById('close-modal').addEventListener('click', () => qrisModal.classList.remove('active'));
btnCloseAlert.addEventListener('click', () => alertModal.classList.remove('active'));

window.addEventListener('click', (e) => { 
    if (e.target === qrisModal) qrisModal.classList.remove('active'); 
    if (e.target === alertModal) alertModal.classList.remove('active'); 
});

// eksekusi checkout, payload generator dan push array ke web storage
document.getElementById('confirm-payment-btn').addEventListener('click', () => {
    const buyerName = nameInput.value.trim();

    // Prevent submission jika form nama kosong
    if (!buyerName) {
        showCustomAlert('Maaf, isi nama kamu dulu ya biar pesanannya nggak ketukar.');
        return;
    }

    const arrToppings = Array.from(state.toppings.keys());
    
    // payload pesanan
    const payload = {
        id: 'REQ-' + Math.floor(1000 + Math.random() * 9000),
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        customer: buyerName, 
        base: state.baseMenu.name,
        toppings: arrToppings.length > 0 ? arrToppings.join(', ') : '-',
        total: state.total
    };

    // load queue dari local storage, mutasi, lalu simpan ulang
    let orderLog = JSON.parse(localStorage.getItem('kacau_orders')) || [];
    orderLog.push(payload);
    localStorage.setItem('kacau_orders', JSON.stringify(orderLog));

    // tutup popup QRIS dan trigger notifikasi sukses
    qrisModal.classList.remove('active');
    showCustomAlert('Terima kasih! Pesanan kamu sudah masuk ke antrean.');
    
    // clean-up
    nameInput.value = '';
    resetState();
});