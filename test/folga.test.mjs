import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { simularPonta, raioFolga, desvio, letrasDa, avaliar, TAMANHOS } from '../src/maquina/folga.js';
import { FOLGA_FONTES } from '../src/maquina/folga-fontes.js';
import { PERFIS, minimoTamanho } from '../src/maquina/perfis.js';
import { parseFonte, FONTES } from '../src/fonte.js';

const circulo = (R, n = 400) => Array.from({ length: n + 1 }, (_, i) => [R * Math.cos((2 * Math.PI * i) / n), R * Math.sin((2 * Math.PI * i) / n)]);

test('folga do porta-caneta v5.1: ±0,39 mm na ponta', () => {
  assert.ok(Math.abs(raioFolga() - 0.392) < 1e-9);
});

test('sem folga a ponta segue a cabeça', () => {
  const t = [[0, 0], [3, 0], [3, 2]];
  const [s] = simularPonta([t], 0);
  assert.ok(desvio([t], [s], 0.05).h < 0.05); // só o erro da amostragem
});

test('círculo de raio R vira círculo de raio √(R² − r²) depois da 1ª volta', () => {
  const R = 1, r = 0.4, [s] = simularPonta([[...circulo(R), ...circulo(R)]], r);
  for (const [x, y] of s.slice(-200)) assert.ok(Math.abs(Math.hypot(x, y) - Math.sqrt(R * R - r * r)) < 0.01);
});

test('traço menor que a folga vira ponto; o deslocamento passa para o traço seguinte', () => {
  const r = 0.4, [a, b] = simularPonta([[[0, 0], [0.3, 0]], [[5, 0], [6, 0]]], r);
  assert.ok(a.every(([x, y]) => x === 0 && y === 0));
  assert.ok(Math.abs(b[0][0] - 4.7) < 1e-9); // a ponta ficou 0,3 atrás da cabeça no 1º traço e começa assim o 2º
  assert.ok(Math.abs(b.at(-1)[0] - (6 - r)) < 1e-9); // reta longa: a ponta chega r atrás da cabeça
});

test('a tabela cobre as 43 fontes e foi feita com a folga dos perfis do porta-caneta', () => {
  assert.deepEqual(Object.keys(FOLGA_FONTES.fontes).sort(), [...FONTES].sort());
  assert.equal(FOLGA_FONTES.r, +PERFIS.megaSTroca.folgaPonta.toFixed(3));
  assert.equal(PERFIS.megaS.folgaPonta, undefined);
});

test('a tabela bate com a simulação: HersheySans1 passa no mínimo e reprova meio passo abaixo', () => {
  const n = 'HersheySans1', { minimo } = FOLGA_FONTES.fontes[n];
  const L = letrasDa(parseFonte(fs.readFileSync(new URL(`../fontes/${n}.svg`, import.meta.url), 'utf8'), n));
  assert.ok(avaliar(L, minimo, FOLGA_FONTES.r, FOLGA_FONTES.esp).ok);
  if (minimo > TAMANHOS[0]) assert.ok(!avaliar(L, minimo - 0.5, FOLGA_FONTES.r, FOLGA_FONTES.esp).ok);
});

test('minimoTamanho: maior mínimo entre as fontes da mão; sem folga, sem limite', () => {
  const mao = { base: [{ fonte: 'HersheySans1' }, { fonte: 'EMSAllure' }] };
  const esperado = Math.max(...mao.base.map((b) => FOLGA_FONTES.fontes[b.fonte].minimo ?? 15));
  assert.equal(minimoTamanho(PERFIS.megaSTroca, mao).valor, esperado);
  assert.equal(minimoTamanho(PERFIS.megaS, mao), null);
});
