import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERFIS, papelMaximo, cabeNaMaquina } from '../src/maquina/perfis.js';
import { PERFIL_PADRAO } from '../src/maquina/gcode.js';
import { otimizar } from '../src/maquina/otimizar.js';

const A5 = { largura: 148, altura: 210 }, A6 = { largura: 105, altura: 148 };

test('PERFIL_PADRAO é megaS e personalizado a copia', () => {
  assert.equal(PERFIL_PADRAO, PERFIS.megaS);
  assert.equal(PERFIS.personalizado.nome, 'personalizado');
  assert.equal(PERFIS.personalizado.header, PERFIS.megaS.header);
});

test('papelMaximo e cabeNaMaquina', () => {
  assert.deepEqual(papelMaximo(PERFIS.p2s), { largura: 207, altura: 200 });
  assert.deepEqual(papelMaximo({ mesaX: 200, mesaY: 100 }), { largura: 200, altura: 100 });
  assert.ok(cabeNaMaquina(A5, PERFIS.megaS).ok);
  assert.equal(cabeNaMaquina(A5, PERFIS.megaS).motivo, '');
  assert.ok(!cabeNaMaquina(A5, PERFIS.p2s).ok);
  assert.ok(!cabeNaMaquina({ largura: 210, altura: 148 }, PERFIS.p2s).ok);
  assert.ok(cabeNaMaquina(A6, PERFIS.p2s).ok);
  assert.match(cabeNaMaquina(A5, PERFIS.p2s).motivo, /não cabe/);
});

test('otimizar ordem escrita preserva ordem e sentido; padrão otimiza', () => {
  const x = [[[50, 50], [60, 50]], [[0, 0], [1, 0]], [[60, 50], [50, 50]]];
  const e = otimizar(x, 0.1, { ordem: 'escrita' });
  assert.deepEqual(e, x);
  assert.notEqual(e[0], x[0]);
  assert.notDeepEqual(otimizar(x), x);
});
