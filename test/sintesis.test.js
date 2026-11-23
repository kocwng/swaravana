import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampelGitar, sampelPiano, impulsReverb, perkiraanFrekuensi } from '../public/js/sintesis.js';
import { frekuensi } from '../public/js/teori.js';

const SR = 44100;
const sen = (f, ref) => 1200 * Math.log2(f / ref);

test('gitar: nada tepat (±10 sen) dari E2 sampai G4 berkat delay fraksional', () => {
  for (const midi of [40, 45, 52, 57, 60, 64, 67]) {
    const f = frekuensi(midi);
    const y = sampelGitar(f, SR);
    const terukur = perkiraanFrekuensi(y, SR);
    assert.ok(Math.abs(sen(terukur, f)) < 10, `midi ${midi}: ${terukur.toFixed(2)} vs ${f.toFixed(2)}`);
  }
});

test('gitar: bunyi meluruh (akhir jauh lebih pelan dari awal) dan tanpa NaN', () => {
  const y = sampelGitar(frekuensi(52), SR);
  const rms = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += y[i] * y[i]; return Math.sqrt(s / (b - a)); };
  assert.ok(y.every(Number.isFinite));
  assert.ok(rms(0, 4410) > 5 * rms(y.length - 8820, y.length - 4410));
  assert.ok(y.reduce((m, v) => Math.max(m, Math.abs(v)), 0) <= 0.9001);
});

test('piano: nada dasar tepat dan deterministik', () => {
  const f = frekuensi(60);
  const a = sampelPiano(f, SR), b = sampelPiano(f, SR);
  assert.deepEqual(a.slice(0, 100), b.slice(0, 100));
  assert.ok(Math.abs(sen(perkiraanFrekuensi(a, SR), f)) < 10);
  assert.ok(a.every(Number.isFinite));
});

test('piano: nada tinggi tidak melampaui Nyquist (tanpa aliasing NaN)', () => {
  const y = sampelPiano(frekuensi(96), SR);
  assert.ok(y.every(Number.isFinite));
});

test('pembuatan sampel cukup cepat untuk dipanaskan di awal (< 60 ms/nada)', () => {
  const t0 = performance.now();
  for (const m of [48, 52, 55, 60, 64, 67]) { sampelGitar(frekuensi(m), SR); sampelPiano(frekuensi(m), SR); }
  assert.ok((performance.now() - t0) / 12 < 60);
});

test('impuls reverb stereo meluruh', () => {
  const [l, r] = impulsReverb(SR);
  assert.equal(l.length, r.length);
  assert.ok(Math.abs(l[100]) + Math.abs(l[200]) > Math.abs(l[l.length - 10]) + Math.abs(l[l.length - 20]));
});

/** Ukuran kecerahan: energi selisih antar-sampel / energi sinyal (makin besar = makin banyak nada tinggi). */
function kecerahan(y, sr, detik = 0.3) {
  const n = Math.floor(sr * detik);
  let ed = 0, e = 0;
  for (let i = 1; i < n; i++) { ed += (y[i] - y[i - 1]) ** 2; e += y[i] * y[i]; }
  return ed / e;
}

test('gitar senar baja juga tepat nada (±10 sen)', () => {
  for (const midi of [40, 52, 60, 67]) {
    const f = frekuensi(midi);
    const terukur = perkiraanFrekuensi(sampelGitar(f, SR, { jenis: 'baja' }), SR);
    assert.ok(Math.abs(sen(terukur, f)) < 10, `midi ${midi}: ${terukur.toFixed(2)}`);
  }
});

test('petikan lembut tetap tepat nada', () => {
  const f = frekuensi(55);
  assert.ok(Math.abs(sen(perkiraanFrekuensi(sampelGitar(f, SR, { lembut: true }), SR), f)) < 10);
});

test('warna: lembut lebih gelap dari keras; nilon lebih gelap dari senar baja', () => {
  const f = frekuensi(52);
  const keras = kecerahan(sampelGitar(f, SR), SR);
  const lembut = kecerahan(sampelGitar(f, SR, { lembut: true }), SR);
  const baja = kecerahan(sampelGitar(f, SR, { jenis: 'baja' }), SR);
  assert.ok(lembut < keras * 0.85, `lembut ${lembut} vs keras ${keras}`);
  assert.ok(keras < baja * 0.85, `nilon ${keras} vs baja ${baja}`);
});

test('serangan lembut tidak meledak di sampel pertama (tanpa klik)', () => {
  const y = sampelGitar(frekuensi(48), SR, { lembut: true });
  const awal = Math.max(...Array.from(y.slice(0, 40), Math.abs));
  const puncak = y.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(awal < puncak * 0.5);
});

test('senar bergaung panjang: masih terdengar setelah 1,5 detik', () => {
  const y = sampelGitar(frekuensi(45), SR);
  const rms = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += y[i] * y[i]; return Math.sqrt(s / (b - a)); };
  const r0 = rms(2205, 6615), r15 = rms(SR * 1.5, SR * 1.6);
  assert.ok(r15 > r0 * 0.05, `1,5 dtk ${(20 * Math.log10(r15 / r0)).toFixed(1)} dB`);
});
