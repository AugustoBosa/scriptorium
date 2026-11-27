// Folga da ponta da caneta no porta-caneta de troca (hardware/pen_holder, branch hardware-pen-holder, v5.1).
// O bloco corre em 2 varetas com folga; com a ponta presa no papel pelo atrito, a cabeça anda até `r` mm sem a ponta sair do lugar.
// Este arquivo não importa nada: scripts/folga-ponta.mjs cola o código dele na página da simulação.

// Números de pen_holder.py: furo do bloco − vareta (FOLGA_TRILHO), guia (BH), quanto a caneta sai abaixo do bloco (CANETA_SAI).
// Mudou um deles no hardware? Atualize aqui e rode `node scripts/folga-ponta.mjs` (regera a tabela e a simulação).
export const FOLGA_PORTA = { c: 0.4, bh: 25, sai: 12 };
// Mesma conta da aba Folga do visor: ponta = c·(1 + 2·sai/bh) de curso; o raio é a metade. ~0,39 mm.
export const raioFolga = ({ c, bh, sai } = FOLGA_PORTA) => (c * (1 + 2 * sai / bh)) / 2;

export const DESVIO_MAX = 0.15;   // desvio máximo da ponta, em fração da altura-x (botão de ajuste)
export const RECONHECER = 0.5;    // a letra simulada tem que ficar a menos da metade do caminho entre o ideal dela e o de qualquer outra
export const AMBIGUA = 0.01;      // pares quase iguais na própria fonte (chamfer fino < 1% do em, ex.: l/I) não contam
export const LETRAS = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ'];
export const TAMANHOS = Array.from({ length: 25 }, (_, i) => 3 + i * 0.5); // 3 a 15 mm, como o slider

const hyp = Math.hypot;

function reamostra(t, passo) {
  const out = [t[0]];
  for (let i = 1; i < t.length; i++) {
    const [x0, y0] = t[i - 1], [x1, y1] = t[i], n = Math.max(1, Math.ceil(hyp(x1 - x0, y1 - y0) / passo));
    for (let k = 1; k <= n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
  }
  return out;
}

// Operador de folga em 2D ("coleira"): a ponta p só anda quando a cabeça c se afasta mais que r, e então é arrastada.
// O deslocamento p − c passa de um traço para o seguinte (levantar a caneta não recentra o bloco). `inicio` = p − c no 1º ponto.
export function simularPonta(tracos, r, inicio = [0, 0]) {
  let off = inicio;
  return tracos.map((t) => {
    const pts = reamostra(t, r > 0 ? Math.min(0.05, r / 4) : 0.05);
    let p = [pts[0][0] + off[0], pts[0][1] + off[1]];
    const out = [p];
    for (const c of pts) {
      const dx = c[0] - p[0], dy = c[1] - p[1], d = hyp(dx, dy);
      if (d > r) p = [c[0] - r * dx / d, c[1] - r * dy / d];
      out.push(p);
    }
    const fim = pts.at(-1);
    off = [p[0] - fim[0], p[1] - fim[1]];
    return out;
  });
}

// 5 inícios: centrado e encostado nos 4 lados da folga; a letra tem que passar em todos.
export const inicios = (r) => [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]];

const escala = (tracos, k) => tracos.map((t) => t.map(([x, y]) => [x * k, y * k]));
// Pontos espaçados ~passo ao longo de cada traço (afina os traços densos da simulação e adensa os do ideal).
function pontos(tracos, passo) {
  const out = [];
  for (const t of tracos) {
    let ult = null;
    for (const p of t.length > 1 ? reamostra(t, passo) : t) if (!ult || hyp(p[0] - ult[0], p[1] - ult[1]) >= passo) out.push(ult = p);
    if (ult !== t.at(-1)) out.push(t.at(-1));
  }
  return out;
}

// Vizinho mais perto numa grade de baldes (lado h): procura em anéis até o anel ficar mais longe que o melhor achado.
function grade(Q, h) {
  const m = new Map(), chave = (i, j) => i * 100003 + j;
  for (const q of Q) { const k = chave(Math.floor(q[0] / h), Math.floor(q[1] / h)); (m.get(k) ?? m.set(k, []).get(k)).push(q); }
  return (p) => {
    const ci = Math.floor(p[0] / h), cj = Math.floor(p[1] / h);
    let best = Infinity, q = null;
    for (let a = 0; a < 1e4 && (a - 1) * h < best; a++) {
      for (let i = ci - a; i <= ci + a; i++) for (let j = cj - a; j <= cj + a; j++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== a) continue;
        for (const s of m.get(chave(i, j)) ?? []) { const d = hyp(s[0] - p[0], s[1] - p[1]); if (d < best) { best = d; q = s; } }
      }
    }
    return [best, q];
  };
}

// → { h, t }: Hausdorff entre o ideal e o simulado (mm) e a translação t aplicada ao simulado, depois de alinhar a letra inteira por translação (ICP só de translação, 3 passos):
// a letra toda deslocada 0,4 mm não atrapalha a leitura, só a forma conta.
export function desvio(ideal, sim, passo) {
  const A = pontos(ideal, passo), B0 = pontos(sim, passo), pertoA = grade(A, passo * 4);
  let tx = 0, ty = 0;
  for (let k = 0; k < 3; k++) {
    let sx = 0, sy = 0;
    for (const b of B0) { const [, q] = pertoA([b[0] + tx, b[1] + ty]); sx += q[0] - b[0] - tx; sy += q[1] - b[1] - ty; }
    tx += sx / B0.length; ty += sy / B0.length;
  }
  const B = B0.map(([x, y]) => [x + tx, y + ty]), pertoB = grade(B, passo * 4);
  let h = 0;
  for (const a of A) h = Math.max(h, pertoB(a)[0]);
  for (const b of B) h = Math.max(h, pertoA(b)[0]);
  return { h, t: [tx, ty] };
}

// Chamfer simétrico (mm) para cada espessura de `esps`: média das distâncias de cada ponto ao outro desenho, descontada meia
// espessura da caneta (o que fica dentro da tinta não se vê). Pequeno = mesmo desenho; ~0 entre 2 letras = a caneta não deixa distinguir.
function chamfer(A, pertoA, B, pertoB, esps) {
  const dA = A.map((p) => pertoB(p)[0]), dB = B.map((p) => pertoA(p)[0]);
  const m = (ds, e) => ds.reduce((s, d) => s + Math.max(0, d - e / 2), 0) / ds.length;
  return esps.map((e) => (m(dA, e) + m(dB, e)) / 2);
}

// Glifos da fonte (unidades da fonte, y para cima) → letras do conjunto em em.
export function letrasDa(fonte) {
  const out = {};
  for (const ch of LETRAS) {
    const g = fonte.glifos[ch];
    if (g?.tracos?.some((t) => t.length > 1)) out[ch] = escala(g.tracos.filter((t) => t.length > 1), 1 / fonte.upm);
  }
  return out;
}

const alturaX = (letras) => (letras.x ? Math.max(...letras.x.flat().map((p) => p[1])) : 0.5);

// Avalia todas as letras num tamanho (mm de em). → { ok, letras: { ch: { ok, desvio, limite, confunde } } }
export function avaliar(letras, tamanho, r, esp = 0.4) {
  const chs = Object.keys(letras), mm = Object.fromEntries(chs.map((c) => [c, escala(letras[c], tamanho)]));
  const passo = Math.max(0.05, tamanho / 80), limite = Math.max(esp / 2, DESVIO_MAX * alturaX(letras) * tamanho);
  const P = Object.fromEntries(chs.map((c) => [c, pontos(mm[c], passo)]));
  const G = Object.fromEntries(chs.map((c) => [c, grade(P[c], passo * 4)]));
  const par = new Map(); // [fino, com tinta]; simétrico
  const dist = (a, b) => { const k = a < b ? a + b : b + a; if (!par.has(k)) par.set(k, chamfer(P[a], G[a], P[b], G[b], [0, esp])); return par.get(k); };
  const res = {};
  for (const a of chs) {
    // rivais: letras que a própria fonte distingue (desenho fino); com a tinta, o que a caneta ainda deixa ver
    const rivais = chs.filter((b) => b !== a && dist(a, b)[0] >= AMBIGUA * tamanho).map((b) => [b, dist(a, b)[1]]);
    const pior = { ok: true, desvio: 0, limite, confunde: null };
    for (const ini of inicios(r)) {
      const sim = simularPonta(mm[a], r, ini), { h: d, t } = desvio(mm[a], sim, passo);
      const S = pontos(sim, passo).map(([x, y]) => [x + t[0], y + t[1]]), GS = grade(S, passo * 4); // alinhada como no desvio
      const [proprio] = chamfer(S, GS, P[a], G[a], [esp]);
      // reconhece: fica a menos de RECONHECER do caminho entre o ideal dela e o de cada rival
      const confunde = rivais.find(([, dab]) => proprio >= RECONHECER * dab)?.[0] ?? null;
      pior.ok &&= d <= limite && !confunde;
      pior.desvio = Math.max(pior.desvio, d);
      pior.confunde ??= confunde;
    }
    res[a] = pior;
  }
  return { ok: Object.values(res).every((x) => x.ok), letras: res };
}

// Menor tamanho (de TAMANHOS) em que todas as letras passam; null se nem 15 mm passa.
// ponytail: busca binária supõe que piorar o tamanho nunca melhora a letra; trocar por varredura se aparecer exceção.
export function tamanhoMinimo(letras, r, esp = 0.4) {
  let lo = 0, hi = TAMANHOS.length - 1;
  const topo = avaliar(letras, TAMANHOS[hi], r, esp);
  const reprovadas = (a) => Object.entries(a.letras).filter(([, v]) => !v.ok).map(([c]) => c).join('');
  if (!topo.ok) return { minimo: null, reprovadas: reprovadas(topo) };
  if (avaliar(letras, TAMANHOS[0], r, esp).ok) return { minimo: TAMANHOS[0], reprovadas: '' };
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (avaliar(letras, TAMANHOS[m], r, esp).ok) hi = m; else lo = m; }
  return { minimo: TAMANHOS[hi], reprovadas: reprovadas(avaliar(letras, TAMANHOS[lo], r, esp)) }; // reprovadas meio passo abaixo
}
