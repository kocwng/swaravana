// Mesin audio: memutar akor dari sampel yang dibuat sintesis.js, dengan strum, reverb,
// dan peredaman akor sebelumnya. Sampel di-cache per nada dan dipanaskan di awal supaya
// petikan pertama tidak menunggu perhitungan.
import { sampelGitar, sampelPiano, impulsReverb } from './sintesis.js';
import { frekuensi } from './teori.js';

export class MesinSuara {
  constructor() {
    this.ctx = null;
    this.instrumen = 'gitar';
    this.cache = new Map(); // `${instrumen}:${midi}` -> AudioBuffer
    this.aktif = []; // {src, gain}
    this.volume = 0.8;
    this.jenisGitar = 'nilon'; // 'nilon' (lembut, hangat) | 'baja' (akustik, cerah)
  }

  /** Harus dipanggil dari gestur pengguna (klik), aturan autoplay browser. */
  async mulai() {
    if (this.ctx) { if (this.ctx.state !== 'running') await this.ctx.resume(); return; }
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.nada = ctx.createBiquadFilter(); // warna instrumen
    this.nada.type = 'lowpass';
    this.kering = ctx.createGain();
    this.basah = ctx.createGain();
    const reverb = ctx.createConvolver();
    const [l, r] = impulsReverb(ctx.sampleRate);
    const ir = ctx.createBuffer(2, l.length, ctx.sampleRate);
    ir.copyToChannel(l, 0); ir.copyToChannel(r, 1);
    reverb.buffer = ir;
    this.kompresor = ctx.createDynamicsCompressor();
    this.kompresor.threshold.value = -14;
    this.kompresor.ratio.value = 4;
    this.master = ctx.createGain();
    this.bus.connect(this.nada);
    this.nada.connect(this.kering).connect(this.kompresor);
    this.nada.connect(reverb).connect(this.basah).connect(this.kompresor);
    this.kompresor.connect(this.master).connect(ctx.destination);
    this.aturInstrumen(this.instrumen);
    this.aturVolume(this.volume);
    if (ctx.state !== 'running') await ctx.resume();
  }

  aturVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  aturInstrumen(nama) {
    this.instrumen = nama;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // warna gitar sudah dibentuk di sampel (badan kayu, atap kecerahan); filter di sini hanya pengaman
    if (nama === 'gitar') { this.nada.frequency.setTargetAtTime(9000, t, 0.02); this.kering.gain.value = 0.82; this.basah.gain.value = 0.3; }
    else { this.nada.frequency.setTargetAtTime(7500, t, 0.02); this.kering.gain.value = 0.8; this.basah.gain.value = 0.3; }
  }

  /** Perkiraan latensi audio keluaran (detik). */
  latensi() {
    if (!this.ctx) return null;
    return (this.ctx.baseLatency || 0) + (this.ctx.outputLatency || 0);
  }

  /**
   * Sampel satu nada. Gitar punya dua lapis: 'lembut' (petikan pelan, lebih hangat) dan
   * 'keras'; dipilih dari kekuatan petikan.
   */
  buffer(midi, instrumen = this.instrumen, lapis = 'keras', panjang = false) {
    const gitar = instrumen === 'gitar';
    const kunci = (gitar ? `gitar:${this.jenisGitar}:${lapis}:${midi}` : `${instrumen}:${midi}`) + (panjang ? ':panjang' : '');
    let b = this.cache.get(kunci);
    if (!b) {
      const sr = this.ctx.sampleRate;
      // panjang = dibiarkan bergaung (genjreng klimaks): sampel lebih panjang, peluruhan alami
      const data = gitar
        ? sampelGitar(frekuensi(midi), sr, { jenis: this.jenisGitar, lembut: lapis === 'lembut', durasi: panjang ? 7 : undefined })
        : sampelPiano(frekuensi(midi), sr, panjang ? 6 : undefined);
      b = this.ctx.createBuffer(1, data.length, sr);
      b.copyToChannel(data, 0);
      this.cache.set(kunci, b);
    }
    return b;
  }

  /**
   * Siapkan sampel untuk daftar nada di waktu senggang, sedikit demi sedikit
   * supaya tidak membuat video/deteksi tersendat.
   */
  panaskan(daftarMidi, instrumen = this.instrumen) {
    if (!this.ctx) return;
    // gitar: siapkan kedua lapis dinamika (lembut & keras)
    const lapis = instrumen === 'gitar' ? ['lembut', 'keras'] : ['keras'];
    const antre = [...new Set(daftarMidi)].flatMap((m) => lapis.map((l) => [m, l]));
    const jalan = (batas) => {
      while (antre.length && (!batas || batas.timeRemaining() > 8)) { const [m, l] = antre.shift(); this.buffer(m, instrumen, l); }
      if (antre.length) jadwal();
    };
    const jadwal = () => (window.requestIdleCallback ? requestIdleCallback(jalan, { timeout: 500 }) : setTimeout(() => jalan(null), 30));
    jadwal();
  }

  /**
   * Bunyikan akor.
   * @param {number[]} nada      daftar MIDI, dari bas ke atas
   * @param {number} kekuatan    0..1 (dari kecepatan tekuk jari)
   */
  mainkan(nada, kekuatan = 0.8) {
    if (!this.ctx) return;
    this.goresan(nada, kekuatan, this.ctx.currentTime + 0.005);
  }

  /**
   * Satu goresan (genjreng/petik) terjadwal pada waktu audio `t0`.
   * @param {number[]} nada   urutan senar yang dibunyikan (sudah sesuai arah)
   * @param {number} kekuatan 0..1
   * @param {number} t0       waktu AudioContext
   * @param {{arah?:'turun'|'naik'|'petik', pendek?:boolean, mati?:boolean, redam?:boolean}} [o]
   */
  goresan(nada, kekuatan, t0, { arah = 'turun', pendek = false, mati = false, redam = true, panjang = false } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    // Redam bunyi sebelumnya tepat saat goresan ini mulai (gitar: senar disentuh lagi;
    // piano: lepas pedal pelan). Petik jari tidak meredam: senar lain dibiarkan bergaung.
    if (redam) {
      const lama = this.instrumen === 'gitar' ? 0.06 : 0.25;
      for (const v of this.aktif) {
        if (v.mulai >= t0) continue;
        v.gain.gain.cancelScheduledValues(t0);
        v.gain.gain.setTargetAtTime(0, t0, lama / 3);
        try { v.src.stop(t0 + lama * 2); } catch { /* sudah berhenti */ }
      }
      this.aktif = this.aktif.filter((v) => v.mulai >= t0);
    }
    const piano = this.instrumen !== 'gitar';
    // genjreng pelan = jari menyapu senar lebih lambat (jarak antar senar lebih lebar)
    let jeda = piano ? 0.004 : arah === 'petik' ? 0 : (arah === 'naik' ? 0.009 : 0.012) + (1 - kekuatan) * 0.03;
    // genjreng panjang (klimaks): sapuan pelan & lebar; piano digulung (arpeggiated) pelan
    if (panjang) jeda = piano ? 0.03 : 0.045;
    const lapis = !piano && kekuatan < 0.6 ? 'lembut' : 'keras';
    const tiap = (0.35 + 0.65 * kekuatan) / Math.sqrt(Math.max(3, nada.length));
    nada.forEach((midi, i) => {
      const mulai = t0 + i * jeda;
      const src = ctx.createBufferSource();
      src.buffer = this.buffer(midi, this.instrumen, lapis, panjang);
      const gain = ctx.createGain();
      // senar bas sedikit lebih keras pada genjreng turun gitar; bas piano sedikit lebih lembut
      const g = tiap * (piano ? (i === 0 ? 0.9 : 1) : (i === 0 && arah === 'turun' ? 1.15 : 1));
      gain.gain.setValueAtTime(g, mulai);
      src.connect(gain).connect(this.bus);
      src.start(mulai); // start dulu: stop() sebelum start() melempar InvalidStateError
      if (mati) { gain.gain.setTargetAtTime(0, mulai + 0.012, 0.008); src.stop(mulai + 0.09); } // "cek" diredam telapak
      else if (pendek) { gain.gain.setTargetAtTime(0, mulai + 0.07, 0.025); src.stop(mulai + 0.3); } // chop
      const v = { src, gain, mulai };
      src.onended = () => { this.aktif = this.aktif.filter((x) => x !== v); };
      this.aktif.push(v);
    });
  }

  /** Batalkan goresan yang sudah dijadwalkan tapi belum berbunyi (mulai ≥ t). */
  batalkanTerjadwal(t) {
    for (const v of this.aktif) if (v.mulai >= t) { try { v.src.stop(); } catch { /* belum mulai */ } }
    this.aktif = this.aktif.filter((v) => v.mulai < t);
  }

  /** Redam semua bunyi (gestur "mute"). */
  diam() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.batalkanTerjadwal(t);
    for (const v of this.aktif) {
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setTargetAtTime(0, t, 0.02);
      try { v.src.stop(t + 0.12); } catch { /* sudah berhenti */ }
    }
    this.aktif = [];
  }
}
