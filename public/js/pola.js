// Pola genjreng gitar (modul murni). Satu langkah = 1/`resolusi` ketuk:
// resolusi 2 = not 1/8 (default), resolusi 4 = not 1/16.
// Token:
//   D  genjreng turun (senar bas → senar tinggi), semua senar
//   U  genjreng naik (senar tinggi → bawah), 4 senar teratas, lebih lembut
//   u  genjreng naik pendek & diredam (chop ala reggae/ska), 3 senar teratas
//   X  pukulan mati (senar diredam telapak, bunyi "cek")
//   B  petik bas (akar)      b  petik bas kedua (biasanya kwint)
//   1 2 3  petik senar ke-1/2/3 dari atas (1 = nada tertinggi)
//   .  diam (tangan tetap mengayun, tidak kena senar)

export const POLA = [
  { id: 'sekali', nama: 'Sekali genjreng', langkah: null, birama: 4 },
  { id: 'pop', nama: 'Pop · D - DU - UDU', langkah: 'D.DU.UDU', birama: 4 },
  { id: 'balada', nama: 'Balada · D - D - DUDU', langkah: 'D.D.DUDU', birama: 4 },
  { id: 'rock', nama: 'Rock · DDDD DDDD', langkah: 'DDDDDDDD', birama: 4 },
  { id: 'funk', nama: 'Funk · D - XU - UXU', langkah: 'D.XU.UXU', birama: 4 },
  { id: 'reggae', nama: 'Reggae · genjreng naik pendek', langkah: '.u.u.u.u', birama: 4 },
  { id: 'waltz', nama: 'Waltz 3/4 · D - DUDU', langkah: 'D.DUDU', birama: 3 },
  { id: 'petik', nama: 'Petik jari · bas gantian', langkah: 'B32b3231', birama: 4 },
  { id: 'arpeggio', nama: 'Arpeggio lembut', langkah: 'B3212b32', birama: 4 },
  { id: 'kustom', nama: 'Atur sendiri…', langkah: null, birama: 4, kustom: true },
];

/**
 * Gaya iringan PIANO. Token:
 *   A  bas + akor (blok penuh)      C  akor saja (tanpa bas)
 *   B  bas saja                      1 2 3  nada akor ke-1/2/3 dari BAWAH (arpeggio)
 *   L  kwint di atas bas (5)          O  bas satu oktaf di atas (8)
 *   T  desima: terts akor satu oktaf di atas bas (10; mayor/minor menyesuaikan akor)
 *   .  diam (nada sebelumnya dibiarkan berbunyi, seperti pedal)
 */
export const POLA_PIANO = [
  { id: 'sekali', nama: 'Sekali · akor ditahan', langkah: null, birama: 4 },
  { id: 'p-blok', nama: 'Blok tiap ketuk', langkah: 'A.C.C.C.', birama: 4 },
  { id: 'p-pop8', nama: 'Pop rapat · tiap 1/8', langkah: 'ACCCACCC', birama: 4 },
  { id: 'p-balada', nama: 'Balada · akor tiap 2 ketuk', langkah: 'A...C...', birama: 4 },
  { id: 'p-oompah', nama: 'Oom-pah · bas lalu akor', langkah: 'B.C.B.C.', birama: 4 },
  { id: 'p-alberti', nama: 'Alberti · gaya klasik', langkah: 'B323B323', birama: 4 },
  { id: 'p-arpeggio', nama: 'Arpeggio naik-turun', langkah: 'B1232321', birama: 4 },
  { id: 'p-sinkop', nama: 'Sinkop pop · 3-3-2', langkah: 'A..C..C.', birama: 4 },
  { id: 'p-waltz', nama: 'Waltz 3/4', langkah: 'A.C.C.', birama: 3 },
  // ---- rohani / worship ----
  { id: 'p-rohani-pad', nama: 'Rohani · pad dan bas oktaf', langkah: 'A...O...', birama: 4 },
  { id: 'p-rohani-1581', nama: 'Rohani · arpeggio 1-5-8-10', langkah: 'ALOTALOT', birama: 4 },
  { id: 'p-rohani-alir', nama: 'Rohani · arpeggio naik-turun', langkah: 'ALOT3TOL', birama: 4 },
  { id: 'p-rohani-himne', nama: 'Rohani · himne', langkah: 'A.A.A.A.', birama: 4 },
  { id: 'p-rohani-sinkop', nama: 'Rohani · sinkop 3-3-2', langkah: 'ACCACCAC', birama: 4 },
  { id: 'p-rohani-waltz', nama: 'Rohani · waltz 3/4', langkah: 'ALOTOL', birama: 3 },
];

export const polaDenganId = (id) => POLA.find((p) => p.id === id) || POLA_PIANO.find((p) => p.id === id) || (typeof POLA_PETIK !== 'undefined' && POLA_PETIK.find((p) => p.id === id)) || POLA[0];

/**
 * Terjemahkan token piano menjadi goresan untuk voicing piano [bas, nada akor naik…].
 * Bas & arpeggio tidak meredam nada lain (seperti pedal sustain); blok akor meredam
 * akor sebelumnya pelan-pelan (ganti pedal).
 */
export function goresanPiano(token, voicing, indeks = 0) {
  const aksen = indeks === 0 ? 1 : indeks % 4 === 0 ? 0.9 : 0.78;
  const bas = voicing[0], akor = voicing.slice(1);
  switch (token) {
    case 'A': return { nada: voicing.slice(), arah: 'turun', faktor: aksen, pendek: false, mati: false, redam: true };
    case 'C': return { nada: akor, arah: 'turun', faktor: aksen * 0.75, pendek: false, mati: false, redam: false };
    case 'B': return { nada: [bas], arah: 'petik', faktor: 0.9, pendek: false, mati: false, redam: false };
    case 'L': return { nada: [bas + 7], arah: 'petik', faktor: 0.68, pendek: false, mati: false, redam: false };
    case 'O': return { nada: [bas + 12], arah: 'petik', faktor: 0.68, pendek: false, mati: false, redam: false };
    case 'T': {
      // desima: terts akor (besar/kecil sesuai akor) satu oktaf di atas bas
      const minor = akor.some((n) => (((n - bas) % 12) + 12) % 12 === 3);
      return { nada: [bas + 12 + (minor ? 3 : 4)], arah: 'petik', faktor: 0.65, pendek: false, mati: false, redam: false };
    }
    case '1': case '2': case '3': case '4': {
      const i = Math.min(akor.length - 1, Number(token) - 1);
      return { nada: [akor[i]], arah: 'petik', faktor: 0.7, pendek: false, mati: false, redam: false };
    }
    default: return null;
  }
}

/** Durasi satu langkah (detik) pada tempo bpm; resolusi 2 = 1/8 ketuk, 4 = 1/16 ketuk. */
export const durasiLangkah = (bpm, resolusi = 2) => 60 / bpm / resolusi;

/** Jumlah langkah satu birama. */
export const panjangPola = (birama, resolusi) => birama * resolusi;

/**
 * Baca pola dari teks ala notasi strumming: "D DU UDU", "D-DU-UDU", "d.du.udu",
 * "x" = redam (cek). Spasi, "-", "." dan "_" = diam. Dipotong/ditambah diam sampai `panjang`.
 */
export function bacaPolaTeks(teks, panjang) {
  const peta = { D: 'D', d: 'D', U: 'U', u: 'U', X: 'X', x: 'X', ' ': '.', '-': '.', '.': '.', _: '.', '·': '.', '↓': 'D', '↑': 'U', '×': 'X' };
  const isi = [...String(teks).replace(/\r|\n/g, '')].map((c) => peta[c]).filter(Boolean).join('');
  return isi.slice(0, panjang).padEnd(panjang, '.');
}

/** Label hitungan di bawah tiap langkah: "1 & 2 &" (1/8) atau "1 e & a" (1/16). */
export function labelHitungan(birama, resolusi) {
  const sub = resolusi === 4 ? ['', 'e', '&', 'a'] : ['', '&'];
  return Array.from({ length: birama * resolusi }, (_, i) => (i % resolusi === 0 ? String(i / resolusi + 1) : sub[i % resolusi]));
}

/** Urutan isi kotak saat diklik di editor. */
export const SIKLUS_KOTAK = ['.', 'D', 'U', 'X'];

/**
 * Terjemahkan satu token menjadi goresan untuk voicing tertentu.
 * @param {string} token
 * @param {number[]} voicing  nada MIDI dari bas ke atas
 * @param {number} indeks     posisi langkah dalam pola (untuk aksen)
 * @returns {null|{nada:number[], arah:'turun'|'naik'|'petik', faktor:number, pendek:boolean, mati:boolean, redam:boolean}}
 */
export function goresanUntuk(token, voicing, indeks = 0) {
  const n = voicing.length;
  const aksen = indeks === 0 ? 1 : indeks % 4 === 0 ? 0.9 : 0.78;
  const atas = (k) => voicing.slice(Math.max(1, n - k));
  switch (token) {
    case 'D': return { nada: voicing.slice(), arah: 'turun', faktor: aksen, pendek: false, mati: false, redam: true };
    case 'U': return { nada: atas(4).reverse(), arah: 'naik', faktor: aksen * 0.72, pendek: false, mati: false, redam: true };
    case 'u': return { nada: atas(3).reverse(), arah: 'naik', faktor: 0.62, pendek: true, mati: false, redam: true };
    case 'X': return { nada: voicing.slice(), arah: 'turun', faktor: 0.5, pendek: true, mati: true, redam: true };
    case 'B': return { nada: [voicing[0]], arah: 'petik', faktor: 0.95, pendek: false, mati: false, redam: false };
    case 'b': return { nada: [basKedua(voicing)], arah: 'petik', faktor: 0.85, pendek: false, mati: false, redam: false };
    case '1': case '2': case '3': {
      const i = n - Number(token);
      return { nada: [voicing[Math.max(1, i)]], arah: 'petik', faktor: 0.7, pendek: false, mati: false, redam: false };
    }
    default: return null; // '.'
  }
}

/** Bas kedua untuk petik bergantian: kwint (akar + 7) bila ada di 3 senar terbawah, kalau tidak senar ke-2. */
export function basKedua(voicing) {
  const akar = voicing[0] % 12;
  const kwint = voicing.slice(1, 3).find((m) => (m - akar + 12) % 12 === 7);
  return kwint ?? voicing[1];
}

/** Label tampilan per langkah: panah untuk genjreng, titik untuk diam. */
export function labelLangkah(token) {
  return { D: '↓', U: '↑', u: '↑', X: '×', B: 'B', b: 'b', A: '●', C: '○', L: '5', O: '8', T: '10', 1: '1', 2: '2', 3: '3', 4: '4', '.': '·' }[token] ?? '·';
}

/**
 * Pola ISIAN piano: mengisi kekosongan antar akor di ujung birama.
 * Tiap isian = daftar not {langkah (boleh pecahan, dalam birama), nada, faktor}.
 */
export const ISIAN_PIANO = [
  { id: 'mati', nama: 'Tanpa isian' },
  { id: 'otomatis', nama: 'Acak semua isian' },
  { id: 'otomatis-lembut', nama: 'Acak isian lembut' },
  { id: 'naik', nama: 'Lari naik' },
  { id: 'turun', nama: 'Lari turun' },
  { id: 'lebar', nama: 'Arpeggio lebar' },
  { id: 'skala', nama: 'Lari tangga nada' },
  { id: 'hiasan', nama: 'Hiasan' },
  { id: 'getar', nama: 'Trill' },
  { id: 'geser', nama: 'Slide' },
  { id: 'oktaf', nama: 'Oktaf tinggi' },
  { id: 'sinkop', nama: 'Sinkop' },
  { id: 'pompa', nama: 'Bas oktaf' },
  { id: 'bas', nama: 'Bas berjalan' },
  { id: 'kromatik', nama: 'Kromatik' },
];

const NAMA_ISIAN = {
  naik: 'lari naik', turun: 'lari turun', lebar: 'arpeggio lebar', skala: 'lari tangga nada', hiasan: 'hiasan',
  getar: 'trill', geser: 'slide', oktaf: 'oktaf tinggi', sinkop: 'sinkop', pompa: 'bas oktaf',
  bas: 'bas berjalan', kromatik: 'kromatik',
};
const KOLAM_SEMUA = ['naik', 'turun', 'lebar', 'skala', 'hiasan', 'getar', 'geser', 'oktaf', 'sinkop', 'pompa'];
const KOLAM_LEMBUT = ['hiasan', 'geser', 'getar', 'naik', 'turun'];
const KOLAM_MENUJU = ['bas', 'kromatik']; // butuh akor berikutnya
const MAYOR = [0, 2, 4, 5, 7, 9, 11];

/** PRNG kecil deterministik per birama (variasi terdengar acak tapi bisa dites). */
function acakBar(bar, garam = 0) {
  let x = (Math.imul(bar + 1, 2654435761) ^ (garam * 40503)) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d) >>> 0; x ^= x >>> 12; x = Math.imul(x, 0x297a2d39) >>> 0; x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

/** Jenis isian untuk mode otomatis pada birama `bar` (tanpa mengulang birama sebelumnya). */
export function pilihIsianOtomatis(mode, bar, adaBerikut) {
  const kolam = mode === 'otomatis-lembut' ? KOLAM_LEMBUT : KOLAM_SEMUA;
  const mentah = (b) => {
    if (mode === 'otomatis' && adaBerikut && acakBar(b, 1) < 0.4) return KOLAM_MENUJU[Math.floor(acakBar(b, 2) * 2)];
    return kolam[Math.floor(acakBar(b) * kolam.length)];
  };
  let pilih = mentah(bar);
  if (bar > 0 && pilih === mentah(bar - 1)) {
    const daftar = KOLAM_MENUJU.includes(pilih) ? KOLAM_MENUJU : kolam;
    pilih = daftar[(daftar.indexOf(pilih) + 1) % daftar.length];
  }
  return pilih;
}

/** Nada tangga nada mayor `kunci` tertinggi yang ≤ m. */
function skalaDiBawah(m, kunci) {
  for (let n = m; n > m - 12; n--) if (MAYOR.includes((((n - kunci) % 12) + 12) % 12)) return n;
  return m;
}
/** Langkah tangga nada berikutnya ke bawah dari nada skala n. */
const skalaTurun = (n, kunci) => skalaDiBawah(n - 1, kunci);
const skalaNaik = (n, kunci) => { for (let k = n + 1; k < n + 3; k++) if (MAYOR.includes((((k - kunci) % 12) + 12) % 12)) return k; return n + 2; };

/**
 * Not-not isian untuk satu birama.
 * @param {number[]} voicing        voicing piano akor sekarang [bas, nada akor naik…]
 * @param {object} o
 * @param {string} o.jenis          id ISIAN_PIANO
 * @param {number} [o.bar]          nomor birama (untuk mode otomatis)
 * @param {number} [o.panjangBirama] langkah 1/8 per birama (8 = 4/4, 6 = 3/4)
 * @param {number[]|null} [o.voicingBerikut] voicing akor berikutnya bila diketahui
 * @param {number|null} [o.kunci]   pitch class kunci TERDENGAR (untuk lari tangga nada / getar)
 * @returns {null|{nama:string, jenis:string, mulai:number, not:{langkah:number, nada:number, faktor:number}[]}}
 */
export function isianPiano(voicing, { jenis, bar = 0, panjangBirama = 8, voicingBerikut = null, kunci = null, ukuran }) {
  if (!jenis || jenis === 'mati') return null;
  if (jenis.startsWith('genre:')) return isianGenre(voicing, { genre: jenis.slice(6), bar, panjangBirama, voicingBerikut, kunci, ukuran });
  if (jenis.startsWith('f:')) return isianTunggal(voicing, { figurId: jenis.slice(2), panjangBirama, voicingBerikut, kunci });
  const akor = voicing.slice(1);
  const bas = voicing[0];
  const adaBerikut = Boolean(voicingBerikut) && voicingBerikut[0] % 12 !== bas % 12;
  let j = jenis.startsWith('otomatis') ? pilihIsianOtomatis(jenis, bar, adaBerikut) : jenis;
  if (KOLAM_MENUJU.includes(j) && !adaBerikut) j = 'naik'; // akor berikutnya tidak diketahui / sama
  const k = kunci ?? bas % 12;
  const mulai = j === 'lebar' ? Math.max(0, panjangBirama - 4) : panjangBirama - 2;
  const a0 = akor[0], a1 = akor[1], a2 = akor[2] ?? akor[1] + 3, atas = akor[akor.length - 1];
  const not16 = (nada, faktor = 0.62, dari = mulai) => nada.map((n, i) => ({ langkah: dari + i * 0.5, nada: n, faktor }));
  let not;
  switch (j) {
    case 'naik': not = not16([a0, a1, a2, a0 + 12]); break;
    case 'turun': not = not16([a0 + 12, a2, a1, a0]); break;
    case 'lebar': not = not16([a0, a1, a2, a0 + 12, a1 + 12, a2 + 12, a1 + 12, a0 + 12], 0.55); break;
    case 'skala': {
      const n0 = skalaDiBawah(atas + 2, k);
      const n1 = skalaTurun(n0, k), n2 = skalaTurun(n1, k), n3 = skalaTurun(n2, k);
      not = not16([n0, n1, n2, n3], 0.58);
      break;
    }
    case 'hiasan': not = not16([atas + 2, atas, atas - 1, atas], 0.55); break;
    case 'getar': { const t = skalaNaik(atas, k); not = not16([atas, t, atas, t], 0.5); break; }
    case 'geser': not = [{ langkah: mulai + 0.75, nada: atas - 1, faktor: 0.45 }, { langkah: mulai + 1, nada: atas, faktor: 0.7 }]; break;
    case 'oktaf': {
      let r = atas; while (r % 12 !== bas % 12) r++;
      not = not16([r, r + 12, r, r + 12], 0.5);
      break;
    }
    case 'sinkop': not = [a0, a1, a2].map((n) => ({ langkah: mulai + 1, nada: n, faktor: 0.75 })); break;
    case 'pompa': {
      const rendah = bas - 12 >= 28 ? bas - 12 : bas;
      not = not16([rendah, bas, rendah, bas], 0.75);
      break;
    }
    case 'bas': {
      const tujuan = voicingBerikut[0], arah = tujuan >= bas ? 1 : -1;
      not = [{ langkah: mulai, nada: tujuan - 2 * arah, faktor: 0.8 }, { langkah: mulai + 1, nada: tujuan - arah, faktor: 0.8 }];
      break;
    }
    case 'kromatik': {
      // akar akor berikutnya di register nada atas, didekati 3 not naik setengah-setengah
      let t = atas; while (t % 12 !== voicingBerikut[0] % 12) t++;
      not = [t - 3, t - 2, t - 1].map((n, i) => ({ langkah: mulai + 0.5 + i * 0.5, nada: n, faktor: 0.58 }));
      break;
    }
    default: return null;
  }
  return { nama: NAMA_ISIAN[j], jenis: j, mulai, not };
}

// ======================================================================================
// ISIAN PER GENRE dengan FRASA 4 BIRAMA
// Birama ke-1/3 frasa: isian kecil, ke-2: sedang, ke-4: besar (2 ketukan, menuju frasa baru).
// ======================================================================================

export const GENRE_ISIAN = [
  { id: 'genre:pop', nama: 'Pop' },
  { id: 'genre:balada', nama: 'Balada' },
  { id: 'genre:gospel', nama: 'Gospel' },
  { id: 'genre:jazz', nama: 'Jazz' },
  { id: 'genre:blues', nama: 'Blues' },
  { id: 'genre:rock', nama: 'Rock' },
  { id: 'genre:klasik', nama: 'Klasik' },
  { id: 'genre:rohani', nama: 'Rohani' },
  { id: 'genre:campuran', nama: 'Semua genre' },
];

/** Figur yang butuh akor berikutnya (dilewati bila tidak diketahui). */
const BUTUH_BERIKUT = new Set(['bas', 'kromatik', 'walkup', 'tritone', 'enclosure-tujuan', 'passing-dim', 'ii-v', 'oktaf-3176']);

const KOLAM_GENRE = {
  pop: { kecil: ['hiasan', 'geser', 'naik', 'oktaf'], sedang: ['turun', 'getar', 'sinkop', 'kromatik'], besar: ['lebar', 'skala-turun'] },
  balada: { kecil: ['geser', 'getar', 'hiasan'], sedang: ['turun', 'enam-lima', 'bas', 'sus4'], besar: ['lebar', 'skala-turun'] },
  gospel: { kecil: ['blue', 'enam-lima', 'geser'], sedang: ['bas', 'kromatik', 'sinkop', 'passing-dim'], besar: ['walkup', 'pentatonik', 'lebar', 'ii-v'] },
  // rohani / worship: pentatonis 2-3-5-6 (tanpa setengah nada, aman di atas akor apa pun), triad
  // bergantian, oktaf 3-1-7-6 menuju akor IV, dan "gospel drop" (akor lewat dim7, ii–V menuju)
  rohani: { kecil: ['penta-2356', 'geser', 'sus4'], sedang: ['sus4', 'penta-2356', 'passing-dim', 'enam-lima'], besar: ['oktaf-3176', 'ii-v', 'penta-lebar', 'triad-ganti'] },
  jazz: { kecil: ['enclosure', 'geser', 'getar'], sedang: ['tritone', 'kromatik', 'bas', 'enclosure'], besar: ['bebop', 'lebar'] },
  blues: { kecil: ['blue', 'getar', 'oktaf'], sedang: ['pompa', 'sinkop', 'blue'], besar: ['pentatonik', 'tremolo'] },
  rock: { kecil: ['stab', 'oktaf', 'pompa'], sedang: ['sinkop', 'blue', 'stab'], besar: ['pentatonik', 'tremolo'] },
  klasik: { kecil: ['hiasan', 'getar', 'naik'], sedang: ['turun', 'getar', 'enam-lima'], besar: ['skala-naik', 'skala-turun', 'lebar'] },
};
const NAMA_FIGUR = {
  ...NAMA_ISIAN,
  'skala-naik': 'tangga nada naik', 'skala-turun': 'tangga nada turun', blue: 'blue note', 'enam-lima': 'nada 6 ke 5',
  enclosure: 'enclosure', tritone: 'substitusi tritone', bebop: 'lari bebop', walkup: 'bas naik', pentatonik: 'lari pentatonik',
  tremolo: 'tremolo oktaf', stab: 'hentakan power chord',
  'penta-2356': 'pentatonik 2-3-5-6', 'penta-lebar': 'pentatonik lebar', 'oktaf-3176': 'oktaf 3-1-7-6',
  'triad-ganti': 'triad bergantian', 'passing-dim': 'lewat dim7', 'ii-v': 'lewat ii-V',
  sus4: 'sus4 lalu balik',
};

/** Ukuran isian menurut posisi birama dalam frasa 4 birama. */
export const UKURAN_FRASA = ['kecil', 'sedang', 'kecil', 'besar'];

const PENTA_MINOR = [0, 3, 5, 7, 10];
const BLUES = [0, 3, 5, 6, 7, 10];
const dalamSkala = (n, k, skala) => skala.includes((((n - k) % 12) + 12) % 12);
/** n nada skala berurutan turun mulai dari nada skala ≤ dari. */
function urutTurun(dari, k, skala, n) {
  const hasil = [];
  for (let m = dari; hasil.length < n && m > dari - 36; m--) if (dalamSkala(m, k, skala)) hasil.push(m);
  return hasil;
}
function urutNaik(dari, k, skala, n) {
  const hasil = [];
  for (let m = dari; hasil.length < n && m < dari + 36; m++) if (dalamSkala(m, k, skala)) hasil.push(m);
  return hasil;
}

/**
 * Satu figur isian. ctx: {akor, atas, bas, nb (bas akor berikutnya|null), k (kunci), P (langkah per birama)}.
 * @returns {{mulai:number, not:{langkah:number, nada:number, faktor:number}[]}|null}
 */
function figur(id, { akor, atas, bas, nb, k, P, voicingBerikutMinor = false }) {
  const a0 = akor[0], a1 = akor[1], a2 = akor[2] ?? akor[1] + 3;
  const satu = P - 2, dua = Math.max(0, P - 4);
  const s16 = (nada, dari, faktor = 0.6) => nada.map((n, i) => ({ langkah: dari + i * 0.5, nada: n, faktor }));
  const s8 = (nada, dari, faktor = 0.7) => nada.map((n, i) => ({ langkah: dari + i, nada: n, faktor }));
  // nada akar akor berikutnya di sekitar register nada atas
  const atasBerikut = () => { let t = atas; while (t % 12 !== nb % 12) t++; return t; };
  switch (id) {
    case 'naik': return { mulai: satu, not: s16([a0, a1, a2, a0 + 12], satu) };
    case 'turun': return { mulai: satu, not: s16([a0 + 12, a2, a1, a0], satu) };
    case 'hiasan': return { mulai: satu, not: s16([atas + 2, atas, atas - 1, atas], satu, 0.55) };
    case 'getar': { const t = urutNaik(atas + 1, k, MAYOR, 1)[0]; return { mulai: satu, not: s16([atas, t, atas, t], satu, 0.5) }; }
    case 'geser': return { mulai: satu, not: [{ langkah: satu + 0.75, nada: atas - 1, faktor: 0.45 }, { langkah: satu + 1, nada: atas, faktor: 0.7 }] };
    case 'oktaf': { let r = atas; while (r % 12 !== bas % 12) r++; return { mulai: satu, not: s16([r, r + 12, r, r + 12], satu, 0.5) }; }
    case 'sinkop': return { mulai: satu, not: [a0, a1, a2].map((n) => ({ langkah: satu + 1, nada: n, faktor: 0.75 })) };
    case 'pompa': { const r = bas - 12 >= 28 ? bas - 12 : bas; return { mulai: satu, not: s16([r, bas, r, bas], satu, 0.75) }; }
    case 'enam-lima': return { mulai: satu, not: s8([a2 + 2, a2], satu, 0.6) }; // nada ke-6 turun ke ke-5 (ciri gospel/balada)
    case 'blue': return { mulai: satu, not: [{ langkah: satu + 0.75, nada: a1 - 1, faktor: 0.45 }, { langkah: satu + 1, nada: a1, faktor: 0.65 }, { langkah: satu + 1.5, nada: a0 + 12, faktor: 0.55 }] };
    case 'stab': return { mulai: satu, not: [a0, a0 + 7, a0 + 12].flatMap((n) => [{ langkah: satu + 1, nada: n, faktor: 0.8 }, { langkah: satu + 1.5, nada: n, faktor: 0.6 }]) };
    case 'enclosure': return { mulai: satu, not: s16([atas + 1, atas - 1, atas], satu + 0.5, 0.58) }; // atas+1, atas-1, mendarat di nada target
    case 'bas': { const arah = nb >= bas ? 1 : -1; return { mulai: satu, not: s8([nb - 2 * arah, nb - arah], satu, 0.8) }; }
    case 'kromatik': { const t = atasBerikut(); return { mulai: satu, not: s16([t - 3, t - 2, t - 1], satu + 0.5, 0.58) }; }
    case 'tritone': {
      // dominan pengganti: akor 7 setengah nada di atas akar berikutnya, di "&" ketukan 4
      let r = nb + 1; while (r < a0) r += 12; while (r > a0 + 11) r -= 12;
      return { mulai: satu, not: [r, r + 4, r + 10].map((n) => ({ langkah: satu + 1, nada: n, faktor: 0.6 })) };
    }
    case 'lebar': return { mulai: dua, not: s16([a0, a1, a2, a0 + 12, a1 + 12, a2 + 12, a1 + 12, a0 + 12], dua, 0.55) };
    case 'skala-naik': return { mulai: dua, not: s16(urutNaik(a0, k, MAYOR, 8), dua, 0.55) };
    case 'skala-turun': return { mulai: dua, not: s16(urutTurun(atas + 4, k, MAYOR, 8), dua, 0.55) };
    case 'pentatonik': return { mulai: dua, not: s16(urutTurun(atas + 5, k, PENTA_MINOR, 8), dua, 0.6) };
    case 'tremolo': { let r = atas; while (r % 12 !== bas % 12) r++; return { mulai: dua, not: s16([r, r + 12, r, r + 12, r, r + 12, r, r + 12], dua, 0.48) }; }
    case 'bebop': {
      // skala bebop mayor: tangga nada mayor + nada lewat ♭6 (antara 6 & 5), turun
      return { mulai: dua, not: s16(urutTurun(atas + 5, k, [...MAYOR, 8], 8), dua, 0.55) };
    }
    case 'walkup': return { mulai: dua, not: s8([nb - 5, nb - 3, nb - 2, nb - 1], dua, 0.8) };
    // ---- rohani / worship ----
    case 'sus4': {
      // C → Csus4 → C: nada ke-3 naik ke ke-4 (gantung), lalu turun lagi sebelum akor berikutnya
      const akar = bas % 12;
      const terts = akor.find((n) => [3, 4].includes((((n - akar) % 12) + 12) % 12)) ?? a1;
      const empat = terts + ((((terts - akar) % 12) + 12) % 12 === 3 ? 2 : 1);
      const lain = akor.filter((n) => n !== terts);
      return {
        mulai: satu,
        not: [
          ...[...lain, empat].map((n) => ({ langkah: satu, nada: n, faktor: 0.55 })),
          { langkah: satu + 1, nada: terts, faktor: 0.6 },
        ],
      };
    }
    case 'penta-2356': return { mulai: satu, not: s16(urutNaik(Math.max(atas + 3, 72), k, [2, 4, 7, 9], 4), satu, 0.5) };
    case 'penta-lebar': {
      const naik = urutNaik(Math.max(atas + 3, 72), k, [2, 4, 7, 9], 6);
      return { mulai: dua, not: s16([...naik, naik[4], naik[3]], dua, 0.48) };
    }
    case 'oktaf-3176': {
      // derajat 3-1-7-6 turun, tiap nada dimainkan oktaf (jempol + kelingking)
      const tiga = urutTurun(Math.max(atas + 4, 76), k, [4], 1)[0];
      const nada = [tiga, ...urutTurun(tiga - 1, k, [0, 11, 9], 3)];
      return { mulai: dua, not: nada.flatMap((n, i) => [{ langkah: dua + i, nada: n, faktor: 0.62 }, { langkah: dua + i, nada: n - 12, faktor: 0.5 }]) };
    }
    case 'triad-ganti': {
      // triad akor sekarang bergantian dengan triad satu langkah tangga nada di atasnya (C ↔ Dm)
      const t1 = [a0, a1, a2];
      const t2 = t1.map((n) => urutNaik(n + 1, k, MAYOR, 1)[0]);
      return { mulai: dua, not: [t1, t2, t1, t2].flatMap((t, i) => t.map((n) => ({ langkah: dua + i, nada: n, faktor: 0.5 }))) };
    }
    case 'passing-dim': {
      // akor dim7 setengah nada di bawah akar berikutnya, di "&" ketukan 4 (G → G#dim → Am)
      let r = nb - 1; while (r < 36) r += 12; while (r > 52) r -= 12;
      let c = r; while (c < a0) c += 12;
      return { mulai: satu, not: [{ langkah: satu + 1, nada: r, faktor: 0.75 }, ...[0, 3, 6, 9].map((x) => ({ langkah: satu + 1, nada: c + x, faktor: 0.55 }))] };
    }
    case 'ii-v': {
      // dua akor jembatan menuju akor berikutnya: iiø–V7 bila tujuan minor, ii7–V7 bila mayor
      const minor = voicingBerikutMinor;
      const akorDi = (akar, interval) => { let c = akar; while (c < a0) c += 12; while (c > a0 + 11) c -= 12; return interval.map((x) => c + x); };
      const basDi = (akar) => { let r = akar; while (r < 36) r += 12; while (r > 52) r -= 12; return r; };
      const ii = (nb + 2) % 12, v = (nb + 7) % 12;
      const akorII = akorDi(ii, minor ? [0, 3, 6, 10] : [0, 3, 7, 10]);
      const akorV = akorDi(v, [0, 4, 7, 10]);
      return {
        mulai: dua,
        not: [
          { langkah: dua, nada: basDi(ii), faktor: 0.75 }, ...akorII.map((n) => ({ langkah: dua, nada: n, faktor: 0.55 })),
          { langkah: dua + 2, nada: basDi(v), faktor: 0.75 }, ...akorV.map((n) => ({ langkah: dua + 2, nada: n, faktor: 0.55 })),
        ],
      };
    }
    default: return null;
  }
}

/**
 * Isian bergaya genre untuk birama `bar` dalam frasa 4 birama.
 * @returns {null|{nama:string, jenis:string, ukuran:string, mulai:number, not:object[]}}
 */
export function isianGenre(voicing, { genre, bar = 0, panjangBirama = 8, voicingBerikut = null, kunci = null, ukuran: paksaUkuran }) {
  const akor = voicing.slice(1);
  const bas = voicing[0];
  const nb = voicingBerikut && voicingBerikut[0] % 12 !== bas % 12 ? voicingBerikut[0] : null;
  const ukuran = paksaUkuran ?? UKURAN_FRASA[bar % 4];
  const daftarGenre = genre === 'campuran' ? Object.keys(KOLAM_GENRE) : [genre];
  const g = daftarGenre[Math.floor(acakBar(bar, 5) * daftarGenre.length)];
  const k = kunci ?? bas % 12;
  // oktaf 3-1-7-6 khusus saat akor berikutnya adalah IV dari kunci
  const keIV = nb !== null && nb % 12 === (k + 5) % 12;
  const bisa = (id) => (nb !== null || !BUTUH_BERIKUT.has(id)) && (id !== 'oktaf-3176' || keIV);
  let kolam = (KOLAM_GENRE[g] ?? KOLAM_GENRE.pop)[ukuran].filter(bisa);
  // cadangan bila semua figur ukuran ini butuh akor berikutnya (main bebas): pakai figur pop
  if (!kolam.length) kolam = KOLAM_GENRE.pop[ukuran].filter(bisa);
  const pilih = (b) => kolam[Math.floor(acakBar(b, 9) * kolam.length)];
  let id = pilih(bar);
  // rohani: menjelang akor IV, utamakan isian oktaf 3-1-7-6 (seperti pianis gereja)
  if (keIV && kolam.includes('oktaf-3176') && acakBar(bar, 11) < 0.7) id = 'oktaf-3176';
  // jangan ulangi figur yang sama dengan birama berukuran sama sebelumnya (2 birama lalu)
  if (bar >= 2 && kolam.length > 1 && id === pilih(bar - 2)) id = kolam[(kolam.indexOf(id) + 1) % kolam.length];
  const voicingBerikutMinor = Boolean(voicingBerikut) && voicingBerikut.slice(1).some((n) => (((n - voicingBerikut[0]) % 12) + 12) % 12 === 3);
  const f = figur(id, { akor, atas: akor[akor.length - 1], bas, nb, k, P: panjangBirama, voicingBerikutMinor });
  if (!f) return null;
  return { nama: `${NAMA_FIGUR[id]}`, genre: g, jenis: id, ukuran, ...f };
}

// ======================================================================================
// ISIAN SATU TEKNIK: tiap figur bisa dipilih sendiri (id "f:<figur>"), selalu dimainkan.
// ======================================================================================
export const ISIAN_TUNGGAL = [
  { kelompok: 'Teknik rohani', daftar: ['penta-2356', 'penta-lebar', 'oktaf-3176', 'triad-ganti', 'sus4', 'passing-dim', 'ii-v'] },
  { kelompok: 'Teknik gospel & blues', daftar: ['blue', 'enam-lima', 'walkup', 'pentatonik', 'tremolo'] },
  { kelompok: 'Teknik jazz', daftar: ['enclosure', 'tritone', 'bebop', 'kromatik', 'bas'] },
  { kelompok: 'Teknik rock', daftar: ['stab', 'pompa', 'oktaf', 'sinkop'] },
  { kelompok: 'Teknik klasik & umum', daftar: ['naik', 'turun', 'lebar', 'skala-naik', 'skala-turun', 'hiasan', 'getar', 'geser'] },
].map((g) => ({ kelompok: g.kelompok, daftar: g.daftar.map((id) => ({ id: `f:${id}`, nama: NAMA_FIGUR[id][0].toUpperCase() + NAMA_FIGUR[id].slice(1) })) }));

/** Figur satu teknik; bila butuh akor berikutnya tapi tidak diketahui, menuju akor sekarang (turnaround). */
export function isianTunggal(voicing, { figurId, panjangBirama = 8, voicingBerikut = null, kunci = null }) {
  const akor = voicing.slice(1);
  const bas = voicing[0];
  const tujuan = voicingBerikut && voicingBerikut[0] % 12 !== bas % 12 ? voicingBerikut : null;
  // tanpa akor berikutnya: "menuju" akor sekarang (bas satu oktaf di atas agar figur tetap bergerak)
  const nb = tujuan ? tujuan[0] : bas + 12;
  const voicingBerikutMinor = tujuan
    ? tujuan.slice(1).some((n) => (((n - tujuan[0]) % 12) + 12) % 12 === 3)
    : akor.some((n) => (((n - bas) % 12) + 12) % 12 === 3);
  const f = figur(figurId, { akor, atas: akor[akor.length - 1], bas, nb, k: kunci ?? bas % 12, P: panjangBirama, voicingBerikutMinor });
  if (!f) return null;
  return { nama: NAMA_FIGUR[figurId], jenis: figurId, ukuran: f.mulai === panjangBirama - 2 ? 'kecil' : 'besar', ...f };
}

// ======================================================================================
// ISIAN GITAR: teknik gitaris di antara akor (hammer-on, pull-off, bass run, lick, chuck…).
// Not boleh berisi `akor: [...]` (beberapa senar sekaligus, dengan `arah`) dan `mati` (diredam).
// ======================================================================================
const NAMA_FIGUR_GITAR = {
  'hammer-sus4': 'hammer-on sus4', 'hammer-sus2': 'hammer-on sus2', lonceng: 'denting lonceng', 'arpeggio-petik': 'petik arpeggio',
  'bas-turun': 'bas turun', 'pull-off': 'pull-off', 'double-stop': 'slide dua senar', 'genjreng-16': 'genjreng 16-an',
  'bas-jalan': 'bas berjalan', 'lick-penta': 'lick pentatonik', 'bas-run': 'bas naik',
  'arpeggio-lebar-gitar': 'arpeggio lebar', 'lick-panjang': 'lick pentatonik panjang', chuck: 'genjreng redam',
  'power-slide': 'slide power chord', 'lick-blues': 'lick blues', 'lick-panjang-blues': 'lick blues panjang',
};

export const ISIAN_GITAR_TUNGGAL = [
  { kelompok: 'Gitar rohani', daftar: ['hammer-sus4', 'hammer-sus2', 'lonceng', 'arpeggio-petik', 'bas-turun'] },
  { kelompok: 'Gitar pop & akustik', daftar: ['pull-off', 'double-stop', 'genjreng-16', 'bas-jalan'] },
  { kelompok: 'Gitar folk & country', daftar: ['lick-penta', 'bas-run', 'arpeggio-lebar-gitar', 'lick-panjang'] },
  { kelompok: 'Gitar funk & rock', daftar: ['chuck', 'power-slide', 'lick-blues', 'lick-panjang-blues'] },
].map((g) => ({ kelompok: g.kelompok, daftar: g.daftar.map((id) => ({ id: `g:${id}`, nama: NAMA_FIGUR_GITAR[id][0].toUpperCase() + NAMA_FIGUR_GITAR[id].slice(1) })) }));

export const GENRE_ISIAN_GITAR = [
  { id: 'gg:rohani', nama: 'Rohani' },
  { id: 'gg:pop', nama: 'Pop & akustik' },
  { id: 'gg:folk', nama: 'Folk & country' },
  { id: 'gg:rock', nama: 'Funk & rock' },
  { id: 'gg:campuran', nama: 'Semua genre' },
];

const KOLAM_GITAR = {
  rohani: { kecil: ['hammer-sus4', 'lonceng', 'hammer-sus2'], sedang: ['arpeggio-petik', 'bas-turun', 'bas-jalan'], besar: ['arpeggio-lebar-gitar', 'bas-run'] },
  pop: { kecil: ['pull-off', 'hammer-sus2', 'double-stop'], sedang: ['genjreng-16', 'bas-jalan', 'arpeggio-petik'], besar: ['arpeggio-lebar-gitar', 'lick-panjang'] },
  folk: { kecil: ['hammer-sus4', 'pull-off', 'lick-penta'], sedang: ['bas-jalan', 'bas-turun', 'arpeggio-petik'], besar: ['bas-run', 'lick-panjang'] },
  rock: { kecil: ['power-slide', 'chuck', 'lick-blues'], sedang: ['chuck', 'double-stop', 'lick-blues'], besar: ['lick-panjang-blues', 'arpeggio-lebar-gitar'] },
};
const BUTUH_BERIKUT_GITAR = new Set(['bas-jalan']);
const PENTA_MAYOR = [0, 2, 4, 7, 9];

/** Naikkan/turunkan oktaf supaya nada masuk rentang gitar (E2–E6). */
const rentangGitar = (n) => { while (n < 40) n += 12; while (n > 88) n -= 12; return n; };

function figurGitar(id, { v, nb, k, P }) {
  const bas = v[0], atas = v[v.length - 1], akar = bas % 12;
  const satu = P - 2, dua = Math.max(0, P - 4);
  const s16 = (nada, dari, faktor = 0.6) => nada.map((n, i) => ({ langkah: dari + i * 0.5, nada: rentangGitar(n), faktor }));
  const s8 = (nada, dari, faktor = 0.7) => nada.map((n, i) => ({ langkah: dari + i, nada: rentangGitar(n), faktor }));
  const interval = (n) => (((n - akar) % 12) + 12) % 12;
  const atas3 = v.slice(-3);
  const terts = [...v.slice(1)].reverse().find((n) => [3, 4].includes(interval(n))) ?? atas3[1];
  const minor = interval(terts) === 3;
  switch (id) {
    case 'hammer-sus4': case 'hammer-sus2': {
      // senar atas dipetik dengan nada sus, lalu hammer-on ke terts (C → Csus4 → C)
      const sus = id === 'hammer-sus4' ? terts + (minor ? 2 : 1) : terts - (minor ? 1 : 2);
      const lain = atas3.filter((n) => n !== terts);
      return {
        mulai: satu,
        not: [{ langkah: satu, akor: [...lain, sus].sort((a, b) => a - b), arah: 'turun', faktor: 0.6 }, { langkah: satu + 0.5, nada: terts, faktor: 0.5 }],
      };
    }
    case 'lonceng': {
      let r = atas + 5; while (r % 12 !== akar) r++;
      return { mulai: satu, not: s16([r, r + 7, r + 12, r + 7], satu, 0.4) };
    }
    case 'arpeggio-petik': return { mulai: satu, not: s16([bas, v[2], v[3], v[4] ?? v[3] + 5], satu, 0.6) };
    case 'arpeggio-lebar-gitar': return { mulai: dua, not: s16([bas, v[1], v[2], v[3], v[4] ?? v[3] + 4, v[5] ?? v[3] + 7, v[4] ?? v[3] + 4, v[3]], dua, 0.55) };
    case 'bas-turun': return { mulai: satu, not: s8(urutTurun(bas - 1, k, MAYOR, 2), satu, 0.75) };
    case 'bas-jalan': { const arah = nb >= bas ? 1 : -1; return { mulai: satu, not: s8([nb - 2 * arah, nb - arah], satu, 0.75) }; }
    case 'bas-run': return { mulai: dua, not: s8([bas, ...urutNaik(bas + 1, k, MAYOR, 3)], dua, 0.72) };
    case 'pull-off': return { mulai: satu, not: s16([atas + 2, atas, v[v.length - 2]], satu, 0.55) };
    case 'double-stop': {
      const [a, b] = v.slice(-2);
      return { mulai: satu, not: [{ langkah: satu + 0.5, akor: [a - 1, b - 1], arah: 'naik', faktor: 0.45, pendek: true }, { langkah: satu + 1, akor: [a, b], arah: 'naik', faktor: 0.62 }] };
    }
    case 'genjreng-16': {
      const atas4 = v.slice(-4);
      return { mulai: satu, not: [0, 0.5, 1, 1.5].map((x, i) => ({ langkah: satu + x, akor: i % 2 ? [...atas4].reverse() : atas4, arah: i % 2 ? 'naik' : 'turun', faktor: i % 2 ? 0.4 : 0.52 })) };
    }
    case 'lick-penta': return { mulai: satu, not: s16(urutTurun(atas + 3, k, PENTA_MAYOR, 4), satu, 0.58) };
    case 'lick-panjang': return { mulai: dua, not: s16(urutTurun(atas + 5, k, PENTA_MAYOR, 8), dua, 0.55) };
    case 'lick-blues': return { mulai: satu, not: s16(urutTurun(atas + 3, k, BLUES, 4), satu, 0.6) };
    case 'lick-panjang-blues': return { mulai: dua, not: s16(urutTurun(atas + 5, k, BLUES, 8), dua, 0.58) };
    case 'chuck': return {
      mulai: satu,
      not: [
        { langkah: satu, akor: v.slice(), arah: 'turun', faktor: 0.55, mati: true },
        { langkah: satu + 0.5, akor: v.slice(-4).reverse(), arah: 'naik', faktor: 0.4, mati: true },
        { langkah: satu + 1, akor: v.slice(), arah: 'turun', faktor: 0.55, mati: true },
        { langkah: satu + 1.5, akor: atas3.slice().reverse(), arah: 'naik', faktor: 0.5 },
      ],
    };
    case 'power-slide': {
      const p = [bas, bas + 7, bas + 12];
      return { mulai: satu, not: [{ langkah: satu + 0.5, akor: p.map((n) => n - 2), arah: 'turun', faktor: 0.5, pendek: true }, { langkah: satu + 1, akor: p, arah: 'turun', faktor: 0.75 }] };
    }
    default: return null;
  }
}

/**
 * Isian gitar. jenis: 'mati' | 'g:<teknik>' (satu teknik) | 'gg:<genre>' (frasa 4 birama).
 * @returns {null|{nama, jenis, ukuran, mulai, not, genre?}}
 */
export function isianGitar(voicing, { jenis, bar = 0, panjangBirama = 8, voicingBerikut = null, kunci = null, ukuran: paksaUkuran }) {
  if (!jenis || jenis === 'mati') return null;
  const bas = voicing[0];
  const tujuan = voicingBerikut && voicingBerikut[0] % 12 !== bas % 12 ? voicingBerikut[0] : null;
  const k = kunci ?? bas % 12;
  const buat = (id, nb, extra = {}) => {
    const f = figurGitar(id, { v: voicing, nb, k, P: panjangBirama });
    return f && { nama: NAMA_FIGUR_GITAR[id], jenis: id, ukuran: f.mulai === panjangBirama - 2 ? 'kecil' : 'besar', ...extra, ...f };
  };
  if (jenis.startsWith('g:')) return buat(jenis.slice(2), tujuan ?? bas + 5); // tanpa akor berikutnya: menuju IV
  if (!jenis.startsWith('gg:')) return null;
  const genre = jenis.slice(3);
  const ukuran = paksaUkuran ?? UKURAN_FRASA[bar % 4];
  const daftarGenre = genre === 'campuran' ? Object.keys(KOLAM_GITAR) : [genre];
  const g = daftarGenre[Math.floor(acakBar(bar, 5) * daftarGenre.length)];
  const bisa = (id) => tujuan !== null || !BUTUH_BERIKUT_GITAR.has(id);
  let kolam = (KOLAM_GITAR[g] ?? KOLAM_GITAR.pop)[ukuran].filter(bisa);
  if (!kolam.length) kolam = KOLAM_GITAR.pop[ukuran].filter(bisa);
  const pilih = (b) => kolam[Math.floor(acakBar(b, 9) * kolam.length)];
  let id = pilih(bar);
  if (bar >= 2 && kolam.length > 1 && id === pilih(bar - 2)) id = kolam[(kolam.indexOf(id) + 1) % kolam.length];
  return buat(id, tujuan, { genre: g, ukuran });
}

// ======================================================================================
// POLA PETIK (TAB): tiap langkah = daftar senar yang dipetik (1 = e tinggi … 6 = E rendah).
// Langkah kosong [] = diam. Beberapa senar dalam satu langkah = dipetik bersamaan (pinch/strum).
// ======================================================================================
export const POLA_PETIK = [
  { id: 't-travis', nama: 'Travis picking · bas gantian dan melodi', tab: [[6, 1], [3], [4], [2], [6], [3], [4], [2]], birama: 4, resolusi: 2 },
  { id: 't-pima', nama: 'Arpeggio p-i-m-a', tab: [[6], [3], [2], [1], [6], [3], [2], [1]], birama: 4, resolusi: 2 },
  { id: 't-naikturun', nama: 'Arpeggio naik-turun', tab: [[6], [4], [3], [2], [1], [2], [3], [4]], birama: 4, resolusi: 2 },
  { id: 't-pinch', nama: 'Pinch · bas dan senar 1 bareng', tab: [[6, 1], [3], [2], [3], [4, 1], [3], [2], [3]], birama: 4, resolusi: 2 },
  { id: 't-balada', nama: 'Balada lembut', tab: [[6], [3], [2, 1], [3], [4], [3], [2, 1], [3]], birama: 4, resolusi: 2 },
  { id: 't-boomchicka', nama: 'Boom-chicka · gaya country', tab: [[6], [], [3, 2, 1], [], [4], [], [3, 2, 1], []], birama: 4, resolusi: 2 },
  { id: 't-cross', nama: 'Crosspicking · pakai pick', tab: [[3], [2], [1], [3], [2], [1], [3], [2]], birama: 4, resolusi: 2 },
  { id: 't-16', nama: 'Fingerstyle 16-an', tab: [[6, 1], [3], [2], [3], [5], [3], [2], [3], [4, 1], [3], [2], [3], [5], [3], [2], [3]], birama: 4, resolusi: 4 },
  { id: 't-waltz', nama: 'Waltz 3/4 petik', tab: [[6], [3], [2], [1], [2], [3]], birama: 3, resolusi: 2 },
].map((p) => ({ ...p, langkah: 'T'.repeat(p.tab.length) }));

/** Teks tab: "61 3 4 2 6 3 4 2" (angka = senar, "." = diam). */
export function tabKeTeks(tab) {
  return tab.map((s) => (s.length ? [...s].sort((a, b) => b - a).join('') : '.')).join(' ');
}

/** Baca teks tab menjadi daftar langkah sepanjang `panjang` (dipotong / ditambah diam). */
export function bacaTabTeks(teks, panjang) {
  const langkah = String(teks).trim().split(/\s+/).filter(Boolean).map((tok) => {
    const senar = [...new Set([...tok].map(Number).filter((n) => n >= 1 && n <= 6))];
    return senar.sort((a, b) => b - a);
  });
  while (langkah.length < panjang) langkah.push([]);
  return langkah.slice(0, panjang);
}

/** Label indikator untuk satu langkah tab: nomor senar, atau "·". */
export const labelTab = (senar) => (senar.length ? [...senar].sort((a, b) => b - a).join('') : '·');

/**
 * Nada untuk senar-senar yang dipetik.
 * @param {number[]} senarDipetik  nomor senar 1..6
 * @param {(number|null)[]} nadaSenar  nada tiap senar, indeks 0 = senar 6 … 5 = senar 1 (null = tidak dibunyikan)
 * Senar yang tidak dibunyikan di bentuk akor pindah ke senar yang lebih tinggi nadanya (mis. senar 6 pada C → senar 5).
 */
export function nadaTab(senarDipetik, nadaSenar) {
  const hasil = [];
  for (const k of senarDipetik) {
    let s = k;
    while (s >= 1 && nadaSenar[6 - s] == null) s--;
    if (s >= 1 && !hasil.includes(nadaSenar[6 - s])) hasil.push(nadaSenar[6 - s]);
  }
  return hasil.sort((a, b) => a - b);
}

/** Nada senar dari voicing (cadangan bila bentuk akor asli tidak tersedia): senar k = voicing[len − k]. */
export function senarDariVoicing(voicing) {
  return [6, 5, 4, 3, 2, 1].map((k) => voicing[voicing.length - k] ?? null);
}
