const stores = window.STORE_DATA || [];
const map = L.map('map', { zoomControl: false, scrollWheelZoom: true }).setView([-8.76, 116.85], 10);

// Leaflet map using OpenStreetMap standard tiles (no API key required).
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
}).addTo(map);

const markerLayer = L.featureGroup().addTo(map);
const markers = new Map();
let activeFilter = 'all';
let activeCode = null;

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]));

function popupContent(s) {
  const route = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.lat},${s.lon}`)}`;
  return `<div class="popup-title">${esc(s.nama)}</div>
    <div class="popup-code">${esc(s.kode)} · ${esc(s.kota)}</div>
    <div class="popup-line"><b>Status 24H:</b> ${s['24h'] === 'T' ? 'Ya' : 'Tidak'}</div>
    <div class="popup-line"><b>AC:</b> ${esc(s.ac)}</div>
    <div class="popup-line"><b>Vendor:</b> ${esc(s.vendor)}</div>
    <div class="popup-line"><b>IP:</b> ${esc(s.ip)}</div>
    <a class="popup-link" target="_blank" rel="noopener" href="${route}">Buka rute Google Maps ↗</a>`;
}

function makeIcon(active = false) {
  return L.divIcon({
    className: `custom-marker ${active ? 'active' : ''}`,
    html: '<div class="pin"><span>A</span></div>',
    iconSize: [29, 29],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26]
  });
}

stores.forEach(s => {
  const marker = L.marker([s.lat, s.lon], { icon: makeIcon() })
    .bindPopup(popupContent(s))
    .addTo(markerLayer);
  marker.on('click', () => {
    activeCode = s.kode;
    renderList();
  });
  markers.set(s.kode, marker);
});

if (markerLayer.getLayers().length) map.fitBounds(markerLayer.getBounds().pad(0.12));

function filtered() {
  const q = $('searchInput').value.toLowerCase().trim();
  return stores.filter(s =>
    (activeFilter === 'all' || s['24h'] === activeFilter) &&
    (!q || [s.nama, s.kode, s.kota, s.ac, s.vendor].join(' ').toLowerCase().includes(q))
  );
}

function renderList() {
  const list = filtered();
  $('visibleCount').textContent = list.length;
  $('storeList').innerHTML = list.map(s => `
    <button class="store-item ${activeCode === s.kode ? 'selected' : ''}" data-code="${esc(s.kode)}">
      <span class="store-index">${String(s.no).padStart(2, '0')}</span>
      <span class="store-info"><b>${esc(s.nama)}</b><small>${esc(s.kode)} · ${esc(s.ac)}</small></span>
      <span class="status ${s['24h'] === 'T' ? 'yes' : 'no'}">${s['24h'] === 'T' ? '24 JAM' : 'NON-24H'}</span>
    </button>`).join('') ||
    '<div style="padding:24px;text-align:center;color:#9aa3b2;font-size:11px">Toko tidak ditemukan.</div>';

  document.querySelectorAll('.store-item').forEach(el =>
    el.addEventListener('click', () => selectStore(el.dataset.code))
  );
}

function selectStore(code) {
  const s = stores.find(x => x.kode === code);
  const marker = markers.get(code);
  if (!s || !marker) return;
  activeCode = code;
  renderList();
  map.flyTo([s.lat, s.lon], Math.max(map.getZoom(), 14), { duration: 0.6 });
  marker.openPopup();
}

function showAll() {
  if (markerLayer.getLayers().length) map.fitBounds(markerLayer.getBounds().pad(0.12));
}

function updateStats() {
  $('totalCount').textContent = stores.length;
  $('count24').textContent = stores.filter(s => s['24h'] === 'T').length;
  $('countNon24').textContent = stores.filter(s => s['24h'] === 'F').length;
  $('vendorCount').textContent = new Set(stores.map(s => s.vendor)).size;
}

document.querySelectorAll('.filter').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(x => x.classList.remove('active'));
    button.classList.add('active');
    activeFilter = button.dataset.filter;
    renderList();
  });
});

$('searchInput').addEventListener('input', renderList);
$('fitAll').addEventListener('click', showAll);
$('locateAll').addEventListener('click', showAll);
$('zoomIn').addEventListener('click', () => map.zoomIn());
$('zoomOut').addEventListener('click', () => map.zoomOut());
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    $('searchInput').focus();
  }
});

renderList();
updateStats();
