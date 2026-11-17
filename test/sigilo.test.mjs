import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sigiloPalavra, reduzir, KAMEAS, PARAMS } from '../src/arcano/sigilo.js';
import { parseFonte } from '../src/fonte.js';
import { problemas, dist } from '../src/geo.js';

const r3 = (v) => Array.isArray(v) ? v.map(r3) : typeof v === 'number' ? Math.round(v * 1000) / 1000 + 0 : v;
const linhas = (t) => r3(t).map((x) => JSON.stringify(x)).join('\n');
const CAIXAS = [{ x: 13, y: 7, l: 40, a: 25 }, { x: 2, y: 3, l: 60, a: 8 }, { x: 0, y: 0, l: 30, a: 30 }];
const C30 = CAIXAS[2];
const sans = parseFonte(readFileSync(new URL('../fontes/HersheySans1.svg', import.meta.url), 'utf8'), 'HersheySans1');
const ctx = { fontes: { HersheySans1: sans } };
const FRASES = ['abracadabra', 'eu sou', 'z'];

test('KAMEAS: mágicos e permutações de 1..n²', () => {
  for (const n of [3, 4, 5, 6]) {
    const K = KAMEAS[n], S = (n * (n * n + 1)) / 2, soma = (v) => v.reduce((a, b) => a + b, 0);
    assert.deepEqual(K.flat().sort((a, b) => a - b), Array.from({ length: n * n }, (_, i) => i + 1));
    for (let i = 0; i < n; i++) {
      assert.equal(soma(K[i]), S);
      assert.equal(soma(K.map((l) => l[i])), S);
    }
    assert.equal(soma(K.map((l, i) => l[i])), S);
    assert.equal(soma(K.map((l, i) => l[n - 1 - i])), S);
  }
});

test('reduzir', () => {
  assert.equal(reduzir('Abracadabra é luz'), 'brcdlz');
  assert.ok(reduzir('aeiou').length > 0);
});

for (const metodo of ['kamea', 'roda', 'fusao'])
  for (const frase of FRASES)
    for (const [k, caixa] of CAIXAS.entries()) {
      test(`${metodo} '${frase}' caixa ${k}: dentro, sem NaN, determinístico`, () => {
        const t = sigiloPalavra(caixa, { frase, metodo }, 1, ctx);
        assert.ok(t.length >= 1);
        assert.deepEqual(problemas(t, caixa), []);
        assert.deepEqual(sigiloPalavra(caixa, { frase, metodo }, 1, ctx), t);
      });
    }

test('fusão sem ctx cai no alfabeto arcano', () => {
  const t = sigiloPalavra(C30, { frase: 'abracadabra', metodo: 'fusao' }, 1);
  assert.ok(t.length >= 1);
  assert.deepEqual(problemas(t, C30), []);
});

test('seed: kamea e roda não mudam, fusão muda', () => {
  for (const metodo of ['kamea', 'roda'])
    assert.deepEqual(sigiloPalavra(C30, { frase: 'abracadabra', metodo }, 1), sigiloPalavra(C30, { frase: 'abracadabra', metodo }, 2));
  assert.notDeepEqual(sigiloPalavra(C30, { frase: 'abracadabra', metodo: 'fusao' }, 1, ctx), sigiloPalavra(C30, { frase: 'abracadabra', metodo: 'fusao' }, 2, ctx));
});

test("kamea 3 'bcb': segmento repetido vira curva", () => {
  const t = sigiloPalavra(C30, { frase: 'bcb', metodo: 'kamea', reduzir: false }, 1);
  assert.ok(Math.max(...t.map((x) => x.length)) > 3);
});

test('vão limpo em volta do círculo de início', () => {
  for (const metodo of ['kamea', 'roda']) for (const ordem of [3, 6]) {
    const t = sigiloPalavra(C30, { frase: 'abracadabra', metodo, ordem }, 1);
    const [circ, ...resto] = t;
    const c = [circ.reduce((s, p) => s + p[0], 0) / circ.length, circ.reduce((s, p) => s + p[1], 0) / circ.length];
    const r0 = dist(c, circ[0]);
    for (const p of resto.flat()) assert.ok(dist(c, p) >= r0 + 0.5 - 0.01, `${metodo} ${ordem}`);
  }
});

test('frase vazia e caixa degenerada dão []', () => {
  assert.deepEqual(sigiloPalavra(C30, { frase: '' }, 1), []);
  assert.deepEqual(sigiloPalavra({ x: 0, y: 0, l: 0, a: 10 }, {}, 1), []);
});

test('PARAMS: ordem e reduzir mudam o desenho', () => {
  const [, ordem, red] = PARAMS;
  assert.notDeepEqual(ordem.previa(3), ordem.previa(6));
  assert.notDeepEqual(red.previa(true), red.previa(false));
});

test('golden: kamea 3', (t) => { t.assert.snapshot(linhas(sigiloPalavra(C30, { frase: 'abracadabra', metodo: 'kamea' }, 1))); });
test('golden: roda', (t) => { t.assert.snapshot(linhas(sigiloPalavra(C30, { frase: 'abracadabra', metodo: 'roda' }, 1))); });
test('golden: fusão HersheySans1', (t) => { t.assert.snapshot(linhas(sigiloPalavra(C30, { frase: 'abracadabra', metodo: 'fusao' }, 1, ctx))); });
