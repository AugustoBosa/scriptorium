import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gcode, gcodeDocumento } from '../src/maquina/gcode.js';
import { PERFIS } from '../src/maquina/perfis.js';

const A6 = { largura: 105, altura: 148 };
const cam = (id, caneta, tracos) => ({ id, caneta, personagem: null, ordem: 'otimizada', tracos });
const T = [[[10, 20], [30, 20]]];
const pag = (...camadas) => ({ camadas });
const duas = pag(cam('texto', 'preta', T), cam('notas', 'vermelha', T));
const canetas = { vermelha: { nome: 'Vermelha' } };

test('P2S: sem M412/M104/M109/E; X/Y na janela; Z >= 16', () => {
  const { texto } = gcodeDocumento(duas, A6, PERFIS.p2s, { canetas });
  assert.doesNotMatch(texto, /M412|M104|M109/);
  assert.doesNotMatch(texto, /(^|\s)E[-\d.]/m);
  const linhas = texto.split('\n').filter((l) => !l.startsWith(';'));
  for (const l of linhas) {
    for (const [, v] of l.matchAll(/\bX(-?[\d.]+)/g)) assert.ok(v >= 48 && v <= 255, l);
    for (const [, v] of l.matchAll(/\bY(-?[\d.]+)/g)) assert.ok(v >= 55 && v <= 255, l);
    for (const [, v] of l.matchAll(/\bZ(-?[\d.]+)/g)) assert.ok(v >= 16, l);
  }
});

test('troca de caneta', () => {
  const r = gcodeDocumento(duas, A6, PERFIS.megaS, { canetas });
  assert.equal(r.trocas, 1);
  assert.equal(r.texto.match(/^M0 Trocar caneta: Vermelha$/gm).length, 1);
  const t = r.texto;
  assert.ok(t.indexOf('G0 Z15') < t.indexOf('G0 X0.000 Y200.000 F6000\nM0 Trocar'));
  const mesma = gcodeDocumento(pag(cam('a', 'x', T), cam('b', 'x', T)), A6);
  assert.equal(mesma.trocas, 0);
  assert.doesNotMatch(mesma.texto, /Trocar/);
  const n = (s) => (s.match(/M400 U1/g) ?? []).length;
  assert.equal(n(gcodeDocumento(duas, A6, PERFIS.p2s).texto), n(gcodeDocumento(pag(cam('a', 'x', T)), A6, PERFIS.p2s).texto) + 1);
});

test('camadas seleciona sem pausa', () => {
  const r = gcodeDocumento(duas, A6, PERFIS.megaS, { camadas: ['notas'] });
  assert.equal(r.trocas, 0);
  assert.equal(r.nTracos, 1);
  assert.match(r.texto, /; camada notas/);
  assert.doesNotMatch(r.texto, /camada texto/);
});

test('erros: zMin e papel grande', () => {
  assert.throws(() => gcodeDocumento(duas, A6, { ...PERFIS.p2s, zEscrita: 15 }), /zMin/);
  assert.throws(() => gcodeDocumento(duas, A6, { ...PERFIS.p2s, zLevantada: 15 }), /zMin/);
  assert.throws(() => gcodeDocumento(duas, { largura: 210, altura: 297 }, PERFIS.megaS), /não cabe/);
});

test('traço fora da janela avisa', () => {
  const r = gcodeDocumento(pag(cam('t', 'x', [[[10, 20], [300, 20]]])), A6, PERFIS.p2s);
  assert.deepEqual(r.avisos, ['camada t: traço 1 fora da janela']);
});

test('megaS: corpo igual a gcode()', () => {
  const tr = [[[10, 20], [30, 20]], [[5, 5], [6, 7], [8, 9]]];
  const a = gcodeDocumento(pag(cam('t', 'x', tr)), { largura: 105, altura: 148 }, PERFIS.megaS);
  const b = gcode(tr, { largura: 105, altura: 148 });
  assert.equal(a.texto.replace(/; camada .*\n/, ''), b.texto);
  assert.equal(a.comprimento, b.comprimento);
});

test('nome de caneta com quebra de linha não gera linha nova', () => {
  const r = gcodeDocumento(duas, A6, PERFIS.megaS, { canetas: { vermelha: { nome: 'Verm\nG0 Z-99' } } });
  assert.doesNotMatch(r.texto, /^G0 Z-99/m);
});

test('sobe para zLevantada antes da 1ª viagem e recusa zLevantada <= zEscrita', () => {
  const alto = { ...PERFIS.megaS, zEscrita: 8, zLevantada: 12 };
  const r = gcodeDocumento(duas, A6, alto);
  const linhas = r.texto.slice(alto.header.length).split('\n');
  assert.equal(linhas[0], 'G0 Z12 F500');
  assert.throws(() => gcodeDocumento(duas, A6, { ...PERFIS.megaS, zLevantada: 3 }), /arrastaria/);
});

test('traço com NaN não vira XNaN', () => {
  const r = gcodeDocumento(pag(cam('t', 'preta', [[[1, 1], [NaN, 2]], [[1, 1], [2, 2]]])), A6, PERFIS.megaS);
  assert.doesNotMatch(r.texto, /NaN/);
  assert.equal(r.nTracos, 1);
});
