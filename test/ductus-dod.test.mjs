import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFonte, CURSIVAS } from '../src/fonte.js';
import { NEUTRA, PARAMS, glifo } from '../src/motor/mao.js';
import { escreverPalavra } from '../src/motor/escrita.js';
import { compor, PAGINAS } from '../src/layout.js';
import { medidas, analisar, ponte, ligar } from '../src/motor/ductus.js';

const raiz = new URL('../', import.meta.url);
const carregar = (n) => parseFonte(fs.readFileSync(new URL(`fontes/${n}.svg`, raiz), 'utf8'), n);
const fontes = Object.fromEntries([...CURSIVAS, 'EMSBird'].map((n) => [n, carregar(n)]));
const A5 = PAGINAS.A5;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const comp = (t) => t.reduce((s, p, i) => (i ? s + dist(t[i - 1], p) : 0), 0);

const L = { ...NEUTRA, seed: 7, base: [{ fonte: 'EMSAllure', peso: 1 }], ligadura: 1, capricho: 0 };
const TUDO = { ...L, adiamento: 1, fluidez: 1, ultrapassagem: 1, retoque: 1, pressa: 0.6, alternativas: 5, contexto: 1, arremate: 1, tremor: 0.3 };
const PROSA = 'a lua cheia sobe no mar e a noite fica calma, e o vento passa pela ponte velha do porto.';
const TEXTO60 = 'Ação, vovó e água são palavras com acento; bem-vindo ao Grimório 2024! ' +
  'ÁGUA, ÉPOCA, Índio, ômega, pingüim, guarda-chuva, sol-nascente, 7 anos, 42 gatos, ' +
  'mão, pão, coração, avião, então, feliz, ruim, sim, não, cidade, chuva, rio, mar, lua, ' +
  'ouro, prata, Ana, José, Maria, São Paulo, Rio de Janeiro, último, dúvida, cafezinho, ' +
  'pé, vê, ló, três, quão, saudade, ontem, hoje, amanhã, agora';

test('golden: params neutros não mudam compor; escreverPalavra neutro sem tracos', () => {
  const base = { ...NEUTRA, base: [{ fonte: 'EMSAllure', peso: 1 }], seed: 7 };
  const sem = { ...base };
  for (const k of ['ligadura', 'adiamento', 'fluidez', 'ultrapassagem', 'retoque']) delete sem[k];
  assert.deepEqual(compor('minimum vovó', fontes, sem, A5), compor('minimum vovó', fontes, base, A5));
  const w = escreverPalavra('minimum', { fontes, mao: base, tamanho: 6 });
  assert.ok(!('tracos' in w));
});

test('DoD: minimum liga em até 3 traços nas fontes cursivas', () => {
  for (const f of ['EMSAllure', 'EMSSociety', 'EMSBrush', 'EMSLeague', 'EMSSwiss', 'EMSDecorousScript', 'MistralSingleLine']) {
    const r = compor('minimum', fontes, { ...L, base: [{ fonte: f, peso: 1 }] }, A5);
    assert.ok(r.paginas[0].length <= 3, `${f}: ${r.paginas[0].length} traços`);
  }
  const cap = compor('minimum', fontes, { ...L, base: [{ fonte: 'EMSCapitol', peso: 1 }] }, A5);
  assert.ok(cap.paginas[0].length <= 6, `EMSCapitol: ${cap.paginas[0].length} traços`);
});

test('controles: sem ligadura minimum tem 9 traços; fonte fora de CURSIVAS não muda com ligadura', () => {
  assert.equal(compor('minimum', fontes, { ...L, ligadura: 0 }, A5).paginas[0].length, 9);
  assert.deepEqual(
    compor('minimum', fontes, { ...L, base: [{ fonte: 'EMSBird', peso: 1 }], ligadura: 1 }, A5),
    compor('minimum', fontes, { ...L, base: [{ fonte: 'EMSBird', peso: 1 }], ligadura: 0 }, A5),
  );
});

test('DoD: adiamento põe os pingos do i depois do corpo, no fim da palavra', () => {
  const m = { ...L, adiamento: 1 };
  const w = escreverPalavra('minimum', { fontes, mao: m, tamanho: 6 });
  const xh = medidas(fontes, m).xh;
  assert.ok(comp(w.tracos[0]) > comp(w.tracos[1]), 'primeiro traço é o corpo');
  for (const t of w.tracos.slice(-2)) {
    assert.ok(comp(t) < 0.15, `pingo comprido: ${comp(t)}`);
    assert.ok(Math.min(...t.map((p) => p[1])) > 0.8 * xh, 'pingo baixo demais');
  }
});

// Extras (pingos, cortes) de cada letra da palavra na coordenada de palavra, e a contagem total.
function extrasDe(palavra, m) {
  const med = medidas(fontes, m);
  const cont = new Map(), pontas = [];
  let x = 0;
  for (const ch of palavra) {
    const n = cont.get(ch) ?? 0;
    cont.set(ch, n + 1);
    const g = glifo(fontes, m, ch, n);
    const a = analisar(g, med.xh);
    if (a) for (const t of a.extras) pontas.push([t[0][0] + x, t[0][1]]);
    x += g.adv;
  }
  return pontas;
}

test('DoD: com adiamento, os últimos traços são os extras (nunca corpo)', () => {
  const m = { ...L, capricho: 1, ligadura: 0.6, adiamento: 1 };
  let comJunção = 0;
  for (let seed = 0; seed < 30; seed++) {
    const mao = { ...m, seed };
    const w = escreverPalavra('infinito', { fontes, mao, tamanho: 6 });
    if (!w.tracos) continue;
    comJunção++;
    const esperados = extrasDe('infinito', mao);
    const k = esperados.length;
    assert.ok(w.tracos.length > k, `seed ${seed}: sem corpo`);
    const cauda = w.tracos.slice(-k);
    const livres = [...esperados];
    for (const t of cauda) {
      const i = livres.findIndex((p) => Math.abs(p[0] - t[0][0]) <= 0.03 && Math.abs(p[1] - t[0][1]) <= 0.03);
      assert.ok(i >= 0, `seed ${seed}: traço da cauda não é extra`);
      livres.splice(i, 1);
    }
  }
  assert.ok(comJunção >= 10, `só ${comJunção} seeds com junção`);
});

test('DoD: junção: ponte de vão 0,59 em tem pontas preservadas e segmentos novos ≤ 0,05 em', () => {
  const A = [[0, 0], [0.1, 0], [0.2, 0]], B = [[0.79, 0], [0.9, 0], [1, 0]];
  const p = ponte(A, B);
  assert.deepEqual(p.slice(0, A.length), A);
  assert.deepEqual(p.slice(p.length - B.length), B);
  assert.ok(p.length > A.length + B.length, 'não criou pontos');
  for (let i = A.length; i <= p.length - B.length; i++) assert.ok(dist(p[i - 1], p[i]) <= 0.05 + 1e-9, `segmento ${i}`);
});

test('DoD: ligar não liga par com vão de 0,61 em', () => {
  const g0 = { adv: 0.2, tracos: [[[0, 0], [0.1, 0.1], [0.2, 0.2]]] };
  const g1 = { adv: 0.5, tracos: [[[0.61, 0.2], [1, 0.1]]] };
  assert.equal(ligar([g0, g1], [...'nu'], { ...L, ligadura: 1 }, { xh: 0.356, ySai: 0.2 }, 0), null);
});

test('DoD: nenhum segmento de compor(PROSA) passa de 0,6 × tamanho', () => {
  const r = compor(PROSA, fontes, L, A5, { tamanho: 6 });
  for (const t of r.paginas.flat()) for (let i = 1; i < t.length; i++) {
    assert.ok(dist(t[i - 1], t[i]) <= 0.6 * 6, `segmento de ${dist(t[i - 1], t[i])} mm`);
  }
});

test('DoD: determinismo; outra seed muda o resultado', () => {
  const a = compor(PROSA, fontes, TUDO, A5);
  assert.deepEqual(a, compor(PROSA, fontes, TUDO, A5));
  assert.notDeepEqual(a.paginas, compor(PROSA, fontes, { ...TUDO, seed: 8 }, A5).paginas);
});

test('DoD: sanidade com TUDO em ~60 palavras, sem NaN, traço ≥ 2 pontos', () => {
  const r = compor(TEXTO60, fontes, TUDO, A5);
  assert.ok(r.paginas.length >= 1);
  for (const t of r.paginas.flat()) {
    assert.ok(t.length >= 2, 'traço com menos de 2 pontos');
    for (const [x, y] of t) assert.ok(Number.isFinite(x) && Number.isFinite(y), 'NaN');
  }
});

test('DoD: abaixo de 3 mm, fluidez e ultrapassagem não agem', () => {
  const com = compor(PROSA, fontes, { ...TUDO, fluidez: 1, ultrapassagem: 1 }, A5, { tamanho: 2.5 });
  const sem = compor(PROSA, fontes, { ...TUDO, fluidez: 0, ultrapassagem: 0 }, A5, { tamanho: 2.5 });
  assert.deepEqual(com, sem);
});

test('DoD: largura de palavra = soma dos adv; pontos dentro da caixa da âncora', () => {
  const m = { ...TUDO, tremor: 0 };
  const w = escreverPalavra('minimum', { fontes, mao: m, tamanho: 6 });
  assert.ok(Math.abs(w.largura - w.glifos.reduce((s, g) => s + g.adv * w.s, 0)) < 1e-9);
  const r = compor('minimum', fontes, m, A5, { tamanho: 6 });
  const a = r.ancoras.find((q) => q.texto === 'minimum');
  for (const t of r.paginas[0]) for (const [x] of t) {
    assert.ok(x >= a.x - 0.3 * 6 && x <= a.x + a.l + 0.3 * 6, `x ${x} fora da caixa`);
  }
});

test('DoD: 5 params novos em PARAMS com padrão neutro e nas listas certas', () => {
  const chaves = ['ligadura', 'adiamento', 'fluidez', 'ultrapassagem', 'retoque'];
  for (const k of chaves) {
    const p = PARAMS.find((x) => x.chave === k);
    assert.ok(p, `${k} ausente em PARAMS`);
    assert.equal(p.padrao, NEUTRA[k], k);
  }
});
