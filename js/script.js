// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================
let contracts = [];
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    initDateTime();
    loadContracts();
    initNavigation();
    renderAll();
    initCharts();
    bindModal();
    bindExport();
    bindSearch();
    initToast();
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
// 2. LOCAL STORAGE - ХРАНЕНИЕ ДАННЫХ
// ============================================
const DEFAULT_CONTRACTS = [
    { id: 'MFO-001', org: 'МФО «Займер»', type: 'Займ МФО', amount: 30000, remaining: 8400, rate: 0.8, payment: 4200, next: '2024-01-25', status: 'active', daysOverdue: 0, penalty: 0, openDate: '2023-12-10', comment: '' },
    { id: 'BANK-042', org: 'Сбербанк', type: 'Кредит наличными', amount: 450000, remaining: 312000, rate: 14.5, payment: 14800, next: '2024-01-28', status: 'active', daysOverdue: 0, penalty: 0, openDate: '2022-06-15', comment: '' },
    { id: 'MKK-015', org: 'МКК «МигКредит»', type: 'Займ МКК', amount: 15000, remaining: 11200, rate: 0.9, payment: 5600, next: '2024-01-20', status: 'overdue', daysOverdue: 4, penalty: 1800, openDate: '2024-01-05', comment: '' },
    { id: 'BANK-088', org: 'Тинькофф', type: 'Кредитная карта', amount: 100000, remaining: 42300, rate: 29.9, payment: 4500, next: '2024-02-05', status: 'active', daysOverdue: 0, penalty: 0, openDate: '2023-08-20', comment: '' },
    { id: 'INST-003', org: 'Рассрочка «Сплит»', type: 'Рассрочка', amount: 24000, remaining: 0, rate: 0, payment: 0, next: '-', status: 'closed', daysOverdue: 0, penalty: 0, closedDate: '2023-11-15', totalPaid: 24000, openDate: '2023-05-01', comment: '' },
    { id: 'BANK-112', org: 'ВТБ', type: 'Автокредит', amount: 850000, remaining: 645000, rate: 12.4, payment: 28500, next: '2024-02-01', status: 'active', daysOverdue: 0, penalty: 0, openDate: '2021-11-10', comment: '' },
];

function loadContracts() {
    const stored = localStorage.getItem('finMonitorContracts');
    if (stored) {
        contracts = JSON.parse(stored);
    } else {
        contracts = [...DEFAULT_CONTRACTS];
        saveContracts();
    }
}

function saveContracts() {
    localStorage.setItem('finMonitorContracts', JSON.stringify(contracts));
    renderAll();
}

function generateId() {
    const prefix = Math.random() > 0.5 ? 'LOAN' : 'DEBT';
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}-${num}`;
}

// ============================================
// 3. НАВИГАЦИЯ
// ============================================
function initNavigation() {
    document.querySelectorAll('.nav-link[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
            document.getElementById(`page-${btn.dataset.page}`).classList.add('active');
            
            // Перерисовываем графики при переключении на аналитику
            if (btn.dataset.page === 'analytics' && charts.polar) {
                charts.polar.resize();
                charts.bar.resize();
            }
        });
    });
}

// ============================================
// 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================
function formatMoney(n) { 
    if (n === undefined || n === null) return '0';
    return Number(n).toLocaleString('ru-RU'); 
}

function formatDate(d) { 
    if (!d || d === '-') return d; 
    const dt = new Date(d); 
    if (isNaN(dt.getTime())) return d;
    return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`; 
}

function getProgress(remaining, total) { 
    if (!total || total === 0) return 0;
    return Math.max(0, Math.min(100, 100 - (remaining / total * 100))); 
}

function getStatusBadge(s) {
    const map = { 
        active: '<span class="status-badge status-active"><span class="dot"></span>Активен</span>', 
        overdue: '<span class="status-badge status-overdue"><span class="dot"></span>Просрочка</span>', 
        closed: '<span class="status-badge status-closed"><span class="dot"></span>Закрыт</span>' 
    };
    return map[s] || '';
}

function getOrgIcon(type) { 
    if (!type) return 'bi-bank';
    return type.includes('МФО') || type.includes('МКК') ? 'bi-bank' : 
           type.includes('Кредит') ? 'bi-credit-card' : 'bi-bag'; 
}

function getTypePeriod(type) {
    const periodMap = {
        'Займ МФО': 'день', 'Займ МКК': 'день', 'Займ (МФО/МКК)': 'день',
        'Кредит наличными': 'мес', 'Кредитная карта': 'мес', 'Кредит (Банк)': 'мес',
        'Автокредит': 'мес', 'Рассрочка': 'мес'
    };
    return periodMap[type] || 'год';
}

// ============================================
// 5. RENDER FUNCTIONS
// ============================================
function renderDashboard() {
    const active = contracts.filter(c => c.status === 'active');
    const totalDebt = contracts.reduce((s, c) => s + (c.remaining || 0), 0);
    const monthly = active.reduce((s, c) => s + (c.payment || 0), 0);
    const nextDate = active.length > 0 ? active.reduce((min, c) => c.next < min ? c.next : min, '9999-99-99') : null;
    
    document.getElementById('totalDebt').textContent = `₽ ${formatMoney(totalDebt)}`;
    document.getElementById('monthlyPayment').textContent = `₽ ${formatMoney(monthly)}`;
    document.getElementById('nextPaymentDate').textContent = !nextDate || nextDate === '9999-99-99' ? '—' : formatDate(nextDate);
    document.getElementById('activeContracts').textContent = active.length;
    document.getElementById('donutTotal').textContent = contracts.length;

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
    const overdue = contracts.filter(c => c.status === 'overdue');
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
    
    if (contracts.length === 0) {
        html += `
        <div class="alert-item">
            <div class="alert-icon ok"><i class="bi bi-info-circle"></i></div>
            <div>
                <div class="alert-text">Нет активных договоров</div>
                <div class="alert-time">Добавьте первый договор</div>
            </div>
        </div>`;
    } else {
        html += `
        <div class="alert-item">
            <div class="alert-icon ok"><i class="bi bi-check-circle"></i></div>
            <div>
                <div class="alert-text">Кредитная нагрузка в норме</div>
                <div class="alert-time">Долг/Доход: ~35%</div>
            </div>
        </div>`;
    }
    alerts.innerHTML = html;
}

function renderAllLoans() {
    document.getElementById('allLoansBody').innerHTML = contracts.map((c, i) => `
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
            <td>${c.rate || 0}% / ${getTypePeriod(c.type)}</td>
            <td><span class="amount-value">₽ ${formatMoney(c.remaining)}</span></td>
            <td>${c.closedDate ? formatDate(c.closedDate) : '—'}</td>
            <td>${getStatusBadge(c.status)}</td>
            <td>
                <button class="action-btn" title="Редактировать" onclick="editContract('${c.id}')"><i class="bi bi-pencil"></i></button>
                <button class="action-btn" title="Удалить" onclick="deleteContract('${c.id}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderFiltered(filter) {
    const list = contracts.filter(c => c.status === filter);
    const getBodyId = filter === 'active' ? 'activeBody' : filter === 'overdue' ? 'overdueBody' : 'closedBody';
    const tbody = document.getElementById(getBodyId);
    if(!tbody) return;
    
    if(filter === 'closed') {
        tbody.innerHTML = list.map(c => `
            <tr>
                <td>${c.org}</td>
                <td>${c.type}</td>
                <td>₽ ${formatMoney(c.amount)}</td>
                <td>₽ ${formatMoney(c.totalPaid || c.amount)}</td>
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
                <td><span class="days-overdue">${c.daysOverdue || 0} дн.</span></td>
                <td>₽ ${formatMoney(c.penalty || 0)}</td>
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
    const sorted = contracts.filter(c => c.status === 'active').sort((a,b) => (a.next || '').localeCompare(b.next || ''));
    const tbody = document.getElementById('calendarBody');
    if (!tbody) return;
    tbody.innerHTML = sorted.length > 0 ? sorted.map(c => `
        <tr>
            <td style="font-weight:600">${formatDate(c.next)}</td>
            <td>${c.org}</td>
            <td><span class="amount-value">₽ ${formatMoney(c.payment)}</span></td>
            <td><span class="status-badge status-pending"><span class="dot"></span>Ожидает</span></td>
        </tr>
    `).join('') : '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text-muted)">Нет предстоящих платежей</td></tr>';
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
// 6. CHARTS
// ============================================
function initCharts() {
    Chart.defaults.color = '#8888a0';
    Chart.defaults.font.family = 'Inter';
    Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.04)';
    
    charts.line = new Chart(document.getElementById('lineChart'), {
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

    charts.doughnut = new Chart(document.getElementById('doughnutChart'), {
        type: 'doughnut',
        data: {
            labels: ['МФО/МКК', 'Банки', 'Рассрочки'],
            datasets: [{ data: [15, 75, 10], backgroundColor: ['#f59e0b','#4a7dff','#a78bfa'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 12 } } } } }
    });

    charts.polar = new Chart(document.getElementById('polarChart'), {
        type: 'polarArea',
        data: {
            labels: ['Займы МФО', 'Кредиты наличными', 'Автокредиты', 'Кредитные карты', 'Рассрочки'],
            datasets: [{ data: [12, 35, 28, 15, 10], backgroundColor: ['rgba(245,158,11,0.7)','rgba(74,125,255,0.7)','rgba(52,211,153,0.7)','rgba(244,114,182,0.7)','rgba(167,139,250,0.7)'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, font: { size: 11 } } } }, scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.06)' } } } }
    });

    charts.bar = new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
            labels: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'],
            datasets: [{ label: 'Платежи (тыс. ₽)', data: [52,52,52,52,48,48,48,45,45,42,42,40], backgroundColor: '#34d399', borderRadius: 6, barThickness: 20 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v=>v+'K' } } } }
    });
}

// ============================================
// 7. МОДАЛЬНОЕ ОКНО - ДОБАВЛЕНИЕ/РЕДАКТИРОВАНИЕ
// ============================================
let editingContractId = null;

function bindModal() {
    const saveBtn = document.getElementById('saveLoanBtn');
    if (!saveBtn) return;
    
    saveBtn.addEventListener('click', () => {
        // Получаем значения из формы
        const org = document.querySelector('#addLoanModal input[placeholder*="Займер"]').value.trim();
        const type = document.querySelector('#addLoanModal select').value;
        const amount = parseFloat(document.querySelector('#addLoanModal input[placeholder="100000"]').value);
        const remaining = parseFloat(document.querySelector('#addLoanModal input[placeholder="45000"]').value);
        const payment = parseFloat(document.querySelector('#addLoanModal input[placeholder="12000"]').value);
        const rate = parseFloat(document.querySelector('#addLoanModal input[placeholder="0.8"]').value);
        const nextDate = document.querySelector('#addLoanModal input[type="date"]').value;
        const comment = document.querySelector('#addLoanModal textarea').value.trim();
        
        // Валидация
        const errors = [];
        if (!org) errors.push('Название организации');
        if (!type) errors.push('Тип договора');
        if (!amount || amount <= 0) errors.push('Сумма');
        if (remaining === undefined || remaining < 0) errors.push('Остаток');
        if (!payment || payment < 0) errors.push('Ежемесячный платёж');
        if (rate === undefined || rate < 0) errors.push('Ставка');
        if (!nextDate && type !== 'Рассрочка') errors.push('Дата следующего платежа');
        
        if (errors.length > 0) {
            showToast(`⚠️ Заполните поля: ${errors.join(', ')}`, 'error');
            return;
        }
        
        // Определяем статус
        let status = 'active';
        if (remaining <= 0) status = 'closed';
        
        const newContract = {
            id: editingContractId || generateId(),
            org,
            type: getTypeFullName(type),
            amount,
            remaining,
            rate,
            payment,
            next: nextDate || '-',
            status,
            daysOverdue: 0,
            penalty: 0,
            openDate: new Date().toISOString().split('T')[0],
            closedDate: status === 'closed' ? new Date().toISOString().split('T')[0] : null,
            totalPaid: status === 'closed' ? amount : 0,
            comment
        };
        
        if (editingContractId) {
            // Редактирование
            const idx = contracts.findIndex(c => c.id === editingContractId);
            if (idx !== -1) {
                newContract.openDate = contracts[idx].openDate;
                contracts[idx] = newContract;
                showToast('✅ Договор обновлён', 'success');
            }
        } else {
            // Добавление нового
            contracts.push(newContract);
            showToast('✅ Договор добавлен', 'success');
        }
        
        saveContracts();
        
        // Закрываем модальное окно и очищаем форму
        const modal = bootstrap.Modal.getInstance(document.getElementById('addLoanModal'));
        modal.hide();
        resetModalForm();
        editingContractId = null;
    });
}

function getTypeFullName(shortType) {
    const map = {
        'Займ (МФО/МКК)': 'Займ МФО',
        'Кредит (Банк)': 'Кредит наличными',
        'Рассрочка': 'Рассрочка'
    };
    return map[shortType] || shortType;
}

function resetModalForm() {
    document.querySelectorAll('#addLoanModal input, #addLoanModal select, #addLoanModal textarea').forEach(el => {
        if (el.type === 'date') el.value = '';
        else if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else el.value = '';
    });
}

function editContract(id) {
    const contract = contracts.find(c => c.id === id);
    if (!contract) return;
    
    editingContractId = id;
    
    // Заполняем форму
    document.querySelector('#addLoanModal input[placeholder*="Займер"]').value = contract.org;
    const typeSelect = document.querySelector('#addLoanModal select');
    if (contract.type.includes('МФО') || contract.type.includes('МКК')) typeSelect.value = 'Займ (МФО/МКК)';
    else if (contract.type.includes('Кредит')) typeSelect.value = 'Кредит (Банк)';
    else typeSelect.value = 'Рассрочка';
    
    document.querySelector('#addLoanModal input[placeholder="100000"]').value = contract.amount;
    document.querySelector('#addLoanModal input[placeholder="45000"]').value = contract.remaining;
    document.querySelector('#addLoanModal input[placeholder="12000"]').value = contract.payment;
    document.querySelector('#addLoanModal input[placeholder="0.8"]').value = contract.rate;
    document.querySelector('#addLoanModal input[type="date"]').value = contract.next !== '-' ? contract.next : '';
    document.querySelector('#addLoanModal textarea').value = contract.comment || '';
    
    // Открываем модальное окно
    const modal = new bootstrap.Modal(document.getElementById('addLoanModal'));
    modal.show();
}

function deleteContract(id) {
    if (!confirm('Вы уверены, что хотите удалить этот договор?')) return;
    
    contracts = contracts.filter(c => c.id !== id);
    saveContracts();
    showToast('✅ Договор удалён', 'success');
}

// ============================================
// 8. ЭКСПОРТ В CSV
// ============================================
function bindExport() {
    const exportBtn = document.querySelector('button.btn-dark-custom i.bi-download')?.parentElement;
    if (!exportBtn) return;
    
    exportBtn.addEventListener('click', () => {
        exportToCSV();
    });
}

function exportToCSV() {
    if (contracts.length === 0) {
        showToast('⚠️ Нет данных для экспорта', 'error');
        return;
    }
    
    const headers = ['ID', 'Организация', 'Тип', 'Сумма', 'Остаток', 'Ставка %', 'Платёж', 'След. платеж', 'Статус', 'Дата открытия', 'Комментарий'];
    const rows = contracts.map(c => [
        c.id,
        `"${c.org}"`,
        `"${c.type}"`,
        c.amount,
        c.remaining,
        c.rate,
        c.payment,
        c.next,
        c.status,
        c.openDate,
        `"${c.comment || ''}"`
    ]);
    
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `finmonitor_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('✅ Данные экспортированы', 'success');
}

// ============================================
// 9. ПОИСК И ФИЛЬТРАЦИЯ
// ============================================
function bindSearch() {
    // Создаём поле поиска в разделе "Все договоры"
    const header = document.querySelector('#page-all-loans .data-card-header');
    if (!header) return;
    
    const searchContainer = document.createElement('div');
    searchContainer.className = 'me-3';
    searchContainer.innerHTML = `
        <input type="text" id="searchInput" class="form-control form-control-dark" 
               placeholder="🔍 Поиск по названию..." style="min-width:200px;">
    `;
    header.insertBefore(searchContainer, header.querySelector('.d-flex'));
    
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        filterTable(query);
    });
}

function filterTable(query) {
    if (!query) {
        renderAllLoans();
        return;
    }
    
    const filtered = contracts.filter(c => 
        c.org.toLowerCase().includes(query) || 
        c.id.toLowerCase().includes(query) ||
        c.type.toLowerCase().includes(query)
    );
    
    const tbody = document.getElementById('allLoansBody');
    tbody.innerHTML = filtered.length > 0 ? filtered.map((c, i) => `
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
            <td>${c.rate || 0}% / ${getTypePeriod(c.type)}</td>
            <td><span class="amount-value">₽ ${formatMoney(c.remaining)}</span></td>
            <td>${c.closedDate ? formatDate(c.closedDate) : '—'}</td>
            <td>${getStatusBadge(c.status)}</td>
            <td>
                <button class="action-btn" title="Редактировать" onclick="editContract('${c.id}')"><i class="bi bi-pencil"></i></button>
                <button class="action-btn" title="Удалить" onclick="deleteContract('${c.id}')"><i class="bi bi-trash"></i></button>
            </td>
        </tr>
    `).join('') : '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">Ничего не найдено</td></tr>';
}

// ============================================
// 10. УВЕДОМЛЕНИЯ (TOAST)
// ============================================
function initToast() {
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.cssText = `
        position: fixed; top: 80px; right: 20px; z-index: 9999;
        display: flex; flex-direction: column; gap: 10px; max-width: 350px;
    `;
    document.body.appendChild(toastContainer);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const colors = {
        success: 'var(--accent-green)',
        error: 'var(--accent-red)',
        info: 'var(--accent-blue)'
    };
    const icons = {
        success: 'bi-check-circle',
        error: 'bi-exclamation-triangle',
        info: 'bi-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: var(--bg-card); border-left: 4px solid ${colors[type]};
        border-radius: 8px; padding: 14px 18px; display: flex; align-items: center; gap: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4); animation: slideIn 0.3s ease;
    `;
    toast.innerHTML = `
        <i class="bi ${icons[type]}" style="color: ${colors[type]}; font-size: 20px;"></i>
        <span style="font-size: 14px; font-weight: 500;">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Добавляем CSS анимации для тостов
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);