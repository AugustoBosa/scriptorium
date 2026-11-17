// Nó celta pelo método de Mercat: grade de células, paredes e quebras nas arestas, fios alternando por cima/por baixo.
import { dist, deslocar, recortarRaio, recortarCaixa } from '../geo.js';
import { rng } from '../rng.js';

export const P = { celulas: 4, aro: 0, quebras: 0.15, simetria: 'quadrupla', fita: 0.12, vao: 0.06 };

export function grade(caixa, celulas) {
  const t = Math.min(caixa.l, caixa.a) / celulas;
  const C = Math.max(1, Math.round(caixa.l / t)), L = Math.max(1, Math.round(caixa.a / t));
  return { C, L, tx: caixa.l / C, ty: caixa.a / L };
}

// Laços em meias-células: cada vértice {x, y, tipo} com tipo 'cima' | 'baixo' | 'volta'.
export function lacos(caixa, params = {}, seed = 1) {
  const p = { ...P, ...params };
  const { C, L, tx, ty } = grade(caixa, p.celulas);
  const ativa = (i, j) => i >= 0 && i < C && j >= 0 && j < L && (p.aro === 0 || Math.min(i, j, C - 1 - i, L - 1 - j) < p.aro);
  const canon = (px, py) => {
    const m = [`${px}|${py}`];
    if (p.simetria !== 'nenhuma') m.push(`${2 * C - px}|${py}`);
    if (p.simetria === 'quadrupla') m.push(`${px}|${2 * L - py}`, `${2 * C - px}|${2 * L - py}`);
    return m.sort()[0];
  };
  const memo = new Map();
  const estado = (px, py) => {
    const k = `${px}|${py}`;
    if (!memo.has(k)) {
      const h = px % 2 !== 0; // aresta horizontal
      const viz = h ? [[(px - 1) / 2, py / 2 - 1], [(px - 1) / 2, py / 2]] : [[px / 2 - 1, (py - 1) / 2], [px / 2, (py - 1) / 2]];
      let e;
      if (viz.filter(([i, j]) => ativa(i, j)).length === 1) e = h ? 'h' : 'v';
      else { const r = rng(`${seed}|q|${canon(px, py)}`); e = r() < p.quebras ? (r() < 0.5 ? 'h' : 'v') : 'x'; }
      memo.set(k, e);
    }
    return memo.get(k);
  };
  const vis = new Set();
  const chave = (x, y, dx, dy) => `${2 * x + dx}|${2 * y + dy}`;
  const saida = [];
  for (let i = 0; i < C; i++) for (let j = 0; j < L; j++) {
    if (!ativa(i, j)) continue;
    for (const [px, py, dx, dy] of [[2 * i + 1, 2 * j, 1, 1], [2 * i + 2, 2 * j + 1, -1, 1], [2 * i + 1, 2 * j + 2, -1, -1], [2 * i, 2 * j + 1, 1, -1]]) {
      let [x, y, ddx, ddy] = [px, py, dx, dy];
      const laco = [];
      while (!vis.has(chave(x, y, ddx, ddy))) {
        vis.add(chave(x, y, ddx, ddy));
        x += ddx; y += ddy;
        const e = estado(x, y);
        let tipo;
        if (e === 'x') tipo = ((x % 2 !== 0) === (ddx * ddy < 0)) ? 'cima' : 'baixo';
        else { tipo = 'volta'; [ddx, ddy] = e === 'h' ? [ddx, -ddy] : [-ddx, ddy]; }
        laco.push({ x, y, tipo });
      }
      if (laco.length) saida.push(laco);
    }
  }
  return { lacos: saida, C, L, tx, ty };
}

const meio = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const bezier = (a, b, c) => Array.from({ length: 6 }, (_, k) => {
  const t = k / 5, u = 1 - t;
  return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]];
});
const junta = (pts) => pts.reduce((o, q) => { if (!o.length || dist(o[o.length - 1], q) > 1e-9) o.push(q); return o; }, []);

export function no(caixa, params = {}, seed = 1) {
  if (!(caixa.l > 0 && caixa.a > 0)) return [];
  const p = { ...P, ...params };
  const { lacos: ls, tx, ty } = lacos(caixa, p, seed);
  const mm = (v) => [caixa.x + (v.x * tx) / 2, caixa.y + (v.y * ty) / 2];
  const m = Math.min(tx, ty);
  let f = Math.min(p.fita, 0.2) * m;
  if (f < 0.8) f = 0; // fita < 0,8 mm vira fio único
  const g = Math.max(p.vao * m, 0.4); // vão ≥ 0,4 mm (caneta)
  const R = f < 0.05 ? g : Math.hypot(f / 2, f / 2 + g);
  const todas = [];
  for (const l of ls) {
    const n = l.length;
    const pt = (k) => mm(l[(k + n) % n]);
    const expande = (k) => {
      const q = l[k % n];
      if (q.tipo !== 'volta') return [pt(k)];
      return bezier(meio(pt(k - 1), pt(k)), pt(k), meio(pt(k), pt(k + 1)));
    };
    const baixos = l.flatMap((q, k) => (q.tipo === 'baixo' ? [k] : []));
    const pecas = baixos.length
      ? baixos.map((a, i) => {
        const len = (baixos[(i + 1) % baixos.length] - a + n) % n || n;
        const pts = [pt(a)];
        for (let k = a + 1; k < a + len; k++) pts.push(...expande(k));
        pts.push(pt(a + len));
        return { poli: junta(pts), aberta: true };
      })
      : [{ poli: junta(Array.from({ length: n }, (_, k) => expande(k)).flat()), aberta: false }];
    for (const { poli, aberta } of pecas) {
      if (!aberta && dist(poli[poli.length - 1], poli[0]) > 1e-9) poli.push(poli[0]);
      if (poli.length < 2) continue;
      let linhas = f < 0.05 ? [poli] : [deslocar(poli, f / 2), deslocar(poli, -f / 2)];
      if (aberta) {
        const A = poli[0], B = poli[poli.length - 1];
        linhas = linhas.flatMap((t) => recortarRaio(t, A, R)).flatMap((t) => recortarRaio(t, B, R));
      }
      todas.push(...linhas);
    }
  }
  return recortarCaixa(todas, caixa);
}

const pv = (chave, caixa, extra = {}) => (v) => no(caixa, { ...P, ...extra, [chave]: v }, 1);
const C30 = { x: 0, y: 0, l: 30, a: 30 };
export const PARAMS = [
  { chave: 'celulas', grupo: 'no', nivel: 'basico', tipo: 'faixa', min: 1, max: 12, passo: 1, padrao: P.celulas, rotulo: 'células', ajuda: 'Quantas células o nó tem no lado curto da caixa. Poucas células dão um nó grande e simples; muitas dão uma trama miúda.', previa: pv('celulas', C30) },
  { chave: 'aro', grupo: 'no', nivel: 'avancado', tipo: 'faixa', min: 0, max: 3, passo: 1, padrao: P.aro, rotulo: 'moldura', ajuda: 'Largura, em células, de uma moldura de nó com o miolo vazio. 0 = painel cheio, sem miolo vazio. Moldura 2 com poucas células deixa o miolo pequeno.', previa: pv('aro', C30, { celulas: 8 }) },
  { chave: 'quebras', grupo: 'no', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: P.quebras, rotulo: 'quebras', ajuda: 'Chance de cada cruzamento virar uma curva em vez de passar reto. 0 = trama regular; valores altos dão nós mais soltos e variados.', previa: pv('quebras', C30) },
  { chave: 'simetria', grupo: 'no', nivel: 'basico', tipo: 'opcao', padrao: P.simetria, rotulo: 'simetria', ajuda: 'Espelha o sorteio das quebras: nenhuma, só na horizontal (espelho) ou nos quatro cantos (quádrupla).',
    opcoes: [{ valor: 'nenhuma', rotulo: 'nenhuma' }, { valor: 'espelho', rotulo: 'espelho' }, { valor: 'quadrupla', rotulo: 'quádrupla' }], previa: pv('simetria', C30, { quebras: 0.3 }) },
  { chave: 'fita', grupo: 'no', nivel: 'basico', tipo: 'faixa', min: 0, max: 0.2, passo: 0.01, padrao: P.fita, rotulo: 'largura da fita', ajuda: 'Largura do fio, como fração da célula. 0 = uma linha simples; valores maiores desenham o fio como fita de duas linhas.', previa: pv('fita', C30) },
  { chave: 'vao', grupo: 'no', nivel: 'avancado', tipo: 'faixa', min: 0.02, max: 0.15, passo: 0.01, padrao: P.vao, rotulo: 'vão do cruzamento', ajuda: 'Folga deixada no fio que passa por baixo, como fração da célula. Folga maior separa mais os fios; muito pequena junta a tinta.', previa: pv('vao', C30) },
];
