import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFonte } from '../src/fonte.js';
import { NEUTRA, glifo } from '../src/motor/mao.js';
import { escreverPalavra } from '../src/motor/escrita.js';
import { cursiva, medidas, analisar, saida, entrada, ponte, ligar, adiar, retocada, retocar } from '../src/motor/ductus.js';
import { rng } from '../src/rng.js';

const raiz = new URL('../', import.meta.url);
const fontes = Object.fromEntries(['EMSAllure', 'EMSSociety', 'EMSBird'].map((n) => [n, parseFonte(fs.readFileSync(new URL(`fontes/${n}.svg`, raiz), 'utf8'), n)]));
const maoDe = (n, extra = {}) => ({ ...NEUTRA, seed: 7, base: [{ fonte: n, peso: 1 }], ...extra });
const comp = (t) => t.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - t[i - 1][0], p[1] - t[i - 1][1]) : 0), 0);

test('cursiva: só com fontes de CURSIVAS', () => {
  assert.ok(cursiva(maoDe('EMSAllure')));
  assert.ok(!cursiva(maoDe('EMSBird')));
  assert.ok(!cursiva({ base: [] }));
});

test('analisar: i de Allure tem 1 extra e vai da esquerda para a direita; m de Society idem', () => {
  const m = maoDe('EMSAllure'), { xh } = medidas(fontes, m);
  const a = analisar(glifo(fontes, m, 'i', 0), xh);
  assert.equal(a.extras.length, 1);
  assert.ok(a.E[0] < a.S[0]);
  const s = maoDe('EMSSociety');
  const b = analisar(glifo(fontes, s, 'm', 0), medidas(fontes, s).xh);
  assert.ok(b.E[0] < b.S[0]);
  for (const c of 'çã') assert.equal(analisar(glifo(fontes, m, c, 0), xh).extras.length, 1, c);
});

test('analisar não altera o glifo', () => {
  const m = maoDe('EMSAllure'), g = glifo(fontes, m, 'i', 0), copia = structuredClone(g);
  analisar(g, medidas(fontes, m).xh);
  assert.deepEqual(g, copia);
});

test('saida e entrada: as três classes', () => {
  const med = { xh: 0.4, ySai: 0.2 };
  const A = (E, S) => ({ E, S });
  assert.equal(saida(A([0, 0], [0.1, 0.1]), 0.6, med), 'nenhuma');
  assert.equal(saida(A([0, 0], [0.5, 0.5]), 0.6, med), 'alta');
  assert.equal(saida(A([0, 0], [0.5, 0.2]), 0.6, med), 'base');
  assert.equal(entrada(A([0.3, 0.8], [0, 0]), med), 'nenhuma');
  assert.equal(entrada(A([0.05, 0.1], [0, 0]), med), 'subida');
  assert.equal(entrada(A([0.3, 0.1], [0, 0]), med), 'oval');
});

test('ponte: vão de 0,59 em com segmentos curtos e pontas preservadas', () => {
  const A = [[0, 0], [0.1, 0.1], [0.2, 0.2]], B = [[0.79, 0.2], [0.9, 0.3], [1, 0.3]];
  const p = ponte(A, B);
  assert.deepEqual(p.slice(0, 3), A);
  assert.deepEqual(p.slice(-3), B);
  // segmentos novos: a Hermite com tangente d acelera até ~1,5x no meio, então o teto real é ~1,6 PASSO (spec §6.4 dizia PASSO)
  for (let i = 3; i <= p.length - 3; i++) assert.ok(Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) <= 0.05);
  assert.deepEqual(ponte([[0, 0], [0.1, 0]], [[0.12, 0], [0.3, 0]]).length, 3); // toque: só concatena
});

test('ligar: null com 1 letra, com ligadura 0 e com vão de 0,61 em', () => {
  const m = maoDe('EMSAllure', { ligadura: 1, capricho: 0 }), med = medidas(fontes, m);
  const um = [glifo(fontes, m, 'a', 0)];
  assert.equal(ligar(um, ['a'], m, med, 0), null);
  const gs = [...'nu'].map((c) => glifo(fontes, m, c, 0));
  assert.equal(ligar(gs, [...'nu'], { ...m, ligadura: 0 }, med, 0), null);
  const longe = [{ adv: 1, tracos: [[[0, 0], [0.1, 0.1], [0.2, 0.2]]] }, { adv: 1, tracos: [[[0.2 + 0.61, 0.2], [1.2, 0.1]]] }];
  assert.equal(ligar(longe, [...'nu'], m, { xh: 0.356, ySai: 0.2 }, 0), null);
});

test('ligar: "minimum" em Allure sai em 3 traços; pingos depois com adiamento', () => {
  const m = maoDe('EMSAllure', { ligadura: 1, capricho: 0, adiamento: 1 });
  const w = escreverPalavra('minimum', { fontes, mao: m, tamanho: 10 });
  assert.equal(w.tracos.length, 3);
  assert.ok(comp(w.tracos[0]) > comp(w.tracos[1]));
});

test('neutro: escreverPalavra sem a chave tracos', () => {
  const w = escreverPalavra('minimum', { fontes, mao: maoDe('EMSAllure'), tamanho: 10 });
  assert.ok(!('tracos' in w));
});

test('adiar: com pressa 1 o pingo vira traço de 2 pontos; consome 3 valores', () => {
  const pingo = [[0.2, 0.6], [0.21, 0.61], [0.2, 0.62]];
  const r = rng('a'), r2 = rng('a');
  let u = 0;
  for (; u < 200; u++) {
    const t = adiar(pingo, { pressa: 1 }, rng('p' + u));
    if (t.length === 2) break;
  }
  assert.ok(u < 200);
  adiar(pingo, { pressa: 0 }, r);
  r2(); r2(); r2();
  assert.equal(r(), r2());
  assert.equal(adiar(pingo, { pressa: 0 }, rng('z')).length, 3);
});

test('retocada: 30 em 1000 com retoque 1, 0 com retoque 0', () => {
  let n1 = 0, n0 = 0;
  for (let n = 0; n < 1000; n++) { n1 += retocada('s', n, 1); n0 += retocada('s', n, 0); }
  assert.ok(Math.abs(n1 - 30) <= 1, String(n1));
  assert.equal(n0, 0);
});

test('retocar: preserva primeiro (repasse) e último ponto e aumenta os pontos', () => {
  const t = Array.from({ length: 10 }, (_, i) => [i * 0.05, Math.sin(i) * 0.1]);
  const g = { adv: 0.5, tracos: [t.map((p) => [...p])] };
  retocar(g, false, rng('x'));
  const n = g.tracos[0];
  assert.ok(n.length > t.length);
  assert.deepEqual(n.at(-1), t.at(-1));
  assert.deepEqual(n[0], t[0]);
});
