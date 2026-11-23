import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bacaAkor, petakanAkor, pilihKunci, bacaSheet, barisAkor, LAGU } from '../public/js/lagu.js';

test('bacaAkor: akar, kres/mol, jenis', () => {
  assert.deepEqual({ ...bacaAkor('C'), asli: undefined }, { akar: 0, kualitas: 'mayor', tepat: true, asli: undefined, bas: null });
  assert.equal(bacaAkor('F#m').akar, 6);
  assert.equal(bacaAkor('F#m').kualitas, 'minor');
  assert.equal(bacaAkor('Bb').akar, 10);
  assert.equal(bacaAkor('Cb').akar, 11);
  assert.equal(bacaAkor('G7').kualitas, 'dom7');
  assert.equal(bacaAkor('Dsus4').kualitas, 'sus4');
  assert.equal(bacaAkor('Dsus').kualitas, 'sus4');
  assert.equal(bacaAkor('Cmaj7').kualitas, 'maj7');
  assert.equal(bacaAkor('Am7').kualitas, 'm7');
  assert.equal(bacaAkor('Cadd9').kualitas, 'add9');
});

test('bacaAkor: jenis di luar jangkauan didekati dan ditandai tidak tepat', () => {
  assert.deepEqual([bacaAkor('G9').kualitas, bacaAkor('G9').tepat], ['dom7', false]);
  assert.deepEqual([bacaAkor('Bdim').kualitas, bacaAkor('Bdim').tepat], ['minor', false]);
  assert.equal(bacaAkor('G/B').tepat, true); // akor slash: bas disimpan & dimainkan
  assert.equal(bacaAkor('G/B').bas, 11);
  assert.equal(bacaAkor('G').bas, null);
  assert.equal(bacaAkor('G/B').akar, 7);
});

test('bacaAkor: bukan akor → null', () => {
  for (const t of ['Hello', 'Cxyz', 'H', '', 'verse']) assert.equal(bacaAkor(t), null, t);
});

test('petakanAkor di kunci C', () => {
  assert.deepEqual(petakanAkor(bacaAkor('C'), 0), { baris: 'tengah', jari: 0, kiri: null, tepat: true, main: 'C', bas: null });
  assert.deepEqual(petakanAkor(bacaAkor('Am'), 0), { baris: 'tengah', jari: 3, kiri: null, tepat: true, main: 'Am', bas: null });
  assert.deepEqual(petakanAkor(bacaAkor('G7'), 0), { baris: 'tengah', jari: 2, kiri: 2, tepat: true, main: 'G7', bas: null });
  assert.deepEqual(petakanAkor(bacaAkor('Dm7'), 0), { baris: 'tengah', jari: 4, kiri: 4, tepat: true, main: 'Dm7', bas: null });
  assert.deepEqual(petakanAkor(bacaAkor('A'), 0), { baris: 'tengah', jari: 3, kiri: 0, tepat: true, main: 'A', bas: null });
  assert.deepEqual(petakanAkor(bacaAkor('Em'), 0), { baris: 'atas', jari: 0, kiri: null, tepat: true, main: 'Em', bas: null });
  assert.deepEqual(petakanAkor(bacaAkor('Bb'), 0), { baris: 'atas', jari: 1, kiri: null, tepat: true, main: 'Bb', bas: null });
  assert.deepEqual(petakanAkor(bacaAkor('F#m'), 0), { baris: 'bawah', jari: 1, kiri: null, tepat: true, main: 'F#m', bas: null });
  assert.deepEqual(petakanAkor(bacaAkor('E7'), 0), { baris: 'atas', jari: 0, kiri: 2, tepat: true, main: 'E7', bas: null });
  const cm7 = petakanAkor(bacaAkor('Cm7'), 0);
  assert.equal(cm7.tepat, false);
  assert.equal(cm7.main, 'Cm');
});

test('pilihKunci: lagu G C D Em Am → kunci G', () => {
  assert.equal(pilihKunci(['G', 'C', 'D', 'Em', 'Am', 'D7'].map(bacaAkor)), 7);
});

test('pilihKunci: lagu F Bb C Dm → kunci F', () => {
  assert.equal(pilihKunci(['F', 'Bb', 'C7', 'Dm', 'Gm'].map(bacaAkor)), 5);
});

test('barisAkor membedakan baris akor dan lirik', () => {
  assert.equal(barisAkor('C       G       Am      F'), true);
  assert.equal(barisAkor('| C | G | Am | F |'), true);
  assert.equal(barisAkor('Di sini ada kata biasa'), false);
  assert.equal(barisAkor('A long day'), false);
  assert.equal(barisAkor('   '), false);
});

test('bacaSheet: format akor di atas lirik (teks contoh buatan sendiri)', () => {
  const s = bacaSheet('[Verse]\nC         G\nangin pagi datang\nAm        F\nlangit pun terang\n');
  assert.deepEqual(s.urutan.map((a) => a.teks), ['C', 'G', 'Am', 'F']);
  assert.equal(s.baris[0].jenis, 'bagian');
  assert.equal(s.baris[1].jenis, 'akor');
  assert.equal(s.baris[1].akor[1].posisi, 10);
  assert.equal(s.baris[2].jenis, 'teks');
});

test('bacaSheet: ChordPro inline', () => {
  const s = bacaSheet('[C]satu dua [G7]tiga empat');
  assert.deepEqual(s.urutan.map((a) => a.teks), ['C', 'G7']);
  assert.equal(s.baris[1].isi, 'satu dua tiga empat');
  assert.equal(s.baris[0].akor[1].posisi, 9);
});

test('bacaSheet: bar dan simbol pengulangan diabaikan', () => {
  const s = bacaSheet('Intro:\n| C | F C | G | x2');
  assert.deepEqual(s.urutan.map((a) => a.teks), ['C', 'F', 'C', 'G']);
  assert.equal(s.baris[0].jenis, 'bagian');
});

test('semua lagu bawaan bisa dimainkan penuh di kunci pilihannya', () => {
  for (const l of LAGU) {
    const { urutan } = bacaSheet(l.sheet);
    assert.ok(urutan.length >= 8, l.judul);
    const k = pilihKunci(urutan.map((a) => a.akor));
    for (const a of urutan) assert.ok(petakanAkor(a.akor, k), `${l.judul}: ${a.teks} di kunci ${k}`);
  }
});

test('setiap akor mayor & minor di 12 akar bisa dimainkan di kunci mana pun', () => {
  const nama = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
  for (let k = 0; k < 12; k++) {
    for (const n of nama) {
      for (const jenis of ['', 'm', '7', 'maj7', 'm7', 'sus4']) {
        const p = petakanAkor(bacaAkor(n + jenis), k);
        assert.ok(p, `${n}${jenis} di kunci ${k}`);
      }
    }
  }
});

test('kunci G: lagu dengan F dan C# tidak ada lagi yang dicoret', () => {
  const urutan = bacaSheet('| G | F | C | C#m | D |').urutan;
  const k = pilihKunci(urutan.map((a) => a.akor));
  assert.ok(urutan.every((a) => petakanAkor(a.akor, k)));
});

import { bacaInfoSheet } from '../public/js/lagu.js';

test('bacaInfoSheet: header gaya situs tab gitar', () => {
  const i = bacaInfoSheet('Tuning: E A D G B E\nCapo: 3rd fret\nKey: Bb\n\n[Verse]\nG  Em');
  assert.deepEqual(i, { capo: 3, tuning: 'standar', kunci: 10, minor: false });
});

test('bacaInfoSheet: variasi capo, tuning, key minor', () => {
  assert.equal(bacaInfoSheet('Capo 2').capo, 2);
  assert.equal(bacaInfoSheet('capo on fret 5').capo, 5);
  assert.equal(bacaInfoSheet('No capo').capo, 0);
  assert.equal(bacaInfoSheet('Tuning: Eb Ab Db Gb Bb Eb').tuning, 'turun-setengah');
  assert.equal(bacaInfoSheet('Tuning: D A D G B E').tuning, 'drop-d');
  assert.equal(bacaInfoSheet('Tuning: Half Step Down').tuning, 'turun-setengah');
  assert.equal(bacaInfoSheet('Tuning: C G C F A D').tuning, null); // tidak dikenali → dibiarkan
  assert.deepEqual([bacaInfoSheet('Key: F#m').kunci, bacaInfoSheet('Key: F#m').minor], [6, true]);
  assert.equal(bacaInfoSheet('Key: Cmaj').minor, false);
});

test('bacaInfoSheet: sheet tanpa header → semua null', () => {
  assert.deepEqual(bacaInfoSheet('| C | G | Am | F |'), { capo: null, tuning: null, kunci: null, minor: false });
});

test('baris header tidak terbaca sebagai akor', () => {
  const s = bacaSheet('Tuning: E A D G B E\nCapo: 3rd fret\nKey: Bb\n| G | C |');
  assert.deepEqual(s.urutan.map((a) => a.teks), ['G', 'C']);
});

import { ejaanSheet } from '../public/js/lagu.js';

test('ejaanSheet mendeteksi kres/mol dari akor sheet (termasuk bas slash)', () => {
  assert.equal(ejaanSheet(bacaSheet('C# A#m D#m G# C#/C').urutan), 'kres');
  assert.equal(ejaanSheet(bacaSheet('Db Bbm Ebm Ab').urutan), 'mol');
  assert.equal(ejaanSheet(bacaSheet('C G Am F').urutan), null);
  assert.equal(ejaanSheet(bacaSheet('Bb F C').urutan), 'mol'); // "b" pada nama akar, bukan huruf B
});

import { akhirBaris } from '../public/js/lagu.js';

test('akhir kalimat: akor terakhir tiap baris sheet (tanpa membaca isi lirik)', () => {
  const s = bacaSheet('[Verse]\nC      G\nbaris satu\nAm     F    G\nbaris dua\n[Dm7]kata [G7]kata');
  assert.deepEqual(s.urutan.map((a) => a.teks), ['C', 'G', 'Am', 'F', 'G', 'Dm7', 'G7']);
  assert.deepEqual(akhirBaris(s.urutan), [false, true, false, false, true, false, true]);
});

import { POLA, POLA_PIANO, ISIAN_TUNGGAL, GENRE_ISIAN, ISIAN_GITAR_TUNGGAL, GENRE_ISIAN_GITAR } from '../public/js/pola.js';

test('lagu rohani domain publik: ≥9 lagu, akor saja, saran iringan valid', () => {
  const rohani = LAGU.filter((l) => l.kategori === 'rohani');
  assert.ok(rohani.length >= 9, rohani.map((l) => l.judul).join(', '));
  const idPola = new Set(POLA.map((p) => p.id)), idPolaPiano = new Set(POLA_PIANO.map((p) => p.id));
  const idIsianPiano = new Set([...ISIAN_TUNGGAL.flatMap((g) => g.daftar.map((x) => x.id)), ...GENRE_ISIAN.map((x) => x.id)]);
  const idIsianGitar = new Set([...ISIAN_GITAR_TUNGGAL.flatMap((g) => g.daftar.map((x) => x.id)), ...GENRE_ISIAN_GITAR.map((x) => x.id)]);
  for (const l of rohani) {
    assert.match(l.asal, /domain publik/, l.judul);
    // akor saja: setiap baris non-bagian adalah baris akor (tidak ada lirik)
    const { baris } = bacaSheet(l.sheet);
    assert.ok(baris.every((b) => b.jenis !== 'teks' || !b.isi.trim()), `${l.judul} memuat teks`);
    const s = l.saran;
    assert.ok(s.tempo >= 50 && s.tempo <= 140, l.judul);
    assert.ok(idPolaPiano.has(s.polaPiano), `${l.judul}: ${s.polaPiano}`);
    assert.ok(idPola.has(s.polaGitar), `${l.judul}: ${s.polaGitar}`);
    assert.ok(idIsianPiano.has(s.isianPiano), `${l.judul}: ${s.isianPiano}`);
    assert.ok(idIsianGitar.has(s.isianGitar), `${l.judul}: ${s.isianGitar}`);
    // birama 3/4 → gaya iringan 3/4
    assert.equal(s.ketukPerAkor, Number(l.birama[0]), `${l.judul}: ketuk per akor = birama`);
    if (l.birama === '3/4') {
      assert.equal(POLA_PIANO.find((p) => p.id === s.polaPiano).birama, 3, l.judul);
      assert.equal(POLA.find((p) => p.id === s.polaGitar).birama, 3, l.judul);
    }
  }
});

test('bacaAkor: penulisan akhiran ala situs lain (Maj7, Min, Sus4, kurung)', () => {
  for (const t of ['FMaj7', 'FMAJ7', 'Fmaj7', 'FM7', 'C(maj7)', 'FMaj7/A']) assert.equal(bacaAkor(t).kualitas, 'maj7', t);
  assert.equal(bacaAkor('FMaj7').tepat, true);
  assert.equal(bacaAkor('Fm7').kualitas, 'm7');
  assert.equal(bacaAkor('Cmin7').kualitas, 'm7');
  assert.equal(bacaAkor('Cmin').kualitas, 'minor');
  assert.equal(bacaAkor('CMaj').kualitas, 'mayor');
  assert.equal(bacaAkor('DSus4').kualitas, 'sus4');
  assert.equal(bacaAkor('Cadd2').kualitas, 'add9');
  assert.equal(bacaAkor('Am(add9)').kualitas, 'madd9');
  assert.equal(bacaAkor('Cm(maj7)').kualitas, 'minor');
  assert.equal(bacaAkor('G7b9').kualitas, 'dom7');
  assert.ok(barisAkor('FMaj7       G          C'));
});
