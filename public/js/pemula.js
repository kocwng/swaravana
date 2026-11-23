// Mode pemula (modul murni, tanpa DOM): menaruh tepat akor-akor dari sheet yang dimuat
// ke 15 pad, sehingga tangan kiri tidak diperlukan. Akor yang paling sering muncul
// mendapat pad yang paling mudah dijangkau (baris tengah dulu, lalu atas, lalu bawah).

/** 15 posisi pad [baris, jari] urut dari yang paling mudah. */
export const URUTAN_SLOT = ['tengah', 'atas', 'bawah'].flatMap((baris) =>
  [0, 1, 2, 3, 4].map((jari) => [baris, jari]),
);

/** Kunci pembeda akor: akar + kualitas + bas (C dan C/G dibedakan). */
const kunciAkor = (t) => `${t.akar}:${t.kualitas}:${t.bas ?? t.akar}`;

/** Item target yang dipetakan ke pad tertentu (tangan kiri dikosongkan, asal-usul disimpan). */
const kePad = (t, baris, jari) => ({
  ...t,
  baris,
  jari,
  kiri: null,
  sumber: { baris: t.baris, jari: t.jari, kiri: t.kiri },
});

/**
 * Menyusun pad mode pemula dari daftar akor sheet.
 * @param {Array<object>} target  satu item per kemunculan akor (jari null = tak bisa dimainkan)
 * @returns {{ slot: Object<string, object>, target: Array<object>, penuh: number }}
 */
export function susunPemula(target) {
  // Kelompokkan akor yang bisa dimainkan: jumlah kemunculan + kemunculan pertama.
  const kelompok = new Map();
  target.forEach((t, i) => {
    if (t.jari == null) return;
    const k = kunciAkor(t);
    const ada = kelompok.get(k);
    if (ada) ada.jumlah++;
    else kelompok.set(k, { kunci: k, pertama: t, indeks: i, jumlah: 1 });
  });

  // Paling sering dulu; seri → yang muncul lebih awal.
  const urut = [...kelompok.values()].sort((a, b) => b.jumlah - a.jumlah || a.indeks - b.indeks);

  const slot = {};
  const posisi = new Map(); // kunci akor → [baris, jari] atau null (penuh)
  urut.slice(0, URUTAN_SLOT.length).forEach((g, i) => {
    const [baris, jari] = URUTAN_SLOT[i];
    const t = g.pertama;
    slot[`${baris}:${jari}`] = {
      sumber: { baris: t.baris, jari: t.jari, kiri: t.kiri },
      nama: t.main,
      label: t.label,
      akar: t.akar,
      kualitas: t.kualitas,
      bas: t.bas ?? null,
      tepat: t.tepat,
      jumlah: g.jumlah,
    };
    posisi.set(g.kunci, [baris, jari]);
  });

  // Akor yang tidak kebagian pad: numpang ke pad dengan akar & kualitas sama bila ada.
  let penuh = 0;
  for (const g of urut.slice(URUTAN_SLOT.length)) {
    const cocok = URUTAN_SLOT.find(([baris, jari]) => {
      const s = slot[`${baris}:${jari}`];
      return s && s.akar === g.pertama.akar && s.kualitas === g.pertama.kualitas;
    });
    if (cocok) posisi.set(g.kunci, cocok);
    else {
      posisi.set(g.kunci, null);
      penuh++;
    }
  }

  const hasil = target.map((t) => {
    if (t.jari == null) return { ...t };
    const pos = posisi.get(kunciAkor(t));
    return pos ? kePad(t, pos[0], pos[1]) : { ...t, jari: null, penuh: true };
  });

  return { slot, target: hasil, penuh };
}
