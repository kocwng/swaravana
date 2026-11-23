// Pembuat sampel suara (modul murni: hanya Float32Array, tanpa Web Audio), supaya bisa dites di Node.
// - gitar: Karplus-Strong (senar petik) dengan delay fraksional → nada tetap tepat di nada tinggi
// - piano: sintesis aditif dengan inharmonisitas senar + peluruhan dua tahap + bunyi palu

const DUA_PI = Math.PI * 2;

/** PRNG kecil deterministik (biar suara sama tiap kali & bisa dites). */
function acak(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1; };
}

/** Filter biquad RBJ (peaking / lowpass / highpass), diterapkan langsung ke array. */
export function biquad(y, sr, jenis, f0, q, gainDb = 0) {
  const A = 10 ** (gainDb / 40), w = (2 * Math.PI * f0) / sr, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (jenis === 'peaking') { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
  else if (jenis === 'lowpass') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < y.length; i++) {
    const x = y[i];
    const o = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = o; y[i] = o;
  }
  return y;
}

/**
 * Karakter jenis gitar.
 *  kecerahan : seberapa tajam eksitasi (ujung jari lembut = kecil)
 *  posisi    : posisi petik relatif panjang senar (dekat bridge = kecil = lebih cerah)
 *  redamLoop : koef. lowpass di dalam senar (kecil = nada tinggi cepat meredup, hangat)
 *  badan     : resonansi badan kayu [frekuensi, Q, gain dB]
 */
export const JENIS_GITAR = {
  nilon: { durasi: 3.8, kecerahan: 0.34, posisi: 0.2, redamLoop: 0.6, rho: 0.9985, lp: 3600, badan: [[98, 1.2, 6], [196, 1.5, 3.5], [430, 1.1, -2.5], [1800, 1, -1.5]] },
  baja: { durasi: 4.2, kecerahan: 0.6, posisi: 0.13, redamLoop: 0.82, rho: 0.999, lp: 7000, badan: [[105, 1.2, 5], [215, 1.5, 3], [520, 1.2, -1.5], [2800, 1.1, 2]] },
};

/** Satu getaran senar (Karplus-Strong + lowpass di dalam loop, delay fraksional terkoreksi). */
function getaran(f, sr, n, k, acakFn, detune, rho) {
  const y = new Float32Array(n);
  const c = k.redamLoop;
  // lowpass satu-kutub di loop menambah delay ±(1-c)/c sampel → kurangi agar nada tetap tepat
  const L = sr / (f * (1 + detune)) - 0.5 - (1 - c) / c;
  const awal = Math.ceil(L) + 2;
  // eksitasi: noise yang dihaluskan dua kali (ujung jari, bukan pick) ...
  let lp1 = 0, lp2 = 0;
  const e = new Float32Array(awal);
  for (let i = 0; i < awal; i++) { lp1 += k.kecerahan * (acakFn() - lp1); lp2 += k.kecerahan * (lp1 - lp2); e[i] = lp2; }
  // ... dengan efek posisi petik (filter sisir): harmonik pada titik simpul ikut hilang
  const geser = Math.max(1, Math.round(k.posisi * L));
  let rata = 0;
  for (let i = 0; i < awal && i < n; i++) { y[i] = e[i] - (i >= geser ? e[i - geser] : 0); rata += y[i]; }
  rata /= awal;
  for (let i = 0; i < awal && i < n; i++) y[i] -= rata;
  let s = 0;
  for (let i = awal; i < n; i++) {
    const d = i - L;
    const i0 = Math.floor(d);
    const fr = d - i0;
    const a = y[i0] * (1 - fr) + y[i0 + 1] * fr;
    const b = y[i0 - 1] * (1 - fr) + y[i0] * fr;
    s += c * (0.5 * (a + b) - s);
    y[i] = rho * s;
  }
  return y;
}

/**
 * Senar gitar yang dipetik. Mengembalikan Float32Array mono.
 * @param {number} f   frekuensi (Hz)
 * @param {number} sr  sample rate
 * @param {{jenis?:'nilon'|'baja', lembut?:boolean, durasi?:number}} [o]
 *   lembut = petikan pelan: eksitasi lebih gelap & serangan lebih halus
 */
export function sampelGitar(f, sr, { jenis = 'nilon', lembut = false, durasi } = {}) {
  const dasar = JENIS_GITAR[jenis] || JENIS_GITAR.nilon;
  // petikan lembut: eksitasi lebih gelap, dipetik lebih ke tengah senar, dan nada tinggi
  // lebih cepat meredup di dalam senar → warna jelas lebih hangat, bukan sekadar lebih pelan
  const k = lembut
    ? { ...dasar, kecerahan: dasar.kecerahan * 0.5, posisi: Math.min(0.3, dasar.posisi * 1.4), redamLoop: dasar.redamLoop * 0.8 }
    : dasar;
  const n = Math.floor(sr * (durasi ?? dasar.durasi));
  const r = acak(Math.round(f * 100) + (lembut ? 7 : 0));
  // nada rendah bergaung lebih lama
  const rho = Math.min(0.9996, k.rho + 0.0008 * Math.min(1, 110 / f));
  // dua bidang getar senar dengan selisih ±1,5 sen → getar halus alami
  const g1 = getaran(f, sr, n, k, r, 0, rho);
  const g2 = getaran(f, sr, n, k, r, 0.0009, rho - 0.0006);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = 0.68 * g1[i] + 0.32 * g2[i];
  // badan gitar (kayu) + atap kecerahan
  biquad(y, sr, 'highpass', 70, 0.7);
  for (const [fb, q, db] of k.badan) biquad(y, sr, 'peaking', fb, q, db);
  biquad(y, sr, 'lowpass', lembut ? k.lp * 0.6 : k.lp, 0.7);
  // serangan: ujung jari lebih halus daripada pick
  const nSerang = Math.floor(sr * (lembut ? 0.006 : 0.0025));
  for (let i = 0; i < nSerang; i++) y[i] *= Math.sin((i / nSerang) * Math.PI / 2);
  akhiriLembut(y, sr, 0.35);
  return normalisasi(y, 0.9);
}

/**
 * Nada piano aditif.
 * @param {number} f
 * @param {number} sr
 */
export function sampelPiano(f, sr, durasi = 3.2) {
  const n = Math.floor(sr * durasi);
  const y = new Float32Array(n);
  const B = 0.00035; // inharmonisitas senar
  const tau0 = Math.max(0.6, Math.min(3.5, 2.4 * (261.6 / f) ** 0.5));
  const r = acak(Math.round(f * 7));
  for (let k = 1; k <= 12; k++) {
    const fk = k * f * Math.sqrt(1 + B * k * k);
    if (fk > sr * 0.45) break;
    const amp = (k === 1 ? 1 : 0.9 / k ** 1.25) * (k === 2 ? 1.1 : 1);
    const tau = tau0 / (1 + 0.55 * (k - 1));
    // osilator rekursif (lebih cepat daripada Math.sin per sampel)
    const w = (DUA_PI * fk) / sr;
    const c2 = 2 * Math.cos(w);
    const fase = (r() + 1) * Math.PI;
    let s1 = Math.sin(fase - w), s2 = Math.sin(fase - 2 * w);
    const turunCepat = Math.exp(-1 / (sr * tau * 0.18));
    const turunLambat = Math.exp(-1 / (sr * tau));
    let eC = 0.55 * amp, eL = 0.45 * amp;
    for (let i = 0; i < n; i++) {
      const s = c2 * s1 - s2; s2 = s1; s1 = s;
      y[i] += s * (eC + eL);
      eC *= turunCepat; eL *= turunLambat;
    }
  }
  // bunyi palu: noise singkat
  const nPalu = Math.floor(sr * 0.012);
  let lp = 0;
  for (let i = 0; i < nPalu; i++) { lp += 0.3 * (r() - lp); y[i] += lp * 0.25 * (1 - i / nPalu); }
  // serangan 3 ms supaya tidak "klik"
  const nSerang = Math.floor(sr * 0.003);
  for (let i = 0; i < nSerang; i++) y[i] *= i / nSerang;
  akhiriLembut(y, sr, 0.3);
  return normalisasi(y, 0.85);
}

function akhiriLembut(y, sr, detik) {
  const m = Math.min(y.length, Math.floor(sr * detik));
  for (let i = 0; i < m; i++) y[y.length - 1 - i] *= i / m;
}

function normalisasi(y, puncak) {
  let maks = 0;
  for (let i = 0; i < y.length; i++) maks = Math.max(maks, Math.abs(y[i]));
  if (maks > 0) for (let i = 0; i < y.length; i++) y[i] *= puncak / maks;
  return y;
}

/** Impuls reverb ruangan kecil (stereo): noise yang meluruh eksponensial. */
export function impulsReverb(sr, detik = 1.6) {
  const n = Math.floor(sr * detik);
  const kanal = [new Float32Array(n), new Float32Array(n)];
  for (const [c, data] of kanal.entries()) {
    const r = acak(17 + c);
    for (let i = 0; i < n; i++) data[i] = r() * Math.exp((-4.5 * i) / n) * (1 - Math.exp(-i / (sr * 0.004)));
  }
  return kanal;
}

/** Perkiraan frekuensi dasar sinyal lewat autokorelasi (untuk tes ketepatan nada). */
export function perkiraanFrekuensi(y, sr, fMin = 60, fMax = 1200, dari = 0.2) {
  const mulai = Math.floor(sr * dari);
  const panjang = Math.min(4096, y.length - mulai - Math.ceil(sr / fMin));
  let lagTerbaik = 0, nilaiTerbaik = -Infinity;
  for (let lag = Math.floor(sr / fMax); lag <= Math.ceil(sr / fMin); lag++) {
    let s = 0;
    for (let i = 0; i < panjang; i++) s += y[mulai + i] * y[mulai + i + lag];
    if (s > nilaiTerbaik) { nilaiTerbaik = s; lagTerbaik = lag; }
  }
  // interpolasi parabola di sekitar puncak
  const k = (lag) => { let s = 0; for (let i = 0; i < panjang; i++) s += y[mulai + i] * y[mulai + i + lag]; return s; };
  const a = k(lagTerbaik - 1), b = nilaiTerbaik, c = k(lagTerbaik + 1);
  const geser = (a - c) / (2 * (a - 2 * b + c) || 1);
  return sr / (lagTerbaik + geser);
}
