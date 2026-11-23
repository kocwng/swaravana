// Penggambar SVG untuk kartu "Cara main": diagram akor gitar dan tuts piano.
// Warna diatur lewat kelas CSS (.cara-diagram …) supaya terbaca di tema gelap maupun terang.
import { bentukGitar } from './diagram.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (nama, atribut = {}, teks) => {
  const e = document.createElementNS(NS, nama);
  for (const [k, v] of Object.entries(atribut)) e.setAttribute(k, v);
  if (teks !== undefined) e.textContent = teks;
  return e;
};

const NAMA_SENAR = ['E', 'A', 'D', 'G', 'B', 'E'];
const TEBAL_SENAR = [1.9, 1.65, 1.4, 1.2, 1, 0.85]; // senar bas lebih tebal

/**
 * Diagram akor gitar (tuning standar): 6 senar vertikal, 5 fret.
 * Akar (nada bas) diberi warna toska, jari lain tembaga, angka di titik = nomor jari.
 * @param {{akar:number, kualitas:string}} akor
 * @param {{capo?:number, judul?:string}} [o]
 */
export function svgGitar(akor, { capo = 0, judul = '' } = {}) {
  const b = bentukGitar(akor);
  const kiri = 26, jarakSenar = 20, atas = 30, jarakFret = 24, nFret = 5;
  const L = kiri * 2 + jarakSenar * 5;
  const x = (s) => kiri + s * jarakSenar; // s: 0 = senar 6 (E rendah) … 5 = senar 1
  const y = (baris) => atas + baris * jarakFret;
  const bawah = y(nFret);
  const T = bawah + (capo ? 34 : 22);
  const senarTeks = b.fret.map((f) => (f < 0 ? 'x' : f)).join(' ');
  const svg = el('svg', {
    viewBox: `0 0 ${L} ${T}`, width: L, height: T, class: 'gitar', role: 'img',
    'aria-label': `Diagram akor ${judul} di gitar. Fret dari senar 6 ke senar 1: ${senarTeks}${b.barre ? `, barre di fret ${b.barre.fret}` : ''}`,
  });

  // papan fret, fret, senar
  svg.append(el('rect', { x: x(0), y: atas, width: x(5) - x(0), height: bawah - atas, class: 'papan' }));
  for (let f = 1; f <= nFret; f++) svg.append(el('line', { x1: x(0), x2: x(5), y1: y(f), y2: y(f), class: 'fret' }));
  if (b.mulai === 1) {
    svg.append(el('rect', { x: x(0) - 1.5, y: atas - 4.5, width: x(5) - x(0) + 3, height: 5.5, rx: 1.5, class: 'nut' }));
  } else {
    svg.append(el('line', { x1: x(0), x2: x(5), y1: atas, y2: atas, class: 'fret' }));
    svg.append(el('text', { x: x(0) - 7, y: atas + jarakFret / 2, class: 'label posisi' }, `${b.mulai}fr`));
  }
  for (let s = 0; s < 6; s++) svg.append(el('line', { x1: x(s), x2: x(s), y1: atas, y2: bawah, class: 'senar', 'stroke-width': TEBAL_SENAR[s] }));

  // tanda di atas nut: × tidak dibunyikan, o senar terbuka (akar terbuka ikut toska)
  const senarBas = b.fret.findIndex((f) => f >= 0);
  const yTanda = atas - 15;
  b.fret.forEach((f, s) => {
    const cx = x(s);
    if (f < 0) {
      svg.append(el('path', { d: `M${cx - 4} ${yTanda - 4}L${cx + 4} ${yTanda + 4}M${cx + 4} ${yTanda - 4}L${cx - 4} ${yTanda + 4}`, class: 'tanda mati' }));
    } else if (f === 0) {
      svg.append(el('circle', { cx, cy: yTanda, r: 4.5, class: `tanda${s === senarBas ? ' akar' : ''}` }));
    }
  });

  // barre: satu bilah membulat yang ditekan telunjuk (angka 1 ada di titik akar, ujung bilah)
  if (b.barre) {
    const tengah = y(b.barre.fret - b.mulai) + jarakFret / 2;
    svg.append(el('rect', { x: x(b.barre.dari) - 8, y: tengah - 8, width: x(b.barre.ke) - x(b.barre.dari) + 16, height: 16, rx: 8, class: 'titik barre' }));
  }
  // titik jari
  b.fret.forEach((f, s) => {
    if (f <= 0 || (b.barre && f === b.barre.fret && b.jari[s] === 1 && s !== senarBas)) return;
    const cx = x(s), cy = y(f - b.mulai) + jarakFret / 2;
    const akar = s === senarBas ? ' akar' : '';
    svg.append(el('circle', { cx, cy, r: 8, class: `titik${akar}` }));
    if (b.jari[s]) svg.append(el('text', { x: cx, y: cy, class: `angka${akar}` }, String(b.jari[s])));
  });

  // nama senar di bawah tiap senar, lalu capo bila ada
  NAMA_SENAR.forEach((n, s) => svg.append(el('text', { x: x(s), y: bawah + 14, class: 'label senar-nama' }, n)));
  if (capo) svg.append(el('text', { x: L / 2, y: bawah + 29, class: 'label capo' }, `capo di fret ${capo}`));
  return { svg, bentuk: b };
}

const HITAM = new Set([1, 3, 6, 8, 10]);

/**
 * Tuts piano dengan nada yang ditekan. Nada bas toska, nada akor lain tembaga; tiap tuts yang
 * ditekan juga diberi titik supaya tidak bergantung pada warna saja.
 * @param {number[]} nada  MIDI yang dibunyikan (nada[0] = bas)
 */
export function svgPiano(nada) {
  const min = Math.min(...nada), maks = Math.max(...nada);
  const awal = Math.floor(min / 12) * 12, akhir = Math.ceil((maks + 1) / 12) * 12 - 1;
  const putih = [];
  for (let m = awal; m <= akhir; m++) if (!HITAM.has(m % 12)) putih.push(m);
  const lp = 16, tp = 76, lh = 10, th = 46;
  const L = putih.length * lp + 1;
  const svg = el('svg', {
    viewBox: `0 0 ${L} ${tp + 17}`, width: L, height: tp + 17, class: 'piano', role: 'img',
    'aria-label': 'Tuts piano yang ditekan. Toska untuk bas, tembaga untuk nada akor lainnya.',
  });
  const tekan = new Set(nada);
  const kelas = (m, dasar) => (tekan.has(m) ? `tuts-tekan${m === nada[0] ? ' bas' : ''}` : dasar);
  const titik = (cx, cy, m) => svg.append(el('circle', { cx, cy, r: 2.6, class: `tuts-titik${m === nada[0] ? ' bas' : ''}` }));
  putih.forEach((m, i) => {
    svg.append(el('rect', { x: i * lp + 0.5, y: 0.5, width: lp, height: tp, rx: 2.5, class: kelas(m, 'tuts-putih') }));
    if (tekan.has(m)) titik(i * lp + 0.5 + lp / 2, tp - 9, m);
    if (m % 12 === 0) svg.append(el('text', { x: i * lp + 0.5 + lp / 2, y: tp + 13, class: 'label oktaf' }, `C${m / 12 - 1}`));
  });
  for (let m = awal; m <= akhir; m++) {
    if (!HITAM.has(m % 12)) continue;
    const kiriPutih = putih.indexOf(m - 1);
    const xh = (kiriPutih + 1) * lp - lh / 2 + 0.5;
    svg.append(el('rect', { x: xh, y: 0.5, width: lh, height: th, rx: 1.8, class: kelas(m, 'tuts-hitam') }));
    if (tekan.has(m)) titik(xh + lh / 2, th - 8, m);
  }
  // garis "kain" di atas tuts
  svg.append(el('rect', { x: 0.5, y: 0.5, width: L - 1, height: 2.5, class: 'tuts-atas' }));
  return svg;
}
