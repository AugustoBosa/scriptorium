import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFonte } from '../src/fonte.js';
import { NEUTRA, IDENTIDADE, PARAMS, glifo } from '../src/motor/mao.js';
import { compor, PAGINAS } from '../src/layout.js';
import { escreverPalavra } from '../src/motor/escrita.js';

// DoD do M16 (EXPANSAO §4.7): vizinhas diferentes, determinismo, largura medida = desenhada, sanidade, contrato dos PARAMS.
const raiz = new URL('../', import.meta.url);
const carregar = (nome) => parseFonte(fs.readFileSync(new URL(`fontes/${nome}.svg`, raiz), 'utf8'), nome);
const fontes = { EMSBird: carregar('EMSBird'), EMSAllure: carregar('EMSAllure') };

const NOVAS = ['alternativas', 'contexto', 'arremate', 'ondulacao', 'deriva', 'ritmo', 'fadiga'];
const base = { ...NEUTRA, seed: 7, base: [{ fonte: 'EMSBird', peso: 1 }] };
const CHEIA = { ...NEUTRA, seed: 11, base: [{ fonte: 'EMSBird', peso: 1 }], alternativas: 5, contexto: 1, arremate: 1, ondulacao: 1, deriva: 1, ritmo: 40, fadiga: 1, variacao: 0.5 };
const PARAGRAFOS = 'Aqui está o óleo.\n\nÀ noite, vovó ouviu.\n\nO castelo espera por você.';
const PROSA = 'a lua cheia sobe no mar e a noite fica calma enquanto o vento leva as folhas pela estrada velha até a casa do moleiro onde ninguém espera visita';

test('mão sem as 7 chaves novas compõe igual à mão NEUTRA completa', () => {
  const sem = { ...base };
  for (const k of NOVAS) delete sem[k];
  const a = compor(PARAGRAFOS, fontes, sem, PAGINAS.A5, { tamanho: 6 });
  const b = compor(PARAGRAFOS, fontes, { ...NEUTRA, seed: 7, base: base.base }, PAGINAS.A5, { tamanho: 6 });
  assert.deepEqual(a, b);
});

test('vizinhas nunca iguais: K 2..5, letras e ocorrências 0..40; K=1 controle igual', () => {
  for (const ch of 'aeioumnrsl') {
    for (let n = 0; n <= 40; n++) {
      for (let K = 2; K <= 5; K++) {
        const mao = { ...base, alternativas: K };
        const a = escreverPalavra(ch, { fontes, mao, tamanho: 6, cont: new Map([[ch, n]]) }).glifos[0].tracos;
        const b = escreverPalavra(ch, { fontes, mao, tamanho: 6, cont: new Map([[ch, n + 1]]) }).glifos[0].tracos;
        assert.notDeepEqual(a, b, `K=${K} ${ch} n=${n}`);
      }
      const m1 = { ...base, alternativas: 1 };
      assert.deepEqual(
        escreverPalavra(ch, { fontes, mao: m1, tamanho: 6, cont: new Map([[ch, n]]) }).glifos[0].tracos,
        escreverPalavra(ch, { fontes, mao: m1, tamanho: 6, cont: new Map([[ch, n + 1]]) }).glifos[0].tracos,
        `K=1 ${ch} n=${n}`);
    }
  }
});

test('vizinhas no texto: "a a a a a a" com K=2 tem traços diferentes entre palavras seguidas', () => {
  const mao = { ...base, alternativas: 2 };
  const r = compor('a a a a a a', fontes, mao, PAGINAS.A4, { tamanho: 6 });
  const T = glifo(fontes, mao, 'a', 0).tracos.filter((t) => t.length).length;
  const pts = r.paginas[0];
  const rel = (i) => pts.slice(i * T, (i + 1) * T).map((t) => t.map(([x, y]) => [x - r.ancoras[i].x, y - r.ancoras[i].y]));
  for (let i = 0; i < 5; i++) {
    const a = rel(i), b = rel(i + 1);
    let max = 0;
    a.forEach((t, j) => t.forEach((p, k) => { max = Math.max(max, Math.abs(p[0] - b[j][k][0]), Math.abs(p[1] - b[j][k][1])); }));
    assert.ok(max > 1e-6, `palavras ${i} e ${i + 1} iguais`);
  }
});

test('determinismo: mesma seed, mesma saída; outra seed, saída diferente', () => {
  const a = compor(PARAGRAFOS, fontes, CHEIA, PAGINAS.A5, { tamanho: 6 });
  assert.deepEqual(compor(PARAGRAFOS, fontes, CHEIA, PAGINAS.A5, { tamanho: 6 }), a);
  assert.notDeepEqual(compor(PARAGRAFOS, fontes, { ...CHEIA, seed: 12 }, PAGINAS.A5, { tamanho: 6 }), a);
});

test('largura medida = soma dos avanços desenhados (20 palavras, CHEIA)', () => {
  const cont = new Map();
  PROSA.split(' ').slice(0, 20).forEach((p, i) => {
    const w = escreverPalavra(p, { fontes, mao: CHEIA, tamanho: 6, cont, indice: i, t: i * 0.7, F: 0.5 });
    let soma = 0;
    for (const g of w.glifos) soma += g.adv * w.s;
    assert.ok(Math.abs(w.largura - soma) < 1e-9, p);
    for (const ch of p) cont.set(ch, (cont.get(ch) ?? 0) + 1);
  });
});

test('largura medida = desenhada no documento: intervalo entre palavras da mesma linha é constante e nada passa da margem', () => {
  const r = compor(Array(3).fill(PROSA).join(' '), fontes, CHEIA, PAGINAS.A4, { tamanho: 6 });
  const linhas = new Map();
  for (const a of r.ancoras) {
    const k = `${a.pagina}|${a.coluna}|${a.linha}`;
    if (!linhas.has(k)) linhas.set(k, []);
    linhas.get(k).push(a);
  }
  const gaps = [];
  for (const l of linhas.values()) for (let i = 0; i < l.length - 1; i++) gaps.push(l[i + 1].x - (l[i].x + l[i].l));
  assert.ok(gaps.length > 0);
  for (const g of gaps) assert.ok(Math.abs(g - gaps[0]) < 1e-9, `intervalo ${g} != ${gaps[0]}`);
  const direita = PAGINAS.A4.largura - PAGINAS.A4.margens.dir;
  for (const a of r.ancoras) assert.ok(a.x + a.l <= direita + 1e-9, `palavra ${a.texto} passa da margem`);
});

test('ancoras: "minimum" com alternativas 5, contexto 1, arremate 1 fica na caixa da palavra', () => {
  const mao = { ...base, alternativas: 5, contexto: 1, arremate: 1 };
  const r = compor('minimum', fontes, mao, PAGINAS.A4, { tamanho: 6 });
  const a = r.ancoras[0], margem = 6 * 0.3;
  for (const t of r.paginas[0]) for (const [x] of t) {
    assert.ok(x >= a.x - margem && x <= a.x + a.l + margem, `x=${x} fora de [${a.x}, ${a.x + a.l}]`);
  }
});

test('sanidade: CHEIA com tremor 1 não gera NaN, traço curto ou página inválida', () => {
  const texto = Array(4).fill(PARAGRAFOS).join('\n\n');
  const r = compor(texto, fontes, { ...CHEIA, tremor: 1 }, PAGINAS.A5, { tamanho: 6 });
  assert.ok(r.paginas.length >= 1);
  assert.ok(Number.isFinite(r.fim));
  for (const p of r.paginas) for (const t of p) {
    assert.ok(t.length >= 2, 'traço com menos de 2 pontos');
    assert.ok(t.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), 'ponto não finito');
  }
});

test('contrato: as 7 chaves novas estão em PARAMS com padrão neutro e grupo coerente', () => {
  for (const k of NOVAS) {
    const x = PARAMS.find((p) => p.chave === k);
    assert.ok(x, `${k} fora de PARAMS`);
    assert.equal(x.padrao, NEUTRA[k], k);
    assert.equal(x.grupo, IDENTIDADE.includes(k) ? 'identidade' : 'execucao', k);
  }
});

test('deriva 1 em colunas estreitas: mesmo nº de páginas que sem deriva e nenhuma linha vazia', () => {
  // palavras de 30 mm cabem na coluna (31 mm) mas não em coluna − recuo
  const LONGAS = 'a lua cheia sobe no mar extraordinariamente e a noite fica calma enquanto o vento leva as folhas incompreensivelmente pela estrada velha até a casa do moleiro onde ninguém espera visita desproporcionalmente';
  const texto = Array(5).fill(LONGAS).join(' ');
  const opc = { tamanho: 6, colunas: 3 }, entrelinha = 6 * 1.6;
  const neutra = { ...NEUTRA, base: base.base };
  for (const seed of [3, 11]) {
    const sem = compor(texto, fontes, { ...neutra, seed }, PAGINAS.A5, opc);
    const com = compor(texto, fontes, { ...neutra, seed, deriva: 1 }, PAGINAS.A5, opc);
    assert.equal(com.paginas.length, sem.paginas.length, `seed ${seed}: ${com.paginas.length} páginas contra ${sem.paginas.length}`);
    for (let i = 1; i < com.ancoras.length; i++) {
      const a = com.ancoras[i - 1], b = com.ancoras[i];
      if (a.pagina === b.pagina && a.coluna === b.coluna) assert.ok(b.y - a.y <= 1.5 * entrelinha, `seed ${seed}: salto de ${b.y - a.y} mm`);
    }
  }
});

test('tinta fica na caixa da palavra: CHEIA, 58 palavras, tremor 0 (deriva até ±6°)', () => {
  const tamanho = 6, folga = 0.3 * tamanho + tamanho * Math.tan(6 * Math.PI / 180);
  const r = compor(PROSA.split(' ').concat(PROSA.split(" ")).join(' '), fontes, { ...CHEIA, tremor: 0 }, PAGINAS.A4, { tamanho });
  assert.equal(r.ancoras.length, 58);
  // traços saem na ordem das âncoras; nº de traços por palavra = traços não vazios dos glifos
  const pts = r.paginas.flat();
  let k = 0;
  for (const a of r.ancoras) {
    const nt = [...a.texto].reduce((s, ch) => s + glifo(fontes, CHEIA, ch, 0).tracos.filter((t) => t.length).length, 0);
    for (const t of pts.slice(k, k + nt)) for (const [x] of t) {
      assert.ok(x >= a.x - folga && x <= a.x + a.l + folga, `${a.texto}: x=${x} fora de [${a.x}, ${a.x + a.l}] ± ${folga}`);
    }
    k += nt;
  }
  assert.equal(k, pts.length, 'contagem de traços não bate');
});
