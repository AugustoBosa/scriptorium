import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pesosArquetipo, sugerirLetras, propostas, letrasDerivadas, execucao, maoDaFicha } from '../src/ficha/sugerir.js';
import { validar } from '../src/personagem.js';
import { NEUTRA, PARAMS } from '../src/motor/mao.js';
import { CATALOGO } from '../src/catalogo.js';
import { FONTES, SEM_ACENTOS } from '../src/fonte.js';

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
