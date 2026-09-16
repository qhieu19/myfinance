// ============================================================
// BUDGET TRACKER – Front-end Logic (no backend)
// ============================================================

let currentTab = 'fixed';
let editingItem = null;

// ===== FORMAT =====
function fmt(n) {
  return n.toLocaleString('vi-VN') + '₫';
}

function parseAmt(str) {
  return parseInt(str.replace(/[.₫\s]/g, ''), 10) || 0;
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ===== TABS =====
function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');

  document.querySelectorAll('.tab-content').forEach(l => l.classList.remove('active'));
  document.getElementById('content-' + tab).classList.add('active');

  const fab = document.getElementById('fab');
  if (fab) {
    fab.style.display = (tab === 'daily' || tab === 'income') ? 'flex' : 'none';
  }

  checkEmpty();
}

function checkEmpty() {
  if (currentTab === 'daily') {
    const list = document.getElementById('daily-list');
    const empty = document.getElementById('empty-state');
    empty.style.display = list.children.length === 0 ? 'block' : 'none';
  }
}

// ===== SUMMARY & RECALCULATION =====
function updateSummary() {
  let INCOME = 0;
  let fixedTotal = 0;
  let dailyTotal = 0;

  // Calculate Income
  document.querySelectorAll('#content-income .item').forEach(el => {
    INCOME += parseInt(el.getAttribute('data-amount'), 10) || 0;
  });
  document.getElementById('income-display').textContent = fmt(INCOME);

  // Calculate Fixed Totals from data attributes or amount display
  document.querySelectorAll('#content-fixed .item').forEach(el => {
    let actual = parseInt(el.getAttribute('data-actual'), 10) || 0;
    let estimate = parseInt(el.getAttribute('data-estimate'), 10) || 0;
    let amt = actual > 0 ? actual : estimate;
    fixedTotal += amt;
    
    // update display just in case
    el.querySelector('.item-amount').textContent = fmt(amt);
    
    // update due text
    let dueSpan = el.querySelector('.item-due');
    let isPaid = el.getAttribute('data-paid') === 'true';
    if (isPaid) {
      dueSpan.className = 'item-due paid';
      dueSpan.textContent = 'Đã trả ✓';
    } else {
      dueSpan.className = 'item-due';
      dueSpan.textContent = 'Chưa trả';
      // simple logic for due dates if they exist
      let due = el.getAttribute('data-due');
      if (due) {
         let today = new Date().getDate();
         let dueNum = parseInt(due, 10);
         if (dueNum > today) {
           let diff = dueNum - today;
           if (diff <= 3) {
             dueSpan.className = 'item-due warning';
           }
           dueSpan.textContent = `Còn ${diff} ngày`;
         }
      }
    }
  });

  // Calculate Daily Totals
  document.querySelectorAll('#daily-list .item-amount').forEach(el => {
    dailyTotal += parseAmt(el.textContent);
  });

  const total = fixedTotal + dailyTotal;
  const remaining = INCOME - total;
  const pct = Math.min(Math.round((total / INCOME) * 100), 100);

  document.getElementById('spent-display').textContent = fmt(total);
  document.getElementById('remaining-display').textContent = fmt(remaining);
  document.getElementById('sum-fixed').textContent = fmt(fixedTotal);
  document.getElementById('sum-daily').textContent = fmt(dailyTotal);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = 'Đã chi ' + pct + '% thu nhập';

  checkEmpty();
}

// ===== ADD MODAL (DAILY & INCOME) =====
function openModal() {
  if (currentTab !== 'daily' && currentTab !== 'income') {
    switchTab('daily');
  }
  
  document.getElementById('input-name').value = '';
  document.getElementById('input-amount').value = '';

  if (currentTab === 'income') {
    document.getElementById('modal-title').textContent = 'Thêm Nguồn Thu';
  } else {
    document.getElementById('modal-title').textContent = 'Thêm Chi Phí Hàng Ngày';
  }

  document.getElementById('modal').classList.add('active');
  document.getElementById('modal-overlay').classList.add('active');

  setTimeout(() => document.getElementById('input-name').focus(), 350);
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  document.getElementById('modal-overlay').classList.remove('active');
}

function saveExpense() {
  const name = document.getElementById('input-name').value.trim();
  const amount = parseInt(document.getElementById('input-amount').value, 10);

  if (!name || isNaN(amount) || amount <= 0) {
    const modal = document.getElementById('modal');
    modal.style.animation = 'none';
    void modal.offsetHeight;
    modal.style.animation = 'shake 0.4s ease';
    return;
  }

  const list = currentTab === 'income' ? document.getElementById('income-list') : document.getElementById('daily-list');

  const li = document.createElement('li');
  li.className = 'item';
  li.style.animation = 'fadeInUp 0.3s ease both';
  
  if (currentTab === 'income') {
    li.setAttribute('data-amount', amount);
    li.innerHTML = `
      <div class="item-body">
        <span class="item-name">${escHtml(name)}</span>
        <span class="item-meta">Vừa thêm</span>
      </div>
      <div class="item-right">
        <span class="item-amount" style="color:var(--green);">${fmt(amount)}</span>
      </div>
      <div class="item-actions">
        <button class="action-btn edit" onclick="editIncomeItem(this)" aria-label="Sửa">✏️</button>
        <button class="action-btn delete" onclick="deleteItem(this)" aria-label="Xóa">🗑️</button>
      </div>
    `;
  } else {
    li.innerHTML = `
      <div class="item-body">
        <span class="item-name">${escHtml(name)}</span>
        <span class="item-meta">Vừa thêm</span>
      </div>
      <div class="item-right">
        <span class="item-amount">${fmt(amount)}</span>
      </div>
      <div class="item-actions">
        <button class="action-btn edit" onclick="editItem(this)" aria-label="Sửa">✏️</button>
        <button class="action-btn delete" onclick="deleteItem(this)" aria-label="Xóa">🗑️</button>
      </div>
    `;
  }
  list.appendChild(li);

  closeModal();
  updateSummary();
}

// ===== EDIT DAILY =====
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

function saveEdit() {
  if (!editingItem) return;

  const name = document.getElementById('edit-name').value.trim();
  const amount = parseInt(document.getElementById('edit-amount').value, 10);

  if (!name || isNaN(amount) || amount <= 0) return;

  editingItem.querySelector('.item-name').textContent = name;
  editingItem.querySelector('.item-amount').textContent = fmt(amount);
  editingItem.querySelector('.item-meta').textContent = 'Vừa sửa';

  closeEditModal();
  updateSummary();
}

// ===== EDIT FIXED =====
function editFixedItem(btn) {
  editingItem = btn.closest('.item');
  const title = editingItem.querySelector('.item-name').textContent;
  const due = editingItem.getAttribute('data-due') || '';
  const est = editingItem.getAttribute('data-estimate') || '';
  const act = editingItem.getAttribute('data-actual') || '';
  const paid = editingItem.getAttribute('data-paid') === 'true';

  document.getElementById('edit-fixed-title').textContent = title;
  document.getElementById('edit-fixed-due').value = due;
  document.getElementById('edit-fixed-estimate').value = est;
  document.getElementById('edit-fixed-actual').value = act;
  document.getElementById('edit-fixed-paid').checked = paid;

  document.getElementById('edit-fixed-modal').classList.add('active');
  document.getElementById('edit-fixed-overlay').classList.add('active');

  setTimeout(() => document.getElementById('edit-fixed-actual').focus(), 350);
}

function closeEditFixedModal() {
  document.getElementById('edit-fixed-modal').classList.remove('active');
  document.getElementById('edit-fixed-overlay').classList.remove('active');
  editingItem = null;
}

function saveEditFixed() {
  if (!editingItem) return;

  const due = document.getElementById('edit-fixed-due').value.trim();
  const est = parseInt(document.getElementById('edit-fixed-estimate').value, 10) || 0;
  const act = parseInt(document.getElementById('edit-fixed-actual').value, 10) || 0;
  const paid = document.getElementById('edit-fixed-paid').checked;

  editingItem.setAttribute('data-due', due);
  editingItem.setAttribute('data-estimate', est);
  editingItem.setAttribute('data-actual', act);
  editingItem.setAttribute('data-paid', paid);

  let meta = editingItem.querySelector('.item-meta');
  if (due) {
    if (editingItem.getAttribute('data-id').startsWith('credit')) {
      meta.textContent = `Ngày ${due} hàng tháng`;
    } else {
      meta.textContent = `Ngày ${due} hàng tháng`;
    }
  }

  closeEditFixedModal();
  updateSummary();
}

// ===== EDIT INCOME =====
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

function saveEditIncome() {
  if (!editingItem) return;

  const name = document.getElementById('edit-income-name').value.trim();
  const amount = parseInt(document.getElementById('edit-income-amount').value, 10) || 0;

  if (!name) return;

  editingItem.querySelector('.item-name').textContent = name;
  editingItem.setAttribute('data-amount', amount);
  editingItem.querySelector('.item-amount').textContent = fmt(amount);

  closeEditIncomeModal();
  updateSummary();
}


// ===== DELETE DAILY =====
function deleteItem(btn) {
  const item = btn.closest('.item');
  
  item.style.animation = 'slideOut 0.3s ease forwards';
  setTimeout(() => {
    item.remove();
    updateSummary();
  }, 300);
}

// ===== INIT =====
updateSummary();
