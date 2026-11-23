#!/usr/bin/env node
// Siapkan SEKALI file MediaPipe (library + WASM + model tangan) ke public/vendor/mediapipe/.
// Setelah itu aplikasi tidak butuh internet sama sekali.
//
//   npm run siapkan-model
//
// - Library: registry npm lewat `npm pack` (integritas tarball dicek npm)
// - Model  : hand_landmarker.task dari penyimpanan model MediaPipe, dicek SHA-256
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSI = '0.10.35';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const MODEL_SHA256 = process.env.MODEL_SHA256 || 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tujuan = join(root, 'public', 'vendor', 'mediapipe');
const mb = (p) => (statSync(p).size / 1e6).toFixed(1) + ' MB';

if (existsSync(join(tujuan, 'hand_landmarker.task')) && !process.env.UNDUH_ULANG) {
  console.log('✓ Model sudah ada di public/vendor/mediapipe (set UNDUH_ULANG=1 untuk mengunduh ulang).');
  process.exit(0);
}

const tmp = mkdtempSync(join(tmpdir(), 'akor-mp-'));
try {
  console.log(`1/2 @mediapipe/tasks-vision@${VERSI} dari registry npm…`);
  const tgz = execFileSync('npm', ['pack', `@mediapipe/tasks-vision@${VERSI}`, '--silent'], { cwd: tmp, encoding: 'utf8' }).trim().split('\n').pop();
  execFileSync('tar', ['-xzf', tgz], { cwd: tmp });
  mkdirSync(join(tujuan, 'wasm'), { recursive: true });
  for (const f of ['vision_bundle.mjs', 'wasm/vision_wasm_internal.js', 'wasm/vision_wasm_internal.wasm']) {
    copyFileSync(join(tmp, 'package', f), join(tujuan, f));
    console.log(`   ✓ ${f} (${mb(join(tujuan, f))})`);
  }
  console.log('2/2 Model hand_landmarker.task…');
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const sha = createHash('sha256').update(buf).digest('hex');
  if (sha !== MODEL_SHA256) throw new Error(`SHA-256 model tidak cocok (${sha}); set MODEL_SHA256 bila memang versi baru`);
  writeFileSync(join(tujuan, 'hand_landmarker.task'), buf);
  writeFileSync(join(tujuan, 'VERSI.json'), JSON.stringify({ tasksVision: VERSI, modelSha256: sha }, null, 2) + '\n');
  console.log(`   ✓ hand_landmarker.task (${mb(join(tujuan, 'hand_landmarker.task'))})\nSelesai.`);
} catch (e) {
  console.error('✗', e.message);
  process.exitCode = 1;
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
