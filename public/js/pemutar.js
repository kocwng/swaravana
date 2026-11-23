// Pemutar pola genjreng: menjadwalkan goresan dengan JAM AUDIO (AudioContext.currentTime),
// bukan setTimeout, jadi ketukannya tetap rapat walau halaman sibuk mendeteksi tangan.
// Teknik "lookahead": tiap 25 ms, jadwalkan semua langkah yang jatuh dalam 120 ms ke depan.
import { polaDenganId, durasiLangkah, goresanUntuk, goresanPiano, isianPiano, isianGitar, nadaTab, senarDariVoicing } from './pola.js';

/** Pola internal untuk piano "Sekali" + isian: akor ditahan satu birama, lalu diulang. */
const POLA_TAHAN = { id: 'sekali', nama: 'Sekali · akor ditahan tiap birama', langkah: 'A.......', birama: 4 };
/** Gitar "Sekali genjreng" + isian: satu genjreng per birama, sisanya ruang untuk isian. */
const POLA_TAHAN_GITAR = { id: 'sekali', nama: 'Sekali · satu genjreng tiap birama', langkah: 'D.......', birama: 4 };

const LOOKAHEAD = 0.12;
const TIK = 25;

export class PemutarPola {
  /** @param {import('./suara.js').MesinSuara} suara */
  constructor(suara) {
    this.suara = suara;
    this.polaId = 'pop';
    this.bpm = 90;
    this.timer = null;
    this.voicing = null;
    this.kekuatan = 0.8;
    this.langkahBerikut = 0;
    this.waktuBerikut = 0;
    this.mulaiPada = 0; // waktu audio langkah 0 putaran ini (untuk indikator)
    this.terjadwal = []; // {t, i} untuk indikator ketukan
    // pola kustom buatan pengguna (editor grid / teks), mis. dari bagian strumming sebuah sheet
    this.polaKustom = { id: 'kustom', nama: 'Kustom', langkah: 'D.DU.UDU', birama: 4, resolusi: 2 };
    this.jeda = false; // "hop": senar diredam, tapi tempo tetap berjalan supaya masuk lagi tepat ketukan
    // pola petik tab kustom (editor 6 senar) & nada tiap senar dari bentuk akor gitar asli
    this.tabKustom = { id: 'tab-kustom', nama: 'Tab kustom', tab: [[6, 1], [3], [4], [2], [6], [3], [4], [2]], birama: 4, resolusi: 2, langkah: 'TTTTTTTT' };
    this.senar = null; // [senar6 … senar1] (null = tidak dibunyikan); diisi aplikasi dari bentuk akor
    // isian piano antar akor (lihat pola.isianPiano)
    this.isianJenis = 'mati'; // isian piano
    this.isianJenisGitar = 'mati'; // isian gitar (disimpan terpisah)
    this.isianTiap = 1; // 1 = tiap birama, 2 = tiap 2 birama, 'kalimat' = akhir kalimat saja
    // "kurang itu lebih": true/false = akor ini akor terakhir baris sheet atau bukan; null = tidak tahu
    this.akhirKalimat = null;
    this.voicingBerikut = null; // akor berikutnya (dari sheet/latihan) untuk "bas berjalan"
    this.barKe = 0;
    this.isianBar = null;
    this.onIsian = null; // (nama, nadaList, waktuAudio) => void, untuk menampilkan isian
  }

  /**
   * Jeda / lanjut. Saat jeda, penjadwal tetap menghitung ketukan tanpa membunyikan goresan,
   * jadi saat dilanjutkan genjreng masuk lagi tepat di ketukan pola (tidak mulai dari awal).
   */
  aturJeda(jeda) {
    if (jeda === this.jeda) return;
    this.jeda = jeda;
    if (jeda && this.suara.ctx) this.suara.diam(); // redam senar yang masih bergaung
  }

  get pola() {
    if (this.polaId === 'kustom') return this.polaKustom;
    if (this.polaId === 'tab-kustom') return this.tabKustom;
    // Piano "Sekali" + isian aktif: isian butuh ketukan, jadi akor ditahan & diulang tiap birama
    if (this.polaId === 'sekali' && this.isianAktif !== 'mati') return this.suara.instrumen === 'piano' ? POLA_TAHAN : POLA_TAHAN_GITAR;
    return polaDenganId(this.polaId);
  }

  /** Ganti isi pola kustom; bila sedang dipakai & berjalan, langsung terdengar. */
  /** Ganti isi tab kustom; bila sedang dipakai & berjalan, langsung terdengar. */
  aturTabKustom({ tab, birama, resolusi }) {
    this.tabKustom = { id: 'tab-kustom', nama: 'Tab kustom', tab, birama, resolusi, langkah: 'T'.repeat(tab.length) };
    if (this.polaId === 'tab-kustom' && this.berjalan && this.voicing) this.mainkan(this.voicing, this.kekuatan);
  }

  aturPolaKustom({ langkah, birama, resolusi }) {
    this.polaKustom = { ...this.polaKustom, langkah, birama, resolusi };
    if (this.polaId === 'kustom' && this.berjalan && this.voicing) this.mainkan(this.voicing, this.kekuatan);
  }
  get berjalan() { return this.timer !== null; }

  /** Isian yang berlaku untuk instrumen saat ini. */
  get isianAktif() { return this.suara.instrumen === 'piano' ? this.isianJenis : this.isianJenisGitar; }

  /**
   * Mainkan akor dengan pola aktif. Pola "sekali" = satu genjreng. Ganti akor saat pola
   * berjalan memulai ulang pola dari langkah 0 dengan akor baru, LANGSUNG (tanpa menunggu ketukan).
   */
  /**
   * @param {number|null} [mulai]  waktu audio untuk memulai (mis. tepat di awal birama saat
   *   Putar contoh); null = sekarang. Goresan lama yang terjadwal ≥ waktu ini dibatalkan,
   *   jadi pergantian akor tepat di ketukan tanpa "flam".
   */
  mainkan(voicing, kekuatan = 0.8, mulai = null) {
    const ctx = this.suara.ctx;
    if (!ctx) return;
    const t = Math.max(ctx.currentTime + 0.005, mulai ?? 0);
    if (!this.pola.langkah) {
      this.berhenti(false);
      this.suara.batalkanTerjadwal(t);
      this.suara.goresan(voicing, kekuatan, t);
      return;
    }
    this.suara.batalkanTerjadwal(t);
    this.jeda = false; // memetik akor baru = lanjut main
    this.voicing = voicing;
    this.kekuatan = kekuatan;
    this.langkahBerikut = 0;
    this.waktuBerikut = t;
    this.mulaiPada = t;
    // hitungan birama terus berjalan saat ganti akor (agar isian "otomatis" bergiliran);
    // hanya diulang dari 0 bila pola baru mulai dari keadaan berhenti
    if (!this.timer) this.barKe = 0;
    // awal birama yang sudah terjadwal tapi belum berbunyi ikut dibatalkan → jangan dihitung dua kali
    else if (this.tAwalBar !== undefined && this.tAwalBar >= t - 1e-6) this.barKe = Math.max(0, this.barKe - 1);
    this.isianBar = null;
    this.terjadwal = [];
    if (!this.timer) this.timer = setInterval(() => this.jadwalkan(), TIK);
    this.jadwalkan();
  }

  jadwalkan() {
    const ctx = this.suara.ctx;
    const langkah = this.pola.langkah;
    if (!ctx || !langkah || !this.voicing) return this.berhenti(false);
    const d = durasiLangkah(this.bpm, this.pola.resolusi ?? 2);
    // Timer bisa telat (tab sibuk/diperlambat). Jangan mainkan goresan yang sudah lewat
    // sekaligus; lompati ke langkah berikutnya yang masih di depan.
    while (this.waktuBerikut < ctx.currentTime - 0.03) {
      this.waktuBerikut += d;
      this.langkahBerikut = (this.langkahBerikut + 1) % langkah.length;
    }
    while (this.waktuBerikut < ctx.currentTime + LOOKAHEAD) {
      const i = this.langkahBerikut;
      const piano = this.suara.instrumen === 'piano';
      // awal birama: tentukan isian piano birama ini (ketukan terakhir), bila aktif
      if (i === 0) {
        this.tAwalBar = this.waktuBerikut;
        this.giliranIsian = this.isianAktif !== 'mati' && (this.isianTiap === 'kalimat'
          ? (this.akhirKalimat ?? this.barKe % 4 === 3) // tanpa info sheet: ujung frasa 4 birama
          : this.barKe % this.isianTiap === this.isianTiap - 1);
        this.giliranBar = this.barKe;
        this.isianBar = null;
        this.barKe++;
      }
      // isian dihitung di ketukan ke-3 (isian terpanjang, arpeggio lebar, mulai di sini);
      // saat itu akor berikutnya dari sheet/latihan sudah diketahui
      if (this.giliranIsian && i === Math.max(0, langkah.length - 4)) {
        this.isianBar = (piano ? isianPiano : isianGitar)(this.voicing, {
          jenis: this.isianAktif, bar: this.giliranBar, panjangBirama: langkah.length, voicingBerikut: this.voicingBerikut, kunci: this.kunci ?? null,
          ukuran: this.isianTiap === 'kalimat' ? 'besar' : undefined, // akhir kalimat = ruang untuk isian besar
        });
      }
      // gitar: genjreng/petik/tab; piano: blok akor, bas, arpeggio
      const diisi = this.isianBar && i >= this.isianBar.mulai; // beri ruang untuk isian
      if (this.pola.tab && !piano) {
        // pola petik (tab): petik senar-senar yang ditandai, memakai nada bentuk akor asli
        const nada = nadaTab(this.pola.tab[i] ?? [], this.senar ?? senarDariVoicing(this.voicing));
        if (nada.length && !this.jeda && !diisi) {
          const res = this.pola.resolusi ?? 2;
          const faktor = i === 0 ? 0.95 : i % res === 0 ? 0.82 : 0.68;
          this.suara.goresan(nada, this.kekuatan * faktor, this.waktuBerikut, { arah: nada.length >= 3 ? 'turun' : 'petik', redam: false });
        }
      }
      const g = this.pola.tab && !piano ? null : (piano ? goresanPiano : goresanUntuk)(langkah[i], this.voicing, i);
      if (g && !this.jeda && !diisi) {
        // isian aktif: bas piano berlapis oktaf supaya iringan lebih penuh
        let nada = g.nada;
        if (piano && this.isianJenis !== 'mati' && nada[0] === this.voicing[0] && nada[0] - 12 >= 28) nada = [nada[0] - 12, ...nada];
        this.suara.goresan(nada, this.kekuatan * g.faktor, this.waktuBerikut, g);
      }
      if (this.isianBar && !this.jeda) {
        const not = this.isianBar.not.filter((n) => Math.floor(n.langkah) === i);
        not.forEach((n, k) => {
          const t = this.waktuBerikut + (n.langkah - i) * d;
          // not tunggal (petik) atau beberapa senar sekaligus (strum naik/turun, bisa diredam)
          if (n.akor) this.suara.goresan(n.akor, this.kekuatan * n.faktor, t, { arah: n.arah ?? 'turun', redam: false, mati: Boolean(n.mati), pendek: Boolean(n.pendek) });
          else this.suara.goresan([n.nada], this.kekuatan * n.faktor, t, { arah: 'petik', redam: false });
          if (k === 0 && i === this.isianBar.mulai) this.onIsian?.(this.isianBar.nama, this.isianBar.not.flatMap((x) => x.akor ?? [x.nada]), t, this.isianBar);
        });
      }
      this.terjadwal.push({ t: this.waktuBerikut, i });
      this.waktuBerikut += d;
      this.langkahBerikut = (i + 1) % langkah.length;
    }
    const batas = ctx.currentTime - 1;
    while (this.terjadwal.length && this.terjadwal[0].t < batas) this.terjadwal.shift();
  }

  /**
   * Genjreng panjang (klimaks): satu sapuan pelan yang dibiarkan bergaung. Bila pola sedang
   * berjalan, pola masuk JEDA supaya gaungnya tidak terpotong; "Lanjut" meneruskan pola dengan
   * akor ini, tepat di ketukan.
   */
  genjrengPanjang(voicing, kekuatan = 0.9) {
    const ctx = this.suara.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    if (this.berjalan) {
      this.jeda = true;
      this.suara.batalkanTerjadwal(t);
      this.voicing = voicing;
    }
    this.suara.goresan(voicing, kekuatan, t, { arah: 'turun', panjang: true });
  }

  /** Langkah yang sedang berbunyi sekarang (untuk indikator), atau -1. */
  langkahKini() {
    const ctx = this.suara.ctx;
    if (!ctx || !this.berjalan) return -1;
    let kini = -1;
    for (const s of this.terjadwal) if (s.t <= ctx.currentTime) kini = s.i;
    return kini;
  }

  aturPola(id) {
    this.polaId = id;
    // pola baru langsung dipakai dari langkah 0 bila sedang berjalan
    if (this.berjalan && this.voicing && this.pola.langkah) this.mainkan(this.voicing, this.kekuatan);
    else if (!this.pola.langkah) this.berhenti(false);
  }

  aturTempo(bpm) { this.bpm = Math.max(40, Math.min(200, bpm)); }

  /** Hentikan pola. redam=true juga meredam bunyi yang masih bergaung. */
  berhenti(redam = true) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.jeda = false;
    this.voicing = null;
    this.terjadwal = [];
    if (this.suara.ctx) {
      if (redam) this.suara.diam();
      else this.suara.batalkanTerjadwal(this.suara.ctx.currentTime);
    }
  }
}
