let state = {
    baseMenu: { name: null, price: 0, node: null },
    toppings: new Map(),
    total: 0,
    itemCount: 0
};

const domTotal = document.getElementById('total-price');
const domCartCount = document.getElementById('cart-count');
const modalTotalPrice = document.getElementById('modal-total-price');
const qrisModal = document.getElementById('qris-modal');
const nameInput = document.getElementById('buyer-name'); // Ambil elemen input nama

const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const updateSummary = () => {
    let toppingSum = 0;
    state.toppings.forEach(price => toppingSum += price);
    
    state.total = state.baseMenu.price + toppingSum;
    state.itemCount = (state.baseMenu.price > 0 ? 1 : 0) + state.toppings.size;

    domTotal.textContent = formatNumber(state.total);
    domCartCount.textContent = state.itemCount;
};

const resetState = () => {
    state = { baseMenu: { name: null, price: 0, node: null }, toppings: new Map(), total: 0, itemCount: 0 };
    document.querySelectorAll('.select-btn').forEach(btn => {
        btn.classList.remove('active-state');
        btn.textContent = btn.closest('.card').dataset.type === 'base' ? 'PILIH' : 'TAMBAH';
    });
    updateSummary();
};

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
                btn.textContent = 'AKTIF';
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
                btn.textContent = 'AKTIF';
            }
        }
        updateSummary();
    });
});

document.getElementById('checkout-btn').addEventListener('click', () => {
    if (state.total === 0 || !state.baseMenu.name) {
        alert('LOG: Gagal checkout. Jangan lupa pilih varian rasa utamanya dulu ya.');
        return;
    }
    modalTotalPrice.textContent = formatNumber(state.total);
    qrisModal.classList.add('active');
});

document.getElementById('close-modal').addEventListener('click', () => qrisModal.classList.remove('active'));
window.addEventListener('click', (e) => { if (e.target === qrisModal) qrisModal.classList.remove('active'); });

document.getElementById('confirm-payment-btn').addEventListener('click', () => {
    const buyerName = nameInput.value.trim();

    // Pembeli wajib isi nama
    if (!buyerName) {
        alert('LOG: Maaf, isi nama kamu dulu ya biar pesanannya nggak ketukar.');
        return;
    }

    const arrToppings = Array.from(state.toppings.keys());
    
    const payload = {
        id: 'REQ-' + Math.floor(1000 + Math.random() * 9000),
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        customer: buyerName,
        base: state.baseMenu.name,
        toppings: arrToppings.length > 0 ? arrToppings.join(', ') : '-',
        total: state.total
    };

    let orderLog = JSON.parse(localStorage.getItem('kacau_orders')) || [];
    orderLog.push(payload);
    localStorage.setItem('kacau_orders', JSON.stringify(orderLog));

    alert('LOG: Terima kasih! Pesanan kamu sudah masuk ke antrean.');
    
    nameInput.value = '';
    qrisModal.classList.remove('active');
    resetState();
});