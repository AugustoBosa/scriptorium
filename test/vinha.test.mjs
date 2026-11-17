import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vinha, P } from '../src/ornamento/vinha.js';
import { problemas, inset } from '../src/geo.js';

const r3 = (v) => Array.isArray(v) ? v.map(r3) : typeof v === 'number' ? Math.round(v * 1000) / 1000 + 0 : v;
const linhas = (ts) => r3(ts).map((t) => JSON.stringify(t)).join('\n');

const caixas = [{ x: 13, y: 7, l: 40, a: 25 }, { x: 2, y: 3, l: 60, a: 6 }, { x: 0, y: 0, l: 20, a: 20 }];

for (const c of caixas) {
  test(`vinha em ${JSON.stringify(c)}`, () => {
    const t = vinha(c, {}, 1);
    assert.ok(t.length >= 1);
    assert.deepEqual(problemas(t, c), []);
    assert.deepEqual(vinha(c, {}, 1), t);
    assert.notDeepEqual(vinha(c, {}, 2), t);
  });
}

test('caixa degenerada e params incompletos', () => {
  assert.deepEqual(vinha({ x: 0, y: 0, l: 0, a: 10 }, {}, 1), []);
  assert.deepEqual(vinha({ x: 0, y: 0, l: 10, a: 0 }, {}, 1), []);
  assert.deepEqual(vinha(caixas[0], { folhas: 1 }, 1), vinha(caixas[0], { ...P, folhas: 1 }, 1));
});

test('dentro = anel: nenhum ponto no miolo', () => {
  const c = { x: 0, y: 0, l: 40, a: 30 }, miolo = inset(c, 8);
  const noMiolo = ([x, y]) => x > miolo.x && x < miolo.x + miolo.l && y > miolo.y && y < miolo.y + miolo.a;
  const t = vinha(c, { escala: 8, dentro: (p) => !noMiolo(p) && p[0] >= 0 && p[0] <= 40 && p[1] >= 0 && p[1] <= 30, raizes: [[4, 26]] }, 1);
  assert.ok(t.length >= 1);
  assert.ok(!t.flat().some(noMiolo));
});

test('enfeites mudam a contagem de traços', () => {
  const c = caixas[0];
  const nu = vinha(c, { folhas: 0, frutos: 0, espirais: 0 }, 1), cheio = vinha(c, { folhas: 1, frutos: 1, espirais: 1 }, 1);
  assert.ok(nu.length < cheio.length);
});

test('A5 inteiro em menos de 1 s', () => {
  const c = { x: 0, y: 0, l: 148, a: 210 }, t0 = performance.now();
  const t = vinha(c, { densidade: 1 }, 1);
  assert.ok(performance.now() - t0 < 1000);
  assert.deepEqual(problemas(t, c), []);
});

test('tira 130x6,7 mm: ramos longos e alcançam as duas pontas', () => {
  const c = { x: 0, y: 0, l: 130, a: 6.7 };
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const t = vinha(c, { densidade: 0.5 }, seed), xs = t.flat().map((q) => q[0]);
    const comp = t.reduce((u, s) => u + s.slice(1).reduce((w, q, i) => w + Math.hypot(q[0] - s[i][0], q[1] - s[i][1]), 0), 0);
    assert.ok(comp >= 300, `seed ${seed}: ${comp}`);
    assert.ok(Math.min(...xs) <= 10 && Math.max(...xs) >= 120, `seed ${seed}`);
  }
});

test('golden', (t) => {
  t.assert.snapshot(linhas(vinha({ x: 0, y: 0, l: 30, a: 8 }, { densidade: 0.2 }, 1)));
});
