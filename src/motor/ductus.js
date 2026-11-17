import { glifo } from './mao.js';
import { CURSIVAS } from '../fonte.js';
import { rng } from '../rng.js';

// Ductus: junção de letras cursivas num traço só, adiamento de pingos e retoque (workflow/ciclos/18/projeto.md §2).
// Unidades em em, y para cima. Amplitudes são chute: calibrar no papel.
const TOQUE = 0.03, CHEIO = 0.3, LIM = 0.6, DIAC = 0.8;
const SAI_X = 0.2, SAI_ALTA = 0.2, ENT_X = 0.15, VIRA = 0.15, PASSO = 0.03;
const COMPAT = {
  base: { subida: 1, oval: 1, nenhuma: 0.4 },
  alta: { subida: 0.8, oval: 0.6, nenhuma: 0.2 },
  nenhuma: { subida: 0, oval: 0, nenhuma: 0 },
};
// override por par de letras-base; v/w terminam em gancho para trás e a ponte para letras de subida faz laço (revisor M17)
// ponytail: global para todas as fontes; PARES por fonte quando um par for bom numa e ruim noutra (ex.: z da EMSSwiss)
const PARES = Object.fromEntries([...'behijklmnprstuvwxyz'].flatMap((c) => [['v' + c, 0], ['w' + c, 0]]));
const ERRO = 0.02, ERRO_PRESSA = 0.10, VIES = 0.05, TRACINHO = 0.7;
const RETOQUE = 0.03;

const dist = ([ax, ay], [bx, by]) => Math.hypot(bx - ax, by - ay);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const comprimento = (t) => t.reduce((s, p, i) => (i ? s + dist(t[i - 1], p) : 0), 0);
const baseDe = (c) => c.normalize('NFD')[0];
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
const ys = (t) => t.map((p) => p[1]);

export function cursiva(mao) {
  const it = mao.base.filter((b) => b.peso > 0);
  return it.length > 0 && it.every((b) => CURSIVAS.includes(b.fonte));
}

// Altura-x e altura típica do fim do traço das minúsculas da mão.
export function medidas(fontes, mao) {
  const G = (c) => glifo(fontes, mao, c, 0);
  const alturas = [...'acemnorsuvwxz'].map((c) => Math.max(...G(c).tracos.flatMap(ys))).filter(Number.isFinite);
  const xh = mediana(alturas);
  const saidas = [...'acemnu'].map((c) => analisar(G(c), xh)?.S[1] ?? 0);
  return { xh, ySai: mediana(saidas) };
}

// Separa o traço principal (corpo) dos extras (pingo, acento, corte do t). Não altera g.
export function analisar(g, xh) {
  const corpo = [], extras = [];
  for (const t of g.tracos) {
    if (t.length === 0) continue;
    const y = ys(t);
    if (Math.min(...y) > DIAC * xh || (Math.max(...y) < 0 && comprimento(t) < 0.3)) extras.push(t);
    else if (corpo.length && dist(corpo.at(-1).at(-1), t[0]) <= TOQUE) corpo.at(-1).push(...t.slice(1));
    else corpo.push([...t]);
  }
  if (!corpo.length) return null;
  const k = corpo.reduce((b, t, i) => (comprimento(t) > comprimento(corpo[b]) ? i : b), 0);
  let pr = corpo[k].map((p) => [...p]);
  extras.push(...corpo.filter((_, i) => i !== k));
  if (pr[0][0] - pr.at(-1)[0] > VIRA) pr.reverse();
  return { pr, extras, E: pr[0], S: pr.at(-1) };
}

export const saida = (a, adv, med) => a.S[0] < adv - SAI_X ? 'nenhuma' : a.S[1] > med.ySai + SAI_ALTA * med.xh ? 'alta' : 'base';
export const entrada = (a, med) => a.E[1] > 1.3 * med.xh || a.E[1] < -0.1 * med.xh ? 'nenhuma' : a.E[0] <= ENT_X ? 'subida' : 'oval';

// Vetor unitário no sentido da escrita na ponta do traço.
function tang(t, noFim) {
  const p = noFim ? t.at(-1) : t[0];
  const dentro = noFim ? [...t].reverse() : t;
  const q = dentro.find((x) => dist(p, x) >= 0.04) ?? (noFim ? t[0] : t.at(-1));
  const d = dist(p, q);
  if (d === 0) return [1, 0];
  const s = noFim ? 1 : -1; // fim: q→p; começo: p→q
  return [s * (p[0] - q[0]) / d, s * (p[1] - q[1]) / d];
}

// Hermite cúbica de A.último a B[0] com as tangentes reais.
export function ponte(A, B) {
  const p0 = A.at(-1), p1 = B[0], d = dist(p0, p1);
  if (d <= TOQUE) return [...A, ...B.slice(1)];
  const t0 = tang(A, true), t1 = tang(B, false), n = Math.max(2, Math.ceil(d / PASSO)), pts = [];
  for (let j = 1; j < n; j++) {
    const u = j / n;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    pts.push([0, 1].map((k) => h00 * p0[k] + h10 * d * t0[k] + h01 * p1[k] + h11 * d * t1[k]));
  }
  return [...A, ...pts, ...B];
}

// Erro de mão ao deixar o pingo para depois; consome sempre 3 valores de r.
export function adiar(t, m, r) {
  const e = ERRO + ERRO_PRESSA * m.pressa;
  const dx = e * (r() * 2 - 1) + VIES * m.pressa, dy = 0.5 * e * (r() * 2 - 1), u = r();
  if (comprimento(t) < 0.08 && u < TRACINHO * m.pressa) {
    const x = t.map((p) => p[0]), y = ys(t);
    const cx = (Math.min(...x) + Math.max(...x)) / 2, cy = (Math.min(...y) + Math.max(...y)) / 2;
    const L = 0.05 + 0.06 * m.pressa;
    return [[cx - L / 2 + dx, cy - 0.15 * L + dy], [cx + L / 2 + dx, cy + 0.15 * L + dy]];
  }
  return t.map(([px, py]) => [px + dx, py + dy]);
}

// Junta as letras da palavra em traços (coordenada de palavra) ou devolve null se nada ligou.
export function ligar(glifos, chars, m, med, indice) {
  const sd = m.seed;
  let x = 0, fimRun = [], aberto = null, ant = null, nJ = 0;
  const corpo = [], fimPal = [];
  const fecharRun = () => { corpo.push(...fimRun); fimRun = []; };
  glifos.forEach((g, i) => {
    const mv = (t) => t.map(([px, py]) => [px + x, py]);
    const a = /\p{Ll}/u.test(chars[i]) ? analisar(g, med.xh) : null;
    if (!a) {
      fecharRun();
      for (const t of g.tracos) if (t.length) corpo.push(mv(t));
      aberto = ant = null; x += g.adv;
      return;
    }
    const pr = mv(a.pr);
    let ligou = false;
    if (aberto) {
      const v = dist(aberto.at(-1), pr[0]);
      const f = clamp((LIM - v) / (LIM - CHEIO), 0, 1);
      const P = m.ligadura * (PARES[baseDe(chars[i - 1]) + baseDe(chars[i])] ?? COMPAT[ant][entrada(a, med)]) * f * (v <= TOQUE ? 1 : 1 - 0.5 * m.capricho);
      if (rng(sd + '|lig|' + indice + '|' + i)() < P) {
        const novo = ponte(aberto, pr);
        corpo[corpo.lastIndexOf(aberto)] = novo; aberto = novo; ligou = true; nJ++;
      }
    }
    if (!ligou) { fecharRun(); corpo.push(pr); aberto = pr; }
    a.extras.forEach((t, k) => {
      const adia = m.adiamento > 0 && rng(sd + '|adia|' + indice + '|' + i + '|' + k)() < m.adiamento;
      if (adia) fimPal.push(adiar(mv(t), m, rng(sd + '|erro|' + indice + '|' + i + '|' + k)));
      else fimRun.push(mv(t));
    });
    ant = saida(a, g.adv, med); x += g.adv;
  });
  fecharRun();
  return nJ === 0 ? null : [...corpo, ...fimPal];
}

// Estratificado: dá exatamente RETOQUE*retoque das letras. n = índice global do caractere.
// ponytail: espaçamento regular com fase por seed; sortear dentro do bloco se parecer mecânico.
export function retocada(seed, n, retoque) {
  const p = RETOQUE * retoque, fi = rng(seed + '|retoque')();
  return Math.floor((n + 1) * p + fi) > Math.floor(n * p + fi);
}

// Muta g (já é cópia): repasse de um trecho ou ganchinho no início do traço mais longo.
export function retocar(g, primeira, r) {
  const t = g.tracos.reduce((b, c) => (!b || comprimento(c) > comprimento(b) ? c : b), null);
  if (!t || t.length < 2) return;
  const sinal = r() < 0.5 ? 1 : -1, u = r();
  if (t.length >= 6 && !(primeira && u < 0.5)) {
    const a = Math.floor(t.length * (0.2 + 0.4 * u)), b = Math.min(t.length - 1, a + Math.max(2, Math.floor(t.length * 0.15)));
    const seg = t.slice(a, b + 1), o = 0.012 * sinal;
    t.splice(b + 1, 0, ...[...seg].reverse().map(([px, py]) => [px + o, py + o / 2]), ...seg.slice(1).map(([px, py]) => [px + o / 2, py + o / 4]));
  } else {
    const d = tang(t, false);
    t.unshift([t[0][0] - 0.02 * d[0] - 0.04 * sinal * d[1], t[0][1] - 0.02 * d[1] + 0.04 * sinal * d[0]]);
  }
}
