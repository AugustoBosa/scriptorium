import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAPEIS, papel, deTracos, validarDocumento } from '../src/materiais/documento.js';
import { FOLHAS, folha } from '../src/materiais/scroll.js';
import { PAGINAS } from '../src/layout.js';

test('PAPEIS tem as 8 chaves com as dimensões da tabela', () => {
  assert.deepEqual(Object.keys(PAPEIS), ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'carta', 'oficio']);
  assert.deepEqual(PAPEIS.A4, [210, 297, 20]);
  assert.deepEqual(PAPEIS.carta, [215.9, 279.4, 20]);
});

test('papel() de A4 tem 210x297 e margens 20; paisagem troca os lados', () => {
  assert.deepEqual(papel('A4'), { largura: 210, altura: 297, margens: { topo: 20, dir: 20, base: 20, esq: 20 } });
  const p = papel('A4', { paisagem: true });
  assert.equal(p.largura, 297);
  assert.equal(p.altura, 210);
});

test('papel() personalizado exige dimensões e nome desconhecido lança erro', () => {
  const p = papel('personalizado', { largura: 100, altura: 150 });
  assert.equal(p.largura, 100);
  assert.equal(p.altura, 150);
  assert.throws(() => papel('personalizado'));
  assert.throws(() => papel('B9'));
});

test('FOLHAS mantém o formato [l, a, m] de A5 a A8 e folha() não mudou', () => {
  assert.deepEqual(FOLHAS, { A5: [148, 210, 12], A6: [105, 148, 9], A7: [74, 105, 6], A8: [52, 74, 4] });
  assert.deepEqual(folha('A6', true, 5), {
    largura: 148, altura: 105, margens: { topo: 5, dir: 5, base: 5, esq: 5 },
  });
});

test('PAGINAS de layout.js bate com PAPEIS em A4 e A5', () => {
  for (const n of ['A4', 'A5']) {
    assert.equal(PAGINAS[n].largura, PAPEIS[n][0]);
    assert.equal(PAGINAS[n].altura, PAPEIS[n][1]);
  }
});

test('deTracos embrulha uma camada por página e valida', () => {
  const t1 = [[[1, 1], [2, 2]]];
  const t2 = [[[3, 3], [4, 4]]];
  const doc = deTracos([t1, t2], papel('A6'));
  assert.equal(doc.paginas.length, 2);
  assert.equal(doc.paginas[0].camadas.length, 1);
  assert.deepEqual(validarDocumento(doc), []);
});

test('validarDocumento acusa caneta, ordem, traço curto e NaN', () => {
  const ok = deTracos([[[[0, 0], [1, 1]]]], papel('A6'));
  const caneta = structuredClone(ok);
  caneta.paginas[0].camadas[0].caneta = 'inexistente';
  assert.match(validarDocumento(caneta).join('\n'), /caneta inexistente/);

  const ordem = structuredClone(ok);
  ordem.paginas[0].camadas[0].ordem = 'aleatoria';
  assert.match(validarDocumento(ordem).join('\n'), /ordem inválida/);

  const curto = structuredClone(ok);
  curto.paginas[0].camadas[0].tracos = [[[0, 0]]];
  assert.match(validarDocumento(curto).join('\n'), /menos de 2 pontos/);

  const nan = structuredClone(ok);
  nan.paginas[0].camadas[0].tracos = [[[0, NaN], [1, 1]]];
  assert.match(validarDocumento(nan).join('\n'), /não finita/);
});
