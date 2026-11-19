import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXEMPLOS, trocarExemplo } from '../src/materiais/exemplos.js';

test('trocarExemplo troca exemplo e vazio, mas nunca texto do usuário', () => {
  assert.equal(trocarExemplo(EXEMPLOS.carta, 'carta', 'diario'), EXEMPLOS.diario);
  assert.equal(trocarExemplo('', 'carta', 'livro'), EXEMPLOS.livro);
  assert.equal(trocarExemplo('meu texto', 'carta', 'diario'), 'meu texto');
  assert.equal(trocarExemplo(EXEMPLOS.carta, 'carta', 'sem-exemplo'), EXEMPLOS.carta);
});
