import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFonte } from '../src/fonte.js';
import { capitular, caixaCapitular } from '../src/ornamento/capitular.js';
import { problemas, comprimento, caixaDe } from '../src/geo.js';
import { grade } from '../src/ornamento/no.js';

const lerFonte = (n) => parseFonte(readFileSync(new URL(`../fontes/${n}.svg`, import.meta.url), 'utf8'), n);
const fontes = { HersheyGothEnglish: lerFonte('HersheyGothEnglish'), HersheySerifBold: lerFonte('HersheySerifBold') };

// Arredonda a 3 casas; "+ 0" troca -0 por 0. Uma linha por traço.
const r3 = (v) => Array.isArray(v) ? v.map(r3) : typeof v === 'number' ? Math.round(v * 1000) / 1000 + 0 : v;
const linhas = (t) => r3(t).map((x) => JSON.stringify(x)).join('\n');

const ESTILOS = ['lombarda', 'contornada', 'habitada', 'filigranada', 'no'];
const CAIXAS = [{ x: 13, y: 7, l: 40, a: 25 }, { x: 0, y: 0, l: 30, a: 12 }, { x: 0, y: 0, l: 20, a: 20 }];

for (const estilo of ESTILOS) {
  test(`${estilo}: letras A Q É é dentro da caixa, determinístico`, () => {
    for (const letra of ['A', 'Q', 'É', 'é']) for (const c of CAIXAS) {
      const t = capitular(c, { estilo, letra }, 1, fontes);
      assert.ok(t.length >= 1);
      assert.deepEqual(problemas(t, c), [], `${estilo} ${letra}`);
      assert.deepEqual(capitular(c, { estilo, letra }, 1, fontes), t);
    }
  });
  test(`${estilo}: caixa degenerada → []`, () => {
    assert.deepEqual(capitular({ x: 0, y: 0, l: 0, a: 5 }, { estilo }, 1, fontes), []);
    assert.deepEqual(capitular({ x: 0, y: 0, l: 5, a: 0 }, { estilo }, 1, fontes), []);
  });
  test(`${estilo}: mapa vazio não quebra`, () => {
    const c = CAIXAS[0];
    assert.deepEqual(problemas(capitular(c, { estilo }, 1, {}), c), []);
  });
  test(`${estilo}: golden 24×24`, (t) => {
    t.assert.snapshot(linhas(capitular({ x: 0, y: 0, l: 24, a: 24 }, { estilo }, 1, fontes)));
  });
}

for (const estilo of ['habitada', 'filigranada']) {
  test(`${estilo}: seed muda`, () => {
    assert.notDeepEqual(capitular(CAIXAS[0], { estilo }, 1, fontes), capitular(CAIXAS[0], { estilo }, 2, fontes));
  });
}

test('fonte ausente cai na que existe', () => {
  const c = CAIXAS[0];
  assert.deepEqual(capitular(c, { fonte: 'HersheyGothGerman' }, 1, fontes), capitular(c, { fonte: 'HersheyGothEnglish' }, 1, fontes));
});

test('hachura 1 dá mais traços que 0', () => {
  const c = CAIXAS[0];
  const h = capitular(c, { estilo: 'contornada', hachura: 1 }, 1, fontes);
  assert.ok(h.length > capitular(c, { estilo: 'contornada', hachura: 0 }, 1, fontes).length);
  assert.deepEqual(problemas(h, c), []);
});

test('caixaCapitular', () => {
  assert.deepEqual(caixaCapitular({ x: 1, y: 2, linhas: 2, entrelinha: 5 }), { x: 1, y: 2, l: 10, a: 10 });
  assert.deepEqual(caixaCapitular({ x: 0, y: 0, linhas: 8, entrelinha: 5, proporcao: 0.8 }), { x: 0, y: 0, l: 32, a: 40 });
});

const soma = (t) => t.reduce((s, tr) => s + comprimento(tr), 0);
test('habitada A M Q É: vinha ≥ 0,5 × perímetro da caixa interna', () => {
  const c = { x: 0, y: 0, l: 30, a: 30 };
  for (const letra of ['A', 'M', 'Q', 'É']) {
    const com = capitular(c, { estilo: 'habitada', letra }, 1, fontes);
    const sem = capitular(c, { estilo: 'habitada', letra, vinha: { densidade: 0 } }, 1, fontes); // molduras + letra
    const vin = soma(com) - soma(sem), perim = 4 * 30 * (1 - 2 * 0.2);
    assert.ok(vin >= 0.5 * perim, `${letra}: vinha ${vin.toFixed(1)} < ${(0.5 * perim).toFixed(1)}`);
  }
});

test('contorno: d ≥ 0,4 mm a 15 mm; letra pequena demais fica sem contorno', () => {
  const sI = { HersheySerifBold: fontes.HersheySerifBold }, p = { estilo: 'contornada', letra: 'I', fonte: 'HersheySerifBold' };
  const laco = (a) => capitular({ x: 0, y: 0, l: a, a }, p, 1, sI).map((tr) => { const b = caixaDe([tr]); return Math.min(b.l, b.a); }).reduce((m, v) => Math.min(m, v), Infinity);
  assert.ok(laco(15) >= 0.8 - 1e-6, `largura do laço ${laco(15)}`);
  const peq = { x: 0, y: 0, l: 6, a: 6 }; // a interna < 6,7 mm: sem contorno, igual à lombarda
  assert.equal(capitular(peq, p, 1, sI).length, capitular(peq, { ...p, estilo: 'lombarda' }, 1, sI).length);
});

test('capitular nó 15 mm: células ≥ 4 mm', () => {
  const c = { x: 0, y: 0, l: 15, a: 15 };
  const t = capitular(c, { estilo: 'no', letra: 'A' }, 1, fontes);
  assert.deepEqual(problemas(t, c), []);
  assert.ok(grade(c, Math.max(2, Math.floor(15 / 4))).tx >= 4);
});
