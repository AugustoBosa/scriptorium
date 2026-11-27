import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colares, desenharSistema, nPontos, completar } from '../src/arcano/sistema.js';
import { PRESETS, dePreset } from '../src/arcano/presets.js';
import { sigilo } from '../src/arcano/alfabeto.js';

const bola = { id: 'fireball-phb', nome: 'Bola de Fogo', nivel: 3, escola: 'V', alcance: '45 m', comp: 'V, S, M', duracao: 'Instantânea', mec: 'Res. DES · 8d6 fogo', resumo: 'esfera de 6 m' };
const cura = { id: 'cure-wounds-phb', nome: 'Curar Ferimentos', nivel: 1, escola: 'V', alcance: 'Toque', comp: 'V, S', duracao: 'Instantânea', mec: '' };
const escudo = { id: 'shield-phb', nome: 'Escudo Arcano', nivel: 1, escola: 'A', alcance: 'Pessoal', comp: 'V, S', duracao: '1 rodada', mec: '' };

test('colares: 1 por classe de rotação (N=13 → 632, N=5 → 8)', () => {
  assert.equal(colares(13).length, 632);
  assert.equal(colares(5).length, 8);
  assert.equal(colares(13)[0], 0);
});

test('pontos automáticos: 2 × códigos em colar + 1', () => {
  assert.equal(nPontos(completar(PRESETS.colar)), 13);
  assert.equal(nPontos(completar({ base: { pontos: 7 } })), 7);
});

test('clássico delega para sigilo() (goldens antigos intactos)', () => {
  assert.deepEqual(desenharSistema(dePreset('classico'), bola, 3), sigilo(bola, 3));
  assert.deepEqual(desenharSistema(null, bola, 3), sigilo(bola, 3));
});

for (const id of Object.keys(PRESETS)) {
  test(`preset ${id}: desenha, cabe no círculo unitário, é determinístico e separa magias`, () => {
    const s = dePreset(id), a = desenharSistema(s, bola, 1);
    assert.ok(a.length > 0);
    for (const t of a) for (const [x, y] of t) assert.ok(Number.isFinite(x) && Math.hypot(x, y) <= 1.02, `${id}: ponto ${x},${y}`);
    assert.deepEqual(desenharSistema(s, bola, 1), a);
    assert.notDeepEqual(desenharSistema(s, cura, 1), a);
    assert.notDeepEqual(desenharSistema(s, escudo, 1), desenharSistema(s, cura, 1));
  });
}

test('trocar a ordem das opções de um código muda o desenho', () => {
  const s = dePreset('colar');
  const r = structuredClone(s);
  r.codigos[0].opcoes = ['3', '0', '1', '2', '4', '5', '6', '7', '8', '9'];
  assert.notDeepEqual(desenharSistema(r, bola, 1), desenharSistema(s, bola, 1));
});

test('firmeza < 1 treme o traço de forma determinística', () => {
  const s = { ...dePreset('selo'), traco: { firmeza: 0.5 } };
  assert.notDeepEqual(desenharSistema(s, bola, 1), desenharSistema(dePreset('selo'), bola, 1));
  assert.deepEqual(desenharSistema(s, bola, 1), desenharSistema(s, bola, 1));
});
