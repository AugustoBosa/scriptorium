import { test } from 'node:test';
import assert from 'node:assert/strict';
import { borda, miolo, P } from '../src/ornamento/borda.js';
import { problemas, inset } from '../src/geo.js';

const r3 = (v) => Array.isArray(v) ? v.map(r3) : typeof v === 'number' ? Math.round(v * 1000) / 1000 + 0 : v;
const linhas = (ts) => r3(ts).map((t) => JSON.stringify(t)).join('\n');

const caixas = [{ x: 13, y: 7, l: 60, a: 45 }, { x: 2, y: 3, l: 70, a: 24 }, { x: 0, y: 0, l: 40, a: 40 }];
const estilos = ['linhas', 'barra', 'vinha', 'no'];
const lados = ['todos', 'esquerda', 'topo', 'laterais', 'topo-base'];
const cantos = ['nenhum', 'losango', 'trevo', 'no'];

for (const c of caixas) for (const estilo of estilos) for (const l of lados) for (const k of cantos) {
  test(`borda ${estilo}/${l}/${k} em ${JSON.stringify(c)}`, () => {
    const p = { estilo, lados: l, cantos: k, largura: 8 }, t = borda(c, p, 1);
    assert.ok(t.length >= 1);
    assert.deepEqual(problemas(t, c), []);
    assert.deepEqual(borda(c, p, 1), t);
    const m = inset(miolo(c, p), 0.01), dentro = ([x, y]) => x > m.x && x < m.x + m.l && y > m.y && y < m.y + m.a;
    assert.ok(!t.flat().some(dentro), 'ponto no miolo');
  });
}

test('seed muda onde há sorteio', () => {
  const c = caixas[0];
  for (const estilo of ['vinha', 'no']) assert.notDeepEqual(borda(c, { estilo, cantos: 'nenhum' }, 1), borda(c, { estilo, cantos: 'nenhum' }, 2), estilo);
});

test('caixa degenerada e params incompletos', () => {
  assert.deepEqual(borda({ x: 0, y: 0, l: 0, a: 10 }, {}, 1), []);
  assert.deepEqual(borda({ x: 0, y: 0, l: 10, a: 0 }, {}, 1), []);
  assert.deepEqual(borda(caixas[0], { estilo: 'barra' }, 1), borda(caixas[0], { ...P, estilo: 'barra' }, 1));
});

test('miolo', () => {
  const c = { x: 5, y: 6, l: 100, a: 80 };
  assert.deepEqual(miolo(c, { lados: 'esquerda', largura: 10 }), { x: 15, y: 6, l: 90, a: 80 });
  assert.deepEqual(miolo(c, { lados: 'topo-base', largura: 10 }), { x: 5, y: 16, l: 100, a: 60 });
  const w = 80 / 3, m = miolo(c, { largura: 40 });
  assert.ok(Math.abs(m.x - (5 + w)) < 1e-9 && Math.abs(m.l - (100 - 2 * w)) < 1e-9);
});

test('barra hachurada tem mais traços que linhas', () => {
  assert.ok(borda(caixas[0], { estilo: 'barra' }, 1).length > borda(caixas[0], { estilo: 'linhas' }, 1).length);
});

test('origem da vinha vira a raiz quando cai na região', () => {
  const c = { x: 0, y: 0, l: 60, a: 40 }, p = { estilo: 'vinha', cantos: 'nenhum', largura: 8 };
  const u = borda(c, { ...p, origem: [4, 4] }, 1);
  assert.notDeepEqual(borda(c, p, 1), u);
  assert.deepEqual(problemas(u, c), []);
});

test('golden', (t) => {
  t.assert.snapshot(linhas(borda({ x: 0, y: 0, l: 30, a: 20 }, { estilo: 'barra', largura: 5, hachura: 1.5 }, 1)));
});
