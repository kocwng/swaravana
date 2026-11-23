import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PemutarPola } from '../public/js/pemutar.js';

/** Mesin suara palsu: mencatat goresan dengan waktunya; jam audio bisa dimajukan manual. */
function suaraPalsu() {
  return {
    ctx: { currentTime: 10 },
    goresanList: [], mainkanList: [], dibatalkan: [], diamKali: 0,
    goresan(nada, kekuatan, t, g = {}) { this.goresanList.push({ nada, kekuatan, t, arah: g.arah ?? 'turun', panjang: Boolean(g.panjang) }); },
    mainkan(nada, k) { this.mainkanList.push({ nada, k }); },
    batalkanTerjadwal(t) { this.dibatalkan.push(t); this.goresanList = this.goresanList.filter((x) => x.t < t); },
    diam() { this.diamKali++; },
  };
}
const C = [48, 52, 55, 60, 64, 67];
const G = [43, 47, 50, 55, 59, 67];

/** Majukan jam audio dan jalankan penjadwal seperti setInterval. */
function majukan(p, s, detik) {
  for (let t = 0; t < detik; t += 0.025) { s.ctx.currentTime += 0.025; p.jadwalkan(); }
}

test('"sekali" = satu genjreng biasa, tanpa penjadwal', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('sekali');
  p.mainkan(C, 0.8);
  assert.equal(s.goresanList.length, 1);
  assert.deepEqual(s.goresanList[0].nada, C);
  assert.equal(p.berjalan, false);
});

test('pola pop D.DU.UDU pada 120 bpm: waktu & arah tiap goresan tepat', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('pop'); p.aturTempo(120); // 1 langkah = 0.25 s
  p.mainkan(C, 0.8);
  majukan(p, s, 2.1); // satu birama (8 langkah × 0.25 = 2 s) + sedikit
  p.berhenti();
  const satuBirama = s.goresanList.filter((g) => g.t < 10.005 + 2 - 1e-9);
  const rel = satuBirama.map((g) => [+(g.t - 10.005).toFixed(3), g.arah]);
  assert.deepEqual(rel, [[0, 'turun'], [0.5, 'turun'], [0.75, 'naik'], [1.25, 'naik'], [1.5, 'turun'], [1.75, 'naik']]);
});

test('pola berulang (loop) selama tidak dihentikan', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('rock'); p.aturTempo(120);
  p.mainkan(C, 0.8);
  majukan(p, s, 4);
  p.berhenti();
  assert.ok(s.goresanList.length >= 16, `${s.goresanList.length}`);
});

test('ganti akor: pola mulai ulang dari langkah 0 dengan akor baru, goresan lama di masa depan dibatalkan', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('pop'); p.aturTempo(120);
  p.mainkan(C, 0.8);
  majukan(p, s, 0.6);
  const tGanti = s.ctx.currentTime;
  p.mainkan(G, 0.8);
  assert.ok(s.dibatalkan.some((t) => Math.abs(t - (tGanti + 0.005)) < 1e-9));
  assert.ok(s.goresanList.filter((g) => g.t >= tGanti + 0.005).every((g) => g.nada.includes(43) || g.nada.some((n) => G.includes(n))));
  const pertamaBaru = s.goresanList.find((g) => g.t >= tGanti);
  assert.equal(pertamaBaru.arah, 'turun');
  assert.ok(Math.abs(pertamaBaru.t - (tGanti + 0.005)) < 1e-9);
  p.berhenti();
});

test('berhenti: timer dibersihkan, bunyi diredam', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('pop');
  p.mainkan(C, 0.8);
  assert.equal(p.berjalan, true);
  p.berhenti();
  assert.equal(p.berjalan, false);
  assert.equal(s.diamKali, 1);
});

test('langkahKini mengikuti jam audio', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('pop'); p.aturTempo(120);
  p.mainkan(C, 0.8);
  majukan(p, s, 0.55); // lewat langkah 0 dan 1 (0.25), belum langkah 2 (0.5)?  0.55 > 0.505 → langkah 2
  assert.equal(p.langkahKini(), 2);
  p.berhenti();
  assert.equal(p.langkahKini(), -1);
});

test('tempo dibatasi 40–200 bpm', () => {
  const p = new PemutarPola(suaraPalsu());
  p.aturTempo(10); assert.equal(p.bpm, 40);
  p.aturTempo(999); assert.equal(p.bpm, 200);
});

test('timer telat: goresan yang sudah lewat dilompati, tidak dimainkan sekaligus', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('rock'); p.aturTempo(120); // 0.25 s per langkah
  p.mainkan(C, 0.8);
  const awal = s.goresanList.length;
  s.ctx.currentTime += 1.0; // timer "tidur" 1 detik
  p.jadwalkan();
  const baru = s.goresanList.slice(awal);
  assert.ok(baru.every((g) => g.t >= s.ctx.currentTime - 0.03), JSON.stringify(baru.map((g) => g.t)));
  assert.ok(baru.length <= 2);
  p.berhenti();
});

test('pola kustom 1/16: D...D.U.  pada 60 bpm → langkah 0,25 s', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('kustom'); p.aturTempo(60);
  p.aturPolaKustom({ langkah: 'D...D.U.D.UD.UDU', birama: 4, resolusi: 4 });
  p.mainkan(C, 0.8);
  majukan(p, s, 1.1);
  p.berhenti();
  const rel = s.goresanList.filter((g) => g.t < 10.005 + 1).map((g) => [+(g.t - 10.005).toFixed(3), g.arah]);
  assert.deepEqual(rel, [[0, 'turun'], [1, 'turun']].filter(([t]) => t < 1));
  assert.equal(p.pola.resolusi, 4);
});

test('pola kustom: kotak redam (X) & diam (.)', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('kustom'); p.aturTempo(120);
  p.aturPolaKustom({ langkah: 'DXUX', birama: 2, resolusi: 2 });
  p.mainkan(C, 0.8);
  majukan(p, s, 1.05);
  p.berhenti();
  assert.equal(s.goresanList.filter((g) => g.t < 10.005 + 1 - 1e-9).length, 4);
});

test('ubah pola kustom saat berjalan → pola baru langsung dipakai dari langkah 0', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('kustom'); p.aturTempo(120);
  p.mainkan(C, 0.8);
  majukan(p, s, 0.3);
  p.aturPolaKustom({ langkah: 'U.......', birama: 4, resolusi: 2 });
  const pertama = s.goresanList.find((g) => g.t >= s.ctx.currentTime);
  assert.equal(pertama.arah, 'naik');
  p.berhenti();
});

test('jeda: tidak ada goresan selama jeda, tempo tetap jalan, lanjut tepat di ketukan', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('rock'); p.aturTempo(120); // 0,25 s per langkah
  p.mainkan(C, 0.8);
  majukan(p, s, 0.6);
  p.aturJeda(true);
  assert.equal(s.diamKali, 1); // senar diredam
  const tJeda = s.ctx.currentTime;
  majukan(p, s, 1.0);
  assert.equal(s.goresanList.filter((g) => g.t > tJeda + 0.13).length, 0, 'tidak ada goresan baru saat jeda');
  p.aturJeda(false);
  majukan(p, s, 0.6);
  const sesudah = s.goresanList.filter((g) => g.t > tJeda + 0.13);
  assert.ok(sesudah.length >= 2);
  // masuk lagi tepat di grid ketukan awal (kelipatan 0,25 s dari mulai)
  for (const g of sesudah) assert.ok(Math.abs(((g.t - 10.005) / 0.25) - Math.round((g.t - 10.005) / 0.25)) < 1e-6);
  p.berhenti();
});

test('memetik akor saat jeda langsung melanjutkan', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('pop'); p.mainkan(C, 0.8);
  p.aturJeda(true);
  p.mainkan(G, 0.8);
  assert.equal(p.jeda, false);
  p.berhenti();
});

test('genjreng panjang saat pola berjalan: pola dijeda, satu goresan panjang, lanjut pakai akor itu', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('pop'); p.aturTempo(120);
  p.mainkan(C, 0.8);
  majukan(p, s, 0.6);
  const t = s.ctx.currentTime;
  p.genjrengPanjang(G, 0.95);
  assert.equal(p.jeda, true);
  const panjang = s.goresanList.filter((g) => g.panjang);
  assert.equal(panjang.length, 1);
  assert.deepEqual(panjang[0].nada, G);
  majukan(p, s, 1);
  assert.equal(s.goresanList.filter((g) => g.t > t + 0.13 && !g.panjang).length, 0, 'gaung tidak dipotong pola');
  p.aturJeda(false);
  majukan(p, s, 1);
  const lanjut = s.goresanList.filter((g) => g.t > t + 1.1 && !g.panjang);
  assert.ok(lanjut.length > 0 && lanjut.every((g) => g.nada.every((n) => G.includes(n))));
  p.berhenti();
});

test('genjreng panjang tanpa pola berjalan: hanya satu goresan, tidak memulai pola', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('pop');
  p.genjrengPanjang(C, 0.9);
  assert.equal(p.berjalan, false);
  assert.equal(s.goresanList.filter((g) => g.panjang).length, 1);
});

test('piano: pola oom-pah memainkan bas lalu akor sesuai ketukan', () => {
  const s = suaraPalsu(); s.instrumen = 'piano';
  const p = new PemutarPola(s);
  p.aturPola('p-oompah'); p.aturTempo(120);
  const Cp = [48, 60, 64, 67];
  p.mainkan(Cp, 0.8);
  majukan(p, s, 1.05);
  p.berhenti();
  const satuKetuk = s.goresanList.filter((g) => g.t < 10.005 + 1 - 1e-9).map((g) => [+(g.t - 10.005).toFixed(3), g.nada.join(',')]);
  assert.deepEqual(satuKetuk, [[0, '48'], [0.5, '60,64,67']]);
});

test('piano + isian: ketukan terakhir diisi lari naik (1/16), pola memberi ruang, bas berlapis oktaf', () => {
  const s = suaraPalsu(); s.instrumen = 'piano';
  const p = new PemutarPola(s);
  p.aturPola('p-oompah'); p.aturTempo(120); // 0,25 s per langkah 1/8
  p.isianJenis = 'naik';
  const terlihat = [];
  p.onIsian = (nama, nada) => terlihat.push([nama, nada.join(',')]);
  const Cp = [48, 60, 64, 67];
  p.mainkan(Cp, 0.8);
  majukan(p, s, 2.05);
  p.berhenti();
  const bar1 = s.goresanList.filter((g) => g.t < 10.005 + 2 - 1e-9).map((g) => [+(g.t - 10.005).toFixed(3), g.nada.join(',')]);
  assert.deepEqual(bar1, [
    [0, '36,48'], [0.5, '60,64,67'], [1, '36,48'], // B ○ B (bas oktaf)
    [1.5, '60'], [1.625, '64'], [1.75, '67'], [1.875, '72'], // isian menggantikan "○" di ketukan 4
  ]);
  assert.deepEqual(terlihat[0], ['lari naik', '60,64,67,72']);
});

test('isian tiap 2 birama: birama pertama polos, birama kedua diisi', () => {
  const s = suaraPalsu(); s.instrumen = 'piano';
  const p = new PemutarPola(s);
  p.aturPola('p-blok'); p.aturTempo(120);
  p.isianJenis = 'turun'; p.isianTiap = 2;
  p.mainkan([48, 60, 64, 67], 0.8);
  majukan(p, s, 4.05);
  p.berhenti();
  const isian = s.goresanList.filter((g) => g.nada.length === 1 && g.nada[0] === 72).map((g) => +(g.t - 10.005).toFixed(3));
  assert.deepEqual(isian, [3.5]); // hanya di ketukan 4 birama kedua
});

test('gitar tidak terpengaruh pengaturan isian piano', () => {
  const s = suaraPalsu(); // instrumen bukan piano
  const p = new PemutarPola(s);
  p.aturPola('rock'); p.aturTempo(120); p.isianJenis = 'naik';
  p.mainkan(C, 0.8);
  majukan(p, s, 2.05);
  p.berhenti();
  assert.ok(s.goresanList.filter((g) => g.t < 10.005 + 2 - 1e-9).every((g) => g.nada.length === C.length));
});

test('bas berjalan memakai akor berikutnya yang diberikan aplikasi', () => {
  const s = suaraPalsu(); s.instrumen = 'piano';
  const p = new PemutarPola(s);
  p.aturPola('p-blok'); p.aturTempo(120); p.isianJenis = 'bas';
  p.voicingBerikut = [55, 59, 62, 67]; // G
  p.mainkan([48, 60, 64, 67], 0.8);
  majukan(p, s, 2.05);
  p.berhenti();
  const jalan = s.goresanList.filter((g) => g.t >= 10.005 + 1.5 - 1e-9 && g.t < 10.005 + 2).map((g) => g.nada.join(','));
  assert.deepEqual(jalan, ['53', '54']); // F – F# menuju G
});

test('isian otomatis tetap bergiliran walau akor berganti tiap birama', () => {
  const s = suaraPalsu(); s.instrumen = 'piano';
  const p = new PemutarPola(s);
  p.aturPola('p-blok'); p.aturTempo(120); p.isianJenis = 'otomatis';
  const nama = [];
  p.onIsian = (n) => nama.push(n);
  const akor = [[48, 60, 64, 67], [43, 55, 59, 62], [45, 57, 60, 64], [41, 53, 57, 60]];
  for (const v of akor) { p.mainkan(v, 0.8); majukan(p, s, 1.95); } // ganti akor tepat sebelum birama baru
  p.berhenti();
  assert.equal(nama.length, 4);
  for (let i = 1; i < nama.length; i++) assert.notEqual(nama[i], nama[i - 1]);
});

test('ganti akor pada waktu audio tepat (awal birama): tanpa flam akor lama', () => {
  const s = suaraPalsu(); const p = new PemutarPola(s);
  p.aturPola('rock'); p.aturTempo(120); // birama = 2 s
  p.mainkan(C, 0.8, 10.05);
  majukan(p, s, 1.95); // timer "datang" sedikit sebelum awal birama ke-2 (12.05), langkah 0-nya sudah terjadwal
  p.mainkan(G, 0.8, 12.05);
  majukan(p, s, 0.3);
  p.berhenti();
  const diAwalBar2 = s.goresanList.filter((g) => Math.abs(g.t - 12.05) < 1e-6);
  assert.equal(diAwalBar2.length, 1);
  assert.deepEqual(diAwalBar2[0].nada, G);
});

test('isian memakai akor berikutnya yang baru diberikan setelah birama dimulai', () => {
  const s = suaraPalsu(); s.instrumen = 'piano';
  const p = new PemutarPola(s);
  p.aturPola('p-blok'); p.aturTempo(120); p.isianJenis = 'bas';
  p.mainkan([48, 60, 64, 67], 0.8);
  majukan(p, s, 0.3);
  p.voicingBerikut = [55, 59, 62, 67]; // datang SETELAH awal birama
  majukan(p, s, 1.75);
  p.berhenti();
  const jalan = s.goresanList.filter((g) => g.t >= 10.005 + 1.5 - 1e-9 && g.t < 10.005 + 2).map((g) => g.nada.join(','));
  assert.deepEqual(jalan, ['53', '54']);
});

test('piano "Sekali" + isian: akor ditahan tiap birama & isian tetap berbunyi', () => {
  const s = suaraPalsu(); s.instrumen = 'piano';
  const p = new PemutarPola(s);
  p.aturPola('sekali'); p.aturTempo(120); p.isianJenis = 'hiasan';
  const nama = [];
  p.onIsian = (n) => nama.push(n);
  p.mainkan([48, 60, 64, 67], 0.8);
  assert.equal(p.berjalan, true);
  majukan(p, s, 2.05);
  p.berhenti();
  const bar1 = s.goresanList.filter((g) => g.t < 10.005 + 2 - 1e-9).map((g) => [+(g.t - 10.005).toFixed(3), g.nada.join(',')]);
  assert.deepEqual(bar1, [[0, '36,48,60,64,67'], [1.5, '69'], [1.625, '67'], [1.75, '66'], [1.875, '67']]);
  assert.deepEqual(nama, ['hiasan']);
});

test('piano "Sekali" tanpa isian: tetap satu kali bunyi, tanpa pengulangan', () => {
  const s = suaraPalsu(); s.instrumen = 'piano';
  const p = new PemutarPola(s);
  p.aturPola('sekali'); p.isianJenis = 'mati';
  p.mainkan([48, 60, 64, 67], 0.8);
  assert.equal(p.berjalan, false);
  assert.equal(s.goresanList.length, 1);
});

test('Kapan "akhir kalimat": isian besar hanya di akor terakhir baris; tanpa info sheet tiap 4 birama', () => {
  const jalankan = (akhir) => {
    const s = suaraPalsu(); s.instrumen = 'piano';
    const p = new PemutarPola(s);
    p.aturPola('p-blok'); p.aturTempo(120); p.isianJenis = 'genre:pop'; p.isianTiap = 'kalimat';
    p.akhirKalimat = akhir;
    const isian = [];
    p.onIsian = (nama, nada, t, x) => isian.push([+(t - 10.005).toFixed(3), x.ukuran]);
    p.mainkan([48, 60, 64, 67], 0.8);
    majukan(p, s, 8.05); // 4 birama
    p.berhenti();
    return isian;
  };
  assert.deepEqual(jalankan(false), []);
  const ya = jalankan(true);
  assert.equal(ya.length, 4);
  assert.ok(ya.every(([, u]) => u === 'besar'));
  const tanpaInfo = jalankan(null);
  assert.deepEqual(tanpaInfo.map(([t]) => t), [7]); // hanya birama ke-4 (mulai ketukan 3 = 6 + 1)
});

test('gitar + isian: chuck terjadwal (senar diredam) di ketukan 4, pola memberi ruang', () => {
  const s = suaraPalsu(); s.instrumen = 'gitar';
  s.goresan = function (nada, kekuatan, t, g = {}) { this.goresanList.push({ nada, t, mati: Boolean(g.mati), arah: g.arah }); };
  const p = new PemutarPola(s);
  p.aturPola('rock'); p.aturTempo(120);
  p.isianJenisGitar = 'g:chuck';
  p.mainkan(C, 0.8);
  majukan(p, s, 2.05);
  p.berhenti();
  const bar1 = s.goresanList.filter((g) => g.t < 10.005 + 2 - 1e-9);
  const pola = bar1.filter((g) => g.t < 10.005 + 1.5 - 1e-9);
  assert.equal(pola.length, 6); // 6 genjreng rock sebelum ketukan 4
  const isian = bar1.filter((g) => g.t >= 10.005 + 1.5 - 1e-9);
  assert.deepEqual(isian.map((g) => g.mati), [true, true, true, false]);
});

test('gitar "Sekali genjreng" + isian: satu genjreng tiap birama lalu isian', () => {
  const s = suaraPalsu(); s.instrumen = 'gitar';
  const p = new PemutarPola(s);
  p.aturPola('sekali'); p.aturTempo(120); p.isianJenisGitar = 'g:lonceng';
  p.mainkan(C, 0.8);
  assert.equal(p.berjalan, true);
  majukan(p, s, 2.05);
  p.berhenti();
  const t = s.goresanList.filter((g) => g.t < 10.005 + 2 - 1e-9).map((g) => +(g.t - 10.005).toFixed(3));
  assert.deepEqual(t, [0, 1.5, 1.625, 1.75, 1.875]);
});

test('isian piano & gitar disimpan terpisah', () => {
  const s = suaraPalsu(); s.instrumen = 'gitar';
  const p = new PemutarPola(s);
  p.isianJenis = 'f:sus4'; p.isianJenisGitar = 'mati';
  assert.equal(p.isianAktif, 'mati');
  s.instrumen = 'piano';
  assert.equal(p.isianAktif, 'f:sus4');
});

test('label isian gitar: not beberapa senar ikut terbaca (bukan undefined)', () => {
  const s = suaraPalsu(); s.instrumen = 'gitar';
  const p = new PemutarPola(s);
  p.aturPola('rock'); p.aturTempo(120); p.isianJenisGitar = 'g:hammer-sus4';
  let nada = null;
  p.onIsian = (nama, n) => { nada = n; };
  p.mainkan(C, 0.8);
  majukan(p, s, 2.05);
  p.berhenti();
  assert.ok(nada && nada.length >= 3 && nada.every(Number.isFinite), String(nada));
});

test('pola petik Travis: senar dari bentuk akor asli, waktu tiap langkah tepat', () => {
  const s = suaraPalsu(); s.instrumen = 'gitar';
  const p = new PemutarPola(s);
  p.aturPola('t-travis'); p.aturTempo(120); // 0,25 s per langkah
  p.senar = [null, 48, 52, 55, 60, 64]; // C terbuka x32010 (senar 6 … 1)
  p.mainkan(C, 0.8);
  majukan(p, s, 2.05);
  p.berhenti();
  const bar1 = s.goresanList.filter((g) => g.t < 10.005 + 2 - 1e-9).map((g) => [+(g.t - 10.005).toFixed(3), g.nada.join(',')]);
  assert.deepEqual(bar1, [[0, '48,64'], [0.25, '55'], [0.5, '52'], [0.75, '60'], [1, '48'], [1.25, '55'], [1.5, '52'], [1.75, '60']]);
});

test('boom-chicka: bas lalu genjreng 3 senar atas (turun), langkah kosong = diam', () => {
  const s = suaraPalsu(); s.instrumen = 'gitar';
  const p = new PemutarPola(s);
  p.aturPola('t-boomchicka'); p.aturTempo(120);
  p.senar = [43, 47, 50, 55, 59, 67]; // G terbuka 320003
  p.mainkan(C, 0.8);
  majukan(p, s, 2.05);
  p.berhenti();
  const bar1 = s.goresanList.filter((g) => g.t < 10.005 + 2 - 1e-9).map((g) => [+(g.t - 10.005).toFixed(3), g.nada.join(','), g.arah]);
  assert.deepEqual(bar1, [[0, '43', 'petik'], [0.5, '55,59,67', 'turun'], [1, '50', 'petik'], [1.5, '55,59,67', 'turun']]);
});

test('tab kustom: diganti saat berjalan langsung dipakai; tanpa bentuk akor memakai voicing', () => {
  const s = suaraPalsu(); s.instrumen = 'gitar';
  const p = new PemutarPola(s);
  p.aturPola('tab-kustom'); p.aturTempo(120);
  p.mainkan(C, 0.8); // tanpa p.senar → senar dari voicing [48,52,55,60,64,67]
  majukan(p, s, 0.1);
  p.aturTabKustom({ tab: [[1], [], [6], []], birama: 2, resolusi: 2 });
  majukan(p, s, 1.0);
  p.berhenti();
  const sesudah = s.goresanList.filter((g) => g.t > 10.1).map((g) => g.nada.join(','));
  assert.deepEqual(sesudah.slice(0, 2), ['67', '48']);
});
