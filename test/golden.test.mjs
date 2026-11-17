import fs from 'node:fs';
import { test } from 'node:test';
import { parseFonte } from '../src/fonte.js';
import { NEUTRA } from '../src/motor/mao.js';
import { compor, PAGINAS } from '../src/layout.js';
import { normalizar } from '../src/magia.js';
import { gerarAlfabeto, sigilo } from '../src/arcano/alfabeto.js';
import { paginasGrimorio as comporGrimorio, folha } from '../src/materiais/scroll.js';
import { gcode } from '../src/maquina/gcode.js';
import { otimizar } from '../src/maquina/otimizar.js';

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

test('golden compor: mao neutra, A5', (t) => {
  const r = compor('Coração de pão\nação, não é São João', fontes, mao, PAGINAS.A5, { tamanho: 6 });
  t.assert.snapshot({ paginas: linhas(r.paginas), avisos: r.avisos, fim: r3(r.fim) });
});

test('golden compor: mao com variacao e duas fontes, mesa', (t) => {
  const maoVar = { ...NEUTRA, seed: 3, base: [{ fonte: 'EMSBird', peso: 1 }, { fonte: 'EMSAllure', peso: 1 }], pressa: 0.5, tremor: 0.3, variacao: 0.5, desleixo: 0.3, inclinacao: 5 };
  const r = compor('Aqui está o óleo.\n\nÀ noite, vovó ouviu.', fontes, maoVar, PAGINAS.mesa, { tamanho: 5 });
  t.assert.snapshot({ paginas: linhas(r.paginas), avisos: r.avisos, fim: r3(r.fim) });
});

const bruta = {
  name: 'Fireball', source: 'PHB', level: 3, school: 'V',
  time: [{ number: 1, unit: 'action' }],
  range: { type: 'point', distance: { type: 'feet', amount: 150 } },
  components: { v: true, s: true, m: { text: 'gold dust', cost: 2500, consume: true } },
  duration: [{ type: 'timed', duration: { type: 'minute', amount: 1 }, concentration: true }],
  entries: ['Each creature takes {@damage 8d6} fire damage. '.repeat(2), { type: 'list', items: ['um {@condition prone|PHB|caído}'] }],
  entriesHigherLevel: [{ type: 'entries', name: 'At Higher Levels', entries: ['Increases by {@scaledamage 8d6|3-9|1d6}.'] }],
  savingThrow: ['dexterity'], damageInflict: ['fire'], meta: { ritual: true },
  classes: { class: [{ name: 'Wizard', source: 'PHB' }] },
};
const bola = normalizar(bruta, 'fireball-phb', { nome: 'Bola de Fogo', resumo: 'Explosão de chamas.' });

const ctx = { fontes: { EMSBird: fontes.EMSBird, arcano: gerarAlfabeto({ seed: 3 }) },
  mao: { ...NEUTRA, base: [{ fonte: 'EMSBird', peso: 1 }] },
  maoArcana: { ...NEUTRA, base: [{ fonte: 'arcano', peso: 1 }] }, seed: 1 };

test('golden comporGrimorio: magia simples, A6', (t) => {
  const r = comporGrimorio([bola], ctx, { tamanho: 3 }, folha('A6'));
  t.assert.snapshot({ paginas: linhas(r.paginas), avisos: r.avisos, modos: JSON.stringify(r3(r.modos)) });
});

test('golden comporGrimorio: cifrado com chave, A6', (t) => {
  const r = comporGrimorio([bola], ctx, { cifrar: { nome: true, ficha: true, efeito: true }, chave: true, completo: 'nao' }, folha('A6'));
  t.assert.snapshot({ paginas: linhas(r.paginas), avisos: r.avisos, modos: JSON.stringify(r3(r.modos)) });
});

test('golden sigilo: magia de Bola de Fogo, seed 1', (t) => {
  t.assert.snapshot(linhas([sigilo(bola, 1)]));
});

test('golden sigilo: outra magia (nivel 0, sem conc/ritual), seed 2', (t) => {
  t.assert.snapshot(linhas([sigilo({ ...bola, id: 'outra', nivel: 0, conc: false, ritual: false }, 2)]));
});

test('golden gcode: ordem original', (t) => {
  const tracos = compor('Olá, mundo', fontes, mao, PAGINAS.mesa, { tamanho: 6 }).paginas[0];
  const g = gcode(tracos, PAGINAS.mesa);
  t.assert.snapshot({ texto: g.texto, nTracos: g.nTracos, comprimento: Math.round(g.comprimento * 1000) / 1000, avisos: g.avisos });
});

test('golden gcode: ordem otimizada', (t) => {
  const tracos = compor('Olá, mundo', fontes, mao, PAGINAS.mesa, { tamanho: 6 }).paginas[0];
  const g = gcode(otimizar(tracos), PAGINAS.mesa);
  t.assert.snapshot({ texto: g.texto, nTracos: g.nTracos, comprimento: Math.round(g.comprimento * 1000) / 1000, avisos: g.avisos });
});
