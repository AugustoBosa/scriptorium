import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFonte } from '../src/fonte.js';
import { NEUTRA } from '../src/motor/mao.js';
import { compor } from '../src/layout.js';
import { caixaDe, reamostrar } from '../src/geo.js';
import { papel, validarDocumento } from '../src/materiais/documento.js';
import { gcodeDocumento, svgDocumento } from '../src/maquina/gcode.js';
import { PERFIS } from '../src/maquina/perfis.js';
import { comporLivro, paginacao, geometria } from '../src/materiais/livro.js';

const raiz = new URL('../', import.meta.url);
const carregar = (n) => parseFonte(fs.readFileSync(new URL(`fontes/${n}.svg`, raiz), 'utf8'), n);
const fontes = { EMSBird: carregar('EMSBird'), HersheyGothEnglish: carregar('HersheyGothEnglish') };
const mao = { ...NEUTRA, seed: 7, base: [{ fonte: 'EMSBird', peso: 1 }] };
const ctx = { fontes, mao };

const r3 = (v) => Array.isArray(v) ? v.map(r3) : typeof v === 'number' ? Math.round(v * 1000) / 1000 + 0 : v;
const resumo = (doc) => doc.paginas.map((p) => p.camadas.map((c) => ({ id: c.id, caneta: c.caneta, n: c.tracos.length, caixa: r3(caixaDe(c.tracos)), primeiros: r3(c.tracos.slice(0, 2)) })));

const TEXTO = 'O vento cobre o vale e o moinho espera por você, viajante. '.repeat(50);
const A6 = papel('A6');
const base = { papel: A6, tamanho: 4, entrelinha: 1.5, titulo: 'Vale', inicio: 5 };

// caixa de cada palavra do texto (blocos de `grupos`)
const palavras = (c) => c.grupos.map((g, k) => caixaDe(c.tracos.slice(g, c.grupos[k + 1] ?? c.tracos.length)));
const dentroDe = (c, f, e = 0.5) => c.x >= f.x - e && c.y >= f.y - e && c.x + c.l <= f.x + f.l + e && c.y + c.a <= f.y + f.a + e;
const toca = (tracos, caixas) => tracos.some((t) => reamostrar(t, 0.2).some(([x, y]) => caixas.some((b) => x > b.x && x < b.x + b.l && y > b.y && y < b.y + b.a)));
const camada = (doc, i, id) => doc.paginas[i].camadas.find((c) => c.id === id);

for (const colunas of [1, 2]) {
  test(`livro ${colunas} coluna(s): paginação em ≥ 3 páginas`, () => {
    const cfg = { ...base, colunas, capitular: { estilo: 'lombarda', linhas: 3 } };
    const doc = comporLivro(TEXTO, ctx, cfg);
    const n = doc.paginas.length;
    assert.ok(n >= 3, `páginas: ${n}`);
    assert.deepEqual(validarDocumento(doc), []);
    // plano do PRÓPRIO documento (sem capitular): mesma área de texto, entrelinha e alinhamento do comporLivro
    const Gt = geometria(A6, { ...base }).texto;
    const mt = { topo: Gt.y, esq: Gt.x, dir: A6.largura - Gt.x - Gt.l, base: A6.altura - Gt.y - Gt.a };
    const r = compor(TEXTO, fontes, mao, { ...A6, margens: mt }, { tamanho: 4, entrelinha: 1.5, alinhamento: 'justificado', colunas });
    const plano = paginacao(r, base);
    const sem = comporLivro(TEXTO, ctx, { ...base, colunas });
    assert.equal(sem.paginas.length, plano.length);
    plano.forEach((p, i) => {
      assert.equal(p.numero, String(5 + i));
      assert.equal(p.cabecalho, i === 0 ? null : 'Vale');
      assert.equal(p.reclamo, i === plano.length - 1 ? null : r.ancoras.find((a) => a.pagina === i + 1).texto);
      assert.equal(camada(sem, i, 'paginacao').tracos.length > 0, true);
    });
    assert.equal(paginacao(r, { ...base, cabecalhoNaPrimeira: true })[0].cabecalho, 'Vale');
    assert.equal(paginacao(r, { ...base, numeracao: false, reclamo: false })[0].numero, null);

    const G = geometria(A6, { ...base });
    for (let i = 0; i < n; i++) {
      const pal = palavras(camada(doc, i, 'texto')), pg = camada(doc, i, 'paginacao').tracos;
      const cx = G.pe.x + G.pe.l / 2;
      const nT = pg.filter((t) => Math.abs(caixaDe([t]).x + caixaDe([t]).l / 2 - cx) < G.pe.l * 0.15 && caixaDe([t]).x < cx + 4);
      const nCaixa = caixaDe(nT);
      assert.ok(Math.abs(nCaixa.x + nCaixa.l / 2 - cx) <= 0.5, `número centrado p${i}`);
      assert.ok(dentroDe(nCaixa, G.pe, 0.01), `número no rodapé p${i}`);
      const rest = pg.filter((t) => !nT.includes(t));
      if (i < n - 1) {
        const rc = caixaDe(rest);
        assert.ok(Math.abs(rc.x + rc.l - (G.area.x + G.area.l)) <= 0.5, `reclamo à direita p${i}`);
        assert.ok(dentroDe(rc, G.pe, 0.01), `reclamo no rodapé p${i}`);
        assert.ok(!toca(rest, [nCaixa]), 'reclamo toca número');
      } else assert.equal(rest.length, 0);
      assert.ok(!toca(pg, pal), `rodapé sobre palavra p${i}`);
      const cab = camada(doc, i, 'rubrica').tracos.filter((t) => caixaDe([t]).y < G.topo.y + G.topo.a);
      if (i > 0) {
        const cc = caixaDe(cab);
        assert.ok(cab.length && dentroDe(cc, G.topo, 0.01), `cabeçalho na faixa p${i}`);
        assert.ok(Math.abs(cc.x + cc.l / 2 - (G.area.x + G.area.l / 2)) <= 0.5, 'cabeçalho centrado');
        assert.ok(!toca(cab, pal));
      }
    }
    // capitular na página 0 não sobrepõe o texto
    const cap = camada(doc, 0, 'rubrica').tracos;
    assert.ok(cap.length > 0);
    assert.ok(!toca(cap, palavras(camada(doc, 0, 'texto'))));
    assert.deepEqual(doc.paginas.map((p) => p.camadas.map((c) => [c.id, c.caneta])), Array(n).fill([['texto', 'preta'], ['paginacao', 'preta'], ['iluminura', 'preta'], ['rubrica', 'vermelha']]));
  });
}

test('livro: 2 colunas têm âncoras nas colunas 0 e 1 da mesma página', () => {
  const G = geometria(A6, { ...base });
  const r = compor(TEXTO, fontes, mao, { ...A6, margens: { topo: G.texto.y, esq: G.texto.x, dir: 9, base: 9 } }, { tamanho: 4, colunas: 2 });
  assert.ok(r.ancoras.some((a) => a.pagina === 0 && a.coluna === 0) && r.ancoras.some((a) => a.pagina === 0 && a.coluna === 1));
});

test('livro: colunas 3 lança; sem capitular em texto que não começa com letra; borda e rubrica falsa', () => {
  assert.throws(() => comporLivro(TEXTO, ctx, { ...base, colunas: 3 }), /1 ou 2 colunas/);
  const d = comporLivro('123 ' + TEXTO, ctx, { ...base, capitular: { estilo: 'lombarda' }, borda: { estilo: 'linhas', largura: 4 }, rubrica: false });
  assert.ok(d.avisos.some((a) => a.startsWith('capitular')));
  assert.ok(!d.canetas.vermelha && d.paginas[0].camadas[3].caneta === 'preta');
  assert.ok(d.paginas[0].camadas[2].tracos.length > 0);
  assert.deepEqual(validarDocumento(d), []);
  assert.deepEqual(comporLivro(TEXTO, ctx, base), comporLivro(TEXTO, ctx, base));
});

test('golden livro: A7, 2 colunas, capitular lombarda, 3 páginas', (t) => {
  const doc = comporLivro(TEXTO.repeat(3), ctx, { papel: papel('A7'), tamanho: 3, entrelinha: 1.4, colunas: 2, titulo: 'Vale', capitular: { estilo: 'lombarda', linhas: 3 } });
  assert.ok(doc.paginas.length >= 3, `páginas: ${doc.paginas.length}`);
  assert.deepEqual(validarDocumento(doc), []);
  t.assert.snapshot(resumo(doc));
});

// menor distância entre pontos da camada texto e da iluminura
const minDist = (a, b) => { let m = Infinity; for (const [x, y] of a) for (const [u, v] of b) m = Math.min(m, Math.hypot(x - u, y - v)); return m; };
const pontos = (tr) => tr.flatMap((t) => reamostrar(t, 0.5));

test('livro: texto a ≥ 0,8 mm da iluminura com borda', () => {
  for (const estilo of ['vinha', 'linhas']) for (const colunas of [1, 2]) {
    const doc = comporLivro(TEXTO, ctx, { ...base, colunas, borda: { estilo, largura: 6 } });
    const ilum = pontos(camada(doc, 0, 'iluminura').tracos);
    assert.ok(ilum.length > 0);
    for (const i of [0, 1]) {
      const d = minDist(pontos(camada(doc, i, 'texto').tracos), ilum);
      assert.ok(d >= 0.8, `${estilo} ${colunas}col p${i}: ${d.toFixed(2)} mm`);
    }
  }
});

test('livro: exporta por camada (svg e gcode)', () => {
  const doc = comporLivro(TEXTO, ctx, { ...base, borda: { estilo: 'linhas', largura: 4 } });
  const pg = doc.paginas[1];
  const svg = svgDocumento(pg, doc.papel, doc.canetas, { camadas: ['paginacao'] });
  assert.ok(svg.includes('<svg') && svg.includes('<path'));
  assert.ok(!svgDocumento(pg, doc.papel, doc.canetas, { camadas: ['iluminura'] }).includes('Vale'));
  const g = gcodeDocumento(pg, doc.papel, PERFIS.megaS, { camadas: ['paginacao'], canetas: doc.canetas });
  const tudo = gcodeDocumento(pg, doc.papel, PERFIS.megaS, { canetas: doc.canetas });
  assert.deepEqual(g.avisos, []);
  assert.equal(g.nTracos, camada(doc, 1, 'paginacao').tracos.length);
  assert.ok(g.nTracos < tudo.nTracos);
});
