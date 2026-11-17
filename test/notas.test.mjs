import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFonte } from '../src/fonte.js';
import { compor, PAGINAS } from '../src/layout.js';
import { NEUTRA } from '../src/motor/mao.js';
import { problemas } from '../src/geo.js';
import { parsearNotas, rabisco, sobrepoe, caixasPalavras, conectar } from '../src/materiais/notas.js';

const raiz = new URL('../', import.meta.url);
const fontes = { EMSBird: parseFonte(fs.readFileSync(new URL('fontes/EMSBird.svg', raiz), 'utf8'), 'EMSBird') };
const mao = { ...NEUTRA, base: [{ fonte: 'EMSBird', peso: 1 }] };
const palavras = (limpo) => limpo.split('\n').flatMap((l) => l.split(' ').filter(Boolean));

test('parsearNotas: os 4 tipos', () => {
  const { limpo, marcas, avisos } = parsearNotas('a lua {nota: cheia de luz} sobe {~sobre~>sobe} o {_mar azul_} e {o:noite} fim');
  assert.equal(limpo, 'a lua sobe sobre o mar azul e noite fim');
  assert.deepEqual(avisos, []);
  assert.deepEqual(marcas, [
    { tipo: 'nota', ini: 1, fim: 1, texto: 'cheia de luz' },
    { tipo: 'correcao', ini: 3, fim: 3, texto: 'sobe' },
    { tipo: 'sublinhar', ini: 5, fim: 6 },
    { tipo: 'circular', ini: 8, fim: 8 },
  ]);
});

test('parsearNotas: índices batem com ancora.indice do compor (palavra parcial, \n, espaços duplos)', () => {
  const texto = 'ca{_sa_}rão  azul\n\n{o:de manhã} vai{nota: x} {~erro~>certo}  fim\n{nota: início} final';
  const { limpo, marcas } = parsearNotas(texto);
  const r = compor(limpo, fontes, mao, PAGINAS.A5, { tamanho: 5 });
  const lista = palavras(limpo);
  assert.equal(r.ancoras.length, lista.length);
  const palavra = (i) => r.ancoras.find((a) => a.indice === i).texto;
  const por = (tipo) => marcas.filter((m) => m.tipo === tipo);
  assert.deepEqual(por('sublinhar').map((m) => [m.ini, m.fim]), [[0, 0]]); // palavra parcial conta inteira
  assert.equal(palavra(0), 'casarão');
  assert.deepEqual(por('circular').map((m) => [palavra(m.ini), palavra(m.fim)]), [['de', 'manhã']]);
  assert.equal(palavra(por('nota')[0].ini), 'vai');
  assert.equal(palavra(por('correcao')[0].ini), 'erro');
  assert.equal(palavra(por('nota')[1].ini), 'fim'); // nota depois de \n fica na palavra anterior
  assert.ok(!limpo.includes('{') && !limpo.includes('}'));
});

test('parsearNotas: marca no início e no fim; duas notas seguidas; nota sem palavra antes', () => {
  assert.deepEqual(parsearNotas('{nota: a}{nota: b} oi').marcas.map((m) => [m.texto, m.ini]), [['a', 0], ['b', 0]]);
  const f = parsearNotas('oi tu{nota: fim}');
  assert.equal(f.limpo, 'oi tu');
  assert.equal(f.marcas[0].ini, 1);
  const ini = parsearNotas('{_oi_} tu');
  assert.deepEqual(ini.marcas, [{ tipo: 'sublinhar', ini: 0, fim: 0 }]);
  assert.equal(parsearNotas('um {nota: x} dois').limpo, 'um dois'); // espaço duplo vira simples
});

test('parsearNotas: chave sem fechar e tipo desconhecido ficam literais, com aviso', () => {
  const a = parsearNotas('oi {nota: sem fim');
  assert.equal(a.limpo, 'oi {nota: sem fim');
  assert.equal(a.marcas.length, 0);
  assert.equal(a.avisos.length, 1);
  const b = parsearNotas('oi {zzz: x} tu');
  assert.equal(b.limpo, 'oi {zzz: x} tu');
  assert.equal(b.avisos.length, 1);
});

const CAIXAS = [{ x: 13, y: 7, l: 40, a: 25 }, { x: 2, y: 3, l: 60, a: 8 }, { x: 0, y: 0, l: 6, a: 6 }];
for (const tipo of ['espiral', 'estrela', 'caixa', 'flor']) for (const [k, caixa] of CAIXAS.entries()) {
  test(`rabisco ${tipo} caixa ${k}: dentro, determinístico`, () => {
    const t = rabisco(tipo, caixa, 4);
    assert.ok(t.length >= 1);
    assert.deepEqual(problemas(t, caixa), []);
    assert.deepEqual(rabisco(tipo, caixa, 4), t);
  });
}
test('rabisco espiral: a seed muda o desenho', () => {
  assert.notDeepEqual(rabisco('espiral', CAIXAS[0], 1), rabisco('espiral', CAIXAS[0], 2));
});

test('sobrepoe: dentro, fora, borda, folga, null, traço único', () => {
  const c = { x: 10, y: 10, l: 10, a: 10 };
  assert.equal(sobrepoe([[[0, 15], [30, 15]]], [c]), true); // atravessa
  assert.equal(sobrepoe([[[12, 12], [13, 13]]], [c]), true); // dentro
  assert.equal(sobrepoe([[[0, 5], [30, 5]]], [c]), false); // acima
  assert.equal(sobrepoe([[[0, 10], [30, 10]]], [c]), false); // encostar na borda não conta
  assert.equal(sobrepoe([[[0, 9.6], [30, 9.6]]], [c], 0.5), true); // folga infla a caixa
  assert.equal(sobrepoe([[[0, 9.4], [30, 9.4]]], [c], 0.5), false);
  assert.equal(sobrepoe([[[0, 15], [30, 15]]], [null, undefined]), false);
  assert.equal(sobrepoe([[[0, 15], [30, 15]]], []), false);
  assert.equal(sobrepoe([[12, 12], [13, 13]], [c]), true); // aceita 1 traço
  assert.equal(sobrepoe([[[12, 12], [12, 12]]], [{ x: 11, y: 11, l: 0, a: 0 }], 0), false); // caixa degenerada
});

test('caixasPalavras: uma caixa por grupo, null para palavra sem traço', () => {
  const tr = [[[0, 0], [1, 1]], [[2, 0], [3, 1]], [[5, 5], [6, 6]]];
  const cs = caixasPalavras(tr, [0, 2, 2]);
  assert.deepEqual(cs, [{ x: 0, y: 0, l: 3, a: 1 }, null, { x: 5, y: 5, l: 1, a: 1 }]);
});

test('conectar: linha, seta e chave terminam na nota', () => {
  const calha = { x: 100, l: 5 };
  for (const dir of [true, false]) for (const yNota of [20, 40]) {
    const g = { dir, xTexto: dir ? 98 : 107, base: 20, tam: 6, calha, xNota: dir ? 106 : 99, yNota, tn: 3.6 };
    const linha = conectar('linha', g), seta = conectar('seta', g), chave = conectar('chave', g);
    assert.equal(linha.length, 1);
    assert.equal(seta.length, 3);
    assert.equal(linha[0].at(-1)[0], g.xNota);
    assert.equal(chave.length, yNota === 40 ? 2 : 1);
    for (const t of [...linha, ...seta, ...chave]) assert.ok(t.length >= 2 && t.flat().every(Number.isFinite));
  }
});
