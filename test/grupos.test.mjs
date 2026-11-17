import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFonte } from '../src/fonte.js';
import { compor, PAGINAS } from '../src/layout.js';
import { NEUTRA } from '../src/motor/mao.js';
import { otimizar, viagem } from '../src/maquina/otimizar.js';
import { gcodeDocumento } from '../src/maquina/gcode.js';
import { PERFIS } from '../src/maquina/perfis.js';
import { validarDocumento, escreverEm, CANETAS } from '../src/materiais/documento.js';
import { caixaDe } from '../src/geo.js';

const raiz = new URL('../', import.meta.url);
const fontes = { EMSBird: parseFonte(fs.readFileSync(new URL('fontes/EMSBird.svg', raiz), 'utf8'), 'EMSBird') };
const mao = { ...NEUTRA, base: [{ fonte: 'EMSBird', peso: 1 }] };
const A5 = PAGINAS.A5;
const texto = Array(150).fill('palavra outra').join(' ') + ' ' + 'x'.repeat(80);

test('grupos: um por âncora, crescentes, com palavra quebrada e 2 colunas', () => {
  for (const op of [{}, { colunas: 2 }]) {
    const r = compor(texto, fontes, mao, A5, op);
    assert.ok(r.avisos.some((a) => a.startsWith('palavra longa')));
    assert.ok(r.paginas.length >= 2);
    r.paginas.forEach((pg, p) => {
      const anc = r.ancoras.filter((a) => a.pagina === p);
      assert.equal(r.grupos[p].length, anc.length);
      r.grupos[p].forEach((g, k) => assert.ok(g >= 0 && g < pg.length && (k === 0 || g >= r.grupos[p][k - 1])));
    });
  }
});

const T = (x, y, n = 2) => Array.from({ length: n }, (_, i) => [x + i, y]);
test('otimizar escrita+grupos: blocos inteiros, sem inverter, permutação; viagem <= crua', () => {
  // 3 linhas de 2 palavras (2 traços cada), embaralhadas
  const palavras = [];
  for (const y of [10, 20, 30]) for (const x of [10, 60]) palavras.push([T(x, y), T(x + 5, y + 1)]);
  const emb = [palavras[3], palavras[0], palavras[5], palavras[1], palavras[4], palavras[2]];
  const tracos = emb.flat();
  const grupos = emb.map((_, i) => 2 * i);
  const o = otimizar(tracos, 0.1, { ordem: 'escrita', grupos });
  assert.equal(o.length, tracos.length);
  const blocos = [];
  for (let i = 0; i < o.length; i += 2) blocos.push(JSON.stringify([o[i], o[i + 1]]));
  assert.deepEqual([...blocos].sort(), emb.map((b) => JSON.stringify(b)).sort());
  assert.ok(viagem(o) <= viagem(otimizar(tracos, 0.1, { ordem: 'escrita' })));
  assert.deepEqual(otimizar(tracos, 0.1, { ordem: 'escrita' }), tracos);
  // traços antes de g_0 formam um bloco
  assert.equal(otimizar(tracos, 0.1, { ordem: 'escrita', grupos: [1, 3] }).length, tracos.length);
});

test('validarDocumento recusa grupos inválidos', () => {
  const doc = (grupos) => ({ papel: { largura: 10, altura: 10 }, canetas: CANETAS,
    paginas: [{ camadas: [{ id: 't', caneta: 'preta', personagem: null, ordem: 'escrita', grupos, tracos: [T(1, 1), T(2, 2), T(3, 3)] }] }], avisos: [] });
  assert.deepEqual(validarDocumento(doc([0, 1, 1, 3])), []);
  assert.equal(validarDocumento(doc([0, 2, 1])).length, 1);
  assert.equal(validarDocumento(doc([0, 4])).length, 1);
  assert.equal(validarDocumento(doc([-1])).length, 1);
});

test('gcodeDocumento: id com quebra de linha não gera linha G28', () => {
  const pag = { camadas: [{ id: 'a\nG28', caneta: 'preta', personagem: null, ordem: 'escrita', tracos: [T(10, 10)] }] };
  const { texto } = gcodeDocumento(pag, { largura: 105, altura: 148 }, PERFIS.megaS, { canetas: CANETAS });
  assert.ok(!texto.split('\n').includes('G28'));
  assert.match(texto, /; camada a G28 caneta/);
});

test('escreverEm: centro e direita', () => {
  const caixa = { x: 20, y: 30, l: 50, a: 10 };
  const c = caixaDe(escreverEm('palavra', caixa, { alinhamento: 'centro', tamanho: 5 }, fontes, mao));
  assert.ok(Math.abs(c.x + c.l / 2 - 45) < 0.01);
  const d = caixaDe(escreverEm('palavra', caixa, { alinhamento: 'direita', tamanho: 5 }, fontes, mao));
  assert.ok(Math.abs(d.x + d.l - 70) < 0.01);
  const e = caixaDe(escreverEm('palavra', caixa, { tamanho: 5 }, fontes, mao));
  assert.ok(Math.abs(e.x - 20) < 0.01 && e.y >= 30);
});
