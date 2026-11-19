import { test } from 'node:test';
import assert from 'node:assert/strict';
import { padroes, vocabulario, alvos, escolher, montarTexto } from '../src/letra/textos.js';

test('padroes: início, fim e pares, com acento', () => {
  assert.deepEqual(padroes('mão'), ['^m', 'o$', 'mã', 'ão']);
});

test('vocabulario descarta nome próprio e conta minúsculas', () => {
  const v = vocabulario('Maria viu a casa. A casa caiu. Casa de Maria.');
  assert.equal(v.get('casa'), 3);
  assert.ok(!v.has('maria'));
  assert.ok(!v.has('a')); // menor que 2 letras
});

test('escolher cobre cada alvo as vezes pedidas quando o vocabulário permite', () => {
  const v = vocabulario('de de rade dera rara era dado roda odre ardor dorde');
  const a = alvos(v, 1);
  const { palavras, faltando } = escolher(v, a, 1);
  const vistos = new Set(palavras.flatMap(padroes));
  for (const k of a) assert.ok(vistos.has(k) || faltando.includes(k), k);
  assert.equal(new Set(palavras).size, palavras.length);
});

test('montarTexto: uma maiúscula por letra inicial e linhas dentro da largura', () => {
  const linhas = montarTexto(['casa', 'cedo', 'dado', 'vento', 'água'], { largura: 12 });
  const ws = linhas.join(' ').split(' ');
  assert.equal(ws.filter((w) => /^\p{Lu}/u.test(w)).length, 4); // c, d, v, á
  for (const l of linhas) assert.ok(l.length <= 12 || !l.includes(' '));
});
