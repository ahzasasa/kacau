const container = document.getElementById('order-container');
const btnClear = document.getElementById('clear-all-btn');

const renderBoard = () => {
    const logs = JSON.parse(localStorage.getItem('kacau_orders')) || [];
    container.innerHTML = '';

    if (logs.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px;">NO ACTIVE DATA</div>';
        return;
    }

    logs.slice().reverse().forEach(log => {
        const card = document.createElement('div');
        card.className = 'quest-card';
        // HTML untuk menampilkan nama pembeli di-update di sini
        card.innerHTML = `
            <div class="quest-data">
                <div style="background: var(--c-purple); color: var(--c-yellow); padding: 5px; display: inline-block;">[${log.id}]</div>
                <div style="margin-top: 15px; font-weight: bold; color: var(--c-purple); font-size: 0.9rem;">> ${log.customer}</div>
                <div style="margin-top: 5px;">BASE: ${log.base}</div>
                <div>EXT: ${log.toppings}</div>
                <div style="color: var(--c-green-dark); margin-top: 10px;">RP ${log.total.toLocaleString('id-ID')} | ${log.time}</div>
            </div>
            <button class="btn btn-invert" style="padding: 15px;" onclick="resolveQuest('${log.id}')">DONE</button>
        `;
        container.appendChild(card);
    });
};

window.resolveQuest = (id) => {
    let logs = JSON.parse(localStorage.getItem('kacau_orders')) || [];
    logs = logs.filter(item => item.id !== id);
    localStorage.setItem('kacau_orders', JSON.stringify(logs));
    renderBoard();
};

btnClear.addEventListener('click', () => {
    if(confirm('LOG: Yakin mau hapus semua riwayat pesanan?')) {
        localStorage.removeItem('kacau_orders');
        renderBoard();
    }
});

window.addEventListener('storage', (e) => {
    if (e.key === 'kacau_orders') renderBoard();
});

renderBoard();