// Diagram akor gitar (modul murni): posisi jari untuk tuning standar E A D G B E.
// Urutan senar di array: senar 6 (E rendah) → senar 1 (E tinggi).
// Nilai fret: -1 = tidak dibunyikan (×), 0 = senar terbuka (o), n = tekan fret n.

export const SENAR_STANDAR = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
const X = -1;

/** Bentuk akor terbuka yang umum (dipakai bila ada). Kunci: `${akar}:${kualitas}`. */
const TERBUKA = {
  '0:mayor': [X, 3, 2, 0, 1, 0], // C
  '0:dom7': [X, 3, 2, 3, 1, 0], // C7
  '0:maj7': [X, 3, 2, 0, 0, 0], // Cmaj7
  '0:add9': [X, 3, 2, 0, 3, 0], // Cadd9
  '0:sus4': [X, 3, 3, 0, 1, 1], // Csus4
  '2:mayor': [X, X, 0, 2, 3, 2], // D
  '2:minor': [X, X, 0, 2, 3, 1], // Dm
  '2:dom7': [X, X, 0, 2, 1, 2], // D7
  '2:maj7': [X, X, 0, 2, 2, 2], // Dmaj7
  '2:m7': [X, X, 0, 2, 1, 1], // Dm7
  '2:sus4': [X, X, 0, 2, 3, 3], // Dsus4
  '7:mayor': [3, 2, 0, 0, 0, 3], // G
  '7:dom7': [3, 2, 0, 0, 0, 1], // G7
  '7:maj7': [3, 2, 0, 0, 0, 2], // Gmaj7
};

/** Bentuk barre relatif terhadap fret barre r (0 = senar terbuka saat r = 0). */
const BENTUK_E = { // akar di senar 6
  mayor: [0, 2, 2, 1, 0, 0], minor: [0, 2, 2, 0, 0, 0], dom7: [0, 2, 0, 1, 0, 0], maj7: [0, 2, 1, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0], sus4: [0, 2, 2, 2, 0, 0], sus2: [0, 2, 4, 4, 0, 0], add9: [0, 2, 2, 1, 0, 2], madd9: [0, 2, 2, 0, 0, 2],
};
const BENTUK_A = { // akar di senar 5, senar 6 tidak dibunyikan
  mayor: [X, 0, 2, 2, 2, 0], minor: [X, 0, 2, 2, 1, 0], dom7: [X, 0, 2, 0, 2, 0], maj7: [X, 0, 2, 1, 2, 0],
  m7: [X, 0, 2, 0, 1, 0], sus4: [X, 0, 2, 2, 3, 0], sus2: [X, 0, 2, 2, 0, 0], add9: [X, 0, 2, 4, 2, 0], madd9: [X, 0, 2, 4, 1, 0],
};

function geser(bentuk, r) {
  return bentuk.map((f) => (f === X ? X : f + r));
}

/**
 * Posisi jari untuk sebuah akor (dari teori.akorUntuk: {akar, kualitas}).
 * Pilihan: bentuk terbuka umum → barre bentuk E / A di fret terendah.
 * @returns {{fret:number[], jari:(number|null)[], barre:{fret:number, dari:number, ke:number}|null, mulai:number, nama:string}}
 */
export function bentukGitar(akor) {
  const calon = [];
  const terbuka = TERBUKA[`${akor.akar}:${akor.kualitas}`];
  if (terbuka) calon.push({ fret: terbuka, barre: null, bobot: -1 });
  const rE = (akor.akar - 4 + 12) % 12, rA = (akor.akar - 9 + 12) % 12;
  if (BENTUK_E[akor.kualitas]) calon.push({ fret: geser(BENTUK_E[akor.kualitas], rE), barre: rE > 0 ? rE : null, bobot: rE });
  if (BENTUK_A[akor.kualitas]) calon.push({ fret: geser(BENTUK_A[akor.kualitas], rA), barre: rA > 0 ? rA : null, bobot: rA + 0.5 });
  calon.sort((a, b) => a.bobot - b.bobot);
  const c = calon[0];
  const dimainkan = c.fret.map((f, i) => (f > 0 ? i : null)).filter((i) => i !== null);
  const terendah = Math.min(...c.fret.filter((f) => f > 0));
  const mulai = Math.max(...c.fret) <= 4 ? 1 : terendah;
  let barre = null;
  if (c.barre) {
    // barre: telunjuk menekan semua senar dari senar akar sampai senar 1 pada fret barre
    const dari = c.fret.findIndex((f) => f !== X);
    barre = { fret: c.barre, dari, ke: 5 };
  }
  return { fret: c.fret, jari: nomorJari(c.fret, barre), barre, mulai: Number.isFinite(mulai) ? mulai : 1, dimainkan };
}

/**
 * Nomor jari (1 telunjuk … 4 kelingking) sederhana: barre = telunjuk; sisanya diurutkan
 * menurut fret lalu senar.
 */
function nomorJari(fret, barre) {
  const jari = fret.map(() => null);
  let berikut = 1;
  if (barre) {
    for (let i = barre.dari; i <= barre.ke; i++) if (fret[i] === barre.fret) jari[i] = 1;
    berikut = 2;
  }
  fret
    .map((f, i) => ({ f, i }))
    .filter(({ f, i }) => f > 0 && jari[i] === null)
    .sort((a, b) => a.f - b.f || a.i - b.i)
    .forEach(({ i }) => { jari[i] = Math.min(4, berikut++); });
  return jari;
}

/** Nada MIDI yang berbunyi dari sebuah bentuk (tuning standar), untuk pengecekan. */
export function nadaBentuk(fret, senar = SENAR_STANDAR) {
  return fret.map((f, i) => (f === X ? null : senar[i] + f)).filter((m) => m !== null);
}
