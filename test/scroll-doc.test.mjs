import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFonte } from '../src/fonte.js';
import { NEUTRA } from '../src/motor/mao.js';
import { normalizar } from '../src/magia.js';
import { gerarAlfabeto } from '../src/arcano/alfabeto.js';
import { paginasGrimorio, comporGrimorio, comporScroll } from '../src/materiais/scroll.js';
import { validarDocumento, papel as folha } from '../src/materiais/documento.js';

const raiz = new URL('../', import.meta.url);
const fontes = { EMSBird: parseFonte(fs.readFileSync(new URL('fontes/EMSBird.svg', raiz), 'utf8'), 'EMSBird') };

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

const casos = [
  [{ tamanho: 3 }],
  [{ cifrar: { nome: true, ficha: true, efeito: true }, chave: true, completo: 'nao' }],
];
const ord = (pags) => pags.map((p) => p.map((t) => JSON.stringify(t)).sort());
const bola2 = { ...bola, id: 'outra' };

for (const [cfg] of casos) {
  test(`grimorio Documento: ${JSON.stringify(cfg).slice(0, 40)}`, () => {
    const papel = folha('A6');
    const velho = paginasGrimorio([bola], ctx, cfg, papel);
    const doc = comporGrimorio([bola], ctx, { ...cfg, papel });
    assert.deepEqual(validarDocumento(doc), []);
    assert.deepEqual(doc.paginas.map((p) => p.camadas.map((c) => c.id)), velho.paginas.map(() => ['texto', 'moldura', 'sigilo']));
    assert.deepEqual(ord(doc.paginas.map((p) => p.camadas.flatMap((c) => c.tracos))), ord(velho.paginas));
    assert.deepEqual(doc.avisos, velho.avisos);
    assert.deepEqual(doc.modos, velho.modos);
    const sig = doc.paginas[0].camadas[2];
    assert.ok(sig.tracos.length > 0);
    assert.equal(sig.caneta, 'vermelha');
  });
}

test('rubrica false: sigilo em preta', () => {
  const doc = comporGrimorio([bola], ctx, { papel: folha('A6'), rubrica: false });
  assert.equal(doc.paginas[0].camadas[2].caneta, 'preta');
  assert.deepEqual(validarDocumento(doc), []);
});

test('comporScroll: uma magia por página', () => {
  const doc = comporScroll([bola, bola2], ctx, { papel: folha('A6'), porPagina: false });
  assert.equal(doc.paginas.length, 2);
  assert.deepEqual(validarDocumento(doc), []);
});
