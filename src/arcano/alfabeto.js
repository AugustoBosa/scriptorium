// Escrita arcana: alfabeto cifrado gerado por seed, sigilo por magia e moldura. Tudo em traço único.
import { rng, hash } from '../rng.js';
import { ESCOLAS } from '../magia.js';
import { arco, reamostrar, dist } from '../geo.js';

export const LETRAS = 'abcdefghijklmnopqrstuvwxyz0123456789';
export const CAIXA = { largura: 500, altura: 700 }; // caixa de uma letra, em unidades da fonte (y para cima)
const COLS = [0, 250, 500];
const LINS = [0, 233, 467, 700];

// Segmento reto ou curvo (bezier quadrática) entre dois pontos, sem repetir o primeiro ponto.
function segmento([ax, ay], [bx, by], curva) {
  if (curva === 0) return [[bx, by]];
  const mx = (ax + bx) / 2 - (by - ay) * curva, my = (ay + by) / 2 + (bx - ax) * curva;
  const pts = [];
  for (let i = 1; i <= 6; i++) {
    const t = i / 6, u = 1 - t;
    pts.push([u * u * ax + 2 * u * t * mx + t * t * bx, u * u * ay + 2 * u * t * my + t * t * by]);
  }
  return pts;
}

function circulo(cx, cy, r, n = 12) {
  return Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos((i * 2 * Math.PI) / n), cy + r * Math.sin((i * 2 * Math.PI) / n)]);
}

// Uma letra: caminhada por uma grade 3x4, com levantadas de caneta e um enfeite ocasional.
function letra(r, estilo) {
  const no = () => [Math.floor(r() * 3), Math.floor(r() * 4)];
  const ponto = ([c, l]) => [COLS[c], LINS[l]];
  const usados = new Set();
  const tracos = [];
  let atual = no();
  let traco = [ponto(atual)];
  const visitados = [atual];
  const nSeg = 3 + Math.floor(r() * (1 + estilo.complexidade * 3));
  for (let i = 0; i < nSeg; i++) {
    if (i > 0 && r() < 0.25) { // levanta a caneta e recomeça de um nó já visitado
      if (traco.length > 1) tracos.push(traco);
      atual = visitados[Math.floor(r() * visitados.length)];
      traco = [ponto(atual)];
    }
    let prox, chave, tentativas = 0;
    do {
      prox = no();
      chave = [atual, prox].map(String).sort().join('>');
    } while ((String(prox) === String(atual) || usados.has(chave)) && ++tentativas < 20);
    if (tentativas >= 20) break;
    usados.add(chave);
    const curva = estilo.curva * 0.35 * (r() < 0.5 ? -1 : 1) * (r() < estilo.curva ? 1 : 0);
    traco.push(...segmento(ponto(atual), ponto(prox), curva));
    atual = prox;
    visitados.push(atual);
  }
  if (traco.length > 1) tracos.push(traco);
  if (r() < 0.3) { // enfeite: anel pequeno ao lado de um nó
    const [x, y] = ponto(visitados[Math.floor(r() * visitados.length)]);
    tracos.push(circulo(Math.min(440, Math.max(60, x)), Math.min(640, Math.max(60, y)), 55));
  }
  return { tracos, assinatura: [...usados].sort().join(';') };
}

// Formas novas (estilo.forma). Cada uma recebe o rng próprio da letra; todas cabem em [0,500]×[0,700] por construção.
const embaralhar = (lista, r) => {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const FORMAS = {
  angular(r, e) { // haste reta com galhos retos
    const x = [100, 250, 400][Math.floor(r() * 3)];
    const cs = COLS.filter((c) => c !== x);
    const galhos = [];
    const n = 1 + Math.floor(r() * (1 + Math.round(2 * e.complexidade)));
    for (let i = 0; i < n; i++) galhos.push([[x, LINS[Math.floor(r() * 4)]], [cs[Math.floor(r() * cs.length)], LINS[Math.floor(r() * 4)]]]);
    return { tracos: [[[x, 0], [x, 700]], ...galhos], assinatura: [x, ...galhos.map((g) => g.flat().join(',')).sort()].join(';') };
  },
  curvo(r, e) { // arcos em torno de (250, 350 ± 117)
    const tracos = [], partes = [];
    const n = 1 + Math.floor(r() * (1 + Math.round(2 * e.complexidade)));
    for (let i = 0; i < n; i++) {
      const cy = 350 + 117 * (Math.floor(r() * 3) - 1);
      const raio = Math.min([120, 180, 240][Math.floor(r() * 3)], cy, 700 - cy); // ponytail: raio encolhido para o círculo caber na caixa
      const a0 = Math.floor(r() * 8) * Math.PI / 4, ap = (Math.PI / 2) * (1 + Math.floor(r() * 3));
      tracos.push(arco(250, cy, raio, a0, a0 + ap, 10));
      partes.push([cy, raio, a0, ap].join(','));
    }
    if (r() < 0.3) { const cy = LINS[1 + Math.floor(r() * 2)]; tracos.push(circulo(250, cy, 40, 8)); partes.push(`o${cy}`); }
    return { tracos, assinatura: partes.sort().join(';') };
  },
  ogham(r, e, ch, perm) { // entalhes numa haste; o código da letra é a posição na permutação da seed
    const q = perm.indexOf(ch), g = Math.floor(q / 5) % 4;
    const tracos = [[[250, 0], [250, 700]]];
    for (let j = 0; j < (q % 5) + 1; j++) {
      const y = 150 + 110 * j;
      tracos.push([[[250, y], [430, y]], [[70, y], [250, y]], [[110, y - 60], [390, y + 60]], [[190, y], [310, y]]][g]);
    }
    if (q >= 20) tracos.push([[180, 700], [320, 700]]);
    return { tracos, assinatura: String(q) };
  },
  pontilhado(r, e) { // esqueleto da grade reto e para dentro (inset de 6), trocado por pontos de 12 u
    const sk = letra(r, { ...e, curva: 0 }), tracos = [];
    for (const t0 of sk.tracos) {
      const t1 = t0.map(([x, y]) => [6 + (x * 488) / 500, 6 + (y * 688) / 700]);
      const L = t1.slice(1).reduce((q, p, i) => q + dist(t1[i], p), 0); // passo >= 200 u (0,057 mm por mm de altura): pontos a >= 0,8 mm em 3,5 mm
      const t = reamostrar(t1, (L / Math.max(1, Math.floor(L / 200))) * (1 + 1e-9));
      t.forEach(([x, y], i) => {
        const [ax, ay] = t[Math.max(0, i - 1)], [bx, by] = t[Math.min(t.length - 1, i + 1)];
        const d = dist([ax, ay], [bx, by]) || 1, ux = ((bx - ax) / d) * 6, uy = ((by - ay) / d) * 6;
        tracos.push([[x - ux, y - uy], [x + ux, y + uy]]);
      });
    }
    return { tracos, assinatura: sk.assinatura };
  },
};

// Fonte no mesmo formato de parseFonte. `letras` = desenhos feitos à mão que substituem os gerados.
export function gerarAlfabeto(estilo = {}, letras = {}) {
  const e = { seed: 1, curva: 0.4, complexidade: 0.5, ...estilo };
  const forma = e.forma ?? 'grade';
  const perm = forma === 'ogham' ? embaralhar([...LETRAS], rng(`${e.seed}|ogham`)) : null;
  const glifos = { ' ': { adv: 450, tracos: [] }, '.': { adv: 350, tracos: [[[100, 0], [100, 120]]] } };
  const vistas = new Set();
  for (const ch of LETRAS) {
    let g, n = 0;
    do g = forma === 'grade' ? letra(rng(`${e.seed}|${ch}|${n}`), e) : FORMAS[forma](rng(`${e.seed}|${forma}|${ch}|${n}`), e, ch, perm); while (vistas.has(g.assinatura) && ++n < 20);
    vistas.add(g.assinatura);
    glifos[ch] = { adv: 680, tracos: letras[ch] ?? g.tracos };
  }
  return { nome: 'arcano', upm: 1000, ascent: 800, descent: -200, advPadrao: 680, glifos };
}

// Reduz o texto ao que o alfabeto arcano tem: a-z, 0-9, espaço e ponto (toda pontuação vira ponto).
export function cifrar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[,;:!?]/g, '.').replace(/[^a-z0-9. \n]/g, ' ').replace(/ +/g, ' ');
}

// Miolo do sigilo por escola, em raio 1.
const MIOLO = {
  A: () => [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]], [[0, -1], [0, 1]]],
  C: () => [Array.from({ length: 31 }, (_, i) => { const a = i * 0.35, q = i / 30; return [q * Math.cos(a), q * Math.sin(a)]; })],
  D: () => [
    Array.from({ length: 13 }, (_, i) => [-1 + i / 6, -0.6 * Math.sin((i * Math.PI) / 12)]),
    Array.from({ length: 13 }, (_, i) => [-1 + i / 6, 0.6 * Math.sin((i * Math.PI) / 12)]),
    circulo(0, 0, 0.3),
  ],
  E: () => [Array.from({ length: 33 }, (_, i) => { const a = (i * Math.PI) / 16; return [Math.sin(a), Math.sin(a) * Math.cos(a) * 1.4]; })],
  V: () => [0, 1, 2, 3].map((i) => { const a = (i * Math.PI) / 4; return [[Math.cos(a), Math.sin(a)], [-Math.cos(a), -Math.sin(a)]]; }),
  I: () => [circulo(-0.35, 0, 0.65, 20), circulo(0.35, 0, 0.65, 20)],
  N: () => [[[-0.9, -0.7], [0.9, -0.7], [0, 0.8], [-0.9, -0.7]], [[0, -0.7], [0, 1]]],
  T: () => [[[0, -1], [0.9, 0.7], [-0.9, 0.7], [0, -1]], circulo(0, 0.1, 0.4)],
};

export const mdc = (a, b) => (b ? mdc(b, a % b) : a);

// Sigilo de uma magia em coordenadas [-1,1] (y para baixo). O desenho codifica:
// pontas = nível + 2, miolo = escola, anel duplo = concentração, dentes = ritual, marcas no anel = V/S/M.
export function sigilo(m, seed = 0) {
  const h = hash(`${seed}|${m.id}`);
  const r = rng(h);
  const tracos = [circulo(0, 0, 0.9, 48)];
  if (m.conc) tracos.push(circulo(0, 0, 0.82, 48));
  if (m.ritual) for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; tracos.push([[0.9 * Math.cos(a), 0.9 * Math.sin(a)], [Math.cos(a), Math.sin(a)]]); }
  const R = m.conc ? 0.82 : 0.9;
  const rot = r() * 2 * Math.PI;
  const n = m.nivel + 2;
  if (m.nivel > 0) {
    const passos = [];
    for (let k = 1; k < n / 2; k++) if (mdc(n, k) === 1) passos.push(k);
    const k = passos[passos.length > 1 ? 1 + (h % (passos.length - 1)) : 0];
    tracos.push(Array.from({ length: n + 1 }, (_, i) => { const a = rot + (i * k * 2 * Math.PI) / n; return [R * Math.cos(a), R * Math.sin(a)]; }));
  } else tracos.push(circulo(0, 0, 0.5, 32));
  tracos.push(...(MIOLO[m.escola] ?? MIOLO.V)().map((t) => t.map(([x, y]) => [x * 0.28, y * 0.28])));
  const raios = 2 + (h % 3); // riscos curtos que diferenciam magias de mesma escola e nível
  for (let i = 0; i < raios; i++) { const a = r() * 2 * Math.PI; tracos.push([[0.34 * Math.cos(a), 0.34 * Math.sin(a)], [0.46 * Math.cos(a), 0.46 * Math.sin(a)]]); }
  const marca = (a, t) => t.map(([x, y]) => [0.9 * Math.cos(a) + x * 0.07, 0.9 * Math.sin(a) + y * 0.07]);
  if (/V/.test(m.comp)) tracos.push(marca(-Math.PI / 2, [[0, -1.2], [0, 1.2]]));
  if (/S/.test(m.comp)) tracos.push(marca(Math.PI * 5 / 6, circulo(0, 0, 1, 8)));
  if (/M/.test(m.comp)) tracos.push(marca(Math.PI / 6, [[0, -1], [0.9, 0.7], [-0.9, 0.7], [0, -1]]));
  return tracos;
}

// Moldura dupla com losangos nos cantos, dentro das margens.
export function moldura(pagina) {
  const a = Math.min(...Object.values(pagina.margens)) * 0.4;
  const ret = (d) => [[d, d], [pagina.largura - d, d], [pagina.largura - d, pagina.altura - d], [d, pagina.altura - d], [d, d]];
  const q = a * 0.5;
  const cantos = [[a, a], [pagina.largura - a, a], [pagina.largura - a, pagina.altura - a], [a, pagina.altura - a]]
    .map(([x, y]) => [[x - q, y], [x, y - q], [x + q, y], [x, y + q], [x - q, y]]);
  return [ret(a), ret(a + q * 1.2), ...cantos];
}

// Parâmetros editáveis. Prévia: três letras do alfabeto (altura 10 mm) ou o sigilo em raio 10 mm.
const letras = (chave) => (v, ctx) => {
  const g = gerarAlfabeto({ ...ctx.estilo, [chave]: v }).glifos, s = 10 / CAIXA.altura;
  let x0 = 0;
  const tr = [];
  for (const ch of 'abc') { tr.push(...g[ch].tracos.map((t) => t.map(([x, y]) => [x0 + x * s, 10 - y * s]))); x0 += g[ch].adv * s; }
  return tr;
};
const sig = (chave) => (v, ctx) => sigilo({ ...ctx.magia, [chave]: v }, ctx.estilo.seed).map((t) => t.map(([x, y]) => [x * 10, y * 10]));
export const PARAMS = [
  { chave: 'seed', grupo: 'tradicao', nivel: 'basico', tipo: 'numero', min: 0, max: 99999, passo: 1, padrao: 1, rotulo: 'seed do alfabeto', ajuda: 'Número que sorteia o alfabeto arcano. A mesma seed dá sempre as mesmas letras; trocar a seed troca todos os símbolos.', previa: letras('seed') },
  { chave: 'curva', grupo: 'tradicao', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.05, padrao: 0.4, rotulo: 'curvatura', ajuda: 'Quanto os traços das letras arcanas são curvos, de 0 a 1. 0 = só linhas retas; 1 = quase tudo em arcos.', previa: letras('curva') },
  { chave: 'complexidade', grupo: 'tradicao', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.05, padrao: 0.5, rotulo: 'complexidade', ajuda: 'Quantos traços cada letra arcana tem, de 0 a 1. Valores baixos dão símbolos simples; altos dão símbolos cheios.', previa: letras('complexidade') },
  { chave: 'nivel', grupo: 'sigilo', nivel: 'basico', tipo: 'faixa', min: 0, max: 9, passo: 1, padrao: 1, rotulo: 'nível da magia', ajuda: 'Nível da magia de exemplo, de 0 a 9. No sigilo, o nível vira o número de pontas da estrela: nível + 2.', previa: sig('nivel') },
  { chave: 'escola', grupo: 'sigilo', nivel: 'basico', tipo: 'opcao', padrao: 'V', rotulo: 'escola', ajuda: 'Escola de magia de exemplo. Cada escola tem um desenho próprio no miolo do sigilo.',
    opcoes: Object.entries(ESCOLAS).map(([valor, rotulo]) => ({ valor, rotulo })), previa: sig('escola') },
  { chave: 'conc', grupo: 'sigilo', nivel: 'basico', tipo: 'marca', padrao: false, rotulo: 'concentração', ajuda: 'Magia que exige concentração. No sigilo, ganha um segundo anel por dentro do círculo.', previa: sig('conc') },
  { chave: 'ritual', grupo: 'sigilo', nivel: 'basico', tipo: 'marca', padrao: false, rotulo: 'ritual', ajuda: 'Magia que pode ser lançada como ritual. No sigilo, ganha dentes em volta do círculo.', previa: sig('ritual') },
  { chave: 'forma', grupo: 'tradicao', nivel: 'basico', tipo: 'opcao', padrao: 'grade', rotulo: 'forma das letras', ajuda: 'Como as letras arcanas são desenhadas: grade (padrão), angular (haste com galhos retos), curvo (arcos), ogham (entalhes numa haste) ou pontilhado (grade em pontos).',
    opcoes: ['grade', 'angular', 'curvo', 'ogham', 'pontilhado'].map((valor) => ({ valor, rotulo: valor })), previa: letras('forma') },
];
