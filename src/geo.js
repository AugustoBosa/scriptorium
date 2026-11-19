// Geometria 2D em mm (y para baixo). Traço = [[x, y], ...]; caixa = {x, y, l, a}.
import { hachureLines } from 'hachure-fill';

export const VAO = 0.5; // mm: piso de todo vão e folga (caneta 0,4)
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const valido = (t) => Array.isArray(t) && t.length >= 2 && t.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
export const comprimento = (t) => t.slice(1).reduce((s, p, i) => s + dist(t[i], p), 0);

export const ret = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
export const retDe = (c) => ret(c.x, c.y, c.x + c.l, c.y + c.a);
export const inset = (c, d) => ({ x: c.x + d, y: c.y + d, l: Math.max(0, c.l - 2 * d), a: Math.max(0, c.a - 2 * d) });

export function circulo(cx, cy, r, n = 24) {
  return Array.from({ length: n + 1 }, (_, k) => [cx + r * Math.cos((2 * Math.PI * k) / n), cy + r * Math.sin((2 * Math.PI * k) / n)]);
}
export function arco(cx, cy, r, a0, a1, n = 12) {
  return Array.from({ length: n + 1 }, (_, k) => {
    const a = a0 + ((a1 - a0) * k) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

export function caixaDe(tracos) {
  const pts = tracos.flat();
  if (!pts.length) return { x: 0, y: 0, l: 0, a: 0 };
  let x = Infinity, y = Infinity, X = -Infinity, Y = -Infinity; // laço, não spread: textos longos estouram o limite de argumentos
  for (const [px, py] of pts) { x = Math.min(x, px); y = Math.min(y, py); X = Math.max(X, px); Y = Math.max(Y, py); }
  return { x, y, l: X - x, a: Y - y };
}

// ponytail: remove ponto repetido e traço com < 2 pontos; não trata NaN de propósito
export function limpar(tracos) {
  const out = [];
  for (const t of tracos) {
    const u = [];
    for (const p of t) if (!u.length || dist(u[u.length - 1], p) >= 1e-9) u.push(p);
    if (u.length >= 2) out.push(u);
  }
  return out;
}

// n = max(1, ceil(L/passo)); pontos em k·L/n, k = 0..n
export function reamostrar(t, passo) {
  if (!(passo > 0)) throw new Error(`reamostrar: passo inválido (${passo})`);
  if (t.length < 2) return [...t];
  const L = comprimento(t);
  const n = Math.max(1, Math.ceil(L / passo));
  const out = [];
  let i = 0, acum = 0;
  for (let k = 0; k <= n; k++) {
    const s = (k * L) / n;
    while (i < t.length - 2 && acum + dist(t[i], t[i + 1]) < s) { acum += dist(t[i], t[i + 1]); i++; }
    const seg = dist(t[i], t[i + 1]);
    const u = seg > 0 ? Math.min(1, (s - acum) / seg) : 0;
    out.push([t[i][0] + (t[i + 1][0] - t[i][0]) * u, t[i][1] + (t[i + 1][1] - t[i][1]) * u]);
  }
  return out;
}

// escala uniforme e centraliza na caixa
export function encaixar(tracos, c) {
  const b = caixaDe(tracos);
  let s = 1;
  if (b.l && b.a) s = Math.min(c.l / b.l, c.a / b.a);
  else if (b.l) s = c.l / b.l;
  else if (b.a) s = c.a / b.a;
  const bx = b.x + b.l / 2, by = b.y + b.a / 2, cx = c.x + c.l / 2, cy = c.y + c.a / 2;
  return tracos.map((t) => t.map(([x, y]) => [cx + (x - bx) * s, cy + (y - by) * s]));
}

// Liang–Barsky por segmento; pedaços dentro da caixa, presos nela
export function recortarCaixa(tracos, c) {
  const x1 = c.x + c.l, y1 = c.y + c.a;
  const saida = [];
  for (const t of tracos) {
    let atual = [];
    const fecha = () => { if (atual.length >= 2) saida.push(atual); atual = []; };
    for (let i = 0; i + 1 < t.length; i++) {
      const [px, py] = t[i], [qx, qy] = t[i + 1];
      const dx = qx - px, dy = qy - py;
      let t0 = 0, t1 = 1, fora = false;
      for (const [pk, qk] of [[-dx, px - c.x], [dx, x1 - px], [-dy, py - c.y], [dy, y1 - py]]) {
        if (pk === 0) { if (qk < 0) { fora = true; break; } }
        else if (pk < 0) t0 = Math.max(t0, qk / pk);
        else t1 = Math.min(t1, qk / pk);
      }
      if (fora || t0 > t1) { fecha(); continue; }
      if (!atual.length || t0 > 0) { fecha(); atual = [[px + dx * t0, py + dy * t0]]; }
      atual.push([px + dx * t1, py + dy * t1]);
      if (t1 < 1) fecha();
    }
    fecha();
  }
  const prende = ([x, y]) => [Math.min(x1, Math.max(c.x, x)), Math.min(y1, Math.max(c.y, y))];
  return limpar(saida.map((t) => t.map(prende)));
}

// tira a parte de t dentro do círculo (c, r); alterna entra/sai
export function recortarRaio(t, c, r) {
  const r2 = r * r;
  let atual = dist(t[0], c) >= r ? [t[0]] : [];
  const out = [];
  const fecha = () => { if (atual.length >= 2) out.push(atual); atual = []; };
  for (let i = 0; i + 1 < t.length; i++) {
    const p = t[i], q = t[i + 1];
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const A = dx * dx + dy * dy;
    const B = 2 * (dx * (p[0] - c[0]) + dy * (p[1] - c[1]));
    const C = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 - r2;
    const disc = B * B - 4 * A * C;
    if (A > 0 && disc > 0) {
      const sq = Math.sqrt(disc);
      for (const u of [(-B - sq) / (2 * A), (-B + sq) / (2 * A)].sort((u1, u2) => u1 - u2)) {
        if (u <= 0 || u >= 1) continue;
        const X = [p[0] + dx * u, p[1] + dy * u];
        if (atual.length) { atual.push(X); fecha(); } else atual = [X];
      }
    }
    if (atual.length) atual.push(q);
  }
  fecha();
  return limpar(out);
}

// ponytail: O(n·m) ingênuo; grade espacial se ficar lento
export function afastar(tracos, obstaculos, folga, passo = 0.5) {
  const O = obstaculos.flatMap((t) => reamostrar(t, passo));
  const longe = (p) => O.every((o) => dist(o, p) > folga);
  const out = [];
  for (const t of tracos) {
    let atual = [];
    for (const p of reamostrar(t, passo)) {
      if (longe(p)) atual.push(p);
      else { out.push(atual); atual = []; }
    }
    out.push(atual);
  }
  return limpar(out);
}

// offset ingênuo por normais; fechado = dá a volta; mitra limitada a 2d
// ponytail: sem tratar autointerseção em curva fechada; trocar por paper.js se incomodar
export function deslocar(t, d) {
  const p = [];
  for (const q of t) if (!p.length || dist(p[p.length - 1], q) >= 1e-9) p.push(q);
  if (p.length < 2) return p;
  const fechado = p.length > 2 && dist(p[0], p[p.length - 1]) < 1e-9;
  if (fechado) p.pop();
  const n = p.length;
  const normalSeg = (k) => {
    const a = p[k], b = p[(k + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    return [-dy / L, dx / L];
  };
  const normalizar = (v) => { const L = Math.hypot(v[0], v[1]); return [v[0] / L, v[1] / L]; };
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1];
  const out = p.map((pt, i) => {
    const temAnt = fechado || i > 0, temProx = fechado || i < n - 1;
    const na = temAnt ? normalSeg(fechado ? (i - 1 + n) % n : i - 1) : null;
    const nb = temProx ? normalSeg(i) : null;
    const ref = nb ?? na;
    let m = ref;
    if (na && nb) {
      const s = [na[0] + nb[0], na[1] + nb[1]];
      m = Math.hypot(s[0], s[1]) < 1e-9 ? nb : normalizar(s);
    }
    const f = d / Math.max(0.5, dot(m, ref));
    return [pt[0] + m[0] * f, pt[1] + m[1] * f];
  });
  if (fechado) out.push(out[0]);
  return out;
}

// hachure-fill: armadilhas — lista de polígonos, cópia (não muta), x·100 inteiro, stepOffset = gap
const K = 100;
export function hachura(poligonos, { angulo = 45, espaco = 1 } = {}) {
  const lista = typeof poligonos[0][0] === 'number' ? [poligonos] : poligonos;
  const e = Math.round(Math.max(espaco, 0.1) * K);
  const linhas = hachureLines(lista.map((p) => p.map(([x, y]) => [x * K, y * K])), e, angulo, e)
    .map((l) => l.map(([x, y]) => [x / K, y / K]));
  return linhas.filter(([a, b]) => dist(a, b) > 0.05);
}

export function problemas(tracos, c, eps = 1e-6) {
  const out = [];
  tracos.forEach((t, i) => {
    if (t.length < 2) out.push(`traço ${i}: < 2 pontos`);
    if (t.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) out.push(`traço ${i}: não finito`);
    else if (t.some(([x, y]) => x < c.x - eps || x > c.x + c.l + eps || y < c.y - eps || y > c.y + c.a + eps)) out.push(`traço ${i}: fora da caixa`);
  });
  return out;
}
