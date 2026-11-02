/* ===== VISTA PRINTING POS - script.js (TAHAP 1) ===== */
'use strict';

/* ---------- 1. KONFIGURASI & PENYIMPANAN ---------- */
const TZ = 'Asia/Jakarta';
const KEY = {
  users: 'vista_users',
  products: 'vista_products',
  transactions: 'vista_transactions',
  expenses: 'vista_expenses',
  settings: 'vista_settings',
  session: 'vista_session',
  ui: 'vista_ui'
};

const DB = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { alert('Penyimpanan penuh atau diblokir browser. Coba pakai foto yang lebih kecil.'); return false; }
  }
};

/* Data awal (hanya dibuat jika belum ada) */
function seedData() {
  if (!DB.get(KEY.users)) {
    DB.set(KEY.users, [
      { id: 1, name: 'Administrator', username: 'admin', password: 'admin123', role: 'admin' },
      { id: 2, name: 'Kasir 1', username: 'kasir', password: 'kasir123', role: 'kasir' }
    ]);
  }
  if (!DB.get(KEY.products)) {
    const mk = (id, name, category, units, pcs, lbr, mtr) => ({
      id, name, category, desc: '', units, pricePcs: pcs, priceLembar: lbr, priceMeter: mtr, active: true, photo: ''
    });
    DB.set(KEY.products, [
      mk(1, 'Cetak Banner', 'Banner', ['meteran'], 0, 0, 25000),
      mk(2, 'Cetak Stiker', 'Stiker', ['meteran', 'lembaran'], 0, 3000, 45000),
      mk(3, 'Cetak Nota', 'Cetak', ['pcs'], 15000, 0, 0),
      mk(4, 'Cetak Undangan', 'Cetak', ['pcs'], 2500, 0, 0),
      mk(5, 'Cetak Foto', 'Foto', ['lembaran'], 0, 5000, 0),
      mk(6, 'Laminasi', 'Finishing', ['lembaran'], 0, 2000, 0),
      mk(7, 'Fotokopi', 'Fotokopi', ['lembaran'], 0, 500, 0),
      mk(8, 'Jilid', 'Finishing', ['pcs'], 10000, 0, 0)
    ]);
  }
  if (!DB.get(KEY.transactions)) DB.set(KEY.transactions, []);
  if (!DB.get(KEY.expenses)) DB.set(KEY.expenses, []);
  if (!DB.get(KEY.settings)) {
    DB.set(KEY.settings, {
      storeName: 'VISTA PRINTING',
      address: 'Alamat toko belum diisi',
      whatsapp: '08xxxxxxxxxx',
      paper: 'A5',
      footer: 'Terima kasih telah mempercayakan kebutuhan cetak Anda kepada VISTA PRINTING.',
      logo: ''
    });
  }
}

/* ---------- 2. FUNGSI BANTU (format Rupiah, tanggal WIB) ---------- */
const rupiah = n => 'Rp' + new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Mengubah tanggal menjadi "YYYY-MM-DD" menurut zona waktu Jakarta */
function dateKey(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
}
function formatTanggalWaktu(iso) {
  return new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)).replace(/\./g, ':');
}
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/* ---------- 3. IKON ---------- */
const ICONS = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  cart: 'M6 6h15l-2 9H8zM6 6L5 3H2M9 20h.01M18 20h.01',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  wallet: 'M3 7h17a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 7l13-4v4M16 14h2',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.4-2.7a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5c.1-.4.2-.8.2-1.2z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  menu: 'M3 6h18M3 12h18M3 18h18',
  coin: 'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  receipt: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  calendar: 'M3 5h18v16H3zM3 9h18M8 3v4M16 3v4'
};
const icon = name => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

/* ---------- 4. MENU & HAK AKSES ---------- */
const MENU = [
  { id: 'dashboard',   label: 'Dashboard',         icon: 'home',   roles: ['admin', 'kasir'], stage: '' },
  { id: 'kasir',       label: 'Kasir',             icon: 'cart',   roles: ['admin', 'kasir'], stage: 'TAHAP 3 dan 4' },
  { id: 'katalog',     label: 'Katalog Produk',    icon: 'box',    roles: ['admin', 'kasir'], stage: 'TAHAP 2' },
  { id: 'riwayat',     label: 'Riwayat Transaksi', icon: 'list',   roles: ['admin', 'kasir'], stage: 'TAHAP 5' },
  { id: 'laporan',     label: 'Laporan Keuangan',  icon: 'chart',  roles: ['admin'],          stage: 'TAHAP 6' },
  { id: 'pengeluaran', label: 'Pengeluaran',       icon: 'wallet', roles: ['admin'],          stage: 'TAHAP 5' },
  { id: 'pengaturan',  label: 'Pengaturan',        icon: 'gear',   roles: ['admin'],          stage: 'TAHAP 7' }
];

let session = null;
let currentPage = 'dashboard';
const charts = {};

const $ = id => document.getElementById(id);

/* ---------- 5. LOGIN & LOGOUT ---------- */
function handleLogin(e) {
  e.preventDefault();
  const username = $('loginUser').value.trim().toLowerCase();
  const password = $('loginPass').value;
  const user = DB.get(KEY.users, []).find(u => u.username.toLowerCase() === username && u.password === password);
  const err = $('loginError');
  if (!user) {
    err.textContent = 'Username atau password salah. Periksa lalu coba lagi.';
    err.hidden = false;
    return;
  }
  err.hidden = true;
  session = { id: user.id, name: user.name, username: user.username, role: user.role };
  DB.set(KEY.session, session);
  $('loginForm').reset();
  startApp();
}

function logout() {
  localStorage.removeItem(KEY.session);
  session = null;
  $('app').hidden = true;
  $('loginScreen').hidden = false;
}

function startApp() {
  $('loginScreen').hidden = true;
  $('app').hidden = false;
  $('userName').textContent = session.name;
  $('userRole').textContent = session.role === 'admin' ? 'Admin' : 'Kasir';
  $('userAvatar').textContent = session.name.charAt(0).toUpperCase();
  buildMenu();
  showPage('dashboard');
  tickClock();
}

/* ---------- 6. SIDEBAR & NAVIGASI ---------- */
function buildMenu() {
  $('menu').innerHTML = MENU.filter(m => m.roles.includes(session.role)).map(m =>
    `<button type="button" class="menu-item" data-page="${m.id}" title="${m.label}">${icon(m.icon)}<span class="label">${m.label}</span></button>`
  ).join('');
  $('menu').querySelectorAll('.menu-item').forEach(btn =>
    btn.addEventListener('click', () => { showPage(btn.dataset.page); closeMobileMenu(); })
  );
}

function buildPlaceholders() {
  $('otherPages').innerHTML = MENU.filter(m => m.id !== 'dashboard' && m.id !== 'katalog').map(m => `
    <section id="page-${m.id}" class="page" hidden>
      <div class="card placeholder">
        <span class="stat-icon">${icon(m.icon)}</span>
        <h2>${m.label}</h2>
        <p class="muted">Halaman ini akan dibuat pada ${m.stage}.</p>
      </div>
    </section>`).join('');
}

function showPage(id) {
  const item = MENU.find(m => m.id === id);
  if (!item || !item.roles.includes(session.role)) id = 'dashboard';   // cegah akses tanpa izin
  currentPage = id;
  document.querySelectorAll('.page').forEach(p => p.hidden = p.id !== 'page-' + id);
  document.querySelectorAll('#menu .menu-item').forEach(b => b.classList.toggle('active', b.dataset.page === id));
  $('pageTitle').textContent = MENU.find(m => m.id === id).label;
  if (id === 'dashboard') renderDashboard();
  if (id === 'katalog') renderCatalog();
  if (window.PAGE_HOOKS && PAGE_HOOKS[id]) PAGE_HOOKS[id]();
}

function toggleSidebar() {
  if (window.innerWidth <= 800) {
    $('sidebar').classList.toggle('open');
    $('overlay').classList.toggle('show');
  } else {
    const collapsed = $('app').classList.toggle('collapsed');
    DB.set(KEY.ui, { collapsed });
  }
}
function closeMobileMenu() {
  $('sidebar').classList.remove('open');
  $('overlay').classList.remove('show');
}

/* ---------- 7. JAM REAL-TIME (WIB) ---------- */
function tickClock() {
  const now = new Date();
  $('clockDate').textContent = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  $('clockTime').textContent = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now).replace(/\./g, ':') + ' WIB';
}

/* ---------- 8. DASHBOARD (semua angka dari data tersimpan) ---------- */
const sum = (arr, fn) => arr.reduce((t, x) => t + (Number(fn(x)) || 0), 0);

function renderDashboard() {
  const trx = DB.get(KEY.transactions, []).filter(t => t.status === 'LUNAS');
  const exp = DB.get(KEY.expenses, []);
  const products = DB.get(KEY.products, []);

  const today = dateKey(new Date());
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);

  const trxToday = trx.filter(t => dateKey(t.createdAt) === today);
  const trxMonth = trx.filter(t => dateKey(t.createdAt).slice(0, 7) === month);
  const expToday = exp.filter(e => e.date === today);
  const expMonth = exp.filter(e => String(e.date).slice(0, 7) === month);

  const sales = sum(trxToday, t => t.total);
  const spend = sum(expToday, e => e.amount);

  $('stSales').textContent = rupiah(sales);
  $('stTrx').textContent = trxToday.length;
  $('stExp').textContent = rupiah(spend);
  $('stProfit').textContent = rupiah(sales - spend);
  $('stProducts').textContent = products.length;
  $('stTrxMonth').textContent = trxMonth.length;

  /* Ringkasan bulan ini */
  const inc = sum(trxMonth, t => t.total);
  const out = sum(expMonth, e => e.amount);
  const max = Math.max(inc, out, 1);
  $('smIncome').textContent = rupiah(inc);
  $('smExpense').textContent = rupiah(out);
  $('smProfit').textContent = rupiah(inc - out);
  $('barIncome').style.width = (inc / max * 100) + '%';
  $('barExpense').style.width = (out / max * 100) + '%';

  /* Transaksi terbaru */
  const recent = [...DB.get(KEY.transactions, [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
  $('recentBody').innerHTML = recent.length ? recent.map(t => `
    <tr>
      <td>${esc(t.number)}</td>
      <td>${formatTanggalWaktu(t.createdAt)}</td>
      <td>${esc(t.customer || '-')}</td>
      <td class="num">${rupiah(t.total)}</td>
      <td><span class="badge ${t.status === 'LUNAS' ? 'ok' : 'bad'}">${esc(t.status || 'LUNAS')}</span></td>
    </tr>`).join('') : '<tr><td class="empty" colspan="5">Belum ada transaksi. Transaksi akan muncul di sini setelah kasir mulai bekerja.</td></tr>';

  /* Data grafik 7 hari terakhir */
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(dateKey(Date.now() - i * 86400000));
  const dailyLabels = days.map(d => d.slice(8) + ' ' + BULAN_PENDEK[Number(d.slice(5, 7)) - 1]);
  const dailyData = days.map(d => sum(trx.filter(t => dateKey(t.createdAt) === d), t => t.total));

  /* Data grafik 12 bulan tahun ini */
  const monthlyData = BULAN_PENDEK.map((_, i) => {
    const key = year + '-' + String(i + 1).padStart(2, '0');
    return sum(trx.filter(t => dateKey(t.createdAt).slice(0, 7) === key), t => t.total);
  });
  $('yearLabel').textContent = year;

  drawChart('daily', 'chartDaily', 'line', dailyLabels, dailyData);
  drawChart('monthly', 'chartMonthly', 'bar', BULAN_PENDEK, monthlyData);
}

function drawChart(name, canvasId, type, labels, data) {
  if (typeof Chart === 'undefined') {
    $(canvasId).parentElement.innerHTML = '<p class="muted">Grafik tidak dapat dimuat. Periksa koneksi internet lalu muat ulang halaman.</p>';
    return;
  }
  if (charts[name]) charts[name].destroy();
  charts[name] = new Chart($(canvasId), {
    type,
    data: {
      labels,
      datasets: [{
        label: 'Penjualan',
        data,
        borderColor: '#FFFFFF',
        backgroundColor: type === 'bar' ? '#8a929b' : 'rgba(255,255,255,.08)',
        borderWidth: 2, tension: .3, fill: type === 'line', borderRadius: 4,
        pointBackgroundColor: '#FFFFFF'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + rupiah(c.parsed.y) } } },
      scales: {
        x: { ticks: { color: '#A0A5AB' }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: '#A0A5AB', callback: v => rupiah(v) }, grid: { color: '#343A40' } }
      }
    }
  });
}

/* ---------- 10. KATALOG PRODUK (TAHAP 2) ---------- */
const UNIT_INFO = {
  pcs:      { label: 'PCS',      field: 'pricePcs',    suffix: '/pcs' },
  lembaran: { label: 'Lembaran', field: 'priceLembar', suffix: '/lembar' },
  meteran:  { label: 'Meteran',  field: 'priceMeter',  suffix: '/m²' }
};
let editingId = null;
let photoData = '';
const isAdmin = () => !!session && session.role === 'admin';

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function renderCatalog() {
  const products = DB.get(KEY.products, []);
  const cats = [...new Set(products.map(p => p.category))].sort();
  const sel = $('catFilter');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Semua kategori</option>' +
    cats.map(c => `<option value="${esc(c)}" ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('');
  $('categoryList').innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
  $('btnAddProduct').hidden = !isAdmin();

  const q = $('catSearch').value.trim().toLowerCase();
  const list = products.filter(p => (!sel.value || p.category === sel.value) && (!q || p.name.toLowerCase().includes(q)));
  $('catInfo').textContent = isAdmin()
    ? `${list.length} dari ${products.length} produk. Produk aktif otomatis muncul di halaman Kasir.`
    : `${list.length} dari ${products.length} produk. Anda hanya dapat melihat katalog.`;

  $('productGrid').innerHTML = list.length ? list.map(p => `
    <article class="product ${p.active ? '' : 'off'}">
      <div class="product-photo">${p.photo ? `<img src="${p.photo}" alt="${esc(p.name)}">` : icon('box')}</div>
      <div class="product-body">
        <h3>${esc(p.name)}</h3>
        <span class="muted">${esc(p.category)}</span>
        ${p.desc ? `<p class="product-desc">${esc(p.desc)}</p>` : ''}
        <ul class="prices">${p.units.map(u => `<li><span>${UNIT_INFO[u].label}</span><strong>${rupiah(p[UNIT_INFO[u].field])}${UNIT_INFO[u].suffix}</strong></li>`).join('')}</ul>
      </div>
      <div class="product-foot">
        <span class="badge ${p.active ? 'ok' : 'bad'}">${p.active ? 'Aktif' : 'Tidak aktif'}</span>
        ${isAdmin() ? `<button type="button" class="btn btn-sm" data-act="edit" data-id="${p.id}">Edit</button>
        <button type="button" class="btn btn-sm btn-danger" data-act="delete" data-id="${p.id}">Hapus</button>` : ''}
      </div>
    </article>`).join('')
    : '<div class="card muted">Tidak ada produk yang cocok dengan pencarian Anda.</div>';
}

function syncUnitInputs() {
  document.querySelectorAll('[data-unit]').forEach(c => {
    const input = c.closest('.unit-row').querySelector('[data-price]');
    input.disabled = !c.checked;
  });
}

function showPhoto(src) {
  photoData = src || '';
  $('photoPreview').innerHTML = photoData ? `<img src="${photoData}" alt="Foto produk">` : 'Tanpa foto';
}

function openProductModal(id) {
  if (!isAdmin()) return;
  editingId = id || null;
  const p = id ? DB.get(KEY.products, []).find(x => x.id === id) : null;
  $('modalTitle').textContent = p ? 'Edit Produk' : 'Tambah Produk';
  $('pName').value = p ? p.name : '';
  $('pCategory').value = p ? p.category : '';
  $('pDesc').value = p ? p.desc : '';
  $('pActive').value = p && !p.active ? '0' : '1';
  $('pPhoto').value = '';
  showPhoto(p ? p.photo : '');
  document.querySelectorAll('[data-unit]').forEach(c => { c.checked = !!p && p.units.includes(c.dataset.unit); });
  document.querySelectorAll('[data-price]').forEach(i => { i.value = p && p[i.dataset.price] ? p[i.dataset.price] : ''; });
  syncUnitInputs();
  $('formError').hidden = true;
  $('productModal').hidden = false;
  $('pName').focus();
}
function closeProductModal() { $('productModal').hidden = true; }

/* Perkecil foto agar LocalStorage tidak cepat penuh */
function resizeImage(file, max = 600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function saveProduct(e) {
  e.preventDefault();
  if (!isAdmin()) return;
  const err = $('formError');
  const fail = msg => { err.textContent = msg; err.hidden = false; };

  const name = $('pName').value.trim();
  const category = $('pCategory').value.trim();
  const units = [...document.querySelectorAll('[data-unit]')].filter(c => c.checked).map(c => c.dataset.unit);
  if (!name || !category) return fail('Nama dan kategori produk wajib diisi.');
  if (!units.length) return fail('Pilih minimal satu satuan untuk produk ini.');

  const prices = { pricePcs: 0, priceLembar: 0, priceMeter: 0 };
  document.querySelectorAll('[data-price]').forEach(i => { prices[i.dataset.price] = Number(i.value) || 0; });
  for (const u of Object.keys(UNIT_INFO)) {
    const f = UNIT_INFO[u].field;
    if (!units.includes(u)) prices[f] = 0;
    else if (!(prices[f] > 0)) return fail(`Isi harga ${UNIT_INFO[u].label} dengan angka lebih dari 0.`);
  }

  const products = DB.get(KEY.products, []);
  if (products.some(p => p.id !== editingId && p.name.toLowerCase() === name.toLowerCase())) return fail('Nama produk sudah ada. Gunakan nama lain.');

  const data = { name, category, desc: $('pDesc').value.trim(), units, ...prices, active: $('pActive').value === '1', photo: photoData };
  if (editingId) {
    const i = products.findIndex(p => p.id === editingId);
    products[i] = { ...products[i], ...data };
  } else {
    data.id = Math.max(0, ...products.map(p => p.id)) + 1;
    products.push(data);
  }
  if (!DB.set(KEY.products, products)) return;
  closeProductModal();
  renderCatalog();
  toast(editingId ? 'Produk diperbarui' : 'Produk ditambahkan');
}

function deleteProduct(id) {
  if (!isAdmin()) return;
  const products = DB.get(KEY.products, []);
  const p = products.find(x => x.id === id);
  if (!p || !confirm(`Hapus produk "${p.name}"? Transaksi lama tidak terpengaruh.`)) return;
  DB.set(KEY.products, products.filter(x => x.id !== id));
  renderCatalog();
  toast('Produk dihapus');
}

function setupCatalog() {
  $('catSearch').addEventListener('input', renderCatalog);
  $('catFilter').addEventListener('change', renderCatalog);
  $('btnAddProduct').addEventListener('click', () => openProductModal(null));
  $('productGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    if (b.dataset.act === 'edit') openProductModal(id);
    if (b.dataset.act === 'delete') deleteProduct(id);
  });
  $('productForm').addEventListener('submit', saveProduct);
  $('btnCancelProduct').addEventListener('click', closeProductModal);
  $('productModal').addEventListener('mousedown', e => { if (e.target === $('productModal')) closeProductModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('productModal').hidden) closeProductModal(); });
  document.querySelectorAll('[data-unit]').forEach(c => c.addEventListener('change', syncUnitInputs));
  $('btnRemovePhoto').addEventListener('click', () => { $('pPhoto').value = ''; showPhoto(''); });
  $('pPhoto').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try { showPhoto(await resizeImage(file)); }
    catch (err) { $('formError').textContent = 'Foto tidak dapat dibaca. Pilih file gambar lain (JPG atau PNG).'; $('formError').hidden = false; }
  });
}

/* ---------- 9. INISIALISASI ---------- */
function init() {
  seedData();
  buildPlaceholders();

  document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
  $('btnMenu').innerHTML = icon('menu');
  $('btnLogout').innerHTML = icon('logout') + '<span class="label">Keluar</span>';

  $('loginForm').addEventListener('submit', handleLogin);
  $('btnLogout').addEventListener('click', logout);
  $('btnMenu').addEventListener('click', toggleSidebar);
  $('overlay').addEventListener('click', closeMobileMenu);

  setupCatalog();
  if (DB.get(KEY.ui, {}).collapsed) $('app').classList.add('collapsed');
  setInterval(() => { if (session) tickClock(); }, 1000);

  session = DB.get(KEY.session, null);
  if (session) startApp();
}

document.addEventListener('DOMContentLoaded', init);
