import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicar, instantaneo } from '../src/ui/trabalho.js';

test('aplicar troca objetos por dentro (os painéis guardam a referência) e refaz a página do papel salvo', () => {
  const carta = { tipo: 'carta', faixa: 0.3 }, estado = { texto: 'a', carta, opcoes: { tamanho: 6 }, personagem: { nome: 'A' } };
  aplicar('escrita', estado, { texto: 'b', carta: { tipo: 'diario' }, personagem: { nome: 'B' }, papelCfg: { papel: 'A6', paisagem: false, largura: 105, altura: 148, margem: 9, margemTopo: 9, margemDir: 9, margemBase: 9, margemEsq: 9 } });
  assert.equal(estado.carta, carta);
  assert.deepEqual(carta, { tipo: 'diario' });
  assert.equal(estado.texto, 'b');
  assert.equal(estado.personagem.nome, 'B');
  assert.equal(estado.pagina.largura, 105);
  assert.equal(estado.paginaNome, 'A6');
});

test('instantaneo copia só o trabalho; com personagem, leva a mão junto', () => {
  const estado = { texto: 'x', opcoes: { tamanho: 5 }, fontes: { grande: true }, personagem: { nome: 'P' }, variacao: 'formal' };
  assert.deepEqual(instantaneo('escrita', estado), { texto: 'x', opcoes: { tamanho: 5 } });
  const m = instantaneo('escrita', estado, { comPersonagem: true });
  assert.equal(m.personagem.nome, 'P');
  assert.equal(m.variacao, 'formal');
  m.opcoes.tamanho = 9;
  assert.equal(estado.opcoes.tamanho, 5);
});
