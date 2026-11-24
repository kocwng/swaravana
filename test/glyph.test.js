import test from 'node:test';
import assert from 'node:assert/strict';
import { glyphJari, ikon } from '../public/js/glyph.js';

test('glyphJari: lima batang, jari yang keluar menyala', () => {
  const svg = glyphJari([1, 2]);
  assert.equal((svg.match(/<rect/g) || []).length, 5);
  assert.equal((svg.match(/class="on"/g) || []).length, 2);
  assert.equal((glyphJari([]).match(/class="on"/g) || []).length, 0);
  assert.match(svg, /aria-hidden="true"/);
});

test('ikon: svg garis untuk tombol', () => {
  for (const n of ['putar', 'stop', 'jeda', 'edit', 'simpan']) assert.match(ikon(n), /^<svg class="ikon"/);
});
