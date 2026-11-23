// Swaravana: menyatukan pelacak tangan, deteksi gestur, teori akor, dan mesin suara.
import { akorUntuk, voicingGitar, voicingPiano, JARI, BARIS, NAMA_BARIS, PANDUAN_KIRI, PROGRESI, kualitasDariKiri, KUALITAS, namaKunciLengkap, TUNING, tuningDenganId, transposisi, namaTerdengar, aturEjaan, KOMBINASI, posisiKombinasi, teksKombinasi, BENTUK, posisiBentuk, teksBentuk, jariBentuk } from './teori.js';
import { ekstensiJari, PemicuJari, PemicuKombinasi, PemicuSentuh, PemicuBentuk, jumlahTerangkat, PenstabilJumlah, bagiTangan, PemilihBaris, DeteksiKepalan } from './gestur.js';
import { MesinSuara } from './suara.js';
import { PemutarPola } from './pemutar.js';
import { POLA, POLA_PIANO, POLA_PETIK, tabKeTeks, bacaTabTeks, labelTab, ISIAN_PIANO, GENRE_ISIAN, ISIAN_TUNGGAL, ISIAN_GITAR_TUNGGAL, GENRE_ISIAN_GITAR, labelLangkah, bacaPolaTeks, labelHitungan, panjangPola, SIKLUS_KOTAK } from './pola.js';
import { LAGU, bacaSheet, petakanAkor, pilihKunci, namaKunci, bacaInfoSheet, ejaanSheet, akhirBaris } from './lagu.js';
import { Pelacak } from './pelacak.js';
import { svgGitar, svgPiano } from './gambar-diagram.js';
import { Koleksi } from './koleksi.js';
import { bentukGitar, SENAR_STANDAR } from './diagram.js';
import { susunPemula } from './pemula.js';

const $ = (id) => document.getElementById(id);
/** Perangkat sentuh (HP/tablet): petunjuk keyboard diganti "ketuk pad". Fungsi, supaya ikut berubah bila perangkat berganti mode. */
const layarSentuh = () => matchMedia('(pointer: coarse)').matches;
const el = {
  status: $('status'), video: $('video'), kanvas: $('kanvas'), layar: $('layar'), sambutan: $('sambutan'), galat: $('galat'),
  mulai: $('tombol-mulai'), tanpaKamera: $('tombol-tanpa-kamera'), pad: $('pad'),
  akorBesar: $('akor-besar'), akorSub: $('akor-sub'), kunci: $('kunci'), volume: $('volume'),
  kiriKini: $('kiri-kini'), panduan: $('panduan-kiri'), progresi: $('progresi'), latihan: $('latihan'),
  target: $('target'), urutan: $('urutan'), skor: $('skor'), statistik: $('statistik'),
};

const suara = new MesinSuara();
const pemutar = new PemutarPola(suara);
const pelacak = new Pelacak(el.video);
const pemicuSatu = new PemicuJari(); // mode tinggi tangan / baris utama: 1 jari
const pemicuKombinasi = new PemicuKombinasi(); // mode kombinasi: 1 jari / 2 jari ditekuk bersamaan
const pemicuSentuh = new PemicuSentuh(); // mode kombinasi: ujung jempol menyentuh ujung jari lain
const pemicuBentuk = new PemicuBentuk(); // mode bentuk (bawaan): kepal = diam, jari dikeluarkan = akor
const penstabil = new PenstabilJumlah(3);
const pemilihBaris = new PemilihBaris();
const deteksiKepalan = new DeteksiKepalan();

const keadaan = {
  kunci: Number(localStorageAman('akor.kunci') ?? 0), // kunci BENTUK (jari)
  capo: Number(localStorageAman('akor.capo') ?? 0),
  tuning: tuningDenganId(localStorageAman('akor.tuning')).id,
  kiriKamera: null, // jumlah jari kiri dari kamera (stabil) atau null
  kiriKeyboard: null, // tombol angka yang sedang ditahan
  tanganAkor: null, tanganKiri: null, eksAkor: null, aspek: 4 / 3,
  barisKamera: 'tengah', // baris akor dari tinggi tangan kanan
  nyala: new Map(), // `${baris}:${jari}` -> waktu terakhir dipetik (untuk kilat visual)
  latihan: null, // {p, i, benar, salah}
  ikutiSheet: localStorageAman('akor.ikuti') !== '0', // false = main bebas, sheet hanya referensi
  sentuhan: Number(localStorageAman('akor.sentuhan')) || 0.45, // default lembut: dipetik pelan
  // cara memilih akor di kamera: 'kombinasi' (1 atau 2 jari, tangan diam), 'tinggi' (tinggi tangan = baris), 'utama' (5 akor saja)
  // (kunci simpan .v2: mode "bentuk" jadi bawaan baru, pilihan lama tidak menimpanya)
  // mode pemula: pad hanya berisi akor dari sheet/progresi yang dimuat, tangan kiri tidak dipakai
  pemula: localStorageAman('akor.pemula') === '1',
  modeKamera: ['bentuk', 'kombinasi', 'tinggi', 'utama'].includes(localStorageAman('akor.modeKamera.v2')) ? localStorageAman('akor.modeKamera.v2') : 'bentuk',
};
let pemicu = keadaan.modeKamera === 'kombinasi' ? pemicuKombinasi : pemicuSatu;

function localStorageAman(k, v) {
  try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* mode privat */ }
  return null;
}

const jumlahKiri = () => keadaan.kiriKeyboard ?? keadaan.kiriKamera;

/** Mode pemula sedang berlaku: dinyalakan dan ada sheet/progresi yang akornya sudah dipasang di pad. */
const pemulaAktif = () => Boolean(keadaan.pemula && keadaan.latihan?.slotPemula && Object.keys(keadaan.latihan.slotPemula).length);
/** Isi pad (baris, jari) di mode pemula, atau null (pad kosong / mode biasa). */
const slotPemula = (baris, jari) => (pemulaAktif() ? keadaan.latihan.slotPemula[`${baris}:${jari}`] ?? null : null);
/** Akor sebuah pad. Mode pemula: akor sheet yang dipasang di pad itu (tangan kiri diabaikan), null bila kosong. */
function akorPad(jari, kiri, baris) {
  if (!pemulaAktif()) return akorUntuk(jari, keadaan.kunci, kiri, baris);
  const s = slotPemula(baris, jari);
  return s ? akorUntuk(s.sumber.jari, keadaan.kunci, s.sumber.kiri, s.sumber.baris) : null;
}
/** Nama yang ditampilkan di pad / overlay: mode pemula memakai ejaan seperti tertulis di sheet. */
function namaPad(jari, kiri, baris) {
  if (!pemulaAktif()) return akorUntuk(jari, keadaan.kunci, kiri, baris).nama;
  return slotPemula(baris, jari)?.nama ?? '–';
}
/** Pergeseran bunyi (semitone) dari capo + tuning. */
const geserBunyi = () => transposisi(keadaan.capo, keadaan.tuning);
const kunciTerdengar = () => (((keadaan.kunci + geserBunyi()) % 12) + 12) % 12;
/** Voicing yang dibunyikan: bentuk akor → nada sungguhan (capo/tuning). */
function voicingBunyi(a, bas) {
  const g = geserBunyi();
  const v = suara.instrumen === 'gitar' ? voicingGitar(a, bas, tuningDenganId(keadaan.tuning).basMin) : voicingPiano(a, bas);
  return v.map((m) => m + g);
}

// ------------------------------------------------------------------ pengaturan
for (let k = 0; k < 12; k++) {
  const o = document.createElement('option');
  o.value = k;
  o.textContent = `${namaKunciLengkap(k)} mayor`;
  el.kunci.append(o);
}
el.kunci.value = keadaan.kunci;
el.kunci.addEventListener('change', () => gantiKunci(Number(el.kunci.value)));
function gantiKunci(k) {
  keadaan.kunci = k;
  el.kunci.value = k;
  localStorageAman('akor.kunci', String(keadaan.kunci));
  isiBunyi();
  panaskanSampel();
  if (keadaan.latihan) hitungTarget();
  perbaruiTampilan();
}

// ------------------------------------------------------------------ ejaan nada (♯ / ♭)
// Otomatis: ikut ejaan sheet yang dimuat (bila ada #/b), selain itu ikut kebiasaan kunci.
const pilihEjaan = document.getElementById('ejaan');
pilihEjaan.value = ['kres', 'mol'].includes(localStorageAman('akor.ejaan')) ? localStorageAman('akor.ejaan') : 'otomatis';
function terapkanEjaan(gambarUlang = true) {
  const pilihan = pilihEjaan.value;
  aturEjaan(pilihan === 'otomatis' ? keadaan.ejaanSheet : pilihan);
  if (!gambarUlang) return;
  if (keadaan.latihan) hitungTarget();
  perbaruiTampilan();
}
pilihEjaan.addEventListener('change', () => { localStorageAman('akor.ejaan', pilihEjaan.value); terapkanEjaan(); });
terapkanEjaan(false);

// ------------------------------------------------------------------ tuning & capo
const pilihTuning = document.getElementById('tuning');
const pilihCapo = document.getElementById('capo');
const pilihKunciBunyi = document.getElementById('kunci-terdengar');
for (const t of TUNING) { const o = document.createElement('option'); o.value = t.id; o.textContent = t.nama; pilihTuning.append(o); }
for (let c = 0; c <= 12; c++) { const o = document.createElement('option'); o.value = c; o.textContent = c ? `Fret ${c}` : 'Tanpa capo'; pilihCapo.append(o); }
for (let k = 0; k < 12; k++) { const o = document.createElement('option'); o.value = k; o.textContent = `${namaKunciLengkap(k)} mayor`; pilihKunciBunyi.append(o); }

/** Sinkronkan kontrol tuning/capo/kunci terdengar dengan keadaan. */
function isiBunyi() {
  pemutar.kunci = kunciTerdengar(); // isian "lari tangga nada" & "getar" memakai tangga nada kunci ini
  pilihTuning.value = keadaan.tuning;
  pilihCapo.value = keadaan.capo;
  pilihKunciBunyi.value = kunciTerdengar();
  const g = geserBunyi();
  document.getElementById('ringkas-bunyi').textContent = g
    ? `bentuk ${namaKunciLengkap(keadaan.kunci)}, terdengar ${namaKunciLengkap(kunciTerdengar())}`
    : '';
}
function aturBunyi({ capo = keadaan.capo, tuning = keadaan.tuning } = {}) {
  keadaan.capo = capo;
  keadaan.tuning = tuningDenganId(tuning).id;
  localStorageAman('akor.capo', String(keadaan.capo));
  localStorageAman('akor.tuning', keadaan.tuning);
  isiBunyi();
  panaskanSampel();
  if (keadaan.latihan?.target) gambarLembar(); // target belum ada saat sheet baru dimuat
}
pilihTuning.addEventListener('change', () => aturBunyi({ tuning: pilihTuning.value }));
pilihCapo.addEventListener('change', () => aturBunyi({ capo: Number(pilihCapo.value) }));
// Memilih kunci terdengar = memindah CAPO (seperti gitaris sungguhan); bentuk akor tetap,
// jadi sheet tetap dimainkan dengan bentuk yang sama dan bunyinya ikut pindah nada.
pilihKunciBunyi.addEventListener('change', () => {
  const geserTuning = tuningDenganId(keadaan.tuning).geser;
  aturBunyi({ capo: (((Number(pilihKunciBunyi.value) - keadaan.kunci - geserTuning) % 12) + 12) % 12 });
});
isiBunyi();

document.querySelectorAll('[data-inst]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-inst]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  pemutar.berhenti(false);
  suara.aturInstrumen(b.dataset.inst);
  isiPilihanPola();
  panaskanSampel();
  gambarUlangCaraMain(); // diagram & "berikutnya" langsung pindah ke alat baru, tanpa memetik ulang
}));
el.volume.addEventListener('input', () => suara.aturVolume(Number(el.volume.value)));

// ------------------------------------------------------------------ pola genjreng (gitar)
const pilihPola = document.getElementById('pola');
const tempo = document.getElementById('tempo');
const labelTempo = document.getElementById('label-tempo');
const ketukan = document.getElementById('ketukan');
const stopPola = document.getElementById('stop-pola');
/** Isi pilihan pola sesuai instrumen (gitar: genjreng; piano: gaya iringan); pola tiap instrumen diingat terpisah. */
const TAB_KUSTOM = { id: 'tab-kustom', nama: 'Atur petikan sendiri…' };
/** Isi opsi pola: gitar = genjreng + petik/tab; piano = gaya iringan. Mengembalikan daftar id yang sah. */
function isiOpsiPola(piano) {
  const opsi = (p) => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.nama; return o; };
  if (piano) { pilihPola.replaceChildren(...POLA_PIANO.map(opsi)); return POLA_PIANO.map((p) => p.id); }
  const grup = (label, daftar) => { const g = document.createElement('optgroup'); g.label = label; g.append(...daftar.map(opsi)); return g; };
  pilihPola.replaceChildren(grup('Genjreng', POLA), grup('Petikan', [...POLA_PETIK, TAB_KUSTOM]));
  return [...POLA, ...POLA_PETIK, TAB_KUSTOM].map((p) => p.id);
}
function isiPilihanPola() {
  const piano = suara.instrumen === 'piano';
  const kunciSimpan = piano ? 'akor.polaPiano' : 'akor.pola';
  const sah = isiOpsiPola(piano);
  const simpan = localStorageAman(kunciSimpan);
  pemutar.polaId = sah.includes(simpan) ? simpan : 'sekali';
  pilihPola.value = pemutar.polaId;
  document.getElementById('label-pola').textContent = piano ? 'Gaya iringan piano' : 'Pola genjreng';
  document.getElementById('label-jenis-gitar').hidden = piano;
  // piano tidak dipetik dan tidak pakai tuning/capo: ganti label, sembunyikan kontrol khusus gitar
  const labelSentuhan = document.getElementById('sentuhan').closest('label');
  const teksSentuhan = [...labelSentuhan.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
  if (teksSentuhan) teksSentuhan.textContent = piano ? 'Sentuhan\n              ' : 'Petikan\n              ';
  document.getElementById('tuning').closest('label').hidden = piano;
  document.getElementById('capo').closest('.baris').hidden = piano;
  if (typeof isiPilihanIsian === 'function') isiPilihanIsian();
  if (typeof editorPola !== 'undefined') editorPola.hidden = piano || pemutar.polaId !== 'kustom';
  if (typeof editorTab !== 'undefined') editorTab.hidden = piano || pemutar.polaId !== 'tab-kustom';
  if (typeof gambarKetukan === 'function') gambarKetukan();
}
{
  const sah = isiOpsiPola(false);
  pemutar.polaId = sah.includes(localStorageAman('akor.pola')) ? localStorageAman('akor.pola') : 'sekali';
}
pemutar.aturTempo(Number(localStorageAman('akor.tempo')) || 90);
pilihPola.value = pemutar.polaId;
tempo.value = pemutar.bpm;
labelTempo.textContent = `${pemutar.bpm} bpm`;

function gambarKetukan() {
  const langkah = pemutar.pola.langkah;
  const tab = pemutar.pola.tab;
  ketukan.replaceChildren(...(langkah ? [...langkah].map((t, i) => {
    const s = document.createElement('span');
    s.textContent = tab ? labelTab(tab[i]) : labelLangkah(t); // pola tab: nomor senar yang dipetik
    if (i % (pemutar.pola.resolusi ?? 2) === 0 && i > 0) s.className = 'awal-ketuk';
    return s;
  }) : []));
}
gambarKetukan();
pilihPola.addEventListener('change', () => {
  pemutar.aturPola(pilihPola.value);
  localStorageAman(suara.instrumen === 'piano' ? 'akor.polaPiano' : 'akor.pola', pilihPola.value);
  editorPola.hidden = suara.instrumen === 'piano' || pilihPola.value !== 'kustom';
  editorTab.hidden = suara.instrumen === 'piano' || pilihPola.value !== 'tab-kustom';
  gambarKetukan();
  gambarEditorPola();
});

// ------------------------------------------------------------------ editor pola kustom
const editorPola = document.getElementById('editor-pola');
const gridPola = document.getElementById('grid-pola');
const teksPola = document.getElementById('teks-pola');
const resolusiPola = document.getElementById('resolusi-pola');
const biramaPola = document.getElementById('birama-pola');
try {
  const simpan = JSON.parse(localStorageAman('akor.polaKustom') || 'null');
  if (simpan && /^[DUX.]+$/.test(simpan.langkah) && simpan.langkah.length === panjangPola(simpan.birama, simpan.resolusi)) {
    pemutar.polaKustom = { ...pemutar.polaKustom, ...simpan };
  }
} catch { /* data rusak: pakai bawaan */ }

/** Simpan & pakai pola kustom baru, lalu gambar ulang editor + indikator ketukan. */
function aturKustom(ubahan) {
  const p = { ...pemutar.polaKustom, ...ubahan };
  p.langkah = bacaPolaTeks(p.langkah, panjangPola(p.birama, p.resolusi));
  pemutar.aturPolaKustom(p);
  localStorageAman('akor.polaKustom', JSON.stringify({ langkah: p.langkah, birama: p.birama, resolusi: p.resolusi }));
  gambarEditorPola();
  gambarKetukan();
}

function gambarEditorPola() {
  const p = pemutar.polaKustom;
  resolusiPola.value = p.resolusi;
  biramaPola.value = p.birama;
  if (document.activeElement !== teksPola) teksPola.value = p.langkah.replace(/\./g, ' ').replace(/\s+$/, '');
  const hitung = labelHitungan(p.birama, p.resolusi);
  gridPola.replaceChildren(...[...p.langkah].map((isi, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `kotak${i % p.resolusi === 0 && i > 0 ? ' awal-ketuk' : ''}`;
    b.dataset.isi = isi;
    b.title = `Ketuk ${hitung[i] || '·'}: klik untuk mengganti`;
    b.innerHTML = `<b>${labelLangkah(isi)}</b><small>${hitung[i]}</small>`;
    b.addEventListener('click', () => {
      const berikut = SIKLUS_KOTAK[(SIKLUS_KOTAK.indexOf(isi) + 1) % SIKLUS_KOTAK.length];
      aturKustom({ langkah: p.langkah.slice(0, i) + berikut + p.langkah.slice(i + 1) });
    });
    return b;
  }));
}
teksPola.addEventListener('input', () => aturKustom({ langkah: bacaPolaTeks(teksPola.value, panjangPola(pemutar.polaKustom.birama, pemutar.polaKustom.resolusi)) }));
teksPola.addEventListener('blur', gambarEditorPola);
resolusiPola.addEventListener('change', () => {
  // ganti resolusi: pertahankan ritme (1/8 → 1/16 menyisipkan diam di antara, dan sebaliknya)
  const p = pemutar.polaKustom, baru = Number(resolusiPola.value);
  let langkah = p.langkah;
  if (baru === 4 && p.resolusi === 2) langkah = [...langkah].map((c) => c + '.').join('');
  if (baru === 2 && p.resolusi === 4) langkah = [...langkah].filter((_, i) => i % 2 === 0).join('');
  aturKustom({ resolusi: baru, langkah });
});
biramaPola.addEventListener('change', () => aturKustom({ birama: Number(biramaPola.value) }));
editorPola.hidden = pilihPola.value !== 'kustom';

// ------------------------------------------------------------------ editor tab petik (6 senar)
const editorTab = document.getElementById('editor-tab');
const gridTab = document.getElementById('grid-tab');
const teksTab = document.getElementById('teks-tab');
const resolusiTab = document.getElementById('resolusi-tab');
const biramaTab = document.getElementById('birama-tab');
const muatTab = document.getElementById('muat-tab');
for (const p of POLA_PETIK) { const o = document.createElement('option'); o.value = p.id; o.textContent = p.nama; muatTab.append(o); }
try {
  const t = JSON.parse(localStorageAman('akor.tabKustom') || 'null');
  if (t && Array.isArray(t.tab) && t.tab.length === t.birama * t.resolusi) pemutar.aturTabKustom(t);
} catch { /* data rusak: pakai bawaan */ }

/** Simpan & pakai tab kustom baru, lalu gambar ulang editor + indikator. */
function aturTab(ubahan) {
  const t = { ...pemutar.tabKustom, ...ubahan };
  const panjang = t.birama * t.resolusi;
  t.tab = Array.from({ length: panjang }, (_, i) => [...(t.tab[i] ?? [])]);
  pemutar.aturTabKustom(t);
  localStorageAman('akor.tabKustom', JSON.stringify({ tab: t.tab, birama: t.birama, resolusi: t.resolusi }));
  gambarEditorTab();
  gambarKetukan();
}

const NAMA_SENAR = { 1: 'e', 2: 'B', 3: 'G', 4: 'D', 5: 'A', 6: 'E' };
function gambarEditorTab() {
  const { tab, birama, resolusi } = pemutar.tabKustom;
  resolusiTab.value = resolusi;
  biramaTab.value = birama;
  if (document.activeElement !== teksTab) teksTab.value = tabKeTeks(tab);
  const hitung = labelHitungan(birama, resolusi);
  const baris = [1, 2, 3, 4, 5, 6].map((senar) => {
    const r = document.createElement('div');
    r.className = 'baris-tab';
    const nama = document.createElement('span'); nama.className = 'nama-senar'; nama.textContent = NAMA_SENAR[senar];
    r.append(nama, ...tab.map((langkah, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `sel${langkah.includes(senar) ? ' aktif' : ''}${i % resolusi === 0 && i > 0 ? ' awal-ketuk' : ''}`;
      b.dataset.i = i;
      b.title = `Senar ${senar} (${NAMA_SENAR[senar]}) · ketuk ${hitung[i] || '·'}`;
      b.addEventListener('click', () => {
        const baru = tab.map((x) => [...x]);
        baru[i] = langkah.includes(senar) ? langkah.filter((k) => k !== senar) : [...langkah, senar].sort((a, b2) => b2 - a);
        aturTab({ tab: baru });
      });
      return b;
    }));
    return r;
  });
  const hit = document.createElement('div');
  hit.className = 'baris-tab';
  const kosong = document.createElement('span'); kosong.className = 'nama-senar';
  hit.append(kosong, ...hitung.map((h, i) => { const s = document.createElement('span'); s.className = `hitung${i % resolusi === 0 && i > 0 ? ' awal-ketuk' : ''}`; s.textContent = h; return s; }));
  gridTab.replaceChildren(...baris, hit);
}
teksTab.addEventListener('input', () => aturTab({ tab: bacaTabTeks(teksTab.value, pemutar.tabKustom.birama * pemutar.tabKustom.resolusi) }));
teksTab.addEventListener('blur', gambarEditorTab);
resolusiTab.addEventListener('change', () => {
  // pertahankan ritme saat mengganti resolusi (1/8 ↔ 1/16)
  const { tab, resolusi } = pemutar.tabKustom, baru = Number(resolusiTab.value);
  let t2 = tab;
  if (baru === 4 && resolusi === 2) t2 = tab.flatMap((x) => [x, []]);
  if (baru === 2 && resolusi === 4) t2 = tab.filter((_, i) => i % 2 === 0);
  aturTab({ resolusi: baru, tab: t2 });
});
biramaTab.addEventListener('change', () => aturTab({ birama: Number(biramaTab.value) }));
muatTab.addEventListener('change', () => {
  const p = POLA_PETIK.find((x) => x.id === muatTab.value);
  if (p) aturTab({ tab: p.tab.map((x) => [...x]), birama: p.birama, resolusi: p.resolusi });
  muatTab.value = '';
});
editorTab.hidden = pilihPola.value !== 'tab-kustom';
gambarEditorTab();
gambarEditorPola();
tempo.addEventListener('input', () => {
  pemutar.aturTempo(Number(tempo.value));
  labelTempo.textContent = `${pemutar.bpm} bpm`;
  localStorageAman('akor.tempo', String(pemutar.bpm));
});
stopPola.addEventListener('click', () => { hentikanPutar(); pemutar.berhenti(true); });
const kendaliPola = document.getElementById('kendali-pola');

// ------------------------------------------------------------------ isian piano antar akor
const pilihIsian = document.getElementById('isian-piano');
const pilihIsianTiap = document.getElementById('isian-tiap');
const isianKini = document.getElementById('isian-kini');
/**
 * Isi pilihan isian sesuai instrumen. Piano: teknik piano (pentatonis, oktaf 3-1-7-6, sus4…);
 * gitar: teknik gitar (hammer-on, pull-off, bass run, lick, chuck…). Pilihan tiap instrumen disimpan terpisah.
 */
function isiPilihanIsian() {
  const piano = suara.instrumen === 'piano';
  pilihIsian.replaceChildren();
  const grup = (label, daftar) => {
    const g = document.createElement('optgroup');
    g.label = label;
    for (const x of daftar) { const o = document.createElement('option'); o.value = x.id; o.textContent = x.nama; g.append(o); }
    pilihIsian.append(g);
  };
  const tanpa = document.createElement('option'); tanpa.value = 'mati'; tanpa.textContent = 'Tanpa isian'; pilihIsian.append(tanpa);
  if (piano) {
    for (const g of ISIAN_TUNGGAL) grup(g.kelompok, g.daftar);
    grup('Campuran per genre', GENRE_ISIAN);
    grup('Otomatis acak', ISIAN_PIANO.filter((x) => x.id.startsWith('otomatis')));
  } else {
    for (const g of ISIAN_GITAR_TUNGGAL) grup(g.kelompok, g.daftar);
    grup('Campuran per genre', GENRE_ISIAN_GITAR);
  }
  pilihIsian.value = piano ? pemutar.isianJenis : pemutar.isianJenisGitar;
  document.getElementById('label-isian').textContent = piano ? 'Isian antar akor (piano)' : 'Isian antar akor (gitar)';
}
const semuaIsian = new Set(['mati', ...ISIAN_TUNGGAL.flatMap((g) => g.daftar.map((x) => x.id)), ...GENRE_ISIAN.map((x) => x.id), 'otomatis', 'otomatis-lembut']);
const semuaIsianGitar = new Set(['mati', ...ISIAN_GITAR_TUNGGAL.flatMap((g) => g.daftar.map((x) => x.id)), ...GENRE_ISIAN_GITAR.map((x) => x.id)]);
{
  // pilihan lama tersimpan ("naik", "hiasan", …) → teknik tunggal yang sama
  let simpan = localStorageAman('akor.isian');
  if (simpan && !simpan.includes(':') && !simpan.startsWith('otomatis') && simpan !== 'mati') simpan = `f:${simpan === 'skala' ? 'skala-turun' : simpan}`;
  pemutar.isianJenis = semuaIsian.has(simpan) ? simpan : 'f:penta-2356';
  const simpanGitar = localStorageAman('akor.isianGitar');
  pemutar.isianJenisGitar = semuaIsianGitar.has(simpanGitar) ? simpanGitar : 'mati';
}
{
  const simpan = localStorageAman('akor.isianTiap');
  pemutar.isianTiap = simpan === 'kalimat' ? 'kalimat' : simpan === '2' ? 2 : 1;
}
isiPilihanIsian();
pilihIsianTiap.value = String(pemutar.isianTiap);
pilihIsian.addEventListener('change', () => {
  if (suara.instrumen === 'piano') { pemutar.isianJenis = pilihIsian.value; localStorageAman('akor.isian', pilihIsian.value); }
  else { pemutar.isianJenisGitar = pilihIsian.value; localStorageAman('akor.isianGitar', pilihIsian.value); }
  // "Sekali" + isian berganti jadi akor ditahan per birama (dan sebaliknya): perbarui indikator
  if (typeof gambarKetukan === 'function') gambarKetukan();
  if (pemutar.berjalan && pemutar.voicing) pemutar.mainkan(pemutar.voicing, pemutar.kekuatan);
  else if (pemutar.berjalan && !pemutar.pola.langkah) pemutar.berhenti(false);
});
pilihIsianTiap.addEventListener('change', () => {
  pemutar.isianTiap = pilihIsianTiap.value === 'kalimat' ? 'kalimat' : Number(pilihIsianTiap.value);
  localStorageAman('akor.isianTiap', pilihIsianTiap.value);
});
const namaMidi = (m) => `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][m % 12]}`;
// tampilkan isian yang sedang berbunyi (nama + nadanya), tepat saat terdengar
const LABEL_UKURAN = { kecil: 'kecil', sedang: 'sedang', besar: 'BESAR' };
pemutar.onIsian = (nama, nada, tAudio, isian) => {
  const tunda = Math.max(0, (tAudio - suara.ctx.currentTime) * 1000);
  const genre = isian?.genre ? `${isian.genre}: ` : '';
  const ukuran = isian?.ukuran ? ` <span class="ukuran-${isian.ukuran}">${LABEL_UKURAN[isian.ukuran]}</span>` : '';
  setTimeout(() => {
    isianKini.hidden = false;
    isianKini.innerHTML = `Isian ${genre}<b>${nama}</b>${ukuran} (${nada.length > 8 ? `${nada.slice(0, 6).map(namaMidi).join('–')}…` : nada.map(namaMidi).join('–')})`;
  }, tunda);
};
// tombol ✦ Panjang: petikan berikutnya (kamera/pad/keyboard) jadi genjreng panjang (klimaks)
const tombolPanjang = document.getElementById('panjang-siap');
function aturPanjangSiap(siap) {
  keadaan.panjangSiap = siap;
  tombolPanjang.setAttribute('aria-pressed', String(siap));
  tombolPanjang.firstChild.textContent = siap ? '✦ Siap: petik sekali untuk klimaks ' : '✦ Genjreng panjang ';
}
tombolPanjang.addEventListener('click', () => aturPanjangSiap(!keadaan.panjangSiap));
const tombolJeda = document.getElementById('jeda-pola');
// tombol Jeda (mouse/sentuh): klik = jeda, klik lagi = lanjut
tombolJeda.addEventListener('click', () => pemutar.aturJeda(!pemutar.jeda));

const pilihJenisGitar = document.getElementById('jenis-gitar');
const pilihSentuhan = document.getElementById('sentuhan');
suara.jenisGitar = localStorageAman('akor.jenisGitar') === 'baja' ? 'baja' : 'nilon';
pilihJenisGitar.value = suara.jenisGitar;
pilihSentuhan.value = String(keadaan.sentuhan);
if (!pilihSentuhan.value) { pilihSentuhan.value = '0.45'; keadaan.sentuhan = 0.45; }
pilihJenisGitar.addEventListener('change', () => {
  suara.jenisGitar = pilihJenisGitar.value;
  localStorageAman('akor.jenisGitar', suara.jenisGitar);
  panaskanSampel();
});
pilihSentuhan.addEventListener('change', () => {
  keadaan.sentuhan = Number(pilihSentuhan.value);
  localStorageAman('akor.sentuhan', pilihSentuhan.value);
});

let langkahTampil = -2;
/** Dipanggil tiap frame: sorot langkah pola yang sedang berbunyi. */
function perbaruiKetukan() {
  const jalan = pemutar.berjalan;
  ketukan.hidden = !jalan;
  kendaliPola.hidden = !jalan;
  if (!jalan || pemutar.isianAktif === 'mati') isianKini.hidden = true;
  ketukan.classList.toggle('dijeda', jalan && pemutar.jeda);
  tombolJeda.setAttribute('aria-pressed', String(jalan && pemutar.jeda));
  tombolJeda.firstChild.textContent = pemutar.jeda ? '▶ Lanjut ' : '⏸ Jeda ';
  const kini = jalan ? pemutar.langkahKini() : -1;
  if (kini === langkahTampil) return;
  langkahTampil = kini;
  [...ketukan.children].forEach((s, i) => s.classList.toggle('kini', i === kini));
  // sorot juga kotak di editor pola kustom
  if (pemutar.polaId === 'kustom') [...document.getElementById('grid-pola').children].forEach((s, i) => s.classList.toggle('kini', i === kini));
  if (pemutar.polaId === 'tab-kustom') document.querySelectorAll('#grid-tab .sel').forEach((s) => s.classList.toggle('kini', Number(s.dataset.i) === kini));
}

PANDUAN_KIRI.forEach((p) => {
  const li = document.createElement('li');
  li.dataset.jari = p.jari ?? 'auto';
  li.innerHTML = `<span class="jml">${p.jari === null ? '–' : p.jari === 0 ? '✊' : p.jari}</span><span>${p.label}</span>`;
  li.title = p.jari === null ? 'Tangan kiri tidak terlihat' : p.jari === 0 ? 'Tangan kiri mengepal' : `${p.jari} jari kiri diangkat`;
  el.panduan.append(li);
});

{
  const grup = (label, isi) => {
    const g = document.createElement('optgroup');
    g.label = label;
    for (const [nilai, teks] of isi) { const o = document.createElement('option'); o.value = nilai; o.textContent = teks; g.append(o); }
    el.progresi.append(g);
  };
  // progresi dikelompokkan menurut suasana, dengan angka romawinya
  const LABEL_SUASANA = { pop: 'Progresi pop', rock: 'Progresi rock', blues: 'Progresi blues & gospel', jazz: 'Progresi jazz' };
  for (const [suasana, label] of Object.entries(LABEL_SUASANA)) {
    grup(label, PROGRESI.map((p, i) => [p, i]).filter(([p]) => p.suasana === suasana).map(([p, i]) => [`p:${i}`, `${p.nama} · ${p.romawi}`]));
  }
  grup('Himne & lagu rohani', LAGU.map((l, i) => [l, i]).filter(([l]) => l.kategori === 'rohani').map(([l, i]) => [`l:${i}`, `${l.judul}, birama ${l.birama}`]));
  grup('Lagu tradisional', LAGU.map((l, i) => [l, i]).filter(([l]) => l.kategori !== 'rohani').map(([l, i]) => [`l:${i}`, l.judul]));
}
// ------------------------------------------------------------------ koleksi sheet tersimpan
// Sheet yang ditempel disimpan dengan judul di browser ini (bukan hanya sheet terakhir).
const koleksi = new Koleksi();
if (localStorageAman('akor.koleksiMigrasi') !== '1') {
  koleksi.migrasiSheetLama(localStorageAman('akor.sheet') || ''); // sheet lama (satu-satunya) ikut masuk koleksi
  localStorageAman('akor.koleksiMigrasi', '1');
}
const grupKoleksi = document.createElement('optgroup');
el.progresi.append(grupKoleksi);
/** Isi ulang daftar "Sheet tersimpan" dari koleksi. */
function isiKoleksi() {
  const daftar = koleksi.daftar();
  grupKoleksi.label = `Sheet tersimpan (${daftar.length})`;
  grupKoleksi.replaceChildren(...daftar.map((x) => {
    const o = document.createElement('option');
    o.value = `s:${x.id}`;
    o.textContent = `${x.judul}${x.pengaturan ? ' · ⚙' : ''}`;
    return o;
  }));
  document.getElementById('info-koleksi').textContent = daftar.length ? `${daftar.length} sheet tersimpan` : 'Belum ada sheet tersimpan.';
  document.getElementById('ekspor-koleksi').disabled = !daftar.length;
}
isiKoleksi();
el.progresi.addEventListener('change', () => pilihLatihan(el.progresi.value));

const tombolTempel = document.getElementById('tombol-tempel');
const kotakTempel = document.getElementById('kotak-tempel');
const teksTempel = document.getElementById('teks-tempel');
const judulTempel = document.getElementById('judul-tempel');
let idDiedit = null; // sheet koleksi yang sedang diedit (null = sheet baru)
function bukaTempel({ id = null, judul = '', teks = '' } = {}) {
  idDiedit = id;
  judulTempel.value = judul;
  teksTempel.value = teks;
  kotakTempel.hidden = false;
  aturTombolTempel();
  document.getElementById('pakai-tempel').textContent = id ? 'Simpan perubahan' : 'Simpan & pakai sheet ini';
  (judul ? teksTempel : judulTempel).focus();
}
tombolTempel.addEventListener('click', () => {
  if (kotakTempel.hidden) bukaTempel(); else kotakTempel.hidden = true;
  aturTombolTempel();
});
function aturTombolTempel() {
  const buka = !kotakTempel.hidden;
  tombolTempel.textContent = buka ? 'Batal' : '+ Tempel sheet sendiri';
  tombolTempel.classList.toggle('tombol-teks', buka);
  tombolTempel.setAttribute('aria-expanded', String(buka));
}
document.getElementById('pakai-tempel').addEventListener('click', () => {
  if (!bacaSheet(teksTempel.value).urutan.length) { el.target.textContent = ''; alertRingan('Tidak ada akor yang dikenali di sheet itu.'); return; }
  const item = koleksi.simpanSheet({ id: idDiedit, judul: judulTempel.value, teks: teksTempel.value });
  idDiedit = null;
  kotakTempel.hidden = true;
  aturTombolTempel();
  isiKoleksi();
  el.progresi.value = `s:${item.id}`;
  pilihLatihan(el.progresi.value);
});
function alertRingan(pesan) {
  el.latihan.hidden = false;
  el.skor.textContent = pesan;
}

// pad akor 3 baris (bisa diketuk / diklik). Baris = tinggi tangan kanan di kamera.
const TOMBOL_BARIS = { atas: 'QWERT', tengah: 'ASDFG', bawah: 'ZXCVB' };
// Baris tengah ditampilkan sebagai "Utama" supaya tidak tertukar dengan "jari tengah".
const LABEL_BARIS = { atas: 'Atas', tengah: 'Utama', bawah: 'Bawah' };
const barisPad = {};
const tombolPad = Object.fromEntries(NAMA_BARIS.map((baris) => {
  const div = document.createElement('div');
  div.className = 'pad-baris';
  div.dataset.baris = baris;
  const label = document.createElement('div');
  label.className = 'label-baris';
  label.innerHTML = `${LABEL_BARIS[baris]}<small>${baris === 'atas' ? 'tangan tinggi' : baris === 'bawah' ? 'tangan rendah' : 'posisi biasa'}</small>`;
  div.append(label);
  const tombol = JARI.map((nama, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span class="kbd">${TOMBOL_BARIS[baris][i]}</span><span class="nama"></span><span class="jari">${nama}, ${BARIS[baris][i].romawi}</span><span class="syarat-kiri"></span>`;
    b.addEventListener('pointerdown', async (e) => { e.preventDefault(); const kiri = jumlahKiri(); await pastikanSuara(); petik(i, 0.8, kiri, baris); });
    div.append(b);
    return b;
  });
  barisPad[baris] = div;
  el.pad.append(div);
  return [baris, tombol];
}));
const lencanaPemula = document.createElement('span');
lencanaPemula.className = 'lencana-pemula';
lencanaPemula.textContent = 'Pemula';
lencanaPemula.hidden = true;
barisPad.tengah.querySelector('.label-baris').append(lencanaPemula);
const semuaPad = () => NAMA_BARIS.flatMap((b) => tombolPad[b].map((t, j) => [b, j, t]));

// ------------------------------------------------------------------ suara & petikan
async function pastikanSuara() {
  if (!suara.ctx) { await suara.mulai(); panaskanSampel(); }
  else if (suara.ctx.state !== 'running') await suara.ctx.resume();
}

/** Siapkan sampel semua akor di kunci ini (semua jenis tangan kiri) di waktu senggang. */
function panaskanSampel() {
  if (!suara.ctx) return;
  const nada = [];
  for (const baris of ['tengah', 'atas', 'bawah']) {
    for (let j = 0; j < 5; j++) {
      for (const kiri of [null, 0, 1, 2, 3, 4, 5]) {
        const a = akorUntuk(j, keadaan.kunci, kiri, baris);
        nada.push(...voicingBunyi(a, a.akar));
      }
    }
  }
  suara.panaskan(nada);
}

function petik(jari, kekuatanMentah, kiri = jumlahKiri(), baris = keadaan.barisKamera, { panjang = false, mulai = null } = {}) {
  // sentuhan: lembut/sedang/keras mengatur seberapa kuat petikan (dan lapis suara gitar)
  const kekuatan = Math.min(1, kekuatanMentah * keadaan.sentuhan / 0.8);
  // genjreng panjang: dari Shift+huruf, atau tombol ✦ Panjang yang "disiapkan" untuk petikan berikutnya
  const klimaks = panjang || keadaan.panjangSiap;
  const a = akorPad(jari, kiri, baris);
  if (!a) return; // mode pemula: pad kosong
  if (pemulaAktif()) kiri = null; // akor sudah lengkap, tangan kiri tidak dipakai
  if (keadaan.panjangSiap) aturPanjangSiap(false);
  // Latihan lagu: bila akor ini cocok dengan target, pakai ejaan & nada bas yang tertulis
  // (akor slash seperti F#7/A# dimainkan dengan bas A#).
  const T = keadaan.putarOtomatis ? targetMentah() : targetLatihan();
  const cocok = T && a.akar === T.akar && a.kualitas === T.kualitas;
  // "kurang itu lebih": beri tahu pemutar apakah akor ini ujung kalimat (akor terakhir baris sheet)
  pemutar.akhirKalimat = cocok ? Boolean(T.akhirBaris) : null;
  // mode pemula: pad akor slash (C/G) memakai bas yang tertulis di sheet
  const bas = cocok && T.bas != null ? T.bas : (slotPemula(baris, jari)?.bas ?? a.akar);
  const v = voicingBunyi(a, bas);
  if (klimaks) {
    // sapuan pelan yang dibiarkan bergaung; pola (bila jalan) masuk jeda supaya tidak memotong
    pemutar.senar = senarBunyi(a);
    pemutar.genjrengPanjang(v, Math.max(kekuatan, 0.85));
  } else { pemutar.senar = senarBunyi(a); pemutar.mainkan(v, kekuatan, mulai); } // gitar: genjreng/petik; piano: iringan
  keadaan.nyala.set(`${baris}:${jari}`, performance.now());
  const nama = cocok ? T.main : namaPad(jari, kiri, baris);
  el.akorBesar.textContent = nama;
  tampilkanCaraMain({ a, nama, baris, jari, kiri, bas, v });
  el.akorBesar.classList.remove('denyut');
  void el.akorBesar.offsetWidth; // ulang animasi
  el.akorBesar.classList.add('denyut');
  const g = geserBunyi();
  el.akorSub.textContent = kalimat([petunjukKanan({ baris, jari }), kiri !== null ? petunjukKiri(kiri) : ''], g ? `Terdengar ${namaTerdengar(a, g, keadaan.kunci)}` : '');
  const b = tombolPad[baris][jari];
  b.classList.add('nyala');
  setTimeout(() => b.classList.remove('nyala'), 180);
  cekLatihan(a);
  aturAkorBerikut(keadaan.latihan ? targetMentah() : null);
  tampilkanBerikut(keadaan.putarOtomatis ? targetMentah() : targetLatihan());
}

// ------------------------------------------------------------------ latihan & lagu
// keadaan.latihan = { jenis: 'progresi'|'lagu', judul, sheet?, target: [...], i, benar, salah }
// target[i] = { label (akor tertulis), jari, kiri, main (akor yang dibunyikan), tepat } atau
//             { label, jari: null } bila akarnya tidak ada di 5 jari kunci ini (dilewati).
const lembar = document.getElementById('lembar');
const lembarIsi = document.getElementById('lembar-isi');

function pilihLatihan(nilai) {
  hentikanPutar();
  if (!nilai) { tampilkanBerikut(null); keadaan.latihan = null; el.latihan.hidden = true; lembar.hidden = true; keadaan.ejaanSheet = null; terapkanEjaan(false); perbaruiTampilan(); return; }
  const [jenis, idx] = nilai.split(':');
  if (jenis === 'p') {
    keadaan.latihan = { jenis: 'progresi', judul: PROGRESI[idx].nama, p: Number(idx) };
  } else {
    const tersimpan = jenis === 's' ? koleksi.ambil(idx) : null;
    if (jenis === 's' && !tersimpan) { pilihLatihan(''); return; }
    const teks = jenis === 'l' ? LAGU[idx].sheet : tersimpan.teks;
    const sheet = bacaSheet(teks);
    keadaan.latihan = {
      jenis: 'lagu', sheet, koleksiId: tersimpan?.id ?? null,
      judul: jenis === 'l' ? LAGU[idx].judul : tersimpan.judul,
      info: jenis === 'l' ? `${LAGU[idx].asal}. Birama ${LAGU[idx].birama}, akornya disederhanakan.`
        : `Disimpan ${new Date(tersimpan.diubah).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}${tersimpan.pengaturan ? ', lengkap dengan pengaturannya' : ''}.`,
      saran: jenis === 'l' ? LAGU[idx].saran ?? null : null,
    };
    // header sheet (Tuning/Capo/Key) mengatur bunyi; kunci bentuk dipilih dari akor sheet
    const info = bacaInfoSheet(teks);
    if (info.capo !== null || info.tuning !== null) {
      aturBunyi({ capo: info.capo ?? keadaan.capo, tuning: info.tuning ?? keadaan.tuning });
      keadaan.latihan.info += ` Dari sheet: ${[info.tuning && `tuning ${tuningDenganId(info.tuning).senar}`, info.capo !== null && `capo ${info.capo}`].filter(Boolean).join(', ')}.`;
    }
    keadaan.latihan.kunciHeader = info.kunci;
    // ejaan pad/diagram mengikuti sheet (C# A#m … → kres; Db Bbm … → mol)
    keadaan.ejaanSheet = ejaanSheet(sheet.urutan);
    terapkanEjaan(false);
    keadaan.kunci = pilihKunci(sheet.urutan.map((a) => a.akor));
    el.kunci.value = keadaan.kunci;
    localStorageAman('akor.kunci', String(keadaan.kunci));
    isiBunyi();
    panaskanSampel();
  }
  Object.assign(keadaan.latihan, { i: 0, benar: 0, salah: 0 });
  hitungTarget();
  el.latihan.hidden = false;
  perbaruiTampilan();
  // sheet tersimpan dengan pengaturan: pasang capo, kunci, tempo, iringan, isian, dst.
  const tersimpanPengaturan = keadaan.latihan.koleksiId ? koleksi.ambil(keadaan.latihan.koleksiId)?.pengaturan : null;
  if (tersimpanPengaturan) terapkanPengaturan(tersimpanPengaturan);
}

/** Hitung ulang target (dipanggil juga saat kunci diganti). */
function hitungTarget() {
  const L = keadaan.latihan;
  if (!L) return;
  if (L.jenis === 'progresi') {
    L.target = PROGRESI[L.p].langkah.map(([jari, kiri, baris = 'tengah']) => {
      const nama = akorUntuk(jari, keadaan.kunci, kiri, baris).nama;
      return { label: nama, baris, jari, kiri, main: nama, tepat: true, romawi: BARIS[baris][jari].romawi };
    });
    L.target.at(-1).akhirBaris = true; // akhir putaran progresi = akhir "kalimat"
  } else {
    L.target = L.sheet.urutan.map((a) => {
      const p = petakanAkor(a.akor, keadaan.kunci);
      // akor tepat → tampilkan dengan ejaan seperti tertulis (C#m tetap C#m, bukan Dbm)
      return p ? { label: a.teks, ...p, main: p.tepat ? a.teks : p.main } : { label: a.teks, jari: null };
    });
    akhirBaris(L.sheet.urutan).forEach((akhir, i) => { L.target[i].akhirBaris = akhir; });
  }
  // nada & jenis yang harus dibunyikan, untuk dicocokkan tanpa peduli ejaan (C# = Db)
  for (const t of L.target) {
    if (t.jari === null) continue;
    const a = akorUntuk(t.jari, keadaan.kunci, t.kiri, t.baris);
    Object.assign(t, { akar: a.akar, kualitas: a.kualitas });
  }
  // mode pemula: akor-akor unik dipasang langsung di pad (yang paling sering di baris utama)
  L.slotPemula = null;
  L.penuhPemula = 0;
  if (keadaan.pemula) {
    const p = susunPemula(L.target);
    L.target = p.target;
    L.slotPemula = p.slot;
    L.penuhPemula = p.penuh;
  }
  L.i = Math.min(L.i, L.target.length - 1);
  lewatiYangTakBisa();
  gambarLembar();
}

function lewatiYangTakBisa() {
  const L = keadaan.latihan;
  for (let n = 0; n < L.target.length && L.target[L.i].jari === null; n++) L.i = (L.i + 1) % L.target.length;
}

/** Target berikutnya bila mode "ikuti sheet" aktif; null saat main bebas. */
function targetLatihan() {
  return keadaan.ikutiSheet ? targetMentah() : null;
}

/** Akor berikutnya di sheet/progresi, tanpa peduli mode (dipakai putar contoh). */
function targetMentah() {
  const L = keadaan.latihan;
  const T = L?.target?.[L.i];
  return T && T.jari !== null ? T : null;
}

function cekLatihan(akor) {
  const L = keadaan.latihan;
  if (!L?.target) return;
  if (keadaan.putarOtomatis) { // putar contoh: maju tanpa menghitung skor
    L.i = (L.i + 1) % L.target.length;
    lewatiYangTakBisa();
    perbaruiLatihan();
    return;
  }
  const T = targetLatihan(); // null saat main bebas → tidak dinilai
  if (!T) return;
  const kartu = el.latihan.closest('.kartu');
  kartu.classList.remove('kilat-benar', 'kilat-salah');
  void kartu.offsetWidth;
  if (akor.akar === T.akar && akor.kualitas === T.kualitas) {
    L.benar++;
    L.i = (L.i + 1) % L.target.length;
    lewatiYangTakBisa();
    kartu.classList.add('kilat-benar');
  } else {
    L.salah++;
    kartu.classList.add('kilat-salah');
  }
  perbaruiLatihan();
}

/** Klik akor di sheet: bunyikan akor itu (dengan bas slash-nya) tanpa memengaruhi skor. */
/**
 * Nada tiap senar (senar 6 … 1) dari bentuk akor gitar asli + capo/tuning, untuk pola petik (tab).
 * null = senar tidak dibunyikan (×). Piano: null (pola tab hanya untuk gitar).
 */
function senarBunyi(a) {
  if (suara.instrumen === 'piano') return null;
  const g = geserBunyi();
  return bentukGitar(a).fret.map((f, i) => (f < 0 ? null : (keadaan.tuning === 'drop-d' && i === 0 ? SENAR_STANDAR[0] - 2 : SENAR_STANDAR[i]) + f + g));
}

/** Beri tahu pemutar akor berikutnya (dari sheet/latihan) supaya isian bisa "berjalan" ke sana. */
function aturAkorBerikut(T) {
  if (!T || T.jari === null || T.jari === undefined) { pemutar.voicingBerikut = null; return; }
  const a = akorPad(T.jari, T.kiri, T.baris);
  if (!a) { pemutar.voicingBerikut = null; return; }
  pemutar.voicingBerikut = voicingBunyi(a, T.bas ?? a.akar);
}

async function dengarkanAkor(t, span) {
  await pastikanSuara();
  const a = akorPad(t.jari, t.kiri, t.baris);
  if (!a) return;
  const v = voicingBunyi(a, t.bas ?? a.akar);
  pemutar.senar = senarBunyi(a);
  pemutar.mainkan(v, keadaan.sentuhan);
  // akor setelah yang diklik → untuk isian "bas berjalan"
  const L = keadaan.latihan;
  const berikut = L?.target?.[(Number(span.dataset.n) + 1) % L.target.length] ?? null;
  aturAkorBerikut(berikut);
  tampilkanBerikut(berikut);
  pemutar.akhirKalimat = Boolean(t.akhirBaris);
  el.akorBesar.textContent = t.main;
  tampilkanCaraMain({ a, nama: t.main, baris: t.baris, jari: t.jari, kiri: t.kiri, bas: t.bas ?? a.akar, v });
  el.akorSub.textContent = kalimat([`Dari sheet: ${petunjukKanan(t)}`, pemulaAktif() ? '' : petunjukKiri(t.kiri)]);
  span.classList.add('dengar');
  setTimeout(() => span.classList.remove('dengar'), 400);
  const b = tombolPad[t.baris][t.jari];
  b.classList.add('nyala');
  setTimeout(() => b.classList.remove('nyala'), 180);
}

// ------------------------------------------------------------------ cara main (panel kanan)
// Setiap kali akor dimainkan / diklik: diagram akor gitar sungguhan (atau tuts piano) +
// langkah memainkannya di Swaravana.
const caraMain = document.getElementById('cara-main');

/** Isi diagram (gitar/piano asli) + langkah kamera/keyboard untuk satu akor. */
function isiCara(tempat, daftar, { a, nama, baris, jari, kiri, bas, v }, kecil = false) {
  const langkah = [];
  const tambah = (ikon, label, isi) => langkah.push(
    `<li><span class="cara-ikon" data-ikon="${ikon}" aria-hidden="true"></span><span class="cara-teks"><span class="cara-label">${label}</span><span class="cara-nilai">${isi}</span></span></li>`);
  const piano = suara.instrumen !== 'gitar';
  if (!piano) {
    const { svg, bentuk } = svgGitar(a, { capo: keadaan.capo, judul: nama });
    tempat.replaceChildren(svg);
    const senar = bentuk.fret.map((f) => (f < 0 ? 'x' : f)).join(' ');
    tambah('gitar', 'Gitar', `<span class="cara-fret" title="Fret tiap senar, dari senar 6 (E rendah) ke senar 1">${senar}</span>${bentuk.barre ? `<small>Barre di fret ${bentuk.barre.fret}</small>` : ''}`);
    if (bas !== a.akar) tambah('bas', 'Bas', `Petik ${nama.split('/')[1] || 'nada bas'} di senar terendah, <span class="tak-putus">atau lewati saja</span>`);
    if (!kecil && keadaan.tuning !== 'standar') tambah('info', 'Tuning', `Diagram memakai bentuk standar. Tuning ${tuningDenganId(keadaan.tuning).nama.split(' · ')[0].toLowerCase()} menggeser bunyinya.`);
  } else {
    tempat.replaceChildren(svgPiano(v));
    tambah('piano', 'Piano', '<span class="cara-warna bas"></span>bas <span class="cara-warna"></span>nada akor');
  }
  tambah('kamera', 'Kamera', langkahKamera(baris, jari));
  if (!(kecil && kiri === null) && !pemulaAktif()) tambah('tangan', 'Tangan kiri', kiri === null ? 'Tidak perlu, dipilih otomatis' : kiri === 0 ? 'Kepalkan' : `Tunjukkan ${kiri} jari`);
  const tombol = TOMBOL_BARIS[baris][jari];
  // perangkat sentuh tidak punya keyboard: baris ini disembunyikan
  if (!layarSentuh()) {
    tambah('keyboard', 'Keyboard', kiri === null
      ? `<span class="tak-putus">Tekan <kbd>${tombol}</kbd></span>`
      : `Tahan <kbd>${kiri}</kbd> <span class="tak-putus">lalu tekan <kbd>${tombol}</kbd></span>`);
  }
  daftar.innerHTML = langkah.join('');
  // tata letak: piano lebar di atas, gitar di samping langkah; animasi halus hanya bila akornya berganti
  const wadah = tempat.parentElement;
  wadah.classList.toggle('cara-isi-piano', piano);
  const kunciTampil = `${nama}|${suara.instrumen}`;
  if (wadah.dataset.akor !== kunciTampil) {
    wadah.dataset.akor = kunciTampil;
    wadah.classList.remove('cara-ganti');
    void wadah.offsetWidth;
    wadah.classList.add('cara-ganti');
  }
}

// argumen terakhir kartu Cara main & kotak Berikutnya, supaya bisa digambar ulang saat alat musik diganti
let caraTerakhir = null;
let berikutTerakhir = null;

function tampilkanCaraMain({ a, nama, baris, jari, kiri, bas, v }) {
  caraTerakhir = { a, nama, baris, jari, kiri, bas };
  caraMain.hidden = false;
  document.getElementById('cara-kini').hidden = false;
  const g = geserBunyi();
  document.getElementById('cara-nama').textContent = g ? `${nama}, terdengar ${namaTerdengar(a, g, keadaan.kunci)}` : nama;
  isiCara(document.getElementById('cara-diagram'), document.getElementById('cara-langkah'), { a, nama, baris, jari, kiri, bas, v });
}

/** Akor berikutnya di sheet/progresi + cara memainkannya (null = sembunyikan). */
function tampilkanBerikut(T) {
  const kotak = document.getElementById('cara-berikut');
  berikutTerakhir = T ?? null;
  if (!T || T.jari === null || T.jari === undefined) { kotak.hidden = true; return; }
  const a = akorPad(T.jari, T.kiri, T.baris);
  if (!a) { kotak.hidden = true; berikutTerakhir = null; return; } // pad sudah tidak berisi akor itu
  const bas = T.bas ?? a.akar;
  const g = geserBunyi();
  kotak.hidden = false;
  caraMain.hidden = false;
  document.getElementById('berikut-nama').textContent = T.main;
  document.getElementById('berikut-info').textContent = [!T.tepat && T.label ? `tertulis ${T.label}` : '', g ? `terdengar ${namaTerdengar(a, g, keadaan.kunci)}` : ''].filter(Boolean).join(', ');
  isiCara(document.getElementById('berikut-diagram'), document.getElementById('berikut-langkah'),
    { a, nama: T.main, baris: T.baris, jari: T.jari, kiri: T.kiri, bas, v: voicingBunyi(a, bas) }, true);
}

/** Gambar ulang Cara main + Berikutnya untuk instrumen sekarang (voicing dihitung ulang). Tanpa akor: tidak apa-apa. */
function gambarUlangCaraMain() {
  if (caraTerakhir) {
    const c = caraTerakhir;
    tampilkanCaraMain({ ...c, v: voicingBunyi(c.a, c.bas) });
  }
  if (berikutTerakhir) tampilkanBerikut(berikutTerakhir);
}

/** Gabung potongan petunjuk jadi kalimat biasa: "Telunjuk, tangan kiri 2 jari. Terdengar B♭". */
function kalimat(bagian, ekor = '') {
  const isi = bagian.filter(Boolean).join(', ');
  const awal = isi.replace(/[\p{L}\p{N}]/u, (h) => h.toUpperCase()); // huruf pertama (emoji di depan dilewati, angka dibiarkan)
  return ekor ? `${awal}. ${ekor}` : awal;
}

function petunjukKiri(kiri) {
  if (kiri === null) return 'tangan kiri bebas';
  return kiri === 0 ? 'tangan kiri mengepal' : `tangan kiri ${kiri} jari`;
}

/** Bilah kemajuan & "akor 3 dari 24" di kepala kartu Latihan (null = sembunyikan). */
function aturKemajuan(L) {
  const isi = document.getElementById('kemajuan-isi');
  const ringkas = document.getElementById('ringkas-skor');
  if (!L || !L.target?.length) { isi.style.width = '0%'; ringkas.textContent = ''; return; }
  isi.style.width = `${(L.i / L.target.length) * 100}%`;
  ringkas.textContent = `akor ${L.i + 1} dari ${L.target.length}`;
}

function petunjukKanan(T) {
  if (keadaan.modeKamera === 'bentuk') return teksBentuk(T.baris, T.jari);
  if (keadaan.modeKamera === 'kombinasi') {
    if (T.baris === 'tengah') return `jari ${JARI[T.jari]}`;
    return KOMBINASI[T.baris][T.jari][0] === 0 ? teksKombinasi(T.baris, T.jari) : `${teksKombinasi(T.baris, T.jari)} bersamaan`;
  }
  if (keadaan.modeKamera === 'utama' && T.baris !== 'tengah') return `${JARI[T.jari]} di baris ${LABEL_BARIS[T.baris].toLowerCase()}, lewat pad`;
  return `${JARI[T.jari]} di baris ${LABEL_BARIS[T.baris].toLowerCase()}`;
}

/** Langkah "di kamera" untuk sebuah posisi (baris, jari) menurut mode kamera. */
function langkahKamera(baris, jari) {
  const mode = keadaan.modeKamera;
  const namaJari = (i) => (i === 2 || i === 3 ? `jari ${JARI[i]}` : JARI[i]);
  // nama bentuk tanpa emoji; "a + b + c" dibaca "a, b dan c"
  const rapi = (t) => t.replace(/^[^\p{L}\p{N}]+/u, '').replace(/ \+ (?=[^+]*$)/, ' dan ').replaceAll(' + ', ', ');
  if (mode === 'bentuk') return `Dari kepalan, keluarkan <b>${rapi(teksBentuk(baris, jari))}</b>`;
  if (mode === 'kombinasi') {
    if (baris === 'tengah') return `Tekuk <b>${namaJari(jari)}</b>`;
    const [a, b] = KOMBINASI[baris][jari];
    return a === 0 ? `Sentuhkan ujung <b>jempol</b> ke ujung <b>${namaJari(b)}</b>` : `Tekuk <b>${namaJari(a)} dan ${namaJari(b)}</b> bersamaan`;
  }
  if (mode === 'tinggi') {
    const posisi = baris === 'atas' ? 'Angkat tangan tinggi' : baris === 'bawah' ? 'Turunkan tangan' : 'Tangan di posisi biasa';
    return `${posisi}, lalu tekuk <b>${namaJari(jari)}</b>`;
  }
  if (baris === 'tengah') return `Tekuk <b>${namaJari(jari)}</b>`;
  return `Tidak ada di baris utama. ${layarSentuh() ? 'Ketuk pad-nya' : 'Pakai keyboard atau pad'}, <span class="tak-putus">atau pilih mode Kombinasi jari</span>`;
}

/** Gambar lembar lagu: baris akor (posisi dipertahankan) di atas lirik, akor bisa disorot. */
function gambarLembar() {
  const L = keadaan.latihan;
  if (!L || L.jenis !== 'lagu') { lembar.hidden = true; return; }
  lembar.hidden = false;
  document.getElementById('judul-lagu').textContent = L.judul;
  document.getElementById('pakai-saran').hidden = !L.saran;
  document.getElementById('aksi-koleksi').hidden = !L.koleksiId;
  const takBisa = L.target.filter((t) => t.jari === null && !t.penuh).length;
  const penuh = L.penuhPemula ? ` ${L.penuhPemula} akor tidak muat di pad dan dilewati.` : '';
  const g = geserBunyi();
  const bunyi = g ? `, capo ${keadaan.capo}${tuningDenganId(keadaan.tuning).geser ? `, tuning ${tuningDenganId(keadaan.tuning).nama.split(' · ')[0].toLowerCase()}` : ''}, terdengar di ${namaKunciLengkap(kunciTerdengar())}` : '';
  const beda = L.kunciHeader != null && L.kunciHeader !== kunciTerdengar() && L.kunciHeader !== (kunciTerdengar() + 9) % 12
    ? ` Sheet aslinya di kunci ${namaKunciLengkap(L.kunciHeader)}.` : '';
  document.getElementById('info-lagu').textContent =
    `${L.info} Dimainkan di kunci ${namaKunci(keadaan.kunci)}${bunyi}.${beda}${takBisa ? ` ${takBisa} akor tidak dikenali dan dilewati.` : ''}${penuh}`;
  let n = 0;
  const isi = [];
  for (const b of L.sheet.baris) {
    const div = document.createElement('div');
    if (b.jenis === 'bagian') { div.className = 'bagian'; div.textContent = b.isi; isi.push(div); continue; }
    if (b.jenis === 'teks') { div.className = 'baris-teks'; div.textContent = b.isi || ' '; isi.push(div); continue; }
    div.className = 'baris-akor';
    let kolom = 0;
    for (const a of b.akor) {
      if (a.posisi > kolom) div.append(' '.repeat(a.posisi - kolom));
      const s = document.createElement('span');
      const t = L.target[n];
      s.className = 'ak';
      s.dataset.n = n++;
      if (t.jari !== null) s.addEventListener('click', () => dengarkanAkor(t, s));
      s.textContent = a.teks;
      s.title = t.penuh ? 'Tidak muat di pad (mode pemula)' : t.jari === null ? 'Akor tidak dikenali' : `${petunjukKanan(t)}${pemulaAktif() ? '' : `, ${petunjukKiri(t.kiri)}`}${t.tepat ? '' : ` (dimainkan ${t.main})`}`;
      if (t.jari === null) s.classList.add('tak');
      else if (!t.tepat) s.classList.add('kira');
      div.append(s);
      kolom = a.posisi + a.teks.length;
    }
    isi.push(div);
  }
  lembarIsi.replaceChildren(...isi);
}

function perbaruiLatihan() {
  const L = keadaan.latihan;
  if (!L) return;
  const T = keadaan.putarOtomatis ? targetMentah() : targetLatihan();
  // progresi tidak punya sheet: sebut "urutan"
  const progresi = L.jenis === 'progresi';
  document.getElementById('label-ikuti').textContent = progresi ? 'Ikuti urutan' : 'Ikuti sheet';
  document.getElementById('ket-ikuti').textContent = progresi
    ? 'Akor berikutnya disorot dan skor dihitung. Matikan kalau mau main bebas.'
    : 'Akor berikutnya disorot dan skor dihitung. Matikan kalau mau main bebas sambil melihat sheet.';
  el.latihan.classList.remove('bebas');
  if (!T) {
    if (!keadaan.ikutiSheet) {
      el.target.innerHTML = L.jenis === 'progresi'
        ? '<span class="label-target">Main bebas</span><span class="langkah-target">Urutan tidak diikuti dan skor tidak dihitung. Mainkan akor apa saja.</span>'
        : '<span class="label-target">Main bebas</span><span class="langkah-target">Sheet cuma jadi panduan dan skor tidak dihitung. Klik akor di sheet untuk mendengarnya.</span>';
      el.urutan.hidden = true;
      el.latihan.classList.add('bebas');
      el.skor.textContent = '';
      aturKemajuan(null);
      lembarIsi.querySelectorAll('.ak.kini, .ak.lewat').forEach((s) => s.classList.remove('kini', 'lewat'));
      isiNamaPad();
      semuaPad().forEach(([, , t]) => t.classList.remove('target'));
    } else el.target.textContent = 'Tidak ada akor yang bisa dimainkan di kunci ini.';
    return;
  }
  const catatan = !T.tepat ? `<span class="catatan-target">Di sheet tertulis ${T.label}, yang dibunyikan ${T.main}.</span>`
    : T.bas != null && T.bas !== T.akar ? '<span class="catatan-target">Nada bas slash ikut dibunyikan.</span>' : '';
  const sentuh = layarSentuh(); // perangkat sentuh: tanpa petunjuk tombol keyboard
  const tombolKanan = sentuh ? '' : ` <kbd>${TOMBOL_BARIS[T.baris][T.jari]}</kbd>`;
  const tombolKiri = T.kiri === null || sentuh ? '' : ` <kbd>tahan ${T.kiri}</kbd>`;
  tampilkanBerikut(T);
  el.target.innerHTML = `<span class="label-target">Berikutnya</span><b>${T.main}</b>`
    + `<span class="langkah-target"><span class="tak-putus">${petunjukKanan(T)}${tombolKanan}</span>${pemulaAktif() ? '' : `, <span class="tak-putus">${petunjukKiri(T.kiri)}${tombolKiri}</span>`}</span>${catatan}`;
  if (L.jenis === 'progresi') {
    el.urutan.hidden = false;
    el.urutan.replaceChildren(...L.target.map((t, i) => {
      const s = document.createElement('span');
      s.innerHTML = `${t.main}<small>${t.romawi ?? ''}</small>`;
      s.title = pemulaAktif() ? petunjukKanan(t) : `${petunjukKanan(t)}, ${petunjukKiri(t.kiri)}`;
      if (i === L.i) s.className = 'kini';
      else if (i < L.i) s.className = 'lewat';
      return s;
    }));
  } else {
    el.urutan.hidden = true;
    lembarIsi.querySelectorAll('.ak').forEach((s) => {
      const n = Number(s.dataset.n);
      s.classList.toggle('kini', n === L.i);
      s.classList.toggle('lewat', n < L.i && L.target[n].jari !== null);
    });
    const kini = lembarIsi.querySelector('.ak.kini');
    if (kini) {
      const r = kini.getBoundingClientRect(), w = lembarIsi.getBoundingClientRect();
      if (r.top < w.top + 20 || r.bottom > w.bottom - 20) lembarIsi.scrollTop += r.top - w.top - w.height / 3;
      if (r.left < w.left || r.right > w.right) lembarIsi.scrollLeft += r.left - w.left - 40;
    }
  }
  const total = L.benar + L.salah;
  el.skor.textContent = keadaan.putarOtomatis ? 'Contoh sedang diputar, skor tidak dihitung.'
    : total ? `Tepat ${L.benar} dari ${total} percobaan (${Math.round((L.benar / total) * 100)}%)` : 'Mainkan akor yang disorot.';
  aturKemajuan(L);
  isiNamaPad();
  semuaPad().forEach(([b, j, t]) => {
    const target = b === T.baris && j === T.jari;
    t.classList.toggle('target', target);
    if (!target) return;
    t.querySelector('.nama').textContent = T.main.replace('/', '/\u200b');
    t.querySelector('.syarat-kiri').textContent = T.kiri === null ? '' : `+ ${petunjukKiri(T.kiri)}`;
  });
}

/** Nama akor di semua pad menurut tangan kiri saat ini (tanpa syarat target). */
const KET_BARIS = {
  bentuk: { atas: 'bentuk lain', tengah: '1–5 jari keluar', bawah: 'bentuk lain' },
  kombinasi: { atas: 'sentuh / 2 jari', tengah: 'tekuk 1 jari', bawah: 'sentuh / 2 jari' },
  tinggi: { atas: 'tangan tinggi', tengah: 'posisi biasa', bawah: 'tangan rendah' },
  utama: { atas: 'pad / keyboard', tengah: 'kamera', bawah: 'pad / keyboard' },
};
function isiNamaPad() {
  const kiri = jumlahKiri();
  const mode = keadaan.modeKamera;
  NAMA_BARIS.forEach((b) => { barisPad[b].querySelector('.label-baris small').textContent = KET_BARIS[mode][b]; });
  const pemula = pemulaAktif();
  document.body.classList.toggle('pemula', pemula);
  lencanaPemula.hidden = !pemula;
  semuaPad().forEach(([b, j, t]) => {
    const kosong = pemula && !slotPemula(b, j);
    t.classList.toggle('kosong', kosong);
    t.disabled = kosong;
    const nama = namaPad(j, kiri, b);
    t.querySelector('.nama').textContent = nama.replace('/', '/\u200b'); // boleh patah setelah "/" (Dadd9/ F#)
    t.classList.toggle('nama-panjang', nama.length > 5); // ejaan sheet bisa panjang (Dadd9/F#)
    const gerak = mode === 'bentuk' ? teksBentuk(b, j) : mode === 'kombinasi' ? teksKombinasi(b, j) : JARI[j];
    // mode pemula: angka romawi pad biasa tidak berlaku lagi, cukup gerakannya
    t.querySelector('.jari').textContent = pemula ? gerak : `${gerak}, ${BARIS[b][j].romawi}`;
    t.querySelector('.syarat-kiri').textContent = '';
  });
}

// ------------------------------------------------------------------ mode kamera
const INFO_MODE = {
  bentuk: 'Kepalan berarti diam, akor terakhir tetap ditahan. Untuk jeda, tahan Spasi atau turunkan tangan.',
  kombinasi: 'Tekuk satu jari untuk akor utama, tekuk dua jari bersamaan untuk akor lain. Pasangan dengan jempol cukup disentuhkan ujungnya.',
  tinggi: 'Angkat tangan kanan lebih tinggi untuk baris atas, turunkan untuk baris bawah. Posisi biasa memakai baris utama.',
  utama: 'Cara paling sederhana. Akor di baris atas dan bawah tetap bisa dimainkan lewat keyboard atau pad.',
};
/**
 * Slot ikon peta gerakan: mode bentuk memakai emoji di depan nama bentuk (☝️ ✌️ 🖐️ …), atau jumlah
 * jari yang keluar bila tidak ada emoji; mode kombinasi memakai jumlah jari (1 atau 2).
 */
function ikonPeta(mode, baris, jari, teks) {
  if (mode === 'bentuk') {
    const m = teks.match(/^([^\p{L}\p{N}\s]+)\s*(.*)$/u);
    if (m) return { ikon: m[1], isi: m[2] };
    return { ikon: String(jariBentuk(baris, jari).length), isi: teks };
  }
  return { ikon: String(KOMBINASI[baris][jari].length), isi: teks };
}
/** Penjelasan mode + peta gerakan → akor di kunci & tangan kiri saat ini. */
function isiPetaMode() {
  const mode = keadaan.modeKamera;
  const tempat = document.getElementById('info-mode-kamera');
  let html = `<p class="kecil">${INFO_MODE[mode]}</p>`;
  if (mode === 'bentuk' || mode === 'kombinasi') {
    const teks = mode === 'bentuk' ? teksBentuk : teksKombinasi;
    const kiri = jumlahKiri();
    const item = ['tengah', 'atas', 'bawah'].flatMap((b) => [0, 1, 2, 3, 4].map((j) => {
      const { ikon, isi } = ikonPeta(mode, b, j, teks(b, j));
      return `<li${b === 'tengah' ? ' class="utama"' : ''}><i aria-hidden="true">${ikon}</i><span>${isi}</span><b>${namaPad(j, kiri, b)}</b></li>`;
    }));
    html += `<p class="judul-peta">${pemulaAktif() ? 'Akor dari sheet (mode pemula)' : `Akor di kunci ${namaKunciLengkap(keadaan.kunci)}`}</p><ul class="peta">${item.join('')}</ul>`;
  }
  tempat.innerHTML = html;
}
const tombolModeKamera = document.querySelectorAll('#mode-kamera button');
function aturModeKamera(mode) {
  keadaan.modeKamera = mode;
  localStorageAman('akor.modeKamera.v2', mode);
  pemicu = mode === 'kombinasi' ? pemicuKombinasi : pemicuSatu;
  pemicu.reset();
  pemicuSentuh.reset();
  pemicuBentuk.reset();
  pemilihBaris.reset();
  keadaan.barisKamera = 'tengah';
  tombolModeKamera.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  isiPetaMode();
  document.getElementById('ringkas-kamera').textContent = { bentuk: 'bentuk jari', kombinasi: 'kombinasi jari', tinggi: 'tinggi tangan', utama: 'lima akor' }[mode];
  // mode bentuk: kepalan = posisi diam (akor ditahan), jadi kepalan tidak lagi menjeda pola
  if (mode === 'bentuk' && keadaan.kepal) { keadaan.kepal = false; if (pemutar.berjalan) pemutar.aturJeda(false); }
  perbaruiTampilan();
}
tombolModeKamera.forEach((b) => b.addEventListener('click', () => aturModeKamera(b.dataset.mode)));

// ------------------------------------------------------------------ putar contoh
// Memainkan akor latihan/sheet berurutan: tiap akor berbunyi `ketuk per akor` ketukan
// dengan pola genjreng & tempo yang dipilih (gitar), lalu berhenti di akhir sheet.
const tombolPutar = document.getElementById('putar-contoh');
const ketukPerAkor = document.getElementById('ketuk-per-akor');
let timerPutar = null;

function hentikanPutar() {
  if (timerPutar) clearTimeout(timerPutar);
  timerPutar = null;
  if (keadaan.putarOtomatis) pemutar.berhenti(true);
  const tadiPutar = keadaan.putarOtomatis;
  keadaan.putarOtomatis = false;
  tombolPutar.setAttribute('aria-pressed', 'false');
  tombolPutar.textContent = '▶ Putar contoh';
  if (tadiPutar && keadaan.latihan) perbaruiTampilan(); // kembali ke tampilan mode ikuti/bebas
}

async function mulaiPutar() {
  const L = keadaan.latihan;
  if (!L) return;
  await pastikanSuara();
  keadaan.putarOtomatis = true;
  tombolPutar.setAttribute('aria-pressed', 'true');
  tombolPutar.textContent = '■ Berhenti';
  L.i = 0;
  lewatiYangTakBisa();
  let sisa = L.target.filter((t) => t.jari !== null).length;
  // Pergantian akor dijadwalkan dengan JAM AUDIO: akor ke-k mulai tepat di tAwal + k × durasi,
  // timer hanya membangunkan ±80 ms lebih awal → tanpa geser tempo & tanpa "flam" akor lama.
  const tAwal = suara.ctx.currentTime + 0.06;
  let k = 0;
  const langkah = () => {
    const T = targetMentah();
    if (!keadaan.putarOtomatis || !T || sisa-- <= 0) { hentikanPutar(); return; }
    const durasi = Number(ketukPerAkor.value) * (60 / pemutar.bpm);
    petik(T.jari, 0.85, T.kiri, T.baris, { mulai: tAwal + k * durasi });
    k++;
    const tunda = (tAwal + k * durasi - 0.08 - suara.ctx.currentTime) * 1000;
    timerPutar = setTimeout(langkah, Math.max(0, tunda));
  };
  langkah();
}
tombolPutar.addEventListener('click', () => (keadaan.putarOtomatis ? hentikanPutar() : mulaiPutar()));

const saklarIkuti = document.getElementById('ikuti-sheet');
saklarIkuti.checked = keadaan.ikutiSheet;
saklarIkuti.addEventListener('change', () => {
  keadaan.ikutiSheet = saklarIkuti.checked;
  localStorageAman('akor.ikuti', keadaan.ikutiSheet ? '1' : '0');
  if (!keadaan.ikutiSheet) tampilkanBerikut(null); // main bebas: "berikutnya" muncul lagi saat akor sheet diklik
  perbaruiTampilan();
});

const saklarPemula = document.getElementById('mode-pemula');
saklarPemula.checked = keadaan.pemula;
saklarPemula.addEventListener('change', () => {
  hentikanPutar();
  keadaan.pemula = saklarPemula.checked;
  localStorageAman('akor.pemula', keadaan.pemula ? '1' : '0');
  tampilkanBerikut(null);
  caraTerakhir = null;
  if (keadaan.latihan) { Object.assign(keadaan.latihan, { i: 0, benar: 0, salah: 0 }); hitungTarget(); }
  panaskanSampel();
  perbaruiTampilan();
});
/** Keterangan saklar pemula: berapa akor yang dipasang di pad. */
function tulisKetPemula() {
  const ket = document.getElementById('ket-pemula');
  const L = keadaan.latihan;
  if (!pemulaAktif()) { ket.textContent = 'Pad cuma berisi akor dari sheet ini. Tangan kiri tidak perlu dipakai.'; return; }
  const n = Object.keys(L.slotPemula).length;
  ket.textContent = `${n} akor dari ${L.jenis === 'progresi' ? 'urutan ini' : 'sheet ini'} sudah dipasang di pad, yang paling sering di baris utama. Tangan kiri tidak perlu dipakai.`;
}

// ------------------------------------------------------------------ pengaturan per sheet tersimpan
/** Semua pengaturan yang memengaruhi cara sheet dimainkan. */
function ambilPengaturan() {
  return {
    instrumen: suara.instrumen, kunci: keadaan.kunci, capo: keadaan.capo, tuning: keadaan.tuning, ejaan: pilihEjaan.value,
    tempo: pemutar.bpm, ketukPerAkor: Number(ketukPerAkor.value),
    polaGitar: localStorageAman('akor.pola') || 'sekali', polaPiano: localStorageAman('akor.polaPiano') || 'sekali',
    polaKustom: { langkah: pemutar.polaKustom.langkah, birama: pemutar.polaKustom.birama, resolusi: pemutar.polaKustom.resolusi },
    tabKustom: { tab: pemutar.tabKustom.tab, birama: pemutar.tabKustom.birama, resolusi: pemutar.tabKustom.resolusi },
    isianPiano: pemutar.isianJenis, isianGitar: pemutar.isianJenisGitar, kapan: pemutar.isianTiap,
    jenisGitar: suara.jenisGitar, sentuhan: keadaan.sentuhan, ikutiSheet: keadaan.ikutiSheet,
  };
}

/** Pasang pengaturan tersimpan (bagian yang tidak ada dibiarkan). */
function terapkanPengaturan(p) {
  if (!p) return;
  pemutar.berhenti(false);
  if (p.instrumen && p.instrumen !== suara.instrumen) document.querySelector(`[data-inst=${p.instrumen}]`)?.click();
  if (Number.isInteger(p.kunci)) gantiKunci(((p.kunci % 12) + 12) % 12);
  if (p.capo !== undefined || p.tuning) aturBunyi({ capo: p.capo ?? keadaan.capo, tuning: p.tuning ?? keadaan.tuning });
  if (p.ejaan) { pilihEjaan.value = p.ejaan; localStorageAman('akor.ejaan', p.ejaan); terapkanEjaan(); }
  if (p.tempo) { pemutar.aturTempo(p.tempo); tempo.value = pemutar.bpm; labelTempo.textContent = `${pemutar.bpm} bpm`; localStorageAman('akor.tempo', String(pemutar.bpm)); }
  if (p.ketukPerAkor) ketukPerAkor.value = String(p.ketukPerAkor);
  if (p.polaGitar) localStorageAman('akor.pola', p.polaGitar);
  if (p.polaPiano) localStorageAman('akor.polaPiano', p.polaPiano);
  if (p.polaKustom?.langkah) aturKustom(p.polaKustom);
  if (Array.isArray(p.tabKustom?.tab)) aturTab(p.tabKustom);
  if (p.isianPiano) { pemutar.isianJenis = p.isianPiano; localStorageAman('akor.isian', p.isianPiano); }
  if (p.isianGitar) { pemutar.isianJenisGitar = p.isianGitar; localStorageAman('akor.isianGitar', p.isianGitar); }
  if (p.kapan !== undefined) { pemutar.isianTiap = p.kapan; pilihIsianTiap.value = String(p.kapan); localStorageAman('akor.isianTiap', String(p.kapan)); }
  if (p.jenisGitar) { suara.jenisGitar = p.jenisGitar; pilihJenisGitar.value = p.jenisGitar; localStorageAman('akor.jenisGitar', p.jenisGitar); panaskanSampel(); }
  if (p.sentuhan) { keadaan.sentuhan = p.sentuhan; pilihSentuhan.value = String(p.sentuhan); localStorageAman('akor.sentuhan', String(p.sentuhan)); }
  if (typeof p.ikutiSheet === 'boolean') { keadaan.ikutiSheet = p.ikutiSheet; saklarIkuti.checked = p.ikutiSheet; localStorageAman('akor.ikuti', p.ikutiSheet ? '1' : '0'); }
  isiPilihanPola();
  isiPilihanIsian();
  perbaruiTampilan();
}

document.getElementById('simpan-pengaturan').addEventListener('click', (e) => {
  e.stopPropagation();
  const id = keadaan.latihan?.koleksiId;
  if (!id) return;
  koleksi.simpanPengaturan(id, ambilPengaturan());
  isiKoleksi();
  el.progresi.value = `s:${id}`;
  el.skor.textContent = 'Pengaturan tersimpan. Capo, kunci, tempo, iringan, dan isian akan terpasang lagi setiap sheet ini dibuka.';
  keadaan.latihan.info = keadaan.latihan.info.replace(/ \(pengaturan tersimpan\)$/, '') + ' (pengaturan tersimpan)';
  gambarLembar();
});
document.getElementById('edit-sheet').addEventListener('click', (e) => {
  e.stopPropagation();
  const x = koleksi.ambil(keadaan.latihan?.koleksiId);
  if (x) bukaTempel({ id: x.id, judul: x.judul, teks: x.teks });
});
document.getElementById('hapus-sheet').addEventListener('click', (e) => {
  e.stopPropagation();
  const x = koleksi.ambil(keadaan.latihan?.koleksiId);
  if (!x) return;
  if (!window.confirm(`Hapus "${x.judul}" dari koleksi? Sheet ini hilang dari browser dan tidak bisa dikembalikan (kecuali ada file ekspor).`)) return;
  koleksi.hapus(x.id);
  isiKoleksi();
  el.progresi.value = '';
  pilihLatihan('');
});

// ekspor / impor koleksi (file .json) untuk cadangan atau pindah perangkat
document.getElementById('ekspor-koleksi').addEventListener('click', () => {
  const blob = new Blob([koleksi.ekspor()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `koleksi-swaravana-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
const berkasImpor = document.getElementById('berkas-impor');
document.getElementById('impor-koleksi').addEventListener('click', () => berkasImpor.click());
berkasImpor.addEventListener('change', async () => {
  const f = berkasImpor.files?.[0];
  berkasImpor.value = '';
  if (!f) return;
  try {
    const { ditambah, dilewati } = koleksi.impor(await f.text());
    isiKoleksi();
    document.getElementById('info-koleksi').textContent = `${ditambah} sheet berhasil masuk${dilewati ? `, ${dilewati} dilewati karena sudah ada atau rusak` : ''}.`;
  } catch (err) {
    document.getElementById('info-koleksi').textContent = `Impor gagal: ${err.message}`;
  }
});

// ------------------------------------------------------------------ saran iringan lagu rohani
/** Pasang tempo, gaya iringan (gitar & piano), isian (gitar & piano), dan kapan isian dari saran lagu. */
function terapkanSaran(s) {
  if (!s) return;
  pemutar.berhenti(false);
  pemutar.aturTempo(s.tempo);
  tempo.value = pemutar.bpm;
  labelTempo.textContent = `${pemutar.bpm} bpm`;
  localStorageAman('akor.tempo', String(pemutar.bpm));
  localStorageAman('akor.pola', s.polaGitar);
  localStorageAman('akor.polaPiano', s.polaPiano);
  pemutar.isianJenis = s.isianPiano; localStorageAman('akor.isian', s.isianPiano);
  pemutar.isianJenisGitar = s.isianGitar; localStorageAman('akor.isianGitar', s.isianGitar);
  pemutar.isianTiap = s.kapan === 'kalimat' ? 'kalimat' : Number(s.kapan) || 1;
  if (s.ketukPerAkor) ketukPerAkor.value = String(s.ketukPerAkor); // 3 untuk lagu 3/4: satu akor per birama
  pilihIsianTiap.value = String(pemutar.isianTiap);
  localStorageAman('akor.isianTiap', String(pemutar.isianTiap));
  isiPilihanPola(); // memilih pola tersimpan untuk instrumen aktif
  isiPilihanIsian();
  if (suara.instrumen === 'gitar' && pemutar.polaId === 'kustom') editorPola.hidden = false;
  const pola = (suara.instrumen === 'piano' ? POLA_PIANO : POLA).find((p) => p.id === pemutar.polaId);
  el.skor.textContent = `Saran dipasang: ${pola ? `${pola.nama.split(' · ')[0].toLowerCase()}, ` : ''}${pemutar.bpm} bpm, isian di akhir baris.`;
}
document.getElementById('pakai-saran').addEventListener('click', (e) => {
  e.stopPropagation(); // jangan ikut melipat kartu lembar
  terapkanSaran(keadaan.latihan?.saran);
});

// ------------------------------------------------------------------ tampilan
function perbaruiTampilan() {
  const kiri = jumlahKiri();
  isiNamaPad();
  if (!keadaan.latihan) semuaPad().forEach(([, , t]) => t.classList.remove('target'));
  NAMA_BARIS.forEach((b) => barisPad[b].classList.toggle('aktif', pelacak.aktif && b === keadaan.barisKamera));
  el.panduan.querySelectorAll('li').forEach((li) => li.classList.toggle('aktif', li.dataset.jari === String(kiri ?? 'auto')));
  el.kiriKini.textContent = kiri === null ? 'tidak terlihat' : teksKiri(kiri);
  if (keadaan.latihan) perbaruiLatihan();
  tulisKetPemula();
  if (typeof isiPetaMode === 'function') isiPetaMode();
}

/** "2 jari: akor 7", "mengepal: mayor". */
function teksKiri(kiri) {
  const akhiran = KUALITAS[kualitasDariKiri(kiri, 'mayor')].akhiran;
  return `${kiri === 0 ? 'mengepal' : `${kiri} jari`}: ${akhiran ? `akor ${akhiran}` : 'mayor'}`;
}

function aturStatus(teks, kelas) {
  el.status.textContent = teks;
  el.status.className = `lencana ${kelas || ''}`;
}

// ------------------------------------------------------------------ perekam (penyetelan)
// 30 detik terakhir nilai lurus-tekuk tiap jari tangan akor + petikan yang terjadi.
// Hanya di memori tab ini (tidak dikirim/disimpan ke mana pun); dipakai untuk menyetel
// ambang deteksi dari gerakan tangan sungguhan. Ambil lewat console: __akorRekam
const rekaman = [];
window.__akorRekam = rekaman;
function rekam(t, eks, p) {
  rekaman.push({ t: Math.round(t), e: eks.map((x) => Math.round(x * 100) / 100), p: p ? `${p.baris}:${p.jari}` : null });
  while (rekaman.length && t - rekaman[0].t > 30000) rekaman.shift();
}

// ------------------------------------------------------------------ hasil kamera
let tPetikKamera = -Infinity;
/**
 * Petikan dari kamera. Mode kombinasi: sentuhan jempol (pasangan jempol) + tekukan (1 jari atau
 * 2 jari tanpa jempol). Selama jempol mendekati/menyentuh sebuah jari, tekukan jempol & jari itu
 * ditahan supaya gerakan menyentuh tidak ikut terbaca sebagai petikan satu jari.
 */
function deteksiPetikan(lm, t) {
  const mode = keadaan.modeKamera;
  if (mode === 'bentuk') {
    const b = pemicuBentuk.perbarui(keadaan.eksAkor, t);
    const pos = b && posisiBentuk(b.bentuk);
    return pos ? { ...pos, kekuatan: b.kekuatan } : null;
  }
  if (mode !== 'kombinasi') {
    const p = pemicu.perbarui(keadaan.eksAkor, t);
    return p && { baris: keadaan.barisKamera, jari: p.jari, kekuatan: p.kekuatan };
  }
  const s = pemicuSentuh.perbarui(lm, keadaan.aspek, t);
  const jariSentuh = pemicuSentuh.aktif ?? pemicuSentuh.dekat;
  const b = pemicuKombinasi.perbarui(keadaan.eksAkor, t, jariSentuh ? [0, jariSentuh] : []);
  let p = s ?? b;
  // satu gerakan bisa terbaca dua detektor berturut-turut: ambil yang pertama saja
  if (p && t - tPetikKamera < 180) p = null;
  if (p) tPetikKamera = t;
  if (!p) return null;
  // 2 jari (sentuh / tekuk bersamaan) → baris atas/bawah sesuai pasangan
  const pos = p.pasangan ? posisiKombinasi(p.pasangan) : { baris: 'tengah', jari: p.jari };
  return pos && { ...pos, kekuatan: p.kekuatan };
}
let kiriSebelum = null;
pelacak.onHasil = (daftar, info) => {
  keadaan.aspek = info.lebar && info.tinggi ? info.lebar / info.tinggi : 4 / 3;
  const { akor, pengubah } = bagiTangan(daftar);
  keadaan.tanganAkor = akor;
  keadaan.tanganKiri = pengubah;

  keadaan.kiriKamera = penstabil.perbarui(pengubah ? jumlahTerangkat(ekstensiJari(pengubah, keadaan.aspek)) : null);
  if (keadaan.kiriKamera !== kiriSebelum) { kiriSebelum = keadaan.kiriKamera; perbaruiTampilan(); }

  if (akor) {
    // hanya mode "tinggi tangan" yang memakai tinggi tangan; mode lain selalu baris utama
    const baris = keadaan.modeKamera === 'tinggi' ? pemilihBaris.perbarui(akor) : 'tengah';
    if (baris !== keadaan.barisKamera) { keadaan.barisKamera = baris; perbaruiTampilan(); }
    keadaan.eksAkor = ekstensiJari(akor, keadaan.aspek);
    // kepalan tangan kanan = jeda genjreng ("hop"), buka tangan = lanjut tepat di ketukan
    // (mode bentuk: kepalan = posisi diam/menahan akor, bukan jeda)
    const kepal = keadaan.modeKamera !== 'bentuk' && deteksiKepalan.perbarui(keadaan.eksAkor);
    if (kepal !== keadaan.kepal) { keadaan.kepal = kepal; if (pemutar.berjalan) pemutar.aturJeda(kepal); }
    const p = deteksiPetikan(akor, info.t);
    if (p) petik(p.jari, p.kekuatan, jumlahKiri(), p.baris);
    rekam(info.t, keadaan.eksAkor, p);
    keadaan.tAkorTerakhir = info.t;
  } else {
    keadaan.eksAkor = null;
    pemicu.reset();
    pemicuSentuh.reset();
    pemicuBentuk.reset();
    // tangan akor hilang > 1,5 detik: hentikan pola genjreng (seperti melepas gitar)
    if (pemutar.berjalan && info.t - (keadaan.tAkorTerakhir ?? 0) > 1500) pemutar.berhenti(true);
  }
};

// ------------------------------------------------------------------ gambar overlay
const ctx = el.kanvas.getContext('2d');
const SAMBUNG = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [0, 17, 18, 19, 20], [5, 9, 13, 17]];
const UJUNG = [4, 8, 12, 16, 20];
const warna = (nama) => getComputedStyle(document.documentElement).getPropertyValue(nama).trim();

function ukurKanvas() {
  const r = el.kanvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (el.kanvas.width !== w || el.kanvas.height !== h) { el.kanvas.width = w; el.kanvas.height = h; }
  return { w, h, dpr };
}

/** Titik landmark → piksel kanvas (dicerminkan, mengikuti object-fit: cover). */
function keLayar(p, w, h) {
  const vw = el.video.videoWidth || 640, vh = el.video.videoHeight || 480;
  const s = Math.max(w / vw, h / vh);
  const ox = (w - vw * s) / 2, oy = (h - vh * s) / 2;
  return { x: w - (p.x * vw * s + ox), y: p.y * vh * s + oy };
}

function pil(x, y, teks, { latar, depan, besar }) {
  ctx.font = `700 ${besar}px system-ui, sans-serif`;
  const lebar = ctx.measureText(teks).width + besar * 0.9;
  const tinggi = besar * 1.5;
  ctx.fillStyle = latar;
  ctx.beginPath();
  ctx.roundRect(x - lebar / 2, y - tinggi / 2, lebar, tinggi, tinggi / 2);
  ctx.fill();
  ctx.fillStyle = depan;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(teks, x, y + 1);
}

function gambarTangan(lm, w, h, { garis, titik }) {
  ctx.lineWidth = Math.max(2, w / 400);
  ctx.strokeStyle = garis;
  for (const ruas of SAMBUNG) {
    ctx.beginPath();
    ruas.forEach((i, n) => { const q = keLayar(lm[i], w, h); n ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
    ctx.stroke();
  }
  ctx.fillStyle = titik;
  for (const p of lm) { const q = keLayar(p, w, h); ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(2, w / 300), 0, Math.PI * 2); ctx.fill(); }
}

/**
 * Mode kombinasi: label akor 2 jari di antara ujung jarinya. Pasangan bersebelahan selalu
 * tampil (redup); pasangan berjarak hanya saat jadi target latihan atau baru dipetik.
 */
function gambarPasangan(lm, w, h, dpr, T, sekarang, kiri, aksen, aksen2) {
  for (const baris of ['atas', 'bawah']) {
    KOMBINASI[baris].forEach(([a, b], jari) => {
      const umur = sekarang - (keadaan.nyala.get(`${baris}:${jari}`) ?? -1e9);
      const kilat = Math.max(0, 1 - umur / 400);
      const target = T && T.baris === baris && T.jari === jari;
      const dekat = b - a === 1;
      const didekati = a === 0 && (pemicuSentuh.dekat === b || pemicuSentuh.aktif === b); // jempol sedang menuju jari ini
      if (!dekat && !target && !didekati && kilat <= 0) return;
      const p = keLayar(lm[UJUNG[a]], w, h), q = keLayar(lm[UJUNG[b]], w, h);
      if (target || kilat > 0) { // garis penghubung kedua ujung jari
        ctx.strokeStyle = kilat > 0 ? aksen : aksen2;
        ctx.lineWidth = 3 * dpr;
        ctx.setLineDash(target && kilat <= 0 ? [6 * dpr, 5 * dpr] : []);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        ctx.setLineDash([]);
        for (const r of [p, q]) { ctx.beginPath(); ctx.arc(r.x, r.y, 13 * dpr, 0, Math.PI * 2); ctx.stroke(); }
      }
      // berjarak / jempol: label diangkat lebih tinggi supaya tidak menumpuk label 1 jari
      const naik = (dekat && a > 0 ? 50 : 78) * dpr;
      const nama = namaPad(jari, kiri, baris);
      pil((p.x + q.x) / 2, Math.min(p.y, q.y) - naik, target ? `${nama}: ${teksKombinasi(baris, jari)}` : nama, {
        latar: kilat > 0 ? aksen : target || didekati ? aksen2 : 'rgba(20,17,15,.55)',
        depan: kilat > 0 || target || didekati ? '#1a1208' : 'rgba(255,255,255,.8)',
        besar: (target || didekati ? 15 : 11) * dpr,
      });
    });
  }
}

/**
 * Mode bentuk: ujung jari yang keluar diberi titik, dan di atas tangan tampil bentuk yang
 * terbaca → akornya (atau ✊ saat mengepal). Target latihan ditulis di bawah pergelangan.
 */
function gambarBentuk(lm, w, h, dpr, T, sekarang, kiri, aksen, aksen2) {
  const kini = pemicuBentuk.kini;
  const keluar = new Set(kini ?? []);
  UJUNG.forEach((u, j) => {
    if (!keluar.has(j)) return;
    const q = keLayar(lm[u], w, h);
    ctx.fillStyle = aksen;
    ctx.beginPath(); ctx.arc(q.x, q.y, 9 * dpr, 0, Math.PI * 2); ctx.fill();
  });
  // posisi label: di atas ujung jari tertinggi
  const atas = UJUNG.map((u) => keLayar(lm[u], w, h)).reduce((a, b) => (b.y < a.y ? b : a));
  const pos = kini && kini.length ? posisiBentuk(kini) : null;
  const umur = pos ? sekarang - (keadaan.nyala.get(`${pos.baris}:${pos.jari}`) ?? -1e9) : 1e9;
  const kilat = Math.max(0, 1 - umur / 400);
  let teks, latar = 'rgba(20,17,15,.75)', depan = '#fff';
  if (kini === null) teks = '…';
  else if (!kini.length) teks = '✊ diam (akor ditahan)';
  else if (!pos) teks = 'bentuk tidak dipakai';
  else {
    teks = `${teksBentuk(pos.baris, pos.jari)}: ${namaPad(pos.jari, kiri, pos.baris)}`;
    if (kilat > 0) { latar = aksen; depan = '#1a1208'; }
  }
  pil(atas.x, atas.y - 30 * dpr, teks, { latar, depan, besar: 15 * dpr });
  if (T) {
    const q = keLayar(lm[0], w, h);
    const cocok = pos && pos.baris === T.baris && pos.jari === T.jari;
    pil(q.x, q.y + 30 * dpr, `${cocok ? '✓' : 'berikut'} ${T.main}: ${teksBentuk(T.baris, T.jari)}`, { latar: aksen2, depan: '#06201b', besar: 13 * dpr });
  }
}

function gambar() {
  const { w, h, dpr } = ukurKanvas();
  ctx.clearRect(0, 0, w, h);
  if (pelacak.aktif) {
    // garis tengah: kiri = jenis akor, kanan = akor
    ctx.setLineDash([8 * dpr, 8 * dpr]);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = dpr;
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `600 ${12 * dpr}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left'; ctx.fillText(pemulaAktif() ? 'Tangan kiri: tidak dipakai' : 'Tangan kiri: jenis akor', 12 * dpr, 10 * dpr);
    ctx.textAlign = 'right'; ctx.fillText('Tangan kanan: akor', w - 12 * dpr, 10 * dpr);
    // zona baris akor (tinggi tangan kanan) di separuh kanan — hanya mode "tinggi tangan"
    if (keadaan.modeKamera === 'tinggi') {
    const yAtas = keLayar({ x: 0, y: pemilihBaris.batasAtas }, w, h).y;
    const yBawah = keLayar({ x: 0, y: pemilihBaris.batasBawah }, w, h).y;
    ctx.setLineDash([4 * dpr, 6 * dpr]);
    ctx.strokeStyle = 'rgba(255,255,255,.14)';
    for (const y of [yAtas, yBawah]) { ctx.beginPath(); ctx.moveTo(w / 2, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (const [b, y] of [['atas', yAtas / 2], ['tengah', (yAtas + yBawah) / 2], ['bawah', (yBawah + h) / 2]]) {
      const aktif = b === keadaan.barisKamera && keadaan.tanganAkor;
      ctx.font = `${aktif ? 700 : 600} ${11 * dpr}px system-ui, sans-serif`;
      ctx.fillStyle = aktif ? 'rgba(240,167,74,.9)' : 'rgba(255,255,255,.3)';
      ctx.fillText(`BARIS ${LABEL_BARIS[b].toUpperCase()}`, w - 12 * dpr, y);
    }
    }

    const aksen = warna('--aksen') || '#f0a74a', aksen2 = warna('--aksen-2') || '#5fc8b4';
    const kiri = jumlahKiri();
    const T = targetLatihan();
    const sekarang = performance.now();

    if (keadaan.tanganKiri && !pemulaAktif()) {
      gambarTangan(keadaan.tanganKiri, w, h, { garis: 'rgba(95,200,180,.6)', titik: aksen2 });
      const q = keLayar(keadaan.tanganKiri[0], w, h);
      const label = kiri === null ? '…' : teksKiri(kiri);
      pil(q.x, q.y + 26 * dpr, label, { latar: aksen2, depan: '#06201b', besar: 15 * dpr });
    }
    if (keadaan.tanganAkor) {
      gambarTangan(keadaan.tanganAkor, w, h, { garis: 'rgba(255,255,255,.45)', titik: '#fff' });
      if (keadaan.modeKamera === 'bentuk') gambarBentuk(keadaan.tanganAkor, w, h, dpr, T, sekarang, kiri, aksen, aksen2);
      else UJUNG.forEach((u, j) => {
        const q = keLayar(keadaan.tanganAkor[u], w, h);
        const baris = keadaan.barisKamera;
        const umur = sekarang - (keadaan.nyala.get(`${baris}:${j}`) ?? -1e9);
        const kilat = Math.max(0, 1 - umur / 300);
        const lurus = keadaan.eksAkor ? keadaan.eksAkor[j] : 1;
        const target = T && T.jari === j && T.baris === baris;
        if (kilat > 0) {
          ctx.fillStyle = `rgba(240,167,74,${0.55 * kilat})`;
          ctx.beginPath(); ctx.arc(q.x, q.y, (18 + 40 * (1 - kilat)) * dpr, 0, Math.PI * 2); ctx.fill();
        }
        const nama = namaPad(j, kiri, baris);
        pil(q.x, q.y - 22 * dpr, nama, {
          latar: kilat > 0 ? aksen : target ? aksen2 : `rgba(20,17,15,${0.55 + 0.35 * lurus})`,
          depan: kilat > 0 || target ? '#1a1208' : '#fff',
          besar: (target ? 17 : 14) * dpr,
        });
      });
      if (keadaan.modeKamera === 'kombinasi') gambarPasangan(keadaan.tanganAkor, w, h, dpr, T, sekarang, kiri, aksen, aksen2);
      // target latihan ada di baris lain: beri tahu arah gerak tangan
      if (T && T.baris !== 'tengah' && keadaan.modeKamera === 'utama') {
        const q = keLayar(keadaan.tanganAkor[0], w, h);
        pil(q.x, q.y + 30 * dpr, `${T.main}: ${layarSentuh() ? 'ketuk pad-nya' : `tekan ${TOMBOL_BARIS[T.baris][T.jari]}`} atau pakai mode Kombinasi jari`, { latar: aksen2, depan: '#06201b', besar: 13 * dpr });
      } else if (T && T.baris !== keadaan.barisKamera && keadaan.modeKamera === 'tinggi') {
        const q = keLayar(keadaan.tanganAkor[0], w, h);
        const naik = NAMA_BARIS.indexOf(T.baris) < NAMA_BARIS.indexOf(keadaan.barisKamera);
        pil(q.x, q.y + 30 * dpr, `${naik ? '↑ naikkan' : '↓ turunkan'} tangan ke baris ${LABEL_BARIS[T.baris].toLowerCase()}`, { latar: aksen2, depan: '#06201b', besar: 13 * dpr });
      }
    }
  }
  perbaruiKetukan();
  requestAnimationFrame(gambar);
}
requestAnimationFrame(gambar);

// ------------------------------------------------------------------ statistik
function tulisStatistik() {
  const s = pelacak.statistik;
  const audio = suara.latensi();
  const baris = [
    ['Kamera', pelacak.aktif ? `${s.fps} fps (${s.delegasi ?? '–'})` : 'mati'],
    ['Membaca tangan', pelacak.aktif ? `${s.msDeteksi.toFixed(1)} ms` : '–'],
    ['Gambar kamera', s.umurFrame != null ? `${s.umurFrame.toFixed(0)} ms` : 'tidak tersedia'],
    ['Suara keluar', audio != null ? `${(audio * 1000).toFixed(0)} ms` : '–'],
  ];
  if (pelacak.aktif && audio != null) {
    const total = (s.umurFrame ?? s.msDeteksi + 1000 / Math.max(1, s.fps)) + audio * 1000;
    baris.push(['Total kira-kira', `${total.toFixed(0)} ms`]);
  }
  // Bluetooth menambah ±150–250 ms yang tidak bisa dikurangi aplikasi; beri tahu pemain.
  const peringatan = document.getElementById('peringatan-audio');
  const telat = audio != null && audio > 0.08;
  peringatan.hidden = !telat;
  if (telat) peringatan.textContent = `Suara keluar ±${Math.round(audio * 1000)} ms terlambat, biasanya karena headphone/speaker Bluetooth. Untuk main, pindahkan output ke speaker bawaan atau headphone kabel lewat menu suara; muat ulang halaman bila angka ini belum turun.`;
  el.statistik.replaceChildren(...baris.flatMap(([k, v]) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; return [dt, dd]; }));
  if (pelacak.aktif) {
    const n = (keadaan.tanganAkor ? 1 : 0) + (keadaan.tanganKiri ? 1 : 0);
    aturStatus(n ? `Kamera aktif, ${n} tangan terlihat` : 'Kamera aktif, tangan belum terlihat', 'ok');
  }
}
setInterval(tulisStatistik, 300);

// ------------------------------------------------------------------ mulai
async function tutupSambutan() {
  el.sambutan.hidden = true;
  el.sambutan.style.display = 'none';
  aturPanggung();
}

/** Kamera mati setelah sambutan ditutup → panggung jadi strip ringkas supaya pad & sheet naik. */
function aturPanggung() {
  document.body.classList.toggle('kamera-mati', el.sambutan.hidden && !pelacak.aktif);
  document.body.classList.toggle('kamera-nyala', pelacak.aktif);
}

const tombolKameraKepala = document.getElementById('tombol-kamera-kepala');

// ------------------------------------------------------------------ tab panel kanan
// Panel kanan dibagi 4 tab (Main · Lagu · Suara · Kontrol) supaya tidak semua kartu tampil
// sekaligus. Kartu akor yang sedang berbunyi tetap di atas, di luar tab.
const tombolTab = [...document.querySelectorAll('.tab-panel [role=tab]')];
function pilihTabPanel(id, simpan = true) {
  tombolTab.forEach((b) => {
    const pilih = b.dataset.tab === id;
    b.setAttribute('aria-selected', String(pilih));
    b.tabIndex = pilih ? 0 : -1;
  });
  document.querySelectorAll('.isi-tab').forEach((x) => { x.hidden = x.dataset.isi !== id; });
  if (simpan) localStorageAman('akor.tab', id);
}
tombolTab.forEach((b, i) => {
  b.addEventListener('click', () => pilihTabPanel(b.dataset.tab));
  b.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    e.stopPropagation();
    const ke = tombolTab[(i + (e.key === 'ArrowRight' ? 1 : tombolTab.length - 1)) % tombolTab.length];
    pilihTabPanel(ke.dataset.tab);
    ke.focus();
  });
});
pilihTabPanel(['main', 'lagu', 'suara', 'kontrol'].includes(localStorageAman('akor.tab')) ? localStorageAman('akor.tab') : 'main', false);

/**
 * Saat kamera menyala, layar kamera memenuhi kolom kiri sehingga sheet di bawahnya tidak terlihat.
 * Sheet dipindah ke panel kanan (tepat di bawah akor yang sedang dimainkan), dan dikembalikan
 * ke bawah pad saat kamera dimatikan.
 */
const asalLembar = { setelah: lembar.previousElementSibling }; // = #pad
function letakkanLembar() {
  const kePanel = pelacak.aktif;
  lembar.classList.toggle('di-panel', kePanel);
  if (kePanel) {
    document.getElementById('isi-main').prepend(lembar);
    if (keadaan.latihan) pilihTabPanel('main', false); // sheet ada di tab Main
  } else asalLembar.setelah.after(lembar);
  if (keadaan.latihan) perbaruiLatihan(); // gulir lagi ke akor yang sedang dituju
}

async function nyalakanKamera(tombol, teksAsli) {
  el.galat.hidden = true;
  tombol.disabled = true;
  tombol.textContent = 'Memuat model tangan…';
  try {
    await pastikanSuara();
    await pelacak.mulai();
    await tutupSambutan();
    tombolKameraKepala.hidden = true;
    tombolMatikan.hidden = false;
    aturPanggung();
    letakkanLembar();
    aturStatus('Kamera aktif', 'ok');
  } catch (e) {
    el.galat.textContent = `${e.message} ${layarSentuh() ? 'Kamu tetap bisa main dengan mengetuk pad di bawah.' : 'Kamu tetap bisa main pakai keyboard atau ketuk pad di bawah.'}`;
    el.galat.hidden = false;
    if (el.sambutan.hidden) aturStatus(`Kamera tidak aktif: ${e.message}`, 'salah');
    else aturStatus('Kamera tidak aktif', 'salah');
  } finally {
    tombol.disabled = false;
    tombol.textContent = teksAsli;
  }
}

const tombolMatikan = document.getElementById('tombol-matikan-kamera');
tombolMatikan.addEventListener('click', () => {
  pelacak.berhenti();
  pemutar.berhenti(true);
  pemicu.reset();
  pemicuSentuh.reset();
  pemicuBentuk.reset();
  Object.assign(penstabil, { nilai: null, calon: null, hitung: 0 });
  Object.assign(keadaan, { tanganAkor: null, tanganKiri: null, eksAkor: null, kiriKamera: null, barisKamera: 'tengah' });
  pemilihBaris.reset();
  kiriSebelum = null;
  tombolMatikan.hidden = true;
  tombolKameraKepala.hidden = false;
  aturPanggung();
  letakkanLembar();
  aturStatus('Kamera mati');
  perbaruiTampilan();
});

el.mulai.addEventListener('click', () => nyalakanKamera(el.mulai, 'Nyalakan kamera & suara'));
tombolKameraKepala.addEventListener('click', () => nyalakanKamera(tombolKameraKepala, 'Nyalakan kamera'));
const tombolKameraPanggung = document.getElementById('tombol-kamera-panggung');
tombolKameraPanggung.addEventListener('click', () => nyalakanKamera(tombolKameraPanggung, 'Nyalakan kamera'));

el.tanpaKamera.addEventListener('click', async () => {
  await pastikanSuara();
  await tutupSambutan();
  tombolKameraKepala.hidden = false;
  aturStatus('Kamera mati');
});

// ------------------------------------------------------------------ keyboard
const HURUF = Object.fromEntries(NAMA_BARIS.flatMap((b) => [...TOMBOL_BARIS[b].toLowerCase()].map((h, j) => [h, [b, j]])));
const angkaDitahan = new Set();
window.addEventListener('keydown', async (e) => {
  if (e.target.closest?.('select, input') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (/^[0-5]$/.test(k)) {
    angkaDitahan.add(Number(k));
    keadaan.kiriKeyboard = Number(k);
    perbaruiTampilan();
    return;
  }
  if (k in HURUF && !e.repeat) { e.preventDefault(); const kiri = jumlahKiri(); const panjang = e.shiftKey; const [b, j] = HURUF[k]; await pastikanSuara(); petik(j, 0.8, kiri, b, { panjang }); return; }
  // tahan Spasi = jeda ("hop"), lepas = lanjut tepat di ketukan; tanpa pola berjalan = redam
  if (k === ' ') { e.preventDefault(); if (e.repeat) return; if (pemutar.berjalan) pemutar.aturJeda(true); else suara.diam(); return; }
  if (e.key === 'Escape') { hentikanPutar(); pemutar.berhenti(true); }
});
window.addEventListener('keyup', (e) => {
  if (e.key === ' ') { e.preventDefault(); pemutar.aturJeda(false); return; }
  const k = e.key;
  if (/^[0-5]$/.test(k)) {
    angkaDitahan.delete(Number(k));
    keadaan.kiriKeyboard = angkaDitahan.size ? [...angkaDitahan].at(-1) : null;
    perbaruiTampilan();
  }
});
window.addEventListener('blur', () => { angkaDitahan.clear(); keadaan.kiriKeyboard = null; pemutar.aturJeda(false); perbaruiTampilan(); });

// ------------------------------------------------------------------ kartu bisa dilipat
// Tiap kartu [data-lipat] punya tombol ▾ di judulnya (atau klik judulnya). Judul + ringkasan
// tetap tampil saat dilipat; status disimpan per kartu di browser.
function pasangLipat() {
  document.querySelectorAll('[data-lipat]').forEach((kartu) => {
    const id = kartu.dataset.lipat;
    const kepala = kartu.querySelector('.kepala-kartu');
    const tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.className = 'tombol-lipat';
    tombol.innerHTML = '<span aria-hidden="true">▾</span>';
    kepala.append(tombol);
    const atur = (lipat) => {
      kartu.classList.toggle('terlipat', lipat);
      tombol.setAttribute('aria-expanded', String(!lipat));
      tombol.setAttribute('aria-label', `${lipat ? 'Besarkan' : 'Kecilkan'} kartu ${kepala.firstChild.textContent.trim()}`);
      tombol.title = lipat ? 'Besarkan' : 'Kecilkan';
    };
    atur(localStorageAman(`akor.lipat.${id}`) === '1');
    kepala.addEventListener('click', (e) => {
      if (e.target.closest('select, input, a, button:not(.tombol-lipat)')) return;
      const lipat = !kartu.classList.contains('terlipat');
      atur(lipat);
      localStorageAman(`akor.lipat.${id}`, lipat ? '1' : '0');
    });
  });
}
pasangLipat();

/** Ringkasan di judul kartu (tetap terlihat saat dilipat). */
function tulisRingkasan() {
  const pola = pemutar.polaId === 'kustom' ? 'pola sendiri' : pemutar.polaId === 'tab-kustom' ? 'petikan sendiri'
    : pemutar.pola.nama.split(' · ')[0].toLowerCase();
  document.getElementById('ringkas-instrumen').textContent = suara.instrumen === 'gitar' ? `gitar ${suara.jenisGitar === 'baja' ? 'akustik' : 'nilon'}` : 'piano';
  document.getElementById('ringkas-irama').textContent = `${pola}, ${pemutar.bpm} bpm`;
  const L = keadaan.latihan;
  document.getElementById('ringkas-latihan').textContent = L ? `${L.judul}${keadaan.ikutiSheet ? '' : ' (bebas)'}` : 'main bebas';
}
setInterval(tulisRingkasan, 500);
// ringkasan kartu langsung ikut berubah saat pilihan diganti (tidak menunggu interval)
for (const id of ['pola', 'tempo', 'jenis-gitar']) document.getElementById(id).addEventListener(id === 'tempo' ? 'input' : 'change', () => setTimeout(tulisRingkasan));
document.querySelectorAll('[data-inst]').forEach((b) => b.addEventListener('click', () => setTimeout(tulisRingkasan)));
tulisRingkasan();

// perangkat sentuh: petunjuk awal "tekan A S D F G" diganti "ketuk pad di bawah"
if (layarSentuh()) {
  if (!keadaan.latihan) el.akorSub.textContent = 'keluarkan jari tangan kanan, atau ketuk pad di bawah';
  const kosong = document.querySelector('.kosong-tab p:not([class])');
  if (kosong) kosong.textContent = 'Ketuk pad di bawah atau tunjukkan jari ke kamera. Cara memainkannya di gitar dan piano akan muncul di sini.';
  const mati = document.querySelector('.teks-mati span');
  if (mati) mati.textContent = 'Ketuk pad di bawah untuk main. Nyalakan kamera untuk main dengan tangan.';
}

aturModeKamera(keadaan.modeKamera); // juga memanggil perbaruiTampilan()
tulisStatistik();

// PWA: cache aset (termasuk model) supaya tetap jalan saat server mati
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
