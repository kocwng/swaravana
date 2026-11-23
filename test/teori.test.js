import { test } from 'node:test';
import assert from 'node:assert/strict';
import { akorUntuk, kualitasDariKiri, voicingGitar, batasAtasGitar, voicingPiano, frekuensi, namaNada, PROGRESI, KUALITAS } from '../public/js/teori.js';

const nama = (kunci, kiri = null) => [0, 1, 2, 3, 4].map((j) => akorUntuk(j, kunci, kiri).nama);

test('kunci C tanpa tangan kiri: C F G Am Dm', () => {
  assert.deepEqual(nama(0), ['C', 'F', 'G', 'Am', 'Dm']);
});

test('kunci G: G C D Em Am', () => {
  assert.deepEqual(nama(7), ['G', 'C', 'D', 'Em', 'Am']);
});

test('kunci F memakai mol: F Bb C Dm Gm', () => {
  assert.deepEqual(nama(5), ['F', 'Bb', 'C', 'Dm', 'Gm']);
});

test('tangan kiri mengubah jenis akor', () => {
  assert.equal(akorUntuk(3, 0, 0).nama, 'A'); // kepalan = mayor
  assert.equal(akorUntuk(0, 0, 1).nama, 'Cm'); // 1 jari = minor
  assert.equal(akorUntuk(2, 0, 2).nama, 'G7');
  assert.equal(akorUntuk(0, 0, 3).nama, 'Csus4');
  assert.equal(akorUntuk(0, 0, 4).nama, 'Cmaj7');
  assert.equal(akorUntuk(3, 0, 4).nama, 'Am7'); // akar minor → m7
  assert.equal(akorUntuk(0, 0, 5).nama, 'Cadd9');
  assert.equal(akorUntuk(4, 0, 5).nama, 'Dmadd9');
});

test('kualitasDariKiri: null/di luar 0..5 = kualitas asli', () => {
  assert.equal(kualitasDariKiri(null, 'minor'), 'minor');
  assert.equal(kualitasDariKiri(7, 'mayor'), 'mayor');
});

test('pitch class akor benar (G7 = G B D F)', () => {
  assert.deepEqual(akorUntuk(2, 0, 2).pcs, [7, 11, 2, 5]);
});

test('voicing gitar C mirip akor terbuka: C3 E3 G3 C4 E4 G4', () => {
  assert.deepEqual(voicingGitar(akorUntuk(0, 0)), [48, 52, 55, 60, 64, 67]);
});

test('voicing gitar: bas = akar di E2–D#3, naik, semua nada anggota akor, dalam batas atas', () => {
  for (let kunci = 0; kunci < 12; kunci++) {
    for (let j = 0; j < 5; j++) {
      for (const kiri of [null, 0, 1, 2, 3, 4, 5]) {
        const a = akorUntuk(j, kunci, kiri);
        const v = voicingGitar(a);
        assert.ok(v[0] >= 40 && v[0] <= 51, `bas ${a.nama}`);
        assert.equal(v[0] % 12, a.akar);
        assert.ok(v.length >= 4, `${a.nama} minimal 4 senar`);
        for (let i = 1; i < v.length; i++) assert.ok(v[i] - v[i - 1] >= 3);
        assert.ok(v.every((m) => a.pcs.includes(m % 12) && m <= batasAtasGitar(v[0])));
      }
    }
  }
});

test('voicing gitar memuat semua nada khas (G7 punya F)', () => {
  const v = voicingGitar(akorUntuk(2, 0, 2));
  assert.ok(v.some((m) => m % 12 === 5));
});

test('voicing piano: bas satu oktaf di bawah, tanpa nada kembar', () => {
  for (let j = 0; j < 5; j++) {
    const a = akorUntuk(j, 0, 2);
    const v = voicingPiano(a);
    assert.equal(new Set(v).size, v.length);
    assert.equal(v[1] - v[0], 12);
    assert.ok(v[1] >= 55 && v[1] <= 66);
  }
});

test('frekuensi A4 = 440 Hz, C4 ≈ 261.63 Hz', () => {
  assert.equal(frekuensi(69), 440);
  assert.ok(Math.abs(frekuensi(60) - 261.63) < 0.01);
});

test('namaNada membungkus angka negatif', () => {
  assert.equal(namaNada(-1), 'B');
});

test('progresi latihan: jari 0..4, baris & jenis valid, nama unik', () => {
  assert.ok(PROGRESI.length >= 15);
  assert.equal(new Set(PROGRESI.map((p) => p.nama)).size, PROGRESI.length);
  for (const p of PROGRESI) {
    assert.ok(p.romawi && p.langkah.length >= 3, p.nama);
    for (const [j, kiri, baris = 'tengah'] of p.langkah) {
      assert.ok(j >= 0 && j <= 4);
      assert.ok(['atas', 'tengah', 'bawah'].includes(baris));
      assert.ok(KUALITAS[akorUntuk(j, 0, kiri, baris).kualitas]);
    }
  }
});

test('progresi di kunci C menghasilkan akor yang benar', () => {
  const di = (nama) => PROGRESI.find((p) => p.nama === nama).langkah.map(([j, k, b]) => akorUntuk(j, 0, k, b).nama).join(' ');
  assert.equal(di('Pop empat akor'), 'C G Am F');
  assert.equal(di('Pop sendu'), 'Am F C G');
  assert.equal(di('Kanon Pachelbel'), 'C G Am Em F C F G');
  assert.equal(di('Ala J-pop'), 'F G Em Am');
  assert.equal(di('Rock mixolydian'), 'C Bb F C');
  assert.equal(di('Flamenco'), 'Am G F E');
  assert.equal(di('Gospel'), 'C F Fm C');
  assert.equal(di('Turnaround jazz'), 'Cmaj7 Am7 Dm7 G7');
  assert.equal(di('Dominan sekunder'), 'C A Dm G');
});

import { BARIS, NAMA_BARIS, namaKunciLengkap } from '../public/js/teori.js';

const namaBaris = (kunci, baris) => [0, 1, 2, 3, 4].map((j) => akorUntuk(j, kunci, null, baris).nama);

test('tiga baris di kunci C', () => {
  assert.deepEqual(namaBaris(0, 'atas'), ['Em', 'Bb', 'Bm', 'Eb', 'Ab']);
  assert.deepEqual(namaBaris(0, 'tengah'), ['C', 'F', 'G', 'Am', 'Dm']);
  assert.deepEqual(namaBaris(0, 'bawah'), ['Db', 'F#m', 'D', 'E', 'A']);
});

test('gabungan tiga baris memuat ke-12 akar di setiap kunci', () => {
  for (let k = 0; k < 12; k++) {
    const akar = new Set(NAMA_BARIS.flatMap((b) => BARIS[b].map((_, j) => akorUntuk(j, k, null, b).akar)));
    assert.equal(akar.size, 12, `kunci ${k}`);
  }
});

test('kunci G: F (♭VII) tersedia di baris atas, F♯ & C♯ juga ada', () => {
  assert.equal(akorUntuk(1, 7, null, 'atas').nama, 'F');
  assert.equal(akorUntuk(2, 7, null, 'atas').nama, 'F#m');
  assert.equal(akorUntuk(1, 7, null, 'bawah').nama, 'C#m');
  assert.equal(akorUntuk(1, 7, 0, 'bawah').nama, 'C#'); // tangan kiri kepalan → mayor
});

test('ejaan: derajat ♭ pakai mol, ♯ pakai kres', () => {
  assert.equal(akorUntuk(3, 0, null, 'atas').nama, 'Eb'); // ♭III
  assert.equal(akorUntuk(1, 0, null, 'bawah').nama, 'F#m'); // ♯iv
});

test('nama kunci lengkap memuat dua ejaan untuk nada hitam', () => {
  assert.equal(namaKunciLengkap(0), 'C');
  assert.equal(namaKunciLengkap(1), 'C♯ / D♭');
  assert.equal(namaKunciLengkap(6), 'F♯ / G♭');
});

test('akor slash gitar: bas tertulis paling bawah, akar & nada akor tetap ada', () => {
  const kasus = [
    [akorUntuk(2, 0, null), 11], // G/B
    [akorUntuk(0, 7, null), 6], // G/F#
    [akorUntuk(2, 7, 2, 'atas'), 10], // F#7/A# di kunci G
    [akorUntuk(1, 0, null), 9], // F/A
  ];
  for (const [a, bas] of kasus) {
    const v = voicingGitar(a, bas);
    assert.equal(v[0] % 12, bas, a.nama);
    assert.ok(v[0] >= 40 && v[0] <= 51);
    assert.ok(v.slice(1).some((m) => m % 12 === a.akar), `${a.nama}/${bas} tanpa akar: ${v}`);
    assert.ok(v.slice(1).every((m) => a.pcs.includes(m % 12)));
    for (let i = 1; i < v.length; i++) assert.ok(v[i] > v[i - 1]);
  }
});

test('akor slash piano: bas tertulis di bawah akor', () => {
  const a = akorUntuk(2, 0, null); // G
  const v = voicingPiano(a, 11); // G/B
  assert.equal(v[0] % 12, 11);
  assert.ok(v[0] < v[1]);
  assert.ok(v[1] - v[0] <= 12);
  assert.deepEqual(voicingPiano(a), voicingPiano(a, a.akar));
});

import { TUNING, tuningDenganId, transposisi, namaTerdengar } from '../public/js/teori.js';

test('transposisi: capo naik, tuning turun', () => {
  assert.equal(transposisi(0, 'standar'), 0);
  assert.equal(transposisi(3, 'standar'), 3);
  assert.equal(transposisi(0, 'turun-setengah'), -1);
  assert.equal(transposisi(2, 'turun-satu'), 0);
  assert.equal(tuningDenganId('tidak-ada').id, 'standar');
});

test('bentuk G + capo 3 terdengar Bb; Em + capo 3 terdengar Gm', () => {
  assert.equal(namaTerdengar(akorUntuk(0, 7), 3, 7), 'Bb');
  assert.equal(namaTerdengar(akorUntuk(3, 7), 3, 7), 'Gm');
  assert.equal(namaTerdengar(akorUntuk(2, 7, 2), 3, 7), 'F7'); // D7 + 3 = F7
  assert.equal(namaTerdengar(akorUntuk(0, 7), 0, 7), 'G');
});

test('Drop D: bas akor D turun ke D2', () => {
  const D = akorUntuk(2, 7); // D di kunci G
  assert.equal(voicingGitar(D)[0], 50); // standar: D3
  assert.equal(voicingGitar(D, D.akar, 38)[0], 38); // drop D: D2
  assert.equal(voicingGitar(akorUntuk(0, 0), 0, 38)[0], 48); // C tetap C3 (≥ D2, C2 di bawah senar)
});

test('daftar tuning punya id unik dan 6 senar', () => {
  assert.equal(new Set(TUNING.map((t) => t.id)).size, TUNING.length);
  for (const t of TUNING) assert.equal(t.senar.split(' ').length, 6);
});

import { aturEjaan, ejaanAktif } from '../public/js/teori.js';

test('ejaan global: kres / mol / otomatis', () => {
  try {
    aturEjaan('kres');
    assert.deepEqual([0, 1, 2, 3, 4].map((j) => akorUntuk(j, 1).nama), ['C#', 'F#', 'G#', 'A#m', 'D#m']);
    assert.equal(akorUntuk(1, 0, null, 'atas').nama, 'A#'); // ♭VII di kunci C ikut kres
    aturEjaan('mol');
    assert.deepEqual([0, 1, 2, 3, 4].map((j) => akorUntuk(j, 1).nama), ['Db', 'Gb', 'Ab', 'Bbm', 'Ebm']);
    assert.equal(akorUntuk(1, 0, null, 'bawah').nama, 'Gbm'); // ♯iv ikut mol
    aturEjaan(null);
    assert.equal(ejaanAktif(), null);
    assert.equal(akorUntuk(0, 1).nama, 'Db'); // otomatis: kunci D♭ memakai mol
    assert.equal(akorUntuk(1, 0, null, 'atas').nama, 'Bb');
  } finally { aturEjaan(null); }
});

test('kombinasi jari: 15 posisi ↔ 15 gerakan unik (5 tunggal + 10 pasangan)', async () => {
  const { KOMBINASI, posisiKombinasi, jariKombinasi, teksKombinasi, BARIS, NAMA_BARIS } = await import('../public/js/teori.js');
  const kunci = new Set();
  for (const baris of NAMA_BARIS) {
    assert.equal(KOMBINASI[baris].length, BARIS[baris].length);
    KOMBINASI[baris].forEach((j, jari) => {
      kunci.add(j.join('-'));
      assert.deepEqual(posisiKombinasi([...j].reverse()), { baris, jari });
      assert.deepEqual(jariKombinasi(baris, jari), j);
    });
  }
  assert.equal(kunci.size, 15);
  // semua 12 nada kromatis terjangkau dari kunci C
  const pcs = new Set(NAMA_BARIS.flatMap((b) => BARIS[b].map((d) => d.semitone)));
  assert.equal(pcs.size, 12);
  assert.equal(teksKombinasi('atas', 1), 'telunjuk + tengah');
  assert.equal(teksKombinasi('atas', 0), 'jempol sentuh telunjuk');
  assert.equal(teksKombinasi('bawah', 4), 'jempol sentuh manis');
  assert.equal(posisiKombinasi([0, 1]).baris, 'atas'); // jempol+telunjuk = iii (Em di C)
  assert.equal(posisiKombinasi([5, 6]), null);
});

test('bentuk jari: 15 posisi ↔ 15 bentuk unik, semua bernama, 12 nada tercakup', async () => {
  const { BENTUK, posisiBentuk, jariBentuk, teksBentuk, NAMA_BARIS, akorUntuk } = await import('../public/js/teori.js');
  const kunci = new Set();
  for (const baris of NAMA_BARIS) {
    BENTUK[baris].forEach((j, jari) => {
      kunci.add(j.join('-'));
      assert.deepEqual(posisiBentuk([...j].reverse()), { baris, jari });
      assert.deepEqual(jariBentuk(baris, jari), j);
      assert.ok(teksBentuk(baris, jari), `${baris}:${jari} tanpa nama`);
    });
  }
  assert.equal(kunci.size, 15);
  assert.equal(posisiBentuk([]), null);
  assert.equal(posisiBentuk([2]), null); // jari tengah sendirian tidak dipakai
  // kunci C: hitungan 1–5 = C F G Am Dm; 👍 = Em; L = D; 🤙 = A
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => akorUntuk(n - 1, 0, null, 'tengah').nama), ['C', 'F', 'G', 'Am', 'Dm']);
  const nama = (j) => { const p = posisiBentuk(j); return akorUntuk(p.jari, 0, null, p.baris).nama; };
  assert.equal(nama([0]), 'Em');
  assert.equal(nama([0, 1]), 'D');
  assert.equal(nama([0, 4]), 'A');
  assert.equal(nama([1, 4]), 'E');
  assert.equal(nama([4]), 'Bb');
});
