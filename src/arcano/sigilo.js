// Sigilo de palavra (M19): kamea, roda e fusão. Não confundir com `sigilo(magia)` de alfabeto.js.
import { VAO, circulo, recortarCaixa, recortarRaio, limpar, afastar, comprimento } from '../geo.js';
import { rng } from '../rng.js';
import { cifrar, gerarAlfabeto, LETRAS } from './alfabeto.js';


export const P = { frase: 'sigilo', metodo: 'kamea', ordem: 3, reduzir: true };

// quadrados de Agrippa (Saturno, Júpiter, Marte, Sol)
export const KAMEAS = {
  3: [[4, 9, 2], [3, 5, 7], [8, 1, 6]],
  4: [[4, 14, 15, 1], [9, 7, 6, 12], [5, 11, 10, 8], [16, 2, 3, 13]],
  5: [[11, 24, 7, 20, 3], [4, 12, 25, 8, 16], [17, 5, 13, 21, 9], [10, 18, 1, 14, 22], [23, 6, 19, 2, 15]],
  6: [[6, 32, 3, 34, 35, 1], [7, 11, 27, 28, 8, 30], [19, 14, 16, 15, 23, 24], [18, 20, 22, 21, 17, 13], [25, 29, 10, 9, 26, 12], [36, 5, 33, 4, 2, 31]],
};
const RODA = [['aeiouy', 0.3], ['bcdfghjklm', 0.6], ['npqrstvwxz0123456789', 0.9]];

const soAlfanum = (frase) => cifrar(frase).replace(/[^a-z0-9]/g, '');
const unicas = (s) => [...new Set(s)].join('');
export function reduzir(frase) {
  const s = soAlfanum(frase);
  return unicas(s.replace(/[aeiou]/g, '') || s);
}

const semRepetidos = (pts) => pts.filter((p, i) => !i || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);

// caminho comum: círculo de início, linha (curva em segmento repetido), barra de fim
function caminho(pts, e, escala) {
  if (!pts.length) return [];
  const r0 = Math.max(0.12 * e, 0.6);
  const inicio = circulo(pts[0][0], pts[0][1], r0, 12);
  if (pts.length === 1) return [inicio];
  const feitos = new Set();
  const linha = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const chave = [a, b].map((p) => p.map((v) => v.toFixed(3)).join(',')).sort().join('|');
    if (feitos.has(chave)) {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      const c = [(a[0] + b[0]) / 2 - (dy / L) * escala, (a[1] + b[1]) / 2 + (dx / L) * escala];
      for (let k = 1; k <= 8; k++) {
        const u = k / 8, v = 1 - u;
        linha.push([v * v * a[0] + 2 * u * v * c[0] + u * u * b[0], v * v * a[1] + 2 * u * v * c[1] + u * u * b[1]]);
      }
    } else linha.push(b);
    feitos.add(chave);
  }
  const tracos = [inicio, ...recortarRaio(linha, pts[0], r0 + VAO)];
  const f = pts[pts.length - 1], q = linha[linha.length - 2];
  if (f[0] !== pts[0][0] || f[1] !== pts[0][1]) { // barra de fim, perpendicular ao último segmento
    const dx = f[0] - q[0], dy = f[1] - q[1], L = Math.hypot(dx, dy) || 1, h = Math.max(0.35 * e, 1.2) / 2;
    tracos.push([[f[0] - (dy / L) * h, f[1] + (dx / L) * h], [f[0] + (dy / L) * h, f[1] - (dx / L) * h]]);
  }
  return tracos;
}

function kamea(caixa, letras, ordem) {
  const n = KAMEAS[ordem] ? ordem : 3, K = KAMEAS[n];
  const Q = 0.9 * Math.min(caixa.l, caixa.a), e = Q / n;
  const x0 = caixa.x + (caixa.l - Q) / 2, y0 = caixa.y + (caixa.a - Q) / 2;
  const ponto = (v) => {
    const i = K.findIndex((l) => l.includes(v));
    return [x0 + (K[i].indexOf(v) + 0.5) * e, y0 + (i + 0.5) * e];
  };
  const pts = semRepetidos([...letras].map((ch) => ponto((LETRAS.indexOf(ch) % (n * n)) + 1)));
  return caminho(pts, e, 0.2 * e);
}

function roda(caixa, letras) {
  const R = 0.9 * Math.min(caixa.l, caixa.a) / 2, cx = caixa.x + caixa.l / 2, cy = caixa.y + caixa.a / 2;
  const ponto = (ch) => {
    const [anel, f] = RODA.find(([s]) => s.includes(ch));
    const a = -Math.PI / 2 + (2 * Math.PI * anel.indexOf(ch)) / anel.length;
    return [cx + f * R * Math.cos(a), cy + f * R * Math.sin(a)];
  };
  return caminho(semRepetidos([...letras].map(ponto)), 0.3 * R, 0.08 * R);
}

// Austin Spare: letras sobrepostas num monograma
function fusao(caixa, letras, seed, ctx, nomeFonte) {
  const fonte = ctx?.fontes?.[nomeFonte] ?? Object.values(ctx?.fontes ?? {}).find((f) => f.glifos?.B) ?? gerarAlfabeto({ seed });
  const cx = caixa.x + caixa.l / 2, cy = caixa.y + caixa.a / 2, H = 0.8 * Math.min(caixa.l, caixa.a);
  const gl = [...letras].map((ch) => fonte.glifos[ch.toUpperCase()] ?? fonte.glifos[ch]);
  const ys = gl.filter((g) => g?.tracos.length).flatMap((g) => g.tracos.flat().map((p) => p[1]));
  const xs = gl.filter((g) => g?.tracos.length).flatMap((g) => g.tracos.flat().map((p) => p[0]));
  if (!ys.length) return [];
  const hv = Math.max(...ys) - Math.min(...ys) || 1, wv = Math.max(...xs) - Math.min(...xs) || 1;
  const s = Math.min(H / hv, (0.8 * Math.min(caixa.l, caixa.a)) / wv), ym = (Math.max(...ys) + Math.min(...ys)) / 2;
  const acum = [];
  gl.forEach((g, i) => {
    if (!g?.tracos.length) return;
    const r = rng(`${seed}|fusao|${i}`);
    const espelho = r() < 0.3, gira = r() < 0.15;
    let t = g.tracos.map((tr) => tr.map(([x, y]) => [x * s, -(y - ym) * s])); // y para baixo, base comum
    if (espelho) t = t.map((tr) => tr.map(([x, y]) => [-x, y]));
    if (gira) t = t.map((tr) => tr.map(([x, y]) => [-y, x]));
    const px = t.flat().map((p) => p[0]), xmin = Math.min(...px), xmax = Math.max(...px);
    // ponytail: haste = um segmento quase vertical longo perto da borda esquerda; não funde hastes em polilinha
    const haste = t.some((tr) => tr.slice(1).some((p, k) => {
      const q = tr[k], dy = Math.abs(p[1] - q[1]);
      return Math.abs(p[0] - q[0]) < 0.1 * dy && dy >= 0.6 * H && Math.min(p[0], q[0]) - xmin <= 0.15 * H;
    }));
    const dx = haste ? cx - 0.3 * H - xmin : cx - (xmin + xmax) / 2;
    t = t.map((tr) => tr.map(([x, y]) => [x + dx, y + cy]));
    acum.push(...afastar(t, acum, VAO, 0.25).filter((tr) => comprimento(tr) >= 0.8));
  });
  return acum;
}

export function sigiloPalavra(caixa, params = {}, seed = 1, ctx) {
  if (!(caixa.l > 0 && caixa.a > 0)) return [];
  const p = { ...P, ...params };
  const letras = p.reduzir ? reduzir(p.frase) : soAlfanum(p.frase);
  if (!letras) return [];
  const t = p.metodo === 'roda' ? roda(caixa, letras)
    : p.metodo === 'fusao' ? fusao(caixa, letras, seed, ctx, p.fonte)
      : kamea(caixa, letras, p.ordem);
  return recortarCaixa(limpar(t), caixa);
}

const C30 = { x: 0, y: 0, l: 30, a: 30 };
const pv = (extra) => (v, ctx) => sigiloPalavra(C30, { ...P, frase: 'abracadabra', ...extra(v) }, 1, ctx);
export const PARAMS = [
  { chave: 'metodo', grupo: 'sigilo', nivel: 'basico', tipo: 'opcao', padrao: P.metodo, rotulo: 'método do sigilo', ajuda: 'Como a frase vira desenho. Kamea: caminho num quadrado mágico. Roda: caminho por três anéis de letras. Fusão: letras sobrepostas num monograma.',
    opcoes: [{ valor: 'kamea', rotulo: 'kamea' }, { valor: 'roda', rotulo: 'roda' }, { valor: 'fusao', rotulo: 'fusão' }], previa: pv((v) => ({ metodo: v })) },
  { chave: 'ordem', grupo: 'sigilo', nivel: 'avancado', tipo: 'faixa', min: 3, max: 6, passo: 1, padrao: P.ordem, rotulo: 'ordem do quadrado', ajuda: 'Lado do quadrado mágico do método kamea, de 3 a 6 (Saturno, Júpiter, Marte, Sol). Quadrado maior separa melhor frases parecidas.', previa: pv((v) => ({ ordem: v })) },
  { chave: 'reduzir', grupo: 'sigilo', nivel: 'avancado', tipo: 'marca', padrao: P.reduzir, rotulo: 'reduzir a frase', ajuda: 'Tira vogais e letras repetidas antes de desenhar, como no método clássico. Desligado, o caminho usa todas as letras da frase.', previa: pv((v) => ({ reduzir: v })) },
];
