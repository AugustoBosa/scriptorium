import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sugerirPreset, sugerirSistema, modular, sistemaDe } from '../src/ficha/simbolos.js';
import { dePreset } from '../src/arcano/presets.js';
import { comporChave, amostraVariada } from '../src/materiais/chave.js';
import { papel } from '../src/materiais/documento.js';

test('classe e antecedente escolhem o modelo', () => {
  assert.equal(sugerirPreset({ classe: 'bruxo' }), 'kamea');
  assert.equal(sugerirPreset({ classe: 'clerigo', antecedente: 'acolito' }), 'selo');
  assert.ok(['transmutacao', 'colar'].includes(sugerirPreset({ classe: 'mago', antecedente: 'sabio' })));
  assert.equal(sugerirPreset({}), 'classico');
  assert.notEqual(sugerirPreset({ classe: 'bruxo' }), sugerirPreset({ classe: 'mago' }));
});

test('atributos mudam o traço; clássico fica intacto', () => {
  const alto = modular(dePreset('colar'), { atributos: { int: 20, car: 20, des: 20 } });
  const baixo = modular(dePreset('colar'), { atributos: { int: 6, car: 6, des: 6 } });
  assert.ok(alto.traco.complexidade > baixo.traco.complexidade);
  assert.ok(alto.traco.ornamento > baixo.traco.ornamento);
  assert.ok(alto.traco.firmeza > baixo.traco.firmeza);
  assert.equal(alto.traco.firmeza, 1);
  const c = dePreset('classico');
  assert.equal(modular(c, { atributos: { int: 20 } }), c);
});

test('sistemaDe: salvo > sugerido pela ficha > clássico', () => {
  const salvo = dePreset('selo');
  assert.equal(sistemaDe({ simbolos: salvo, ficha: { classe: 'bruxo' } }), salvo);
  assert.equal(sistemaDe({ ficha: { classe: 'bruxo' } }).preset, 'kamea');
  assert.ok(sistemaDe({}).classico);
  assert.deepEqual(sugerirSistema({ classe: 'bruxo' }), sistemaDe({ ficha: { classe: 'bruxo' } }));
});

const M = (id, escola, nivel) => ({ id, nome: id, escola, nivel, alcance: '18 m', comp: 'V', duracao: 'Instantânea', mec: '' });
test('folha-chave: uma célula por magia, sigilo na caneta vermelha, avisa sem magias', () => {
  const ms = [M('a', 'V', 1), M('b', 'A', 0), M('c', 'N', 9)];
  const ctx = { fontes: {}, mao: null };
  const doc = comporChave(ms, dePreset('colar'), { ...ctx, mao: undefined }, { papel: papel('A5'), colunas: 3, tamanhoLegenda: 0 }).paginas;
  assert.equal(doc.length, 1);
  assert.equal(doc[0].camadas[0].caneta, 'vermelha');
  assert.ok(doc[0].camadas[0].tracos.length > 0);
  assert.deepEqual(amostraVariada([...ms, M('d', 'V', 5)], 10).map((m) => m.id).sort(), ['a', 'b', 'c', 'd']);
});
