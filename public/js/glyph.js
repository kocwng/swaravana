// Glyph jari & ikon garis (modul murni, hanya menghasilkan string SVG).
// Glyph jari: lima batang kecil dari jempol sampai kelingking; jari yang keluar menyala.
// Dipakai di pad, peta gerakan, dan layar sambutan menggantikan emoji tangan.

// tinggi tiap batang: jempol pendek, jari tengah paling tinggi (seperti siluet tangan)
const TINGGI = [7, 11, 12, 11, 9];

/**
 * @param {number[]} keluar  indeks jari yang keluar (0 = jempol … 4 = kelingking); [] = kepalan
 * @returns {string} <svg class="glyph-jari">
 */
export function glyphJari(keluar = []) {
  const nyala = new Set(keluar);
  const batang = TINGGI.map((h, j) =>
    `<rect x="${(0.4 + j * 3.6).toFixed(1)}" y="${14 - h}" width="2.4" height="${h}" rx="1.2"${nyala.has(j) ? ' class="on"' : ''}/>`).join('');
  return `<svg class="glyph-jari" viewBox="0 0 18 14" aria-hidden="true">${batang}</svg>`;
}

// Ikon garis gaya lucide (ISC), 24×24, stroke mengikuti warna teks lewat CSS .ikon
const PATH = {
  putar: '<path d="M7 4.5v15a.5.5 0 0 0 .76.43l12.5-7.5a.5.5 0 0 0 0-.86L7.76 4.07A.5.5 0 0 0 7 4.5z"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  jeda: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  edit: '<path d="M21.17 6.81a2.82 2.82 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>',
  simpan: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
};

/** @param {keyof PATH} nama */
export function ikon(nama) {
  return `<svg class="ikon" viewBox="0 0 24 24" aria-hidden="true">${PATH[nama]}</svg>`;
}
