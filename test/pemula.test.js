import { test } from 'node:test';
import assert from 'node:assert/strict';
import { URUTAN_SLOT, susunPemula } from '../public/js/pemula.js';

/** Item target yang bisa dimainkan (posisi asal sembarang tapi tetap). */
function akor(label, akar, kualitas, lain = {}) {
  return { label, main: label, baris: 'atas', jari: 2, kiri: 3, bas: null, tepat: true, akar, kualitas, ...lain };
}
const C = () => akor('C', 0, 'mayor', { baris: 'tengah', jari: 0, kiri: null });
const G = () => akor('G', 7, 'mayor', { baris: 'tengah', jari: 4, kiri: null });
const Am = () => akor('Am', 9, 'minor', { baris: 'bawah', jari: 1, kiri: 2 });
const F = () => akor('F', 5, 'mayor', { baris: 'atas', jari: 3, kiri: null });

test('URUTAN_SLOT: 15 pad, tengah lalu atas lalu bawah', () => {
  assert.equal(URUTAN_SLOT.length, 15);
  assert.deepEqual(URUTAN_SLOT.slice(0, 5), [0, 1, 2, 3, 4].map((j) => ['tengah', j]));
  assert.deepEqual(URUTAN_SLOT.slice(5, 10), [0, 1, 2, 3, 4].map((j) => ['atas', j]));
  assert.deepEqual(URUTAN_SLOT.slice(10), [0, 1, 2, 3, 4].map((j) => ['bawah', j]));
});

test('urut menurut frekuensi, seri → kemunculan pertama', () => {
  // G 3x, Am 2x, C 2x (C muncul lebih awal dari Am), F 1x
  const { slot, penuh } = susunPemula([C(), G(), Am(), G(), C(), F(), Am(), G()]);
  assert.deepEqual(Object.keys(slot).sort(), ['tengah:0', 'tengah:1', 'tengah:2', 'tengah:3']);
  assert.equal(slot['tengah:0'].nama, 'G');
  assert.equal(slot['tengah:0'].jumlah, 3);
  assert.equal(slot['tengah:1'].nama, 'C');
  assert.equal(slot['tengah:2'].nama, 'Am');
  assert.equal(slot['tengah:3'].nama, 'F');
  assert.equal(slot['tengah:3'].jumlah, 1);
  assert.equal(penuh, 0);
});

test('isi slot diambil dari kemunculan pertama', () => {
  const pertama = akor('Am', 9, 'minor', { main: 'Am', label: 'Am', baris: 'bawah', jari: 1, kiri: 2, tepat: false });
  const kedua = akor('Am', 9, 'minor', { label: 'Am(lain)', baris: 'atas', jari: 4, kiri: 0 });
  const { slot } = susunPemula([pertama, kedua]);
  assert.deepEqual(slot['tengah:0'], {
    sumber: { baris: 'bawah', jari: 1, kiri: 2 },
    nama: 'Am',
    label: 'Am',
    akar: 9,
    kualitas: 'minor',
    bas: null,
    tepat: false,
    jumlah: 2,
  });
});

test('target dipetakan ke pad: kiri null, sumber disimpan', () => {
  const { target } = susunPemula([C(), Am(), Am()]);
  assert.equal(target.length, 3);
  assert.equal(target[0].baris, 'tengah');
  assert.equal(target[0].jari, 1);
  assert.equal(target[0].kiri, null);
  assert.deepEqual(target[0].sumber, { baris: 'tengah', jari: 0, kiri: null });
  assert.equal(target[1].jari, 0);
  assert.equal(target[1].kiri, null);
  assert.deepEqual(target[1].sumber, { baris: 'bawah', jari: 1, kiri: 2 });
  assert.equal(target[1].label, 'Am');
  assert.equal(target[1].akar, 9);
});

test('akor tak bisa dimainkan diteruskan apa adanya (salinan)', () => {
  const x = { label: 'Xyz', jari: null };
  const { target, slot } = susunPemula([x, C()]);
  assert.deepEqual(target[0], x);
  assert.notEqual(target[0], x);
  assert.equal(target[1].jari, 0);
  assert.deepEqual(Object.keys(slot), ['tengah:0']);
});

test('bas membedakan akor: C dan C/G terpisah', () => {
  const CG = akor('C/G', 0, 'mayor', { bas: 7 });
  const { slot, target } = susunPemula([C(), CG, akor('C', 0, 'mayor', { bas: 0 })]);
  // C (bas null) dan C (bas 0) sama; C/G beda
  assert.equal(slot['tengah:0'].nama, 'C');
  assert.equal(slot['tengah:0'].jumlah, 2);
  assert.equal(slot['tengah:0'].bas, null);
  assert.equal(slot['tengah:1'].nama, 'C/G');
  assert.equal(slot['tengah:1'].bas, 7);
  assert.deepEqual(target.map((t) => t.jari), [0, 1, 0]);
});

/** 15 akor berbeda (12 mayor + 3 minor), masing-masing muncul 2x supaya mengisi semua pad. */
function limaBelas() {
  const nama = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const mayor = nama.map((n, i) => akor(n, i, 'mayor'));
  const minor = [0, 1, 2].map((i) => akor(`${nama[i]}m`, i, 'minor'));
  const semua = [...mayor, ...minor];
  return [...semua, ...semua.map((t) => ({ ...t }))];
}

test('lebih dari 15 akor: numpang ke akar+kualitas sama, sisanya penuh', () => {
  const CG = akor('C/G', 0, 'mayor', { bas: 7 }); // numpang ke pad C
  const F7 = akor('F7', 5, 'dom7'); // tidak ada pad F dom7 → penuh
  const Dm7 = akor('Dm7', 2, 'm7'); // penuh juga
  const input = [...limaBelas(), CG, F7, Dm7, F7];
  const { slot, target, penuh } = susunPemula(input);

  assert.equal(Object.keys(slot).length, 15);
  assert.equal(slot['tengah:0'].nama, 'C');
  assert.equal(slot['bawah:4'].nama, 'Dm');
  assert.equal(penuh, 2);

  const [tCG, tF7, tDm7, tF7b] = target.slice(30);
  assert.equal(tCG.baris, 'tengah');
  assert.equal(tCG.jari, 0);
  assert.equal(tCG.kiri, null);
  assert.equal(tCG.label, 'C/G');
  assert.deepEqual(tCG.sumber, { baris: 'atas', jari: 2, kiri: 3 });

  for (const t of [tF7, tDm7, tF7b]) {
    assert.equal(t.jari, null);
    assert.equal(t.penuh, true);
  }
  assert.equal(tF7.label, 'F7');
  assert.equal(tF7.baris, 'atas'); // posisi lain tidak diubah
});

test('tidak memutasi input', () => {
  const input = [C(), Am(), { label: '?', jari: null }, ...limaBelas(), akor('F7', 5, 'dom7')];
  const salinan = structuredClone(input);
  const { target } = susunPemula(input);
  assert.deepEqual(input, salinan);
  target.forEach((t, i) => assert.notEqual(t, input[i]));
});

test('input kosong', () => {
  assert.deepEqual(susunPemula([]), { slot: {}, target: [], penuh: 0 });
});
