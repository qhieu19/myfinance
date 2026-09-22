// ============================================================
// BUDGET TRACKER – Front-end Logic (Supabase Direct via supabase-js)
// ============================================================

const supabase = window.supabase.createClient(
  window.MYFINANCE_CONFIG.url,
  window.MYFINANCE_CONFIG.anonKey
);

let currentTab = 'fixed';
let editingItem = null;
let fixedExpenses = [];
let dailyExpenses = [];
let incomes = [];
let ccSpendings = [];

const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth() + 1;

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

function ymQuery() {
  return `year=${viewYear}&month=${viewMonth}`;
}

function ymBody(extra = {}) {
  return { ...extra, year: viewYear, month: viewMonth };
}

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
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `Hôm nay, ${time}` : d.toLocaleDateString('vi-VN') + ', ' + time;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function updateMonthLabel() {
  document.getElementById('month-label').textContent =
    'Tháng ' + viewMonth + ', ' + viewYear;
}

function updateExportReminder() {
  const btn = document.getElementById('btn-export');
  if (!btn) return;
  const day = new Date().getDate();
  const remind = day >= 25 && day <= 30;
  btn.classList.toggle('remind', remind);
  btn.title = remind
    ? 'Cuối tháng rồi — hãy xuất CSV để lưu sổ!'
    : 'Xuất dữ liệu tháng đang xem ra CSV';
}

function shiftMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 1) {
    viewMonth = 12;
    viewYear -= 1;
  } else if (viewMonth > 12) {
    viewMonth = 1;
    viewYear += 1;
  }
  updateMonthLabel();
  loadAll();
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
  } else if (currentTab === 'cc') {
    const list = document.getElementById('cc-list');
    const empty = document.getElementById('cc-empty-state');
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

  const isCurrentView =
    viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1;

  if (isCurrentView && row.due_day) {
    const dueNum = Number(row.due_day);
    const day = today.getDate();
    if (dueNum >= day) {
      const diff = dueNum - day;
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
      '<div class="empty-state"><span class="empty-icon">📭</span><p>Chưa có khoản cố định tháng này</p></div>';
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
          const paidClass = row.is_paid ? 'paid' : 'unpaid';
          const icon = ITEM_ICONS[row.name] || {
            icon: meta.icon || '📌',
            bg: meta.color || '#eceff1',
            fg: meta.fg || '#546e7a',
          };
          const metaText = row.due_day ? `Ngày ${row.due_day} hàng tháng` : 'Phát sinh';
          return `
            <li class="item" data-id="${row.id}" data-paid="${row.is_paid ? 'true' : 'false'}">
              <div class="item-icon" style="background:${icon.bg}; color:${icon.fg};">${icon.icon}</div>
              <div class="item-body">
                <span class="item-name">${escHtml(row.name)}</span>
                <span class="item-meta">${escHtml(metaText)}</span>
              </div>
              <div class="item-right">
                <span class="item-amount ${paidClass}">${fmt(amt)}</span>
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
          <span class="item-amount unpaid">${fmt(row.amount)}</span>
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

function renderCc() {
  const list = document.getElementById('cc-list');
  list.innerHTML = ccSpendings
    .map(
      (row) => `
      <li class="item" data-id="${row.id}">
        <div class="item-body">
          <span class="item-name">${escHtml(row.card_name)}</span>
          <span class="item-meta">${escHtml(formatMetaDate(row.transaction_date) || 'Chi tiêu thẻ')}</span>
        </div>
        <div class="item-right">
          <span class="item-amount" style="color: #e53935;">${fmt(row.amount)}</span>
        </div>
        <div class="item-actions">
          <button class="action-btn edit" onclick="editCcItem(this)" aria-label="Sửa">✏️</button>
          <button class="action-btn delete" onclick="deleteCcFromList(this)" aria-label="Xóa">🗑️</button>
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
          <span class="item-amount paid">${fmt(row.amount)}</span>
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
    cc: 'Thêm Tiêu Thẻ Tín Dụng',
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

async function saveExpense(btn) {
  if (btn && btn.disabled) return;
  const name = document.getElementById('input-name').value.trim();
  const amount = parseAmt(document.getElementById('input-amount').value);

  if (!name || isNaN(amount) || amount <= 0) {
    const modal = document.getElementById('modal');
    modal.style.animation = 'none';
    void modal.offsetHeight;
    modal.style.animation = 'shake 0.4s ease';
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.dataset.text = btn.textContent;
    btn.textContent = 'Đang lưu...';
  }

  try {
    if (currentTab === 'income') {
      const { data, error } = await supabase.from('incomes').insert([ymBody({ name, amount })]).select().single();
      if (error) throw error;
      incomes.push(data);
      renderIncomes();
    } else if (currentTab === 'fixed') {
      const category = document.getElementById('input-category').value;
      const dueRaw = document.getElementById('input-due').value.trim();
      const { data, error } = await supabase.from('fixed_expenses').insert([
        ymBody({
          name,
          category,
          estimate_amount: amount,
          actual_amount: 0,
          due_day: dueRaw || null,
          is_paid: false,
        })
      ]).select().single();
      if (error) throw error;
      fixedExpenses.push(data);
      renderFixed();
    } else if (currentTab === 'cc') {
      const { data, error } = await supabase.from('credit_card_spendings').insert([ymBody({ card_name: name, amount })]).select().single();
      if (error) throw error;
      ccSpendings.unshift(data);
      renderCc();
    } else {
      const { data, error } = await supabase.from('daily_expenses').insert([ymBody({ name, amount })]).select().single();
      if (error) throw error;
      dailyExpenses.unshift(data);
      renderDaily();
    }
    closeModal();
    updateSummary();
  } catch (err) {
    alert('Không lưu được: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = btn.dataset.text;
    }
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

async function saveEdit(btn) {
  if (!editingItem) return;
  if (btn && btn.disabled) return;

  const id = editingItem.getAttribute('data-id');
  const name = document.getElementById('edit-name').value.trim();
  const amount = parseAmt(document.getElementById('edit-amount').value);

  if (!name || isNaN(amount) || amount <= 0) return;

  if (btn) {
    btn.disabled = true;
    btn.dataset.text = btn.textContent;
    btn.textContent = 'Đang lưu...';
  }

  try {
    const { data, error } = await supabase.from('daily_expenses').update({ name, amount }).eq('id', id).select().single();
    if (error) throw error;
    const idx = dailyExpenses.findIndex((r) => String(r.id) === String(id));
    if (idx >= 0) dailyExpenses[idx] = data;
    renderDaily();
    closeEditModal();
    updateSummary();
  } catch (err) {
    alert('Không cập nhật được: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = btn.dataset.text;
    }
  }
}

function editFixedItem(btn) {
  editingItem = btn.closest('.item');
  const id = editingItem.getAttribute('data-id');
  const row = fixedExpenses.find((r) => String(r.id) === String(id));
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

async function saveEditFixed(btn) {
  if (!editingItem) return;
  if (btn && btn.disabled) return;

  const id = editingItem.getAttribute('data-id');
  const due = document.getElementById('edit-fixed-due').value.trim();
  const est = parseAmt(document.getElementById('edit-fixed-estimate').value) || 0;
  const act = parseAmt(document.getElementById('edit-fixed-actual').value) || 0;
  const paid = document.getElementById('edit-fixed-paid').checked;

  if (btn) {
    btn.disabled = true;
    btn.dataset.text = btn.textContent;
    btn.textContent = 'Đang lưu...';
  }

  try {
    const { data, error } = await supabase.from('fixed_expenses').update({
        estimate_amount: est,
        actual_amount: act,
        due_day: due || null,
        is_paid: paid,
    }).eq('id', id).select().single();
    if (error) throw error;
    
    const idx = fixedExpenses.findIndex((r) => String(r.id) === String(id));
    if (idx >= 0) fixedExpenses[idx] = data;
    renderFixed();
    closeEditFixedModal();
    updateSummary();
  } catch (err) {
    alert('Không cập nhật được: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = btn.dataset.text;
    }
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

async function saveEditIncome(btn) {
  if (!editingItem) return;
  if (btn && btn.disabled) return;

  const id = editingItem.getAttribute('data-id');
  const name = document.getElementById('edit-income-name').value.trim();
  const amount = parseAmt(document.getElementById('edit-income-amount').value) || 0;

  if (!name || amount <= 0) return;

  if (btn) {
    btn.disabled = true;
    btn.dataset.text = btn.textContent;
    btn.textContent = 'Đang lưu...';
  }

  try {
    const { data, error } = await supabase.from('incomes').update({ name, amount }).eq('id', id).select().single();
    if (error) throw error;
    
    const idx = incomes.findIndex((r) => String(r.id) === String(id));
    if (idx >= 0) incomes[idx] = data;
    renderIncomes();
    closeEditIncomeModal();
    updateSummary();
  } catch (err) {
    alert('Không cập nhật được: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = btn.dataset.text;
    }
  }
}

function editCcItem(btn) {
  editingItem = btn.closest('.item');
  const name = editingItem.querySelector('.item-name').textContent;
  const amount = parseAmt(editingItem.querySelector('.item-amount').textContent);

  document.getElementById('edit-cc-name').value = name;
  document.getElementById('edit-cc-amount').value = amount;

  document.getElementById('edit-cc-modal').classList.add('active');
  document.getElementById('edit-cc-overlay').classList.add('active');

  setTimeout(() => document.getElementById('edit-cc-name').focus(), 350);
}

function closeEditCcModal() {
  document.getElementById('edit-cc-modal').classList.remove('active');
  document.getElementById('edit-cc-overlay').classList.remove('active');
  editingItem = null;
}

async function saveEditCc(btn) {
  if (!editingItem) return;
  if (btn && btn.disabled) return;

  const id = editingItem.getAttribute('data-id');
  const name = document.getElementById('edit-cc-name').value.trim();
  const amount = parseAmt(document.getElementById('edit-cc-amount').value);

  if (!name || isNaN(amount) || amount <= 0) return;

  if (btn) {
    btn.disabled = true;
    btn.dataset.text = btn.textContent;
    btn.textContent = 'Đang lưu...';
  }

  try {
    const { data, error } = await supabase.from('credit_card_spendings').update({ card_name: name, amount }).eq('id', id).select().single();
    if (error) throw error;
    
    const idx = ccSpendings.findIndex((r) => String(r.id) === String(id));
    if (idx >= 0) ccSpendings[idx] = data;
    renderCc();
    closeEditCcModal();
  } catch (err) {
    alert('Không cập nhật được: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = btn.dataset.text;
    }
  }
}

async function deleteCcItem() {
  if (!editingItem) return;
  const id = editingItem.getAttribute('data-id');
  if (!confirm('Xóa khoản tiêu thẻ này?')) return;
  try {
    const { error } = await supabase.from('credit_card_spendings').delete().eq('id', id);
    if (error) throw error;
    
    ccSpendings = ccSpendings.filter((r) => String(r.id) !== String(id));
    renderCc();
    closeEditCcModal();
  } catch (err) {
    alert('Không xóa được: ' + err.message);
  }
}

async function deleteCcFromList(btn) {
  const item = btn.closest('.item');
  const id = item.getAttribute('data-id');
  if (!confirm('Xóa khoản tiêu thẻ này?')) return;
  try {
    const { error } = await supabase.from('credit_card_spendings').delete().eq('id', id);
    if (error) throw error;
    
    ccSpendings = ccSpendings.filter((r) => String(r.id) !== String(id));
    renderCc();
  } catch (err) {
    alert('Không xóa được: ' + err.message);
  }
}

async function deleteItem(btn) {
  const item = btn.closest('.item');
  const id = item.getAttribute('data-id');
  const isIncome = currentTab === 'income';
  const table = isIncome ? 'incomes' : 'daily_expenses';

  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;

    if (isIncome) {
      incomes = incomes.filter((r) => String(r.id) !== String(id));
      renderIncomes();
    } else {
      dailyExpenses = dailyExpenses.filter((r) => String(r.id) !== String(id));
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
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
    if (error) throw error;
    
    fixedExpenses = fixedExpenses.filter((r) => String(r.id) !== String(id));
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
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
    if (error) throw error;
    
    fixedExpenses = fixedExpenses.filter((r) => String(r.id) !== String(id));
    renderFixed();
    closeEditFixedModal();
    updateSummary();
  } catch (err) {
    alert('Không xóa được: ' + err.message);
  }
}

function exportCsv() {
  const lines = [];
  lines.push(['Loại', 'Nhóm', 'Tên', 'Số tiền', 'Ngày trả', 'Đã trả', 'Tháng', 'Năm'].join(','));

  incomes.forEach((row) => {
    lines.push(
      [
        'Thu nhập',
        '',
        csvEscape(row.name),
        row.amount,
        '',
        '',
        viewMonth,
        viewYear,
      ].join(',')
    );
  });

  fixedExpenses.forEach((row) => {
    const actual = Number(row.actual_amount) || 0;
    const estimate = Number(row.estimate_amount) || 0;
    const amt = actual > 0 ? actual : estimate;
    lines.push(
      [
        'Cố định',
        csvEscape(row.category),
        csvEscape(row.name),
        amt,
        row.due_day ?? '',
        row.is_paid ? 'Có' : 'Không',
        viewMonth,
        viewYear,
      ].join(',')
    );
  });

  dailyExpenses.forEach((row) => {
    lines.push(
      [
        'Hàng ngày',
        '',
        csvEscape(row.name),
        row.amount,
        '',
        '',
        viewMonth,
        viewYear,
      ].join(',')
    );
  });

  ccSpendings.forEach((row) => {
    lines.push(
      [
        'Thẻ tín dụng',
        '',
        csvEscape(row.card_name),
        row.amount,
        '',
        '',
        viewMonth,
        viewYear,
      ].join(',')
    );
  });

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chi-tieu-${viewYear}-${String(viewMonth).padStart(2, '0')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyMonthDataIfNeeded(year, month) {
  // Check if current month has data
  const { count: fixedCount } = await supabase.from('fixed_expenses').select('*', { count: 'exact', head: true }).eq('year', year).eq('month', month);
  const { count: incomeCount } = await supabase.from('incomes').select('*', { count: 'exact', head: true }).eq('year', year).eq('month', month);
  
  if (fixedCount > 0 && incomeCount > 0) return; // Already has data

  // Find latest month with fixed expenses before this month
  const { data: latestFixedDate } = await supabase.from('fixed_expenses')
    .select('year, month')
    .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`)
    .order('year', { ascending: false }).order('month', { ascending: false }).limit(1);
    
  if (latestFixedDate && latestFixedDate.length > 0 && fixedCount === 0) {
    const { year: srcYear, month: srcMonth } = latestFixedDate[0];
    const { data: srcFixed } = await supabase.from('fixed_expenses').select('*').eq('year', srcYear).eq('month', srcMonth);
    if (srcFixed && srcFixed.length > 0) {
      const newFixed = srcFixed.map(r => ({
        name: r.name,
        category: r.category,
        estimate_amount: r.estimate_amount,
        actual_amount: 0,
        due_day: r.due_day,
        is_paid: false,
        year: year,
        month: month
      }));
      await supabase.from('fixed_expenses').insert(newFixed);
    }
  }

  // Find latest month with incomes before this month
  const { data: latestIncomeDate } = await supabase.from('incomes')
    .select('year, month')
    .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`)
    .order('year', { ascending: false }).order('month', { ascending: false }).limit(1);
    
  if (latestIncomeDate && latestIncomeDate.length > 0 && incomeCount === 0) {
    const { year: srcYear, month: srcMonth } = latestIncomeDate[0];
    const { data: srcIncomes } = await supabase.from('incomes').select('*').eq('year', srcYear).eq('month', srcMonth);
    if (srcIncomes && srcIncomes.length > 0) {
      const newIncomes = srcIncomes.map(r => ({
        name: r.name,
        amount: r.amount,
        year: year,
        month: month
      }));
      await supabase.from('incomes').insert(newIncomes);
    }
  }
}

async function loadAll() {
  const status = document.getElementById('load-status');
  if (status) status.textContent = 'Đang tải dữ liệu...';
  updateMonthLabel();
  updateExportReminder();

  try {
    await copyMonthDataIfNeeded(viewYear, viewMonth);

    const [
      { data: fixed, error: fixedErr },
      { data: daily, error: dailyErr },
      { data: incomeRows, error: incomeErr },
      { data: ccs, error: ccErr }
    ] = await Promise.all([
      supabase.from('fixed_expenses').select('*').eq('year', viewYear).eq('month', viewMonth).order('created_at', { ascending: true }),
      supabase.from('daily_expenses').select('*').eq('year', viewYear).eq('month', viewMonth).order('created_at', { ascending: false }),
      supabase.from('incomes').select('*').eq('year', viewYear).eq('month', viewMonth).order('created_at', { ascending: true }),
      supabase.from('credit_card_spendings').select('*').eq('year', viewYear).eq('month', viewMonth).order('created_at', { ascending: false })
    ]);

    if (fixedErr) throw fixedErr;
    if (dailyErr) throw dailyErr;
    if (incomeErr) throw incomeErr;
    if (ccErr) throw ccErr;

    fixedExpenses = fixed || [];
    dailyExpenses = daily || [];
    incomes = incomeRows || [];
    ccSpendings = ccs || [];
    
    renderFixed();
    renderDaily();
    renderIncomes();
    renderCc();
    updateSummary();
    if (status) status.textContent = '';
  } catch (err) {
    console.error(err);
    if (status) status.textContent = 'Không kết nối được database.';
  }
}

updateMonthLabel();
updateExportReminder();
loadAll();

document.addEventListener('input', function (e) {
  if (e.target.classList.contains('amount-input')) {
    let val = parseAmt(e.target.value);
    if (val === 0 && !/[0-9]/.test(e.target.value)) {
      e.target.value = '';
    } else {
      e.target.value = val.toLocaleString('vi-VN');
    }
  }
});
