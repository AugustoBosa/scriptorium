import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFonte } from '../src/fonte.js';
import { compor, PAGINAS } from '../src/layout.js';
import { NEUTRA } from '../src/motor/mao.js';

const raiz = new URL('../', import.meta.url);
const fontes = { EMSBird: parseFonte(fs.readFileSync(new URL('fontes/EMSBird.svg', raiz), 'utf8'), 'EMSBird') };
const mao = { ...NEUTRA, base: [{ fonte: 'EMSBird', peso: 1 }] };
const A5 = PAGINAS.A5;
const T = 6, tol = T * 0.3;
const texto = Array(60).fill('palavra').join(' ');
// sem folga no layout: bearing negativo do glifo invade até tol; a caixa é testada encolhida por tol
const dentro = ([x, y], o) => x > o.x + tol && x < o.x + o.l - tol && y > o.y && y < o.y + o.a;

test('1. sem opções: uma âncora por palavra, em ordem, dentro das margens', () => {
  const { ancoras } = compor(texto, fontes, mao, A5);
  assert.equal(ancoras.length, 60);
  ancoras.forEach((a, i) => {
    assert.equal(a.indice, i);
    assert.ok(a.x >= A5.margens.esq && a.x + a.l <= A5.largura - A5.margens.dir + 1e-9);
  });
});

test('2. bbox dos traços de cada palavra cabe na âncora (medida = desenhada)', () => {
  const { paginas, ancoras } = compor('um\ndois\ntres\nquatro', fontes, mao, A5);
  assert.equal(ancoras.length, 4);
  for (const a of ancoras) {
    const xs = paginas[0].flat().filter(([, y]) => Math.abs(y - a.y) < T).map(([x]) => x);
    assert.ok(Math.min(...xs) >= a.x - tol && Math.max(...xs) <= a.x + a.l + tol);
  }
});

test('3. capitular no canto: nenhum ponto na caixa; linhas abaixo voltam à margem', () => {
  const o = { x: 15, y: 15, l: 20, a: 20 };
  const { paginas, ancoras } = compor(texto, fontes, mao, A5, { obstaculos: [o] });
  for (const t of paginas[0]) for (const p of t) assert.ok(!dentro(p, o));
  assert.ok(ancoras.some((a) => a.linha > 0 && a.x === A5.margens.esq));
  assert.ok(ancoras.some((a) => a.linha === 0 && a.x >= o.x + o.l));
});

test('4. obstáculo de largura total: nenhuma linha na faixa, texto continua abaixo', () => {
  const o = { x: 0, y: 40, l: A5.largura, a: 30 };
  const { ancoras } = compor(texto, fontes, mao, A5, { obstaculos: [o] });
  assert.ok(ancoras.every((a) => !(a.y > o.y - T && a.y < o.y + o.a + 0.3 * T)));
  assert.ok(ancoras.some((a) => a.y > o.y + o.a));
});

test('5. duas colunas: vão livre, 2ª coluna no topo, 3ª vai para a página 2', () => {
  const { paginas, ancoras } = compor(texto.repeat(3), fontes, mao, A5, { colunas: 2 });
  const W = A5.largura - 30, l = (W - 2 * T) / 2;
  for (const pg of paginas) for (const t of pg) for (const [x] of t) assert.ok(!(x > 15 + l + tol && x < 15 + l + 2 * T - tol));
  const c0 = ancoras.filter((a) => a.pagina === 0 && a.coluna === 0);
  const c1 = ancoras.filter((a) => a.pagina === 0 && a.coluna === 1);
  assert.equal(c1[0].y, c0[0].y);
  assert.ok(ancoras.some((a) => a.pagina === 1 && a.coluna === 0));
  assert.ok(paginas.length >= 2);
});

test('6. palavra maior que o trecho estreito mas menor que a coluna desce, sem aviso', () => {
  const o = { x: 15, y: 15, l: 105.5, a: 20 };
  const { ancoras, avisos } = compor('palavra', fontes, mao, A5, { obstaculos: [o] });
  assert.ok(!avisos.some((a) => a.startsWith('palavra longa')));
  assert.ok(ancoras[0].y > o.y + o.a);
});

test('7. determinismo com obstáculos e colunas', () => {
  const op = { obstaculos: [{ x: 15, y: 15, l: 20, a: 20 }], colunas: 2 };
  assert.deepEqual(compor(texto, fontes, mao, A5, op), compor(texto, fontes, mao, A5, op));
});

test('8. opções vazias explícitas = sem opções', () => {
  const a = compor(texto, fontes, mao, A5);
  const b = compor(texto, fontes, mao, A5, { obstaculos: [], colunas: 1 });
  assert.deepEqual(a.paginas, b.paginas);
  assert.equal(a.fim, b.fim);
});

test('8. equilibrar: última página com 2 colunas de alturas quase iguais; sem a opção, a 1ª enche', () => {
  const linhas = (r, c) => new Set(r.ancoras.filter((a) => a.pagina === r.paginas.length - 1 && a.coluna === c).map((a) => a.linha)).size;
  const op = { colunas: 2 };
  const sem = compor(texto.repeat(3), fontes, mao, A5, op), com = compor(texto.repeat(3), fontes, mao, A5, { ...op, equilibrar: true });
  assert.equal(com.paginas.length, sem.paginas.length);
  assert.ok(linhas(sem, 0) - linhas(sem, 1) > 1, 'precisa começar desequilibrado');
  assert.ok(Math.abs(linhas(com, 0) - linhas(com, 1)) <= 1);
  assert.equal(com.ancoras.length, sem.ancoras.length);
});
