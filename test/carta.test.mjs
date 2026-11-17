import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFonte } from '../src/fonte.js';
import { NEUTRA } from '../src/motor/mao.js';
import { caixaDe } from '../src/geo.js';
import { gcodeDocumento, svgDocumento } from '../src/maquina/gcode.js';
import { PERFIS } from '../src/maquina/perfis.js';
import { papel as fabricaPapel, validarDocumento } from '../src/materiais/documento.js';
import { comporCarta, PRESETS } from '../src/materiais/carta.js';
import { caixasPalavras, sobrepoe } from '../src/materiais/notas.js';

const raiz = new URL('../', import.meta.url);
const lerFonte = (n) => parseFonte(fs.readFileSync(new URL(`fontes/${n}.svg`, raiz), 'utf8'), n);
const fontes = { EMSBird: lerFonte('EMSBird'), EMSAllure: lerFonte('EMSAllure') };
const ctx = {
  fontes,
  mao: { ...NEUTRA, seed: 3, base: [{ fonte: 'EMSBird', peso: 1 }], tremor: 0.05, ondulacao: 0.3, deriva: 0.3, variacao: 0.3 },
  maoNotas: { ...NEUTRA, seed: 5, base: [{ fonte: 'EMSAllure', peso: 1 }], tremor: 0.2 },
};
const A5 = fabricaPapel('A5');
const r3 = (v) => Array.isArray(v) ? v.map(r3) : typeof v === 'number' ? Math.round(v * 1000) / 1000 + 0 : v;
const resumo = (doc) => doc.paginas.map((pg) => pg.camadas.map((c) => ({ id: c.id, caneta: c.caneta, n: c.tracos.length, caixa: r3(caixaDe(c.tracos)), primeiros: r3(c.tracos.slice(0, 2)) })));

// 80 palavras; notas nas palavras 4, 18 e 40; correção na 9, sublinhado na 25, laço na 33
const PAL = 'a lua cheia sobe devagar sobre o mar escuro e a noite fica calma enquanto os barcos dormem no porto velho onde ninguém passa quando o vento muda de lado e traz o cheiro de sal sobre as casas pequenas da vila que acorda cedo para ver o sol nascer atrás do morro grande perto da igreja branca onde os sinos tocam sozinhos todas as manhãs sem pressa nenhuma enquanto as gaivotas voltam para os telhados'.split(' ');
const TEXTO = PAL.map((w, i) => ({
  4: `${w}{nota: uma nota curta}`,
  18: `${w} {nota: esta nota é bem mais longa e passa de uma linha na margem estreita, com várias palavras para encher}`,
  40: `${w}{nota: a terceira}`, 9: '{~escuro~>claro}', 25: '{_sal_}', 33: '{o:pequenas}',
}[i] ?? w)).join(' ');

// Faixa/calha esperadas (mesma conta do material) para checar que nota marginal fica na faixa.
const regiao = (tipo) => {
  const p = PRESETS[tipo], util = A5.largura - 24, fl = (p.faixa ?? 0) * util, calha = 3 + 1.8;
  if (p.marginalia === 'direita') return [A5.largura - 12 - fl - calha, A5.largura - 12];
  if (p.marginalia === 'esquerda') return [12, 12 + fl + calha];
  return null;
};

for (const tipo of Object.keys(PRESETS)) for (const conector of ['linha', 'chave', 'seta']) for (const espontaneo of [0, 0.5, 1]) for (const seed of [1, 2, 3]) {
  test(`carta ${tipo}/${conector}/esp ${espontaneo}/seed ${seed}: nota não sobrepõe texto`, () => {
    const cfg = { papel: A5, tipo, conector, espontaneo, seed };
    const doc = comporCarta(TEXTO, ctx, cfg);
    assert.deepEqual(validarDocumento(doc), []);
    assert.deepEqual(comporCarta(TEXTO, ctx, cfg), doc);
    // carta não tem margem (nota marginal descartada é esperada); o laço nunca pode ser descartado; anotação/diário: nada descartado
    assert.deepEqual(doc.avisos.filter((a) => /descartad/.test(a) && (tipo !== 'carta' || a.startsWith('laço'))), []);
    const reg = regiao(tipo);
    for (const pg of doc.paginas) {
      const [texto, notas] = pg.camadas;
      const caixas = caixasPalavras(texto.tracos, texto.grupos);
      const fim = Math.max(...caixas.filter(Boolean).map((c) => c.y + c.a));
      for (const t of notas.tracos) {
        const b = caixaDe([t]);
        // alvo = a palavra de centro mais próximo, se a caixa dela (inflada 3 mm) encosta no traço; só ela pode ser tocada
        const cs = caixas.map((c, k) => c && { k, d: Math.hypot(c.x + c.l / 2 - b.x - b.l / 2, c.y + c.a / 2 - b.y - b.a / 2), c }).filter(Boolean).sort((p, q) => p.d - q.d);
        const n = cs[0].c, perto = n.x - 3 < b.x + b.l && b.x < n.x + n.l + 3 && n.y - 3 < b.y + b.a && b.y < n.y + n.a + 3;
        const alvo = perto ? [cs[0].k] : [];
        assert.equal(sobrepoe([t], caixas.filter((c, k) => c && !alvo.includes(k))), false, 'traço de nota sobre outra palavra');
        if (!alvo.length) assert.ok((reg && b.x >= reg[0] - 1.5 && b.x + b.l <= reg[1] + 1.5) || b.y >= fim - 1e-6, `traço fora da margem de notas: ${JSON.stringify(r3(b))}`);
      }
    }
  });
}

test('carta: presets produzem as marcas esperadas (nota marginal, risco, sublinhado, laço)', () => {
  const doc = comporCarta(TEXTO, ctx, { papel: A5, tipo: 'anotacao', seed: 1 });
  const notas = doc.paginas[0].camadas[1].tracos;
  assert.ok(notas.length > 40, `poucos traços de nota: ${notas.length}`);
  assert.ok(!doc.avisos.some((a) => /descartado|descartada|não coube/.test(a)), doc.avisos.join('\n'));
  const sem = comporCarta('a lua cheia sobe devagar', ctx, { papel: A5, tipo: 'carta', espontaneo: 0 });
  assert.deepEqual(sem.paginas[0].camadas.map((c) => c.id), ['texto', 'notas']);
  assert.equal(sem.paginas[0].camadas[1].tracos.length, 0);
});

test('carta: sem margem, nota marginal é descartada com aviso e o texto fica limpo', () => {
  const doc = comporCarta('a lua{nota: cheia} sobe', ctx, { papel: A5, tipo: 'carta' });
  assert.ok(doc.avisos.some((a) => a.startsWith('nota descartada')));
  assert.equal(doc.paginas[0].camadas[1].tracos.length, 0);
  assert.ok(!doc.avisos.some((a) => a.startsWith('tolerancia')));
});

test('carta: nota grande demais não coube → aviso, nada fora da faixa', () => {
  const doc = comporCarta(`a lua{nota: ${'palavra '.repeat(400)}} sobe`, ctx, { papel: A5, tipo: 'anotacao' });
  assert.ok(doc.avisos.some((a) => a.startsWith('nota não coube na página 1')));
});

test('carta: export por camada', () => {
  const doc = comporCarta(TEXTO, ctx, { papel: A5, tipo: 'anotacao', seed: 1 });
  const [pg] = doc.paginas, perfil = PERFIS.megaS, tudo = gcodeDocumento(pg, doc.papel, perfil, { canetas: doc.canetas });
  const por = (id) => gcodeDocumento(pg, doc.papel, perfil, { camadas: [id], canetas: doc.canetas });
  assert.equal(por('notas').nTracos + por('texto').nTracos, tudo.nTracos);
  assert.ok(por('notas').nTracos > 0 && por('texto').nTracos > 0);
  assert.equal(tudo.trocas, 1);
  assert.equal(por('notas').trocas, 0);
  const svg = (camadas) => svgDocumento(pg, doc.papel, doc.canetas, { camadas });
  assert.ok(svg(['notas']).includes('data-camada="notas"') && !svg(['notas']).includes('data-camada="texto"'));
  assert.ok(svg(['texto']).includes('data-camada="texto"') && !svg(['texto']).includes('data-camada="notas"'));
  assert.ok(svg().includes('data-camada="texto"') && svg().includes('data-camada="notas"'));
});

test('carta: duas páginas, marcas na 2ª página ficam nela', () => {
  const longo = Array(6).fill(TEXTO).join(' ');
  const doc = comporCarta(longo, ctx, { papel: A5, tipo: 'diario', seed: 2 });
  assert.ok(doc.paginas.length >= 2);
  assert.deepEqual(validarDocumento(doc), []);
  assert.ok(doc.paginas.at(-1).camadas[1].tracos.length > 0);
});

test('carta: golden anotação A6 seed 1', (t) => {
  const doc = comporCarta(TEXTO.split(' ').slice(0, 45).join(' ').replace(/\{nota: a terceira\}|\{nota: esta[^}]*\}/g, ''), ctx, { papel: fabricaPapel('A6'), tipo: 'anotacao', seed: 1 });
  t.assert.snapshot(JSON.stringify(resumo(doc), null, 1));
});
