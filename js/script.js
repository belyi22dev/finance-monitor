document.addEventListener('DOMContentLoaded', () => {
    initDateTime();
    initNavigation();
    renderAll();
    initCharts();
    bindModal();
});

// ============================================
// 1. DATE & TIME
// ============================================
function initDateTime() {
    const update = () => {
        const now = new Date();
        const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        
        document.getElementById('dateDisplay').textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        document.getElementById('timeDisplay').innerHTML = `${h}:${m}<span class="seconds">:${s}</span>`;
    };
    update();
    setInterval(update, 1000);
}

// ============================================
// 2. NAVIGATION
// ============================================
function initNavigation() {
    document.querySelectorAll('.nav-link[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
            document.getElementById(`page-${btn.dataset.page}`).classList.add('active');
        });
    });
}

// ============================================
// 3. MOCK DATA (Personal Loans)
// ============================================
const myContracts = [
    { id: 'MFO-001', org: 'МФО «Займер»', type: 'Займ МФО', amount: 30000, remaining: 8400, rate: 0.8, payment: 4200, next: '2024-01-25', status: 'active', daysOverdue: 0, penalty: 0, openDate: '2023-12-10' },
    { id: 'BANK-042', org: 'Сбербанк', type: 'Кредит наличными', amount: 450000, remaining: 312000, rate: 14.5, payment: 14800, next: '2024-01-28', status: 'active', daysOverdue: 0, penalty: 0, openDate: '2022-06-15' },
    { id: 'MKK-015', org: 'МКК «МигКредит»', type: 'Займ МКК', amount: 15000, remaining: 11200, rate: 0.9, payment: 5600, next: '2024-01-20', status: 'overdue', daysOverdue: 4, penalty: 1800, openDate: '2024-01-05' },
    { id: 'BANK-088', org: 'Тинькофф', type: 'Кредитная карта', amount: 100000, remaining: 42300, rate: 29.9, payment: 4500, next: '2024-02-05', status: 'active', daysOverdue: 0, penalty: 0, openDate: '2023-08-20' },
    { id: 'INST-003', org: 'Рассрочка «Сплит»', type: 'Рассрочка', amount: 24000, remaining: 0, rate: 0, payment: 0, next: '-', status: 'closed', daysOverdue: 0, penalty: 0, closedDate: '2023-11-15', totalPaid: 24000, openDate: '2023-05-01' },
    { id: 'BANK-112', org: 'ВТБ', type: 'Автокредит', amount: 850000, remaining: 645000, rate: 12.4, payment: 28500, next: '2024-02-01', status: 'active', daysOverdue: 0, penalty: 0, openDate: '2021-11-10' },
];

function formatMoney(n) { return n.toLocaleString('ru-RU'); }
function formatDate(d) { if(d === '-') return d; const dt = new Date(d); return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`; }
function getProgress(remaining, total) { return Math.max(0, Math.min(100, 100 - (remaining / total * 100))); }
function getStatusBadge(s) {
    const map = { 
        active: '<span class="status-badge status-active"><span class="dot"></span>Активен</span>', 
        overdue: '<span class="status-badge status-overdue"><span class="dot"></span>Просрочка</span>', 
        closed: '<span class="status-badge status-closed"><span class="dot"></span>Закрыт</span>' 
    };
    return map[s] || '';
}
function getOrgIcon(type) { return type.includes('МФО') || type.includes('МКК') ? 'bi-bank' : type.includes('Кредит') ? 'bi-credit-card' : 'bi-bag'; }

// ============================================
// 4. RENDER FUNCTIONS
// ============================================
function renderDashboard() {
    const active = myContracts.filter(c => c.status === 'active');
    const totalDebt = myContracts.reduce((s, c) => s + c.remaining, 0);
    const monthly = active.reduce((s, c) => s + c.payment, 0);
    const nextDate = active.reduce((min, c) => c.next < min ? c.next : min, '9999-99-99');
    
    document.getElementById('totalDebt').textContent = `₽ ${formatMoney(totalDebt)}`;
    document.getElementById('monthlyPayment').textContent = `₽ ${formatMoney(monthly)}`;
    document.getElementById('nextPaymentDate').textContent = nextDate === '9999-99-99' ? '—' : formatDate(nextDate);
    document.getElementById('activeContracts').textContent = active.length;
    document.getElementById('donutTotal').textContent = myContracts.length;

    // Table
    const tbody = document.getElementById('dashTableBody');
    tbody.innerHTML = active.slice(0, 5).map(c => `
        <tr class="${c.status === 'overdue' ? 'row-overdue' : ''}">
            <td>
                <div class="org-cell">
                    <div class="org-icon"><i class="bi ${getOrgIcon(c.type)}"></i></div>
                    <div>
                        <div class="org-name">${c.org}</div>
                        <div class="org-id">${c.id}</div>
                    </div>
                </div>
            </td>
            <td><span style="color:var(--text-secondary);font-size:13px">${c.type}</span></td>
            <td><span class="amount-value">₽ ${formatMoney(c.remaining)}</span></td>
            <td>${formatDate(c.next)}</td>
            <td>${getStatusBadge(c.status)}</td>
            <td><div class="progress-bar-custom"><div class="fill" style="width:${getProgress(c.remaining, c.amount)}%;background:${c.status==='overdue'?'var(--accent-red)':'var(--accent-blue)'}"></div></div></td>
        </tr>
    `).join('');

    // Alerts
    const alerts = document.getElementById('alertsList');
    const overdue = myContracts.filter(c => c.status === 'overdue');
    let html = '';
    overdue.forEach(c => html += `
        <div class="alert-item">
            <div class="alert-icon warn"><i class="bi bi-exclamation-triangle"></i></div>
            <div>
                <div class="alert-text">Просрочка: ${c.org} — ${formatDate(c.next)}</div>
                <div class="alert-time">Штраф: ₽ ${formatMoney(c.penalty)} | Дней: ${c.daysOverdue}</div>
            </div>
        </div>`);

    active.filter(c => c.status !== 'overdue').slice(0, 3).forEach(c => {
        html += `
        <div class="alert-item">
            <div class="alert-icon info"><i class="bi bi-bell"></i></div>
            <div>
                <div class="alert-text">Ближайший платёж: ${c.org}</div>
                <div class="alert-time">Сумма: ₽ ${formatMoney(c.payment)} | ${formatDate(c.next)}</div>
            </div>
        </div>`;
    });
    
    html += `
    <div class="alert-item">
        <div class="alert-icon ok"><i class="bi bi-check-circle"></i></div>
        <div>
            <div class="alert-text">Кредитная нагрузка в норме</div>
            <div class="alert-time">Долг/Доход: ~35%</div>
        </div>
    </div>`;
    alerts.innerHTML = html;
}

function renderAllLoans() {
    const periodMap = {
        'Займ МФО': 'день', 'Займ МКК': 'день',
        'Кредит наличными': 'мес', 'Кредитная карта': 'мес',
        'Автокредит': 'мес', 'Рассрочка': 'мес'
    };

    document.getElementById('allLoansBody').innerHTML = myContracts.map((c, i) => `
        <tr class="${c.status === 'overdue' ? 'row-overdue' : ''}">
            <td style="color:var(--text-muted)">${i + 1}</td>
            <td>
                <div class="org-cell">
                    <div class="org-icon"><i class="bi ${getOrgIcon(c.type)}"></i></div>
                    <div>
                        <div class="org-name">${c.org}</div>
                        <div class="org-id">${c.id}</div>
                    </div>
                </div>
            </td>
            <td>${c.openDate ? formatDate(c.openDate) : '—'}</td>
            <td><span class="amount-value">₽ ${formatMoney(c.amount)}</span></td>
            <td>${c.rate}% / ${periodMap[c.type] || 'год'}</td>
            <td><span class="amount-value">₽ ${formatMoney(c.remaining)}</span></td>
            <td>${c.closedDate ? formatDate(c.closedDate) : '—'}</td>
            <td>${getStatusBadge(c.status)}</td>
            <td>
                <button class="action-btn" title="Редактировать"><i class="bi bi-pencil"></i></button>
                <button class="action-btn" title="Просмотр"><i class="bi bi-eye"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderFiltered(filter) {
    const list = myContracts.filter(c => c.status === filter);
    const getBodyId = filter === 'active' ? 'activeBody' : filter === 'overdue' ? 'overdueBody' : 'closedBody';
    const tbody = document.getElementById(getBodyId);
    if(!tbody) return;
    
    if(filter === 'closed') {
        tbody.innerHTML = list.map(c => `
            <tr>
                <td>${c.org}</td>
                <td>${c.type}</td>
                <td>₽ ${formatMoney(c.amount)}</td>
                <td>₽ ${formatMoney(c.totalPaid)}</td>
                <td>${formatDate(c.closedDate)}</td>
                <td>${getStatusBadge(c.status)}</td>
            </tr>
        `).join('');
    } else if(filter === 'overdue') {
        tbody.innerHTML = list.map(c => `
            <tr class="row-overdue">
                <td>
                    <div class="org-cell">
                        <div class="org-icon"><i class="bi ${getOrgIcon(c.type)}"></i></div>
                        <div><div class="org-name">${c.org}</div></div>
                    </div>
                </td>
                <td><span class="amount-value" style="color:var(--accent-red)">₽ ${formatMoney(c.payment)}</span></td>
                <td><span class="days-overdue">${c.daysOverdue} дн.</span></td>
                <td>₽ ${formatMoney(c.penalty)}</td>
                <td>
                    <button class="action-btn"><i class="bi bi-telephone"></i></button>
                    <button class="action-btn"><i class="bi bi-chat-dots"></i></button>
                </td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = list.map(c => `
            <tr>
                <td>
                    <div class="org-cell">
                        <div class="org-icon"><i class="bi ${getOrgIcon(c.type)}"></i></div>
                        <div><div class="org-name">${c.org}</div></div>
                    </div>
                </td>
                <td>${c.type}</td>
                <td>₽ ${formatMoney(c.amount)}</td>
                <td>₽ ${formatMoney(c.remaining)}</td>
                <td>${formatDate(c.next)}</td>
                <td><div class="progress-bar-custom"><div class="fill" style="width:${getProgress(c.remaining, c.amount)}%;background:var(--accent-blue)"></div></div></td>
            </tr>
        `).join('');
    }
}

function renderCalendar() {
    const sorted = myContracts.filter(c => c.status === 'active').sort((a,b) => a.next.localeCompare(b.next));
    const tbody = document.getElementById('calendarBody');
    tbody.innerHTML = sorted.map(c => `
        <tr>
            <td style="font-weight:600">${formatDate(c.next)}</td>
            <td>${c.org}</td>
            <td><span class="amount-value">₽ ${formatMoney(c.payment)}</span></td>
            <td><span class="status-badge status-pending"><span class="dot"></span>Ожидает</span></td>
        </tr>
    `).join('');
}

function renderAll() {
    renderDashboard();
    renderAllLoans();
    renderFiltered('active');
    renderFiltered('overdue');
    renderFiltered('closed');
    renderCalendar();
}

// ============================================
// 5. CHARTS
// ============================================
function initCharts() {
    Chart.defaults.color = '#8888a0';
    Chart.defaults.font.family = 'Inter';
    Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.04)';
    
    new Chart(document.getElementById('lineChart'), {
        type: 'line',
        data: {
            labels: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'],
            datasets: [{
                label: 'Общий долг (тыс. ₽)',
                data: [1250,1180,1120,1050,980,920,860,810,750,710,680,645],
                borderColor: '#4a7dff', backgroundColor: 'rgba(74,125,255,0.1)',
                borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v=>v+'K' } } } }
    });

    new Chart(document.getElementById('doughnutChart'), {
        type: 'doughnut',
        data: {
            labels: ['МФО/МКК', 'Банки', 'Рассрочки'],
            datasets: [{ data: [15, 75, 10], backgroundColor: ['#f59e0b','#4a7dff','#a78bfa'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 12 } } } } }
    });

    new Chart(document.getElementById('polarChart'), {
        type: 'polarArea',
        data: {
            labels: ['Займы МФО', 'Кредиты наличными', 'Автокредиты', 'Кредитные карты', 'Рассрочки'],
            datasets: [{ data: [12, 35, 28, 15, 10], backgroundColor: ['rgba(245,158,11,0.7)','rgba(74,125,255,0.7)','rgba(52,211,153,0.7)','rgba(244,114,182,0.7)','rgba(167,139,250,0.7)'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, font: { size: 11 } } } }, scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.06)' } } } }
    });

    new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
            labels: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'],
            datasets: [{ label: 'Платежи (тыс. ₽)', data: [52,52,52,52,48,48,48,45,45,42,42,40], backgroundColor: '#34d399', borderRadius: 6, barThickness: 20 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v=>v+'K' } } } }
    });
}

// ============================================
// 6. MODAL BINDING (Demo)
// ============================================
function bindModal() {
    document.getElementById('saveLoanBtn').addEventListener('click', () => {
        const modal = bootstrap.Modal.getInstance(document.getElementById('addLoanModal'));
        modal.hide();
        alert('Договор добавлен (демо-режим)');
    });
}