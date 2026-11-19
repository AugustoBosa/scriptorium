import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rng, hash, ruido1d } from '../src/rng.js';

const primeiros = (gen, n) => Array.from({ length: n }, gen);

test('mesma seed numérica gera a mesma sequência', () => {
  assert.deepEqual(primeiros(rng(7), 1000), primeiros(rng(7), 1000));
});

test('seeds diferentes geram sequências diferentes', () => {
  assert.notDeepEqual(primeiros(rng(1), 10), primeiros(rng(2), 10));
});

test('valores ficam em [0, 1)', () => {
  const g = rng(42);
  for (let i = 0; i < 10000; i++) {
    const v = g();
    assert.ok(v >= 0 && v < 1, `valor fora do intervalo: ${v}`);
  }
});

test('seed string é repetível e distingue strings', () => {
  assert.deepEqual(primeiros(rng('alfa'), 20), primeiros(rng('alfa'), 20));
  assert.notDeepEqual(primeiros(rng('alfa'), 20), primeiros(rng('beta'), 20));
});

test('valores fixos de rng(1)', () => {
  const g = rng(1);
  assert.equal(g(), 0.6270739405881613);
  assert.equal(g(), 0.002735721180215478);
  assert.equal(g(), 0.5274470399599522);
});

test('hash FNV-1a de valores conhecidos', () => {
  assert.equal(hash(''), 2166136261);
  assert.equal(hash('a'), 3826002220);
  assert.equal(hash('foobar'), 3214735720);
});

test('hash fica em uint32 com acento', () => {
  const h = hash('ação');
  assert.ok(Number.isInteger(h) && h >= 0 && h < 2 ** 32);
});

test('ruido1d: determinístico, limitado, contínuo e dependente da seed', () => {
  assert.equal(ruido1d('s', 2.7), ruido1d('s', 2.7));
  for (let t = -5; t < 50; t += 0.37) assert.ok(Math.abs(ruido1d('s', t)) <= 1);
  assert.ok(Math.abs(ruido1d('s', 3) - ruido1d('s', 3 - 1e-9)) < 1e-6);
  assert.notEqual(ruido1d('a', 1.5), ruido1d('b', 1.5));
});
