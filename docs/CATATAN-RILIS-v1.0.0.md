Rilis pertama **Swaravana**, yang sebelumnya bernama Akor Udara.

Swaravana mengubah tanganmu jadi alat musik. Bentuk jari di depan kamera, lalu akor gitar atau piano langsung berbunyi: tangan kanan memilih akor, tangan kiri mengubah jenisnya. Semuanya berjalan di perangkatmu sendiri. Gambar kamera tidak dikirim ke mana pun, dan aplikasinya tidak butuh akun maupun koneksi internet.

## Isi rilis ini

- Pelacakan dua tangan dengan MediaPipe Hand Landmarker yang dijalankan langsung di browser. Ada empat cara memilih akor: bentuk jari, kombinasi jari, tinggi tangan, dan lima akor utama saja.
- Jenis akor mayor, minor, 7, sus4, maj7/m7, dan add9 lewat jumlah jari tangan kiri. Kalau tangan kiri tidak terlihat, jenis akor mengikuti kunci lagu.
- Suara gitar (Karplus-Strong) dan piano (sintesis aditif) yang dibuat di browser, tanpa file rekaman.
- Pola genjreng dan iringan piano yang mengikuti tempo, termasuk pola yang bisa diketik sendiri.
- Pengaturan kunci, capo, dan tuning (standar, turun setengah, turun satu nada, drop D).
- Lagu bawaan dari lagu tradisional dan domain publik, berisi akor saja. Kamu juga bisa menempel sheet sendiri dalam format akor-di-atas-lirik, ChordPro, atau bar.
- Diagram akor gitar dan piano.
- Bisa dimainkan tanpa kamera lewat pad layar atau keyboard.
- PWA: setelah dibuka sekali, aplikasi tetap bisa dipakai tanpa internet.

## Cara pakai

**Langsung di browser:** buka https://swaravana.kusumalab.host lalu izinkan kamera. Setelah halaman selesai dimuat sekali, Swaravana tetap bisa dibuka walau sedang offline.

**Dari zip ini (sepenuhnya offline):**

1. Unduh `swaravana-v1.0.0.zip` di bawah, lalu ekstrak.
2. Pastikan Node.js 20 atau yang lebih baru sudah terpasang. Tidak perlu `npm install`.
3. Di dalam folder hasil ekstrak, jalankan `node server.mjs`.
4. Buka `http://localhost:3209`.

Untuk mengecek keutuhan zip: `shasum -a 256 -c swaravana-v1.0.0.zip.sha256`.

## Lisensi

Kode Swaravana memakai lisensi MIT. MediaPipe Tasks Vision dan model Hand Landmarker yang ikut disertakan memakai Apache License 2.0. Rinciannya ada di `NOTICE` dan `THIRD_PARTY_NOTICES.md` di dalam zip.
