// Círculo mágico: anéis, estrelas, raios, nós, centro e satélites; texto em arco e selo. mm, y para baixo.
import { circulo as circ, reamostrar, recortarCaixa, recortarRaio, encaixar, limpar } from '../geo.js';
import { rng } from '../rng.js';
import { escreverPalavra } from '../motor/escrita.js';
import { glifo, NEUTRA } from '../motor/mao.js';
import { gerarAlfabeto, cifrar, LETRAS } from './alfabeto.js';

export const VAO = 0.5; // mm: piso de todo vão e folga (caneta 0,4)
export const ALT_MIN = 1.5; // mm: letra menor que isso é ilegível
const TAU = 2 * Math.PI;
const SAT_PADRAO = { aneis: [{ raio: 1, tipo: 'linha' }], poligonos: [{ n: 3, raio: 0.8 }] };
export const P = { aneis: [{ raio: 1, tipo: 'linha' }], poligonos: [], raios: null, nos: null, centro: { tipo: 'nenhum' }, satelites: null };

const nSeg = (r) => Math.max(24, Math.ceil(TAU * r / 0.5));
const mdc = (a, b) => (b ? mdc(b, a % b) : a);
const polar = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
const arcana = (seed) => ({ fontes: { arcano: gerarAlfabeto({ seed }) }, mao: { ...NEUTRA, base: [{ fonte: 'arcano', peso: 1 }], seed } });
const ctxOk = (ctx) => (ctx?.fontes && ctx?.mao ? ctx : null);

// Texto dobrado num arco. arco = {c, r, inicio, sentido 1|-1, altura, centrar}; ctx = {fontes, mao completa}.
export function textoEmArco(texto, arco, ctx) {
  const { c, r, inicio = -Math.PI / 2, sentido = 1, altura, centrar = true } = arco;
  const palavras = String(texto).split(/\s+/).filter(Boolean);
  if (!palavras.length || !(r > 0) || !(altura > 0)) return [];
  const { fontes, mao } = ctx;
  const monta = (alt) => {
    const cont = new Map();
    const espaco = (glifo(fontes, mao, ' ', 0).adv + mao.espacoPalavra) * alt;
    const tracos = [];
    let X = 0;
    palavras.forEach((p, i) => {
      const w = escreverPalavra(p, { fontes, mao, tamanho: alt, cont, indice: i, t: 0, F: 0 });
      let x = 0;
      const locais = w.tracos ?? w.glifos.flatMap((g) => { const ts = g.tracos.map((t) => t.map(([px, py]) => [x + px, py])); x += g.adv; return ts; });
      for (const t of locais) if (t.length) tracos.push(t.map(([px, py]) => [X + px * w.s, py * w.s]));
      X += w.largura + espaco;
      for (const ch of p) cont.set(ch, (cont.get(ch) ?? 0) + 1);
    });
    return { tracos, L: X - espaco };
  };
  let m = monta(altura);
  const cabe = 0.95 * TAU * r;
  let alt = altura;
  if (m.L > cabe) { alt = altura * cabe / m.L; m = monta(alt); } // encolhe uma vez
  if (alt < ALT_MIN) return [];
  const a0 = inicio - (centrar ? sentido * m.L / (2 * r) : 0);
  return limpar(m.tracos.map((t) => reamostrar(t, 0.3).map(([X, Y]) => polar(c, r + sentido * Y, a0 + sentido * X / r))));
}

function anel(a, i, c, R, seed, ctx) {
  const { raio, tipo, largura = 0.1, sentido = 1, inicio = -Math.PI / 2 } = a;
  const r = raio * R, b = Math.max(largura * R, VAO), n = nSeg(r), sd = `${seed}|anel${i}`;
  const volta = (rr) => (rr > 0 ? [circ(c[0], c[1], rr, nSeg(rr))] : []);
  if (tipo === 'linha') return volta(r);
  if (tipo === 'dupla') return [...volta(r), ...volta(r - b)];
  if (tipo === 'dentes') {
    const k = Math.floor(TAU * r / Math.max(1.0, 2 * b));
    return [...volta(r), ...Array.from({ length: k }, (_, j) => { const t = inicio + TAU * j / k; return [polar(c, r, t), polar(c, r - b, t)]; })];
  }
  if (tipo === 'pontos') {
    const k = Math.floor(TAU * r / Math.max(1.2, 3 * VAO));
    const rd = Math.min(0.3, Math.max(0.15, b / 2 - 0.4)); // ponto não encosta no anel (vão ≥ 0,4 quando a banda deixa)
    return [...volta(r), ...Array.from({ length: k }, (_, j) => { const p = polar(c, r - b / 2, inicio + TAU * j / k); return circ(p[0], p[1], rd, 8); })];
  }
  if (tipo === 'onda') {
    const m = Math.max(3, Math.round(TAU * r / Math.max(2, 4 * b)));
    return [Array.from({ length: n + 1 }, (_, j) => { const t = TAU * j / n; return polar(c, r - b / 2 + (b / 2 - VAO / 2) * Math.sin(m * t), t); })];
  }
  const alt = b - 2 * VAO, rb = r - b + VAO;
  const arco = { c, r: rb, inicio, sentido, altura: alt };
  if (tipo === 'texto' && a.texto && alt >= ALT_MIN) {
    const ok = ctxOk(ctx), t = textoEmArco(ok ? a.texto : cifrar(a.texto), arco, ok ?? arcana(seed));
    if (t.length) return t;
  } // banda estreita demais para letras: cai nos dois círculos
  // runas (e texto sem texto): letras sorteadas, um espaço a cada 4–6
  const kk = alt >= ALT_MIN ? Math.floor(TAU * (r - b / 2) / (0.75 * alt)) : 0, gapDe = (q) => 4 + Math.floor(rng(`${sd}|esp|${q}`)() * 3);
  let s = '', desde = 0, q = 0, gap = gapDe(0);
  for (let j = 0; j < kk; j++) {
    if (desde === gap && j < kk - 1) { s += ' '; desde = 0; gap = gapDe(++q); }
    s += LETRAS[Math.floor(rng(`${sd}|runa|${j}`)() * 26)];
    desde++;
  }
  return [...volta(r), ...volta(r - b), ...(alt >= ALT_MIN ? textoEmArco(s, arco, arcana(seed)) : [])];
}

function poligono({ n, passo = 1, raio, rot = -Math.PI / 2 }, c, R) {
  const p = Math.max(1, passo), d = mdc(n, p);
  if (d >= n) return [];
  return Array.from({ length: d }, (_, j) => Array.from({ length: n / d + 1 }, (_, k) => polar(c, raio * R, k * p * TAU / n + rot + j * TAU / n)));
}

function centroTracos(ce, c, R, seed) {
  const r = (ce.raio ?? 0.2) * R, lado = r * Math.SQRT2;
  const quad = { x: c[0] - lado / 2, y: c[1] - lado / 2, l: lado, a: lado };
  if (ce.tipo === 'circulo') return [circ(c[0], c[1], r, nSeg(r))];
  if (ce.tipo === 'cruz') return [[[c[0] - r, c[1]], [c[0] + r, c[1]]], [[c[0], c[1] - r], [c[0], c[1] + r]]];
  if (ce.tipo === 'runa') {
    const ch = LETRAS[Math.floor(rng(`${seed}|centro`)() * LETRAS.length)];
    return encaixar(gerarAlfabeto({ seed }).glifos[ch].tracos.map((t) => t.map(([x, y]) => [x, -y])), quad);
  }
  if (ce.tipo === 'tracos' && ce.tracos?.length) return encaixar(ce.tracos, quad);
  return [];
}

export function circulo(caixa, spec = {}, seed = 1, ctx) {
  if (!(caixa.l > 0 && caixa.a > 0)) return [];
  const R = Math.min(caixa.l, caixa.a) / 2 - 0.2;
  if (!(R > 0)) return [];
  const S = { ...P, ...spec };
  const c = [caixa.x + caixa.l / 2, caixa.y + caixa.a / 2];
  let base = [
    ...S.aneis.flatMap((a, i) => anel(a, i, c, R, seed, ctx)),
    ...S.poligonos.flatMap((p) => poligono(p, c, R)),
    ...(S.raios ? Array.from({ length: S.raios.n }, (_, i) => { const t = (S.raios.rot ?? -Math.PI / 2) + TAU * i / S.raios.n; return [polar(c, S.raios.de * R, t), polar(c, S.raios.ate * R, t)]; }) : []),
  ];
  const pos = (o) => Array.from({ length: o.n }, (_, i) => polar(c, o.raio * R, (o.rot ?? -Math.PI / 2) + TAU * i / o.n));
  const nos = S.nos ? pos(S.nos).map((p) => ({ c: p, r: S.nos.tamanho * R })) : [];
  const sats = S.satelites ? pos(S.satelites).map((p) => ({ c: p, r: S.satelites.tamanho * R })) : [];
  let centro = S.centro?.tipo && S.centro.tipo !== 'nenhum' ? centroTracos(S.centro, c, R, seed) : [];
  const corta = (ts, f) => ts.flatMap((t) => recortarRaio(t, f.c, f.r + VAO)); // nada sob o enfeite
  const fc = centro.length ? [{ c, r: (S.centro.raio ?? 0.2) * R }] : [];
  for (const f of [...nos, ...sats]) { base = corta(base, f); centro = corta(centro, f); }
  for (const f of fc) base = corta(base, f);
  const enfeites = [
    ...nos.map((f) => circ(f.c[0], f.c[1], f.r, nSeg(f.r))),
    ...sats.flatMap((f, i) => circulo({ x: f.c[0] - f.r, y: f.c[1] - f.r, l: 2 * f.r, a: 2 * f.r }, { ...(S.satelites.spec ?? SAT_PADRAO), satelites: null }, `${seed}|sat|${i}`, ctx)),
  ];
  return recortarCaixa(limpar([...base, ...centro, ...enfeites]), caixa);
}

// Só sorteia; bandas dos anéis nunca se sobrepõem.
export function circuloAleatorio(seed, complexidade = 0.5) {
  const c = complexidade, x = (k) => rng(`${seed}|aleat|${k}`)();
  const nAneis = 1 + Math.round(c * 3), aneis = [];
  let atual = 1;
  for (let i = 0; i < nAneis; i++) {
    const tipo = i === 0 ? (x('t0') < 0.5 ? 'linha' : 'dupla') : ['dupla', 'runas', 'dentes', 'pontos', 'onda'][Math.floor(x(`t${i}`) * 5)];
    const largura = 0.08 + 0.06 * x(`l${i}`);
    aneis.push({ raio: atual, tipo, largura });
    atual -= largura + 0.04;
  }
  const n = 3 + Math.floor(x('n') * 10);
  const cop = []; for (let p = 1; p < n / 2; p++) if (mdc(n, p) === 1) cop.push(p);
  const spec = { aneis, poligonos: [{ n, passo: cop[Math.floor(x('passo') * cop.length)] ?? 1, raio: atual }], raios: null, nos: null, satelites: null, centro: { tipo: 'nenhum' } };
  if (c > 0.4) spec.raios = { n: 4 + Math.floor(x('rn') * 9), de: 0.15, ate: atual * 0.9 };
  if (c > 0.6) spec.nos = { n: 3 + Math.floor(x('nn') * 9), raio: atual, tamanho: 0.05 };
  if (c > 0.85) spec.satelites = { n: 2 + Math.floor(x('sn') * 4), raio: atual * 0.6, tamanho: 0.12 };
  if (c > 0.3) spec.centro = { tipo: ['circulo', 'cruz', 'runa'][Math.floor(x('c') * 3)], raio: 0.15 };
  return spec;
}

export function selo(caixa, { texto = '', faixa = 0.18, pontas = 0, centro } = {}, seed = 1, ctx) {
  const R = Math.min(caixa.l, caixa.a) / 2 - 0.2;
  const g = Math.max(0.03, (2 * VAO) / Math.max(R, 1e-6)); // folga ao anel de dentro ≥ VAO
  return circulo(caixa, {
    aneis: [{ raio: 1, tipo: 'linha' }, { raio: 1 - VAO / R, tipo: texto ? 'texto' : 'runas', largura: faixa, texto }, { raio: 1 - faixa - g, tipo: 'linha' }],
    poligonos: pontas >= 3 ? [{ n: pontas, passo: pontas >= 5 ? 2 : 1, raio: 1 - faixa - g }] : [],
    centro: centro ?? { tipo: 'runa', raio: 0.3 },
  }, seed, ctx);
}

const C30 = { x: 0, y: 0, l: 30, a: 30 };
const TIPOS = ['linha', 'dupla', 'runas', 'texto', 'dentes', 'pontos', 'onda'];
export const PARAMS = [
  { chave: 'complexidadeCirculo', grupo: 'circulo', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.05, padrao: 0.5, rotulo: 'complexidade', ajuda: 'Quantos anéis, estrelas, raios, nós e satélites o círculo sorteado tem. 0 = um anel e uma estrela; 1 = círculo cheio de camadas.', previa: (v, ctx) => circulo(C30, circuloAleatorio(1, v), 1, ctx) },
  { chave: 'anel', grupo: 'circulo', nivel: 'basico', tipo: 'opcao', padrao: 'dupla', rotulo: 'tipo de anel', ajuda: 'Desenho da faixa do anel: linha simples, dupla, runas, texto, dentes, pontos ou onda. Faixa estreita demais empasta na caneta.',
    opcoes: TIPOS.map((t) => ({ valor: t, rotulo: t })), previa: (v, ctx) => circulo(C30, { aneis: [{ raio: 1, tipo: v, largura: 0.15, texto: 'anel' }, { raio: 0.6, tipo: 'linha' }] }, 1, ctx) },
  { chave: 'pontas', grupo: 'circulo', nivel: 'basico', tipo: 'faixa', min: 3, max: 12, passo: 1, padrao: 5, rotulo: 'pontas da estrela', ajuda: 'Número de pontas do polígono. De 5 para cima a estrela pula uma ponta (pentagrama, hexagrama); abaixo disso é polígono simples.', previa: (v, ctx) => circulo(C30, { poligonos: [{ n: v, passo: v >= 5 ? 2 : 1, raio: 0.9 }] }, 1, ctx) },
  { chave: 'faixa', grupo: 'circulo', nivel: 'avancado', tipo: 'faixa', min: 0.1, max: 0.3, passo: 0.01, padrao: 0.18, rotulo: 'faixa do selo', ajuda: 'Largura da faixa de texto do selo, como fração do raio. Faixa fina deixa letras minúsculas; faixa larga toma espaço do centro.', previa: (v, ctx) => selo(C30, { texto: 'selo', faixa: v }, 1, ctx) },
];
