import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bentukGitar, nadaBentuk } from '../public/js/diagram.js';
import { akorUntuk, KUALITAS } from '../public/js/teori.js';

/** Akor dengan akar & kualitas tertentu (memakai teori.js agar pcs konsisten). */
function akor(akar, kualitas) {
  const { interval } = KUALITAS[kualitas];
  return { akar, kualitas, pcs: interval.map((x) => (akar + x) % 12) };
}
const fmt = (fret) => fret.map((f) => (f < 0 ? 'x' : f)).join('');

test('bentuk akor terbuka umum', () => {
  assert.equal(fmt(bentukGitar(akor(0, 'mayor')).fret), 'x32010'); // C
  assert.equal(fmt(bentukGitar(akor(7, 'mayor')).fret), '320003'); // G
  assert.equal(fmt(bentukGitar(akor(2, 'mayor')).fret), 'xx0232'); // D
  assert.equal(fmt(bentukGitar(akor(9, 'minor')).fret), 'x02210'); // Am
  assert.equal(fmt(bentukGitar(akor(4, 'minor')).fret), '022000'); // Em
  assert.equal(fmt(bentukGitar(akor(4, 'dom7')).fret), '020100'); // E7
  assert.equal(fmt(bentukGitar(akor(7, 'dom7')).fret), '320001'); // G7
});

test('bentuk barre', () => {
  const F = bentukGitar(akor(5, 'mayor'));
  assert.equal(fmt(F.fret), '133211');
  assert.deepEqual(F.barre, { fret: 1, dari: 0, ke: 5 });
  assert.equal(fmt(bentukGitar(akor(11, 'minor')).fret), 'x24432'); // Bm
  assert.equal(fmt(bentukGitar(akor(6, 'minor')).fret), '244222'); // F#m
  assert.equal(fmt(bentukGitar(akor(1, 'minor')).fret), 'x46654'); // C#m
  assert.equal(fmt(bentukGitar(akor(10, 'mayor')).fret), 'x13331'); // Bb
});

test('semua akar × jenis: setiap senar berbunyi = nada akor, akar paling bawah, bisa dijangkau tangan', () => {
  for (let akar = 0; akar < 12; akar++) {
    for (const kualitas of ['mayor', 'minor', 'dom7', 'maj7', 'm7', 'sus4', 'add9', 'madd9']) {
      const a = akor(akar, kualitas);
      const b = bentukGitar(a);
      const nada = nadaBentuk(b.fret);
      const nama = `${akar}:${kualitas} ${fmt(b.fret)}`;
      assert.ok(nada.length >= 4, nama);
      assert.ok(nada.every((m) => a.pcs.includes(m % 12)), `${nama}: ada nada di luar akor`);
      assert.equal(Math.min(...nada) % 12, akar, `${nama}: bas bukan akar`);
      // nada khas (terts / sus / septim) harus ada
      const khas = KUALITAS[kualitas].interval.filter((x) => x !== 0 && x !== 7).map((x) => (akar + x) % 12);
      for (const pc of khas) assert.ok(nada.some((m) => m % 12 === pc), `${nama}: tanpa nada khas ${pc}`);
      const ditekan = b.fret.filter((f) => f > 0);
      if (ditekan.length) assert.ok(Math.max(...ditekan) - Math.min(...ditekan) <= 4, `${nama}: rentang fret terlalu lebar`);
      assert.ok(Math.max(...b.fret) <= 14, nama);
    }
  }
});

test('nomor jari: barre = telunjuk, lainnya 2–4, senar terbuka/tidak dibunyikan tanpa nomor', () => {
  const F = bentukGitar(akor(5, 'mayor')); // 133211
  assert.deepEqual(F.jari, [1, 3, 4, 2, 1, 1]);
  const C = bentukGitar(akor(0, 'mayor')); // x32010
  assert.deepEqual(C.jari, [null, 3, 2, null, 1, null]);
});

test('fret awal diagram: akor rendah dari fret 1, barre tinggi dari fret barre', () => {
  assert.equal(bentukGitar(akor(0, 'mayor')).mulai, 1);
  assert.equal(bentukGitar(akor(2, 'minor')).mulai, 1); // Dm terbuka
  assert.ok(bentukGitar(akor(4, 'dom7')).mulai === 1);
  const Bb7 = bentukGitar(akor(3, 'mayor')); // Eb: x 6 8 8 8 6 (A-shape r=6) atau E-shape r=11
  assert.ok(Bb7.mulai >= 5);
});

test('dipakai dengan akorUntuk dari teori.js', () => {
  const G7 = akorUntuk(2, 0, 2); // G7 di kunci C
  assert.equal(fmt(bentukGitar(G7).fret), '320001');
});
