#!/usr/bin/env node
// Pengecek "benar-benar offline" untuk repo ini (salinan mandiri dari
// offline-showcase/_shared/cek-offline.mjs, supaya CI tidak bergantung pada folder di luar repo).
//
//   node scripts/cek-offline.mjs [folder-project]   (default: folder induk skrip ini)
//
// Gagal (exit 1) bila:
//  - package.json punya dependency apa pun (npm install berarti butuh internet)
//  - file .html/.js/.mjs/.cjs/.css/.webmanifest/.json/.svg memuat URL http(s) ke host non-lokal
//    (kecuali namespace XML w3.org, yang bukan pemuatan jaringan, dan metadata yang tidak pernah
//    dimuat browser: kolom repository/homepage/bugs/author di package.json serta
//    <link rel="canonical"> dan <meta property="og:*"> / <meta name="twitter:*"> di HTML)
//  - public/sw.js mendaftarkan aset yang tidak ada di public/ (cache.addAll() akan gagal total
//    dan aplikasi tidak bisa dibuka offline)
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..'));
const EXT = new Set(['.html', '.htm', '.js', '.mjs', '.cjs', '.css', '.webmanifest', '.json', '.svg']);
// vendor/  = kode pihak ketiga (MediaPipe) yang hanya berisi URL di komentar.
// scripts/ = alat penyiapan sekali jalan (mengunduh model), tidak dimuat aplikasi.
// test/, docs/ = tidak ikut dimuat aplikasi.
const SKIP_DIR = new Set(['node_modules', '.git', 'test', 'tests', '__tests__', 'vendor', 'scripts', 'docs', 'dist']);
const OK_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|www\.w3\.org)(?=[:/]|$)/i;
// Baris HTML berisi metadata untuk mesin pencari/pratinjau tautan; browser tidak memuat URL-nya.
const METADATA_HTML = /<link\s[^>]*rel=["']canonical["']|<meta\s[^>]*(property|name)=["'](og|twitter):/i;
const METADATA_PKG = ['repository', 'homepage', 'bugs', 'author', 'contributors', 'funding'];
const masalah = [];

const pkgPath = join(root, 'package.json');
if (existsSync(pkgPath)) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  for (const k of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    if (pkg[k] && Object.keys(pkg[k]).length) masalah.push(`package.json: ${k} tidak kosong (${Object.keys(pkg[k]).join(', ')})`);
  }
} else masalah.push('package.json tidak ada');

function jelajah(dir) {
  for (const nama of readdirSync(dir)) {
    const p = join(dir, nama);
    const st = statSync(p);
    if (st.isDirectory()) { if (!SKIP_DIR.has(nama) && !nama.startsWith('.')) jelajah(p); continue; }
    if (!EXT.has(extname(nama).toLowerCase()) || nama === 'package-lock.json') continue;
    let teks = readFileSync(p, 'utf8');
    if (nama === 'package.json') {
      const pkg = JSON.parse(teks);
      for (const k of METADATA_PKG) delete pkg[k];
      teks = JSON.stringify(pkg, null, 2);
    }
    const html = /\.html?$/i.test(nama);
    teks.split('\n').forEach((b, i) => {
      if (html && METADATA_HTML.test(b)) return;
      for (const m of b.matchAll(/https?:\/\/([^\s'"`)<>]+)/gi)) {
        if (!OK_HOST.test(m[1])) masalah.push(`${relative(root, p)}:${i + 1}: ${m[0]}`);
      }
    });
  }
}
jelajah(root);

// Aset yang di-cache service worker harus benar-benar ada.
const swPath = join(root, 'public', 'sw.js');
if (existsSync(swPath)) {
  const daftar = readFileSync(swPath, 'utf8').match(/const\s+ASET\s*=\s*\[([\s\S]*?)\]/);
  if (!daftar) masalah.push('public/sw.js: daftar ASET tidak ditemukan');
  else {
    for (const [, a] of daftar[1].matchAll(/['"`]([^'"`]+)['"`]/g)) {
      const rel = a.replace(/^\.?\//, '').split(/[?#]/)[0] || 'index.html';
      const f = join(root, 'public', rel.endsWith('/') ? rel + 'index.html' : rel);
      if (!existsSync(f) || !statSync(f).isFile()) masalah.push(`public/sw.js: aset "${a}" tidak ada di public/`);
    }
  }
}

if (masalah.length) {
  console.error(`✗ TIDAK offline (${masalah.length} masalah):\n  ` + masalah.join('\n  '));
  process.exit(1);
}
console.log(`✓ Offline: tanpa dependency npm, tanpa URL eksternal, aset service worker lengkap (${relative(process.cwd(), root) || '.'})`);
