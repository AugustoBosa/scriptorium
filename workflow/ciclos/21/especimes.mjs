// Fichas de espécimes do M19 (ciclo 21), §6 do projeto.md. Descartável: gera folha-1..7.svg ao lado deste arquivo.
// Rodar da raiz do repo: node workflow/ciclos/21/especimes.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFonte } from '../../../src/fonte.js';
import { problemas } from '../../../src/geo.js';
import { NEUTRA } from '../../../src/motor/mao.js';
import { circulo, circuloAleatorio, selo } from '../../../src/arcano/circulo.js';
import { sigiloPalavra } from '../../../src/arcano/sigilo.js';
import { gerarAlfabeto, LETRAS } from '../../../src/arcano/alfabeto.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const SEED = 7;
const fontes = {};
for (const nome of ['EMSBird', 'HersheySans1', 'EMSDelight']) {
  try { fontes[nome] = parseFonte(readFileSync(join(DIR, '../../../fontes', nome + '.svg'), 'utf8'), nome); }
  catch (e) { console.warn(`fonte ${nome} indisponivel: ${e.message}`); }
}
// ctx de texto em arco (mão completa); sem EMSBird cai no alfabeto arcano (undefined)
const CTX = fontes.EMSBird ? { fontes: { EMSBird: fontes.EMSBird }, mao: { ...NEUTRA, base: [{ fonte: 'EMSBird', peso: 1 }], seed: SEED } } : undefined;
const CTX_FUSAO = { fontes: { HersheySans1: fontes.HersheySans1, EMSDelight: fontes.EMSDelight } };

const fmt = (n) => Math.round(n * 1000) / 1000;
const caminho = (tr) => tr.map((t) => 'M' + t.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join(' L')).join(' ');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const texto = (x, y, s, tam = 2) => `<text x="${x}" y="${y}" font-size="${tam}" font-family="sans-serif">${esc(s)}</text>`;
const NOTA = 'traço 0,3 mm · caixa tracejada = caixa do espécime · legenda = params';

function folha(n, titulo, W = 297) {
  return { n, titulo, W, els: [], x: 10, y: 18, linhaH: 0, stats: { itens: 0, erros: 0, problemas: 0 } };
}
const nova = (F) => { F.y += F.linhaH ? F.linhaH + 6 : 0; F.x = 10; F.linhaH = 0; };
const secao = (F, t) => { nova(F); F.els.push(texto(10, F.y + 3, t, 3)); F.y += 7; };

// Espécime no fluxo da folha: caixa tracejada, traços, legenda. zoom > 1 amplia tudo (traço fica 0,3 mm real).
// extra(loc) desenha traços em cinza (grade do kamea); erro de gerador vai para a legenda.
function item(F, { w, h, lin = [], f, zoom = 1, extra }) {
  const k = zoom, alt = h + 3 + 2.4 * (lin.length + 1);
  if (F.x > 10 && F.x + w > F.W - 10) nova(F);
  const p = { x: F.x, y: F.y };
  F.x += w + 6;
  F.linhaH = Math.max(F.linhaH, alt);
  const loc = { x: 0, y: 0, l: w / k, a: h / k };
  let tr = [], erro = null;
  try { tr = f(loc); } catch (e) { erro = e.message; }
  F.stats.itens++;
  if (erro) { F.stats.erros++; console.log(`folha ${F.n} [${lin.join(' ')}] ERRO: ${erro}`); }
  const pr = problemas(tr, loc);
  if (pr.length) { F.stats.problemas += pr.length; console.log(`folha ${F.n} [${lin.join(' ')}]: ${pr.slice(0, 3).join('; ')}`); }
  F.els.push(
    `<g transform="translate(${p.x} ${p.y}) scale(${k})">`,
    `<rect x="0" y="0" width="${loc.l}" height="${loc.a}" fill="none" stroke="#999" stroke-width="${0.2 / k}" stroke-dasharray="${0.8 / k} ${0.8 / k}"/>`,
  );
  if (extra) F.els.push(`<path d="${caminho(extra(loc))}" fill="none" stroke="#888" stroke-width="${0.2 / k}"/>`);
  F.els.push(`<path d="${caminho(tr)}" fill="none" stroke="#000" stroke-width="${0.3 / k}" stroke-linejoin="round" stroke-linecap="round"/>`, '</g>');
  const legenda = erro ? [...lin, 'ERRO: ' + erro] : lin;
  legenda.forEach((s, i) => F.els.push(texto(p.x, p.y + h + 3 + i * 2.4, s, 1.9)));
}

function salvar(F, nota) {
  const H = Math.ceil(Math.max(120, F.y + F.linhaH + 16));
  const W = F.W;
  const barra = `<path d="M10 ${H - 6} H20 M10 ${H - 7} V${H - 5} M20 ${H - 7} V${H - 5}" fill="none" stroke="#000" stroke-width="0.3"/>` + texto(21, H - 5.2, '10 mm', 2);
  const cab = texto(10, 8, `Folha ${F.n} · ${F.titulo}`, 4) + texto(10, 13, nota, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n<rect width="${W}" height="${H}" fill="#fff"/>\n${cab}\n${F.els.join('\n')}\n${barra}\n</svg>\n`;
  writeFileSync(join(DIR, `folha-${F.n}.svg`), svg);
  console.log(`folha ${F.n}: ${F.stats.itens} itens, ${F.stats.erros} erros, ${F.stats.problemas} problemas`);
}

// 1. Anéis
{
  const F = folha(1, 'anéis');
  const TIPOS = ['linha', 'dupla', 'runas', 'texto', 'dentes', 'pontos', 'onda'];
  const anel = (tipo, largura) => ({ aneis: [{ raio: 1, tipo, largura, texto: 'anel' }] });
  for (const largura of [0.08, 0.15]) for (const d of [40, 20]) {
    secao(F, `Ø ${d} mm · largura ${largura}`);
    for (const tipo of TIPOS) item(F, { w: d, h: d, lin: [tipo, `Ø ${d} · ${largura}`], f: (c) => circulo(c, anel(tipo, largura), SEED, CTX) });
  }
  secao(F, 'detalhe ampliado 4× (Ø 20, largura 0,15)');
  for (const tipo of ['pontos', 'dentes', 'onda'])
    item(F, { w: 80, h: 80, zoom: 4, lin: [tipo, 'Ø 20 · 0,15'], f: (c) => circulo(c, anel(tipo, 0.15), SEED, CTX) });
  salvar(F, NOTA);
}

// 2. Polígonos e enfeites
{
  const F = folha(2, 'polígonos e enfeites');
  const ESTRELAS = [[5, 2], [6, 2], [7, 3], [9, 2]];
  const nua = ({ n, passo }) => ({ aneis: [{ raio: 1, tipo: 'linha' }], poligonos: [{ n, passo, raio: 0.9 }] });
  const cheia = ({ n, passo }) => ({
    aneis: [{ raio: 1, tipo: 'linha' }, { raio: 0.6, tipo: 'linha' }],
    poligonos: [{ n, passo, raio: 0.9 }],
    raios: { n: 12, de: 0.6, ate: 0.95 },
    nos: { n, raio: 0.9, tamanho: 0.07 },
    satelites: { n, raio: 0.45, tamanho: 0.1 },
  });
  secao(F, 'estrelas nuas (Ø 40)');
  for (const [n, passo] of ESTRELAS) item(F, { w: 40, h: 40, lin: [`{${n}/${passo}}`], f: (c) => circulo(c, nua({ n, passo }), SEED, CTX) });
  secao(F, 'com raios, nós e satélites (Ø 40)');
  for (const [n, passo] of ESTRELAS) item(F, { w: 40, h: 40, lin: [`{${n}/${passo}} + enfeites`], f: (c) => circulo(c, cheia({ n, passo }), SEED, CTX) });
  secao(F, 'detalhe ampliado 4× de um nó (Ø 20; vão limpo em volta)');
  item(F, { w: 80, h: 80, zoom: 4, lin: ['{7/3} + enfeites, Ø 20'], f: (c) => circulo(c, cheia({ n: 7, passo: 3 }), SEED, CTX) });
  salvar(F, NOTA);
}

// 3. Aleatórios
{
  const F = folha(3, 'aleatórios');
  secao(F, 'circuloAleatorio · Ø 50 mm · complexidade × seed');
  for (const cx of [0, 0.3, 0.6, 1]) for (const seed of [1, 2, 3])
    item(F, { w: 50, h: 50, lin: [`complexidade ${cx}`, `seed ${seed}`], f: (c) => circulo(c, circuloAleatorio(seed, cx), seed, CTX) });
  salvar(F, NOTA);
}

// 4. Texto em arco
{
  const F = folha(4, 'texto em arco');
  const FRASE = 'que a luz guarde esta casa';
  const arco = (sentido) => ({ aneis: [{ raio: 1, tipo: 'texto', largura: 0.3, texto: FRASE, sentido, inicio: sentido === 1 ? -Math.PI / 2 : Math.PI / 2 }] });
  for (const [nome, ctx] of [['EMSBird', CTX], ['arcano', undefined]]) {
    secao(F, `${nome}: sentido 1 (topo) e −1 (embaixo)`);
    for (const d of [60, 25]) for (const sentido of [1, -1])
      item(F, { w: d, h: d, lin: [`${nome} · Ø ${d}`, `sentido ${sentido}`], f: (c) => circulo(c, arco(sentido), SEED, ctx) });
  }
  salvar(F, NOTA);
}

// 5. Selos
{
  const F = folha(5, 'selos');
  const VARIANTES = [
    ['texto, sem pontas', { texto: 'selo' }],
    ['texto, 5 pontas', { texto: 'selo', pontas: 5 }],
    ['sem texto (runas), 7 pontas', { pontas: 7 }],
    ['centro runa, 5 pontas', { pontas: 5 }],
    ['centro sigilo, 5 pontas', { pontas: 5, sigilo: true }],
  ];
  for (const d of [30, 50]) {
    secao(F, `selo Ø ${d} mm`);
    for (const [lin, v] of VARIANTES) item(F, {
      w: d, h: d, lin: [lin, `Ø ${d}`],
      f: (c) => {
        const { sigilo, ...opts } = v;
        const centro = sigilo ? { tipo: 'tracos', raio: 0.3, tracos: sigiloPalavra({ x: 0, y: 0, l: d, a: d }, { frase: 'abracadabra', metodo: 'kamea' }, 1) } : undefined;
        return selo(c, { ...opts, centro }, SEED, CTX);
      },
    });
  }
  salvar(F, NOTA);
}

// 6. Sigilos de palavra
{
  const F = folha(6, 'sigilos de palavra');
  const FRASES = ['abracadabra', 'eu sou forte', 'proteção'];
  const grade = (c, n) => {
    const Q = 0.9 * Math.min(c.l, c.a), e = Q / n, x0 = (c.l - Q) / 2, y0 = (c.a - Q) / 2, L = [];
    for (let i = 0; i <= n; i++) L.push([[x0, y0 + i * e], [x0 + Q, y0 + i * e]], [[x0 + i * e, y0], [x0 + i * e, y0 + Q]]);
    return L;
  };
  secao(F, 'kamea 3/4/5/6 (grade cinza = quadrado de Agrippa)');
  for (const frase of FRASES) for (const ordem of [3, 4, 5, 6])
    item(F, { w: 25, h: 25, lin: [frase, `kamea ${ordem}`], f: (c) => sigiloPalavra(c, { frase, metodo: 'kamea', ordem }, 1), extra: (c) => grade(c, ordem) });
  secao(F, 'roda');
  for (const frase of FRASES) item(F, { w: 25, h: 25, lin: [frase, 'roda'], f: (c) => sigiloPalavra(c, { frase, metodo: 'roda' }, 1) });
  secao(F, 'fusão (HersheySans1 e EMSDelight; 3 seeds)');
  for (const fonte of ['HersheySans1', 'EMSDelight']) for (const seed of [1, 2, 3]) for (const frase of FRASES)
    item(F, { w: 25, h: 25, lin: [frase, `fusão ${fonte}`, `seed ${seed}`], f: (c) => sigiloPalavra(c, { frase, metodo: 'fusao', fonte }, seed, CTX_FUSAO) });
  salvar(F, NOTA);
}

// 7. Alfabetos (36 glifos por forma, em grade 12 × 3)
{
  const F = folha(7, 'alfabetos');
  for (const size of [6, 3]) {
    secao(F, `36 glifos · altura ${size} mm`);
    for (const forma of ['grade', 'angular', 'curvo', 'ogham', 'pontilhado']) {
      const cel = size * 1.1, lin = size * 1.3, s = size / 700;
      item(F, {
        w: 12 * cel, h: 3 * lin, lin: [forma, `altura ${size}`],
        f: () => {
          const G = gerarAlfabeto({ seed: 1, forma }).glifos, out = [];
          [...LETRAS].forEach((ch, k) => {
            const ox = (k % 12) * cel, oy = Math.floor(k / 12) * lin;
            for (const t of G[ch].tracos) out.push(t.map(([x, y]) => [ox + x * s, oy + (700 - y) * s]));
          });
          return out;
        },
      });
    }
  }
  salvar(F, NOTA);
}
