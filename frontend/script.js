// ============================================================
// BUDGET TRACKER – Front-end Logic (Supabase via /api)
// ============================================================

const API = {
  incomes: '/api/incomes',
  fixed: '/api/fixed-expenses',
  daily: '/api/daily-expenses',
};

let currentTab = 'fixed';
let editingItem = null;
let fixedExpenses = [];
let dailyExpenses = [];
let incomes = [];

const CATEGORY_META = {
  'Tiền Mua Nhà': { icon: '🏠', color: '#e8f5e9', fg: '#43a047' },
  'Tiền Sinh Hoạt': { icon: '🏡', color: '#fff3e0', fg: '#ef6c00' },
  'Thẻ Tín Dụng': { icon: '💳', color: '#fce4ec', fg: '#e53935' },
};

const ITEM_ICONS = {
  'Tiền gốc': { icon: '🏠', bg: '#e8f5e9', fg: '#43a047' },
  'Tiền lãi': { icon: '🏠', bg: '#fff3e0', fg: '#ef6c00' },
  'Tiền Điện': { icon: '⚡', bg: '#fff3e0', fg: '#ef6c00' },
  'Tiền Nước': { icon: '💧', bg: '#e3f2fd', fg: '#1e88e5' },
  'Tiền Mạng': { icon: '📡', bg: '#ede7f6', fg: '#5e35b1' },
  'Phí dịch vụ': { icon: '🏢', bg: '#e0f2f1', fg: '#00897b' },
  'Phí gửi xe': { icon: '🏍️', bg: '#fce4ec', fg: '#d81b60' },
  'Thẻ tín dụng HSBC': { icon: '💳', bg: '#fce4ec', fg: '#e53935' },
  'Thẻ tín dụng VCB': { icon: '💳', bg: '#e8f5e9', fg: '#43a047' },
};

function fmt(n) {
  return Number(n || 0).toLocaleString('vi-VN') + '₫';
}

function parseAmt(str) {
  return parseInt(String(str).replace(/[.₫\s]/g, ''), 10) || 0;
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function formatMetaDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `Hôm nay, ${time}` : d.toLocaleDateString('vi-VN') + ', ' + time;
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');

  document.querySelectorAll('.tab-content').forEach((l) => l.classList.remove('active'));
  document.getElementById('content-' + tab).classList.add('active');

  const fab = document.getElementById('fab');
  if (fab) fab.style.display = 'flex';

  checkEmpty();
}

function checkEmpty() {
  if (currentTab === 'daily') {
    const list = document.getElementById('daily-list');
    const empty = document.getElementById('empty-state');
    empty.style.display = list.children.length === 0 ? 'block' : 'none';
  }
}

function updateSummary() {
  let INCOME = 0;
  let fixedTotal = 0;
  let dailyTotal = 0;

  incomes.forEach((row) => {
    INCOME += Number(row.amount) || 0;
  });
  document.getElementById('income-display').textContent = fmt(INCOME);

  fixedExpenses.forEach((row) => {
    const actual = Number(row.actual_amount) || 0;
    const estimate = Number(row.estimate_amount) || 0;
    fixedTotal += actual > 0 ? actual : estimate;
  });

  dailyExpenses.forEach((row) => {
    dailyTotal += Number(row.amount) || 0;
  });

  const total = fixedTotal + dailyTotal;
  const remaining = INCOME - total;
  const pct = INCOME > 0 ? Math.min(Math.round((total / INCOME) * 100), 100) : 0;

  document.getElementById('spent-display').textContent = fmt(total);
  document.getElementById('remaining-display').textContent = fmt(remaining);
  document.getElementById('sum-fixed').textContent = fmt(fixedTotal);
  document.getElementById('sum-daily').textContent = fmt(dailyTotal);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = 'Đã chi ' + pct + '% thu nhập';

  checkEmpty();
}

function dueLabel(row) {
  if (row.is_paid) return { text: 'Đã trả ✓', className: 'item-due paid' };
  if (row.due_day) {
    const today = new Date().getDate();
    const dueNum = Number(row.due_day);
    if (dueNum >= today) {
      const diff = dueNum - today;
      return {
        text: `Còn ${diff} ngày`,
        className: diff <= 3 ? 'item-due warning' : 'item-due',
      };
    }
  }
  return { text: 'Chưa trả', className: 'item-due' };
}

function renderFixed() {
  const container = document.getElementById('content-fixed');
  const groups = {};
  fixedExpenses.forEach((row) => {
    const cat = row.category || 'Khác';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(row);
  });

  const order = ['Tiền Mua Nhà', 'Tiền Sinh Hoạt', 'Thẻ Tín Dụng'];
  const cats = [
    ...order.filter((c) => groups[c]),
    ...Object.keys(groups).filter((c) => !order.includes(c)),
  ];

  if (cats.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><span class="empty-icon">📭</span><p>Chưa có khoản cố định</p></div>';
    return;
  }

  container.innerHTML = cats
    .map((cat) => {
      const meta = CATEGORY_META[cat] || { icon: '📌' };
      const items = groups[cat]
        .map((row) => {
          const actual = Number(row.actual_amount) || 0;
          const estimate = Number(row.estimate_amount) || 0;
          const amt = actual > 0 ? actual : estimate;
          const due = dueLabel(row);
          const icon = ITEM_ICONS[row.name] || {
            icon: meta.icon || '📌',
            bg: meta.color || '#eceff1',
            fg: meta.fg || '#546e7a',
          };
          const metaText = row.due_day ? `Ngày ${row.due_day} hàng tháng` : 'Phát sinh';
          return `
            <li class="item" data-id="${row.id}">
              <div class="item-icon" style="background:${icon.bg}; color:${icon.fg};">${icon.icon}</div>
              <div class="item-body">
                <span class="item-name">${escHtml(row.name)}</span>
                <span class="item-meta">${escHtml(metaText)}</span>
              </div>
              <div class="item-right">
                <span class="item-amount">${fmt(amt)}</span>
                <span class="${due.className}">${due.text}</span>
              </div>
              <div class="item-actions">
                <button class="action-btn edit" onclick="editFixedItem(this)" aria-label="Sửa">✏️</button>
                <button class="action-btn delete" onclick="deleteFixedFromList(this)" aria-label="Xóa">🗑️</button>
              </div>
            </li>`;
        })
        .join('');

      return `
        <div class="list-group">
          <h3 class="list-group-title">${meta.icon} ${escHtml(cat)}</h3>
          <ul class="item-list">${items}</ul>
        </div>`;
    })
    .join('');
}

function renderDaily() {
  const list = document.getElementById('daily-list');
  list.innerHTML = dailyExpenses
    .map(
      (row) => `
      <li class="item" data-id="${row.id}">
        <div class="item-body">
          <span class="item-name">${escHtml(row.name)}</span>
          <span class="item-meta">${escHtml(formatMetaDate(row.created_at) || 'Chi tiêu')}</span>
        </div>
        <div class="item-right">
          <span class="item-amount">${fmt(row.amount)}</span>
        </div>
        <div class="item-actions">
          <button class="action-btn edit" onclick="editItem(this)" aria-label="Sửa">✏️</button>
          <button class="action-btn delete" onclick="deleteItem(this)" aria-label="Xóa">🗑️</button>
        </div>
      </li>`
    )
    .join('');
  checkEmpty();
}

function renderIncomes() {
  const list = document.getElementById('income-list');
  list.innerHTML = incomes
    .map(
      (row) => `
      <li class="item" data-id="${row.id}" data-amount="${row.amount}">
        <div class="item-body">
          <span class="item-name">${escHtml(row.name)}</span>
          <span class="item-meta">Nguồn thu</span>
        </div>
        <div class="item-right">
          <span class="item-amount" style="color:var(--green);">${fmt(row.amount)}</span>
        </div>
        <div class="item-actions">
          <button class="action-btn edit" onclick="editIncomeItem(this)" aria-label="Sửa">✏️</button>
          <button class="action-btn delete" onclick="deleteItem(this)" aria-label="Xóa">🗑️</button>
        </div>
      </li>`
    )
    .join('');
}

function openModal() {
  document.getElementById('input-name').value = '';
  document.getElementById('input-amount').value = '';
  document.getElementById('input-due').value = '';
  document.getElementById('input-category').value = 'Tiền Sinh Hoạt';

  const isFixed = currentTab === 'fixed';
  document.getElementById('group-category').style.display = isFixed ? '' : 'none';
  document.getElementById('group-due').style.display = isFixed ? '' : 'none';
  document.getElementById('label-amount').textContent = isFixed ? 'Dự tính (₫)' : 'Số tiền (₫)';

  const titles = {
    income: 'Thêm Nguồn Thu',
    fixed: 'Thêm Khoản Cố Định',
    daily: 'Thêm Chi Phí Hàng Ngày',
  };
  document.getElementById('modal-title').textContent = titles[currentTab] || titles.daily;

  document.getElementById('modal').classList.add('active');
  document.getElementById('modal-overlay').classList.add('active');

  setTimeout(() => document.getElementById('input-name').focus(), 350);
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  document.getElementById('modal-overlay').classList.remove('active');
}

async function saveExpense() {
  const name = document.getElementById('input-name').value.trim();
  const amount = parseInt(document.getElementById('input-amount').value, 10);

  if (!name || isNaN(amount) || amount <= 0) {
    const modal = document.getElementById('modal');
    modal.style.animation = 'none';
    void modal.offsetHeight;
    modal.style.animation = 'shake 0.4s ease';
    return;
  }

  try {
    if (currentTab === 'income') {
      const row = await api(API.incomes, {
        method: 'POST',
        body: JSON.stringify({ name, amount }),
      });
      incomes.push(row);
      renderIncomes();
    } else if (currentTab === 'fixed') {
      const category = document.getElementById('input-category').value;
      const dueRaw = document.getElementById('input-due').value.trim();
      const row = await api(API.fixed, {
        method: 'POST',
        body: JSON.stringify({
          name,
          category,
          estimate_amount: amount,
          actual_amount: 0,
          due_day: dueRaw,
          is_paid: false,
        }),
      });
      fixedExpenses.push(row);
      renderFixed();
    } else {
      const row = await api(API.daily, {
        method: 'POST',
        body: JSON.stringify({ name, amount }),
      });
      dailyExpenses.unshift(row);
      renderDaily();
    }
    closeModal();
    updateSummary();
  } catch (err) {
    alert('Không lưu được: ' + err.message);
  }
}

function editItem(btn) {
  editingItem = btn.closest('.item');
  const name = editingItem.querySelector('.item-name').textContent;
  const amount = parseAmt(editingItem.querySelector('.item-amount').textContent);

  document.getElementById('edit-name').value = name;
  document.getElementById('edit-amount').value = amount;

  document.getElementById('edit-modal').classList.add('active');
  document.getElementById('edit-overlay').classList.add('active');

  setTimeout(() => document.getElementById('edit-name').focus(), 350);
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('active');
  document.getElementById('edit-overlay').classList.remove('active');
  editingItem = null;
}

async function saveEdit() {
  if (!editingItem) return;

  const id = editingItem.getAttribute('data-id');
  const name = document.getElementById('edit-name').value.trim();
  const amount = parseInt(document.getElementById('edit-amount').value, 10);

  if (!name || isNaN(amount) || amount <= 0) return;

  try {
    const row = await api(API.daily, {
      method: 'PUT',
      body: JSON.stringify({ id, name, amount }),
    });
    const idx = dailyExpenses.findIndex((r) => r.id === id);
    if (idx >= 0) dailyExpenses[idx] = row;
    renderDaily();
    closeEditModal();
    updateSummary();
  } catch (err) {
    alert('Không cập nhật được: ' + err.message);
  }
}

function editFixedItem(btn) {
  editingItem = btn.closest('.item');
  const id = editingItem.getAttribute('data-id');
  const row = fixedExpenses.find((r) => r.id === id);
  if (!row) return;

  document.getElementById('edit-fixed-title').textContent = row.name;
  document.getElementById('edit-fixed-due').value = row.due_day ?? '';
  document.getElementById('edit-fixed-estimate').value = row.estimate_amount ?? '';
  document.getElementById('edit-fixed-actual').value = row.actual_amount || '';
  document.getElementById('edit-fixed-paid').checked = Boolean(row.is_paid);

  document.getElementById('edit-fixed-modal').classList.add('active');
  document.getElementById('edit-fixed-overlay').classList.add('active');

  setTimeout(() => document.getElementById('edit-fixed-actual').focus(), 350);
}

function closeEditFixedModal() {
  document.getElementById('edit-fixed-modal').classList.remove('active');
  document.getElementById('edit-fixed-overlay').classList.remove('active');
  editingItem = null;
}

async function saveEditFixed() {
  if (!editingItem) return;

  const id = editingItem.getAttribute('data-id');
  const due = document.getElementById('edit-fixed-due').value.trim();
  const est = parseInt(document.getElementById('edit-fixed-estimate').value, 10) || 0;
  const act = parseInt(document.getElementById('edit-fixed-actual').value, 10) || 0;
  const paid = document.getElementById('edit-fixed-paid').checked;

  try {
    const row = await api(API.fixed, {
      method: 'PUT',
      body: JSON.stringify({
        id,
        estimate_amount: est,
        actual_amount: act,
        due_day: due,
        is_paid: paid,
      }),
    });
    const idx = fixedExpenses.findIndex((r) => r.id === id);
    if (idx >= 0) fixedExpenses[idx] = row;
    renderFixed();
    closeEditFixedModal();
    updateSummary();
  } catch (err) {
    alert('Không cập nhật được: ' + err.message);
  }
}

function editIncomeItem(btn) {
  editingItem = btn.closest('.item');
  const title = editingItem.querySelector('.item-name').textContent;
  const amount = editingItem.getAttribute('data-amount') || '';

  document.getElementById('edit-income-title').textContent = title;
  document.getElementById('edit-income-name').value = title;
  document.getElementById('edit-income-amount').value = amount;

  document.getElementById('edit-income-modal').classList.add('active');
  document.getElementById('edit-income-overlay').classList.add('active');

  setTimeout(() => document.getElementById('edit-income-amount').focus(), 350);
}

function closeEditIncomeModal() {
  document.getElementById('edit-income-modal').classList.remove('active');
  document.getElementById('edit-income-overlay').classList.remove('active');
  editingItem = null;
}

async function saveEditIncome() {
  if (!editingItem) return;

  const id = editingItem.getAttribute('data-id');
  const name = document.getElementById('edit-income-name').value.trim();
  const amount = parseInt(document.getElementById('edit-income-amount').value, 10) || 0;

  if (!name || amount <= 0) return;

  try {
    const row = await api(API.incomes, {
      method: 'PUT',
      body: JSON.stringify({ id, name, amount }),
    });
    const idx = incomes.findIndex((r) => r.id === id);
    if (idx >= 0) incomes[idx] = row;
    renderIncomes();
    closeEditIncomeModal();
    updateSummary();
  } catch (err) {
    alert('Không cập nhật được: ' + err.message);
  }
}

async function deleteItem(btn) {
  const item = btn.closest('.item');
  const id = item.getAttribute('data-id');
  const isIncome = currentTab === 'income';
  const endpoint = isIncome ? API.incomes : API.daily;

  try {
    await api(endpoint, {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });

    if (isIncome) {
      incomes = incomes.filter((r) => r.id !== id);
      renderIncomes();
    } else {
      dailyExpenses = dailyExpenses.filter((r) => r.id !== id);
      renderDaily();
    }
    updateSummary();
  } catch (err) {
    alert('Không xóa được: ' + err.message);
  }
}

async function deleteFixedFromList(btn) {
  const item = btn.closest('.item');
  const id = item.getAttribute('data-id');
  if (!confirm('Xóa khoản cố định này?')) return;
  try {
    await api(API.fixed, { method: 'DELETE', body: JSON.stringify({ id }) });
    fixedExpenses = fixedExpenses.filter((r) => r.id !== id);
    renderFixed();
    updateSummary();
  } catch (err) {
    alert('Không xóa được: ' + err.message);
  }
}

async function deleteFixedItem() {
  if (!editingItem) return;
  const id = editingItem.getAttribute('data-id');
  if (!confirm('Xóa khoản cố định này?')) return;
  try {
    await api(API.fixed, { method: 'DELETE', body: JSON.stringify({ id }) });
    fixedExpenses = fixedExpenses.filter((r) => r.id !== id);
    renderFixed();
    closeEditFixedModal();
    updateSummary();
  } catch (err) {
    alert('Không xóa được: ' + err.message);
  }
}

async function loadAll() {
  const status = document.getElementById('load-status');
  if (status) status.textContent = 'Đang tải dữ liệu...';

  try {
    const [fixed, daily, incomeRows] = await Promise.all([
      api(API.fixed),
      api(API.daily),
      api(API.incomes),
    ]);
    fixedExpenses = fixed;
    dailyExpenses = daily;
    incomes = incomeRows;
    renderFixed();
    renderDaily();
    renderIncomes();
    updateSummary();
    if (status) status.textContent = '';
  } catch (err) {
    console.error(err);
    if (status) status.textContent = 'Không kết nối được database. Chạy API local hoặc deploy Vercel.';
  }
}

const now = new Date();
document.querySelector('.header-sub').textContent =
  'Tháng ' + (now.getMonth() + 1) + ', ' + now.getFullYear();

loadAll();
