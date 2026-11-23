// Koleksi sheet yang ditempel pengguna (modul murni; penyimpanan disuntikkan supaya bisa dites).
// Disimpan HANYA di browser ini (localStorage), tidak dikirim ke mana pun.
// Bentuk item: { id, judul, teks, dibuat, diubah, pengaturan|null }

export const KUNCI_SIMPAN = 'akor.koleksi';
const BATAS_TEKS = 60000; // satu sheet maksimal ±60 ribu karakter
const VERSI_EKSPOR = 1;

/** Penyimpanan default: localStorage (aman bila tidak tersedia, mis. mode privat). */
export const penyimpananLokal = {
  baca(k) { try { return localStorage.getItem(k); } catch { return null; } },
  tulis(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
};

function idBaru(ada) {
  let id;
  do id = `s${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`; while (ada.has(id));
  return id;
}

function bersihkanJudul(j) {
  return String(j ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

/** Validasi & normalisasi satu item (dari penyimpanan atau impor). */
function itemValid(x) {
  if (!x || typeof x !== 'object' || typeof x.teks !== 'string' || !x.teks.trim()) return null;
  return {
    id: typeof x.id === 'string' && /^[\w-]{1,40}$/.test(x.id) ? x.id : null,
    judul: bersihkanJudul(x.judul) || 'Sheet tanpa judul',
    teks: x.teks.slice(0, BATAS_TEKS),
    dibuat: Number.isFinite(x.dibuat) ? x.dibuat : Date.now(),
    diubah: Number.isFinite(x.diubah) ? x.diubah : Date.now(),
    pengaturan: x.pengaturan && typeof x.pengaturan === 'object' ? x.pengaturan : null,
  };
}

export class Koleksi {
  /** @param {{baca:(k:string)=>string|null, tulis:(k:string,v:string)=>boolean}} [simpan] */
  constructor(simpan = penyimpananLokal) {
    this.simpan = simpan;
    this.item = [];
    this.muat();
  }

  muat() {
    let data = [];
    try { data = JSON.parse(this.simpan.baca(KUNCI_SIMPAN) || '[]'); } catch { data = []; }
    const ada = new Set();
    this.item = (Array.isArray(data) ? data : []).map(itemValid).filter(Boolean).map((x) => {
      if (!x.id || ada.has(x.id)) x.id = idBaru(ada);
      ada.add(x.id);
      return x;
    });
  }

  /** @returns {boolean} berhasil ditulis */
  tulis() {
    return this.simpan.tulis(KUNCI_SIMPAN, JSON.stringify(this.item));
  }

  /** Daftar urut terbaru diubah dulu. */
  daftar() {
    return [...this.item].sort((a, b) => b.diubah - a.diubah);
  }

  ambil(id) {
    return this.item.find((x) => x.id === id) ?? null;
  }

  /** Judul unik: "Judul", "Judul (2)", … (kecuali untuk item `kecualiId` sendiri). */
  judulUnik(judul, kecualiId = null) {
    const dasar = bersihkanJudul(judul) || `Sheet ${this.item.length + 1}`;
    const terpakai = new Set(this.item.filter((x) => x.id !== kecualiId).map((x) => x.judul.toLowerCase()));
    if (!terpakai.has(dasar.toLowerCase())) return dasar;
    for (let i = 2; ; i++) if (!terpakai.has(`${dasar} (${i})`.toLowerCase())) return `${dasar} (${i})`;
  }

  /**
   * Tambah sheet baru, atau perbarui bila `id` diberikan.
   * @returns {object} item tersimpan
   */
  simpanSheet({ id = null, judul, teks }) {
    const sekarang = Date.now();
    const lama = id ? this.ambil(id) : null;
    if (lama) {
      lama.teks = String(teks).slice(0, BATAS_TEKS);
      lama.judul = this.judulUnik(judul ?? lama.judul, lama.id);
      lama.diubah = sekarang;
      this.tulis();
      return lama;
    }
    const baru = {
      id: idBaru(new Set(this.item.map((x) => x.id))),
      judul: this.judulUnik(judul),
      teks: String(teks).slice(0, BATAS_TEKS),
      dibuat: sekarang,
      diubah: sekarang,
      pengaturan: null,
    };
    this.item.push(baru);
    this.tulis();
    return baru;
  }

  ubahJudul(id, judul) {
    const x = this.ambil(id);
    if (!x) return null;
    x.judul = this.judulUnik(judul, id);
    x.diubah = Date.now();
    this.tulis();
    return x;
  }

  simpanPengaturan(id, pengaturan) {
    const x = this.ambil(id);
    if (!x) return null;
    x.pengaturan = { ...pengaturan };
    x.diubah = Date.now();
    this.tulis();
    return x;
  }

  hapus(id) {
    const n = this.item.length;
    this.item = this.item.filter((x) => x.id !== id);
    if (this.item.length !== n) this.tulis();
    return this.item.length !== n;
  }

  /** Teks JSON untuk diunduh sebagai cadangan. */
  ekspor() {
    return JSON.stringify({ aplikasi: 'swaravana', versi: VERSI_EKSPOR, diekspor: new Date().toISOString(), sheet: this.daftar() }, null, 2);
  }

  /**
   * Impor dari teks JSON hasil ekspor. Sheet dengan judul & isi sama dilewati.
   * @returns {{ditambah:number, dilewati:number}}
   */
  impor(teksJson) {
    let data;
    try { data = JSON.parse(teksJson); } catch { throw new Error('File bukan JSON yang valid.'); }
    const daftar = Array.isArray(data) ? data : data?.sheet;
    if (!Array.isArray(daftar)) throw new Error('File ini bukan koleksi sheet Swaravana.');
    let ditambah = 0, dilewati = 0;
    const ada = new Set(this.item.map((x) => `${x.judul}\u0000${x.teks}`));
    for (const mentah of daftar) {
      const x = itemValid(mentah);
      if (!x || ada.has(`${x.judul}\u0000${x.teks}`)) { dilewati++; continue; }
      const baru = this.simpanSheet({ judul: x.judul, teks: x.teks });
      if (x.pengaturan) baru.pengaturan = x.pengaturan;
      ada.add(`${baru.judul}\u0000${baru.teks}`);
      ditambah++;
    }
    this.tulis();
    return { ditambah, dilewati };
  }

  /** Pindahkan sheet lama (satu sheet terakhir yang ditempel) ke koleksi, sekali saja. */
  migrasiSheetLama(teksLama) {
    if (!teksLama || !teksLama.trim()) return null;
    if (this.item.some((x) => x.teks === teksLama)) return null;
    return this.simpanSheet({ judul: 'Sheet yang ditempel sebelumnya', teks: teksLama });
  }
}
