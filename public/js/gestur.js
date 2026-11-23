// Deteksi gestur dari 21 titik tangan MediaPipe (modul murni, tanpa DOM).
// Indeks titik: 0 pergelangan; jempol 1-4; telunjuk 5-8; tengah 9-12; manis 13-16; kelingking 17-20.

const RUAS = [
  null, // jempol: diukur terpisah
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
];

const klem01 = (v) => Math.max(0, Math.min(1, v));

/** Jarak 3D; x dikali rasio aspek supaya satuan x dan y setara. */
function jarak(a, b, aspek) {
  return Math.hypot((a.x - b.x) * aspek, a.y - b.y, ((a.z ?? 0) - (b.z ?? 0)) * aspek);
}

function vektor(a, b, aspek) {
  return [(b.x - a.x) * aspek, b.y - a.y, ((b.z ?? 0) - (a.z ?? 0)) * aspek];
}

/** Sudut antara dua vektor (radian). */
function sudut(u, v) {
  const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const n = Math.hypot(...u) * Math.hypot(...v) || 1e-9;
  return Math.acos(Math.max(-1, Math.min(1, d / n)));
}

/**
 * Total tekukan jari (radian) = sudut di buku jari (MCP) + sendi tengah (PIP) + sendi ujung (DIP).
 * Sudut MCP diukur terhadap arah telapak (pergelangan → buku jari), jadi gerakan
 * "mengetuk meja" yang kebanyakan menekuk di buku jari ikut terukur.
 */
export function tekukanJari(lm, f, aspek = 4 / 3) {
  const [a, b, c, d] = RUAS[f];
  const r1 = vektor(lm[a], lm[b], aspek), r2 = vektor(lm[b], lm[c], aspek), r3 = vektor(lm[c], lm[d], aspek);
  // Sudut buku jari: sumbu telapak (pergelangan → pangkal jari tengah) vs ruas pertama, setelah
  // komponen ke samping (arah telunjuk → kelingking) dibuang, supaya jari yang merenggang
  // tidak terbaca sebagai tertekuk.
  const samping = vektor(lm[5], lm[17], aspek);
  const ns = Math.hypot(...samping) || 1e-9;
  const s = samping.map((x) => x / ns);
  const buang = (u) => { const k = u[0] * s[0] + u[1] * s[1] + u[2] * s[2]; return u.map((x, i) => x - k * s[i]); };
  return sudut(buang(vektor(lm[0], lm[9], aspek)), buang(r1)) + sudut(r1, r2) + sudut(r2, r3);
}

/**
 * Seberapa lurus tiap jari, 0 (tertekuk) .. 1 (lurus).
 * Jari biasa: dari total tekukan tiga sendi; ±100° total (ketukan biasa) sudah ≈ 0.2.
 * Jempol: jarak ujung jempol ke pangkal jari manis relatif ukuran telapak.
 * @param {{x:number,y:number,z?:number}[]} lm
 * @param {number} [aspek] lebar/tinggi video
 * @returns {number[]} 5 nilai: jempol, telunjuk, tengah, manis, kelingking
 */
export function ekstensiJari(lm, aspek = 4 / 3) {
  const telapak = jarak(lm[0], lm[9], aspek) || 1e-6;
  const hasil = [klem01((jarak(lm[4], lm[13], aspek) / telapak - 0.55) / 0.55)];
  for (let f = 1; f < 5; f++) hasil.push(klem01(1 - (tekukanJari(lm, f, aspek) - 0.2) / 2.0));
  return hasil;
}

/**
 * Pemicu petikan per jari, dengan histeresis dan kecepatan:
 * - jari harus pernah lurus (> naik) dulu sebelum bisa memicu (armed)
 * - memicu saat turun di bawah `turun` dengan kecepatan tekuk ≥ `minKecepatan`
 * - DOMINASI: kecepatan puncak jari itu harus ≥ `dominasi` × kecepatan jari lain mana pun
 *   dalam `jendela` ms terakhir. Jari tetangga ikut tertekuk secara anatomis (tendon
 *   bersama) tapi lebih pelan, jadi ia kalah dan tidak berbunyi.
 * - JENDELA KUNCI: `jeda` ms setelah petikan, jari lain yang melewati batas dianggap
 *   ikut-ikutan (dibuang), bukan petikan baru.
 * - Jari yang melewati batas tapi tidak memicu dianggap terpakai: harus lurus lagi dulu.
 */
export class PemicuJari {
  constructor({ turun = 0.42, naik = 0.62, minKecepatan = 1.2, jeda = 180, dominasi = 1.3, jendela = 150 } = {}) {
    Object.assign(this, { turun, naik, minKecepatan, jeda, dominasi, jendela });
    this.reset();
  }

  reset() {
    this.siap = [false, false, false, false, false];
    this.sebelum = null;
    this.tSebelum = null;
    this.tPicu = -Infinity;
    this.puncak = [0, 0, 0, 0, 0]; // kecepatan tekuk terbesar sejak jari armed
    this.riwayat = []; // {t, v[5]} kecepatan tekuk terbaru, untuk aturan dominasi
  }

  /** Kecepatan tekuk tertinggi jari selain `i` dalam jendela waktu terakhir. */
  maksLain(i, t) {
    let m = 0;
    for (const r of this.riwayat) if (t - r.t <= this.jendela) for (let j = 0; j < 5; j++) if (j !== i) m = Math.max(m, r.v[j]);
    return m;
  }

  kekuatan(p) {
    return Math.max(0.3, Math.min(1, p / 7));
  }

  /** Hanya satu jari: yang paling dominan. */
  putuskanTunggal(lewat, t) {
    let picu = null, terbaik = -1;
    for (const i of lewat) {
      const dominan = this.puncak[i] >= this.dominasi * this.maksLain(i, t);
      if (t - this.tPicu >= this.jeda && dominan && this.puncak[i] > terbaik) { terbaik = this.puncak[i]; picu = i; }
    }
    return picu === null ? null : { jari: picu, kekuatan: this.kekuatan(terbaik) };
  }

  /**
   * @param {number[]} eks  hasil ekstensiJari
   * @param {number} t      waktu (ms)
   * @returns {{jari:number, kekuatan:number}|null}
   */
  perbarui(eks, t) {
    let picu = null;
    if (this.sebelum) {
      const dt = Math.max(1, t - this.tSebelum) / 1000;
      const lewat = []; // jari yang melewati batas tekuk di frame ini
      const v = eks.map((e, i) => (this.sebelum[i] - e) / dt); // + = sedang menekuk
      this.riwayat.push({ t, v });
      while (this.riwayat.length && t - this.riwayat[0].t > this.jendela) this.riwayat.shift();
      for (let i = 0; i < 5; i++) {
        if (this.siap[i]) this.puncak[i] = Math.max(this.puncak[i], v[i]);
        if (this.siap[i] && eks[i] < this.turun && this.puncak[i] >= this.minKecepatan) lewat.push(i);
      }
      // Semua jari yang lewat batas dianggap terpakai, termasuk yang kalah cepat atau jatuh
      // di masa jeda. Tanpa ini, jari tetangga bisa berbunyi terlambat beberapa frame kemudian.
      for (const i of lewat) this.siap[i] = false;
      // ≥3 jari (selain jempol) tertekuk sekaligus = tangan mengepal (gestur jeda), bukan petikan
      if (eks.slice(1).filter((e) => e < this.turun).length < 3) picu = this.putuskanTunggal(lewat, t);
      if (picu) this.tPicu = t;
    }
    for (let i = 0; i < 5; i++) {
      if (eks[i] > this.naik && !this.siap[i]) { this.siap[i] = true; this.puncak[i] = 0; }
      if (eks[i] < this.turun && this.siap[i] && this.puncak[i] < this.minKecepatan) {
        this.siap[i] = false; // menekuk pelan: bukan petikan, tunggu lurus lagi
      }
    }
    this.sebelum = eks.slice();
    this.tSebelum = t;
    return picu;
  }
}

/**
 * Pemicu untuk mode "kombinasi jari" (1 atau 2 jari). Berbeda dengan PemicuJari, ukurannya
 * RELATIF: seberapa jauh jari turun dari posisi tertingginya barusan, bukan ambang lurus/tekuk
 * tetap. Ini penting karena tangan santai jarang lurus penuh (telunjuk/tengah sering di 30–60%),
 * dan jempol ikut terlipat saat jari lain ditekuk sehingga perlu syarat lebih ketat.
 * Dipetik dari rekaman tangan sungguhan (±15 fps).
 */
export class PemicuKombinasi {
  constructor({
    jendela = 400, // ms: posisi tertinggi diambil dari jendela ini
    turun = 0.3, // jari (selain jempol) harus turun minimal sebanyak ini
    turunJempol = 0.5, // jempol: lebih ketat (sering ikut terlipat)
    minKecepatan = 1.2, // satuan ekstensi per detik
    naikLagi = 0.18, // jari siap lagi setelah naik sebanyak ini dari titik terendahnya
    jeda = 180, // ms antar-petikan
    tunggu = 110, // ms maksimal menunggu jari kedua yang sedang ikut turun
    rasio = 0.45, // jari kedua minimal turun rasio × jari pertama
    kawanMin = 0.22, // ...dan minimal sebanyak ini
    jempolKawan = Infinity, // pasangan dengan jempol memakai SENTUHAN (PemicuSentuh), bukan tekuk bersamaan
  } = {}) {
    Object.assign(this, { jendela, turun, turunJempol, minKecepatan, naikLagi, jeda, tunggu, rasio, kawanMin, jempolKawan });
    this.reset();
  }

  reset() {
    this.riwayat = []; // {t, e[5], v[5]}
    this.siap = [true, true, true, true, true];
    this.terendah = [1, 1, 1, 1, 1]; // titik terendah sejak dipetik (untuk siap lagi)
    this.tPicu = -Infinity;
    this.tertunda = null; // {jari, turun, t}
  }

  batas(i) { return i === 0 ? this.turunJempol : this.turun; }

  /** Seberapa jauh jari i turun dari posisi tertingginya di jendela; dan kecepatan turun maksimum. */
  ukur(i, e) {
    let atas = e, v = 0;
    for (const r of this.riwayat) { atas = Math.max(atas, r.e[i]); v = Math.max(v, r.v[i]); }
    return { turun: atas - e, v };
  }

  kekuatan(v) { return Math.max(0.3, Math.min(1, v / 7)); }

  pakai(i, e) { this.siap[i] = false; this.terendah[i] = e[i]; }

  /**
   * @param {number[]} eks
   * @param {number} t
   * @param {number[]} [blokir] jari yang sedang menyentuh/mendekati jempol: tidak boleh memicu tekuk
   */
  perbarui(eks, t, blokir = []) {
    const lalu = this.riwayat.at(-1);
    const dt = lalu ? Math.max(1, t - lalu.t) / 1000 : 1;
    const v = eks.map((e, i) => (lalu ? (lalu.e[i] - e) / dt : 0));
    this.riwayat.push({ t, e: eks.slice(), v });
    while (this.riwayat.length && t - this.riwayat[0].t > this.jendela) this.riwayat.shift();

    for (let i = 0; i < 5; i++) {
      if (this.siap[i]) continue;
      this.terendah[i] = Math.min(this.terendah[i], eks[i]);
      if (eks[i] >= this.terendah[i] + this.naikLagi) this.siap[i] = true;
    }
    const u = eks.map((e, i) => this.ukur(i, e));
    // ≥3 jari selain jempol turun bersamaan = mengepal (gestur jeda), bukan petikan
    // (jari manis sering ikut turun ±0,3 saat telunjuk + tengah ditekuk, jadi 3 jari harus turun jauh)
    const turunJauh = [1, 2, 3, 4].filter((i) => u[i].turun >= 0.45).length;
    const turunSemua = [1, 2, 3, 4].every((i) => u[i].turun >= 0.25);
    // ...dan selama tangan masih terkepal (≥3 jari tertekuk), kedipan satu jari bukan petikan
    const terkepal = [1, 2, 3, 4].filter((i) => eks[i] < 0.2).length >= 3;
    if (turunJauh >= 3 || turunSemua || terkepal) {
      this.tertunda = null;
      for (let i = 0; i < 5; i++) if (u[i].turun >= 0.25) this.pakai(i, eks);
      return null;
    }
    // jari yang sedang dipakai untuk menyentuh jempol: turunnya bukan petikan tekuk
    for (const i of blokir) if (this.siap[i] && u[i].turun >= this.batas(i)) this.pakai(i, eks);
    if (this.tertunda && blokir.includes(this.tertunda.jari)) this.tertunda = null;
    const lolos = (i) => this.siap[i] && u[i].turun >= this.batas(i) && u[i].v >= this.minKecepatan;
    const kawanDari = (pemimpin, turunP) => [0, 1, 2, 3, 4]
      .filter((i) => i !== pemimpin && this.siap[i] && u[i].v >= this.minKecepatan * 0.8
        && u[i].turun >= (i === 0 ? Math.max(this.jempolKawan, turunP) : Math.max(this.kawanMin, this.rasio * turunP)))
      .sort((a, b) => u[b].turun - u[a].turun)[0];
    const keluar = (jari, kawan) => {
      this.tertunda = null;
      this.tPicu = t;
      this.pakai(jari, eks);
      if (kawan === undefined) return { jari, kekuatan: this.kekuatan(u[jari].v) };
      this.pakai(kawan, eks);
      const [a, b] = [jari, kawan].sort((x, y) => x - y);
      return { jari: a, pasangan: [a, b], kekuatan: this.kekuatan(Math.max(u[a].v, u[b].v)) };
    };

    const td = this.tertunda;
    if (td) {
      const kawan = kawanDari(td.jari, td.turun);
      if (kawan !== undefined) return keluar(td.jari, kawan);
      if (t - td.t >= this.tunggu) return keluar(td.jari);
      return null;
    }
    const calon = [0, 1, 2, 3, 4].filter(lolos);
    if (!calon.length) return null;
    if (t - this.tPicu < this.jeda) { for (const i of calon) this.pakai(i, eks); return null; }
    // pemimpin: yang turun paling jauh relatif terhadap batasnya; jari biasa didahulukan dari jempol
    const pemimpin = calon.sort((a, b) => u[b].turun / this.batas(b) - u[a].turun / this.batas(a))[0];
    const kawan = kawanDari(pemimpin, u[pemimpin].turun);
    if (kawan !== undefined) return keluar(pemimpin, kawan);
    // jari lain (siap) sedang ikut turun cukup jauh → mungkin pasangan yang sedikit terlambat
    const menyusul = [0, 1, 2, 3, 4].some((i) => i !== pemimpin && i !== 0 && this.siap[i] && v[i] >= this.minKecepatan && u[i].turun >= 0.1);
    if (menyusul) { this.tertunda = { jari: pemimpin, turun: u[pemimpin].turun, t }; return null; }
    return keluar(pemimpin);
  }
}

/**
 * Jarak ujung jempol ke ujung telunjuk/tengah/manis/kelingking, relatif ukuran telapak
 * (pergelangan → pangkal jari tengah). Indeks 0..3 = jari 1..4.
 */
export function jarakSentuh(lm, aspek = 4 / 3) {
  const telapak = jarak(lm[0], lm[9], aspek) || 1e-6;
  return [8, 12, 16, 20].map((u) => jarak(lm[4], lm[u], aspek) / telapak);
}

/**
 * Pasangan dengan jempol dalam mode kombinasi: ujung jempol MENYENTUH ujung jari lain
 * (seperti mencubit). Jauh lebih mudah dibaca kamera daripada jempol + jari ditekuk
 * bersamaan, karena jempol sering ikut terlipat sendiri.
 * - berbunyi saat jarak turun di bawah `sentuh`, sekali; harus menjauh (> `lepas`) dulu
 * - jari yang disentuh harus jelas paling dekat (jari lain ≥ `beda` × lebih jauh)
 * - `dekat` = jari yang sedang didekati jempol (untuk menahan petikan tekuk jempol & jari itu)
 */
export class PemicuSentuh {
  constructor({ sentuh = 0.22, lepas = 0.35, mendekat = 0.6, beda = 1.25, jeda = 180 } = {}) {
    Object.assign(this, { sentuh, lepas, mendekat, beda, jeda });
    this.reset();
  }

  reset() {
    this.aktif = null; // jari yang sedang disentuh (1..4)
    this.dekat = null; // jari yang sedang didekati jempol (1..4) atau null
    this.tPicu = -Infinity;
    this.sebelum = null; // {t, d[4]}
  }

  /**
   * @param {{x:number,y:number,z?:number}[]} lm
   * @param {number} aspek
   * @param {number} t ms
   * @returns {{jari:0, pasangan:[0,number], kekuatan:number}|null}
   */
  perbarui(lm, aspek, t) {
    const d = jarakSentuh(lm, aspek);
    const urut = d.map((x, i) => ({ x, jari: i + 1 })).sort((a, b) => a.x - b.x);
    const [p1, p2] = urut;
    this.dekat = p1.x < this.mendekat ? p1.jari : null;
    const lalu = this.sebelum;
    this.sebelum = { t, d };
    if (this.aktif !== null) {
      if (d[this.aktif - 1] > this.lepas) this.aktif = null;
      else return null;
    }
    if (p1.x >= this.sentuh || p2.x < p1.x * this.beda) return null;
    this.aktif = p1.jari;
    if (t - this.tPicu < this.jeda) return null;
    this.tPicu = t;
    // kekuatan dari kecepatan mendekat (satuan telapak per detik)
    const v = lalu ? (lalu.d[p1.jari - 1] - p1.x) / (Math.max(1, t - lalu.t) / 1000) : 3;
    return { jari: 0, pasangan: [0, p1.jari], kekuatan: Math.max(0.35, Math.min(1, v / 5)) };
  }
}

/**
 * Mode "bentuk jari": tangan kanan diam MENGEPAL; jari yang DIKELUARKAN membentuk akor.
 * Kamera lebih andal membaca bentuk tangan yang diam daripada gerakan menekuk yang cepat.
 * - bentuk dibaca bila setiap jari jelas keluar (> `lurus`) atau jelas terlipat (< `tekuk`)
 * - berbunyi setelah bentuk yang sama terbaca `stabil` frame berturut-turut DAN jari sudah
 *   berhenti bergerak (supaya saat membuka ✌️ tidak sempat terbaca ☝️ dulu)
 * - menahan bentuk tidak berbunyi ulang; ganti bentuk = ganti akor; kepal lalu bentuk sama = ulang
 */
export class PemicuBentuk {
  constructor({ lurus = 0.6, tekuk = 0.38, stabil = 2, diam = 0.14 } = {}) {
    Object.assign(this, { lurus, tekuk, stabil, diam });
    this.reset();
  }

  reset() {
    this.sebelum = null;
    this.calon = null; // kunci bentuk yang sedang dikumpulkan
    this.hitung = 0;
    this.terakhir = null; // kunci bentuk terakhir yang berbunyi (null = sudah mengepal lagi)
    this.kini = null; // bentuk jelas saat ini (array jari) atau [] = kepal, null = belum jelas
    this.riwayatBuka = []; // {t, v} kecepatan membuka terbesar, untuk kekuatan
  }

  /**
   * @param {number[]} eks
   * @param {number} t
   * @returns {{bentuk:number[], kekuatan:number}|null}
   */
  perbarui(eks, t) {
    const lalu = this.sebelum;
    this.sebelum = { t, eks: eks.slice() };
    const dt = lalu ? Math.max(1, t - lalu.t) / 1000 : 1;
    const gerak = lalu ? Math.max(...eks.map((e, i) => Math.abs(e - lalu.eks[i]))) : 1;
    if (lalu) this.riwayatBuka.push({ t, v: Math.max(...eks.map((e, i) => (e - lalu.eks[i]) / dt)) });
    while (this.riwayatBuka.length && t - this.riwayatBuka[0].t > 250) this.riwayatBuka.shift();

    const jelas = eks.every((e) => e > this.lurus || e < this.tekuk);
    if (!jelas) { this.kini = null; this.hitung = 0; return null; }
    const bentuk = [0, 1, 2, 3, 4].filter((i) => eks[i] > this.lurus);
    this.kini = bentuk;
    const kunci = bentuk.join('-');
    if (!bentuk.length) { this.terakhir = null; this.calon = null; this.hitung = 0; return null; } // kepal
    if (kunci === this.calon) this.hitung++;
    else { this.calon = kunci; this.hitung = 1; }
    if (this.hitung < this.stabil || gerak > this.diam || kunci === this.terakhir) return null;
    this.terakhir = kunci;
    const v = Math.max(0, ...this.riwayatBuka.map((r) => r.v));
    return { bentuk, kekuatan: Math.max(0.4, Math.min(1, 0.35 + v / 10)) };
  }
}

/** Jumlah jari terangkat (0..5) dari nilai ekstensi. */
export function jumlahTerangkat(eks, batas = 0.6) {
  return eks.reduce((n, e) => n + (e > batas ? 1 : 0), 0);
}

/**
 * Penstabil jumlah jari tangan kiri: nilai baru dipakai setelah muncul `minFrame` kali
 * berturut-turut, supaya tidak berkedip di antara dua angka.
 */
export class PenstabilJumlah {
  constructor(minFrame = 3) { this.minFrame = minFrame; this.nilai = null; this.calon = null; this.hitung = 0; }
  perbarui(n) {
    if (n === this.nilai) { this.calon = null; this.hitung = 0; return this.nilai; }
    if (n === this.calon) this.hitung++;
    else { this.calon = n; this.hitung = 1; }
    if (this.hitung >= this.minFrame || this.nilai === null && n === null) { this.nilai = n; this.calon = null; this.hitung = 0; }
    return this.nilai;
  }
}

/**
 * Tentukan tangan akor (kanan layar) dan tangan pengubah (kiri layar) dari posisi,
 * bukan label kiri/kanan model (label itu kadang tertukar).
 * Tampilan dicerminkan, jadi posisi di layar = 1 - x kamera.
 * @param {{x:number,y:number}[][]} daftar  landmark tiap tangan yang terdeteksi
 * @returns {{akor: any[]|null, pengubah: any[]|null}}
 */
export function bagiTangan(daftar) {
  if (!daftar?.length) return { akor: null, pengubah: null };
  if (daftar.length === 1) return { akor: daftar[0], pengubah: null };
  const [a, b] = [...daftar].sort((p, q) => (1 - q[0].x) - (1 - p[0].x)); // paling kanan di layar dulu
  return { akor: a, pengubah: b };
}

/**
 * Baris akor dari tinggi tangan kanan di layar: atas / tengah / bawah.
 * Memakai titik tengah telapak (pergelangan + 4 pangkal jari) dan histeresis supaya tidak
 * berkedip saat tangan berada tepat di garis batas.
 */
export class PemilihBaris {
  constructor({ batasAtas = 0.4, batasBawah = 0.64, histeresis = 0.035 } = {}) {
    Object.assign(this, { batasAtas, batasBawah, histeresis });
    this.baris = 'tengah';
  }

  static tinggiTelapak(lm) {
    return [0, 5, 9, 13, 17].reduce((s, i) => s + lm[i].y, 0) / 5;
  }

  perbarui(lm) {
    const y = PemilihBaris.tinggiTelapak(lm);
    const h = this.histeresis;
    // batas digeser menjauhi baris sekarang → harus melewati batas cukup jauh untuk pindah
    const atas = this.batasAtas + (this.baris === 'atas' ? h : -h);
    const bawah = this.batasBawah + (this.baris === 'bawah' ? -h : h);
    this.baris = y < atas ? 'atas' : y > bawah ? 'bawah' : 'tengah';
    return this.baris;
  }

  reset() { this.baris = 'tengah'; }
}

/**
 * Kepalan tangan kanan (keempat jari selain jempol tertekuk) = jeda genjreng.
 * Dengan histeresis frame: kepal setelah `minFrame` frame berturut-turut, buka setelah ≥2 jari
 * lurus selama `minFrame` frame, supaya ketukan satu jari tidak dianggap kepalan.
 */
export class DeteksiKepalan {
  constructor({ minFrame = 3, batasKepal = 0.35, batasBuka = 0.6 } = {}) {
    Object.assign(this, { minFrame, batasKepal, batasBuka });
    this.reset();
  }
  reset() { this.kepal = false; this.hitung = 0; }
  /** @param {number[]} eks hasil ekstensiJari; @returns {boolean} sedang mengepal */
  perbarui(eks) {
    const jari = eks.slice(1);
    const calon = this.kepal ? !(jari.filter((e) => e > this.batasBuka).length >= 2) : jari.every((e) => e < this.batasKepal);
    if (calon !== this.kepal) {
      if (++this.hitung >= this.minFrame) { this.kepal = calon; this.hitung = 0; }
    } else this.hitung = 0;
    return this.kepal;
  }
}
