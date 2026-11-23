import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POLA, polaDenganId, durasiLangkah, goresanUntuk, basKedua, labelLangkah, bacaPolaTeks, labelHitungan, panjangPola } from '../public/js/pola.js';
import { akorUntuk, voicingGitar } from '../public/js/teori.js';

const C = voicingGitar(akorUntuk(0, 0)); // [48, 52, 55, 60, 64, 67]

test('semua pola: token valid, panjang sesuai birama (2 langkah per ketuk)', () => {
  for (const p of POLA) {
    if (!p.langkah) continue;
    assert.match(p.langkah, /^[DUuXBb123.]+$/, p.id);
    assert.equal(p.langkah.length, p.birama * (p.resolusi ?? 2), p.id);
  }
});

test('id unik dan polaDenganId jatuh ke "sekali" bila tidak dikenal', () => {
  assert.equal(new Set(POLA.map((p) => p.id)).size, POLA.length);
  assert.equal(polaDenganId('tidak-ada').id, 'sekali');
  assert.equal(polaDenganId('pop').langkah, 'D.DU.UDU');
});

test('durasi langkah: 90 bpm → 2/3 detik per ketuk → 1/3 detik per langkah', () => {
  assert.ok(Math.abs(durasiLangkah(90) - 1 / 3) < 1e-9);
  assert.ok(Math.abs(durasiLangkah(120) - 0.25) < 1e-9);
});

test('D = semua senar dari bas ke atas; U = senar atas dari tinggi ke bawah', () => {
  assert.deepEqual(goresanUntuk('D', C).nada, C);
  assert.deepEqual(goresanUntuk('U', C).nada, [67, 64, 60, 55]);
  assert.equal(goresanUntuk('U', C).arah, 'naik');
  assert.ok(goresanUntuk('U', C).faktor < goresanUntuk('D', C).faktor);
});

test('u (reggae) pendek, X mati, titik = diam', () => {
  assert.equal(goresanUntuk('u', C).pendek, true);
  assert.deepEqual(goresanUntuk('u', C).nada, [67, 64, 60]);
  assert.equal(goresanUntuk('X', C).mati, true);
  assert.equal(goresanUntuk('.', C), null);
});

test('aksen: langkah pertama paling keras', () => {
  assert.ok(goresanUntuk('D', C, 0).faktor > goresanUntuk('D', C, 2).faktor);
});

test('petik jari: B = akar, b = kwint, angka = senar dari atas, tidak meredam senar lain', () => {
  assert.deepEqual(goresanUntuk('B', C).nada, [48]);
  assert.deepEqual(goresanUntuk('b', C).nada, [55]); // G = kwint dari C
  assert.deepEqual(goresanUntuk('1', C).nada, [67]);
  assert.deepEqual(goresanUntuk('3', C).nada, [60]);
  assert.equal(goresanUntuk('3', C).redam, false);
});

test('basKedua jatuh ke senar ke-2 bila kwint tidak ada di bawah', () => {
  assert.equal(basKedua([45, 48, 52, 57]), 52); // Am: E = kwint dari A
  assert.equal(basKedua([50, 53, 57]), 57); // Dm: A = kwint
  assert.equal(basKedua([40, 44, 47]), 47); // E: B = kwint
  assert.equal(basKedua([41, 45, 48]), 48); // F
  assert.equal(basKedua([43, 47, 50]), 50);
  assert.equal(basKedua([40, 43, 46]), 43); // tanpa kwint sempurna → senar ke-2
});

test('semua token bisa dipakai untuk voicing pendek (4 senar) tanpa undefined', () => {
  const v = [51, 56, 63, 68];
  for (const p of POLA) {
    if (!p.langkah) continue;
    [...p.langkah].forEach((t, i) => {
      const g = goresanUntuk(t, v, i);
      if (g) assert.ok(g.nada.length && g.nada.every(Number.isFinite), `${p.id}:${t}`);
    });
  }
});

test('label langkah', () => {
  assert.equal([...'D.DU'].map(labelLangkah).join(''), '↓·↓↑');
});

test('bacaPolaTeks: notasi strumming umum', () => {
  assert.equal(bacaPolaTeks('D DU UDU', 8), 'D.DU.UDU');
  assert.equal(bacaPolaTeks('D-DU-UDU', 8), 'D.DU.UDU');
  assert.equal(bacaPolaTeks('d.du.udu', 8), 'D.DU.UDU');
  assert.equal(bacaPolaTeks('DxUx', 8), 'DXUX....'); // ditambah diam
  assert.equal(bacaPolaTeks('↓ ↓↑ ↑↓↑ extra', 8), 'D.DU.UDU'); // dipotong
  assert.equal(bacaPolaTeks('', 4), '....');
});

test('16 langkah (1/16) dan hitungan', () => {
  assert.equal(panjangPola(4, 4), 16);
  assert.deepEqual(labelHitungan(4, 2), ['1', '&', '2', '&', '3', '&', '4', '&']);
  assert.deepEqual(labelHitungan(3, 2), ['1', '&', '2', '&', '3', '&']);
  assert.deepEqual(labelHitungan(4, 4).slice(0, 8), ['1', 'e', '&', 'a', '2', 'e', '&', 'a']);
  assert.ok(Math.abs(durasiLangkah(120, 4) - 0.125) < 1e-9);
});

import { POLA_PIANO, goresanPiano } from '../public/js/pola.js';
import { voicingPiano } from '../public/js/teori.js';

const Cp = voicingPiano(akorUntuk(0, 0)); // [48, 60, 64, 67]

test('pola piano: token valid, panjang sesuai birama, id unik & tidak bentrok dengan gitar', () => {
  for (const p of POLA_PIANO) {
    if (!p.langkah) continue;
    assert.match(p.langkah, /^[ABCLOT1234.]+$/, p.id);
    assert.equal(p.langkah.length, p.birama * 2, p.id);
  }
  const semua = [...POLA, ...POLA_PIANO].map((p) => p.id).filter((id) => id !== 'sekali');
  assert.equal(new Set(semua).size, semua.length);
  assert.equal(polaDenganId('p-alberti').langkah, 'B323B323');
});

test('goresanPiano: A = bas+akor, C = akor, B = bas, angka = nada akor dari bawah', () => {
  assert.deepEqual(goresanPiano('A', Cp).nada, [48, 60, 64, 67]);
  assert.deepEqual(goresanPiano('C', Cp).nada, [60, 64, 67]);
  assert.deepEqual(goresanPiano('B', Cp).nada, [48]);
  assert.deepEqual(goresanPiano('1', Cp).nada, [60]);
  assert.deepEqual(goresanPiano('3', Cp).nada, [67]);
  assert.deepEqual(goresanPiano('4', Cp).nada, [67]); // triad: angka 4 = nada teratas
  assert.equal(goresanPiano('.', Cp), null);
  assert.equal(goresanPiano('B', Cp).redam, false); // bas dibiarkan berbunyi (pedal)
  assert.equal(goresanPiano('A', Cp).redam, true);
});

test('semua pola piano bisa dimainkan untuk akor 7 (4 nada akor)', () => {
  const G7 = voicingPiano(akorUntuk(2, 0, 2));
  for (const p of POLA_PIANO) {
    if (!p.langkah) continue;
    [...p.langkah].forEach((t, i) => { const g = goresanPiano(t, G7, i); if (g) assert.ok(g.nada.every(Number.isFinite), `${p.id}:${t}`); });
  }
});

import { ISIAN_PIANO, isianPiano } from '../public/js/pola.js';

const Gp = voicingPiano(akorUntuk(2, 0)); // G: [55? ...]

test('isian: lari naik/turun memakai nada akor, 4 not 1/16 di ketukan terakhir', () => {
  const naik = isianPiano(Cp, { jenis: 'naik' });
  assert.equal(naik.mulai, 6);
  assert.deepEqual(naik.not.map((n) => n.langkah), [6, 6.5, 7, 7.5]);
  assert.deepEqual(naik.not.map((n) => n.nada), [60, 64, 67, 72]);
  assert.deepEqual(isianPiano(Cp, { jenis: 'turun' }).not.map((n) => n.nada), [72, 67, 64, 60]);
  assert.equal(isianPiano(Cp, { jenis: 'naik', panjangBirama: 6 }).mulai, 4); // 3/4
});

test('isian hiasan (turn) di nada atas', () => {
  assert.deepEqual(isianPiano(Cp, { jenis: 'hiasan' }).not.map((n) => n.nada), [69, 67, 66, 67]);
});

test('bas berjalan berakhir satu semitone dari akar akor berikutnya, tepat sebelum ketukan 1', () => {
  const b = isianPiano(Cp, { jenis: 'bas', voicingBerikut: Gp });
  assert.equal(b.nama, 'bas berjalan');
  const terakhir = b.not.at(-1);
  assert.equal(Math.abs(terakhir.nada - Gp[0]), 1);
  assert.equal(terakhir.langkah, 7);
  // tanpa akor berikutnya → jatuh ke lari naik
  assert.equal(isianPiano(Cp, { jenis: 'bas' }).nama, 'lari naik');
  // akor berikutnya sama akarnya → juga lari naik
  assert.equal(isianPiano(Cp, { jenis: 'bas', voicingBerikut: Cp }).nama, 'lari naik');
});

test('otomatis: bervariasi, tidak mengulang isian yang sama berturut-turut', () => {
  const nama = Array.from({ length: 24 }, (_, bar) => isianPiano(Cp, { jenis: 'otomatis', bar }).nama);
  for (let i = 1; i < nama.length; i++) assert.notEqual(nama[i], nama[i - 1], `birama ${i}`);
  assert.ok(new Set(nama).size >= 6, [...new Set(nama)].join(', '));
  assert.equal(isianPiano(Cp, { jenis: 'mati' }), null);
  assert.equal(new Set(ISIAN_PIANO.map((x) => x.id)).size, ISIAN_PIANO.length);
});

test('otomatis: bila akor berikutnya diketahui, isian menuju akor itu ikut muncul', () => {
  const nama = Array.from({ length: 24 }, (_, bar) => isianPiano(Cp, { jenis: 'otomatis', bar, voicingBerikut: Gp }).nama);
  assert.ok(nama.some((n) => n === 'bas berjalan' || n === 'kromatik'), nama.join(', '));
});

test('otomatis lembut hanya memakai isian halus', () => {
  const halus = new Set(['hiasan', 'slide', 'trill', 'lari naik', 'lari turun']);
  for (let bar = 0; bar < 20; bar++) assert.ok(halus.has(isianPiano(Cp, { jenis: 'otomatis-lembut', bar, voicingBerikut: Gp }).nama));
});

test('setiap isian: not di dalam birama, nada wajar, tidak kosong', () => {
  for (const { id } of ISIAN_PIANO) {
    if (id === 'mati') continue;
    for (const birama of [8, 6]) {
      const x = isianPiano(Cp, { jenis: id, bar: 3, panjangBirama: birama, voicingBerikut: Gp, kunci: 0 });
      assert.ok(x && x.not.length > 0, id);
      for (const n of x.not) {
        assert.ok(n.langkah >= x.mulai && n.langkah < birama, `${id}: langkah ${n.langkah}`);
        assert.ok(n.nada >= 28 && n.nada <= 96, `${id}: nada ${n.nada}`);
      }
    }
  }
});

test('isian khusus: tangga nada di kunci, kromatik menuju akar berikutnya, sinkop di "&" 4, arpeggio lebar 2 ketuk', () => {
  const skala = isianPiano(Cp, { jenis: 'skala', kunci: 0 }).not.map((n) => n.nada % 12);
  assert.ok(skala.every((pc) => [0, 2, 4, 5, 7, 9, 11].includes(pc)), skala.join(','));
  const krom = isianPiano(Cp, { jenis: 'kromatik', voicingBerikut: Gp }).not;
  assert.equal((krom.at(-1).nada + 1) % 12, Gp[0] % 12);
  assert.deepEqual(isianPiano(Cp, { jenis: 'sinkop' }).not.map((n) => n.langkah), [7, 7, 7]);
  assert.equal(isianPiano(Cp, { jenis: 'lebar' }).mulai, 4);
  const geser = isianPiano(Cp, { jenis: 'geser' }).not;
  assert.equal(geser[1].nada - geser[0].nada, 1);
});


import { GENRE_ISIAN, isianGenre, UKURAN_FRASA } from '../public/js/pola.js';

const GENRE = ['pop', 'balada', 'gospel', 'jazz', 'blues', 'rock', 'klasik', 'rohani', 'campuran'];

test('isian genre: frasa 4 birama (kecil-sedang-kecil-BESAR), not di dalam birama & nada wajar', () => {
  for (const g of GENRE) {
    for (const P of [8, 6]) {
      for (let bar = 0; bar < 12; bar++) {
        for (const berikut of [null, Gp]) {
          const x = isianGenre(Cp, { genre: g, bar, panjangBirama: P, voicingBerikut: berikut, kunci: 0 });
          const nama = `${g} bar ${bar} P${P}`;
          assert.ok(x && x.not.length > 0, nama);
          assert.equal(x.ukuran, UKURAN_FRASA[bar % 4], nama);
          assert.equal(x.mulai, x.ukuran === 'besar' ? P - 4 : P - 2, `${nama} ${x.jenis}`);
          for (const n of x.not) {
            assert.ok(n.langkah >= x.mulai && n.langkah < P, `${nama} ${x.jenis}: langkah ${n.langkah}`);
            assert.ok(n.nada >= 28 && n.nada <= 96, `${nama} ${x.jenis}: nada ${n.nada}`);
          }
        }
      }
    }
  }
});

test('isian genre: tanpa akor berikutnya, figur "menuju" tidak dipakai; dengan akor berikutnya, ikut muncul', () => {
  const menuju = new Set(['bas', 'kromatik', 'walkup', 'tritone']);
  for (const g of ['gospel', 'jazz']) {
    const tanpa = Array.from({ length: 24 }, (_, bar) => isianGenre(Cp, { genre: g, bar, kunci: 0 }).jenis);
    assert.ok(tanpa.every((j) => !menuju.has(j)), `${g}: ${tanpa}`);
    const dengan = Array.from({ length: 24 }, (_, bar) => isianGenre(Cp, { genre: g, bar, voicingBerikut: Gp, kunci: 0 }).jenis);
    assert.ok(dengan.some((j) => menuju.has(j)), `${g}: ${dengan}`);
  }
});

test('isian genre: tiap genre punya beberapa figur berbeda & campuran memakai beberapa genre', () => {
  for (const g of GENRE.filter((x) => x !== 'campuran')) {
    const figur = new Set(Array.from({ length: 32 }, (_, bar) => isianGenre(Cp, { genre: g, bar, voicingBerikut: Gp, kunci: 0 }).jenis));
    assert.ok(figur.size >= 4, `${g}: ${[...figur]}`);
  }
  const genre = new Set(Array.from({ length: 16 }, (_, bar) => isianGenre(Cp, { genre: 'campuran', bar }).genre));
  assert.ok(genre.size >= 3, [...genre].join(','));
  assert.equal(GENRE_ISIAN.length, 9);
});

test('isian genre: tangga nada, pentatonik & bebop tetap di kunci', () => {
  const pcs = (jenis, kunci) => {
    for (let bar = 3; bar < 400; bar += 4) {
      for (const g of GENRE) {
        const x = isianGenre(Cp, { genre: g, bar, kunci });
        if (x.jenis === jenis) return x.not.map((n) => (((n.nada - kunci) % 12) + 12) % 12);
      }
    }
    return null;
  };
  assert.ok(pcs('skala-naik', 0).every((pc) => [0, 2, 4, 5, 7, 9, 11].includes(pc)));
  assert.ok(pcs('pentatonik', 0).every((pc) => [0, 3, 5, 7, 10].includes(pc)));
  assert.ok(pcs('bebop', 0).every((pc) => [0, 2, 4, 5, 7, 8, 9, 11].includes(pc)));
});

test('isianPiano meneruskan id "genre:…" ke isian genre', () => {
  assert.equal(isianPiano(Cp, { jenis: 'genre:jazz', bar: 3, kunci: 0 }).ukuran, 'besar');
});

/** Ambil isian genre rohani berjenis tertentu (mencari birama yang memilihnya). */
function cariRohani(jenis, voicing, opsi) {
  for (let bar = 0; bar < 400; bar++) {
    const x = isianGenre(voicing, { genre: 'rohani', bar, kunci: 0, ...opsi });
    if (x.jenis === jenis) return x;
  }
  return null;
}
const nm = (m) => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][m % 12];

test('rohani: pentatonis 2-3-5-6 di kunci C = D E G A, register tinggi', () => {
  const x = cariRohani('penta-2356', Cp, {});
  assert.ok(x.not.every((n) => ['D', 'E', 'G', 'A'].includes(nm(n.nada)) && n.nada >= 72), x.not.map((n) => n.nada).join(','));
  const lebar = cariRohani('penta-lebar', Cp, {});
  assert.ok(lebar.not.every((n) => ['D', 'E', 'G', 'A'].includes(nm(n.nada))));
});

test('rohani: oktaf 3-1-7-6 (E C B A, berpasangan oktaf) hanya saat akor berikutnya IV', () => {
  const F = voicingPiano(akorUntuk(1, 0)); // IV di kunci C
  const x = cariRohani('oktaf-3176', Cp, { voicingBerikut: F });
  assert.ok(x, 'muncul menjelang IV');
  const atas = x.not.filter((_, i) => i % 2 === 0);
  assert.deepEqual(atas.map((n) => nm(n.nada)), ['E', 'C', 'B', 'A']);
  for (let i = 0; i < x.not.length; i += 2) assert.equal(x.not[i].nada - x.not[i + 1].nada, 12);
  assert.equal(cariRohani('oktaf-3176', Cp, { voicingBerikut: Gp }), null); // ke V: tidak dipakai
});

test('rohani: triad bergantian C ↔ Dm', () => {
  const x = cariRohani('triad-ganti', Cp, {});
  const perKetuk = [0, 1, 2, 3].map((i) => x.not.filter((n) => n.langkah === x.mulai + i).map((n) => nm(n.nada)).join(''));
  assert.deepEqual(perKetuk, ['CEG', 'DFA', 'CEG', 'DFA']);
});

test('gospel drop: G → G#dim7 → Am', () => {
  const G = voicingPiano(akorUntuk(2, 0));
  const Am = voicingPiano(akorUntuk(3, 0));
  const x = cariRohani('passing-dim', G, { voicingBerikut: Am });
  const bas = x.not[0];
  assert.equal(nm(bas.nada), 'G#');
  assert.deepEqual(x.not.slice(1).map((n) => nm(n.nada)), ['G#', 'B', 'D', 'F']);
});

test('gospel drop: C → F#m7b5 → B7 → Em (tujuan minor), C → Dm7 → G7 → C (tujuan mayor)', () => {
  const Em = voicingPiano(akorUntuk(0, 0, null, 'atas'));
  const x = cariRohani('ii-v', Cp, { voicingBerikut: Em });
  const di = (l) => x.not.filter((n) => n.langkah === l).map((n) => nm(n.nada));
  assert.deepEqual(di(x.mulai), ['F#', 'F#', 'A', 'C', 'E']); // bas + F#m7b5
  assert.deepEqual(di(x.mulai + 2), ['B', 'B', 'D#', 'F#', 'A']); // bas + B7
  const F = voicingPiano(akorUntuk(1, 0));
  const y = cariRohani('ii-v', voicingPiano(akorUntuk(2, 0)), { voicingBerikut: voicingPiano(akorUntuk(0, 0)) });
  const diY = (l) => y.not.filter((n) => n.langkah === l).map((n) => nm(n.nada));
  assert.deepEqual(diY(y.mulai).slice(1), ['D', 'F', 'A', 'C']); // Dm7
  assert.deepEqual(diY(y.mulai + 2).slice(1), ['G', 'B', 'D', 'F']); // G7
  assert.ok(F);
});

test('sus4 gantung: C → Csus4 (C F G) → kembali ke E; Am → Asus4 (D) → kembali ke C', () => {
  const x = cariRohani('sus4', Cp, {});
  assert.deepEqual(x.not.filter((n) => n.langkah === x.mulai).map((n) => nm(n.nada)).sort(), ['C', 'F', 'G']);
  assert.deepEqual(x.not.filter((n) => n.langkah === x.mulai + 1).map((n) => nm(n.nada)), ['E']);
  const Am = voicingPiano(akorUntuk(3, 0));
  const y = cariRohani('sus4', Am, {});
  assert.deepEqual(y.not.filter((n) => n.langkah === y.mulai).map((n) => nm(n.nada)).sort(), ['A', 'D', 'E']);
  assert.deepEqual(y.not.filter((n) => n.langkah === y.mulai + 1).map((n) => nm(n.nada)), ['C']);
});

import { ISIAN_TUNGGAL } from '../public/js/pola.js';

test('isian satu teknik: tiap teknik selalu berbunyi (dengan/tanpa akor berikutnya), not di dalam birama', () => {
  const semua = ISIAN_TUNGGAL.flatMap((g) => g.daftar);
  assert.ok(semua.length >= 25);
  assert.equal(new Set(semua.map((x) => x.id)).size, semua.length);
  for (const { id } of semua) {
    for (const berikut of [null, Gp]) {
      for (const P of [8, 6]) {
        const x = isianPiano(Cp, { jenis: id, bar: 0, panjangBirama: P, voicingBerikut: berikut, kunci: 0 });
        assert.ok(x && x.not.length > 0, `${id} ${berikut ? 'dengan' : 'tanpa'} akor berikutnya`);
        assert.equal(x.jenis, id.slice(2));
        for (const n of x.not) {
          assert.ok(n.langkah >= x.mulai && n.langkah < P, `${id}: langkah ${n.langkah}`);
          assert.ok(n.nada >= 28 && n.nada <= 96, `${id}: nada ${n.nada}`);
        }
      }
    }
  }
});

test('satu teknik dipilih = teknik itu yang dimainkan di setiap birama (tidak dicampur)', () => {
  for (const id of ['f:penta-2356', 'f:oktaf-3176', 'f:sus4', 'f:triad-ganti']) {
    const jenis = new Set(Array.from({ length: 8 }, (_, bar) => isianPiano(Cp, { jenis: id, bar, kunci: 0 }).jenis));
    assert.deepEqual([...jenis], [id.slice(2)]);
  }
});

test('satu teknik: sus4 (C → Csus4 → C), oktaf 3-1-7-6 tanpa harus menuju IV', () => {
  const sus = isianPiano(Cp, { jenis: 'f:sus4', kunci: 0 });
  assert.deepEqual(sus.not.filter((n) => n.langkah === sus.mulai).map((n) => nm(n.nada)).sort(), ['C', 'F', 'G']);
  assert.deepEqual(sus.not.filter((n) => n.langkah === sus.mulai + 1).map((n) => nm(n.nada)), ['E']);
  const okt = isianPiano(Cp, { jenis: 'f:oktaf-3176', kunci: 0, voicingBerikut: Gp });
  assert.deepEqual(okt.not.filter((_, i) => i % 2 === 0).map((n) => nm(n.nada)), ['E', 'C', 'B', 'A']);
});

test('gaya iringan rohani: 6 gaya, token 5/8/10 benar untuk mayor & minor', () => {
  const rohani = POLA_PIANO.filter((p) => p.id.startsWith('p-rohani'));
  assert.equal(rohani.length, 6);
  // C mayor: bas C3 (48) → 5 = G3, 8 = C4, 10 = E4
  assert.deepEqual(['L', 'O', 'T'].map((t) => goresanPiano(t, Cp).nada[0]), [55, 60, 64]);
  // A minor: desima memakai terts kecil (C)
  const Am = voicingPiano(akorUntuk(3, 0));
  const bas = Am[0];
  assert.deepEqual(['L', 'O', 'T'].map((t) => goresanPiano(t, Am).nada[0] - bas), [7, 12, 15]);
  assert.equal(polaDenganId('p-rohani-1581').langkah, 'ALOTALOT');
  assert.equal(polaDenganId('p-rohani-waltz').birama, 3);
  assert.equal([...'ALOT'].map(labelLangkah).join(' '), '● 5 8 10');
});

import { ISIAN_GITAR_TUNGGAL, GENRE_ISIAN_GITAR, isianGitar } from '../public/js/pola.js';

const Cg = voicingGitar(akorUntuk(0, 0)); // [48, 52, 55, 60, 64, 67]
const Gg = voicingGitar(akorUntuk(2, 0));
const semuaNada = (x) => x.not.flatMap((n) => n.akor ?? [n.nada]);

test('isian gitar satu teknik: selalu berbunyi, di dalam birama, nada di rentang gitar', () => {
  const semua = ISIAN_GITAR_TUNGGAL.flatMap((g) => g.daftar);
  assert.ok(semua.length >= 17);
  assert.equal(new Set(semua.map((x) => x.id)).size, semua.length);
  for (const { id } of semua) {
    for (const berikut of [null, Gg]) {
      for (const P of [8, 6]) {
        const x = isianGitar(Cg, { jenis: id, panjangBirama: P, voicingBerikut: berikut, kunci: 0 });
        assert.ok(x && x.not.length > 0, id);
        for (const n of x.not) assert.ok(n.langkah >= x.mulai && n.langkah < P, `${id}: langkah ${n.langkah}`);
        for (const m of semuaNada(x)) assert.ok(m >= 38 && m <= 90, `${id}: nada ${m}`);
      }
    }
  }
});

test('isian gitar: hammer-on sus4 di C = F lalu hammer ke E; chuck memakai senar diredam', () => {
  const h = isianGitar(Cg, { jenis: 'g:hammer-sus4', kunci: 0 });
  assert.ok(h.not[0].akor.some((n) => nm(n) === 'F'));
  assert.equal(nm(h.not[1].nada), 'E');
  const c = isianGitar(Cg, { jenis: 'g:chuck', kunci: 0 });
  assert.equal(c.not.filter((n) => n.mati).length, 3);
  const b = isianGitar(Cg, { jenis: 'g:bas-jalan', voicingBerikut: Gg, kunci: 0 });
  const jarak = (((b.not.at(-1).nada - Gg[0]) % 12) + 12) % 12;
  assert.ok(jarak === 1 || jarak === 11, `berhenti setengah nada dari G (dari atas/bawah), jarak ${jarak}`);
  assert.ok(isianGitar(Cg, { jenis: 'g:lick-penta', kunci: 0 }).not.every((n) => [0, 2, 4, 7, 9].includes(n.nada % 12)));
});

test('isian gitar genre: frasa kecil-sedang-kecil-BESAR & tanpa akor berikutnya tidak pakai "menuju"', () => {
  for (const { id } of GENRE_ISIAN_GITAR) {
    for (let bar = 0; bar < 12; bar++) {
      const x = isianGitar(Cg, { jenis: id, bar, kunci: 0 });
      assert.equal(x.ukuran, UKURAN_FRASA[bar % 4], `${id} ${bar}`);
      assert.equal(x.mulai, x.ukuran === 'besar' ? 4 : 6, `${id} ${bar} ${x.jenis}`);
      assert.notEqual(x.jenis, 'bas-jalan');
    }
  }
});

import { POLA_PETIK, tabKeTeks, bacaTabTeks, labelTab, nadaTab, senarDariVoicing } from '../public/js/pola.js';

test('pola petik (tab): panjang = birama × resolusi, senar 1..6, id unik', () => {
  assert.ok(POLA_PETIK.length >= 9);
  const semua = [...POLA, ...POLA_PIANO, ...POLA_PETIK].map((p) => p.id).filter((id) => id !== 'sekali');
  assert.equal(new Set(semua).size, semua.length);
  for (const p of POLA_PETIK) {
    assert.equal(p.tab.length, p.birama * p.resolusi, p.id);
    assert.equal(p.langkah.length, p.tab.length, p.id);
    assert.ok(p.tab.every((s) => s.every((k) => k >= 1 && k <= 6)), p.id);
    assert.equal(polaDenganId(p.id), p);
  }
});

test('teks tab: tulis & baca bolak-balik, langkah tidak valid jadi diam', () => {
  const travis = POLA_PETIK.find((p) => p.id === 't-travis').tab;
  assert.equal(tabKeTeks(travis), '61 3 4 2 6 3 4 2');
  assert.deepEqual(bacaTabTeks('61 3 4 2 6 3 4 2', 8), travis);
  assert.deepEqual(bacaTabTeks('6 . 9 x 3', 6), [[6], [], [], [], [3], []]);
  assert.deepEqual(bacaTabTeks('16', 1), [[6, 1]]);
  assert.equal(labelTab([1, 6]), '61');
  assert.equal(labelTab([]), '·');
});

test('nada tab memakai bentuk akor asli; senar × pindah ke senar bas berikutnya', () => {
  // C terbuka x32010: senar 6 tidak dibunyikan
  const C = [null, 48, 52, 55, 60, 64]; // senar 6..1
  assert.deepEqual(nadaTab([5], C), [48]); // senar 5 = C3
  assert.deepEqual(nadaTab([6], C), [48]); // senar 6 (×) → senar 5
  assert.deepEqual(nadaTab([6, 1], C), [48, 64]); // pinch
  const D = [null, null, 50, 57, 62, 66]; // xx0232
  assert.deepEqual(nadaTab([6], D), [50]); // senar 6 & 5 (×) → senar 4
  assert.deepEqual(senarDariVoicing([48, 52, 55, 60, 64, 67]), [48, 52, 55, 60, 64, 67]);
  assert.deepEqual(senarDariVoicing([46, 49, 52, 58]), [null, null, 46, 49, 52, 58]);
});
