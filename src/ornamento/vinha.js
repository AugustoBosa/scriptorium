// Vinha por colonização de espaço: atratores sorteados atraem ramos que crescem até cobri-los.
import { circulo, recortarCaixa } from '../geo.js';
import { rng, ruido1d } from '../rng.js';

const MAX_VOLTAS = 600, MAX_NOS = 3000, MAX_ATRATORES = 1500;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const P = { densidade: 0.5, curvatura: 0.4, folhas: 0.5, frutos: 0.2, espirais: 0.2 };

// Folha: amêndoa fechada (dois arcos de 5 pontos, base → ponta → base).
function folha([bx, by], ang, E) {
  const L = 0.3 * E, W = 0.12 * E, c = Math.cos(ang), s = Math.sin(ang);
  const arco = (lado, ss) => ss.map((u) => {
    const o = lado * (W / 2) * Math.sin(Math.PI * u);
    return [bx + c * L * u - s * o, by + s * L * u + c * o];
  });
  return [...arco(1, [0, 0.25, 0.5, 0.75, 1]), ...arco(-1, [1, 0.75, 0.5, 0.25, 0])];
}

// Espiral de 1,5 volta que sai tangente à direção d, curvando para o lado `lado` (±1).
function espiral([px, py], d, lado, E) {
  const R = 0.2 * E, cx = px + lado * -d[1] * R, cy = py + lado * d[0] * R;
  const a0 = Math.atan2(py - cy, px - cx);
  return Array.from({ length: 25 }, (_, k) => {
    const u = k / 24, a = a0 + lado * u * 3 * Math.PI, r = R * (1 - 0.8 * u);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

export function vinha(caixa, params = {}, seed = 1) {
  const { x, y, l, a } = caixa;
  if (!(l > 0) || !(a > 0)) return [];
  const p = { ...P, ...params };
  const E = params.escala ?? Math.min(l, a);
  const dentro = params.dentro ?? (([px, py]) => px >= x && px <= x + l && py >= y && py <= y + a);
  const D = clamp(0.12 * E, 0.6, 3), ALCANCE = 10 * D, MORTE = 2 * D;

  // atratores
  const ra = rng(seed + '|atr');
  const cel = (2.5 * D) / Math.sqrt(p.densidade), atr = [];
  for (let gx = 0; gx * cel < l; gx++) for (let gy = 0; gy * cel < a; gy++) {
    const pt = [x + (gx + 0.5 + 0.8 * (ra() - 0.5)) * cel, y + (gy + 0.5 + 0.8 * (ra() - 0.5)) * cel];
    if (atr.length < MAX_ATRATORES && dentro(pt)) atr.push({ p: pt, perto: -1, d: Infinity });
  }

  // nós
  const nos = [];
  const vistos = new Set();
  const chave = ([px, py]) => `${Math.round(px / (D / 4))}|${Math.round(py / (D / 4))}`;
  const raizes = params.raizes ?? [[x + E / 2, y + a - E / 2]];
  for (const r of raizes) if (dentro(r)) { nos.push({ p: r, pai: -1, dir: [0, -1], filho: false }); vistos.add(chave(r)); }
  if (!nos.length) return [];
  const atualiza = (de) => {
    for (const t of atr) for (let k = de; k < nos.length; k++) {
      const d = Math.hypot(t.p[0] - nos[k].p[0], t.p[1] - nos[k].p[1]);
      if (d < t.d) { t.d = d; t.perto = k; }
    }
  };
  atualiza(0);

  let ativos = atr;
  for (let volta = 0; volta < MAX_VOLTAS && nos.length < MAX_NOS && ativos.length; volta++) {
    const soma = new Map();
    for (const t of ativos) {
      if (t.d >= ALCANCE) continue;
      const q = nos[t.perto].p;
      const s = soma.get(t.perto) ?? [0, 0];
      s[0] += (t.p[0] - q[0]) / t.d; s[1] += (t.p[1] - q[1]) / t.d;
      soma.set(t.perto, s);
    }
    const antes = nos.length, travados = new Set();
    for (const k of [...soma.keys()].sort((u, v) => u - v)) {
      const [sx, sy] = soma.get(k), L = Math.hypot(sx, sy);
      if (L < 1e-9 || nos.length >= MAX_NOS) { travados.add(k); continue; }
      const g = p.curvatura * 0.6 * ruido1d(seed + '|c', k * 0.2), cg = Math.cos(g), sg = Math.sin(g);
      const dir = [(sx * cg - sy * sg) / L, (sx * sg + sy * cg) / L];
      const novo = [nos[k].p[0] + dir[0] * D, nos[k].p[1] + dir[1] * D];
      if (!dentro(novo) || vistos.has(chave(novo))) { travados.add(k); continue; }
      vistos.add(chave(novo));
      nos[k].filho = true;
      nos.push({ p: novo, pai: k, dir, filho: false });
    }
    if (nos.length === antes) break;
    atualiza(antes);
    ativos = ativos.filter((t) => t.d > MORTE && !travados.has(t.perto)); // nó travado: descarta os atratores dele
  }

  // ramos: de cada ponta sobe até um nó já emitido
  const emitido = new Set();
  const ramos = [];
  nos.forEach((no, i) => {
    if (no.pai < 0 || no.filho) return;
    const cadeia = [i];
    for (let k = no.pai; ; k = nos[k].pai) {
      cadeia.push(k);
      if (emitido.has(k) || nos[k].pai < 0) break;
    }
    if (cadeia.reduce((u, k, j) => u + (j ? Math.hypot(nos[k].p[0] - nos[cadeia[j - 1]].p[0], nos[k].p[1] - nos[cadeia[j - 1]].p[1]) : 0), 0) < 3 * D - 1e-9) return;
    cadeia.reverse().forEach((k) => emitido.add(k));
    ramos.push(cadeia);
  });
  const tracos = ramos.map((c) => c.map((k) => nos[k].p));

  // enfeites: fluxo próprio, consumo fixo (3 por ponta, 1 por nó de ramo)
  const re = rng(seed + '|enf');
  const enf = [];
  let lado = 1;
  const ok = (t) => t.every(dentro);
  const dirEm = (c, i) => { const [u, v] = i > 0 ? [c[i - 1], c[i]] : [c[0], c[1]]; const L = Math.hypot(v[0] - u[0], v[1] - u[1]) || 1; return [(v[0] - u[0]) / L, (v[1] - u[1]) / L]; };
  for (const c of ramos.map((r) => r.map((k) => nos[k].p))) {
    const u1 = re(), u2 = re(), u3 = re();
    const ponta = c[c.length - 1], d = dirEm(c, c.length - 1);
    let e = null;
    if (u1 < p.espirais) { e = [espiral(ponta, d, lado, E)]; lado = -lado; }
    else if (u2 < p.frutos) {
      const cab = [ponta[0] + d[0] * 0.1 * E, ponta[1] + d[1] * 0.1 * E], r = 0.07 * E;
      e = [[ponta, cab], circulo(cab[0] + d[0] * r, cab[1] + d[1] * r, r, 10)];
    } else if (u3 < p.folhas) e = [folha(ponta, Math.atan2(d[1], d[0]), E)];
    if (e && e.every(ok)) enf.push(...e);
    c.forEach((q, i) => {
      const u = re();
      if (i === 0 || i % 4 || u >= p.folhas) return;
      const dd = dirEm(c, i), ang = Math.atan2(dd[1], dd[0]) + lado * (Math.PI / 3);
      lado = -lado;
      const f = folha(q, ang, E);
      if (ok(f)) enf.push(f);
    });
  }
  return recortarCaixa([...tracos, ...enf], caixa);
}

const pv = (chave, caixa, extra = {}) => (v) => vinha(caixa, { ...P, ...extra, [chave]: v }, 1);
const CX = { x: 0, y: 0, l: 60, a: 14 }, EX = { escala: 14 };
const faixa = (chave, padrao, rotulo, ajuda, nivel = 'basico', min = 0, max = 1) =>
  ({ chave, grupo: 'vinha', nivel, tipo: 'faixa', min, max, passo: 0.01, padrao, rotulo, ajuda, previa: pv(chave, CX, EX) });

export const PARAMS = [
  faixa('densidade', 0.5, 'densidade', 'Quantos pontos de atração a vinha tem para crescer. Valores baixos dão ramos soltos e raros; altos enchem a área de ramos.', 'basico', 0.2, 1),
  faixa('curvatura', 0.4, 'curvatura', 'Quanto os ramos ondulam, de 0 a 1. 0 = ramos quase retos; 1 = ramos bem sinuosos.'),
  faixa('folhas', 0.5, 'folhas', 'Quantas folhas nascem nos ramos e nas pontas, de 0 a 1. 0 = nenhuma folha.'),
  faixa('frutos', 0.2, 'frutos', 'Quantas pontas terminam em um fruto redondo, de 0 a 1. 0 = nenhum fruto.', 'avancado'),
  faixa('espirais', 0.2, 'espirais', 'Quantas pontas terminam em uma espiral enrolada (gavinha), de 0 a 1. 0 = nenhuma espiral.', 'avancado'),
];
