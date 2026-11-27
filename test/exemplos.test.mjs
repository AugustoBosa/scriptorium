import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXEMPLOS, trocarExemplo, VISUAL, aplicarVisual } from '../src/materiais/exemplos.js';

test('trocarExemplo troca exemplo e vazio, mas nunca texto do usuário', () => {
  assert.equal(trocarExemplo(EXEMPLOS.carta, 'carta', 'diario'), EXEMPLOS.diario);
  assert.equal(trocarExemplo('', 'carta', 'livro'), EXEMPLOS.livro);
  assert.equal(trocarExemplo('meu texto', 'carta', 'diario'), 'meu texto');
  assert.equal(trocarExemplo(EXEMPLOS.carta, 'carta', 'sem-exemplo'), EXEMPLOS.carta);
});

test('aplicarVisual vale só na primeira vez de cada tipo', () => {
  const e = { opcoes: { escala: 1.3 }, livro: {} };
  aplicarVisual(e, 'livro');
  assert.equal(e.opcoes.escala, VISUAL.livro.opcoes.escala);
  assert.equal(e.livro.capitularLivro, 'lombarda');
  e.opcoes.escala = 1.1;
  aplicarVisual(e, 'livro');
  assert.equal(e.opcoes.escala, 1.1);
});
