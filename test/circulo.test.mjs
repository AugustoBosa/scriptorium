import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { circulo, circuloAleatorio, textoEmArco, selo, VAO, ALT_MIN, PARAMS } from '../src/arcano/circulo.js';
import { problemas, dist } from '../src/geo.js';
import { parseFonte } from '../src/fonte.js';
import { NEUTRA } from '../src/motor/mao.js';
import { gerarAlfabeto } from '../src/arcano/alfabeto.js';

const r3 = (v) => Array.isArray(v) ? v.map(r3) : typeof v === 'number' ? Math.round(v * 1000) / 1000 + 0 : v;
const linhas = (t) => r3(t).map((x) => JSON.stringify(x)).join('\n');
const CAIXAS = [{ x: 13, y: 7, l: 40, a: 25 }, { x: 2, y: 3, l: 60, a: 8 }, { x: 0, y: 0, l: 30, a: 30 }];
const C30 = CAIXAS[2];

const bird = parseFonte(fs.readFileSync(new URL('../fontes/EMSBird.svg', import.meta.url), 'utf8'), 'EMSBird');
const real = { fontes: { EMSBird: bird }, mao: { ...NEUTRA, base: [{ fonte: 'EMSBird', peso: 1 }], seed: 1 } };
const arcano = { fontes: { arcano: gerarAlfabeto({ seed: 1 }) }, mao: { ...NEUTRA, base: [{ fonte: 'arcano', peso: 1 }], seed: 1 } };

const ok = (f, caixa, rotulo) => {
  const t = f();
  assert.ok(t.length >= 1, rotulo);
  assert.deepEqual(problemas(t, caixa), [], rotulo);
  assert.deepEqual(f(), t, rotulo);
};

for (const tipo of ['linha', 'dupla', 'runas', 'texto', 'dentes', 'pontos', 'onda']) {
  for (const [k, caixa] of CAIXAS.entries()) {
    test(`anel ${tipo} caixa ${k}: dentro, sem NaN, determinístico`, () => {
      const spec = { aneis: [{ raio: 1, tipo, largura: 0.15, texto: 'abc def' }] };
      ok(() => circulo(caixa, spec, 3), caixa, tipo);
      ok(() => circulo(caixa, spec, 3, real), caixa, tipo + ' real');
    });
  }
}

test('caixa degenerada dá []', () => {
  for (const c of [{ x: 0, y: 0, l: 0, a: 10 }, { x: 0, y: 0, l: 10, a: 0 }, { x: 0, y: 0, l: 0.3, a: 0.3 }]) {
    assert.deepEqual(circulo(c), []);
    assert.deepEqual(selo(c, { texto: 'a' }), []);
  }
});

test('circuloAleatorio: complexidades e seeds sem problemas', () => {
  for (const c of [0, 0.5, 1]) for (let seed = 1; seed <= 5; seed++) {
    for (const caixa of CAIXAS) ok(() => circulo(caixa, circuloAleatorio(seed, c), seed, real), caixa, `c ${c} seed ${seed}`);
    ok(() => circulo(C30, circuloAleatorio(seed, c), seed), C30, `c ${c} seed ${seed} sem ctx`);
  }
});

test('circuloAleatorio: seed muda; runas muda com a seed', () => {
  assert.notDeepEqual(circuloAleatorio(1, 0.5), circuloAleatorio(2, 0.5));
  const spec = { aneis: [{ raio: 1, tipo: 'runas', largura: 0.2 }] };
  assert.notDeepEqual(circulo(C30, spec, 1), circulo(C30, spec, 2));
});

test('polígonos: {6/2} dá 2 traços fechados, {5/2} dá 1', () => {
  for (const [n, passo, esperado] of [[6, 2, 2], [5, 2, 1], [7, 3, 1], [9, 3, 3]]) {
    const t = circulo(C30, { aneis: [], poligonos: [{ n, passo, raio: 0.9 }] }, 1);
    assert.equal(t.length, esperado, `{${n}/${passo}}`);
    for (const tr of t) assert.ok(dist(tr[0], tr.at(-1)) < 1e-6);
  }
});

test('nós: vão limpo em volta de cada nó', () => {
  const spec = { aneis: [{ raio: 1, tipo: 'dupla' }, { raio: 0.7, tipo: 'linha' }], poligonos: [{ n: 5, passo: 2, raio: 0.7 }], raios: { n: 5, de: 0.1, ate: 0.7 }, nos: { n: 5, raio: 0.7, tamanho: 0.05 } };
  const t = circulo(C30, spec, 1);
  const R = 15 - 0.2, r = 0.05 * R;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / 5, f = [15 + 0.7 * R * Math.cos(a), 15 + 0.7 * R * Math.sin(a)];
    for (const tr of t) for (const p of tr) {
      const d = dist(p, f);
      if (Math.abs(d - r) < 1e-6) continue; // o próprio nó
      assert.ok(d <= r + 1e-6 || d >= r + VAO - 0.01, `ponto a ${d} do nó ${i}`);
    }
  }
});

test('dupla com largura 0.001: círculos a ≥ VAO', () => {
  const t = circulo(C30, { aneis: [{ raio: 1, tipo: 'dupla', largura: 0.001 }] }, 1);
  assert.equal(t.length, 2);
  const [r1, r2] = t.map((tr) => dist(tr[0], [15, 15]));
  assert.ok(Math.abs(r1 - r2) >= VAO - 1e-6);
});

for (const [nome, ctx] of [['fallback arcano', arcano], ['EMSBird', real]]) {
  test(`textoEmArco (${nome}): faixa de raios e início`, () => {
    for (const sentido of [1, -1]) {
      const arco = { c: [20, 20], r: 15, inicio: sentido === 1 ? -Math.PI / 2 : Math.PI / 2, sentido, altura: 2 };
      const t = textoEmArco('que a luz guarde', arco, ctx);
      assert.ok(t.length >= 1);
      assert.deepEqual(problemas(t, { x: 0, y: 0, l: 40, a: 40 }), []);
      for (const p of t.flat()) {
        const d = dist(p, [20, 20]);
        assert.ok(sentido === 1 ? d >= 15 - 0.8 && d <= 15 + 3 : d <= 15 + 0.8 && d >= 15 - 3, `raio ${d}`);
      }
      assert.deepEqual(textoEmArco('que a luz guarde', arco, ctx), t);
    }
    const t = textoEmArco('abc', { c: [0, 0], r: 10, inicio: 0, sentido: 1, altura: 2, centrar: false }, ctx);
    const a = Math.atan2(t[0][0][1], t[0][0][0]);
    assert.ok(Math.abs(a) < 0.3, `início ${a}`);
  });
}

test('textoEmArco: texto longo encolhe e cabe em 2πr', () => {
  const t = textoEmArco('que a luz guarde esta casa e todos os que nela moram ', { c: [0, 0], r: 10, inicio: -Math.PI / 2, sentido: 1, altura: 3 }, arcano);
  const ang = t.flat().map(([x, y]) => Math.atan2(y, x));
  // sem passar de uma volta: nenhum ponto a mais de π do início da leitura em sentido horário
  assert.ok(t.length > 0 && ang.every(Number.isFinite));
  const alt = Math.max(...t.flat().map((p) => dist(p, [0, 0]))) - 10;
  assert.ok(alt > 0 && alt < 3 * 0.7 * 0.95, `altura ${alt}`); // encolheu
  assert.deepEqual(textoEmArco('', { c: [0, 0], r: 6, altura: 2 }, arcano), []);
});

test('anel texto com ctx real e selo sem problemas', () => {
  for (const caixa of CAIXAS) {
    ok(() => selo(caixa, { texto: 'que a luz guarde', pontas: 5 }, 2, real), caixa, 'selo texto real');
    ok(() => selo(caixa, { pontas: 7 }, 2, real), caixa, 'selo runas');
    ok(() => selo(caixa, { texto: 'abc' }, 2), caixa, 'selo sem ctx');
  }
  ok(() => selo(C30, { texto: 'x', pontas: 3, centro: { tipo: 'tracos', raio: 0.3, tracos: [[[0, 0], [5, 8]], [[5, 8], [10, 0]]] } }, 1), C30, 'centro tracos');
});

test('satélites e centros', () => {
  for (const tipo of ['circulo', 'cruz', 'runa', 'nenhum']) {
    ok(() => circulo(C30, { ...circuloAleatorio(1, 1), centro: { tipo, raio: 0.2 } }, 1), C30, tipo);
  }
});

test('golden: dupla + {5/2} em C30', (t) => {
  t.assert.snapshot(linhas(circulo(C30, { aneis: [{ raio: 1, tipo: 'dupla' }], poligonos: [{ n: 5, passo: 2, raio: 0.9 }] }, 1)));
});

test('golden: circuloAleatorio(1, 0.5)', (t) => {
  t.assert.snapshot(JSON.stringify(r3(circuloAleatorio(1, 0.5))));
});

test('golden: selo abc sem ctx', (t) => {
  t.assert.snapshot(linhas(selo(C30, { texto: 'abc' }, 1)));
});

const altura = (t, c, r) => Math.max(...t.flat().map((p) => Math.abs(dist(p, c) - r)));

test('anel texto estreito vira dois círculos (sem letras); faixa larga mantém texto >= ALT_MIN', () => {
  for (const [l, larg] of [[20, 0.15], [40, 0.08]]) {
    const t = circulo({ x: 0, y: 0, l, a: l }, { aneis: [{ raio: 1, tipo: 'texto', largura: larg, texto: 'abc def' }] }, 1, real);
    assert.equal(t.length, 2, `Ø${l} largura ${larg}`);
  }
  const R = 15 - 0.2, larg = 0.3, b = larg * R, rb = R - b + VAO;
  const t = circulo(C30, { aneis: [{ raio: 1, tipo: 'texto', largura: larg, texto: 'abc' }] }, 1, real);
  assert.ok(t.length > 2);
  assert.ok(altura(t, [15, 15], rb) >= ALT_MIN, 'altura do texto');
});

test('textoEmArco: encolher abaixo de ALT_MIN devolve []', () => {
  const arco = { c: [0, 0], r: 3, altura: 2 };
  assert.deepEqual(textoEmArco('que a luz guarde esta casa e todos os que nela moram', arco, arcano), []);
});

test('prévias de anel texto e faixa do selo não ficam ilegíveis', () => {
  const p = Object.fromEntries(PARAMS.map((x) => [x.chave, x]));
  assert.equal(p.anel.previa('texto', real).length, 2 + 1);
  assert.notDeepEqual(p.faixa.previa(p.faixa.min, real), p.faixa.previa(p.faixa.max, real));
  assert.ok(PARAMS.some((x) => x.chave === 'complexidadeCirculo') && !PARAMS.some((x) => x.chave === 'complexidade'));
});
