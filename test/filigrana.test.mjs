import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filigrana, preencheLinha, peDeMosca, manicula, florao, separador } from '../src/ornamento/filigrana.js';
import { problemas } from '../src/geo.js';

// Arredonda todo número a 3 casas, recursivamente. "+ 0" troca -0 por 0.
const r3 = (v) => Array.isArray(v) ? v.map(r3)
  : typeof v === 'number' ? Math.round(v * 1000) / 1000 + 0
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, r3(v[k])]))
  : v;
// Uma linha por traço: legível no .snapshot e estável.
const linhas = (pags) => pags.map((p, i) => `pagina ${i}\n` + r3(p).map((t) => JSON.stringify(t)).join('\n')).join('\n');

const CAIXAS = [{ x: 13, y: 7, l: 40, a: 25 }, { x: 0, y: 0, l: 40, a: 4 }, { x: 0, y: 0, l: 20, a: 20 }];
const CASOS = [
  ['preenche onda', { tipo: 'preenche', padrao: 'onda' }],
  ['preenche ziguezague', { tipo: 'preenche', padrao: 'ziguezague' }],
  ['preenche lacos', { tipo: 'preenche', padrao: 'lacos' }],
  ['preenche pontos', { tipo: 'preenche', padrao: 'pontos' }],
  ['pe-de-mosca', { tipo: 'pe-de-mosca' }],
  ['manicula', { tipo: 'manicula' }],
  ['florao', { tipo: 'florao' }],
  ['separador losango', { tipo: 'separador', separador: 'losango' }],
  ['separador asteriscos', { tipo: 'separador', separador: 'asteriscos' }],
  ['separador onda', { tipo: 'separador', separador: 'onda' }],
];
const PADROES = ['onda', 'ziguezague', 'lacos', 'pontos'];

for (const [nome, params] of CASOS) {
  test(`${nome}: dentro da caixa, ≥1 traço, determinístico`, () => {
    for (const c of CAIXAS) {
      const t = filigrana(c, params, 1);
      assert.ok(t.length >= 1, `${nome} ${c.l}×${c.a}: sem traços`);
      assert.deepEqual(problemas(t, c), [], `${nome} ${c.l}×${c.a}`);
      assert.deepEqual(filigrana(c, params, 1), t);
    }
  });

  test(`${nome}: caixa degenerada → []`, () => {
    assert.deepEqual(filigrana({ x: 0, y: 0, l: 0, a: 5 }, params, 1), []);
    assert.deepEqual(filigrana({ x: 0, y: 0, l: 5, a: 0 }, params, 1), []);
  });

  test(`${nome}: golden, caixa 24×8`, (t) => {
    t.assert.snapshot(linhas([filigrana({ x: 0, y: 0, l: 24, a: 8 }, params, 1)]));
  });
}

for (const padrao of PADROES) {
  test(`preenche ${padrao}: seed muda com irregular 0.5`, () => {
    const c = CAIXAS[0];
    assert.notDeepEqual(
      filigrana(c, { tipo: 'preenche', padrao, irregular: 0.5 }, 1),
      filigrana(c, { tipo: 'preenche', padrao, irregular: 0.5 }, 2),
    );
  });

  test(`preenche ${padrao}: irregular 0 ignora a seed`, () => {
    const c = CAIXAS[0];
    assert.deepEqual(
      filigrana(c, { tipo: 'preenche', padrao, irregular: 0 }, 1),
      filigrana(c, { tipo: 'preenche', padrao, irregular: 0 }, 2),
    );
  });

  test(`preenche ${padrao}: termina a ≤ 0.01 mm do fim da caixa (irregular 0)`, () => {
    const c = CAIXAS[0];
    const xs = filigrana(c, { tipo: 'preenche', padrao, irregular: 0 }, 1).flat().map((p) => p[0]);
    assert.ok(Math.max(...xs) >= c.x + c.l - 0.01, `para em ${Math.max(...xs)}`);
  });
}

test('geradores exportados: caixa degenerada → []', () => {
  const z = { x: 0, y: 0, l: 0, a: 5 };
  for (const g of [preencheLinha, peDeMosca, manicula, florao, separador]) assert.deepEqual(g(z, {}, 1), []);
});
