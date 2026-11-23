import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ekstensiJari, PemicuJari, PemicuKombinasi, PemicuSentuh, PemicuBentuk, jarakSentuh, jumlahTerangkat, PenstabilJumlah, bagiTangan } from '../public/js/gestur.js';

/**
 * Tangan sintetis (koordinat ternormalisasi seperti MediaPipe).
 * tekuk[i] = sudut tekuk tiap sendi jari i dalam derajat (0 = lurus), atau [buku, tengah, ujung]
 * untuk tiap sendi terpisah. Jempol: 0 lurus, 90 terlipat.
 */
function tangan(tekuk = [0, 0, 0, 0, 0], geserX = 0) {
  const lm = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  const p = (i, x, y, z = 0) => { lm[i] = { x: x + geserX, y, z }; };
  p(0, 0.5, 0.9);
  // jempol: lurus menjauh, terlipat ke arah pangkal jari manis
  const tj = tekuk[0] / 90;
  p(1, 0.42, 0.82); p(2, 0.38, 0.75);
  p(3, 0.35 + tj * 0.1, 0.69 - tj * 0.0); p(4, 0.32 + tj * 0.2, 0.62 + tj * 0.04);
  const pangkal = [null, 0.44, 0.5, 0.56, 0.62];
  const ruas = [0.1, 0.07, 0.06];
  for (let f = 1; f < 5; f++) {
    const b = 1 + f * 4;
    let x = pangkal[f], y = 0.6, z = 0, sudut = 0;
    p(b, x, y, z);
    for (let s = 0; s < 3; s++) {
      sudut += ((Array.isArray(tekuk[f]) ? tekuk[f][s] : tekuk[f]) * Math.PI) / 180;
      y -= ruas[s] * Math.cos(sudut);
      z -= ruas[s] * Math.sin(sudut) * 0.75; // z dibagi aspek di ekstensiJari
      p(b + s + 1, x, y, z);
    }
  }
  return lm;
}

test('ekstensi: tangan terbuka ≈ 1 semua, kepalan ≈ 0', () => {
  const buka = ekstensiJari(tangan());
  assert.ok(buka.every((e) => e > 0.85), JSON.stringify(buka));
  const kepal = ekstensiJari(tangan([90, 85, 85, 85, 85]));
  assert.ok(kepal.every((e) => e < 0.2), JSON.stringify(kepal));
});

test('ekstensi: hanya telunjuk yang ditekuk', () => {
  const e = ekstensiJari(tangan([0, 80, 0, 0, 0]));
  assert.ok(e[1] < 0.3 && e[0] > 0.8 && e[2] > 0.85);
});

/** Jalankan urutan frame [t, tekuk[]] dan kumpulkan petikan. */
function jalankan(pemicu, frame) {
  const hasil = [];
  for (const [t, tk] of frame) {
    const p = pemicu.perbarui(ekstensiJari(tangan(tk)), t);
    if (p) hasil.push({ t, ...p });
  }
  return hasil;
}

test('tekukan cepat jari tengah memicu sekali', () => {
  const frame = [[0, [0, 0, 0, 0, 0]], [33, [0, 0, 0, 0, 0]], [66, [0, 0, 40, 0, 0]], [99, [0, 0, 85, 0, 0]], [132, [0, 0, 85, 0, 0]], [165, [0, 0, 85, 0, 0]]];
  const h = jalankan(new PemicuJari(), frame);
  assert.equal(h.length, 1);
  assert.equal(h[0].jari, 2);
  assert.ok(h[0].kekuatan > 0.5);
});

test('tekukan pelan tidak memicu', () => {
  const frame = [];
  for (let i = 0; i <= 60; i++) frame.push([i * 33, [0, (i / 60) * 85, 0, 0, 0]]); // 2 detik
  assert.equal(jalankan(new PemicuJari(), frame).length, 0);
});

test('jari yang sudah tertekuk sejak awal tidak memicu sampai diluruskan dulu', () => {
  const p = new PemicuJari();
  const h = jalankan(p, [[0, [0, 85, 0, 0, 0]], [33, [0, 85, 0, 0, 0]], [66, [0, 85, 0, 0, 0]]]);
  assert.equal(h.length, 0);
  const h2 = jalankan(p, [[99, [0, 0, 0, 0, 0]], [132, [0, 85, 0, 0, 0]]]);
  assert.equal(h2.length, 1);
});

test('harus lurus lagi sebelum bisa memicu lagi (tidak berulang saat ditahan)', () => {
  const frame = [[0, [0, 0, 0, 0, 0]], [33, [0, 85, 0, 0, 0]], [66, [0, 85, 0, 0, 0]], [99, [0, 60, 0, 0, 0]], [132, [0, 85, 0, 0, 0]]];
  assert.equal(jalankan(new PemicuJari(), frame).length, 1);
  const lagi = [...frame, [165, [0, 0, 0, 0, 0]], [198, [0, 0, 0, 0, 0]], [231, [0, 85, 0, 0, 0]]];
  assert.equal(jalankan(new PemicuJari(), lagi).length, 2);
});

test('jari tetangga ikut tertekuk: yang lebih cepat menang, hanya satu petikan', () => {
  const frame = [[0, [0, 0, 0, 0, 0]], [33, [0, 0, 0, 0, 0]], [66, [0, 0, 85, 30, 0]], [99, [0, 0, 85, 35, 0]], [132, [0, 0, 85, 35, 0]]];
  const h = jalankan(new PemicuJari(), frame);
  assert.equal(h.length, 1);
  assert.equal(h[0].jari, 2);
});

test('jeda global mencegah dua petikan dalam < 90 ms', () => {
  const frame = [[0, [0, 0, 0, 0, 0]], [16, [0, 0, 0, 0, 0]], [32, [0, 85, 0, 0, 0]], [48, [0, 85, 85, 0, 0]], [200, [0, 85, 85, 0, 0]]];
  const h = jalankan(new PemicuJari(), frame);
  assert.equal(h.length, 1);
});

test('jempol bisa memicu', () => {
  const frame = [[0, [0, 0, 0, 0, 0]], [33, [0, 0, 0, 0, 0]], [66, [90, 0, 0, 0, 0]]];
  const h = jalankan(new PemicuJari(), frame);
  assert.equal(h.length, 1);
  assert.equal(h[0].jari, 0);
});

test('jumlahTerangkat menghitung jari lurus', () => {
  assert.equal(jumlahTerangkat(ekstensiJari(tangan([90, 85, 85, 85, 85]))), 0);
  assert.equal(jumlahTerangkat(ekstensiJari(tangan([90, 0, 85, 85, 85]))), 1);
  assert.equal(jumlahTerangkat(ekstensiJari(tangan([90, 0, 0, 85, 85]))), 2);
  assert.equal(jumlahTerangkat(ekstensiJari(tangan([90, 0, 0, 0, 85]))), 3);
  assert.equal(jumlahTerangkat(ekstensiJari(tangan([90, 0, 0, 0, 0]))), 4);
  assert.equal(jumlahTerangkat(ekstensiJari(tangan())), 5);
});

test('penstabil: angka baru dipakai setelah 3 frame berturut-turut', () => {
  const s = new PenstabilJumlah(3);
  assert.equal(s.perbarui(2), null);
  assert.equal(s.perbarui(2), null);
  assert.equal(s.perbarui(2), 2);
  assert.equal(s.perbarui(3), 2); // kedip sesaat diabaikan
  assert.equal(s.perbarui(2), 2);
  assert.equal(s.perbarui(null), 2);
  assert.equal(s.perbarui(null), 2);
  assert.equal(s.perbarui(null), null);
});

test('bagiTangan memakai posisi layar (dicerminkan), bukan label', () => {
  const kiriKamera = tangan([0, 0, 0, 0, 0], -0.3); // x kecil di kamera = kanan di layar
  const kananKamera = tangan([0, 0, 0, 0, 0], 0.3);
  const { akor, pengubah } = bagiTangan([kananKamera, kiriKamera]);
  assert.equal(akor, kiriKamera);
  assert.equal(pengubah, kananKamera);
  assert.deepEqual(bagiTangan([]), { akor: null, pengubah: null });
  assert.equal(bagiTangan([kananKamera]).akor, kananKamera);
});

test('ketuk ala mengetuk meja (tekuk di buku jari saja) tetap terbaca tertekuk', () => {
  const e = ekstensiJari(tangan([0, 0, [75, 15, 5], 0, 0]));
  assert.ok(e[2] < 0.42, `tengah ${e[2]}`);
  assert.ok(e[1] > 0.85 && e[3] > 0.85);
});

test('jari merenggang ke samping tidak terbaca tertekuk', () => {
  const lm = tangan();
  // geser ujung kelingking ke samping (abduksi) tanpa menekuk
  for (const i of [18, 19, 20]) lm[i] = { ...lm[i], x: lm[i].x + (i - 17) * 0.02 };
  assert.ok(ekstensiJari(lm)[4] > 0.8);
});

test('jari tetangga ikut tertekuk lebih pelan di frame yang sama: hanya jari utama berbunyi', () => {
  // tengah 0→85 dalam 2 frame; manis ikut 0→60 (±70% kecepatan)
  const frame = [[0, [0, 0, 0, 0, 0]], [33, [0, 0, 0, 0, 0]], [66, [0, 0, 45, 30, 0]], [99, [0, 0, 85, 60, 0]], [132, [0, 0, 85, 60, 0]]];
  const h = jalankan(new PemicuJari(), frame);
  assert.deepEqual(h.map((x) => x.jari), [2]);
});

test('jari tetangga menyusul 120 ms kemudian (dalam jendela kunci): tidak berbunyi', () => {
  const frame = [[0, [0, 0, 0, 0, 0]], [33, [0, 0, 0, 0, 0]], [66, [0, 0, 85, 20, 0]], [99, [0, 0, 85, 40, 0]],
    [132, [0, 0, 85, 55, 0]], [165, [0, 0, 85, 75, 0]], [198, [0, 0, 85, 80, 0]], [400, [0, 0, 85, 80, 0]]];
  const h = jalankan(new PemicuJari(), frame);
  assert.deepEqual(h.map((x) => x.jari), [2]);
});

test('dua jari sama cepat (ambigu): tidak ada yang berbunyi', () => {
  const frame = [[0, [0, 0, 0, 0, 0]], [33, [0, 0, 0, 0, 0]], [66, [0, 0, 85, 85, 0]], [99, [0, 0, 85, 85, 0]]];
  assert.equal(jalankan(new PemicuJari(), frame).length, 0);
});

test('setelah jendela kunci lewat, jari lain bisa dipetik normal', () => {
  const frame = [[0, [0, 0, 0, 0, 0]], [33, [0, 0, 0, 0, 0]], [66, [0, 0, 85, 0, 0]], [99, [0, 0, 85, 0, 0]],
    [300, [0, 0, 85, 0, 0]], [333, [0, 0, 85, 0, 0]], [366, [0, 85, 85, 0, 0]]];
  assert.deepEqual(jalankan(new PemicuJari(), frame).map((x) => x.jari), [2, 1]);
});

import { PemilihBaris } from '../public/js/gestur.js';

/** Tangan di ketinggian y (titik tengah telapak). */
function tanganDiTinggi(y) {
  const lm = tangan();
  const geser = y - PemilihBaris.tinggiTelapak(lm);
  return lm.map((p) => ({ ...p, y: p.y + geser }));
}

test('PemilihBaris: atas / tengah / bawah dari tinggi telapak', () => {
  const b = new PemilihBaris();
  assert.equal(b.perbarui(tanganDiTinggi(0.5)), 'tengah');
  assert.equal(b.perbarui(tanganDiTinggi(0.25)), 'atas');
  assert.equal(b.perbarui(tanganDiTinggi(0.8)), 'bawah');
});

test('PemilihBaris: histeresis mencegah berkedip di garis batas', () => {
  const b = new PemilihBaris();
  b.perbarui(tanganDiTinggi(0.5));
  // sedikit di atas batas (0.40) belum cukup untuk pindah ke atas
  assert.equal(b.perbarui(tanganDiTinggi(0.38)), 'tengah');
  assert.equal(b.perbarui(tanganDiTinggi(0.35)), 'atas');
  // dari atas, turun sedikit melewati 0.40 masih atas
  assert.equal(b.perbarui(tanganDiTinggi(0.42)), 'atas');
  assert.equal(b.perbarui(tanganDiTinggi(0.45)), 'tengah');
});

import { DeteksiKepalan } from '../public/js/gestur.js';

test('mengepal cepat (4 jari sekaligus) tidak memicu petikan', () => {
  const frame = [[0, [0, 0, 0, 0, 0]], [33, [0, 0, 0, 0, 0]], [66, [40, 80, 82, 85, 80]], [99, [80, 85, 85, 85, 85]], [132, [80, 85, 85, 85, 85]]];
  assert.equal(jalankan(new PemicuJari(), frame).length, 0);
});

test('DeteksiKepalan: kepal setelah 3 frame, buka setelah 2 jari lurus 3 frame', () => {
  const d = new DeteksiKepalan();
  const kepal = ekstensiJari(tangan([80, 85, 85, 85, 85]));
  const buka = ekstensiJari(tangan());
  const satuJari = ekstensiJari(tangan([0, 0, 85, 0, 0]));
  assert.equal(d.perbarui(satuJari), false); // ketukan satu jari bukan kepalan
  assert.equal(d.perbarui(kepal), false);
  assert.equal(d.perbarui(kepal), false);
  assert.equal(d.perbarui(kepal), true);
  assert.equal(d.perbarui(buka), true);
  assert.equal(d.perbarui(buka), true);
  assert.equal(d.perbarui(buka), false);
});

test('DeteksiKepalan: kedip satu frame tidak mengubah status', () => {
  const d = new DeteksiKepalan();
  const kepal = ekstensiJari(tangan([80, 85, 85, 85, 85]));
  const buka = ekstensiJari(tangan());
  for (let i = 0; i < 3; i++) d.perbarui(kepal);
  assert.equal(d.perbarui(buka), true);
  assert.equal(d.perbarui(kepal), true);
  assert.equal(d.kepal, true);
});

// ── PemicuKombinasi (mode kombinasi jari, ukuran relatif) ──
const komb = () => new PemicuKombinasi();
/** Jalankan frame dengan langkah 66 ms (±15 fps, seperti kamera sungguhan yang lambat). */
function urut(pemicu, daftar, mulai = 0) {
  return jalankan(pemicu, daftar.map((tk, n) => [mulai + n * 66, tk]));
}
const SANTAI = [0, 20, 22, 22, 0]; // tangan santai: telunjuk/tengah/manis tidak lurus penuh

test('kombinasi: 1 jari dari tangan santai (tidak lurus penuh) tetap terbaca', () => {
  const h = urut(komb(), [SANTAI, SANTAI, SANTAI, [0, 80, 22, 22, 0], [0, 80, 22, 22, 0]]);
  assert.equal(h.length, 1);
  assert.equal(h[0].jari, 1);
  assert.equal(h[0].pasangan, undefined);
});

test('kombinasi: telunjuk + tengah bersamaan → pasangan', () => {
  const h = urut(komb(), [SANTAI, SANTAI, [0, 80, 80, 22, 0], [0, 80, 80, 22, 0]]);
  assert.equal(h.length, 1);
  assert.deepEqual(h[0].pasangan, [1, 2]);
});

test('kombinasi: jari kedua menyusul satu frame kemudian → tetap pasangan', () => {
  const h = urut(komb(), [SANTAI, SANTAI, [0, 80, 30, 22, 0], [0, 80, 80, 22, 0], [0, 80, 80, 22, 0], [0, 80, 80, 22, 0]]);
  assert.equal(h.length, 1);
  assert.deepEqual(h[0].pasangan, [1, 2]);
});

test('kombinasi: jari manis ikut turun sedikit saat telunjuk + tengah → bukan kepalan', () => {
  const h = urut(komb(), [SANTAI, SANTAI, [0, 80, 80, 30, 0], [0, 80, 80, 32, 0], [0, 80, 80, 32, 0]]);
  assert.equal(h.length, 1);
  assert.deepEqual(h[0].pasangan, [1, 2]);
});

test('kombinasi: jempol ikut terlipat setengah saat telunjuk dipetik → tetap telunjuk saja', () => {
  const h = urut(komb(), [SANTAI, SANTAI, [20, 80, 22, 22, 0], [25, 80, 22, 22, 0], [25, 80, 22, 22, 0], [25, 80, 22, 22, 0]]);
  assert.equal(h.length, 1);
  assert.equal(h[0].jari, 1);
  assert.equal(h[0].pasangan, undefined);
});

test('kombinasi: jempol + telunjuk DITEKUK bersamaan bukan pasangan (pasangan jempol = sentuh)', () => {
  const h = urut(komb(), [SANTAI, SANTAI, [90, 80, 22, 22, 0], [90, 80, 22, 22, 0], [90, 80, 22, 22, 0]]);
  assert.equal(h.length, 1);
  assert.equal(h[0].pasangan, undefined);
});

test('kombinasi: jari yang diblokir (sedang menyentuh jempol) tidak memicu tekuk', () => {
  const p = komb();
  const h = [];
  for (const [n, tk] of [SANTAI, SANTAI, [60, 50, 22, 22, 0], [60, 50, 22, 22, 0]].entries()) {
    const r = p.perbarui(ekstensiJari(tangan(tk)), n * 66, [0, 1]);
    if (r) h.push(r);
  }
  assert.equal(h.length, 0);
});

// ── PemicuSentuh (ujung jempol menyentuh ujung jari) ──
/** Tangan santai dengan ujung jempol digeser ke dekat ujung jari `ke` (jarak `d` × lebar telapak). */
function sentuh(ke, d = 0.01) {
  const lm = tangan(SANTAI);
  if (ke) { const u = lm[[0, 8, 12, 16, 20][ke]]; lm[4] = { x: u.x + 0.005, y: u.y + d, z: u.z }; /* digeser ke arah telapak */ }
  return lm;
}
function jalankanSentuh(p, daftar) {
  const h = [];
  daftar.forEach((lm, n) => { const r = p.perbarui(lm, 4 / 3, n * 66); if (r) h.push({ n, ...r }); });
  return h;
}

test('sentuh: jarakSentuh kecil hanya untuk jari yang disentuh', () => {
  const d = jarakSentuh(sentuh(1), 4 / 3);
  assert.ok(d[0] < 0.1, String(d));
  assert.ok(d.slice(1).every((x) => x > 0.2), String(d));
});

test('sentuh: jempol menyentuh tiap jari → pasangan [0, jari], sekali saja selama masih menempel', () => {
  for (const ke of [1, 2, 3, 4]) {
    const h = jalankanSentuh(new PemicuSentuh(), [sentuh(0), sentuh(0), sentuh(ke), sentuh(ke), sentuh(ke)]);
    assert.equal(h.length, 1, `jari ${ke}`);
    assert.deepEqual(h[0].pasangan, [0, ke]);
  }
});

test('sentuh: harus dilepas dulu sebelum bisa berbunyi lagi; mendekat saja tidak berbunyi', () => {
  const p = new PemicuSentuh();
  const h = jalankanSentuh(p, [sentuh(0), sentuh(1), sentuh(1), sentuh(0), sentuh(0), sentuh(0), sentuh(1)]);
  assert.equal(h.length, 2);
  const dekat = jalankanSentuh(new PemicuSentuh(), [sentuh(0), sentuh(2, 0.09), sentuh(2, 0.09)]);
  assert.equal(dekat.length, 0);
});

test('sentuh: jari yang sedang didekati dilaporkan (untuk menahan petikan tekuk)', () => {
  const p = new PemicuSentuh();
  p.perbarui(sentuh(3, 0.09), 4 / 3, 0);
  assert.equal(p.dekat, 3);
  p.perbarui(sentuh(0), 4 / 3, 66);
  assert.equal(p.dekat, null);
});

test('kombinasi: tengah + kelingking (berjarak) → pasangan', () => {
  const h = urut(komb(), [SANTAI, SANTAI, [0, 20, 80, 22, 80], [0, 20, 80, 22, 80], [0, 20, 80, 22, 80]]);
  assert.equal(h.length, 1);
  assert.deepEqual(h[0].pasangan, [2, 4]);
});

test('kombinasi: mengepal tidak memicu, kedipan telunjuk saat masih terkepal juga tidak', () => {
  const kepal = [80, 85, 85, 85, 85];
  const h = urut(komb(), [SANTAI, SANTAI, kepal, kepal, kepal, [80, 30, 85, 85, 85], [80, 30, 85, 85, 85], kepal, kepal]);
  assert.equal(h.length, 0);
});

test('kombinasi: petikan pelan tidak memicu; harus naik lagi sebelum bisa dipetik lagi', () => {
  const pelan = [];
  for (let i = 0; i <= 30; i++) pelan.push([0, 20 + i * 2, 22, 22, 0]); // 2 detik
  assert.equal(urut(komb(), pelan).length, 0);
  const p = komb();
  const h = urut(p, [SANTAI, SANTAI, [0, 80, 22, 22, 0], [0, 80, 22, 22, 0], [0, 70, 22, 22, 0], [0, 80, 22, 22, 0], [0, 80, 22, 22, 0]]);
  assert.equal(h.length, 1);
  const h2 = urut(p, [SANTAI, SANTAI, [0, 80, 22, 22, 0], [0, 80, 22, 22, 0]], 1000);
  assert.equal(h2.length, 1);
});

// ── PemicuBentuk (mode bawaan: kepalan = diam, jari dikeluarkan = akor) ──
const KEPAL = [90, 85, 85, 85, 85];
/** Tekukan untuk bentuk: jari dalam `keluar` lurus, sisanya terlipat. */
const bentukTk = (keluar) => KEPAL.map((x, i) => (keluar.includes(i) ? 0 : x));
const bentuk = (p, daftar, mulai = 0) => urut(p, daftar, mulai).map((h) => ({ ...h, kunci: h.bentuk.join('-') }));

test('bentuk: kepal → ✌️ berbunyi sekali; ditahan tidak berulang', () => {
  const h = bentuk(new PemicuBentuk(), [KEPAL, KEPAL, bentukTk([1, 2]), bentukTk([1, 2]), bentukTk([1, 2]), bentukTk([1, 2])]);
  assert.equal(h.length, 1);
  assert.equal(h[0].kunci, '1-2');
});

test('bentuk: membuka ✌️ dengan jari tengah menyusul tidak sempat terbaca ☝️', () => {
  const h = bentuk(new PemicuBentuk(), [KEPAL, KEPAL, [90, 0, 45, 85, 85], [90, 0, 0, 85, 85], [90, 0, 0, 85, 85], [90, 0, 0, 85, 85]]);
  assert.deepEqual(h.map((x) => x.kunci), ['1-2']);
});

test('bentuk: ganti bentuk langsung = ganti akor; kepal lalu bentuk sama = petik ulang', () => {
  const h = bentuk(new PemicuBentuk(), [KEPAL, KEPAL, bentukTk([1]), bentukTk([1]), bentukTk([1, 2]), bentukTk([1, 2]), bentukTk([1, 2]),
    KEPAL, KEPAL, bentukTk([1, 2]), bentukTk([1, 2])]);
  assert.deepEqual(h.map((x) => x.kunci), ['1', '1-2', '1-2']);
});

test('bentuk: jari setengah tertekuk (tidak jelas) tidak berbunyi', () => {
  const h = bentuk(new PemicuBentuk(), [KEPAL, KEPAL, [90, 0, 25, 85, 85], [90, 0, 25, 85, 85], [90, 0, 25, 85, 85]]);
  assert.equal(h.length, 0);
});

test('bentuk: ke-15 bentuk peta terbaca dengan benar dari tangan sintetis', async () => {
  const { BENTUK, NAMA_BARIS } = await import('../public/js/teori.js');
  for (const baris of NAMA_BARIS) for (const j of BENTUK[baris]) {
    const h = bentuk(new PemicuBentuk(), [KEPAL, KEPAL, bentukTk(j), bentukTk(j), bentukTk(j)]);
    assert.deepEqual(h.map((x) => x.kunci), [j.join('-')], `bentuk ${j}`);
  }
});
