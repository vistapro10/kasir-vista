/* ===== VISTA PRINTING POS - modules.js (TAHAP 3 sampai 7) ===== */
'use strict';
const KEY_CLOSE = 'vista_closings';
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const ST = () => DB.get(KEY.settings, {});
const fmtNum = n => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n);
const fmtM = n => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(Math.round(n * 1e6) / 1e6);
const numID = v => Number(String(v).trim().replace(',', '.')) || 0;   // terima 2,3 maupun 2.3
const dimTxt = it => `${fmtM(it.len)} x ${fmtM(it.wid)} ${it.du === 'm' ? 'm' : 'cm'}`;
const tgl = iso => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso));
const jam = iso => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)).replace('.', ':');
const hourOf = d => Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date(d)));
const validTrx = () => DB.get(KEY.transactions, []).filter(t => t.status === 'LUNAS');
const addDay = k => dateKey(new Date(k + 'T12:00:00+07:00').getTime() + 86400000);

function openModal(html, wide) {
  const m = document.createElement('div');
  m.className = 'modal dyn';
  m.innerHTML = `<div class="modal-card ${wide ? 'wide' : ''}">${html}</div>`;
  document.body.appendChild(m);
  m.addEventListener('mousedown', e => { if (e.target === m) m.remove(); });
  return m;
}
function downloadFile(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ================= NOTA A5 (bagian 16) ================= */
function notaHTML(t) {
  const s = ST();
  const logo = s.logo ? `<img src="${s.logo}" class="n-logo" alt="Logo">` : '<span class="logo-mark n-logo-mark">V</span>';
  const rows = t.items.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.name)}${it.unit === 'meteran' ? `<br><small>${dimTxt(it)}, ${fmtNum(it.qty)} cetak</small>` : ''}</td><td>${it.unit === 'meteran' ? 'm²' : UNIT_INFO[it.unit].label}</td><td class="r">${(it.unit === 'meteran' ? fmtM(it.area * it.qty) : fmtNum(it.qty))}</td><td class="r">${rupiah(it.price)}</td><td class="r">${rupiah(it.subtotal)}</td></tr>`).join('');
  return `<div class="nota-sheet ${s.paper === 'A5' ? '' : 'p' + s.paper}">
    <div class="n-head">${logo}<div><strong class="n-store">${esc(s.storeName)}</strong><br>${esc(s.address)}<br>WhatsApp: ${esc(s.whatsapp)}</div></div>
    <h2 class="n-title">${t.status === 'BELUM LUNAS' ? 'NOTA TAGIHAN' : 'NOTA PEMBAYARAN'}</h2>
    <table class="n-meta"><tr><td>No. Nota</td><td>: ${esc(t.number)}</td><td>Tanggal</td><td>: ${tgl(t.createdAt)}</td></tr>
    <tr><td>Pelanggan</td><td>: ${esc(t.customer || '-')}</td><td>Jam</td><td>: ${jam(t.createdAt)} WIB</td></tr>
    <tr><td>Kasir</td><td>: ${esc(t.cashier)}</td><td>Metode</td><td>: ${esc(t.method)}</td></tr></table>
    <table class="n-items"><thead><tr><th>No</th><th>Nama Produk</th><th>Satuan</th><th class="r">Jumlah</th><th class="r">Harga</th><th class="r">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="n-total">
      <tr><td>Total pesanan</td><td class="r">${rupiah(t.subtotal)}</td></tr>
      ${t.discount ? `<tr><td>Diskon</td><td class="r">- ${rupiah(t.discount)}</td></tr>` : ''}
      <tr class="bold"><td>Total pembayaran</td><td class="r">${rupiah(t.total)}</td></tr>
      ${t.status === 'BELUM LUNAS'
        ? `${t.paid ? `<tr><td>Uang muka (DP)</td><td class="r">${rupiah(t.paid)}</td></tr>` : ''}<tr class="bold"><td>Sisa tagihan</td><td class="r">${rupiah(t.total - t.paid)}</td></tr>`
        : `<tr><td>Uang diterima</td><td class="r">${rupiah(t.paid)}</td></tr><tr><td>Kembalian</td><td class="r">${rupiah(t.change)}</td></tr>`}
      <tr class="bold"><td>Status pembayaran</td><td class="r">${t.status}</td></tr></table>
    <p class="n-foot">${esc(s.footer)}<br>Simpan nota ini sebagai bukti transaksi.</p></div>`;
}
function printNota(t) {
  const s = ST();
  let st = document.getElementById('pageStyle');
  if (!st) { st = document.createElement('style'); st.id = 'pageStyle'; document.head.appendChild(st); }
  st.textContent = s.paper === '80' ? '@page{size:80mm auto;margin:3mm}' : s.paper === '58' ? '@page{size:58mm auto;margin:2mm}' : '@page{size:A5 portrait;margin:8mm}';
  $('printArea').innerHTML = notaHTML(t);
  setTimeout(() => window.print(), 80);
}
function showNota(t) {
  const m = openModal(`<div class="nota-wrap">${notaHTML(t)}</div>
    <p class="muted hint">Untuk menyimpan PDF, klik Simpan PDF lalu pilih printer "Save as PDF" (Simpan sebagai PDF) di jendela cetak.</p>
    <div class="modal-actions"><button class="btn" data-x="close">Tutup</button><button class="btn" data-x="wa">Kirim WhatsApp</button><button class="btn" data-x="print">Simpan PDF</button><button class="btn btn-primary" data-x="print">Cetak Nota</button></div>`, true);
  m.addEventListener('click', e => {
    const x = e.target.dataset.x;
    if (x === 'close') m.remove();
    if (x === 'print') printNota(t);
    if (x === 'wa') sendWA(t);
  });
}

/* ================= KIRIM WHATSAPP & PELUNASAN ================= */
function sendWA(t) {
  let ph = t.phone || prompt('Nomor WhatsApp pelanggan (contoh 08123456789):', '');
  if (!ph) return;
  let n = String(ph).replace(/\D/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1); else if (n.startsWith('8')) n = '62' + n;
  if (n.length < 10) return toast('Nomor WhatsApp tidak valid');
  const all = DB.get(KEY.transactions, []), x = all.find(i => i.id === t.id);
  if (x && x.phone !== ph) { x.phone = ph; t.phone = ph; DB.set(KEY.transactions, all); }
  const s = ST(), unpaid = t.status === 'BELUM LUNAS';
  const lines = t.items.map((it, i) => `${i + 1}. ${it.name}${it.unit === 'meteran' ? ` (${dimTxt(it)}, ${fmtNum(it.qty)} cetak)` : ` x ${fmtNum(it.qty)} ${UNIT_INFO[it.unit].label}`} = ${rupiah(it.subtotal)}`).join('\n');
  const text = `*${s.storeName}*\n${unpaid ? 'NOTA TAGIHAN' : 'NOTA PEMBAYARAN'}\nNo. Nota: ${t.number}\nTanggal: ${tgl(t.createdAt)} ${jam(t.createdAt)} WIB\nPelanggan: ${t.customer || '-'}\n\n${lines}\n\n` +
    (t.discount ? `Diskon: ${rupiah(t.discount)}\n` : '') + `*Total: ${rupiah(t.total)}*\n` +
    (unpaid ? (t.paid ? `DP: ${rupiah(t.paid)}\n` : '') + `*Sisa tagihan: ${rupiah(t.total - t.paid)}*\nStatus: BELUM LUNAS\n` : 'Status: LUNAS\n') +
    `\n${s.footer}\nInfo: ${s.whatsapp}`;
  window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(text), '_blank');
}
function markPaid(t) {
  const all = DB.get(KEY.transactions, []), x = all.find(i => i.id === t.id), sisa = x.total - x.paid;
  const v = prompt(`Sisa tagihan ${rupiah(sisa)}.\nMasukkan uang yang diterima sekarang:`, sisa);
  if (v === null) return;
  const got = numID(v);
  if (got < sisa) return toast('Uang kurang dari sisa tagihan');
  x.paid += got; x.change = x.paid - x.total; x.status = 'LUNAS'; x.paidAt = new Date().toISOString();
  DB.set(KEY.transactions, all); renderRiwayat(); toast('Transaksi ditandai lunas');
}

/* ================= TAHAP 3-4: KASIR ================= */
let cart = [], lastTrx = null;
function calcItem(it) {
  it.area = it.unit === 'meteran' ? Math.round(it.len * it.wid * 1e6) / 1e6 : 0;   // panjang (m) x lebar (m)
  it.subtotal = Math.round(it.unit === 'meteran' ? it.area * it.price * it.qty : it.qty * it.price);
}
function totals() {
  const sub = cart.reduce((t, i) => t + i.subtotal, 0);
  const disc = Math.min(Math.max(Number($('cDisc').value) || 0, 0), sub);
  return { sub, disc, total: sub - disc };
}
function renderKasir() {
  const all = DB.get(KEY.products, []).filter(p => p.active && p.units.length);
  const sel = $('kCat'), cur = sel.value;
  sel.innerHTML = '<option value="">Semua kategori</option>' + [...new Set(all.map(p => p.category))].sort().map(c => `<option value="${esc(c)}" ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('');
  const q = $('kSearch').value.trim().toLowerCase();
  const list = all.filter(p => (!sel.value || p.category === sel.value) && (!q || p.name.toLowerCase().includes(q)));
  $('kGrid').innerHTML = list.length ? list.map(p => `<article class="product click" data-id="${p.id}">
    <div class="product-photo">${p.photo ? `<img src="${p.photo}" alt="">` : icon('box')}</div>
    <div class="product-body"><h3>${esc(p.name)}</h3><span class="muted">${esc(p.category)}</span>
    <ul class="prices">${p.units.map(u => `<li><span>${UNIT_INFO[u].label}</span><strong>${rupiah(p[UNIT_INFO[u].field])}${UNIT_INFO[u].suffix}</strong></li>`).join('')}</ul></div></article>`).join('')
    : '<div class="card muted">Produk tidak ditemukan. Produk aktif dari Katalog tampil di sini.</div>';
  renderCart();
}
function renderCart() {
  cart.forEach(calcItem);
  $('cartBody').innerHTML = cart.length ? cart.map((it, i) => `<tr><td>${esc(it.name)}<br><small class="muted">${UNIT_INFO[it.unit].label}${it.unit === 'meteran' ? ` ${dimTxt(it)} = ${fmtM(it.area * it.qty)} m² (${fmtNum(it.qty)} cetak)` : ''}</small></td>
    <td><div class="qty"><button type="button" data-c="-" data-i="${i}">-</button><span>${fmtNum(it.qty)}</span><button type="button" data-c="+" data-i="${i}">+</button></div></td>
    <td class="num">${rupiah(it.price)}${it.unit === 'meteran' ? '/m²' : ''}</td><td class="num">${rupiah(it.subtotal)}</td>
    <td><button type="button" class="btn btn-sm btn-danger" data-c="x" data-i="${i}">Hapus</button></td></tr>`).join('')
    : '<tr><td class="empty" colspan="5">Klik produk untuk memulai transaksi.</td></tr>';
  updatePay();
}
function updatePay() {
  const { total } = totals(), mt = $('cMethod').value, tunai = mt === 'Tunai', unpaid = mt === 'Belum dibayar';
  $('cTotal').textContent = rupiah(total);
  $('cPaid').disabled = !(tunai || unpaid);
  if (!tunai && !unpaid) $('cPaid').value = total || '';
  $('cPaidL').textContent = unpaid ? 'Uang muka / DP (opsional)' : 'Uang dibayar (Rp)';
  $('cChangeL').textContent = unpaid ? 'Sisa tagihan' : 'Kembalian';
  const paid = Number($('cPaid').value) || 0;
  $('cChange').textContent = rupiah(unpaid ? Math.max(0, total - paid) : Math.max(0, paid - total));
}
function addToCart(p) {
  if (p.units.length === 1 && p.units[0] !== 'meteran') {
    const u = p.units[0], ex = cart.find(i => i.pid === p.id && i.unit === u);
    if (ex) ex.qty++; else cart.push({ pid: p.id, name: p.name, unit: u, qty: 1, price: p[UNIT_INFO[u].field], len: 0, wid: 0 });
    return renderCart();
  }
  itemDialog(p);
}
function itemDialog(p) {
  const m = openModal(`<h3>${esc(p.name)}</h3><div class="form-grid">
    <div class="full"><label>Satuan</label><select id="dUnit">${p.units.map(u => `<option value="${u}">${UNIT_INFO[u].label} - ${rupiah(p[UNIT_INFO[u].field])}${UNIT_INFO[u].suffix}</option>`).join('')}</select></div>
    <div id="dDims" class="full form-grid"><div><label>Panjang (meter)</label><input id="dLen" type="text" inputmode="decimal" placeholder="contoh: 2"></div><div><label>Lebar (meter)</label><input id="dWid" type="text" inputmode="decimal" placeholder="contoh: 2,3"></div></div>
    <div class="full"><label id="dQtyL">Jumlah</label><input id="dQty" type="number" min="1" step="1" value="1"></div></div>
    <p class="dsum">Luas: <b id="dArea">-</b> | Subtotal: <b id="dSub">Rp0</b></p><p id="dErr" class="error" hidden></p>
    <div class="modal-actions"><button class="btn" data-x="close">Batal</button><button class="btn btn-primary" data-x="add">Masukkan ke keranjang</button></div>`);
  const get = () => {
    const u = m.querySelector('#dUnit').value, price = p[UNIT_INFO[u].field];
    const it = { pid: p.id, name: p.name, unit: u, price, qty: Number(m.querySelector('#dQty').value) || 0, len: numID(m.querySelector('#dLen').value), wid: numID(m.querySelector('#dWid').value), du: 'm' };
    calcItem(it); return it;
  };
  const upd = () => {
    const it = get(), met = it.unit === 'meteran';
    m.querySelector('#dDims').hidden = !met;
    m.querySelector('#dQtyL').textContent = met ? 'Jumlah cetak' : 'Jumlah';
    m.querySelector('#dArea').textContent = met ? `${fmtM(it.len)} m x ${fmtM(it.wid)} m = ${fmtM(it.area)} m² x ${it.qty} cetak = ${fmtM(it.area * it.qty)} m² x ${rupiah(it.price)}` : '-';
    m.querySelector('#dSub').textContent = rupiah(it.subtotal);
  };
  m.addEventListener('input', upd); m.addEventListener('change', upd); upd();
  m.addEventListener('click', e => {
    const x = e.target.dataset.x;
    if (x === 'close') m.remove();
    if (x === 'add') {
      const it = get(), er = m.querySelector('#dErr');
      if (it.qty < 1) { er.textContent = 'Jumlah minimal 1.'; er.hidden = false; return; }
      if (it.unit === 'meteran' && (it.len <= 0 || it.wid <= 0)) { er.textContent = 'Isi panjang dan lebar (dalam meter) dengan angka lebih dari 0, contoh: 2,3.'; er.hidden = false; return; }
      const ex = it.unit !== 'meteran' && cart.find(i => i.pid === it.pid && i.unit === it.unit);
      if (ex) ex.qty += it.qty; else cart.push(it);
      m.remove(); renderCart();
    }
  });
}
function nextNumber() {
  const pre = 'INV-' + dateKey(new Date()).replace(/-/g, '') + '-';
  const n = Math.max(0, ...DB.get(KEY.transactions, []).filter(t => t.number.startsWith(pre)).map(t => Number(t.number.slice(pre.length)))) + 1;
  return pre + String(n).padStart(4, '0');
}
function processTrx() {
  const err = $('cErr'), fail = m => { err.textContent = m; err.hidden = false; };
  err.hidden = true;
  if (!cart.length) return fail('Keranjang masih kosong.');
  const { sub, disc, total } = totals();
  if ((Number($('cDisc').value) || 0) > sub) return fail('Diskon tidak boleh lebih besar dari total pesanan.');
  const method = $('cMethod').value;
  const unpaid = method === 'Belum dibayar';
  const paid = (method === 'Tunai' || unpaid) ? Number($('cPaid').value) || 0 : total;
  if (unpaid && paid >= total) return fail('Uang muka sama dengan atau melebihi total. Pilih metode pembayaran lunas.');
  if (!unpaid && paid < total) return fail(`Uang kurang ${rupiah(total - paid)}.`);
  const t = {
    id: Date.now(), number: nextNumber(), createdAt: new Date().toISOString(), customer: $('cCust').value.trim(), phone: $('cPhone').value.trim(), cashier: session.name,
    items: cart.map(i => ({ name: i.name, unit: i.unit, qty: i.qty, len: i.len, wid: i.wid, du: i.du, area: i.area, price: i.price, subtotal: i.subtotal })),
    subtotal: sub, discount: disc, total, paid, change: unpaid ? 0 : paid - total, method, status: unpaid ? 'BELUM LUNAS' : 'LUNAS'
  };
  const all = DB.get(KEY.transactions, []); all.push(t);
  if (!DB.set(KEY.transactions, all)) return;
  lastTrx = t; cart = [];
  $('cCust').value = ''; $('cPhone').value = ''; $('cMethod').value = 'Tunai'; $('cDisc').value = ''; $('cPaid').value = '';
  $('btnPrintLast').disabled = false;
  renderCart(); showNota(t); toast('Transaksi berhasil: ' + t.number);
}
function buildKasir() {
  $('page-kasir').innerHTML = `<div class="pos"><div>
    <div class="toolbar"><input id="kSearch" type="search" placeholder="Cari produk..."><select id="kCat"></select></div>
    <div id="kGrid" class="product-grid pos-grid"></div></div>
    <aside class="card cart"><h3>Keranjang</h3>
    <div class="table-wrap"><table><thead><tr><th>Produk</th><th>Jumlah</th><th class="num">Harga</th><th class="num">Subtotal</th><th></th></tr></thead><tbody id="cartBody"></tbody></table></div>
    <div class="pay"><label for="cCust">Nama pelanggan (opsional)</label><input id="cCust">
    <label for="cPhone">No. WhatsApp pelanggan (opsional)</label><input id="cPhone" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx">
    <label for="cDisc">Diskon (Rp)</label><input id="cDisc" type="number" min="0">
    <label for="cMethod">Metode pembayaran</label><select id="cMethod"><option>Tunai</option><option>Transfer</option><option>QRIS</option><option>Belum dibayar</option></select>
    <div class="line"><span>Total</span><strong id="cTotal">Rp0</strong></div>
    <label for="cPaid" id="cPaidL">Uang dibayar (Rp)</label><input id="cPaid" type="number" min="0">
    <div class="line"><span id="cChangeL">Kembalian</span><strong id="cChange">Rp0</strong></div>
    <p id="cErr" class="error" hidden></p>
    <button id="btnProcess" type="button" class="btn btn-primary btn-block">PROSES TRANSAKSI</button>
    <button id="btnPrintLast" type="button" class="btn btn-block" disabled>CETAK NOTA</button>
    <button id="btnClear" type="button" class="btn btn-block">Kosongkan keranjang</button></div></aside></div>`;
  $('kSearch').addEventListener('input', renderKasir);
  $('kCat').addEventListener('change', renderKasir);
  $('kGrid').addEventListener('click', e => {
    const c = e.target.closest('[data-id]'); if (!c) return;
    const p = DB.get(KEY.products, []).find(x => x.id === Number(c.dataset.id)); if (p) addToCart(p);
  });
  $('cartBody').addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    const i = Number(b.dataset.i), it = cart[i];
    if (b.dataset.c === '+') it.qty++;
    if (b.dataset.c === '-') { it.qty--; if (it.qty < 1) cart.splice(i, 1); }
    if (b.dataset.c === 'x') cart.splice(i, 1);
    renderCart();
  });
  ['cDisc', 'cPaid'].forEach(id => $(id).addEventListener('input', updatePay));
  $('cMethod').addEventListener('change', () => { $('cPaid').value = ''; updatePay(); });
  $('btnProcess').addEventListener('click', processTrx);
  $('btnPrintLast').addEventListener('click', () => lastTrx && printNota(lastTrx));
  $('btnClear').addEventListener('click', () => { cart = []; renderCart(); });
}

/* ================= TAHAP 5: RIWAYAT TRANSAKSI ================= */
function filteredTrx() {
  const q = $('rQ').value.trim().toLowerCase(), d = $('rDate').value, m = $('rMonth').value, y = $('rYear').value.trim();
  return DB.get(KEY.transactions, []).filter(t => {
    const k = dateKey(t.createdAt);
    return (!q || (t.number + ' ' + (t.customer || '')).toLowerCase().includes(q)) && (!d || k === d) && (!m || k.slice(0, 7) === m) && (!y || k.slice(0, 4) === y);
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function renderRiwayat() {
  const list = filteredTrx();
  $('rBody').innerHTML = list.length ? list.map(t => `<tr><td>${esc(t.number)}</td><td>${tgl(t.createdAt)}</td><td>${jam(t.createdAt)}</td><td>${esc(t.customer || '-')}</td><td class="num">${rupiah(t.total)}</td><td>${esc(t.method)}</td>
    <td><span class="badge ${t.status === 'LUNAS' ? 'ok' : 'bad'}">${esc(t.status)}</span></td>
    <td class="acts"><button class="btn btn-sm" data-a="view" data-id="${t.id}">Detail</button><button class="btn btn-sm" data-a="print" data-id="${t.id}">Cetak Ulang Nota</button><button class="btn btn-sm" data-a="wa" data-id="${t.id}">Kirim WA</button>${t.status === 'BELUM LUNAS' ? `<button class="btn btn-sm btn-primary" data-a="pay" data-id="${t.id}">Tandai Lunas</button>` : ''}${isAdmin() ? `<button class="btn btn-sm btn-danger" data-a="void" data-id="${t.id}">${t.status === 'BATAL' ? 'Aktifkan' : 'Batalkan'}</button>` : ''}</td></tr>`).join('')
    : '<tr><td class="empty" colspan="8">Tidak ada transaksi yang cocok.</td></tr>';
  $('rInfo').textContent = `${list.length} transaksi | Lunas: ${rupiah(sum(list.filter(t => t.status === 'LUNAS'), t => t.total))} | Belum dibayar: ${rupiah(sum(list.filter(t => t.status === 'BELUM LUNAS'), t => t.total - t.paid))}`;
}
function buildRiwayat() {
  $('page-riwayat').innerHTML = `<div class="toolbar"><input id="rQ" type="search" placeholder="Cari nomor atau nama pelanggan...">
    <input id="rDate" type="date" title="Tanggal"><input id="rMonth" type="month" title="Bulan"><input id="rYear" type="number" min="2000" max="2100" placeholder="Tahun">
    <button id="rReset" class="btn" type="button">Reset</button><button id="rCsv" class="btn btn-primary" type="button">Ekspor CSV</button></div>
    <p id="rInfo" class="muted" style="margin-bottom:14px"></p>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>No. Transaksi</th><th>Tanggal</th><th>Jam</th><th>Pelanggan</th><th class="num">Total</th><th>Metode</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="rBody"></tbody></table></div></div>`;
  ['rQ', 'rDate', 'rMonth', 'rYear'].forEach(id => $(id).addEventListener('input', renderRiwayat));
  $('rReset').addEventListener('click', () => { ['rQ', 'rDate', 'rMonth', 'rYear'].forEach(id => $(id).value = ''); renderRiwayat(); });
  $('rCsv').addEventListener('click', () => {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['No Transaksi', 'Tanggal', 'Jam', 'Pelanggan', 'Kasir', 'Total', 'Metode', 'Status']].concat(filteredTrx().map(t => [t.number, dateKey(t.createdAt), jam(t.createdAt), t.customer || '', t.cashier, t.total, t.method, t.status]));
    downloadFile('riwayat-transaksi-' + dateKey(new Date()) + '.csv', '\ufeff' + rows.map(r => r.map(q).join(';')).join('\r\n'), 'text/csv');
  });
  $('rBody').addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const all = DB.get(KEY.transactions, []), t = all.find(x => x.id === Number(b.dataset.id));
    if (b.dataset.a === 'view') showNota(t);
    if (b.dataset.a === 'print') printNota(t);
    if (b.dataset.a === 'wa') sendWA(t);
    if (b.dataset.a === 'pay') markPaid(t);
    if (b.dataset.a === 'void' && confirm(t.status === 'BATAL' ? 'Aktifkan kembali transaksi ini?' : 'Batalkan transaksi ini? Nilainya tidak lagi dihitung di laporan.')) {
      t.status = t.status === 'BATAL' ? (t.paid >= t.total ? 'LUNAS' : 'BELUM LUNAS') : 'BATAL'; DB.set(KEY.transactions, all); renderRiwayat();
    }
  });
}

/* ================= TAHAP 5: PENGELUARAN ================= */
const KAT_EXP = ['Pembelian bahan', 'Tinta printer', 'Kertas', 'Listrik', 'Operasional', 'Perawatan mesin', 'Lain-lain'];
let editExp = null;
function renderExp() {
  const list = [...DB.get(KEY.expenses, [])].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  $('xTotal').textContent = rupiah(sum(list, e => e.amount));
  $('xBody').innerHTML = list.length ? list.map(e => `<tr><td>${tgl(e.date + 'T12:00:00+07:00')}</td><td>${esc(e.name)}${e.note ? `<br><small class="muted">${esc(e.note)}</small>` : ''}</td><td>${esc(e.category)}</td><td class="num">${rupiah(e.amount)}</td>
    <td class="acts"><button class="btn btn-sm" data-a="edit" data-id="${e.id}">Edit</button><button class="btn btn-sm btn-danger" data-a="del" data-id="${e.id}">Hapus</button></td></tr>`).join('')
    : '<tr><td class="empty" colspan="5">Belum ada pengeluaran tercatat.</td></tr>';
}
function buildExp() {
  $('page-pengeluaran').innerHTML = `<div class="grid-2 grid-wide-left"><div class="card"><h3>Riwayat Pengeluaran <span class="muted">Total: <b id="xTotal"></b></span></h3>
    <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th class="num">Nominal</th><th>Aksi</th></tr></thead><tbody id="xBody"></tbody></table></div></div>
    <form id="xForm" class="card" autocomplete="off"><h3 id="xTitle">Tambah Pengeluaran</h3>
    <label class="fl" for="xDate">Tanggal</label><input id="xDate" type="date" required>
    <label class="fl" for="xName">Nama atau keterangan</label><input id="xName" required>
    <label class="fl" for="xCat">Kategori</label><select id="xCat">${KAT_EXP.map(k => `<option>${k}</option>`).join('')}</select>
    <label class="fl" for="xAmt">Nominal (Rp)</label><input id="xAmt" type="number" min="1" required>
    <label class="fl" for="xNote">Catatan tambahan</label><textarea id="xNote" rows="2"></textarea>
    <div class="modal-actions"><button type="button" id="xCancel" class="btn">Batal</button><button type="submit" class="btn btn-primary">Simpan</button></div></form></div>`;
  const reset = () => { editExp = null; $('xTitle').textContent = 'Tambah Pengeluaran'; $('xForm').reset(); $('xDate').value = dateKey(new Date()); };
  reset();
  $('xCancel').addEventListener('click', reset);
  $('xForm').addEventListener('submit', e => {
    e.preventDefault(); if (!isAdmin()) return;
    const list = DB.get(KEY.expenses, []);
    const d = { date: $('xDate').value, name: $('xName').value.trim(), category: $('xCat').value, amount: Number($('xAmt').value), note: $('xNote').value.trim() };
    if (!d.name || !(d.amount > 0)) return toast('Isi keterangan dan nominal.');
    if (editExp) { const i = list.findIndex(x => x.id === editExp); list[i] = { ...list[i], ...d }; }
    else list.push({ id: Date.now(), ...d });
    DB.set(KEY.expenses, list); reset(); renderExp(); toast('Pengeluaran disimpan');
  });
  $('xBody').addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b || !isAdmin()) return;
    const list = DB.get(KEY.expenses, []), x = list.find(i => i.id === Number(b.dataset.id));
    if (b.dataset.a === 'edit') {
      editExp = x.id; $('xTitle').textContent = 'Edit Pengeluaran';
      $('xDate').value = x.date; $('xName').value = x.name; $('xCat').value = x.category; $('xAmt').value = x.amount; $('xNote').value = x.note || '';
      $('xName').focus();
    }
    if (b.dataset.a === 'del' && confirm(`Hapus pengeluaran "${x.name}"?`)) { DB.set(KEY.expenses, list.filter(i => i.id !== x.id)); renderExp(); }
  });
}

/* ================= TAHAP 6: LAPORAN & TUTUP BUKU ================= */
const inPeriod = (k, type, v) => type === 'harian' ? k === v : type === 'bulanan' ? k.slice(0, 7) === v : k.slice(0, 4) === v;
function buildReport(type, v) {
  const trx = validTrx().filter(t => inPeriod(dateKey(t.createdAt), type, v));
  const exp = DB.get(KEY.expenses, []).filter(e => inPeriod(e.date, type, v));
  let labels, data;
  if (type === 'harian') { labels = [...Array(24)].map((_, i) => String(i).padStart(2, '0') + ':00'); data = labels.map(() => 0); trx.forEach(t => data[hourOf(t.createdAt)] += t.total); }
  else if (type === 'bulanan') { const [y, m] = v.split('-').map(Number); labels = [...Array(new Date(y, m, 0).getDate())].map((_, i) => String(i + 1)); data = labels.map(() => 0); trx.forEach(t => data[Number(dateKey(t.createdAt).slice(8)) - 1] += t.total); }
  else { labels = BULAN_PENDEK; data = labels.map(() => 0); trx.forEach(t => data[Number(dateKey(t.createdAt).slice(5, 7)) - 1] += t.total); }
  return { trx, exp, labels, data, income: sum(trx, t => t.total), spend: sum(exp, e => e.amount) };
}
function renderLaporan() {
  const type = $('lType').value;
  $('lDate').hidden = type !== 'harian'; $('lMonth').hidden = type !== 'bulanan'; $('lYear').hidden = type !== 'tahunan';
  const v = type === 'harian' ? $('lDate').value : type === 'bulanan' ? $('lMonth').value : $('lYear').value;
  if (!v) { $('lOut').innerHTML = '<div class="card muted">Pilih periode laporan terlebih dahulu.</div>'; return; }
  const r = buildReport(type, v), profit = r.income - r.spend;
  let extra = '';
  if (type === 'harian') {
    extra = `<div class="card"><h3>Transaksi Hari Ini</h3><div class="table-wrap"><table><thead><tr><th>No.</th><th>Jam</th><th>Pelanggan</th><th class="num">Total</th></tr></thead><tbody>${r.trx.length ? r.trx.map(t => `<tr><td>${esc(t.number)}</td><td>${jam(t.createdAt)}</td><td>${esc(t.customer || '-')}</td><td class="num">${rupiah(t.total)}</td></tr>`).join('') : '<tr><td class="empty" colspan="4">Tidak ada transaksi pada tanggal ini.</td></tr>'}</tbody></table></div></div>`;
  } else if (type === 'bulanan') {
    const [y, m] = v.split('-').map(Number), pv = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`, p = buildReport('bulanan', pv), pp = p.income - p.spend;
    const pct = (a, b) => b ? ((a - b) / b * 100).toFixed(1).replace('.', ',') + '%' : 'tidak ada pembanding';
    extra = `<div class="card"><h3>Perbandingan dengan bulan sebelumnya (${BULAN[(m + 10) % 12]})</h3><div class="table-wrap"><table><thead><tr><th></th><th class="num">Bulan ini</th><th class="num">Bulan lalu</th><th class="num">Perubahan</th></tr></thead><tbody>
      <tr><td>Pemasukan</td><td class="num">${rupiah(r.income)}</td><td class="num">${rupiah(p.income)}</td><td class="num">${pct(r.income, p.income)}</td></tr>
      <tr><td>Pengeluaran</td><td class="num">${rupiah(r.spend)}</td><td class="num">${rupiah(p.spend)}</td><td class="num">${pct(r.spend, p.spend)}</td></tr>
      <tr><td>Keuntungan bersih</td><td class="num">${rupiah(profit)}</td><td class="num">${rupiah(pp)}</td><td class="num">${pct(profit, pp)}</td></tr></tbody></table></div></div>`;
  } else {
    const rows = BULAN.map((n, i) => {
      const k = `${v}-${String(i + 1).padStart(2, '0')}`, b = buildReport('bulanan', k), pr = b.income - b.spend;
      return `<tr><td>${n}</td><td class="num">${rupiah(b.income)}</td><td class="num">${rupiah(b.spend)}</td><td class="num">${rupiah(pr)}</td><td class="num">${b.trx.length}</td></tr>`;
    }).join('');
    extra = `<div class="card"><h3>Perbandingan antarbulan</h3><div class="table-wrap"><table><thead><tr><th>Bulan</th><th class="num">Pemasukan</th><th class="num">Pengeluaran</th><th class="num">Keuntungan</th><th class="num">Transaksi</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  $('lOut').innerHTML = `<div class="cards four"><article class="card stat"><div><p class="muted">Total pemasukan</p><h2>${rupiah(r.income)}</h2></div></article>
    <article class="card stat"><div><p class="muted">Total pengeluaran</p><h2>${rupiah(r.spend)}</h2></div></article>
    <article class="card stat"><div><p class="muted">Keuntungan bersih</p><h2>${rupiah(profit)}</h2></div></article>
    <article class="card stat"><div><p class="muted">Jumlah transaksi</p><h2>${r.trx.length}</h2></div></article></div>
    <div class="card" style="margin-bottom:18px"><h3>Grafik pemasukan</h3><div class="chart-box"><canvas id="chartLap"></canvas></div></div>${extra}`;
  drawChart('lap', 'chartLap', type === 'harian' ? 'line' : 'bar', r.labels, r.data);
  const cl = DB.get(KEY_CLOSE, {});
  $('lClose').innerHTML = Object.keys(cl).sort().reverse().slice(0, 14).map(k => { const c = cl[k]; return `<tr><td>${tgl(k + 'T12:00:00+07:00')}</td><td class="num">${rupiah(c.income)}</td><td class="num">${rupiah(c.expense)}</td><td class="num">${rupiah(c.profit)}</td><td class="num">${c.count}</td><td>${jam(c.closedAt)} WIB</td></tr>`; }).join('')
    || '<tr><td class="empty" colspan="6">Belum ada tutup buku. Proses berjalan otomatis setiap pukul 20.00 WIB.</td></tr>';
}
function buildLaporan() {
  $('page-laporan').innerHTML = `<div class="toolbar"><select id="lType"><option value="harian">Laporan Harian</option><option value="bulanan">Laporan Bulanan</option><option value="tahunan">Laporan Tahunan</option></select>
    <input id="lDate" type="date"><input id="lMonth" type="month"><input id="lYear" type="number" min="2000" max="2100"></div>
    <div id="lOut"></div><div class="card" style="margin-top:18px"><h3>Riwayat Tutup Buku Harian <span class="muted">(otomatis 20.00 WIB, data transaksi tidak dihapus)</span></h3>
    <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th class="num">Pemasukan</th><th class="num">Pengeluaran</th><th class="num">Keuntungan</th><th class="num">Transaksi</th><th>Ditutup</th></tr></thead><tbody id="lClose"></tbody></table></div></div>`;
  const t = dateKey(new Date());
  $('lDate').value = t; $('lMonth').value = t.slice(0, 7); $('lYear').value = t.slice(0, 4);
  ['lType', 'lDate', 'lMonth', 'lYear'].forEach(id => $(id).addEventListener('input', renderLaporan));
}
/* Tutup buku: menyimpan rekap hari yang sudah lewat pukul 20.00, termasuk hari yang terlewat */
function checkClosing() {
  const cl = DB.get(KEY_CLOSE, {}), now = new Date(), today = dateKey(now), hr = hourOf(now);
  const trx = validTrx(), exp = DB.get(KEY.expenses, []);
  const dates = [...trx.map(t => dateKey(t.createdAt)), ...exp.map(e => e.date)].sort();
  if (!dates.length) return;
  const last = Object.keys(cl).sort().pop();
  let d = last ? addDay(last) : dates[0], n = 0;
  while (d < today || (d === today && hr >= 20)) {
    if (!cl[d]) {
      const tt = trx.filter(t => dateKey(t.createdAt) === d), ee = exp.filter(e => e.date === d);
      const income = sum(tt, t => t.total), expense = sum(ee, e => e.amount);
      cl[d] = { date: d, income, expense, profit: income - expense, count: tt.length, closedAt: new Date().toISOString() }; n++;
    }
    d = addDay(d);
  }
  if (n) { DB.set(KEY_CLOSE, cl); if (session) toast(`Tutup buku selesai (${n} hari)`); if (currentPage === 'laporan') renderLaporan(); }
}

/* ================= TAHAP 7: PENGATURAN, BACKUP, RESTORE ================= */
let logoTmp = '';
function renderPengaturan() {
  const s = ST(), users = DB.get(KEY.users, []);
  $('sName').value = s.storeName; $('sAddr').value = s.address; $('sWa').value = s.whatsapp; $('sPaper').value = s.paper; $('sFoot').value = s.footer;
  logoTmp = s.logo || ''; $('sLogoPrev').innerHTML = logoTmp ? `<img src="${logoTmp}" alt="">` : 'Tanpa logo';
  $('aUser').innerHTML = users.map(u => `<option value="${u.id}">${esc(u.name)} (${u.role})</option>`).join('');
  fillAccount();
}
function fillAccount() {
  const u = DB.get(KEY.users, []).find(x => x.id === Number($('aUser').value));
  if (u) { $('aName').value = u.name; $('aLogin').value = u.username; $('aPass').value = ''; }
}
function buildPengaturan() {
  $('page-pengaturan').innerHTML = `<div class="grid-2">
    <form id="sForm" class="card" autocomplete="off"><h3>Pengaturan Toko</h3>
    <label class="fl" for="sName">Nama toko</label><input id="sName" required>
    <label class="fl" for="sAddr">Alamat toko</label><textarea id="sAddr" rows="2"></textarea>
    <label class="fl" for="sWa">Nomor WhatsApp</label><input id="sWa">
    <label class="fl" for="sPaper">Ukuran nota</label><select id="sPaper"><option value="A5">A5 (148 x 210 mm)</option><option value="80">Thermal 80 mm</option><option value="58">Thermal 58 mm</option></select>
    <label class="fl" for="sFoot">Footer nota</label><textarea id="sFoot" rows="2"></textarea>
    <label class="fl" for="sLogo">Logo toko</label><div class="photo-row"><div id="sLogoPrev" class="photo-preview"></div><div class="photo-actions"><input id="sLogo" type="file" accept="image/*"><button type="button" id="sLogoDel" class="btn">Hapus logo</button></div></div>
    <div class="modal-actions"><button class="btn btn-primary" type="submit">Simpan pengaturan</button></div></form>
    <div><form id="aForm" class="card" autocomplete="off" style="margin-bottom:18px"><h3>Akun Pengguna</h3>
    <label class="fl" for="aUser">Pilih akun</label><select id="aUser"></select>
    <label class="fl" for="aName">Nama</label><input id="aName" required>
    <label class="fl" for="aLogin">Username</label><input id="aLogin" required>
    <label class="fl" for="aPass">Password baru (kosongkan jika tidak diganti)</label><input id="aPass" type="password">
    <div class="modal-actions"><button class="btn btn-primary" type="submit">Simpan akun</button></div></form>
    <div class="card"><h3>Backup dan Restore</h3><p class="muted" style="margin-bottom:12px">Backup menyimpan semua data (produk, transaksi, pengeluaran, pengaturan, akun, tutup buku) ke file JSON.</p>
    <button id="bBackup" type="button" class="btn btn-primary">Unduh Backup</button>
    <label class="fl" for="bFile">Pulihkan dari file backup</label><input id="bFile" type="file" accept=".json,application/json"></div></div></div>`;
  $('sLogo').addEventListener('change', async e => {
    if (!e.target.files[0]) return;
    try { logoTmp = await resizeImage(e.target.files[0], 300); $('sLogoPrev').innerHTML = `<img src="${logoTmp}" alt="">`; } catch (x) { toast('Gambar tidak dapat dibaca'); }
  });
  $('sLogoDel').addEventListener('click', () => { logoTmp = ''; $('sLogo').value = ''; $('sLogoPrev').textContent = 'Tanpa logo'; });
  $('sForm').addEventListener('submit', e => {
    e.preventDefault(); if (!isAdmin()) return;
    if (DB.set(KEY.settings, { storeName: $('sName').value.trim(), address: $('sAddr').value.trim(), whatsapp: $('sWa').value.trim(), paper: $('sPaper').value, footer: $('sFoot').value.trim(), logo: logoTmp })) toast('Pengaturan disimpan');
  });
  $('aUser').addEventListener('change', fillAccount);
  $('aForm').addEventListener('submit', e => {
    e.preventDefault(); if (!isAdmin()) return;
    const users = DB.get(KEY.users, []), u = users.find(x => x.id === Number($('aUser').value));
    const login = $('aLogin').value.trim().toLowerCase();
    if (!login || users.some(x => x.id !== u.id && x.username.toLowerCase() === login)) return toast('Username kosong atau sudah dipakai');
    u.name = $('aName').value.trim() || u.name; u.username = login;
    if ($('aPass').value) { if ($('aPass').value.length < 6) return toast('Password minimal 6 karakter'); u.password = $('aPass').value; }
    DB.set(KEY.users, users);
    if (session.id === u.id) { session.name = u.name; session.username = u.username; DB.set(KEY.session, session); $('userName').textContent = u.name; }
    renderPengaturan(); toast('Akun disimpan');
  });
  $('bBackup').addEventListener('click', () => {
    const data = {}; [KEY.users, KEY.products, KEY.transactions, KEY.expenses, KEY.settings, KEY_CLOSE].forEach(k => data[k] = DB.get(k, null));
    downloadFile('backup-vista-pos-' + dateKey(new Date()) + '.json', JSON.stringify({ app: 'VISTA-POS', date: new Date().toISOString(), data }), 'application/json');
  });
  $('bFile').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const b = JSON.parse(r.result);
        if (b.app !== 'VISTA-POS' || !b.data || !Array.isArray(b.data[KEY.users]) || !Array.isArray(b.data[KEY.products])) throw 0;
        if (!confirm('Pulihkan data dari backup? Semua data saat ini akan diganti.')) return;
        Object.keys(b.data).forEach(k => { if (b.data[k] !== null && Object.values(KEY).concat(KEY_CLOSE).includes(k)) DB.set(k, b.data[k]); });
        alert('Data berhasil dipulihkan. Halaman akan dimuat ulang.'); logout(); location.reload();
      } catch (x) { alert('File backup tidak valid.'); }
    };
    r.readAsText(f); e.target.value = '';
  });
}

/* ================= PENGHUBUNG ================= */
window.PAGE_HOOKS = { kasir: renderKasir, riwayat: renderRiwayat, pengeluaran: renderExp, laporan: () => { checkClosing(); renderLaporan(); }, pengaturan: renderPengaturan };
document.addEventListener('DOMContentLoaded', () => {
  const pa = document.createElement('div'); pa.id = 'printArea'; document.body.appendChild(pa);
  buildKasir(); buildRiwayat(); buildExp(); buildLaporan(); buildPengaturan();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const m = [...document.querySelectorAll('.modal.dyn')].pop(); if (m) m.remove(); } });
  checkClosing(); setInterval(checkClosing, 30000);
});
