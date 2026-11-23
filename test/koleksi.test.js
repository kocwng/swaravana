import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Koleksi, KUNCI_SIMPAN } from '../public/js/koleksi.js';

/** Penyimpanan palsu di memori. */
function simpanPalsu(awal = {}) {
  const isi = { ...awal };
  return { isi, baca: (k) => isi[k] ?? null, tulis: (k, v) => { isi[k] = v; return true; } };
}
const SHEET = '| C | G | Am | F |';

test('simpan sheet baru: tersimpan & bertahan setelah dimuat ulang', () => {
  const s = simpanPalsu();
  const k = new Koleksi(s);
  const a = k.simpanSheet({ judul: 'Lagu saya', teks: SHEET });
  assert.equal(a.judul, 'Lagu saya');
  const k2 = new Koleksi(s); // "muat ulang halaman"
  assert.equal(k2.daftar().length, 1);
  assert.equal(k2.ambil(a.id).teks, SHEET);
});

test('judul kosong diberi nama otomatis, judul sama dibuat unik', () => {
  const k = new Koleksi(simpanPalsu());
  assert.equal(k.simpanSheet({ judul: '', teks: SHEET }).judul, 'Sheet 1');
  k.simpanSheet({ judul: 'Ibadah', teks: SHEET });
  assert.equal(k.simpanSheet({ judul: 'ibadah', teks: '| D |' }).judul, 'ibadah (2)');
});

test('perbarui sheet yang sama (edit), ubah judul, simpan pengaturan, hapus', () => {
  const s = simpanPalsu();
  const k = new Koleksi(s);
  const a = k.simpanSheet({ judul: 'A', teks: SHEET });
  k.simpanSheet({ id: a.id, judul: 'A', teks: '| D | A |' });
  assert.equal(k.daftar().length, 1);
  assert.equal(k.ambil(a.id).teks, '| D | A |');
  k.ubahJudul(a.id, 'Judul baru');
  k.simpanPengaturan(a.id, { capo: 3, tempo: 82 });
  const k2 = new Koleksi(s);
  assert.equal(k2.ambil(a.id).judul, 'Judul baru');
  assert.deepEqual(k2.ambil(a.id).pengaturan, { capo: 3, tempo: 82 });
  assert.equal(k2.hapus(a.id), true);
  assert.equal(new Koleksi(s).daftar().length, 0);
});

test('daftar urut terbaru diubah dulu', async () => {
  const k = new Koleksi(simpanPalsu());
  const a = k.simpanSheet({ judul: 'A', teks: SHEET });
  await new Promise((r) => setTimeout(r, 5));
  k.simpanSheet({ judul: 'B', teks: SHEET });
  await new Promise((r) => setTimeout(r, 5));
  k.ubahJudul(a.id, 'A2');
  assert.deepEqual(k.daftar().map((x) => x.judul), ['A2', 'B']);
});

test('ekspor → impor ke koleksi lain; duplikat dilewati; pengaturan ikut', () => {
  const k = new Koleksi(simpanPalsu());
  const a = k.simpanSheet({ judul: 'A', teks: SHEET });
  k.simpanPengaturan(a.id, { capo: 2 });
  k.simpanSheet({ judul: 'B', teks: '| G |' });
  const json = k.ekspor();
  const k2 = new Koleksi(simpanPalsu());
  assert.deepEqual(k2.impor(json), { ditambah: 2, dilewati: 0 });
  assert.equal(k2.daftar().find((x) => x.judul === 'A').pengaturan.capo, 2);
  assert.deepEqual(k2.impor(json), { ditambah: 0, dilewati: 2 });
});

test('impor file rusak/bukan koleksi ditolak dengan pesan jelas', () => {
  const k = new Koleksi(simpanPalsu());
  assert.throws(() => k.impor('bukan json'), /bukan JSON/);
  assert.throws(() => k.impor('{"halo":1}'), /bukan koleksi/);
  assert.deepEqual(k.impor('{"sheet":[{"judul":"x"},{"teks":""}]}'), { ditambah: 0, dilewati: 2 });
});

test('data tersimpan yang rusak tidak membuat aplikasi gagal', () => {
  assert.equal(new Koleksi(simpanPalsu({ [KUNCI_SIMPAN]: '{rusak' })).daftar().length, 0);
  const k = new Koleksi(simpanPalsu({ [KUNCI_SIMPAN]: JSON.stringify([{ id: 'dup', judul: 'A', teks: SHEET }, { id: 'dup', judul: 'B', teks: SHEET }, 5, null]) }));
  const id = k.daftar().map((x) => x.id);
  assert.equal(id.length, 2);
  assert.equal(new Set(id).size, 2);
});

test('migrasi sheet lama sekali saja', () => {
  const k = new Koleksi(simpanPalsu());
  assert.ok(k.migrasiSheetLama(SHEET));
  assert.equal(k.migrasiSheetLama(SHEET), null);
  assert.equal(k.migrasiSheetLama(''), null);
  assert.equal(k.daftar().length, 1);
});
