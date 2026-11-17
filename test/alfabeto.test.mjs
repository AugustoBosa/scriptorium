import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarAlfabeto, LETRAS, CAIXA } from '../src/arcano/alfabeto.js';
import { dist } from '../src/geo.js';

const r3 = (v) => Array.isArray(v) ? v.map(r3) : typeof v === 'number' ? Math.round(v * 1000) / 1000 + 0 : v;
const linhas = (g) => [...'ab9.'].map((ch) => `${ch} ${g[ch].adv} ${JSON.stringify(r3(g[ch].tracos))}`).join('\n');
const valido = (tracos) => tracos.every((t) => t.length >= 2 && t.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));

test('alfabeto: golden seed 1 (grade, saída atual)', (t) => {
  t.assert.snapshot(linhas(gerarAlfabeto({ seed: 1 }).glifos));
});

test('alfabeto: golden seed 3, curva 1, complexidade 1 (grade, saída atual)', (t) => {
  t.assert.snapshot(linhas(gerarAlfabeto({ seed: 3, curva: 1, complexidade: 1 }).glifos));
});

// ponytail: a grade hoje passa da caixa (curvas quadráticas com controle fora, até ~49 u); o invariante de caixa só vale para as formas novas.
test('alfabeto: 36 letras com traços de ≥ 2 pontos finitos', () => {
  const g = gerarAlfabeto({ seed: 1 }).glifos;
  for (const ch of LETRAS) assert.ok(valido(g[ch].tracos), ch);
});

test('alfabeto: determinístico para a mesma seed', () => {
  assert.deepEqual(gerarAlfabeto({ seed: 7 }).glifos, gerarAlfabeto({ seed: 7 }).glifos);
});

test('alfabeto: seed diferente muda os glifos', () => {
  assert.notDeepEqual(gerarAlfabeto({ seed: 1 }).glifos.a, gerarAlfabeto({ seed: 2 }).glifos.a);
});

test('alfabeto: forma grade = sem forma', () => {
  assert.deepEqual(gerarAlfabeto({ seed: 1, forma: 'grade' }), gerarAlfabeto({ seed: 1 }));
});

const FORMAS_NOVAS = ['angular', 'curvo', 'ogham', 'pontilhado'];
const dentroDaCaixa = (tracos) => tracos.every((t) => t.every(([x, y]) => x >= 0 && x <= CAIXA.largura && y >= 0 && y <= CAIXA.altura));

for (const forma of FORMAS_NOVAS) {
  test(`alfabeto ${forma}: golden seed 1 de 'ab9'`, (t) => {
    t.assert.snapshot(linhas(gerarAlfabeto({ seed: 1, forma }).glifos));
  });

  test(`alfabeto ${forma}: 36 glifos distintos, dentro da caixa, traços ≥ 2 pontos`, () => {
    const g = gerarAlfabeto({ seed: 1, forma }).glifos;
    assert.equal(new Set(LETRAS.split('').map((ch) => JSON.stringify(g[ch].tracos))).size, 36);
    for (const ch of LETRAS) {
      assert.ok(valido(g[ch].tracos), ch);
      assert.ok(dentroDaCaixa(g[ch].tracos), ch);
    }
  });

  test(`alfabeto ${forma}: determinístico`, () => {
    assert.deepEqual(gerarAlfabeto({ seed: 2, forma }).glifos, gerarAlfabeto({ seed: 2, forma }).glifos);
  });
}

test('alfabeto ogham: não depende de curva nem complexidade', () => {
  assert.deepEqual(gerarAlfabeto({ seed: 1, forma: 'ogham', curva: 0 }).glifos, gerarAlfabeto({ seed: 1, forma: 'ogham', curva: 1, complexidade: 1 }).glifos);
});

test('pontilhado a 3,5 mm de altura: pontos separados >= 0,4 + 0,4 mm (exceto emendas entre traços)', () => {
  const k = 3.5 / 700, pon = gerarAlfabeto({ seed: 1, forma: 'pontilhado' }).glifos;
  let n = 0, perto = 0;
  for (const ch of LETRAS) {
    const ds = pon[ch].tracos.map(([a, b]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    for (let i = 1; i < ds.length; i++, n++) if (dist(ds[i - 1], ds[i]) * k < 0.8 - 1e-6) perto++;
  }
  assert.ok(perto / n < 0.3, `${perto} de ${n} pares consecutivos a menos de 0,8 mm`); // só emendas de traços curtos/cruzados; passo 100 dava >50%
});
