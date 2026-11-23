// Server statis Swaravana (tanpa dependency). Semua logika ada di browser.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const PORT = Number(process.env.PORT) || 3209;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.task': 'application/octet-stream', '.png': 'image/png',
};

/** Petakan URL ke file di public/; null bila keluar dari folder (path traversal). */
export function petakan(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split('?')[0]); } catch { return null; }
  if (p.endsWith('/')) p += 'index.html';
  const f = normalize(join(ROOT, p));
  return f === ROOT || f.startsWith(ROOT + sep) ? f : null;
}

export const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  const f = petakan(req.url);
  try {
    if (!f || !(await stat(f)).isFile()) throw new Error('404');
    const body = await readFile(f);
    res.writeHead(200, {
      'Content-Type': MIME[extname(f)] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': f.includes(`${sep}vendor${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Tidak ditemukan');
  }
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  server.listen(PORT, () => console.log(`Swaravana berjalan di http://localhost:${PORT}`));
}
