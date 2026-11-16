import { rng } from '../rng.js';

// Contexto da escrita: variantes por ocorrência, encaixe óptico e arremate. Glifo entra, glifo sai (em, y para cima).
const AMP = 0.03; // amplitude da deformação de baixa frequência (em)
const XH = 0.45; // ponytail: altura-x fixa em 0,45 em; medir por fonte se distorcer
const Y0 = -0.25, DY = 1 / 6; // 6 faixas cobrindo y em [-0,25; 0,75] em
const LIM_ENCAIXE = 0.12; // ajuste máximo de avanço por par (em)
const ARREMATE = 0.18; // comprimento do arremate com arremate = 1 (em)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Par e ímpar sorteiam de conjuntos disjuntos: n e n+1 nunca coincidem, sem guardar estado. 0 = sem deformação.
export function variante(seed, ch, n, K) {
  if (K <= 1) return 0;
  const u = rng(seed + '|' + ch + '|esc|' + n)();
  return n % 2 === 0 ? 2 * Math.floor(u * Math.ceil(K / 2)) : 1 + 2 * Math.floor(u * Math.floor(K / 2));
}

export function escalar(g, k) {
  return { adv: g.adv * k, tracos: g.tracos.map((t) => t.map(([x, y]) => [x * k, y * k])) };
}

// Campo suave sobre a caixa do glifo: pontos que se tocam continuam se tocando. v === 0 devolve g.
export function deformar(g, seed, ch, v, altura) {
  if (v === 0) return g;
  const pts = g.tracos.flat();
  if (!pts.length) return g;
  const r = rng(seed + '|' + ch + '|alt|' + v), j = () => r() * 2 - 1;
  const [p0, p1, p2, q0, q1, q2, sw, sa, sd] = Array.from({ length: 9 }, j);
  const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]));
  const y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
  const w = Math.max(x1 - x0, 1e-6), h = Math.max(y1 - y0, 1e-6), yx = XH * altura;
  return {
    adv: g.adv * (1 + 0.05 * sw),
    tracos: g.tracos.map((t) => t.map(([x, y]) => {
      const xn = (x - x0) / w, yn = (y - y0) / h;
      const ya = y > yx ? yx + (y - yx) * (1 + 0.10 * sa) : y < 0 ? y * (1 + 0.10 * sd) : y;
      return [
        x * (1 + 0.05 * sw) + AMP * (p0 * (1 - yn) + p1 * yn + p2 * Math.sin(Math.PI * yn)),
        ya + AMP * (q0 * (1 - xn) + q1 * xn + q2 * Math.sin(Math.PI * xn)),
      ];
    })),
  };
}

// Contorno esquerdo/direito do glifo em 6 faixas de altura.
export function perfis(g) {
  const esq = Array(6).fill(Infinity), dir = Array(6).fill(-Infinity);
  for (const t of g.tracos) {
    const segs = t.length === 1 ? [[t[0], t[0]]] : t.slice(1).map((b, i) => [t[i], b]);
    for (const [[ax, ay], [bx, by]] of segs) {
      for (let k = 0; k < 6; k++) {
        const lo = Y0 + k * DY, hi = lo + DY;
        if (Math.max(ay, by) < lo || Math.min(ay, by) > hi) continue;
        const dy = by - ay;
        const u0 = dy === 0 ? 0 : clamp((lo - ay) / dy, 0, 1), u1 = dy === 0 ? 1 : clamp((hi - ay) / dy, 0, 1);
        for (const u of [u0, u1]) {
          const x = ax + (bx - ax) * u;
          esq[k] = Math.min(esq[k], x);
          dir[k] = Math.max(dir[k], x);
        }
      }
    }
  }
  return { esq, dir };
}

// Menor vão horizontal entre A e B (B logo após A) nas faixas em que os dois têm tinta; sem faixa comum, null.
export function vaoMin(A, B) {
  const a = perfis(A), b = perfis(B);
  let v = null;
  for (let k = 0; k < 6; k++) {
    if (!Number.isFinite(a.dir[k]) || !Number.isFinite(b.esq[k])) continue;
    const d = A.adv - a.dir[k] + b.esq[k];
    if (v === null || d < v) v = d;
  }
  return v;
}

// Correção do avanço de A para encaixar em B rumo ao vão-alvo; sempre dentro de ±0,12 × contexto.
export function encaixe(A, B, contexto, alvo) {
  const v = vaoMin(A, B);
  return v === null || alvo === null ? 0 : contexto * clamp(alvo - v, -LIM_ENCAIXE, LIM_ENCAIXE);
}

const comprimento = (t) => t.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - t[i][0], p[1] - t[i][1]), 0);

// Prolonga o último traço para a direita (solta a caneta). Muta g (já é cópia); r = rng próprio.
export function arrematar(g, arremate, r) {
  const t = g.tracos.findLast((t) => comprimento(t) >= 0.2); // pula pingos e acentos
  if (!t) return;
  const fim = t[t.length - 1];
  const ant = t.findLast((p) => Math.hypot(fim[0] - p[0], fim[1] - p[1]) >= 0.05);
  if (!ant) return;
  const m = Math.hypot(fim[0] - ant[0], fim[1] - ant[1]);
  const dx = (fim[0] - ant[0]) / m, dy = (fim[1] - ant[1]) / m;
  if (dx < 0.2) return; // ponytail: só saída para a direita; o M17 conhece o ductus
  const L = arremate * ARREMATE * (0.6 + 0.8 * r());
  for (let j = 1; j <= 4; j++) {
    const u = j / 4;
    t.push([fim[0] + dx * L * u, fim[1] + dy * L * u + 0.25 * L * u * u]);
  }
  g.adv = Math.max(g.adv, t[t.length - 1][0]);
}
