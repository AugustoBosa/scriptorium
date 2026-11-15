// Cartão de lembrete: parafuso de nível da bandeja (Anycubic i3 Mega S), só traços para a caneta.
// Uso: node ilustracoes/nivel-bandeja/build.mjs   -> saida/nivel-bandeja-<L>x<A>.{svg,gcode}
// Câmera isométrica = a do kit da skill anatomy (azimute 45°, elevação 30°), refeita aqui em 2 linhas.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { otimizar, svg, gcode } from '../../src/exportar.js';
import { parseFonte } from '../../src/fonte.js';
import { compor } from '../../src/layout.js';
import { NEUTRA } from '../../src/mao.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const MESA = { largura: 210, altura: 210, margens: { topo: 0, dir: 0, base: 0, esq: 0 } };
const TAMANHOS = [[150, 100]];
const FONTE = 'EMSReadability';
const PASSO_VOLTA = 0.5; // mm por volta, M3 (aprox., a confirmar)

// ---------- projeção e geometria ----------
const A = Math.PI / 4, E = Math.PI / 6;
const P = ([x, y, z]) => [x * Math.sin(A) - y * Math.cos(A), (x * Math.cos(A) + y * Math.sin(A)) * Math.sin(E) - z * Math.cos(E)];
const arco = (cx, cy, z, r, a0, a1, n = 72) =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return P([cx + r * Math.cos(a), cy + r * Math.sin(a), z]); });
const FR = Math.PI / 4; // direção do observador no plano (frente)
const frente = (cx, cy, z, r) => arco(cx, cy, z, r, FR - Math.PI / 2, FR + Math.PI / 2, 36);
const lado = (cx, cy, r, z0, z1) => [FR - Math.PI / 2, FR + Math.PI / 2].map((a) => [P([cx + r * Math.cos(a), cy + r * Math.sin(a), z0]), P([cx + r * Math.cos(a), cy + r * Math.sin(a), z1])]);

function casco(pts) { // cadeia monótona
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const mont = (arr) => { const h = []; for (const p of arr) { while (h.length >= 2 && cr(h.at(-2), h.at(-1), p) <= 0) h.pop(); h.push(p); } return h.slice(0, -1); };
  return [...mont(s), ...mont([...s].reverse())];
}

// ---------- linhas ocultas (pintor): cada sólido apaga o que já foi traçado atrás dele ----------
const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
function inter(p, q, r, s) {
  const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]);
  if (Math.abs(d) < 1e-12) return null;
  const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d;
  const u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
  return u >= 0 && u <= 1 && t > 0 && t < 1 ? t : null;
}
function dentro(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = poly[i], [e, f] = poly[j];
    if ((b > p[1]) !== (f > p[1]) && p[0] < (e - a) * (p[1] - b) / (f - b) + a) c = !c;
  }
  return c;
}
function fora(linha, poly) {
  const out = []; let cur = [];
  for (let i = 0; i < linha.length - 1; i++) {
    const p = linha[i], q = linha[i + 1];
    const ts = [0, 1];
    for (let k = 0; k < poly.length; k++) { const t = inter(p, q, poly[k], poly[(k + 1) % poly.length]); if (t !== null) ts.push(t); }
    ts.sort((a, b) => a - b);
    for (let m = 0; m < ts.length - 1; m++) {
      if (ts[m + 1] - ts[m] < 1e-9) continue;
      if (dentro(lerp(p, q, (ts[m] + ts[m + 1]) / 2), poly)) { if (cur.length > 1) out.push(cur); cur = []; }
      else { if (!cur.length) cur.push(lerp(p, q, ts[m])); cur.push(lerp(p, q, ts[m + 1])); }
    }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

// ins: friso de chanfro na face de cima; meio: linha de junção a meia espessura (alumínio + PCB da mesa)
function caixa(x0, x1, y0, y1, z0, z1, { ins = 0, meio = false } = {}) {
  const c = (x, y, z) => P([x, y, z]);
  const tracos = [
    [c(x0, y0, z1), c(x1, y0, z1), c(x1, y1, z1), c(x0, y1, z1), c(x0, y0, z1)],
    [c(x0, y1, z0), c(x0, y1, z1)], [c(x1, y1, z0), c(x1, y1, z1)], [c(x1, y0, z0), c(x1, y0, z1)],
    [c(x0, y1, z0), c(x1, y1, z0), c(x1, y0, z0)],
  ];
  if (ins) tracos.push([c(x0 + ins, y0 + ins, z1), c(x1 - ins, y0 + ins, z1), c(x1 - ins, y1 - ins, z1), c(x0 + ins, y1 - ins, z1), c(x0 + ins, y0 + ins, z1)]);
  if (meio) { const zm = (z0 + z1) / 2; tracos.push([c(x0, y1, zm), c(x1, y1, zm), c(x1, y0, zm)]); }
  const cantos = [];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) cantos.push(c(x, y, z));
  return { tracos, sil: casco(cantos) };
}

// ---------- a cena (mm reais; z para cima; parafuso no eixo (0,0)) ----------
function cena() {
  const itens = [];

  // Proporções da foto: manípulo de roda serrilhada (Ø22), pescoço escuro, mola amarela curta de fio grosso e
  // espiras coladas, encostada na mesa.
  const r = 11, zk = 8; // manípulo
  const knob = [arco(0, 0, zk, r, 0, 2 * Math.PI), arco(0, 0, zk, r - 1.3, 0, 2 * Math.PI, 48), arco(0, 0, 0.9, r, FR - Math.PI / 2, FR + Math.PI / 2, 36), frente(0, 0, 0, r), ...lado(0, 0, r, 0, zk)];
  const NR = 40; // estrias verticais
  for (let i = 0; i < NR; i++) {
    const a = 2 * Math.PI * i / NR;
    if (Math.cos(a - FR) > 0.1) knob.push([P([r * Math.cos(a), r * Math.sin(a), 0.9]), P([r * Math.cos(a), r * Math.sin(a), zk - 1.3])]);
  }
  itens.push({ tracos: knob, sil: casco([...arco(0, 0, 0, r, 0, 6.3, 48), ...arco(0, 0, zk, r, 0, 6.3, 48)]) });

  const zh = 12, rh = 5.5; // pescoço
  itens.push({
    tracos: [arco(0, 0, zh, rh, 0, 2 * Math.PI, 48), frente(0, 0, zk, rh), ...lado(0, 0, rh, zk, zh)],
    sil: casco([...arco(0, 0, zk, rh, 0, 6.3, 32), ...arco(0, 0, zh, rh, 0, 6.3, 32)]),
  });

  const zw = 12.8; // arruela fina sob a mola
  itens.push({
    tracos: [arco(0, 0, zw, 6.8, 0, 2 * Math.PI, 48), frente(0, 0, zh, 6.8), ...lado(0, 0, 6.8, zh, zw)],
    sil: casco([...arco(0, 0, zh, 6.8, 0, 6.3, 32), ...arco(0, 0, zw, 6.8, 0, 6.3, 32)]),
  });

  // mola: fio de 2,2 mm em hélice (R=5,8), 6 espiras. Só a metade da frente de cada espira aparece (o fio é opaco);
  // cada espira vira uma faixa (borda de cima e de baixo) fechada nas laterais.
  const zb = 28, zt = 31, fio = 2.2, voltas = 6, R = 5.8;
  const mola = [];
  const NM = voltas * 72;
  const hz = (i) => zw + fio / 2 + (zb - zw - fio) * i / NM;
  let corrida = [];
  const fecha = () => {
    if (corrida.length > 1) {
      const cima = corrida.map(([t, z]) => P([R * Math.cos(t), R * Math.sin(t), z + fio / 2]));
      const baixo = corrida.map(([t, z]) => P([R * Math.cos(t), R * Math.sin(t), z - fio / 2]));
      mola.push(cima, baixo, [cima[0], baixo[0]], [cima.at(-1), baixo.at(-1)]);
    }
    corrida = [];
  };
  for (let i = 0; i <= NM; i++) {
    const t = i / NM * voltas * 2 * Math.PI;
    if (Math.cos(t - FR) > 0) corrida.push([t, hz(i)]); else fecha();
  }
  fecha();
  itens.push({ tracos: mola, sil: null });

  const cama = caixa(-22, 10, -22, 10, zb, zt, { ins: 1.5, meio: true }); // mesa: alumínio + PCB
  for (const [x, y] of [[-18, -18], [6, -18], [-18, 6]]) cama.tracos.push(arco(x, y, zt, 1.4, 0, 2 * Math.PI, 16), arco(x, y, zt, 0.5, 0, 2 * Math.PI, 8));
  cama.tracos.push(arco(0, 0, zt, 1.5, 0, 2 * Math.PI, 24)); // ponta do parafuso M3 na mesa
  itens.push(cama);

  let tracos = [];
  for (const it of itens) {
    if (it.sil) tracos = tracos.flatMap((t) => fora(t, it.sil));
    tracos.push(...it.tracos);
  }
  // duas setas de giro em volta do manípulo, pela frente (como no croqui), uma acima e outra abaixo:
  // ponta à direita = anti-horário visto de cima = APERTA; ponta à esquerda = horário = AFROUXA
  const aperta = arco(0, 0, 11, 17, FR + 1.3, FR - 1.3, 60);
  const afrouxa = arco(0, 0, -3, 17, FR - 1.3, FR + 1.3, 60);
  return { tracos, setas: [aperta, afrouxa] };
}

// ---------- texto em traço único ----------
const fontes = { [FONTE]: parseFonte(readFileSync(join(RAIZ, 'fontes', FONTE + '.svg'), 'utf8'), FONTE) };
const mao = { ...NEUTRA, base: [{ fonte: FONTE, peso: 1 }] };
const avisosTexto = new Set();
function texto(str, x, y, w, tamanho, alinhamento = 'esquerda') {
  const { paginas, avisos } = compor(str, fontes, mao, { largura: w, altura: 1000, margens: { topo: 0, dir: 0, base: 0, esq: 0 } }, { tamanho, entrelinha: 1.5, alinhamento });
  avisos.filter((a) => a.startsWith('glifo ausente')).forEach((a) => avisosTexto.add(a));
  return paginas[0].map((t) => t.map(([px, py]) => [px + x, py + y - tamanho * 0.75]));
}

// ---------- montagem de um cartão L x A ----------
function cartao(L, H) {
  const { tracos: fig, setas } = cena();
  const reg = { x: 24, y: 6, w: 52, h: H - 12 }; // deixa ~20 mm de cada lado para as legendas das pontas
  const todos = [...fig.flat(), ...setas.flat()];
  const xs = todos.map((p) => p[0]), ys = todos.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min(reg.w / (x1 - x0), reg.h / (y1 - y0));
  const ox = reg.x + (reg.w - (x1 - x0) * s) / 2 - x0 * s, oy = reg.y + (reg.h - (y1 - y0) * s) / 2 - y0 * s;
  const T = (p) => [p[0] * s + ox, p[1] * s + oy];
  const tracos = fig.map((t) => t.map(T));
  const cab = (p, a, h = 3.2) => [[p[0] - h * Math.cos(a - 0.45), p[1] - h * Math.sin(a - 0.45)], p, [p[0] - h * Math.cos(a + 0.45), p[1] - h * Math.sin(a + 0.45)]];

  // setas de giro: a 1ª (APERTA) termina à direita, a 2ª (AFROUXA) termina à esquerda; confere o sentido
  const [aperta, afrouxa] = setas.map((a) => a.map(T));
  if (!(aperta.at(-1)[0] > aperta[0][0] && afrouxa.at(-1)[0] < afrouxa[0][0])) throw new Error("setas de giro com sentido invertido");
  for (const a of [aperta, afrouxa]) {
    const p = a.at(-1), q = a.at(-4);
    tracos.push(a, cab(p, Math.atan2(p[1] - q[1], p[0] - q[0])));
  }
  // seta vertical de 6 mm: sobe = aponta para cima (ponta em y menor)
  const vert = (x, y, sobe) => { const y2 = y + (sobe ? 6 : 0), y3 = y + (sobe ? 0 : 6); return [[[x, y2], [x, y3]], cab([x, y3], sobe ? -Math.PI / 2 : Math.PI / 2, 2)]; };

  // legenda ao lado de cada ponta, do lado de fora: AFROUXA/sobe à esquerda, APERTA/baixa à direita
  const [xa, ya] = afrouxa.at(-1), [xp, yp] = aperta.at(-1), ts = 2.7;
  const esq = texto('AFROUXA\nmesa SOBE', 0, ya + 1, 30, ts);
  const dx = xa - 3 - Math.max(...esq.flat().map((p) => p[0]));
  tracos.push(...esq.map((t) => t.map(([x, y]) => [x + dx, y])), ...vert(xa - 11, ya - 8, true));
  tracos.push(...texto('APERTA\nmesa BAIXA', xp + 3, yp + 1, 30, ts), ...vert(xp + 11, yp - 8, false));

  // bloco de texto
  const tx = L * 0.67, tw = L * 0.33 - 8;
  const volta = (f) => String(PASSO_VOLTA * f).replace(".", ",");
  tracos.push(...texto("NÍVEL DA MESA", tx, 12, tw, 4.2));
  tracos.push(...texto("Anycubic i3 Mega S", tx, 18, tw, 2.6));
  tracos.push(...texto(`Visto de cima:\nanti-horário = APERTA\n(a mesa BAIXA)\nhorário = AFROUXA\n(a mesa SOBE)\n\nRosca M3 (aprox., a confirmar):\n1 volta = ${volta(1)} mm\n1/4 de volta = ${volta(0.25)} mm`, tx, 28, tw, 2.6));

  const M = 3; // borda de margem (a moldura externa é o corte do cartão)
  tracos.push([[0, 0], [L, 0], [L, H], [0, H], [0, 0]], [[M, M], [L - M, M], [L - M, H - M], [M, H - M], [M, M]]);
  return tracos;
}

// ---------- saída ----------
mkdirSync(join(AQUI, 'saida'), { recursive: true });
for (const [L, H] of TAMANHOS) {
  const ox = (MESA.largura - L) / 2, oy = (MESA.altura - H) / 2;
  const bruto = cartao(L, H).filter((t) => t.length > 1).map((t) => t.map(([x, y]) => [x + ox, y + oy]));
  const dentroCartao = bruto.every((t) => t.every(([x, y]) => x >= ox - 1e-6 && x <= ox + L + 1e-6 && y >= oy - 1e-6 && y <= oy + H + 1e-6));
  if (!dentroCartao) console.warn(`  AVISO: traços fora do cartão ${L}x${H}`);
  const tracos = otimizar(bruto);
  const g = gcode(tracos, MESA);
  const nome = `nivel-bandeja-${L}x${H}`;
  writeFileSync(join(AQUI, 'saida', nome + '.svg'), svg(tracos, MESA));
  writeFileSync(join(AQUI, 'saida', nome + '.gcode'), g.texto);
  console.log(`${nome}: ${g.nTracos} traços, ${g.comprimento.toFixed(0)} mm de caneta, avisos mesa: ${g.avisos.length}`);
}
if (avisosTexto.size) console.warn('texto:', [...avisosTexto].join(', '));
