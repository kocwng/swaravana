// Sheet akor lagu (modul murni): membaca nama akor, membaca sheet yang ditempel
// (format "akor di atas lirik" ala situs tab gitar, atau ChordPro [C]), memetakan tiap akor
// ke jari + tangan kiri, dan memilih kunci yang paling banyak bisa dimainkan.
import { BARIS, NAMA_BARIS, akorUntuk, namaNada, TUNING } from './teori.js';

const AKAR = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Jenis akor yang dikenali → jenis yang bisa dimainkan + apakah tepat atau pendekatan.
 * Jenis yang tidak ada di tangan kiri didekati ke yang terdekat (mis. 9 → 7, dim → m).
 */
const JENIS = [
  // [regex akhiran, kualitas target, tepat?]
  [/^$/, 'mayor', true],
  [/^(m|min|-)$/, 'minor', true],
  [/^7$/, 'dom7', true],
  [/^(sus4|sus)$/, 'sus4', true],
  [/^7sus4?$/, 'sus4', false],
  [/^(maj7|M7|Δ7?|ma7)$/, 'maj7', true],
  [/^(m7|min7|-7)$/, 'm7', true],
  [/^add9$/, 'add9', true],
  [/^(madd9|m\(add9\))$/, 'madd9', true],
  [/^sus2$/, 'add9', false],
  [/^2$/, 'add9', false],
  [/^(9|11|13)$/, 'dom7', false],
  [/^7[b#+-]\d+$/, 'dom7', false],
  [/^(maj9|M9|maj13|M13|maj7[#+]11)$/, 'maj7', false],
  [/^(m9|m11|m13)$/, 'm7', false],
  [/^add11$/, 'mayor', false],
  [/^(6|69|6\/9|5)$/, 'mayor', false],
  [/^(m6|mM7|mmaj7)$/, 'minor', false],
  [/^(dim7?|°7?|o7?|m7b5|ø7?)$/, 'minor', false],
  [/^(aug|\+)$/, 'mayor', false],
];

/** Pola token akor (tanpa jangkar), juga dipakai untuk mengenali baris akor. */
const POLA = /^([A-G])([#b]?)([^/\s]*)(?:\/([A-G][#b]?))?$/;

/**
 * @param {string} teks  mis. "F#m7", "Bb", "G/B", "Dsus4"
 * @returns {{akar:number, kualitas:string, tepat:boolean, asli:string}|null}
 */
export function bacaAkor(teks) {
  const m = POLA.exec(String(teks).trim());
  if (!m) return null;
  const akar = (AKAR[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  // Akor slash (G/B): nada bas disimpan dan ikut dimainkan, jadi tetap dihitung tepat.
  const bas = m[4] ? (AKAR[m[4][0]] + (m[4][1] === '#' ? 1 : m[4][1] === 'b' ? -1 : 0) + 12) % 12 : null;
  const akhiran = rapikanAkhiran(m[3]);
  for (const [re, kualitas, tepat] of JENIS) if (re.test(akhiran)) return { akar, kualitas, tepat, asli: m[0], bas };
  return null;
}

/**
 * Samakan penulisan akhiran dari berbagai situs: "Maj7"/"MAJ7" → "maj7", "Min7" → "m7",
 * "Sus4" → "sus4", "Add9"/"add2" → "add9", "(maj7)" → "maj7". "M" tunggal tetap besar karena
 * "M7" (maj7) beda dengan "m7".
 */
function rapikanAkhiran(s) {
  return s
    .replace(/[()]/g, '')
    .replace(/maj|min|sus|add|dim|aug/gi, (x) => x.toLowerCase())
    .replace(/^min(?=\d|$)/, 'm')
    .replace(/^maj$/, '')
    .replace(/^M$/, '')
    .replace(/add2$/, 'add9');
}

/** Jumlah jari kiri yang menghasilkan `kualitas` pada jari dengan kualitas asli `asli`. */
function jariKiriUntuk(kualitas, asli) {
  if (kualitas === asli) return { kiri: null, tepat: true }; // cukup otomatis
  switch (kualitas) {
    case 'mayor': return { kiri: 0, tepat: true };
    case 'minor': return { kiri: 1, tepat: true };
    case 'dom7': return { kiri: 2, tepat: true };
    case 'sus4': return { kiri: 3, tepat: true };
    case 'maj7': return asli === 'mayor' ? { kiri: 4, tepat: true } : { kiri: 0, tepat: false };
    case 'm7': return asli === 'minor' ? { kiri: 4, tepat: true } : { kiri: 1, tepat: false };
    case 'add9': return asli === 'mayor' ? { kiri: 5, tepat: true } : { kiri: 0, tepat: false };
    case 'madd9': return asli === 'minor' ? { kiri: 5, tepat: true } : { kiri: 1, tepat: false };
    default: return { kiri: null, tepat: false };
  }
}

/**
 * Petakan akor ke baris + jari tangan kanan + jumlah jari kiri pada kunci tertentu.
 * Karena tiga baris memuat ke-12 akar, setiap akor yang terbaca selalu bisa dimainkan.
 * Pilihan terbaik: tepat > tanpa tangan kiri > baris tengah (tangan paling sedikit bergerak).
 * @returns {{baris:string, jari:number, kiri:number|null, tepat:boolean, main:string}|null}
 */
export function petakanAkor(akor, kunci) {
  if (!akor) return null;
  let terbaik = null, skorTerbaik = Infinity;
  for (const baris of NAMA_BARIS) {
    BARIS[baris].forEach((d, jari) => {
      if ((kunci + d.semitone) % 12 !== akor.akar) return;
      const { kiri, tepat } = jariKiriUntuk(akor.kualitas, d.kualitasAsli);
      const skor = (tepat ? 0 : 4) + (kiri === null ? 0 : 1) + (baris === 'tengah' ? 0 : 1.5);
      if (skor < skorTerbaik) {
        skorTerbaik = skor;
        terbaik = { baris, jari, kiri, tepat: tepat && akor.tepat, main: akorUntuk(jari, kunci, kiri, baris).nama, bas: akor.bas ?? null };
      }
    });
  }
  return terbaik;
}

/**
 * Pilih kunci (0..11) yang membuat lagu paling nyaman dimainkan: sebanyak mungkin akor di
 * baris tengah dan tepat. Seri → utamakan akor pertama sebagai I.
 */
export function pilihKunci(daftar) {
  const unik = daftar.filter(Boolean);
  let terbaik = 0, skorTerbaik = -1;
  for (let k = 0; k < 12; k++) {
    let skor = 0;
    for (const a of unik) {
      const p = petakanAkor(a, k);
      if (p) skor += (p.tepat ? 1 : 0.6) * (p.baris === 'tengah' ? 1 : 0.55);
    }
    if (unik[0] && unik[0].akar === k) skor += 0.01;
    if (skor > skorTerbaik) { skorTerbaik = skor; terbaik = k; }
  }
  return terbaik;
}

const TOKEN_BUKAN_AKOR = /^(\||:?\|\|?:?|x\d+|\(?\d+x\)?|\/|-|N\.?C\.?|\.\.\.?|%)$/i;

/** Apakah satu baris berisi akor saja (baris akor di atas lirik). */
export function barisAkor(baris) {
  const token = baris.trim().split(/\s+/).filter(Boolean);
  if (!token.length) return false;
  let akor = 0;
  for (const t of token) {
    if (TOKEN_BUKAN_AKOR.test(t)) continue;
    if (!bacaAkor(t)) return false;
    akor++;
  }
  return akor > 0;
}

/**
 * Baca sheet yang ditempel. Mengenali:
 *  - baris akor di atas lirik ("C       G       Am")
 *  - ChordPro inline ("[C]kata [G]kata")
 *  - bar ("| C | G | Am | F |")
 *  - label bagian ("[Verse]", "Chorus:") dilewati sebagai judul bagian
 * @returns {{baris: {jenis:'akor'|'teks'|'bagian', isi:string, akor?:{posisi:number, teks:string, akor:object|null}[]}[], urutan: object[]}}
 */
export function bacaSheet(teks) {
  const baris = [];
  const urutan = [];
  let nomorBaris = -1; // nomor baris akor (untuk "akhir kalimat": akor terakhir tiap baris)
  for (const mentah of String(teks).replace(/\r/g, '').split('\n')) {
    const b = mentah.replace(/\t/g, '    ');
    const bagian = /^\s*\[(intro|verse|chorus|reff?|bridge|outro|pre-?chorus|interlude|instrumental|coda|[a-z ]*\d*)\]\s*$/i.exec(b)
      || /^\s*(intro|verse|chorus|reff?|bridge|outro|interlude)\s*\d*\s*:?\s*$/i.exec(b);
    if (bagian && !barisAkor(b.replace(/[[\]]/g, ''))) { baris.push({ jenis: 'bagian', isi: b.trim().replace(/^\[|\]$/g, '') }); continue; }
    if (/\[[A-G][^\]]*\]/.test(b) && !barisAkor(b)) {
      // ChordPro: pisahkan akor ke baris akor di atas lirik
      let lirik = '', akorBaris = [];
      for (const bagianTeks of b.split(/(\[[^\]]+\])/)) {
        const m = /^\[([^\]]+)\]$/.exec(bagianTeks);
        if (m && bacaAkor(m[1])) { akorBaris.push({ posisi: lirik.length, teks: m[1], akor: bacaAkor(m[1]), baris: nomorBaris + 1 }); }
        else lirik += bagianTeks;
      }
      baris.push({ jenis: 'akor', isi: '', akor: akorBaris });
      urutan.push(...akorBaris);
      if (akorBaris.length) nomorBaris++;
      if (lirik.trim()) baris.push({ jenis: 'teks', isi: lirik });
      continue;
    }
    if (barisAkor(b)) {
      const akorBaris = [];
      for (const m of b.matchAll(/\S+/g)) {
        if (TOKEN_BUKAN_AKOR.test(m[0])) continue;
        akorBaris.push({ posisi: m.index, teks: m[0], akor: bacaAkor(m[0]), baris: nomorBaris + 1 });
      }
      baris.push({ jenis: 'akor', isi: b, akor: akorBaris });
      urutan.push(...akorBaris);
      if (akorBaris.length) nomorBaris++;
      continue;
    }
    baris.push({ jenis: 'teks', isi: b });
  }
  return { baris, urutan };
}

export function namaKunci(k) {
  return `${namaNada(k, k)} mayor`;
}

/**
 * Lagu bawaan: lagu tradisional / domain publik. Isinya AKOR SAJA (tanpa lirik) dengan
 * aransemen sederhana buatan sendiri, satu akor per birama. Akor lain bisa dicoba lewat
 * "tempel sheet".
 */
/**
 * Saran iringan untuk lagu rohani: tempo, gaya iringan piano/gitar, isian piano/gitar, dan isian di
 * akhir kalimat saja ("kurang itu lebih").
 */
const SARAN_34 = (tempo) => ({ tempo, ketukPerAkor: 3, polaPiano: 'p-rohani-waltz', polaGitar: 'waltz', isianPiano: 'f:penta-2356', isianGitar: 'g:hammer-sus4', kapan: 'kalimat' });
const SARAN_44 = (tempo, polaPiano, polaGitar, isianPiano, isianGitar) => ({ tempo, ketukPerAkor: 4, polaPiano, polaGitar, isianPiano, isianGitar, kapan: 'kalimat' });

export const LAGU = [
  {
    judul: 'Burung Kakatua', asal: 'Lagu rakyat Maluku', birama: '4/4',
    sheet: '[Bagian A]\n| C | C | G | G |\n| G | G | C | C |\n[Bagian B]\n| C | C | F | F |\n| G | G | C | C |',
  },
  {
    judul: 'Rasa Sayange', asal: 'Lagu rakyat Maluku', birama: '4/4',
    sheet: '[Bagian A]\n| C | C | C | G |\n| G | G | G | C |\n[Reff]\n| C | C | F | F |\n| G | G | C | C |',
  },
  {
    judul: 'Naik-Naik ke Puncak Gunung', asal: 'Lagu anak tradisional', birama: '3/4',
    sheet: '[Bagian A]\n| C | C | G | C |\n| C | C | G | C |\n[Bagian B]\n| F | C | G | C |\n| F | C | G | C |',
  },
  {
    judul: 'Soleram', asal: 'Lagu rakyat Riau', birama: '4/4',
    sheet: '[Bagian A]\n| C | C | G | C |\n| C | C | G | C |\n[Bagian B]\n| F | C | G | C |\n| F | C | G7 | C |',
  },
  {
    judul: 'Amazing Grace', asal: 'Himne lama, domain publik', birama: '3/4', kategori: 'rohani',
    sheet: '[Bait]\n| G | G7 | C | G |\n| G | Em | D | D7 |\n| G | G7 | C | G |\n| G | D7 | G | G |',
    saran: SARAN_34(72),
  },
  {
    judul: 'Twinkle Twinkle Little Star', asal: 'Lagu anak tradisional', birama: '4/4',
    sheet: '[Bagian A]\n| C | F C | F C | G C |\n[Bagian B]\n| C F | C G | C F | C G |\n[Bagian A]\n| C | F C | F C | G C |',
  },
  {
    judul: 'Latihan jazz ii–V–I', asal: 'Bahan latihan, bukan lagu', birama: '4/4',
    sheet: '| Dm7 | G7 | Cmaj7 | Cmaj7 |\n| Dm7 | G7 | Cmaj7 | Am7 |',
  },
  // ---- lagu rohani: himne & spiritual DOMAIN PUBLIK; akor saja, aransemen sederhana ----
  {
    judul: 'Malam Kudus', asal: 'Himne Natal tahun 1818, domain publik', birama: '3/4', kategori: 'rohani',
    sheet: '[Bait]\n| C | C | C | C |\n| G7 | G7 | C | C |\n| F | F | C | C |\n| F | F | C | C |\n| G7 | G7 | C | C |\n| C | G7 | C | C |',
    saran: SARAN_34(66),
  },
  {
    judul: 'Joy to the World', asal: 'Himne Natal klasik, domain publik', birama: '4/4', kategori: 'rohani',
    sheet: '[Bait]\n| D | A7 D | G A7 | D |\n| D | D | D | D A7 |\n| D | G D | D A7 | D |',
    saran: SARAN_44(96, 'p-rohani-himne', 'pop', 'f:oktaf-3176', 'g:bas-jalan'),
  },
  {
    judul: 'What a Friend We Have in Jesus', asal: 'Himne tahun 1868, domain publik', birama: '4/4', kategori: 'rohani',
    sheet: '[Bait]\n| G | C G | G | D |\n| G | C G | G D | G |\n[Bagian B]\n| D | G | D | G |\n| G | C G | G D | G |',
    saran: SARAN_44(80, 'p-rohani-1581', 'balada', 'f:penta-2356', 'g:hammer-sus4'),
  },
  {
    judul: 'It Is Well with My Soul', asal: 'Himne tahun 1876, domain publik', birama: '4/4', kategori: 'rohani',
    sheet: '[Bait]\n| C | F C | C | G |\n| C | F C | C G | C |\n[Reff]\n| G | C | G7 | C |\n| F | C | G7 | C |',
    saran: SARAN_44(70, 'p-rohani-alir', 'arpeggio', 'f:sus4', 'g:arpeggio-petik'),
  },
  {
    judul: 'Blessed Assurance', asal: 'Himne tahun 1873, domain publik', birama: '3/4', kategori: 'rohani',
    sheet: '[Bait]\n| D | D | A | A |\n| D | G | D A | D |\n[Reff]\n| D | G | D | A |\n| D | G | D A | D |',
    saran: SARAN_34(84),
  },
  {
    judul: 'Kumbaya', asal: 'Lagu spiritual tradisional, domain publik', birama: '4/4', kategori: 'rohani',
    sheet: '[Bait]\n| C | F C | C | G |\n| C | F C | F G | C |',
    saran: SARAN_44(76, 'p-rohani-pad', 'arpeggio', 'f:penta-2356', 'g:lonceng'),
  },
  {
    judul: 'Oh When the Saints', asal: 'Lagu spiritual tradisional, domain publik', birama: '4/4', kategori: 'rohani',
    sheet: '[Bait]\n| C | C | C | G |\n| C | C7 F | C G | C |',
    saran: SARAN_44(120, 'p-rohani-sinkop', 'pop', 'genre:gospel', 'gg:pop'),
  },
  {
    judul: 'Swing Low, Sweet Chariot', asal: 'Lagu spiritual abad ke-19, domain publik', birama: '4/4', kategori: 'rohani',
    sheet: '[Reff]\n| C | F C | C | G |\n| C | F C | C G | C |',
    saran: SARAN_44(72, 'p-rohani-1581', 'balada', 'f:passing-dim', 'g:bas-turun'),
  },
];

/** Pitch class dari nama nada ("Bb", "F#", "Eb"…), atau null. */
function pcNada(t) {
  const m = /^([A-G])([#b]?)$/.exec(t);
  if (!m) return null;
  return (AKAR[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
}

/**
 * Baca info header sheet (format umum situs tab gitar):
 *   "Tuning: E A D G B E", "Capo: 3rd fret" / "Capo 2" / "No capo", "Key: Bb" / "Key: Am".
 * @returns {{capo:number|null, tuning:string|null, kunci:number|null, minor:boolean}}
 *   tuning = id dari TUNING bila dikenali; kunci = pitch class kunci TERDENGAR.
 */
export function bacaInfoSheet(teks) {
  const info = { capo: null, tuning: null, kunci: null, minor: false };
  for (const baris of String(teks).split('\n')) {
    const capo = /\bcapo\b\s*[:\-]?\s*(?:on\s+)?(?:fret\s*)?(\d{1,2})/i.exec(baris);
    if (capo) info.capo = Math.min(12, Number(capo[1]));
    else if (/\b(no|tanpa)\s+capo\b|\bcapo\s*[:\-]?\s*(none|tidak ada|-)\s*$/i.test(baris)) info.capo = 0;
    const tun = /\btuning\s*[:\-]\s*(.+)$/i.exec(baris);
    if (tun) {
      const nada = tun[1].trim().split(/[\s,]+/).filter(Boolean).map(pcNada);
      if (nada.length === 6 && nada.every((x) => x !== null)) {
        const cocok = TUNING.find((t) => t.senar.split(' ').map(pcNada).every((pc, i) => pc === nada[i]));
        info.tuning = cocok ? cocok.id : null;
      } else if (/standard|standar/i.test(tun[1])) info.tuning = 'standar';
      else if (/half\s*step\s*down|eb\s*standard|turun\s*½/i.test(tun[1])) info.tuning = 'turun-setengah';
      else if (/drop\s*d/i.test(tun[1])) info.tuning = 'drop-d';
    }
    const key = /\bkey\s*[:\-]\s*([A-G][#b]?)(m(?!aj)|min(?:or)?)?\b/i.exec(baris);
    if (key) { info.kunci = pcNada(key[1][0].toUpperCase() + key[1].slice(1)); info.minor = Boolean(key[2]); }
  }
  return info;
}

/** Ejaan yang dipakai sheet: 'kres' bila lebih banyak #, 'mol' bila lebih banyak b, else null. */
export function ejaanSheet(urutan) {
  let kres = 0, mol = 0;
  for (const a of urutan) {
    for (const m of String(a.teks).matchAll(/[A-G]([#b])/g)) m[1] === '#' ? kres++ : mol++;
  }
  return kres > mol ? 'kres' : mol > kres ? 'mol' : null;
}

/** Tandai akor terakhir di tiap baris sheet (akhir kalimat lirik) → array boolean sejajar urutan. */
export function akhirBaris(urutan) {
  return urutan.map((a, i) => i === urutan.length - 1 || urutan[i + 1].baris !== a.baris);
}
