// Kamera + MediaPipe HandLandmarker (2 tangan) dari file LOKAL /vendor/mediapipe.
// Deteksi dijalankan sekali per frame kamera baru (requestVideoFrameCallback), bukan per
// frame layar, supaya tidak membuang waktu dan latensinya serendah mungkin.

const LOKAL = {
  bundle: '/vendor/mediapipe/vision_bundle.mjs',
  wasm: '/vendor/mediapipe/wasm',
  model: '/vendor/mediapipe/hand_landmarker.task',
};

export class Pelacak {
  /** @param {HTMLVideoElement} video */
  constructor(video) {
    this.video = video;
    this.landmarker = null;
    this.stream = null;
    this.aktif = false;
    this.onHasil = null; // (tangan[][], info) => void
    this.statistik = { msDeteksi: 0, fps: 0, umurFrame: null, delegasi: null };
    this._hitungFrame = [];
  }

  async mulai() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Browser ini tidak mendukung kamera.');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 60 }, facingMode: 'user' },
        audio: false,
      });
    } catch (e) {
      if (e.name === 'NotAllowedError') throw new Error('Izin kamera ditolak.');
      if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') throw new Error('Kamera tidak ditemukan.');
      throw new Error(`Kamera gagal dibuka (${e.name || e.message}).`);
    }
    this.video.srcObject = this.stream;
    await this.video.play();

    try {
      const { FilesetResolver, HandLandmarker } = await import(LOKAL.bundle);
      const fileset = await FilesetResolver.forVisionTasks(LOKAL.wasm);
      const opsi = (delegate) => ({
        baseOptions: { modelAssetPath: LOKAL.model, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      try {
        this.landmarker = await HandLandmarker.createFromOptions(fileset, opsi('GPU'));
        this.statistik.delegasi = 'GPU';
      } catch {
        this.landmarker = await HandLandmarker.createFromOptions(fileset, opsi('CPU'));
        this.statistik.delegasi = 'CPU';
      }
    } catch (e) {
      this.berhenti();
      // detail teknis (mis. berkas model belum diunduh: npm run siapkan-model) hanya untuk developer
      console.error('Model tangan gagal dimuat:', e);
      throw new Error('Model tangan gagal dimuat. Periksa koneksi, lalu muat ulang halaman.');
    }
    this.aktif = true;
    this._loop();
  }

  _loop() {
    const v = this.video;
    const proses = (now, meta) => {
      if (!this.aktif) return;
      if (v.readyState >= 2) {
        const t0 = performance.now();
        const hasil = this.landmarker.detectForVideo(v, t0);
        const t1 = performance.now();
        const s = this.statistik;
        s.msDeteksi = s.msDeteksi * 0.9 + (t1 - t0) * 0.1;
        // umur frame: dari ditangkap kamera sampai hasil deteksi siap (bila browser memberi captureTime)
        if (meta?.captureTime) s.umurFrame = (s.umurFrame ?? (t1 - meta.captureTime)) * 0.9 + (t1 - meta.captureTime) * 0.1;
        this._hitungFrame.push(t1);
        while (this._hitungFrame.length && t1 - this._hitungFrame[0] > 1000) this._hitungFrame.shift();
        s.fps = this._hitungFrame.length;
        this.onHasil?.(hasil?.landmarks || [], { t: t1, lebar: v.videoWidth, tinggi: v.videoHeight });
      }
      this._jadwal(proses);
    };
    this._jadwal(proses);
  }

  _jadwal(fn) {
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) this.video.requestVideoFrameCallback(fn);
    else requestAnimationFrame((t) => fn(t, null));
  }

  berhenti() {
    this.aktif = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.landmarker?.close?.();
    this.landmarker = null;
  }
}
