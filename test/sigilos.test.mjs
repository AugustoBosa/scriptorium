import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { comporSigilos, PARAMS } from '../src/materiais/sigilos.js';
import { papel, validarDocumento } from '../src/materiais/documento.js';
import { parseFonte } from '../src/fonte.js';
import { NEUTRA } from '../src/motor/mao.js';
import { caixaDe, problemas } from '../src/geo.js';

const r3 = (v) => Array.isArray(v) ? v.map(r3) : typeof v === 'number' ? Math.round(v * 1000) / 1000 + 0 : v;
const VAO = 0.5;
const bird = parseFonte(readFileSync(new URL('../fontes/EMSBird.svg', import.meta.url), 'utf8'), 'EMSBird');
const ctx = { fontes: { EMSBird: bird }, mao: { ...NEUTRA, seed: 1, base: [{ fonte: 'EMSBird', peso: 1 }] } };
const A6 = papel('A6');
const FRASES = ['abracadabra', 'eu sou', 'z', 'luz da lua', 'sol', 'mar e céu', 'paz'];
const TIPOS = ['selo', 'sigilo', 'circulo'];

// Geometria da grade (mesma regra do módulo): célula k em colunas = 3, A6 com margem padrão.
function celulas(colunas, legendas, tl = 3, n = 12) {
  const m = A6.margens, util = { x: m.esq, y: m.topo, l: A6.largura - m.esq - m.dir, a: A6.altura - m.topo - m.base };
  const cw = (util.l - (colunas - 1) * 4) / colunas, ch = cw + (legendas ? 2.2 * tl : 0);
  return Array.from({ length: n }, (_, k) => {
    const x = util.x + (k % colunas) * (cw + 4), y = util.y + Math.floor(k / colunas) * (ch + 4);
    return { quad: { x: x + VAO, y: y + VAO, l: cw - 2 * VAO, a: cw - 2 * VAO }, cel: { x, y, l: cw, a: ch }, cw };
  });
}

const resumo = (doc) => doc.paginas.map((p, i) => p.camadas.map((c) => ({
  pag: i + 1, id: c.id, caneta: c.caneta, n: c.tracos.length, caixa: r3(caixaDe(c.tracos)), primeiros: r3(c.tracos.slice(0, 2)),
})));

for (const tipo of TIPOS) {
  test(`${tipo}: 7 frases A6 3 colunas valido, camadas fixas, sigilos dentro das células`, () => {
    const doc = comporSigilos(FRASES.join('\n'), ctx, { papel: A6, tipo, colunas: 3 });
    assert.deepEqual(validarDocumento(doc), []);
    assert.deepEqual(doc.paginas[0].camadas.map((c) => c.id), ['sigilos', 'legendas']);
    const cs = celulas(3, true, 3, FRASES.length);
    const sig = doc.paginas[0].camadas[0].tracos;
    assert.ok(sig.length > 0);
    for (const t of sig) {
      const dentro = cs.some(({ quad }) => problemas([t], quad).length === 0);
      assert.ok(dentro, `traço de sigilo fora de qualquer célula`);
    }
  });
}

test('legenda abaixo do quadrado e sem sobrepor o sigilo da mesma célula', () => {
  const doc = comporSigilos('abracadabra\neu sou', ctx, { papel: A6, tipo: 'selo', colunas: 3 });
  const cs = celulas(3, true);
  cs.slice(0, 2).forEach(({ quad }, k) => {
    const leg = caixaDe(doc.paginas[0].camadas[1].tracos.filter((t) => t.every(([x]) => x >= quad.x - 0.1 && x <= quad.x + quad.l + 3)));
    assert.ok(leg.l > 0, `legenda ${k} vazia`);
    assert.ok(leg.y > quad.y + quad.a - VAO, `legenda ${k} sobe para dentro do quadrado`);
  });
});

test('10 frases A6 3 colunas: 2 páginas (9 células por página)', () => {
  const dez = Array.from({ length: 10 }, (_, i) => `frase ${i}`).join('\n');
  const doc = comporSigilos(dez, ctx, { papel: A6, tipo: 'selo', colunas: 3 });
  assert.equal(doc.paginas.length, 2);
  assert.deepEqual(validarDocumento(doc), []);
});

test('zero frases: uma página vazia e aviso', () => {
  const doc = comporSigilos('\n  \n', ctx, { papel: A6 });
  assert.equal(doc.paginas.length, 1);
  assert.ok(doc.avisos.includes('Nenhuma frase'));
  assert.deepEqual(validarDocumento(doc), []);
});

test('determinístico', () => {
  const a = comporSigilos(FRASES.join('\n'), ctx, { papel: A6, tipo: 'circulo', colunas: 2 });
  const b = comporSigilos(FRASES.join('\n'), ctx, { papel: A6, tipo: 'circulo', colunas: 2 });
  assert.deepEqual(a, b);
});

test('golden: 4 frases tipo selo, A6, 2 colunas', (t) => {
  const doc = comporSigilos(FRASES.slice(0, 4).join('\n'), ctx, { papel: A6, tipo: 'selo', colunas: 2 });
  t.assert.snapshot({ paginas: resumo(doc), avisos: doc.avisos });
});

test('PARAMS: prévias com traços', () => {
  for (const p of PARAMS) {
    const valores = p.tipo === 'marca' ? [false, true] : p.tipo === 'opcao' ? p.opcoes.map((o) => o.valor) : [p.min, p.max];
    for (const v of valores) assert.ok([p.previa(v, ctx)].flatMap((t) => (Array.isArray(t) ? t : [...t.fundo, ...t.foco])).length > 0, `${p.chave}=${v}`);
  }
});
