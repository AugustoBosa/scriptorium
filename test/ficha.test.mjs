import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pesosArquetipo, sugerirLetras, propostas, letrasDerivadas, execucao, maoDaFicha } from '../src/ficha/sugerir.js';
import { validar, ESCRITA } from '../src/personagem.js';
import { NEUTRA, PARAMS } from '../src/motor/mao.js';
import { CATALOGO } from '../src/catalogo.js';
import { FONTES, SEM_ACENTOS } from '../src/fonte.js';
import { montarPerfis, variacoesDe } from '../src/ficha/perfis.js';

const MAGO = { v: 1, raca: 'elfo', classe: 'mago', antecedente: 'sabio', idade: 'adulto', destro: true, atributos: { int: 17 }, alinhamento: 'LB', idiomas: ['comum', 'elfico'], ferramentas: { caligrafo: false, falsificacao: false } };
const BARBARO = { v: 1, raca: 'meio-orc', classe: 'barbaro', antecedente: 'forasteiro', idade: 'adulto', destro: true, atributos: { int: 8 }, alinhamento: 'CN', idiomas: ['comum', 'orc'], ferramentas: { caligrafo: false, falsificacao: false } };
const PALADINO = { v: 1, raca: 'anao', classe: 'paladino', antecedente: 'nobre', idade: 'adulto', destro: true, atributos: {}, alinhamento: 'LB', idiomas: ['comum', 'anao'], ferramentas: { caligrafo: false, falsificacao: false } };
const FICHAS = [MAGO, BARBARO, PALADINO];

const itemDo = (nome) => CATALOGO.find((c) => c.fonte === nome);

// Todas as fontes que uma ficha pode devolver: propostas e letras derivadas.
function fontesDaFicha(f) {
  const props = propostas(f);
  const d = letrasDerivadas(f, props[0].base);
  return [
    ...props.flatMap((p) => p.base.map((i) => i.fonte)),
    ...d.caprichada.map((i) => i.fonte),
    ...d.corrida.map((i) => i.fonte),
    ...Object.values(d.escrita).flat().map((i) => i.fonte),
  ];
}

test('MAGO: top1 é cursiva de erudito, ligada ao elfo', () => {
  const top = sugerirLetras(MAGO)[0];
  assert.ok(top.item.aptidao.erudito >= 2, `erudito ${top.item.aptidao.erudito} em ${top.fonte}`);
  assert.ok(['cursiva', 'semi'].includes(top.item.ligacao), top.item.ligacao);
});

test('BARBARO: top1 é popular, e a execução fica mais desleixada que a neutra', () => {
  const top = sugerirLetras(BARBARO)[0];
  assert.ok(top.item.aptidao.popular >= 2, `popular ${top.item.aptidao.popular} em ${top.fonte}`);
  assert.ok(execucao(BARBARO).desleixo > NEUTRA.desleixo);
});

test('PALADINO: escrita anã cai em gótica, forma ou impressa', () => {
  const { fonte } = letrasDerivadas(PALADINO, propostas(PALADINO)[0].base).escrita.anao[0];
  assert.ok(['gotica', 'forma', 'impressa'].includes(itemDo(fonte).ligacao), `${fonte}: ${itemDo(fonte).ligacao}`);
});

test('invariantes: fontes válidas, pesos somam 1, arquétipos somam 1', () => {
  for (const f of FICHAS) {
    const soma = Object.values(pesosArquetipo(f)).reduce((s, v) => s + v, 0);
    assert.ok(Math.abs(soma - 1) < 1e-9, `pesosArquetipo ${f.classe}: ${soma}`);

    for (const p of propostas(f)) {
      const pesoTotal = p.base.reduce((s, i) => s + i.peso, 0);
      assert.ok(Math.abs(pesoTotal - 1) < 1e-9, `${f.classe}/${p.id}: pesos ${pesoTotal}`);
    }

    for (const nome of fontesDaFicha(f)) {
      const item = itemDo(nome);
      assert.ok(item, `${f.classe}: ${nome} fora do catálogo`);
      assert.notEqual(item.ligacao, 'titulo', `${f.classe}: ${nome} é título`);
      assert.ok(!SEM_ACENTOS.includes(nome), `${f.classe}: ${nome} sem acentos`);
      assert.ok(FONTES.includes(nome), `${f.classe}: ${nome} fora de FONTES`);
    }
  }
});

test('validar aceita a mão da ficha para as 3 fichas', () => {
  for (const f of FICHAS) {
    const mao = maoDaFicha(f, propostas(f)[0].base);
    assert.deepEqual(validar({ nome: 'X', mao, variacoes: { normal: {} } }), []);
  }
});

test('execução: destro false dá inclinação -5; valores dentro de PARAMS', () => {
  assert.equal(execucao({ ...MAGO, destro: false }).inclinacao, -5);
  for (const f of FICHAS) {
    const e = execucao(f);
    for (const k of Object.keys(e)) {
      const p = PARAMS.find((x) => x.chave === k);
      if (p) assert.ok(e[k] >= p.min && e[k] <= p.max, `${f.classe}/${k}: ${e[k]}`);
    }
  }
});

const letrasDe = (f) => letrasDerivadas(f, propostas(f)[0].base);

test('perfis: MAGO tem grimório e escrita élfica entre os sugeridos', () => {
  const { sugeridos } = montarPerfis(MAGO, letrasDe(MAGO));
  const nomes = sugeridos.map((p) => p.nome);
  assert.ok(nomes.includes('Grimório'), nomes.join(', '));
  assert.ok(nomes.includes('Escrita Élfica'), nomes.join(', '));
});

test('perfis: BARBARO não sugere grimório', () => {
  const { sugeridos, outros } = montarPerfis(BARBARO, letrasDe(BARBARO));
  assert.ok(!sugeridos.some((p) => p.nome === 'Grimório'));
  assert.ok(outros.some((p) => p.nome === 'Grimório'));
});

test('perfis: nomes únicos e execução dentro de PARAMS, para as 3 fichas', () => {
  for (const f of FICHAS) {
    const letras = letrasDe(f);
    const mao = maoDaFicha(f, letras.principal);
    const { sugeridos, outros } = montarPerfis(f, letras);
    const todos = [...sugeridos, ...outros];
    const nomes = todos.map((p) => p.nome);
    assert.equal(new Set(nomes).size, nomes.length, `${f.classe}: nomes repetidos`);
    for (const p of todos) {
      for (const k of Object.keys(p.exec)) {
        if (ESCRITA.includes(k)) continue; // tamanho/entrelinha do perfil: faixa conferida por validar
        const par = PARAMS.find((x) => x.chave === k);
        assert.ok(par, `${f.classe}/${p.nome}: chave ${k} fora de PARAMS`);
        assert.ok(p.exec[k] >= par.min && p.exec[k] <= par.max, `${f.classe}/${p.nome}/${k}: ${p.exec[k]}`);
      }
    }
    assert.deepEqual(validar({ nome: 'X', mao, variacoes: variacoesDe(mao, todos) }), [], f.classe);
  }
});

test('variacoesDe: perfil não ligado fica de fora; base igual à da mão não é gravada', () => {
  const letras = letrasDe(MAGO);
  const mao = maoDaFicha(MAGO, letras.principal);
  const { sugeridos, outros } = montarPerfis(MAGO, letras);
  const v = variacoesDe(mao, [...sugeridos, ...outros]);
  assert.deepEqual(v.normal, {});
  assert.ok(!(outros[0].nome in v), `${outros[0].nome} não ligado entrou`);
  assert.ok('Diário' in v, 'Diário ligado ficou de fora');
  assert.ok(!('base' in v['Diário']), 'base igual à da mão foi gravada');
});
