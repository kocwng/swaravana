# Deploy Swaravana ke GitHub Pages

- Repositori: `kocwng/swaravana` (publik)
- Domain: `swaravana.kusumalab.host`
- Cara deploy: GitHub Actions ([`.github/workflows/pages.yml`](../.github/workflows/pages.yml)), bukan dari branch

Tidak ada secret yang perlu disimpan. Workflow Pages memakai token OIDC (`id-token: write`) dan workflow Rilis memakai `GITHUB_TOKEN` bawaan. Jangan menambahkan Personal Access Token atau kunci apa pun ke Settings → Secrets.

## 1. Aktifkan Pages

**Settings → Pages → Build and deployment → Source: GitHub Actions.**

Lewat CLI:

```bash
gh api -X POST repos/kocwng/swaravana/pages -f build_type=workflow
```

Alur branch-nya: kerjakan di branch terpisah, buat pull request ke `main` (workflow **CI** menjalankan tes dan cek offline), lalu merge `main` ke `deploy`. Hanya push ke `deploy` yang memperbarui situs.

Karena `deploy` bukan branch default, environment **github-pages** perlu mengizinkannya: **Settings → Environments → github-pages → Deployment branches and tags → Add rule → `deploy`** (atau lewat API `repos/kocwng/swaravana/environments/github-pages/deployment-branch-policies`). Deploy juga bisa dipicu manual dari tab **Actions → Pages → Run workflow** dengan memilih branch `deploy`.

## 2. Verifikasi domain di akun GitHub (lakukan dulu)

Langkah ini mencegah **pengambilalihan domain**. Tanpa verifikasi, kalau suatu saat Pages di repo ini dimatikan sementara record DNS-nya masih ada, akun GitHub lain bisa mengklaim `swaravana.kusumalab.host` di repo mereka dan menyajikan konten apa pun di domainmu.

1. Buka **Settings akun** (foto profil → Settings), bukan Settings repo, lalu **Code, planning, and automation → Pages → Add a domain**.
2. Masukkan `kusumalab.host`. Memverifikasi domain induk juga melindungi subdomain langsungnya, termasuk `swaravana.kusumalab.host`.
3. GitHub menampilkan record TXT dengan bentuk seperti ini:

   | Tipe | Nama/host | Nilai |
   |---|---|---|
   | TXT | `_github-pages-challenge-kocwng` (di zona `kusumalab.host`) | kode dari GitHub |

4. Tambahkan record itu di pengelola DNS, tunggu sampai tersebar, lalu klik **Verify**. Biarkan record TXT tetap ada setelah verifikasi berhasil.

Kalau kamu hanya mengelola subdomainnya dan tidak memegang domain induk, verifikasi `swaravana.kusumalab.host` langsung. Record TXT-nya menjadi `_github-pages-challenge-kocwng.swaravana`.

## 3. Record DNS

Cukup satu record di zona `kusumalab.host`:

| Tipe | Nama/host | Nilai | TTL |
|---|---|---|---|
| CNAME | `swaravana` | `kocwng.github.io` | 3600 (atau bawaan) |

Catatan:
- Nilainya `kocwng.github.io` saja, **tanpa** `/swaravana`. DNS tidak mengenal path.
- **Jangan** memakai record wildcard (`*.kusumalab.host`) yang mengarah ke GitHub. Wildcard membuka celah pengambilalihan untuk semua subdomain lain.
- Kalau zona punya record **CAA**, pastikan `letsencrypt.org` diizinkan. Kalau tidak, sertifikat HTTPS dari GitHub tidak bisa terbit.
- Domain apex (`kusumalab.host`) tidak dipakai di sini. Kalau suatu saat ingin memakainya untuk Pages juga, apex butuh record A ke `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` dan AAAA ke `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`. Ini alamat resmi GitHub Pages; cocokkan lagi dengan dokumentasi GitHub sebelum dipakai.

Cek dari terminal:

```bash
dig +short swaravana.kusumalab.host CNAME   # harus: kocwng.github.io.
dig +short TXT _github-pages-challenge-kocwng.kusumalab.host
```

## 4. Pasang domain kustom di repo

**Settings → Pages → Custom domain:** isi `swaravana.kusumalab.host`, lalu **Save**. GitHub akan mengecek DNS-nya.

Lewat CLI:

```bash
gh api -X PUT repos/kocwng/swaravana/pages -f cname=swaravana.kusumalab.host
```

Untuk situs yang di-deploy lewat GitHub Actions, **domain kustom ditentukan oleh pengaturan ini**, bukan oleh file `CNAME`. Menurut dokumentasi GitHub, file `CNAME` di artifact diabaikan pada mode Actions. Menaruh `public/CNAME` tidak merusak apa pun dan bisa jadi catatan, tapi pengaturan di Settings/API tetap wajib. (`scripts/buat-rilis.mjs` sengaja tidak memasukkan `CNAME` ke zip rilis.)

## 5. Enforce HTTPS

Setelah GitHub selesai menerbitkan sertifikat (biasanya beberapa menit sampai sekitar satu jam setelah DNS benar), centang **Settings → Pages → Enforce HTTPS**.

```bash
gh api -X PUT repos/kocwng/swaravana/pages -F https_enforced=true
```

Langkah ini wajib untuk Swaravana, bukan sekadar anjuran. Browser hanya mengizinkan kamera dan service worker di HTTPS, jadi tanpa HTTPS aplikasinya tidak bisa dipakai.

## 6. Kenapa harus root domain

Aplikasi memakai path absolut: `/sw.js`, `/style.css`, `/js/app.js`, `/vendor/mediapipe/...`, dan `start_url: "/"`. Karena itu Swaravana hanya berjalan bila dibuka dari root sebuah host. `https://swaravana.kusumalab.host/` memenuhi syarat itu. `https://kocwng.github.io/swaravana/` tidak, dan setelah domain kustom terpasang, GitHub otomatis mengalihkan alamat itu ke domain kustom.

Kalau suatu saat aplikasi perlu jalan di sub-path, ubah path absolut menjadi relatif di file-file berikut:

| File | Yang diubah |
|---|---|
| `public/index.html` | `href="/manifest.webmanifest"`, `/ikon.svg`, `/style.css`, `src="/js/app.js"` → tanpa `/` di depan |
| `public/manifest.webmanifest` | `start_url: "/"` → `"./"`, ikon `"/ikon.svg"` → `"ikon.svg"`, tambahkan `"scope": "./"` |
| `public/sw.js` | daftar `ASET` → path relatif (`'./'`, `'index.html'`, …); `url.pathname.startsWith('/vendor/')` → `.includes('/vendor/')`; fallback `'/index.html'` → `new URL('index.html', self.registration.scope).href` |
| `public/js/app.js` | `register('/sw.js')` → `register('sw.js')` |
| `public/js/pelacak.js` | path `/vendor/mediapipe/...` → `new URL('../vendor/mediapipe/...', import.meta.url).href` |

`server.mjs` tidak perlu diubah.

## 7. Setelah domain aktif

- Buka `https://swaravana.kusumalab.host`, izinkan kamera, lalu cek bahwa tangan terbaca.
- Matikan koneksi internet dan muat ulang halaman. Aplikasi harus tetap terbuka karena service worker sudah menyimpan semua aset.
- Kalau nanti Pages dimatikan atau repo dihapus, **hapus juga record CNAME `swaravana`** supaya tidak ada record DNS yang menggantung.

## Keamanan repo (disarankan)

- **Settings → Environments → github-pages**: biarkan aturan bawaan, yaitu deploy hanya dari branch `main`.
- **Settings → Rules**: lindungi branch `main` dari force-push, dan lindungi tag `v*` supaya tag rilis tidak bisa dipindah atau dihapus.
- **Settings → Actions → General → Workflow permissions**: pilih *Read repository contents*. Workflow di repo ini sudah meminta izin tulis sendiri hanya di job yang membutuhkannya.
- Semua action di workflow milik organisasi `actions` (GitHub sendiri) dan dipin ke versi mayor (`@v4`, `@v5`). Kalau ingin lebih ketat, pin ke commit SHA lengkap.
