// Capitular: letra grande (traço Hershey) com moldura, contorno, vinha, renda ou nó, em 5 estilos.
import { arco, circulo, deslocar, retDe, inset, encaixar, caixaDe, reamostrar, hachura, afastar, recortarCaixa, dist } from '../geo.js';
import { rng } from '../rng.js';
import { vinha } from './vinha.js';
import { no, grade } from './no.js';

export const P = { estilo: 'lombarda', fonte: 'HersheyGothEnglish', linhas: 3, hachura: 0 };

export const caixaCapitular = ({ x, y, linhas, entrelinha, proporcao = 1 }) =>
  ({ x, y, l: linhas * entrelinha * proporcao, a: linhas * entrelinha });

// Traços do glifo em unidades da fonte (y para baixo); [] se nenhuma fonte tem a letra.
function base(letra, nome, fontes = {}) {
  const ch = String(letra).toUpperCase();
  const chs = [ch, ch.normalize('NFD').replace(/[̀-ͯ]/g, '')];
  const tem = (f) => chs.map((c) => f?.glifos?.[c]).find((g) => g?.tracos?.length);
  const g = tem(fontes[nome]) ?? Object.values(fontes).map(tem).find(Boolean);
  return g ? g.tracos.filter((t) => t.length >= 2).map((t) => t.map(([x, y]) => [x, -y])) : [];
}

// Cada traço vira um laço fechado ao redor do original, com meia-largura d ≥ 0,4 mm DEPOIS de encaixar em ci.
// ponytail: offset ingênuo se cruza em curvas fechadas.
function contornar(tracos, a, ci) {
  const b = caixaDe(tracos), s = b.a ? a / b.a : 1, piso = Math.max(0.41, 0.03 * a);
  const laco = (d) => tracos.map((t) => {
    const u = t.map(([x, y]) => [x * s, y * s]), ida = deslocar(u, d), volta = deslocar(u, -d).reverse();
    return [...ida, ...volta, ida[0]];
  });
  let d = piso;
  for (let k = 0; k < 3; k++) { const q = caixaDe(laco(d)); d = piso / Math.min(1, ci.l / q.l, ci.a / q.a); } // compensa o encolhimento do encaixe
  return laco(d);
}

const espiral = (cx, cy, R, ang, lado) => Array.from({ length: 25 }, (_, k) => {
  const u = k / 24, t = ang + lado * u * 3 * Math.PI, r = R * (1 - 0.8 * u);
  return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
});

// Renda: semicírculos para fora sobre o retângulo r, nº inteiro por lado, pérolas nas junções, espiral nos cantos.
function renda(r, m, seed) {
  const rho0 = 0.055 * m, out = [];
  let i = 0;
  const lado = (x0, y0, dx, dy, comp, nx, ny) => {
    const n = Math.max(1, Math.round(comp / (2 * rho0))), rho = comp / (2 * n);
    const a0 = Math.atan2(ny, nx) - Math.PI / 2;
    for (let k = 0; k < n; k++) {
      const c = (2 * k + 1) * rho;
      out.push(arco(x0 + dx * c, y0 + dy * c, rho, a0, a0 + Math.PI, 12));
    }
    for (let k = 1; k < n; k++, i++) {
      if (rng(seed + '|p|' + i)() < 0.7) out.push(circulo(x0 + dx * 2 * k * rho + nx * 1.6 * rho, y0 + dy * 2 * k * rho + ny * 1.6 * rho, 0.3 * rho, 8));
    }
  };
  const x1 = r.x + r.l, y1 = r.y + r.a;
  lado(r.x, r.y, 1, 0, r.l, 0, -1);
  lado(r.x, y1, 1, 0, r.l, 0, 1);
  lado(r.x, r.y, 0, 1, r.a, -1, 0);
  lado(x1, r.y, 0, 1, r.a, 1, 0);
  const R = 0.06 * m, sentido = rng(seed + '|esp')() < 0.5 ? 1 : -1;
  for (const [cx, cy, sx, sy] of [[r.x, r.y, -1, -1], [x1, r.y, 1, -1], [r.x, y1, -1, 1], [x1, y1, 1, 1]]) {
    const ox = cx + sx * R / Math.SQRT2, oy = cy + sy * R / Math.SQRT2;
    out.push(espiral(ox, oy, R, Math.atan2(cy - oy, cx - ox), sentido));
  }
  return out;
}

export function capitular(caixa, params = {}, seed = 1, fontes = {}) {
  const { l, a } = caixa;
  if (!(l > 0) || !(a > 0)) return [];
  const p = { ...P, ...params };
  const m = Math.min(l, a), tr = base(params.letra ?? 'A', p.fonte, fontes);
  // contorno só se a letra comporta d ≥ 0,4 mm (0,4 ≤ 0,06·a); senão desenha simples, como lombarda
  const letra = (ci, contorno) => (tr.length ? encaixar(contorno && ci.a >= 0.4 / 0.06 ? contornar(tr, ci.a, ci) : tr, ci) : []);
  let tudo, L, interna;
  if (p.estilo === 'contornada') { interna = inset(caixa, 0.06 * m); L = letra(interna, true); tudo = L; }
  else if (p.estilo === 'habitada') {
    interna = inset(caixa, 0.2 * m); L = letra(interna, true);
    const area = inset(caixa, 0.06 * m), O = L.flatMap((t) => reamostrar(t, 0.5)), folga = 0.035 * m;
    const dentro = ([px, py]) => px >= area.x && px <= area.x + area.l && py >= area.y && py <= area.y + area.a && O.every((q) => dist(q, [px, py]) > folga);
    // raízes: ponto da letra mais próximo de cada canto da caixa (o inferior esquerdo primeiro), empurrado para fora — a vinha nasce da letra
    const cx = O.reduce((s, o) => s + o[0], 0) / (O.length || 1), cy = O.reduce((s, o) => s + o[1], 0) / (O.length || 1);
    const raizes = [[0, 1], [1, 1], [1, 0], [0, 0]].flatMap(([i, j]) => {
      const canto = [caixa.x + i * l, caixa.y + j * a], q = O.reduce((b, o) => (dist(o, canto) < dist(b, canto) ? o : b), O[0] ?? canto);
      const h = Math.hypot(q[0] - cx, q[1] - cy) || 1;
      const r = [1.5, 2, 3].map((k) => [q[0] + ((q[0] - cx) / h) * k * folga, q[1] + ((q[1] - cy) / h) * k * folga]).find(dentro);
      return r ? [r] : [];
    });
    tudo = [retDe(caixa), retDe(inset(caixa, 0.04 * m)), ...L, ...vinha(area, { ...params.vinha, escala: 0.35 * m, dentro, ...(raizes.length && { raizes }) }, seed)];
  } else if (p.estilo === 'filigranada') {
    interna = inset(caixa, 0.2 * m); L = letra(interna, true);
    tudo = [...L, ...renda(inset(caixa, 0.16 * m), m, seed)];
  } else if (p.estilo === 'no') {
    const nc = Math.max(2, Math.floor(m / 4)), G = grade(caixa, nc); // célula ≥ ~4 mm
    interna = inset(caixa, Math.max(G.tx, G.ty) + 0.04 * m); L = letra(interna, true);
    tudo = [...no(caixa, { celulas: nc, aro: 1, quebras: 0 }, seed), ...L];
  } else { interna = inset(caixa, 0.06 * m); L = letra(interna, false); tudo = L; }
  if (p.hachura > 0 && p.estilo !== 'habitada' && interna.l > 0 && interna.a > 0) {
    tudo = [...tudo, ...afastar(hachura([retDe(interna).slice(0, 4)], { espaco: p.hachura }), L, 0.04 * m)];
  }
  return recortarCaixa(tudo, caixa);
}

const CX = caixaCapitular({ x: 0, y: 0, linhas: 3, entrelinha: 5 });
const pv = (chave) => (v, ctx) => capitular(CX, { ...P, [chave]: v }, 1, ctx?.fontes);
const previaLinhas = (v, ctx) => {
  const c = caixaCapitular({ x: 0, y: 0, linhas: v, entrelinha: 5 });
  const pautas = Array.from({ length: v }, (_, k) => [[c.l + 2, (k + 0.8) * 5], [c.l + 32, (k + 0.8) * 5]]);
  return { fundo: pautas, foco: capitular(c, { ...P, linhas: v }, 1, ctx?.fontes) };
};

export const PARAMS = [
  { chave: 'estilo', grupo: 'capitular', nivel: 'basico', tipo: 'opcao', padrao: 'lombarda', rotulo: 'estilo da capitular',
    ajuda: 'Como a letra grande é enfeitada: simples, contornada, com vinha ao redor, com renda ou com moldura de nó celta.',
    opcoes: [{ valor: 'lombarda', rotulo: 'lombarda' }, { valor: 'contornada', rotulo: 'contornada' }, { valor: 'habitada', rotulo: 'habitada (vinha)' }, { valor: 'filigranada', rotulo: 'filigranada (renda)' }, { valor: 'no', rotulo: 'nó celta' }],
    previa: pv('estilo') },
  { chave: 'fonte', grupo: 'capitular', nivel: 'basico', tipo: 'opcao', padrao: 'HersheyGothEnglish', rotulo: 'fonte da capitular',
    ajuda: 'Desenho da letra: três góticas ou a serifada em negrito. Se a fonte não estiver carregada, usa outra que tenha a letra.',
    opcoes: [{ valor: 'HersheyGothEnglish', rotulo: 'gótica inglesa' }, { valor: 'HersheyGothGerman', rotulo: 'gótica alemã' }, { valor: 'HersheyGothItalian', rotulo: 'gótica italiana' }, { valor: 'HersheySerifBold', rotulo: 'serifada negrito' }],
    previa: pv('fonte') },
  { chave: 'linhas', grupo: 'capitular', nivel: 'basico', tipo: 'faixa', min: 2, max: 8, passo: 1, padrao: 3, rotulo: 'linhas ocupadas',
    ajuda: 'Quantas linhas de texto a capitular ocupa em altura, de 2 a 8. A prévia mostra pautas ao lado para comparar.',
    previa: previaLinhas },
  { chave: 'hachura', grupo: 'capitular', nivel: 'avancado', tipo: 'faixa', min: 0, max: 3, passo: 0.1, padrao: 0, rotulo: 'hachura de fundo',
    ajuda: 'Espaço entre as linhas de sombra atrás da letra, em mm. 0 = sem fundo. Valores pequenos escurecem mais.',
    previa: pv('hachura') },
];
