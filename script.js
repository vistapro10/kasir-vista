/* ===== VISTA PRINTING POS - script.js (inti aplikasi + Supabase) =====
   Dimuat SEBELUM modules.js. Semua data disimpan di Supabase (tabel app_data). */

/* ---------- 1. KONFIGURASI SUPABASE (WAJIB DIISI) ---------- */
const SB_URL = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54b3Rlemtwandzam5hZm5raW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyOTU0NjEsImV4cCI6MjEwOTg3MTQ2MX0.7kj5SFjSsYI0LXwBv09ysoYBWcZTxCR7qO-eQ_0GPXE';
const SB_KEY = 'ISI_DENGAN_ANON_PUBLIC_KEY';   // Supabase > Project Settings > API Keys > anon / publishable key
const EMAIL_DOMAIN = '@vista.local';           // username "admin" => email admin@vista.local

const TZ = 'Asia/Jakarta';
const KEY = {
  users: 'vista_users', products: 'vista_products', transactions: 'vista_transactions',
  expenses: 'vista_expenses', settings: 'vista_settings', session: 'vista_session'
};
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const UNIT_INFO = {
  pcs:      { label: 'PCS',     field: 'pricePcs',    suffix: '' },
  lembaran: { label: 'Lembar',  field: 'priceLembar', suffix: '' },
  meteran:  { label: 'Meter',   field: 'priceMeter',  suffix: '/m²' }
};
const DEFAULT_SETTINGS = { storeName: 'VISTA PRINTING', address: '', whatsapp: '', paper: 'A5', footer: 'Terima kasih atas kepercayaan Anda.', logo: '' };

let session = null, currentPage = 'dashboard';
const sb = window.supabase ? window.supabase.createClient(SB_URL, SB_KEY) : null;

/* ---------- 2. FUNGSI BANTU ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rupiah = n => (n < 0 ? '-' : '') + 'Rp' + new Intl.NumberFormat('id-ID').format(Math.abs(Math.round(Number(n) || 0)));
const sum = (arr, fn) => arr.reduce((t, x) => t + (Number(fn(x)) || 0), 0);
const dateKey = d => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
const isAdmin = () => !!session && session.role === 'admin';
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
}
function resizeImage(file, max) {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onerror = fail;
    r.onload = () => {
      const img = new Image();
      img.onerror = fail;
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        ok(file.type === 'image/png' && max <= 300 ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.8));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

const ICONS = {
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9a3 3 0 0 0-5 1.5c0 3 5 1.5 5 4.500a3 3 0 0 1-5 1.500M12 6.500v1.500M12 16v1.500"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  wallet: '<path d="M4 7a2 2 0 0 1 2-2h12v4"/><rect x="4" y="7" width="16" height="12" rx="2"/><path d="M16 13h2"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  kasir: '<circle cx="9" cy="20" r="1.500"/><circle cx="18" cy="20" r="1.500"/><path d="M2 3h3l3 12h11l2-8H6"/>',
  riwayat: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  laporan: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M13 16V8M18 16v-3"/>',
  pengaturan: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.200l2-1.500-2-3.400-2.300 1a7 7 0 0 0-2-1.200L14.300 3h-4l-.3 2.700a7 7 0 0 0-2 1.200l-2.300-1-2 3.400 2 1.500a7 7 0 0 0 0 2.400l-2 1.500 2 3.400 2.300-1a7 7 0 0 0 2 1.200l.3 2.700h4l.3-2.700a7 7 0 0 0 2-1.200l2.300 1 2-3.400-2-1.500c.1-.4.1-.8.1-1.200z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
};
const icon = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ICONS.box}</svg>`;

/* ---------- 3. PENYIMPANAN DATA (cache memori + sinkron ke Supabase) ---------- */
const cache = {}, dirty = new Map();
let dbReady = false, flushing = false;
const DB = {
  get(k, d) {
    if (k === KEY.session) { try { return JSON.parse(sessionStorage.getItem(k)) ?? d; } catch (e) { return d; } }
    return cache[k] === undefined ? d : structuredClone(cache[k]);
  },
  set(k, v) {
    if (k === KEY.session) { sessionStorage.setItem(k, JSON.stringify(v)); return true; }
    if (!dbReady) { toast('Data belum siap. Tunggu sebentar lalu coba lagi.'); return false; }
    cache[k] = structuredClone(v); dirty.set(k, cache[k]); flush(); return true;
  }
};
async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    while (dirty.size) {
      const [k, v] = dirty.entries().next().value;
      const { error } = await sb.from('app_data').upsert({ key: k, value: v, updated_at: new Date().toISOString() });
      if (error) { toast('Gagal menyimpan ke server: ' + error.message); break; }
      if (dirty.get(k) === v) dirty.delete(k);
    }
  } finally { flushing = false; }
}
window.addEventListener('beforeunload', e => { if (dirty.size) { e.preventDefault(); e.returnValue = ''; } });
async function loadAll() {
  const { data, error } = await sb.from('app_data').select('key,value');
  if (error) throw error;
  Object.keys(cache).forEach(k => delete cache[k]);
  data.forEach(r => { cache[r.key] = r.value; });
  dbReady = true;
}

/* ---------- 4. LOGIN & SESI (Supabase Auth) ---------- */
function showLogin(msg) {
  $('app').hidden = true; $('loginScreen').hidden = false;
  const er = $('loginError'); er.textContent = msg || ''; er.hidden = !msg;
}
async function startSession(authUser) {
  await loadAll();
  const uname = (authUser.email || '').replace(EMAIL_DOMAIN, '').toLowerCase();
  let users = DB.get(KEY.users, []), u = users.find(x => x.authId === authUser.id) || users.find(x => x.username === uname);
  if (!u) {
    u = { id: Date.now(), authId: authUser.id, name: uname, username: uname, role: users.length ? 'kasir' : 'admin' };
    users.push(u); DB.set(KEY.users, users);
  } else if (!u.authId) { u.authId = authUser.id; DB.set(KEY.users, users.map(x => x.id === u.id ? u : x)); }
  if (!cache[KEY.settings]) DB.set(KEY.settings, DEFAULT_SETTINGS);
  if (!cache[KEY.products]) DB.set(KEY.products, []);
  session = { id: u.id, name: u.name, username: u.username, role: u.role };
  DB.set(KEY.session, session);
  enterApp();
}
async function doLogin(e) {
  e.preventDefault();
  if (!sb || SB_KEY.startsWith('ISI_')) return showLogin('Kunci Supabase belum diisi di script.js.');
  const raw = $('loginUser').value.trim().toLowerCase(), btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; showLogin('');
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email: raw.includes('@') ? raw : raw + EMAIL_DOMAIN, password: $('loginPass').value });
    if (error) throw new Error('Username atau password salah.');
    await startSession(data.user);
  } catch (x) { showLogin(x.message || 'Gagal masuk.'); }
  btn.disabled = false;
}
function logout() {
  if (sb) sb.auth.signOut();
  session = null; dbReady = false; sessionStorage.removeItem(KEY.session);
  Object.keys(cache).forEach(k => delete cache[k]);
  showLogin('');
}

/* ---------- 5. NAVIGASI & TAMPILAN UTAMA ---------- */
const MENU = [
  { id: 'dashboard', title: 'Dashboard' }, { id: 'katalog', title: 'Katalog Produk' }, { id: 'kasir', title: 'Kasir' },
  { id: 'riwayat', title: 'Riwayat Transaksi' }, { id: 'pengeluaran', title: 'Pengeluaran', admin: true },
  { id: 'laporan', title: 'Laporan', admin: true }, { id: 'pengaturan', title: 'Pengaturan', admin: true }
];
function buildMenu() {
  $('menu').innerHTML = MENU.filter(m => !m.admin || isAdmin()).map(m =>
    `<button type="button" class="menu-item" data-page="${m.id}">${icon(m.id)}<span class="label">${m.title}</span></button>`).join('');
}
function showPage(id) {
  currentPage = id;
  document.querySelectorAll('.page').forEach(p => p.hidden = p.id !== 'page-' + id);
  document.querySelectorAll('#menu .menu-item').forEach(b => b.classList.toggle('active', b.dataset.page === id));
  $('pageTitle').textContent = (MENU.find(m => m.id === id) || {}).title || '';
  if (id === 'dashboard') renderDashboard();
  if (id === 'katalog') renderKatalog();
  if (window.PAGE_HOOKS && PAGE_HOOKS[id]) PAGE_HOOKS[id]();
  $('sidebar').classList.remove('open'); $('overlay').classList.remove('show');
  window.scrollTo(0, 0);
}
function enterApp() {
  $('loginScreen').hidden = true; $('app').hidden = false;
  $('userName').textContent = session.name; $('userRole').textContent = session.role;
  $('userAvatar').textContent = (session.name || 'A').charAt(0).toUpperCase();
  $('loginPass').value = '';
  buildMenu(); showPage('dashboard');
}

/* ---------- 6. GRAFIK ---------- */
const charts = {};
function drawChart(store, canvasId, type, labels, data) {
  if (typeof Chart === 'undefined') return;
  try { charts[store] && charts[store].destroy(); } catch (e) { /* kanvas lama sudah hilang */ }
  const cv = $(canvasId); if (!cv) return;
  charts[store] = new Chart(cv, {
    type,
    data: { labels, datasets: [{ data, backgroundColor: 'rgba(255,255,255,.85)', borderColor: '#ffffff', borderWidth: 2, tension: .3, fill: false }] },
    options: {
      responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#9aa1a9' }, grid: { color: 'rgba(255,255,255,.06)' } },
        y: { beginAtZero: true, ticks: { color: '#9aa1a9', callback: v => v >= 1e6 ? v / 1e6 + ' jt' : v >= 1e3 ? v / 1e3 + ' rb' : v }, grid: { color: 'rgba(255,255,255,.06)' } }
      }
    }
  });
}

/* ---------- 7. DASHBOARD ---------- */
function renderDashboard() {
  const all = DB.get(KEY.transactions, []).filter(t => t.status !== 'BATAL'), paid = all.filter(t => t.status === 'LUNAS');
  const exp = DB.get(KEY.expenses, []), today = dateKey(new Date()), month = today.slice(0, 7), year = today.slice(0, 4);
  const sales = sum(paid.filter(t => dateKey(t.createdAt) === today), t => t.total);
  const spend = sum(exp.filter(e => e.date === today), e => e.amount);
  $('stSales').textContent = rupiah(sales);
  $('stTrx').textContent = all.filter(t => dateKey(t.createdAt) === today).length;
  $('stExp').textContent = rupiah(spend);
  $('stProfit').textContent = rupiah(sales - spend);
  $('stProducts').textContent = DB.get(KEY.products, []).length;
  $('stTrxMonth').textContent = all.filter(t => dateKey(t.createdAt).slice(0, 7) === month).length;

  const days = [...Array(7)].map((_, i) => dateKey(Date.now() - (6 - i) * 86400000));
  drawChart('daily', 'chartDaily', 'line', days.map(d => d.slice(8) + '/' + d.slice(5, 7)), days.map(d => sum(paid.filter(t => dateKey(t.createdAt) === d), t => t.total)));
  const mon = BULAN_PENDEK.map(() => 0);
  paid.filter(t => dateKey(t.createdAt).slice(0, 4) === year).forEach(t => { mon[Number(dateKey(t.createdAt).slice(5, 7)) - 1] += t.total; });
  $('yearLabel').textContent = '(' + year + ')';
  drawChart('monthly', 'chartMonthly', 'bar', BULAN_PENDEK, mon);

  const recent = [...all].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  $('recentBody').innerHTML = recent.length ? recent.map(t => `<tr><td>${esc(t.number)}</td><td>${tgl(t.createdAt)} ${jam(t.createdAt)}</td><td>${esc(t.customer || '-')}</td><td class="num">${rupiah(t.total)}</td><td><span class="badge ${t.status === 'LUNAS' ? 'ok' : 'bad'}">${esc(t.status)}</span></td></tr>`).join('')
    : '<tr><td class="empty" colspan="5">Belum ada transaksi.</td></tr>';

  const inc = sum(paid.filter(t => dateKey(t.createdAt).slice(0, 7) === month), t => t.total), out = sum(exp.filter(e => e.date.slice(0, 7) === month), e => e.amount), mx = Math.max(inc, out, 1);
  $('smIncome').textContent = rupiah(inc); $('smExpense').textContent = rupiah(out); $('smProfit').textContent = rupiah(inc - out);
  $('barIncome').style.width = inc / mx * 100 + '%'; $('barExpense').style.width = out / mx * 100 + '%';
}

/* ---------- 8. KATALOG PRODUK ---------- */
let editProduct = null, photoTmp = '';
function renderKatalog() {
  const all = DB.get(KEY.products, []), q = $('catSearch').value.trim().toLowerCase(), cur = $('catFilter').value;
  const cats = [...new Set(all.map(p => p.category))].sort();
  $('catFilter').innerHTML = '<option value="">Semua kategori</option>' + cats.map(c => `<option value="${esc(c)}" ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('');
  $('categoryList').innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
  $('btnAddProduct').hidden = !isAdmin();
  const list = all.filter(p => (!$('catFilter').value || p.category === $('catFilter').value) && (!q || p.name.toLowerCase().includes(q)));
  $('catInfo').textContent = `${list.length} dari ${all.length} produk`;
  $('productGrid').innerHTML = list.length ? list.map(p => `<article class="product ${p.active ? '' : 'off'}">
    <div class="product-photo">${p.photo ? `<img src="${p.photo}" alt="">` : icon('box')}</div>
    <div class="product-body"><h3>${esc(p.name)}</h3><span class="muted">${esc(p.category)}</span>${p.desc ? `<p class="product-desc">${esc(p.desc)}</p>` : ''}
    <ul class="prices">${p.units.map(u => `<li><span>${UNIT_INFO[u].label}</span><strong>${rupiah(p[UNIT_INFO[u].field])}${UNIT_INFO[u].suffix}</strong></li>`).join('')}</ul></div>
    ${isAdmin() ? `<div class="product-foot"><span class="badge ${p.active ? 'ok' : 'bad'}">${p.active ? 'Aktif' : 'Tidak aktif'}</span><button class="btn btn-sm" data-a="edit" data-id="${p.id}">Edit</button><button class="btn btn-sm btn-danger" data-a="del" data-id="${p.id}">Hapus</button></div>` : ''}</article>`).join('')
    : '<div class="card muted">Belum ada produk. Klik "+ Tambah Produk" untuk memulai.</div>';
}
function openProductForm(p) {
  editProduct = p ? p.id : null; photoTmp = p ? p.photo || '' : '';
  $('modalTitle').textContent = p ? 'Edit Produk' : 'Tambah Produk';
  $('productForm').reset(); $('formError').hidden = true;
  $('pName').value = p ? p.name : ''; $('pCategory').value = p ? p.category : ''; $('pActive').value = p && !p.active ? '0' : '1'; $('pDesc').value = p ? p.desc || '' : '';
  document.querySelectorAll('#productForm [data-unit]').forEach(cb => {
    const inp = cb.parentElement.querySelector('[data-price]'), on = !!p && p.units.includes(cb.dataset.unit);
    cb.checked = on; inp.disabled = !on; inp.value = on ? p[inp.dataset.price] : '';
  });
  $('photoPreview').innerHTML = photoTmp ? `<img src="${photoTmp}" alt="">` : 'Tanpa foto';
  $('productModal').hidden = false;
}
function buildKatalog() {
  $('catSearch').addEventListener('input', renderKatalog);
  $('catFilter').addEventListener('change', renderKatalog);
  $('btnAddProduct').addEventListener('click', () => openProductForm(null));
  $('btnCancelProduct').addEventListener('click', () => { $('productModal').hidden = true; });
  $('productModal').addEventListener('mousedown', e => { if (e.target === $('productModal')) $('productModal').hidden = true; });
  document.querySelectorAll('#productForm [data-unit]').forEach(cb => cb.addEventListener('change', () => {
    const inp = cb.parentElement.querySelector('[data-price]'); inp.disabled = !cb.checked; if (!cb.checked) inp.value = '';
  }));
  $('pPhoto').addEventListener('change', async e => {
    if (!e.target.files[0]) return;
    try { photoTmp = await resizeImage(e.target.files[0], 600); $('photoPreview').innerHTML = `<img src="${photoTmp}" alt="">`; } catch (x) { toast('Gambar tidak dapat dibaca'); }
  });
  $('btnRemovePhoto').addEventListener('click', () => { photoTmp = ''; $('pPhoto').value = ''; $('photoPreview').textContent = 'Tanpa foto'; });
  $('productForm').addEventListener('submit', e => {
    e.preventDefault(); if (!isAdmin()) return;
    const p = { id: editProduct || Date.now(), name: $('pName').value.trim(), category: $('pCategory').value.trim(), active: $('pActive').value === '1', desc: $('pDesc').value.trim(), photo: photoTmp, units: [], pricePcs: 0, priceLembar: 0, priceMeter: 0 };
    let bad = false;
    document.querySelectorAll('#productForm [data-unit]').forEach(cb => {
      if (!cb.checked) return;
      const inp = cb.parentElement.querySelector('[data-price]'), v = Number(inp.value);
      if (!(v > 0)) bad = true; else { p.units.push(cb.dataset.unit); p[inp.dataset.price] = v; }
    });
    const er = $('formError');
    if (!p.name || !p.category) { er.textContent = 'Nama dan kategori wajib diisi.'; er.hidden = false; return; }
    if (bad || !p.units.length) { er.textContent = 'Pilih minimal satu satuan dan isi harganya dengan angka lebih dari 0.'; er.hidden = false; return; }
    const list = DB.get(KEY.products, []), i = list.findIndex(x => x.id === p.id);
    if (i >= 0) list[i] = p; else list.push(p);
    if (!DB.set(KEY.products, list)) return;
    $('productModal').hidden = true; renderKatalog(); toast('Produk disimpan');
  });
  $('productGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b || !isAdmin()) return;
    const list = DB.get(KEY.products, []), p = list.find(x => x.id === Number(b.dataset.id));
    if (b.dataset.a === 'edit') openProductForm(p);
    if (b.dataset.a === 'del' && confirm(`Hapus produk "${p.name}"? Transaksi lama tidak terpengaruh.`)) { DB.set(KEY.products, list.filter(x => x.id !== p.id)); renderKatalog(); }
  });
}

/* ---------- 9. START ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  $('btnMenu').innerHTML = icon('menu');
  $('btnLogout').innerHTML = icon('logout') + '<span class="label">Keluar</span>';
  $('otherPages').innerHTML = ['kasir', 'riwayat', 'pengeluaran', 'laporan', 'pengaturan'].map(id => `<section id="page-${id}" class="page" hidden></section>`).join('');
  buildKatalog();

  $('loginForm').addEventListener('submit', doLogin);
  $('btnLogout').addEventListener('click', logout);
  $('menu').addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b) showPage(b.dataset.page); });
  $('btnMenu').addEventListener('click', () => {
    if (window.matchMedia('(max-width: 800px)').matches) { $('sidebar').classList.toggle('open'); $('overlay').classList.toggle('show'); }
    else $('app').classList.toggle('collapsed');
  });
  $('overlay').addEventListener('click', () => { $('sidebar').classList.remove('open'); $('overlay').classList.remove('show'); });

  const tick = () => {
    const n = new Date();
    $('clockDate').textContent = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(n);
    $('clockTime').textContent = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(n).replace(/\./g, ':') + ' WIB';
  };
  tick(); setInterval(tick, 1000);

  if (!sb || SB_KEY.startsWith('ISI_')) return showLogin(sb ? 'Kunci Supabase belum diisi di script.js.' : 'Library Supabase gagal dimuat. Periksa koneksi internet.');
  const { data } = await sb.auth.getSession();
  if (data.session) { try { await startSession(data.session.user); } catch (x) { showLogin('Gagal memuat data: ' + x.message); } }
  else showLogin('');
});
