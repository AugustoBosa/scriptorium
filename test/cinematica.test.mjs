import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suavizar } from '../src/motor/cinematica.js';

const quadrado = [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]];
const caixa = (t) => ({
  x0: Math.min(...t.map((p) => p[0])), x1: Math.max(...t.map((p) => p[0])),
  y0: Math.min(...t.map((p) => p[1])), y1: Math.max(...t.map((p) => p[1])),
});
const distSeg = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
};

test('pontas preservadas e reta de 2 pontos igual', () => {
  const r = suavizar(quadrado, 1, 0);
  assert.deepEqual(r[0], quadrado[0]);
  assert.deepEqual(r.at(-1), quadrado.at(-1));
  const reta = [[0, 0], [1, 1]];
  assert.deepEqual(suavizar(reta, 1, 1), reta);
});

test('fluidez 1 arredonda sem encolher nem se afastar', () => {
  const r = suavizar(quadrado, 1, 0), b = caixa(r);
  assert.ok((b.x1 - b.x0) >= 0.45 && (b.y1 - b.y0) >= 0.45);
  for (const p of r) {
    const d = Math.min(...[0, 1, 2].map((i) => distSeg(p, quadrado[i], quadrado[i + 1])));
    assert.ok(d <= 0.06, `ponto a ${d}`);
  }
});

test('ultrapassagem 1 sai da caixa original', () => {
  const r = suavizar(quadrado, 1, 1);
  const b = caixa(r), o = caixa(quadrado);
  assert.ok(b.x0 < o.x0 || b.x1 > o.x1 || b.y0 < o.y0 || b.y1 > o.y1);
});

test('determinismo, sem NaN e não muta a entrada', () => {
  const copia = JSON.stringify(quadrado);
  const a = suavizar(quadrado, 0.7, 0.5), b = suavizar(quadrado, 0.7, 0.5);
  assert.deepEqual(a, b);
  assert.ok(a.flat().every(Number.isFinite));
  assert.equal(JSON.stringify(quadrado), copia);
});

test('1000 chamadas em traço de 120 pontos < 500 ms', () => {
  const t = Array.from({ length: 120 }, (_, i) => [i * 0.01, 0.2 * Math.sin(i / 8)]);
  const t0 = performance.now();
  for (let i = 0; i < 1000; i++) suavizar(t, 0.5, 0.5);
  assert.ok(performance.now() - t0 < 500);
});
