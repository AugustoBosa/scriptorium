import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFonte } from '../src/fonte.js';
import { NEUTRA } from '../src/motor/mao.js';
import { compor, PAGINAS } from '../src/layout.js';
import { papel } from '../src/materiais/documento.js';

const raiz = new URL('../', import.meta.url);
const carregar = (nome) => parseFonte(fs.readFileSync(new URL(`fontes/${nome}.svg`, raiz), 'utf8'), nome);
const fontes = { EMSBird: carregar('EMSBird'), EMSAllure: carregar('EMSAllure') }; // 2 fontes reais

// Arredonda todo número a 3 casas, recursivamente. "+ 0" troca -0 por 0.
const r3 = (v) => Array.isArray(v) ? v.map(r3)
  : typeof v === 'number' ? Math.round(v * 1000) / 1000 + 0
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, r3(v[k])]))
  : v;
// Uma linha por traço: legível no .snapshot e estável.
const linhas = (pags) => pags.map((p, i) => `pagina ${i}\n` + r3(p).map((t) => JSON.stringify(t)).join('\n')).join('\n');

const mao = { ...NEUTRA, seed: 7, base: [{ fonte: 'EMSBird', peso: 1 }] };
const PARAGRAFOS = 'Aqui está o óleo.\n\nÀ noite, vovó ouviu.\n\nO castelo espera por você.';

test('golden layout: multipagina, A6, mao neutra seed 7', (t) => {
  const r = compor('O vento cobre o vale e o moinho espera por você, viajante. '.repeat(9), fontes, mao, papel('A6'), { tamanho: 10 });
  assert.ok(r.paginas.length >= 3, `esperava >= 3 paginas, veio ${r.paginas.length}`);
  t.assert.snapshot({ paginas: linhas(r.paginas), avisos: r.avisos, fim: r3(r.fim), ancoras: r3(r.ancoras) });
});

test('golden layout: justificado, 3 paragrafos, A5', (t) => {
  const r = compor(PARAGRAFOS, fontes, mao, PAGINAS.A5, { tamanho: 5, alinhamento: 'justificado' });
  t.assert.snapshot({ paginas: linhas(r.paginas), avisos: r.avisos, fim: r3(r.fim), ancoras: r3(r.ancoras) });
});

test('golden layout: palavra longa quebrada, A8', (t) => {
  const r = compor('Anticonstitucionalissimamente inconstitucionalíssimo ' + 'paralelepípedo '.repeat(5), fontes, mao, papel('A8'), { tamanho: 6 });
  t.assert.snapshot({ paginas: linhas(r.paginas), avisos: r.avisos, fim: r3(r.fim), ancoras: r3(r.ancoras) });
});

test('golden layout: mao com variacao, centralizado, A5', (t) => {
  const maoVar = { ...NEUTRA, seed: 3, base: [{ fonte: 'EMSBird', peso: 1 }, { fonte: 'EMSAllure', peso: 1 }], pressa: 0.5, tremor: 0.3, variacao: 0.5, desleixo: 0.3, inclinacao: 5 };
  const r = compor(PARAGRAFOS, fontes, maoVar, PAGINAS.A5, { tamanho: 5, alinhamento: 'centro' });
  t.assert.snapshot({ paginas: linhas(r.paginas), avisos: r.avisos, fim: r3(r.fim), ancoras: r3(r.ancoras) });
});
