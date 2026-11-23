// Teori akor (modul murni, tanpa DOM): kunci lagu, akar per jari, jenis akor dari
// jumlah jari tangan kiri, nama akor, dan susunan nada (voicing) gitar & piano.

export const NADA_KRES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NADA_MOL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** Kunci yang lazim ditulis dengan mol. */
const KUNCI_MOL = new Set([5, 10, 3, 8, 1]); // F, Bb, Eb, Ab, Db

export const JARI = ['jempol', 'telunjuk', 'tengah', 'manis', 'kelingking'];

/**
 * Akar per jari tangan kanan, dalam TIGA BARIS (dipilih dari tinggi tangan kanan), sebagai
 * derajat relatif terhadap kunci lagu. Gabungan ketiganya memuat ke-12 akar (kres & mol).
 * kualitasAsli = jenis akor bila tangan kiri tidak terlihat.
 *   tengah: I IV V vi ii        (akor paling umum, seperti sebelumnya)
 *   atas  : iii ♭VII vii ♭III ♭VI (akor diatonis lain + pinjaman dari minor)
 *   bawah : ♭II ♯iv II III VI    (sisa kromatis + dominan sekunder mayor)
 */
export const BARIS = {
  atas: [
    { semitone: 4, romawi: 'iii', kualitasAsli: 'minor' },
    { semitone: 10, romawi: '♭VII', kualitasAsli: 'mayor' },
    { semitone: 11, romawi: 'vii', kualitasAsli: 'minor' },
    { semitone: 3, romawi: '♭III', kualitasAsli: 'mayor' },
    { semitone: 8, romawi: '♭VI', kualitasAsli: 'mayor' },
  ],
  tengah: [
    { semitone: 0, romawi: 'I', kualitasAsli: 'mayor' },
    { semitone: 5, romawi: 'IV', kualitasAsli: 'mayor' },
    { semitone: 7, romawi: 'V', kualitasAsli: 'mayor' },
    { semitone: 9, romawi: 'vi', kualitasAsli: 'minor' },
    { semitone: 2, romawi: 'ii', kualitasAsli: 'minor' },
  ],
  bawah: [
    { semitone: 1, romawi: '♭II', kualitasAsli: 'mayor' },
    { semitone: 6, romawi: '♯iv', kualitasAsli: 'minor' },
    { semitone: 2, romawi: 'II', kualitasAsli: 'mayor' },
    { semitone: 4, romawi: 'III', kualitasAsli: 'mayor' },
    { semitone: 9, romawi: 'VI', kualitasAsli: 'mayor' },
  ],
};
export const NAMA_BARIS = ['atas', 'tengah', 'bawah'];
/**
 * Mode kamera "kombinasi jari": tangan diam, ke-15 posisi dijangkau dengan memetik 1 jari
 * (baris tengah) atau pasangan (5 jari → tepat 10 pasangan untuk baris atas & bawah):
 * pasangan dengan jempol = ujung jempol menyentuh ujung jari; lainnya = 2 jari ditekuk bersamaan.
 * Pasangan bersebelahan dipakai untuk akor yang paling sering (iii, ♭VII, vii, ♭III).
 */
export const KOMBINASI = {
  atas: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 4]],
  tengah: [[0], [1], [2], [3], [4]],
  bawah: [[0, 2], [1, 3], [2, 4], [1, 4], [0, 3]],
};
const KUNCI_KOMBINASI = new Map();
for (const baris of NAMA_BARIS) KOMBINASI[baris].forEach((j, jari) => KUNCI_KOMBINASI.set(j.join('-'), { baris, jari }));

/** Jari yang dipetik ([a] atau [a,b]) → posisi {baris, jari}; null bila tidak dikenal. */
export function posisiKombinasi(jari) {
  const j = [...jari].sort((a, b) => a - b);
  return KUNCI_KOMBINASI.get(j.join('-')) ?? null;
}

/** Posisi (baris, jari) → jari tangan kanan yang dipetik dalam mode kombinasi. */
export function jariKombinasi(baris, jari) {
  return KOMBINASI[baris]?.[jari] ?? [jari];
}

/**
 * Teks singkat gerakannya: "telunjuk + tengah" (ditekuk bersamaan) atau, untuk pasangan
 * dengan jempol, "jempol sentuh telunjuk" (ujung jempol menyentuh ujung jari).
 */
export function teksKombinasi(baris, jari) {
  const j = jariKombinasi(baris, jari);
  if (j.length === 2 && j[0] === 0) return `jempol sentuh ${JARI[j[1]]}`;
  return j.map((i) => JARI[i]).join(' + ');
}

/**
 * Mode kamera "bentuk jari" (bawaan): tangan kanan diam MENGEPAL; bentuk jari yang dikeluarkan
 * memilih akor. Baris utama = hitungan 1–5 (paling mudah), bentuk lain untuk akor sisanya;
 * bentuk yang lebih sulit dibuat dipakai untuk akor yang jarang. Jari: 0 jempol … 4 kelingking.
 */
export const BENTUK = {
  tengah: [[1], [1, 2], [1, 2, 3], [1, 2, 3, 4], [0, 1, 2, 3, 4]],
  atas: [[0], [4], [0, 1, 4], [2, 3, 4], [0, 1, 2]],
  bawah: [[1, 2, 4], [0, 1, 2, 3], [0, 1], [1, 4], [0, 4]],
};
const NAMA_BENTUK = {
  '1': '☝️ telunjuk', '1-2': '✌️ 2 jari', '1-2-3': '3 jari', '1-2-3-4': '4 jari', '0-1-2-3-4': '🖐️ 5 jari',
  '0': '👍 jempol', '4': 'kelingking', '0-1-4': '🤟 jempol + telunjuk + kelingking', '2-3-4': 'tengah + manis + kelingking',
  '0-1-2': 'jempol + telunjuk + tengah', '1-2-4': 'telunjuk + tengah + kelingking', '0-1-2-3': 'semua kecuali kelingking',
  '0-1': 'jempol + telunjuk, bentuk L', '1-4': '🤘 telunjuk + kelingking', '0-4': '🤙 jempol + kelingking',
};
const KUNCI_BENTUK = new Map();
for (const baris of NAMA_BARIS) BENTUK[baris].forEach((j, jari) => KUNCI_BENTUK.set(j.join('-'), { baris, jari }));

/** Jari yang keluar (indeks 0..4) → posisi {baris, jari}; null bila bentuk tidak dipakai. */
export function posisiBentuk(jari) {
  return KUNCI_BENTUK.get([...jari].sort((a, b) => a - b).join('-')) ?? null;
}

/** Posisi → jari yang dikeluarkan dalam mode bentuk. */
export function jariBentuk(baris, jari) {
  return BENTUK[baris]?.[jari] ?? [jari];
}

/** Nama bentuk untuk ditampilkan, mis. "✌️ 2 jari". */
export function teksBentuk(baris, jari) {
  return NAMA_BENTUK[jariBentuk(baris, jari).join('-')];
}

/** Kompatibel dengan kode lama: baris tengah. */
export const DERAJAT_JARI = BARIS.tengah;

export const derajat = (jari, baris = 'tengah') => BARIS[baris][jari];

export const KUALITAS = {
  mayor: { interval: [0, 4, 7], akhiran: '' },
  minor: { interval: [0, 3, 7], akhiran: 'm' },
  dom7: { interval: [0, 4, 7, 10], akhiran: '7' },
  sus4: { interval: [0, 5, 7], akhiran: 'sus4' },
  sus2: { interval: [0, 2, 7], akhiran: 'sus2' },
  maj7: { interval: [0, 4, 7, 11], akhiran: 'maj7' },
  m7: { interval: [0, 3, 7, 10], akhiran: 'm7' },
  add9: { interval: [0, 4, 7, 14], akhiran: 'add9' },
  madd9: { interval: [0, 3, 7, 14], akhiran: 'madd9' },
};

/** Label untuk panduan tangan kiri (jumlah jari terangkat → jenis). */
export const PANDUAN_KIRI = [
  { jari: null, label: 'Ikut kunci lagu' },
  { jari: 0, label: 'Mayor' },
  { jari: 1, label: 'Minor' },
  { jari: 2, label: '7' },
  { jari: 3, label: 'Sus4' },
  { jari: 4, label: 'Maj7 / m7' },
  { jari: 5, label: 'Add9' },
];

/**
 * Jenis akor dari jumlah jari tangan kiri yang terangkat.
 * @param {number|null} jumlah  null = tangan kiri tidak terlihat
 * @param {'mayor'|'minor'} asli  kualitas diatonis akar ini
 */
export function kualitasDariKiri(jumlah, asli) {
  switch (jumlah) {
    case 0: return 'mayor';
    case 1: return 'minor';
    case 2: return 'dom7';
    case 3: return 'sus4';
    case 4: return asli === 'minor' ? 'm7' : 'maj7';
    case 5: return asli === 'minor' ? 'madd9' : 'add9';
    default: return asli;
  }
}

/**
 * Nama nada. Ejaan: `pref` 'mol'/'kres' bila diberikan; selain itu mengikuti kebiasaan kunci
 * (kunci F, B♭, E♭, A♭, D♭ memakai mol).
 */
/**
 * Ejaan global (dipilih pengguna atau diikutkan dari sheet): 'kres' (C#, F#), 'mol' (Db, Gb),
 * atau null = otomatis (ikut derajat & kebiasaan kunci).
 */
let ejaanGlobal = null;
export function aturEjaan(e) { ejaanGlobal = e === 'kres' || e === 'mol' ? e : null; }
export const ejaanAktif = () => ejaanGlobal;

export function namaNada(pc, kunci = 0, pref = null) {
  pref = ejaanGlobal ?? pref;
  const mol = pref ? pref === 'mol' : KUNCI_MOL.has(((kunci % 12) + 12) % 12);
  return (mol ? NADA_MOL : NADA_KRES)[((pc % 12) + 12) % 12];
}

/** Nama kunci dengan dua ejaan untuk nada hitam, mis. "C♯ / D♭". */
export function namaKunciLengkap(k) {
  const a = NADA_KRES[k], b = NADA_MOL[k];
  return a === b ? a : `${a.replace('#', '♯')} / ${b.replace('b', '♭')}`;
}

/** Ejaan akar menurut derajatnya: derajat ♭ → mol, ♯ → kres, lainnya ikut kunci. */
function ejaanDerajat(d) {
  return d.romawi.startsWith('♭') ? 'mol' : d.romawi.startsWith('♯') ? 'kres' : null;
}

/** Akar (pitch class 0..11) untuk jari ke-i pada kunci & baris tertentu. */
export function akarJari(i, kunci = 0, baris = 'tengah') {
  return (kunci + BARIS[baris][i].semitone) % 12;
}

/**
 * Akor lengkap untuk satu petikan.
 * @returns {{akar:number, kualitas:string, nama:string, pcs:number[], interval:number[], baris:string}}
 */
export function akorUntuk(jari, kunci = 0, jumlahKiri = null, baris = 'tengah') {
  const d = BARIS[baris][jari];
  const akar = (kunci + d.semitone) % 12;
  const kualitas = kualitasDariKiri(jumlahKiri, d.kualitasAsli);
  const { interval, akhiran } = KUALITAS[kualitas];
  const nama = namaNada(akar, kunci, ejaanDerajat(d)) + akhiran;
  return { akar, kualitas, interval, nama, baris, pcs: interval.map((x) => (akar + x) % 12) };
}

export const frekuensi = (midi) => 440 * 2 ** ((midi - 69) / 12);

/**
 * Voicing ala gitar: bas = akar di rentang E2–D#3, lalu nada akor disusun naik dengan
 * jarak ≥3 semitone sampai 6 senar atau melewati batas atas. Mirip bentuk akor terbuka.
 * Batas atas G4, atau bas + 21 untuk akar tinggi (supaya tetap ≥4 senar).
 */
export function batasAtasGitar(bas) {
  return Math.max(67, bas + 21);
}

/**
 * Tuning gitar. `geser` = selisih semitone semua senar terhadap standar (bentuk akor sama,
 * bunyinya bergeser). `basMin` = nada senar terendah (MIDI) untuk bentuk standar; Drop D
 * memungkinkan bas sampai D2.
 */
export const TUNING = [
  { id: 'standar', nama: 'Standar · E A D G B E', senar: 'E A D G B E', geser: 0, basMin: 40 },
  { id: 'turun-setengah', nama: 'Turun setengah · E♭ A♭ D♭ G♭ B♭ E♭', senar: 'Eb Ab Db Gb Bb Eb', geser: -1, basMin: 40 },
  { id: 'turun-satu', nama: 'Turun satu nada · D G C F A D', senar: 'D G C F A D', geser: -2, basMin: 40 },
  { id: 'drop-d', nama: 'Drop D · D A D G B E', senar: 'D A D G B E', geser: 0, basMin: 38 },
];
export const tuningDenganId = (id) => TUNING.find((t) => t.id === id) || TUNING[0];

/**
 * Transposisi bunyi gitar: bentuk akor (yang dimainkan jari) + capo + geser tuning.
 * Mis. bentuk G dengan capo 3 berbunyi B♭.
 */
export const transposisi = (capo = 0, tuningId = 'standar') => capo + tuningDenganId(tuningId).geser;

/** Nama akor yang benar-benar terdengar setelah capo/tuning. */
export function namaTerdengar(akor, geser, kunciBentuk = 0) {
  if (!geser) return akor.nama;
  const kunciBunyi = (((kunciBentuk + geser) % 12) + 12) % 12;
  return namaNada(akor.akar + geser, kunciBunyi) + KUALITAS[akor.kualitas].akhiran;
}

export function voicingGitar(akor, basPc = akor.akar, basMin = 40) {
  // bas: nada basPc terendah ≥ senar terendah (E2 = 40, atau D2 = 38 pada Drop D);
  // akor slash memakai nada bas tertulis
  const bas = basMin + (((basPc - basMin) % 12) + 12) % 12;
  const nada = [bas];
  const set = new Set(akor.pcs);
  const batas = batasAtasGitar(bas);
  let n = bas;
  while (nada.length < 6) {
    let k = n + 3;
    while (!set.has(k % 12) || k % 12 === n % 12) k++;
    if (k > batas) break;
    nada.push(k);
    n = k;
  }
  // Akor slash: pastikan akar tetap berbunyi. Ganti satu nada kembar (bukan bas) dengan akar
  // pada oktaf terdekat.
  if (basPc !== akor.akar && !nada.slice(1).some((m) => m % 12 === akor.akar)) {
    const hitung = (pc) => nada.filter((m) => m % 12 === pc).length;
    const i = nada.findIndex((m, j) => j > 0 && hitung(m % 12) > 1);
    const ganti = i > 0 ? i : nada.length - 1;
    const asal = nada[ganti];
    const bawah = asal - (((asal - akor.akar) % 12) + 12) % 12;
    nada[ganti] = asal - bawah <= (bawah + 12) - asal ? bawah : bawah + 12;
    if (nada[ganti] <= bas) nada[ganti] += 12;
    nada.sort((a, b) => a - b);
  }
  return nada;
}

/** Voicing piano: bas oktaf 3 + akor posisi rapat mulai dari C4 ke atas. */
export function voicingPiano(akor, basPc = akor.akar) {
  const atas = akor.akar <= 6 ? 60 + akor.akar : 48 + akor.akar; // akar di G3–F#4
  // bas: nada basPc tertinggi yang masih di bawah akor (akor slash: bas tertulis)
  const bas = atas - (((atas - basPc) % 12 + 12) % 12 || 12);
  return [bas, ...akor.interval.map((x) => atas + x)];
}

/** Progresi latihan (pola umum, bukan lagu tertentu). Tiap langkah: [jari, jumlahKiri]. */
// Progresi latihan: pola akor UMUM (bukan lagu tertentu). Tiap langkah: [jari, jumlahKiri, baris?]
// baris default 'tengah' (utama); 'atas' = iii ♭VII vii ♭III ♭VI, 'bawah' = ♭II ♯iv II III VI.
export const PROGRESI = [
  { nama: 'Pop empat akor', romawi: 'I–V–vi–IV', suasana: 'pop', langkah: [[0, null], [2, null], [3, null], [1, null]] },
  { nama: 'Balada', romawi: 'I–vi–IV–V', suasana: 'pop', langkah: [[0, null], [3, null], [1, null], [2, null]] },
  { nama: 'Pop sendu', romawi: 'vi–IV–I–V', suasana: 'pop', langkah: [[3, null], [1, null], [0, null], [2, null]] },
  { nama: 'Pop 50-an', romawi: 'I–vi–ii–V', suasana: 'pop', langkah: [[0, null], [3, null], [4, null], [2, null]] },
  { nama: 'Pop menanjak', romawi: 'I–iii–IV–V', suasana: 'pop', langkah: [[0, null], [0, null, 'atas'], [1, null], [2, null]] },
  { nama: 'Kanon Pachelbel', romawi: 'I–V–vi–iii–IV–I–IV–V', suasana: 'pop', langkah: [[0, null], [2, null], [3, null], [0, null, 'atas'], [1, null], [0, null], [1, null], [2, null]] },
  { nama: 'Ala J-pop', romawi: 'IV–V–iii–vi', suasana: 'pop', langkah: [[1, null], [2, null], [0, null, 'atas'], [3, null]] },
  { nama: 'Rock klasik', romawi: 'I–IV–V–IV', suasana: 'rock', langkah: [[0, null], [1, null], [2, null], [1, null]] },
  { nama: 'Rock mixolydian', romawi: 'I–♭VII–IV–I', suasana: 'rock', langkah: [[0, null], [1, null, 'atas'], [1, null], [0, null]] },
  { nama: 'Flamenco', romawi: 'vi–V–IV–III', suasana: 'rock', langkah: [[3, null], [2, null], [1, null], [3, null, 'bawah']] },
  { nama: 'Blues 12 birama', romawi: 'I7–IV7–I7–V7–IV7–I7', suasana: 'blues', langkah: [[0, 2], [0, 2], [0, 2], [0, 2], [1, 2], [1, 2], [0, 2], [0, 2], [2, 2], [1, 2], [0, 2], [2, 2]] },
  { nama: 'Gospel', romawi: 'I–IV–iv–I', suasana: 'blues', langkah: [[0, null], [1, null], [1, 1], [0, null]] },
  { nama: 'Jazz dasar', romawi: 'ii7–V7–Imaj7', suasana: 'jazz', langkah: [[4, 4], [2, 2], [0, 4]] },
  { nama: 'Turnaround jazz', romawi: 'Imaj7–vi7–ii7–V7', suasana: 'jazz', langkah: [[0, 4], [3, 4], [4, 4], [2, 2]] },
  { nama: 'Dominan sekunder', romawi: 'I–VI–ii–V', suasana: 'jazz', langkah: [[0, null], [4, null, 'bawah'], [4, null], [2, null]] },
  { nama: 'Sus mengambang', romawi: 'Isus4–I–Vsus4–V', suasana: 'pop', langkah: [[0, 3], [0, 0], [2, 3], [2, 0]] },
];
