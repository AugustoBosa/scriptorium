// Fichas de espécimes do M18 (ciclo 19). Descartável: gera folha-1..7.svg ao lado deste arquivo.
// Rodar da raiz do repo: node workflow/ciclos/19/especimes.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFonte } from '../../../src/fonte.js';
import { circulo, hachura, inset, problemas, retDe } from '../../../src/geo.js';
import { no } from '../../../src/ornamento/no.js';
import { vinha } from '../../../src/ornamento/vinha.js';
import { borda, miolo } from '../../../src/ornamento/borda.js';
import { capitular, caixaCapitular } from '../../../src/ornamento/capitular.js';
import { filigrana } from '../../../src/ornamento/filigrana.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const SEED = 7;
const G = 'HersheyGothEnglish';
const fontes = {};
for (const nome of [G, 'HersheySerifBold', 'HersheyScript1', 'EMSDelight']) {
  try { fontes[nome] = parseFonte(readFileSync(join(DIR, '../../../fontes', nome + '.svg'), 'utf8'), nome); }
  catch (e) { console.warn(`fonte ${nome} indisponivel: ${e.message}`); }
}

const fmt = (n) => Math.round(n * 1000) / 1000;
const caminho = (tr) => tr.map((t) => 'M' + t.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join(' L')).join(' ');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const texto = (x, y, s, tam = 2) => `<text x="${x}" y="${y}" font-size="${tam}" font-family="sans-serif">${esc(s)}</text>`;

function folha(n, titulo, W = 297) {
  return { n, titulo, W, els: [], erros: [], x: 10, y: 18, linhaH: 0, fixoH: 0, stats: { itens: 0, erros: 0, problemas: 0, miolo: 0 } };
}
const nova = (F) => { F.y += F.linhaH ? F.linhaH + 6 : 0; F.x = 10; F.linhaH = 0; };
const secao = (F, t) => { nova(F); F.els.push(texto(10, F.y + 3, t, 3)); F.y += 7; };
const trace = (F, tr, cor = '#000', lw = 0.3) =>
  F.els.push(`<path d="${caminho(tr)}" fill="none" stroke="${cor}" stroke-width="${lw}" stroke-linejoin="round" stroke-linecap="round"/>`);

// Espécime no fluxo da folha: caixa tracejada, traços, legenda. zoom > 1 amplia tudo (traço fica 0,3 mm real).
function item(F, { w, h, lin = [], f, zoom = 1, extra, area }) {
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
  const g = [
    `<g transform="translate(${p.x} ${p.y}) scale(${k})">`,
    `<rect x="0" y="0" width="${loc.l}" height="${loc.a}" fill="none" stroke="#999" stroke-width="${0.2 / k}" stroke-dasharray="${0.8 / k} ${0.8 / k}"/>`,
  ];
  if (area) {
    const A = area(loc);
    g.push(`<rect x="${A.x}" y="${A.y}" width="${A.l}" height="${A.a}" fill="#ddd" opacity="0.6"/>`);
    const n = tr.flat().filter(([x, y]) => x > A.x + 1e-6 && x < A.x + A.l - 1e-6 && y > A.y + 1e-6 && y < A.y + A.a - 1e-6).length;
    if (n) { F.stats.miolo += n; console.log(`folha ${F.n} [${lin[0]}]: ${n} pts dentro do miolo`); }
  }
  if (extra) g.push(`<path d="${caminho(extra(loc))}" fill="none" stroke="#888" stroke-width="${0.2 / k}"/>`);
  g.push(`<path d="${caminho(tr)}" fill="none" stroke="#000" stroke-width="${0.3 / k}" stroke-linejoin="round" stroke-linecap="round"/>`, '</g>');
  F.els.push(...g);
  const legenda = erro ? [...lin, 'ERRO: ' + erro] : lin;
  legenda.forEach((s, i) => F.els.push(texto(p.x, p.y + h + 3 + i * 2.4, s, 1.9)));
}

// Gera um traço sem espécime (folha 7); erro vai para a legenda do topo.
const seg = (F, fn) => { try { return fn(); } catch (e) { F.erros.push(e.message); return []; } };

function salvar(F, nota) {
  const H = F.fixoH || Math.ceil(Math.max(120, F.y + F.linhaH + 16));
  const W = F.W;
  const barra = `<path d="M10 ${H - 6} H20 M10 ${H - 7} V${H - 5} M20 ${H - 7} V${H - 5}" fill="none" stroke="#000" stroke-width="0.3"/>` + texto(21, H - 5.2, '10 mm', 2);
  const cab = texto(10, 8, `Folha ${F.n} · ${F.titulo}`, 4) + texto(10, 13, nota, 2) +
    F.erros.map((e, i) => texto(10, 17 + i * 3, 'ERRO: ' + e, 2)).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n<rect width="${W}" height="${H}" fill="#fff"/>\n${cab}\n${F.els.join('\n')}\n${barra}\n</svg>\n`;
  writeFileSync(join(DIR, `folha-${F.n}.svg`), svg);
  console.log(`folha ${F.n}: ${F.stats.itens} itens, ${F.stats.erros} erros, ${F.stats.problemas} problemas, ${F.stats.miolo} pts no miolo`);
}

const NOTA = 'traço 0,3 mm · caixa tracejada = caixa do espécime · legenda = params';

// 1. Hachura
{
  const F = folha(1, 'hachura');
  const formas = {
    retangulo: (c) => [retDe(inset(c, 2))],
    triangulo: (c) => [[[c.x + c.l / 2, c.y + 2], [c.x + c.l - 2, c.y + c.a - 2], [c.x + 2, c.y + c.a - 2], [c.x + c.l / 2, c.y + 2]]],
    anel: (c) => {
      const cx = c.x + c.l / 2, cy = c.y + c.a / 2, r = Math.min(c.l, c.a) / 2 - 2;
      return [circulo(cx, cy, r, 48), circulo(cx, cy, r / 2, 48)];
    },
  };
  for (const espaco of [0.5, 1, 2]) {
    secao(F, `espaço ${espaco} mm`);
    for (const nome of Object.keys(formas)) for (const angulo of [0, 45, 90])
      item(F, { w: 24, h: 24, lin: [`${nome} ${angulo}°`, `espaço ${espaco}`], f: (c) => hachura(formas[nome](c), { angulo, espaco }) });
  }
  secao(F, 'cruzada (45° + 135°), espaço 1');
  for (const nome of Object.keys(formas))
    item(F, { w: 24, h: 24, lin: [nome, 'cruzada'], f: (c) => hachura(formas[nome](c), { angulo: 45, espaco: 1, cruzada: true }) });
  salvar(F, NOTA);
}

// 2. Nó
{
  const F = folha(2, 'nó');
  const N = (p) => (c) => no(c, p, SEED);
  secao(F, 'células × quebras (simetria quádrupla)');
  for (const celulas of [2, 4, 8]) for (const quebras of [0, 0.15, 0.5])
    item(F, { w: 22, h: 22, lin: [`células ${celulas}`, `quebras ${quebras}`], f: N({ celulas, quebras }) });
  secao(F, 'simetria · fita · vão · moldura (células 4)');
  for (const simetria of ['nenhuma', 'espelho', 'quadrupla'])
    item(F, { w: 22, h: 22, lin: [`simetria ${simetria}`, 'quebras 0.5'], f: N({ celulas: 4, quebras: 0.5, simetria }) });
  for (const fita of [0, 0.12, 0.2])
    item(F, { w: 22, h: 22, lin: [`fita ${fita}`, 'quebras 0.15'], f: N({ celulas: 4, quebras: 0.15, fita }) });
  for (const vao of [0.02, 0.15])
    item(F, { w: 22, h: 22, lin: [`vão ${vao}`, 'quebras 0.15'], f: N({ celulas: 4, quebras: 0.15, vao }) });
  for (const aro of [1, 2])
    item(F, { w: 22, h: 22, lin: [`moldura ${aro}`, 'células 6'], f: N({ celulas: 6, aro, quebras: 0.15 }) });
  secao(F, 'faixa 60 × 8');
  item(F, { w: 60, h: 8, lin: ['faixa 60×8', 'células 4'], f: N({ celulas: 4, quebras: 0.15 }) });
  secao(F, 'detalhe ampliado 4× (cruzamento; traço real 0,3 mm)');
  item(F, { w: 32, h: 32, zoom: 4, lin: ['células 2, quebras 0', 'fita 0.12, vão 0.06'], f: N({ celulas: 2, quebras: 0 }) });
  salvar(F, NOTA);
}

// 3. Vinha
{
  const F = folha(3, 'vinha');
  const rot = (p, seed) => Object.entries(p).map(([k, v]) => `${k} ${v}`).join(' · ') + ` · seed ${seed}`;
  const V = (p, seed = SEED) => item(F, { w: 120, h: 12, lin: [rot(p, seed)], f: (c) => vinha(c, p, seed) });
  secao(F, 'densidade 0,2 / 0,5 / 1');
  for (const densidade of [0.2, 0.5, 1]) V({ densidade });
  secao(F, 'curvatura 0 / 1 (densidade 0,5)');
  for (const curvatura of [0, 1]) V({ densidade: 0.5, curvatura });
  secao(F, 'só folhas · só frutos · só espirais (densidade 0,5)');
  V({ densidade: 0.5, folhas: 1, frutos: 0, espirais: 0 });
  V({ densidade: 0.5, folhas: 0, frutos: 1, espirais: 0 });
  V({ densidade: 0.5, folhas: 0, frutos: 0, espirais: 1 });
  secao(F, 'seeds 1 / 2 / 3 (padrão)');
  for (const seed of [1, 2, 3]) V({}, seed);
  salvar(F, NOTA);
}

// 4. Borda
{
  const F = folha(4, 'borda');
  const estilos = ['linhas', 'barra', 'vinha', 'no'];
  const bi = (p) => ({ w: 60, h: 40, lin: [`${p.estilo} · lados ${p.lados}`, `cantos ${p.cantos} · largura ${p.largura}`], f: (c) => borda(c, p, SEED), area: (c) => miolo(c, p) });
  secao(F, 'estilo × cantos (lados todos); área cinza = miolo, nada pode entrar');
  for (const estilo of estilos) {
    nova(F);
    for (const cantos of ['losango', 'trevo', 'no']) item(F, bi({ estilo, cantos, lados: 'todos', largura: 10 }));
  }
  secao(F, 'lados: esquerda e topo-base (cantos losango)');
  for (const estilo of estilos) {
    nova(F);
    for (const lados of ['esquerda', 'topo-base']) item(F, bi({ estilo, cantos: 'losango', lados, largura: 10 }));
  }
  salvar(F, NOTA);
}

// 5. Capitular
{
  const F = folha(5, 'capitular');
  const CAP = (p) => (c) => capitular(c, { fonte: G, ...p }, SEED, fontes);
  const estilos = ['lombarda', 'contornada', 'habitada', 'filigranada', 'no'];
  secao(F, 'estilo × letra (gótica inglesa, 3 linhas)');
  for (const estilo of estilos) {
    nova(F);
    for (const letra of ['A', 'M', 'Q', 'É']) item(F, { w: 30, h: 30, lin: [estilo, `letra ${letra}`], f: CAP({ estilo, letra }) });
  }
  secao(F, 'fontes (lombarda, letra A)');
  nova(F);
  for (const fonte of [G, 'HersheySerifBold'])
    item(F, { w: 30, h: 30, lin: [fonte], f: CAP({ estilo: 'lombarda', letra: 'A', fonte }) });
  secao(F, 'hachura de fundo (lombarda, letra M): 0 e 1');
  nova(F);
  for (const hq of [0, 1]) item(F, { w: 30, h: 30, lin: [`hachura ${hq}`], f: CAP({ estilo: 'lombarda', letra: 'M', hachura: hq }) });
  secao(F, 'linhas 2 / 4 / 8 com pautas cinza');
  nova(F);
  for (const linhas of [2, 4, 8]) {
    const c = caixaCapitular({ x: 0, y: 0, linhas, entrelinha: 6 });
    item(F, {
      w: c.l + 34, h: c.a + 2, lin: [`linhas ${linhas}`],
      f: () => capitular(c, { estilo: 'lombarda', letra: 'A', fonte: G, linhas }, SEED, fontes),
      extra: () => Array.from({ length: linhas }, (_, k) => [[c.l + 2, (k + 0.8) * 6], [c.l + 32, (k + 0.8) * 6]]),
    });
  }
  salvar(F, NOTA);
}

// 6. Filigrana
{
  const F = folha(6, 'filigrana');
  const FI = (p) => (c) => filigrana(c, p, SEED);
  secao(F, 'preenchimento: padrão (passo 2.5)');
  for (const padrao of ['onda', 'ziguezague', 'lacos', 'pontos'])
    item(F, { w: 80, h: 8, lin: [`padrão ${padrao}`], f: FI({ tipo: 'preenche', padrao, passo: 2.5 }) });
  secao(F, 'preenchimento: irregularidade 0 / 0,5 / 1 (ziguezague)');
  for (const irregular of [0, 0.5, 1])
    item(F, { w: 80, h: 8, lin: [`irregular ${irregular}`], f: FI({ tipo: 'preenche', padrao: 'ziguezague', irregular }) });
  secao(F, 'pé-de-mosca, manícula, florão (ampliados 3×, traço real)');
  item(F, { w: 24, h: 30, zoom: 3, lin: ['pé-de-mosca'], f: FI({ tipo: 'pe-de-mosca' }) });
  item(F, { w: 48, h: 24, zoom: 3, lin: ['manícula'], f: FI({ tipo: 'manicula' }) });
  for (const petalas of [3, 5, 8])
    item(F, { w: 30, h: 30, zoom: 3, lin: [`florão ${petalas} pétalas`], f: FI({ tipo: 'florao', petalas }) });
  secao(F, 'separadores (40 × 6)');
  for (const separador of ['losango', 'asteriscos', 'onda'])
    item(F, { w: 40, h: 6, lin: [`separador ${separador}`], f: FI({ tipo: 'separador', separador }) });
  salvar(F, NOTA);
}

// 7. Página montada (A5, 148 × 210)
{
  const F = folha(7, 'página montada (A5)', 148);
  F.fixoH = 232;
  const page = { x: 0, y: 0, l: 148, a: 210 };
  const pb = { estilo: 'vinha', cantos: 'trevo', lados: 'todos', largura: 8 };
  F.els.push('<g transform="translate(0 22)">');
  F.els.push(`<rect x="0" y="0" width="148" height="210" fill="none" stroke="#999" stroke-width="0.2" stroke-dasharray="0.8 0.8"/>`);
  trace(F, seg(F, () => borda(page, pb, SEED)));
  trace(F, seg(F, () => capitular(caixaCapitular({ x: 18, y: 18, linhas: 4, entrelinha: 10 }),
    { estilo: 'habitada', letra: 'M', fonte: G, linhas: 4 }, SEED, fontes)));
  const pautas = [];
  for (let k = 0; k < 14; k++) {
    const y = 18 + (k + 0.8) * 10, x0 = k < 4 ? 62 : 18;
    pautas.push([[x0, y], [130, y]]);
  }
  trace(F, pautas, '#999', 0.2);
  trace(F, seg(F, () => filigrana({ x: 44, y: 166, l: 60, a: 6 }, { tipo: 'separador', separador: 'losango' }, SEED)));
  trace(F, seg(F, () => filigrana({ x: 18, y: 180, l: 112, a: 6 }, { tipo: 'preenche', padrao: 'onda' }, SEED)));
  F.els.push('</g>');
  salvar(F, 'borda vinha/trevo, largura 8 · capitular habitada M, 4 linhas · pautas cinza no miolo');
}
