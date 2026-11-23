#!/usr/bin/env node
// Buat zip rilis Swaravana yang siap jalan offline. Tanpa dependency dan tanpa perintah `zip`,
// jadi hasilnya sama di macOS, Linux, Windows, maupun GitHub Actions.
//
//   node scripts/buat-rilis.mjs [tag] [folder-keluaran]
//     tag             default: "v" + versi di package.json (mis. v1.0.0)
//     folder-keluaran default: dist/
//
// Hasil: <folder-keluaran>/swaravana-<tag>.zip dan swaravana-<tag>.zip.sha256
// Isi zip ada di dalam satu folder swaravana-<tag>/:
//   public/ (tanpa CNAME), server.mjs, package.json, README.md, NOTICE,
//   THIRD_PARTY_NOTICES.md, LICENSE (MIT) dan LICENSES/Apache-2.0.txt.
//
// Zip dibuat deterministik: urutan file tetap dan semua tanggal file disamakan
// (SOURCE_DATE_EPOCH bila diset, selain itu 1 Januari 2025), jadi isi yang sama
// menghasilkan SHA-256 yang sama.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const tag = process.argv[2] || `v${pkg.version}`;
if (!/^v?\d+\.\d+\.\d+([-.+][0-9A-Za-z.-]+)?$/.test(tag)) {
  console.error(`✗ Tag "${tag}" tidak terlihat seperti versi (contoh: v1.0.0)`);
  process.exit(1);
}
const keluar = resolve(process.argv[3] || join(root, 'dist'));
const nama = `swaravana-${tag}`;

// [path di repo, path di dalam zip]
const daftar = [];
const ABAIKAN = new Set(['.DS_Store', 'Thumbs.db', 'CNAME']);
function tambahFolder(dirRepo, dirZip) {
  for (const n of readdirSync(join(root, dirRepo)).sort()) {
    if (ABAIKAN.has(n) || n.startsWith('.')) continue;
    const p = join(dirRepo, n);
    if (statSync(join(root, p)).isDirectory()) tambahFolder(p, `${dirZip}/${n}`);
    else daftar.push([p, `${dirZip}/${n}`]);
  }
}
function tambahFile(pRepo, pZip = pRepo, wajib = true) {
  if (existsSync(join(root, pRepo))) daftar.push([pRepo, pZip]);
  else if (wajib) { console.error(`✗ File wajib tidak ada: ${pRepo}`); process.exit(1); }
}

tambahFolder('public', 'public');
tambahFile('server.mjs');
tambahFile('package.json');
tambahFile('README.md');
tambahFile('NOTICE');
tambahFile('THIRD_PARTY_NOTICES.md');
tambahFile(join('docs', 'lisensi', 'Apache-2.0.txt'), 'LICENSES/Apache-2.0.txt');
tambahFile('LICENSE'); // MIT, lisensi kode Swaravana sendiri

for (const f of ['public/index.html', 'public/sw.js', 'public/vendor/mediapipe/hand_landmarker.task']) {
  if (!daftar.some(([p]) => p.split(sep).join('/') === f)) {
    console.error(`✗ ${f} tidak ada. Jalankan "npm run siapkan-model" bila folder vendor kosong.`);
    process.exit(1);
  }
}

// ---- penulis zip minimal (PKZIP 2.0, deflate) ----
const TABEL_CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABEL_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const detik = Number(process.env.SOURCE_DATE_EPOCH) || Date.UTC(2025, 0, 1) / 1000;
const t = new Date(detik * 1000);
const dosWaktu = (t.getUTCHours() << 11) | (t.getUTCMinutes() << 5) | (t.getUTCSeconds() >> 1);
const dosTanggal = ((t.getUTCFullYear() - 1980) << 9) | ((t.getUTCMonth() + 1) << 5) | t.getUTCDate();

const bagian = [];
const pusat = [];
let offset = 0;
let totalAsli = 0;
for (const [pRepo, pZip] of daftar) {
  const data = readFileSync(join(root, pRepo));
  const namaBuf = Buffer.from(`${nama}/${pZip}`, 'utf8');
  const kempes = deflateRawSync(data, { level: 9 });
  const pakaiDeflate = kempes.length < data.length;
  const isi = pakaiDeflate ? kempes : data;
  const crc = crc32(data);
  totalAsli += data.length;

  const lokal = Buffer.alloc(30);
  lokal.writeUInt32LE(0x04034b50, 0);
  lokal.writeUInt16LE(20, 4);              // versi untuk ekstrak
  lokal.writeUInt16LE(0x0800, 6);          // flag: nama UTF-8
  lokal.writeUInt16LE(pakaiDeflate ? 8 : 0, 8);
  lokal.writeUInt16LE(dosWaktu, 10);
  lokal.writeUInt16LE(dosTanggal, 12);
  lokal.writeUInt32LE(crc, 14);
  lokal.writeUInt32LE(isi.length, 18);
  lokal.writeUInt32LE(data.length, 22);
  lokal.writeUInt16LE(namaBuf.length, 26);
  bagian.push(lokal, namaBuf, isi);

  const c = Buffer.alloc(46);
  c.writeUInt32LE(0x02014b50, 0);
  c.writeUInt16LE((3 << 8) | 20, 4);       // dibuat di "Unix" agar izin file terbaca
  c.writeUInt16LE(20, 6);
  c.writeUInt16LE(0x0800, 8);
  c.writeUInt16LE(pakaiDeflate ? 8 : 0, 10);
  c.writeUInt16LE(dosWaktu, 12);
  c.writeUInt16LE(dosTanggal, 14);
  c.writeUInt32LE(crc, 16);
  c.writeUInt32LE(isi.length, 20);
  c.writeUInt32LE(data.length, 24);
  c.writeUInt16LE(namaBuf.length, 28);
  c.writeUInt32LE(((0o100644) << 16) >>> 0, 38); // -rw-r--r--
  c.writeUInt32LE(offset, 42);
  pusat.push(c, namaBuf);

  offset += lokal.length + namaBuf.length + isi.length;
}
const pusatBuf = Buffer.concat(pusat);
const akhir = Buffer.alloc(22);
akhir.writeUInt32LE(0x06054b50, 0);
akhir.writeUInt16LE(daftar.length, 8);
akhir.writeUInt16LE(daftar.length, 10);
akhir.writeUInt32LE(pusatBuf.length, 12);
akhir.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...bagian, pusatBuf, akhir]);
if (zip.length >= 0xffffffff || daftar.length >= 0xffff) throw new Error('Zip terlalu besar untuk format tanpa ZIP64');

mkdirSync(keluar, { recursive: true });
const fileZip = join(keluar, `${nama}.zip`);
const sha = createHash('sha256').update(zip).digest('hex');
writeFileSync(fileZip, zip);
writeFileSync(`${fileZip}.sha256`, `${sha}  ${nama}.zip\n`);

const mb = (n) => (n / 1e6).toFixed(1) + ' MB';
console.log(`✓ ${relative(process.cwd(), fileZip) || fileZip}`);
console.log(`  ${daftar.length} file, ${mb(totalAsli)} → ${mb(zip.length)}`);
console.log(`  SHA-256 ${sha}`);
