import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFonte } from '../src/fonte.js';
import { NEUTRA } from '../src/motor/mao.js';
import { variante, deformar, perfis, encaixe, arrematar } from '../src/motor/contexto.js';
import { escreverPalavra } from '../src/motor/escrita.js';
import { rng } from '../src/rng.js';

const raiz = new URL('../', import.meta.url);
const fontes = { EMSBird: parseFonte(fs.readFileSync(new URL('fontes/EMSBird.svg', raiz), 'utf8'), 'EMSBird') };
const mao = { ...NEUTRA, seed: 3, base: [{ fonte: 'EMSBird', peso: 1 }] };
const G = () => ({ adv: 0.5, tracos: [[[0.1, 0], [0.2, 0.3], [0.3, 0.5]], [[0.4, 0.1]]] });

test('variante: K=1 dá 0; n e n+1 diferem; resultado em [0,K)', () => {
  assert.equal(variante('s', 'a', 5, 1), 0);
  for (let K = 2; K <= 5; K++) {
    for (let n = 0; n <= 200; n++) {
      const a = variante('s', 'a', n, K), b = variante('s', 'a', n + 1, K);
      assert.notEqual(a, b);
      assert.ok(a >= 0 && a < K && b >= 0 && b < K);
    }
  }
});

test('deformar: v=0 devolve igual; v≠0 muda; determinístico; não altera a entrada', () => {
  const g = G(), copia = structuredClone(g);
  assert.equal(deformar(g, 's', 'a', 0, 1), g);
  const d = deformar(g, 's', 'a', 1, 1);
  assert.notDeepEqual(d, g);
  assert.deepEqual(d, deformar(g, 's', 'a', 1, 1));
  assert.deepEqual(g, copia);
});

test('perfis: traço vertical preenche as faixas que cruza', () => {
  const { esq, dir } = perfis({ adv: 1, tracos: [[[0.2, 0], [0.2, 0.5]]] });
  for (let k = 0; k < 6; k++) {
    const lo = -0.25 + k / 6, hi = lo + 1 / 6;
    const cruza = lo <= 0.5 && hi >= 0;
    assert.equal(Number.isFinite(esq[k]), cruza, 'faixa ' + k);
    if (cruza) assert.equal(esq[k], 0.2), assert.equal(dir[k], 0.2);
  }
});

test('encaixe fica em ±0.12 × contexto', () => {
  const A = { adv: 0.5, tracos: [[[0.1, 0], [0.1, 0.5]]] }, B = { adv: 0.5, tracos: [[[0.1, 0], [0.1, 0.5]]] };
  for (const alvo of [-5, 0, 0.1, 5]) {
    for (const c of [0.5, 1]) assert.ok(Math.abs(encaixe(A, B, c, alvo)) <= 0.12 * c + 1e-12);
  }
  assert.equal(encaixe(A, B, 1, null), 0);
  assert.equal(encaixe(A, { adv: 1, tracos: [] }, 1, 0.1), 0);
});

test('arrematar aumenta adv, sem NaN; ignora traço que vai para a esquerda', () => {
  const g = { adv: 0.3, tracos: [[[0, 0], [0.2, 0.1], [0.4, 0.1]]] };
  arrematar(g, 1, rng('x'));
  assert.ok(g.adv > 0.4 && g.tracos[0].length === 7);
  assert.ok(g.tracos.flat(2).every(Number.isFinite));
  const e = { adv: 0.3, tracos: [[[0.4, 0], [0.1, 0]]] };
  arrematar(e, 1, rng('x'));
  assert.equal(e.tracos[0].length, 2);
});

test('escreverPalavra: neutra = soma dos avanços; largura = Σ adv*s; pura', () => {
  const cont = new Map(), ctx = { fontes, mao, tamanho: 6, cont };
  const w = escreverPalavra('minimum', ctx);
  assert.equal(w.s, 6);
  assert.ok(Math.abs(w.largura - w.glifos.reduce((s, g) => s + g.adv * w.s, 0)) < 1e-9);
  assert.equal(cont.size, 0);
  const cheia = { ...mao, alternativas: 5, contexto: 1, arremate: 1, ondulacao: 1, deriva: 1, ritmo: 40, fadiga: 1 };
  const c = escreverPalavra('Minimum', { ...ctx, mao: cheia, t: 2, F: 0.5 });
  assert.ok(Math.abs(c.largura - c.glifos.reduce((s, g) => s + g.adv * c.s, 0)) < 1e-9);
  assert.ok(c.glifos.flatMap((g) => g.tracos.flat(2)).every(Number.isFinite));
});
