// Borda: moldura de tiras e cantos ao redor da caixa; `miolo` devolve o que sobra para o texto.
import { retDe, inset, circulo, hachura, recortarCaixa } from '../geo.js';
import { no } from './no.js';
import { vinha } from './vinha.js';

export const P = { estilo: 'linhas', lados: 'todos', cantos: 'losango', largura: 10, hachura: 1.2 };

// lados ativos: e = esquerda, d = direita, t = topo, b = base
const LADOS = {
  todos: { e: 1, d: 1, t: 1, b: 1 }, esquerda: { e: 1 }, topo: { t: 1 }, laterais: { e: 1, d: 1 }, 'topo-base': { t: 1, b: 1 },
};
const larguraDe = (c, p) => Math.min(p.largura, Math.min(c.l, c.a) / 3);

export function miolo(caixa, params = {}) {
  const p = { ...P, ...params }, w = larguraDe(caixa, p), s = LADOS[p.lados] ?? LADOS.todos;
  const e = s.e ? w : 0, d = s.d ? w : 0, t = s.t ? w : 0, b = s.b ? w : 0;
  return { x: caixa.x + e, y: caixa.y + t, l: Math.max(0, caixa.l - e - d), a: Math.max(0, caixa.a - t - b) };
}

const losango = (c) => { const cx = c.x + c.l / 2, cy = c.y + c.a / 2; return [[cx, c.y], [c.x + c.l, cy], [cx, c.y + c.a], [c.x, cy], [cx, c.y]]; };

function enfeiteCanto(q, tipo, w, seed, k) {
  const cx = q.x + w / 2, cy = q.y + w / 2, r = inset(q, 0.1 * w);
  if (tipo === 'losango') return [retDe(r), losango(r), losango(inset(r, r.l / 4))];
  if (tipo === 'trevo') return [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]].map(([u, v]) => circulo(cx + u * w, cy + v * w, 0.22 * w)).concat([circulo(cx, cy, 0.1 * w)]);
  return no(q, { celulas: 2, quebras: 0 }, seed + '|canto' + k);
}

export function borda(caixa, params = {}, seed = 1) {
  const { x, y, l, a } = caixa;
  if (!(l > 0) || !(a > 0)) return [];
  const p = { ...P, ...params }, w = larguraDe(caixa, p), s = LADOS[p.lados] ?? LADOS.todos;
  const comCantos = p.cantos !== 'nenhum';

  // cantos (w×w) onde os dois lados vizinhos estão ativos; tiras entre eles
  const cantos = [];
  for (const [v, h, cx, cy] of [['t', 'e', x, y], ['t', 'd', x + l - w, y], ['b', 'e', x, y + a - w], ['b', 'd', x + l - w, y + a - w]]) {
    if (s[v] && s[h]) cantos.push({ x: cx, y: cy, l: w, a: w });
  }
  const tiras = [];
  const hx0 = s.e && comCantos ? x + w : x, hx1 = s.d && comCantos ? x + l - w : x + l;
  if (s.t) tiras.push({ x: hx0, y, l: hx1 - hx0, a: w, h: true });
  if (s.b) tiras.push({ x: hx0, y: y + a - w, l: hx1 - hx0, a: w, h: true });
  const vy0 = s.t ? y + w : y, vy1 = s.b ? y + a - w : y + a;
  if (s.e) tiras.push({ x, y: vy0, l: w, a: vy1 - vy0, h: false });
  if (s.d) tiras.push({ x: x + l - w, y: vy0, l: w, a: vy1 - vy0, h: false });

  const tudo = [];
  if (comCantos) cantos.forEach((q, k) => tudo.push(...enfeiteCanto(q, p.cantos, w, seed, k)));

  if (p.estilo === 'vinha') {
    const rs = tiras.map((t) => inset(t, 0.08 * w));
    const dentro = ([px, py]) => rs.some((r) => px >= r.x && px <= r.x + r.l && py >= r.y && py <= r.y + r.a);
    const raizes = params.origem && dentro(params.origem) ? [params.origem]
      : tiras.map((t, i) => { const r = rs[i]; return t.h ? [r.x + 0.3 * w, r.y + r.a / 2] : [r.x + r.l / 2, r.y + r.a - 0.3 * w]; });
    tudo.push(...vinha(caixa, { ...params.vinha, escala: w, dentro, raizes }, seed));
  } else if (p.estilo === 'linhas' && p.lados === 'todos' && !comCantos) {
    tudo.push(retDe(inset(caixa, 0.25 * w)), retDe(inset(caixa, 0.75 * w)));
  } else {
    tiras.forEach((t, k) => {
      if (p.estilo === 'linhas') {
        for (const f of [0.25, 0.75]) tudo.push(t.h ? [[t.x, t.y + f * w], [t.x + t.l, t.y + f * w]] : [[t.x + f * w, t.y], [t.x + f * w, t.y + t.a]]);
      } else if (p.estilo === 'barra') {
        const r = retDe(inset(t, 0.15 * w));
        tudo.push(r, ...hachura([r.slice(0, 4)], { espaco: p.hachura }));
      } else tudo.push(...no(t, { celulas: 2 }, seed + '|tira' + k));
    });
  }
  return recortarCaixa(tudo, caixa);
}

const pv = (chave, extra = {}) => (v) => borda({ x: 0, y: 0, l: 70, a: 50 }, { ...P, largura: 6, ...extra, [chave]: v }, 1);
const op = (...vs) => vs.map(([valor, rotulo]) => ({ valor, rotulo }));

export const PARAMS = [
  { chave: 'estilo', grupo: 'borda', nivel: 'basico', tipo: 'opcao', padrao: P.estilo, rotulo: 'estilo', ajuda: 'Desenho das tiras da borda: linhas paralelas, barra hachurada, vinha com folhas ou trama de nó celta.',
    opcoes: op(['linhas', 'linhas'], ['barra', 'barra'], ['vinha', 'vinha'], ['no', 'nó']), previa: pv('estilo') },
  { chave: 'lados', grupo: 'borda', nivel: 'basico', tipo: 'opcao', padrao: P.lados, rotulo: 'lados', ajuda: 'Quais lados da caixa recebem borda. O texto ocupa o que sobra no miolo.',
    opcoes: op(['todos', 'todos'], ['esquerda', 'esquerda'], ['topo', 'topo'], ['laterais', 'laterais'], ['topo-base', 'topo e base']), previa: pv('lados') },
  { chave: 'cantos', grupo: 'borda', nivel: 'basico', tipo: 'opcao', padrao: P.cantos, rotulo: 'cantos', ajuda: 'Enfeite nos cantos onde dois lados da borda se encontram: nenhum, losango, trevo ou um pequeno nó.',
    opcoes: op(['nenhum', 'nenhum'], ['losango', 'losango'], ['trevo', 'trevo'], ['no', 'nó']), previa: pv('cantos') },
  { chave: 'largura', grupo: 'borda', nivel: 'basico', tipo: 'faixa', min: 4, max: 25, passo: 0.5, padrao: P.largura, rotulo: 'largura da borda', ajuda: 'Largura da borda em mm. Limitada a um terço do lado menor da caixa, para sobrar miolo.', previa: pv('largura') },
  { chave: 'hachura', grupo: 'borda', nivel: 'avancado', tipo: 'faixa', min: 0.4, max: 3, passo: 0.1, padrao: P.hachura, rotulo: 'espaço da hachura', ajuda: 'Distância em mm entre as linhas da hachura do estilo barra. Menor = barra mais escura; muito pequena empasta a caneta.', previa: pv('hachura', { estilo: 'barra' }) },
];
