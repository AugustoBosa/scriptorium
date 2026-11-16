import { test } from 'node:test';
import assert from 'node:assert/strict';
import { svg, svgDocumento } from '../src/maquina/gcode.js';

const papel = { largura: 105, altura: 148 };
const canetas = { preta: { cor: '#111', espessura: 0.4 }, vermelha: { cor: '#c00', espessura: 0.5 } };
const camada = (id, caneta, tracos) => ({ id, caneta, personagem: null, ordem: 'otimizada', tracos });
const pag = {
  camadas: [
    camada('texto', 'preta', [[[10, 20], [30, 20]]]),
    camada('notas', 'vermelha', [[[10, 40], [30, 40]]]),
  ],
};
const ds = (s) => [...s.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);

test('duas camadas com canetas diferentes geram dois grupos com cores próprias', () => {
  const s = svgDocumento(pag, papel, canetas);
  assert.equal((s.match(/<g data-camada/g) || []).length, 2);
  assert.ok(s.includes('stroke="#111"'));
  assert.ok(s.includes('stroke="#c00"'));
});

test('filtro por camadas deixa só a pedida', () => {
  const s = svgDocumento(pag, papel, canetas, { camadas: ['notas'] });
  assert.equal((s.match(/<g data-camada/g) || []).length, 1);
  assert.ok(s.includes('data-camada="notas"'));
  assert.ok(!s.includes('texto'));
});

test('traço com um ponto é descartado', () => {
  const p = { camadas: [camada('a', 'preta', [[[1, 1]], [[1, 1], [2, 2]]])] };
  const s = svgDocumento(p, papel, canetas);
  assert.equal((s.match(/<path/g) || []).length, 1);
});

test('viewBox é o tamanho do papel', () => {
  const s = svgDocumento(pag, papel, canetas);
  assert.ok(s.includes('viewBox="0 0 105 148"'));
  assert.ok(s.includes('width="105mm" height="148mm"'));
});

test('id com aspas e menor-que sai escapado', () => {
  const p = { camadas: [camada('a"b<c', 'preta', [[[1, 1], [2, 2]]])] };
  const s = svgDocumento(p, papel, canetas);
  assert.ok(s.includes('a&quot;b&lt;c'));
  assert.ok(!s.includes('a"b<c'));
});

test('camada preta sem canetas tem os mesmos d de svg()', () => {
  const tracos = [[[10, 20], [30, 20]], [[5, 5], [6, 9], [8, 1]]];
  const p = { camadas: [camada('preta', 'preta', tracos)] };
  assert.deepEqual(ds(svgDocumento(p, papel)), ds(svg(tracos, papel)));
});

test('trajeto desenha viagem; sem trajeto não há círculo', () => {
  const com = svgDocumento(pag, papel, canetas, { trajeto: true });
  assert.ok(com.includes('<circle'));
  assert.ok(com.includes('stroke-dasharray'));
  const sem = svgDocumento(pag, papel, canetas);
  assert.ok(!sem.includes('<circle'));
});

test('caneta ausente em canetas usa preto e espessura 0.3', () => {
  const p = { camadas: [camada('x', 'desconhecida', [[[1, 1], [2, 2]]])] };
  const s = svgDocumento(p, papel, canetas);
  assert.ok(s.includes('stroke="#000"'));
  assert.ok(s.includes('stroke-width="0.3"'));
});
