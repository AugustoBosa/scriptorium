import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dist, comprimento, ret, retDe, inset, circulo, arco, caixaDe, limpar, reamostrar, encaixar,
  recortarCaixa, recortarRaio, afastar, deslocar, hachura, problemas } from '../src/geo.js';

const C = { x: 0, y: 0, l: 20, a: 10 };
const quad = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];

test('basicos: dist, comprimento, ret, inset, circulo, arco, caixaDe', () => {
  assert.equal(dist([0, 0], [3, 4]), 5);
  assert.equal(comprimento([[0, 0], [3, 4], [3, 0]]), 9);
  assert.deepEqual(ret(0, 0, 2, 1), [[0, 0], [2, 0], [2, 1], [0, 1], [0, 0]]);
  assert.deepEqual(retDe({ x: 1, y: 2, l: 3, a: 4 }), ret(1, 2, 4, 6));
  assert.deepEqual(inset({ x: 0, y: 0, l: 4, a: 2 }, 5), { x: 5, y: 5, l: 0, a: 0 });
  assert.equal(circulo(0, 0, 1, 8).length, 9);
  assert.deepEqual(circulo(0, 0, 1, 8)[0], [1, 0]);
  assert.equal(arco(0, 0, 1, 0, Math.PI, 12).length, 13);
  assert.deepEqual(caixaDe([[[1, 2], [5, 9]], [[0, 4]]]), { x: 0, y: 2, l: 5, a: 7 });
  assert.deepEqual(caixaDe([]), { x: 0, y: 0, l: 0, a: 0 });
});

test('limpar: tira ponto repetido e traço com < 2 pontos', () => {
  assert.deepEqual(limpar([[[0, 0], [0, 0], [1, 0]], [[5, 5]]]), [[[0, 0], [1, 0]]]);
});

test('reamostrar: n = ceil(L/passo), extremos inclusos, pontos equidistantes', () => {
  const r = reamostrar([[0, 0], [10, 0]], 3);
  assert.equal(r.length, 5);
  assert.deepEqual(r[0], [0, 0]);
  assert.deepEqual(r[4], [10, 0]);
  assert.ok(Math.abs(dist(r[0], r[1]) - 2.5) < 1e-9);
});

test('encaixar: escala uniforme, centralizada, dentro da caixa, toca 2 lados opostos', () => {
  const caixa = { x: 5, y: 5, l: 20, a: 10 };
  const r = encaixar([[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]], caixa);
  const b = caixaDe(r);
  assert.deepEqual(b, { x: 10, y: 5, l: 10, a: 10 });
  assert.deepEqual(problemas(r, caixa), []);
});

test('recortarCaixa: atravessa vira pedaço interno; sai e volta vira 2; tudo fora vira []', () => {
  const atravessa = recortarCaixa([[[-5, 5], [25, 5]]], C);
  assert.deepEqual(atravessa, [[[0, 5], [20, 5]]]);

  const saiVolta = recortarCaixa([[[5, 5], [30, 5], [30, 2], [5, 2]]], C);
  assert.equal(saiVolta.length, 2);
  assert.deepEqual(problemas(saiVolta, C), []);

  assert.deepEqual(recortarCaixa([[[-5, -5], [-1, 50]]], C), []);
});

test('recortarRaio: reta pelo centro vira 2 pedaços com vão de 2r; toda dentro = []; toda fora = igual', () => {
  const reta = [[-10, 0], [10, 0]];
  const pedacos = recortarRaio(reta, [0, 0], 3);
  assert.equal(pedacos.length, 2);
  assert.ok(Math.abs(dist(pedacos[0][pedacos[0].length - 1], pedacos[1][0]) - 6) < 1e-9);

  assert.deepEqual(recortarRaio([[0.5, 0], [1, 0]], [0, 0], 3), []);
  assert.deepEqual(recortarRaio([[10, 10], [20, 10]], [0, 0], 3), [[[10, 10], [20, 10]]]);
});

test('deslocar: reta desloca d em y; quadrado fechado continua fechado e a d', () => {
  const r = deslocar([[0, 0], [10, 0]], 2);
  assert.deepEqual(r, [[0, 2], [10, 2]]);

  const q = deslocar(quad, 1);
  assert.deepEqual(q[0], q[q.length - 1]);
  const esperado = [[1, 1], [9, 1], [9, 9], [1, 9]];
  for (const e of esperado) assert.ok(q.some((p) => dist(p, e) < 1e-9), `falta ${e}`);
});

test('afastar: nenhum ponto restante a menos de folga do obstáculo', () => {
  const obst = [ret(4, -5, 6, 15)];
  const traco = [[0, 5], [10, 5]];
  const r = afastar([traco], obst, 1);
  assert.ok(r.length >= 1);
  const O = obst.flatMap((t) => reamostrar(t, 0.5));
  for (const t of r) for (const p of t) assert.ok(Math.min(...O.map((o) => dist(o, p))) >= 1 - 1e-9);
});

test('hachura: primeiro x = 0 não estoura, ~5/espaco linhas a 0°, não muta a entrada, cruzada tem mais', () => {
  const poly = [[0, 0], [10, 0], [10, 5], [0, 5]];
  const copia = structuredClone(poly);
  const l = hachura(poly, { angulo: 0, espaco: 1 });
  assert.deepEqual(poly, copia);
  assert.ok(l.length >= 4 && l.length <= 6, `linhas: ${l.length}`);
  for (const [a, b] of l) {
    assert.ok(Math.abs(a[1] - b[1]) < 1e-6);
    for (const p of [a, b]) {
      assert.ok(p[0] >= -0.02 && p[0] <= 10.02 && p[1] >= -0.02 && p[1] <= 5.02);
    }
  }
  assert.ok(hachura(poly, { angulo: 45, espaco: 1, cruzada: true }).length > hachura(poly, { angulo: 45, espaco: 1 }).length);
});

test('hachura: anel [fora, dentro] não risca o furo', () => {
  const fora = [[0, 0], [20, 0], [20, 20], [0, 20]];
  const dentro = [[7, 7], [13, 7], [13, 13], [7, 13]];
  const l = hachura([fora, dentro], { angulo: 0, espaco: 1 });
  assert.ok(l.length > 0);
  for (const [a, b] of l) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    assert.ok(!(mx > 7.01 && mx < 12.99 && my > 7.01 && my < 12.99), `risca o furo em ${mx},${my}`);
  }
});

test('problemas: acusa NaN, 1 ponto e fora; [] quando ok', () => {
  assert.deepEqual(problemas([[[0, 0], [1, 1]]], C), []);
  assert.deepEqual(problemas([[[0, 0]]], C), ['traço 0: < 2 pontos']);
  assert.deepEqual(problemas([[[0, NaN], [1, 1]]], C), ['traço 0: não finito']);
  assert.deepEqual(problemas([[[0, 0], [99, 1]]], C), ['traço 0: fora da caixa']);
});

test('caixa degenerada: inset nunca negativa', () => {
  assert.equal(inset({ x: 0, y: 0, l: 1, a: 1 }, 2).l, 0);
});
