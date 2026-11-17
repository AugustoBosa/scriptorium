import { test } from 'node:test';
import assert from 'node:assert/strict';
import { no, grade, lacos, P, PARAMS } from '../src/ornamento/no.js';
import { problemas, inset, reamostrar, dist } from '../src/geo.js';

const r3 = (v) => Array.isArray(v) ? v.map(r3) : typeof v === 'number' ? Math.round(v * 1000) / 1000 + 0 : v;
const linhas = (t) => r3(t).map((x) => JSON.stringify(x)).join('\n');
const CAIXAS = [{ x: 13, y: 7, l: 40, a: 25 }, { x: 2, y: 3, l: 60, a: 8 }, { x: 0, y: 0, l: 30, a: 30 }];

for (const simetria of ['nenhuma', 'espelho', 'quadrupla']) {
  for (const [k, caixa] of CAIXAS.entries()) {
    test(`no ${simetria} caixa ${k}: dentro, sem NaN, determinístico`, () => {
      const params = { simetria, quebras: 0.3 };
      const t = no(caixa, params, 5);
      assert.ok(t.length >= 1);
      assert.deepEqual(problemas(t, caixa), []);
      assert.deepEqual(no(caixa, params, 5), t);
    });
  }
}

test('no: caixas variadas, aro e fita sem problemas', () => {
  for (const caixa of CAIXAS) for (const params of [{ aro: 1, celulas: 6 }, { aro: 2, celulas: 8 }, { fita: 0 }, { fita: 0.2, vao: 0.15 }, { celulas: 1 }, { celulas: 12 }]) {
    assert.deepEqual(problemas(no(caixa, params, 3), caixa), [], JSON.stringify(params));
  }
});

test('no: seed diferente muda com quebras 0.3', () => {
  const caixa = CAIXAS[0], params = { quebras: 0.3 };
  assert.notDeepEqual(no(caixa, params, 1), no(caixa, params, 2));
});

test('no: caixa degenerada dá []', () => {
  assert.deepEqual(no({ x: 0, y: 0, l: 0, a: 10 }), []);
  assert.deepEqual(no({ x: 0, y: 0, l: 10, a: 0 }), []);
});

test('grade: células no lado curto', () => {
  assert.deepEqual(grade({ x: 0, y: 0, l: 40, a: 20 }, 4), { C: 8, L: 4, tx: 5, ty: 5 });
  assert.deepEqual(grade({ x: 0, y: 0, l: 60, a: 8 }, 2), { C: 15, L: 2, tx: 4, ty: 4 });
});

test('no: quebras 0, 3x3, cada cruzamento tem um fio por cima e um por baixo', () => {
  const { lacos: ls } = lacos({ x: 0, y: 0, l: 30, a: 30 }, { celulas: 3, quebras: 0, simetria: 'nenhuma' }, 1);
  const n = (tipo) => ls.flat().filter((v) => v.tipo === tipo).length;
  assert.equal(n('volta'), 12);
  assert.equal(n('cima'), 12);
  assert.equal(n('baixo'), 12);
  // por cruzamento: cada ponto interno aparece exatamente uma vez como cima e uma como baixo
  const cont = {};
  for (const v of ls.flat()) if (v.tipo !== 'volta') (cont[`${v.x}|${v.y}`] ??= []).push(v.tipo);
  for (const [k, tipos] of Object.entries(cont)) assert.deepEqual([...tipos].sort(), ['baixo', 'cima'], k);
});

test('no: fita 0 e fita 0.12 diferem', () => {
  const caixa = CAIXAS[2];
  assert.notDeepEqual(no(caixa, { fita: 0 }, 1), no(caixa, { fita: 0.12 }, 1));
});

test('no: aro 1 em 6x6 não tem ponto no miolo', () => {
  const caixa = { x: 0, y: 0, l: 30, a: 30 };
  const { tx } = grade(caixa, 6);
  const miolo = inset(caixa, tx + 1e-6);
  const t = no(caixa, { celulas: 6, aro: 1, fita: 0 }, 1);
  assert.ok(t.length >= 1);
  for (const [x, y] of t.flat()) assert.ok(x < miolo.x || x > miolo.x + miolo.l || y < miolo.y || y > miolo.y + miolo.a, `${x},${y}`);
});

test('no: simetria quádrupla — a trama (vértices dos laços) é igual ao espelho horizontal', () => {
  const caixa = { x: 0, y: 0, l: 40, a: 40 };
  const { lacos: ls, C } = lacos(caixa, { celulas: 4, quebras: 0.4, simetria: 'quadrupla' }, 3);
  const pts = new Set(ls.flat().map((v) => `${v.x}|${v.y}`));
  for (const k of pts) { const [x, y] = k.split('|').map(Number); assert.ok(pts.has(`${2 * C - x}|${y}`), k); }
});

test('PARAMS: padrões coincidem com P', () => {
  for (const x of PARAMS) assert.equal(x.padrao, P[x.chave], x.chave);
});

test('no: golden 2x2 células', (t) => {
  t.assert.snapshot(linhas(no({ x: 0, y: 0, l: 20, a: 20 }, { celulas: 2, quebras: 0.3 }, 1)));
});

test('no: faixa 60×8, 4 células — fios de traços diferentes a ≥ 0,4 mm (fita vira fio único, vão ≥ 0,4)', () => {
  const t = no({ x: 0, y: 0, l: 60, a: 8 }, { celulas: 4 }, 1).map((tr) => reamostrar(tr, 0.1));
  let min = Infinity;
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) for (const p of t[i]) for (const q of t[j]) min = Math.min(min, dist(p, q));
  assert.ok(min >= 0.4 - 0.05, `distância mínima ${min}`);
});

test('no: fita < 0,8 mm vira fio único; fita larga continua em duas linhas', () => {
  const caixa = { x: 0, y: 0, l: 20, a: 20 };
  assert.deepEqual(no(caixa, { celulas: 4, fita: 0.12 }, 1), no(caixa, { celulas: 4, fita: 0 }, 1)); // fita 0,6 mm
  assert.notDeepEqual(no(caixa, { celulas: 2, fita: 0.2 }, 1), no(caixa, { celulas: 2, fita: 0 }, 1)); // fita 2 mm
});
