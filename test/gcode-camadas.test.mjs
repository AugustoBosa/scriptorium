import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gcode, gcodeDocumento } from '../src/maquina/gcode.js';
import { PERFIS, janelaDe } from '../src/maquina/perfis.js';

const A6 = { largura: 105, altura: 148 };
const Q = { largura: 100, altura: 100 }; // cabe no porta-caneta na frente (210 × 152,5) e no lado (152,5 × 210)
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

test('troca automática (megaSTroca): pega a 1ª, troca entre camadas, devolve a última; megaS segue com M0', () => {
  const cn = { preta: { nome: 'Preta' }, vermelha: { nome: 'Vermelha' } };
  const r = gcodeDocumento(duas, Q, PERFIS.megaSTroca, { canetas: cn });
  assert.equal(r.trocas, 1);
  assert.doesNotMatch(r.texto, /M0 /);
  assert.deepEqual([...r.texto.matchAll(/^; (largar|pegar)[^\n]*/gm)].map((m) => m[0]),
    ['; pegar caneta da vaga 1', '; largar caneta na vaga 1', '; pegar caneta da vaga 2', '; largar caneta na vaga 2']);
  // X só muda com a base afastada: antes de cada G0 X de vaga, o Y anterior é base + afasta
  const L = r.texto.split('\n');
  assert.ok(L.includes('G0 X39.600 F6000'));
  L.forEach((l, i) => { if (/^G0 X(39\.6|83\.2)00 F6000$/.test(l)) assert.equal(L[i - 1], 'G0 Y73.000 F6000', l); });
  // v4: assenta 6 mm acima do Z de escrita e sobe 46,5 para tirar os munhões dos postes da doca
  const zE = PERFIS.megaSTroca.zEscrita;
  assert.ok(L.includes(`G1 Z${(zE + 6).toFixed(3)} F300`) && L.includes(`G0 Z${(zE + 52.5).toFixed(3)} F500`));
  assert.ok(r.texto.indexOf('; pegar caneta da vaga 1') < r.texto.indexOf('; camada texto'));
  assert.ok(r.texto.lastIndexOf('; largar caneta na vaga 2') < r.texto.indexOf(PERFIS.megaS.footer));
  assert.throws(() => gcodeDocumento(duas, Q, PERFIS.megaSTroca, { canetas: { preta: {} } }), /sem vaga/);
  assert.equal(gcodeDocumento(duas, A6, PERFIS.megaS, { canetas: cn }).trocas, 1);
});

test('porta-caneta na frente ou no lado: janela onde a ponta escreve, bico atrás da ponta, troca no eixo certo', () => {
  const { megaSTroca: F, megaSTrocaLado: L } = PERFIS;
  assert.deepEqual(janelaDe(F), { x0: 0, y0: 16, x1: 210, y1: 168.5 }); // 210 × 152,5: A5 deitado cabe
  assert.deepEqual(janelaDe(L), { x0: 41.5, y0: 0, x1: 194, y1: 210 }); // 152,5 × 210: A5 em pé cabe
  const ponto = pag(cam('t', 'preta', [[[0, Q.altura], [1, Q.altura]]])); // canto (x0, y0) da janela
  const cn = { preta: {} };
  assert.match(gcodeDocumento(ponto, Q, F, { canetas: cn }).texto, /^G0 X0\.000 Y57\.500 /m); // ponta em y 16, bico 41,5 atrás
  const lado = gcodeDocumento(ponto, Q, L, { canetas: cn });
  assert.match(lado.texto, /^G0 X0\.000 Y0\.000 /m); // ponta em x 41,5, bico 41,5 à esquerda
  assert.deepEqual(lado.avisos, []);
  // lado: vagas em Y; afasta em X (177 - 40) antes de andar em Y
  const T = lado.texto.split('\n');
  const i = T.indexOf('G0 Y39.600 F6000');
  assert.ok(i > 0);
  assert.equal(T[i - 1], 'G0 X137.000 F6000');
  assert.ok(T.includes('G1 X165.000 F300')); // recuo de 12 para a esquerda solta os ímãs
});

test('gerar-teste-troca: 3 arquivos, sem NaN, TROCA3 sem pausa e 2 trocas', async () => {
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(`${tmpdir()}/troca-`);
  execFileSync(process.execPath, ['scripts/gerar-teste-troca.mjs', dir, '{"base":38}']);
  const [a, b, c] = ['TROCA1.GCO', 'TROCA2.GCO', 'TROCA3.GCO'].map((n) => readFileSync(`${dir}/${n}`, 'utf8'));
  for (const t of [a, b, c]) { assert.doesNotMatch(t, /NaN|undefined/); assert.match(t, /Y38\.000/); }
  assert.ok((a.match(/^M0 /gm) ?? []).length >= 9);
  assert.ok((b.match(/^M0 Prox/gm) ?? []).length >= 10);
  assert.equal((c.match(/^M0 /gm) ?? []).length, 0);
  assert.equal((c.match(/^; (largar|pegar)/gm) ?? []).length, 6);
});
