# Perangkat lunak pihak ketiga

Swaravana tidak memakai dependency npm. Satu-satunya komponen pihak ketiga adalah MediaPipe, yang disalin ke `public/vendor/mediapipe/` oleh `scripts/siapkan-model.mjs` dan ikut didistribusikan, baik lewat situs GitHub Pages maupun zip rilis.

## MediaPipe Tasks Vision

| | |
|---|---|
| Paket | `@mediapipe/tasks-vision` versi 0.10.35 (registry npm) |
| Pemilik | The MediaPipe Authors (Google LLC) |
| Lisensi | Apache License 2.0 (sesuai kolom `license` di `package.json` paket tersebut) |
| Sumber | https://github.com/google-ai-edge/mediapipe |
| File di repo ini | `public/vendor/mediapipe/vision_bundle.mjs`, `public/vendor/mediapipe/wasm/vision_wasm_internal.js`, `public/vendor/mediapipe/wasm/vision_wasm_internal.wasm` |
| Perubahan | Tidak ada. File disalin apa adanya dari tarball npm. |

Paket npm ini tidak membawa file `LICENSE` atau `NOTICE` sendiri, jadi salinan teks Apache-2.0 disertakan di `docs/lisensi/Apache-2.0.txt` (di zip rilis: `LICENSES/Apache-2.0.txt`).

Berkas WebAssembly-nya adalah hasil kompilasi MediaPipe beserta pustaka yang dipakainya, seperti TensorFlow Lite. Daftar komponen dan lisensinya ada di repositori sumber MediaPipe.

## Model MediaPipe Hand Landmarker

| | |
|---|---|
| File | `public/vendor/mediapipe/hand_landmarker.task` (float16, versi 1) |
| Pemilik | The MediaPipe Authors (Google LLC) |
| Lisensi | Apache License 2.0 |
| Asal | Penyimpanan model resmi MediaPipe (URL ada di `scripts/siapkan-model.mjs`) |
| SHA-256 | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` (sama dengan `public/vendor/mediapipe/VERSI.json`) |
| Perubahan | Tidak ada. |

Kartu model resmi MediaPipe Hands menjelaskan cara model ini dilatih beserta batasannya. Dokumentasinya ada di situs Google AI Edge.

## Teks lisensi

- Apache License 2.0: [docs/lisensi/Apache-2.0.txt](docs/lisensi/Apache-2.0.txt)

## Lagu bawaan

Lagu bawaan adalah lagu tradisional atau domain publik. Isinya hanya akor, tanpa lirik, dengan aransemen sederhana buatan sendiri.
