// Notas: marcação no texto ({nota:…}, {~errado~>certo}, {_…_}, {o:…}), camada de notas (marginais, risco, sublinhado, laço, rabiscos).
// Regra de ouro: nenhum traço de nota toca palavra que não seja o alvo dele (checado por amostragem de pontos, sem booleanos de polígono).
import { caixaDe, reamostrar, dist, recortarCaixa, hachura, ret, limpar, VAO } from '../geo.js';
import { rng, ruido1d } from '../rng.js';
import { compor } from '../layout.js';
import { circulo } from '../arcano/circulo.js';
import { florao } from '../ornamento/filigrana.js';
import { escreverEm } from './documento.js';

const TAU = 2 * Math.PI;
export const contar = (s) => s.split('\n').flatMap((l) => l.split(' ').filter(Boolean)).length;
const resumo = (s) => (s.length > 24 ? s.slice(0, 24) + '…' : s);

// { limpo, marcas, avisos }. ini/fim = índice de palavra (igual a ancora.indice do compor). Sem aninhamento.
// ponytail: o 1º '}' fecha a marca; chave dentro de chave não é suportada.
export function parsearNotas(texto) {
  let limpo = '', i = 0;
  const marcas = [], avisos = [];
  while (i < texto.length) {
    if (texto[i] !== '{') { limpo += texto[i++]; continue; }
    const f = texto.indexOf('}', i), c = f < 0 ? '' : texto.slice(i + 1, f);
    let m;
    if (f < 0) avisos.push(`marca sem fechamento: "${resumo(texto.slice(i))}"`);
    else if ((m = /^nota(?:@([^:]*))?:([\s\S]*)$/.exec(c)) && m[2].trim()) {
      const pos = lerPos(m[1]);
      if (m[1] != null && !pos) avisos.push(`posição de nota desconhecida: "${m[1]}" (use esquerda, direita, acima, abaixo ou x,y em mm)`);
      marcas.push({ tipo: 'nota', ini: Math.max(0, contar(limpo) - 1), fim: Math.max(0, contar(limpo) - 1), texto: m[2].trim(), ...(pos && { pos }) });
      i = f + 1;
      if (limpo.endsWith(' ') && texto[i] === ' ') i++;
      continue;
    } else if ((m = /^~([^~]+)~>([\s\S]*)$/.exec(c))) {
      marcas.push({ tipo: 'correcao', ...intervalo(limpo, m[1]), texto: m[2].trim() }); limpo += m[1]; i = f + 1; marcas.at(-1).fim = Math.max(marcas.at(-1).ini, contar(limpo) - 1); continue;
    } else if ((m = /^_([\s\S]*\S[\s\S]*)_$/.exec(c)) || (m = /^o:([\s\S]*\S[\s\S]*)$/.exec(c))) {
      marcas.push({ tipo: c[0] === '_' ? 'sublinhar' : 'circular', ...intervalo(limpo, m[1]) }); limpo += m[1]; i = f + 1; marcas.at(-1).fim = Math.max(marcas.at(-1).ini, contar(limpo) - 1); continue;
    } else avisos.push(`marca desconhecida: "{${resumo(c)}}"`);
    limpo += texto[i++]; // fica literal
  }
  return { limpo, marcas, avisos };
}
const intervalo = (limpo, trecho) => ({ ini: contar(limpo + /^\s*/.exec(trecho)[0] + 'x') - 1, fim: 0 });

// Posição de uma nota: lado ('esquerda' | 'direita' | 'acima' | 'abaixo') ou canto superior esquerdo { x, y } em mm.
export const LADOS = ['esquerda', 'direita', 'acima', 'abaixo'];
// Mão das notas por padrão: seta curva e um pouco torta, ponta aberta desigual, notas levemente inclinadas, girando para caber.
export const PADRAO_MAO = { curva: 0.4, irregular: 0.5, ponta: 'aberta', inclinacao: 6, girar: true };
// Texto da posição: '[lado | x,y][/graus]'. Lado vazio com ângulo = lado automático com ângulo fixo.
function lerPos(s) {
  if (s == null) return null;
  const [lugar, giro] = s.trim().split('/').map((x) => x.trim()), num = /^-?\d+(?:\.\d+)?$/;
  if (giro != null && !num.test(giro)) return null;
  const ang = giro != null ? { ang: Number(giro) } : {};
  if (!lugar) return giro != null ? ang : null;
  if (LADOS.includes(lugar)) return { lado: lugar, ...ang };
  const m = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(lugar);
  return m ? { x: Number(m[1]), y: Number(m[2]), ...ang } : null;
}
const um = (v) => +v.toFixed(1);
const escreverPos = (pos) => {
  if (!pos) return '';
  const lugar = pos.lado ?? (pos.x != null ? `${um(pos.x)},${um(pos.y)}` : '');
  return '@' + lugar + (pos.ang != null ? '/' + um(pos.ang) : '');
};

// Reescreve a posição da k-ésima {nota…} do texto (null = automática). Fora do intervalo: texto igual.
export function posicionarNota(texto, k, pos) {
  let n = -1;
  return texto.replace(/\{nota(@[^:}]*)?:/g, (todo) => (++n === k ? `{nota${escreverPos(pos)}:` : todo));
}

// Caixa de cada palavra (bloco de traços [g_k, g_k+1)); null se a palavra não tem traço.
export function caixasPalavras(tracos, grupos) {
  return grupos.map((g, k) => { const b = tracos.slice(g, grupos[k + 1] ?? tracos.length); return b.length ? caixaDe(b) : null; });
}

// Algum ponto (amostrado a 0,2 mm) dentro de alguma caixa inflada por `folga`? Encostar na borda não conta.
export function sobrepoe(tracos, caixas, folga = 0) {
  const lista = typeof tracos[0]?.[0] === 'number' ? [tracos] : tracos;
  const cs = caixas.filter(Boolean).map((c) => [c.x - folga, c.y - folga, c.x + c.l + folga, c.y + c.a + folga]);
  const e = 1e-9;
  return lista.some((t) => reamostrar(t, 0.2).some(([x, y]) => cs.some(([x0, y0, x1, y1]) => x > x0 + e && x < x1 - e && y > y0 + e && y < y1 - e)));
}

// Rabisco de margem dentro da caixa: 'espiral' | 'estrela' | 'caixa' | 'flor'.
export function rabisco(tipo, caixa, seed = 1) {
  const R = Math.min(caixa.l, caixa.a) / 2, cx = caixa.x + caixa.l / 2, cy = caixa.y + caixa.a / 2;
  if (tipo === 'estrela') return circulo(caixa, { aneis: [], poligonos: [{ n: 5, passo: 2, raio: 1 }] }, seed);
  if (tipo === 'flor') return florao(caixa, { petalas: 5 }, seed);
  if (tipo === 'caixa') {
    const q = { x: caixa.x + 0.05, y: caixa.y + 0.05, l: caixa.l - 0.1, a: caixa.a - 0.1 };
    const poli = ret(q.x, q.y, q.x + q.l, q.y + q.a).slice(0, 4);
    return recortarCaixa([ret(q.x, q.y, q.x + q.l, q.y + q.a), ...hachura([poli], { angulo: 45, espaco: 0.8 })], caixa);
  }
  const r = rng(`${seed}|rabisco|espiral`), voltas = 3 + r(), th0 = r() * TAU;
  const n = Math.max(24, Math.ceil((voltas * TAU * R) / 0.4));
  return [Array.from({ length: n + 1 }, (_, k) => {
    const u = k / n, th = th0 + voltas * TAU * u, rr = R * u * (1 - 0.05 * r());
    return [cx + rr * Math.cos(th), cy + rr * Math.sin(th)];
  })];
}

// Conector da âncora à nota. g = { dir, xTexto, base, tam, calha, xNota, yNota, tn }; dir = nota à direita do texto.
export function conectar(tipo, g) {
  const { dir, xTexto, base, tam, calha, xNota, yNota, tn, f = 0.5, dy = 0, nasce = VAO } = g; // f = via vertical (0..1 da calha), dy = desloca a saída, nasce = folga até a palavra
  const s = dir ? 1 : -1, yM = base - 0.3 * tam + dy;
  const xr = (f) => (dir ? calha.x + f * calha.l : calha.x + (1 - f) * calha.l) + s * (nasce - VAO); // f = 0 do lado do texto; nasce > VAO recua a chave
  const bez = (p0, p1, p2, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [0, 1].map((k) => (1 - u) ** 2 * p0[k] + 2 * u * (1 - u) * p1[k] + u * u * p2[k]); });
  if (tipo === 'chave') {
    const y0 = base - tam, y1 = base + 0.3 * tam, h = y1 - y0, ym = (y0 + y1) / 2;
    const [xa, xs, xb] = [xr(0.2), xr(0.3), xr(0.45)];
    const chave = [...bez([xa, y0], [xs, y0], [xs, y0 + 0.3 * h]), ...bez([xs, ym - 0.2 * h], [xs, ym], [xb, ym]), ...bez([xb, ym], [xs, ym], [xs, ym + 0.2 * h]), ...bez([xs, y1 - 0.3 * h], [xs, y1], [xa, y1])];
    if (Math.abs(yNota - yM) <= tn) return [limpar([chave])[0]];
    const xv = xr(0.45 + 0.5 * f);
    return [limpar([chave])[0], limpar([[[xb, ym], [xv, ym], [xv, yNota], [xNota, yNota]]])[0]];
  }
  const xc = calha.x + f * calha.l;
  const linha = limpar([[[xTexto + s * nasce, yM], [xc, yM], [xc, yNota], [xNota, yNota]]]);
  if (tipo !== 'seta') return linha;
  const [px, py] = linha[0][0], a = Math.PI / 6;
  return [linha[0], [[px, py], [px + s * 1.2 * Math.cos(a), py - 1.2 * Math.sin(a)]], [[px, py], [px + s * 1.2 * Math.cos(a), py + 1.2 * Math.sin(a)]]];
}

const mover = (trs, dx, dy) => trs.map((t) => t.map(([x, y]) => [x + dx, y + dy]));
// Traço de mão: reamostra a 0,5 mm e desvia na normal com tremor fino (~8 mm) e deriva lenta (~25 mm) que some nas pontas.
function tracoMao(t, fino, lento, sd) {
  const p = reamostrar(t, 0.5), tot = p.reduce((acc, q, i) => acc + (i ? dist(p[i - 1], q) : 0), 0) || 1;
  let s = 0;
  return p.map((q, i) => {
    if (i) s += dist(p[i - 1], q);
    const env = Math.sin(Math.PI * Math.min(1, s / tot)); // começa e termina onde devia
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], L = dist(a, b) || 1;
    const d = ruido1d(sd, s / 8) * fino + ruido1d(sd + '|lento', s / 25) * lento * env;
    return [q[0] - ((b[1] - a[1]) / L) * d, q[1] + ((b[0] - a[0]) / L) * d];
  });
}

// Gira os traços `ang` graus em volta do centro da caixa deles.
export function girarEm(trs, ang) {
  if (!ang) return trs;
  const b = caixaDe(trs), cx = b.x + b.l / 2, cy = b.y + b.a / 2, r = (ang * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r);
  return trs.map((t) => t.map(([x, y]) => [cx + (x - cx) * co - (y - cy) * si, cy + (x - cx) * si + (y - cy) * co]));
}
// Curva de mão de `a` até `b`: quadrática com a barriga para um lado (k = -1..1, fração de 0,3 do comprimento).
export function curvaMao(a, b, k) {
  const L = dist(a, b), n = Math.max(8, Math.ceil(L / 0.5)), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const cx = mx - ((b[1] - a[1]) / (L || 1)) * k * 0.3 * L, cy = my + ((b[0] - a[0]) / (L || 1)) * k * 0.3 * L;
  return Array.from({ length: n + 1 }, (_, i) => { const u = i / n, v = 1 - u; return [v * v * a[0] + 2 * u * v * cx + u * u * b[0], v * v * a[1] + 2 * u * v * cy + u * u * b[1]]; });
}
// Ponta de seta feita à mão no fim de `pts`: 'aberta' (duas farpas desiguais), 'gancho' (uma farpa) ou 'fechada' (triângulo).
export function pontaMao(pts, tipo = 'aberta', r = () => 0.5) {
  const [px, py] = pts.at(-1), [u, v] = pts.at(-Math.min(pts.length, 3)), L = Math.hypot(px - u, py - v) || 1, ux = (px - u) / L, uy = (py - v) / L;
  const farpa = (lado, ang, comp) => { const a = (ang * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a) * lado; return [px - comp * (ux * co - uy * si), py - comp * (uy * co + ux * si)]; };
  const a1 = 22 + 14 * r(), a2 = 22 + 14 * r(), c1 = 1.1 + 0.5 * r(), c2 = 1.1 + 0.5 * r();
  if (tipo === 'gancho') return [[[px, py], farpa(1, a1 + 6, c1 + 0.3)]];
  if (tipo === 'fechada') { const e = farpa(1, a1, c1), d = farpa(-1, a2, c1); return [[[px, py], e, d, [px, py]]]; }
  return [[[px, py], farpa(1, a1, c1)], [[px, py], farpa(-1, a2, c2)]];
}
const caixasSeg = (trs) => trs.flatMap((t) => t.slice(1).map((p, i) => caixaDe([[t[i], p]])));

// base = { pagina, tracos, grupos, ancoras (desta página), papel, coluna:{x,l}, faixa:{x,y,l,a}|null, calha:{x,l}|null, tamanho, ocupado? }
// ocupado = traços de outras camadas (paginação, borda, capitular) que as notas também não podem tocar.
// cfg = { tamanhoNotas, conector, espontaneo, seed, curva, irregular, ponta, inclinacao, girar }; ctx = { fontes, mao, maoNotas }. → { tracos, avisos, notas }
export function comporNotas(marcas, base, ctx, cfg = {}) {
  const { pagina, tracos, grupos, ancoras, papel, coluna, faixa, calha, tamanho, ocupado = [] } = base;
  const seed = cfg.seed ?? 1, tn = cfg.tamanhoNotas ?? 0.6 * tamanho, esp = cfg.espontaneo ?? 0;
  const { curva = PADRAO_MAO.curva, irregular: irr = PADRAO_MAO.irregular, ponta = PADRAO_MAO.ponta, inclinacao = PADRAO_MAO.inclinacao, girar = PADRAO_MAO.girar } = cfg;
  const maoN = ctx.maoNotas ?? ctx.mao;
  const rr = (chave) => rng(`${seed}|notas|${pagina}|${chave}`);
  const caixas = caixasPalavras(tracos, grupos);
  const palavras = ancoras.map((a, k) => ({ ...a, k, c: caixas[k] })).filter((p) => p.c);
  const saida = [], avisos = [], colocados = caixasSeg(ocupado), marcadas = new Set();
  const alvos = (m) => palavras.filter((p) => p.indice >= m.ini && p.indice <= m.fim);
  const livre = (trs, ks = []) => !sobrepoe(trs, [...caixas.filter((c, k) => c && !ks.includes(k)), ...colocados], VAO);
  const pôr = (trs, regs = [caixaDe(trs)]) => { saida.push(...trs); colocados.push(...regs); };
  const tentar = (trs, ks, desc, regs) => {
    const ok = livre(trs, ks);
    if (ok) pôr(trs, regs); else avisos.push(`${desc} descartado: tocaria outra palavra ou nota`);
    return ok;
  };
  // traço de mão: tremor fino (ondas de ~8 mm) + deriva lenta (~25 mm), as duas crescem com `irregular`; ponta firme, meio solto
  const fino = 0.12 * (0.5 + irr) + 0.3 * (maoN.tremor ?? 0), lento = 0.45 * irr, amp = fino + lento;
  const mao = (t, k) => tracoMao(t, fino, lento, `${seed}|notas|${pagina}|mao|${k}`);
  const linha = (p, d = 0) => { // palavras da linha vizinha (d = 0 própria, -1 anterior, 1 seguinte) na mesma coluna
    const alvoL = palavras.filter((q) => q.coluna === p.coluna && (d === 0 ? q.linha === p.linha : d < 0 ? q.linha < p.linha : q.linha > p.linha));
    if (!d || !alvoL.length) return alvoL;
    const ln = (d < 0 ? Math.max : Math.min)(...alvoL.map((q) => q.linha));
    return alvoL.filter((q) => q.linha === ln);
  };
  const sublinhado = (p, k) => {
    const c = p.c, seg = linha(p, 1), topoSeg = seg.length ? Math.min(...seg.map((q) => q.c.y)) : Infinity;
    const y = Math.max(Math.min(c.y + c.a + VAO, topoSeg - VAO - amp), p.y + 0.15 * tamanho);
    return mao([[c.x, y], [c.x + c.l, y]], k);
  };
  const fila = []; // notas marginais { p, texto }

  // 1. correções: risco na palavra errada + `certo` na entrelinha (ou nota marginal)
  for (const m of marcas.filter((x) => x.tipo === 'correcao')) {
    const ps = alvos(m);
    if (!ps.length) continue;
    for (const p of ps) {
      marcadas.add(p.k);
      const c = p.c, y = c.y + 0.55 * c.a, L = c.l + 0.6, n = Math.max(2, Math.ceil(L / 0.5));
      const t = Array.from({ length: n + 1 }, (_, i) => [c.x - 0.3 + (L * i) / n, y + 0.2 * ruido1d(`${seed}|risco|${pagina}|${p.k}`, i / 3)]);
      tentar([mao(t, `r${p.k}`)], [p.k], 'risco');
    }
    if (!m.texto) continue;
    const p0 = ps[0], da = ps.filter((q) => q.coluna === p0.coluna && q.linha === p0.linha);
    const U = { x: Math.min(...da.map((q) => q.c.x)), x1: Math.max(...da.map((q) => q.c.x + q.c.l)), y: Math.min(...da.map((q) => q.c.y)) };
    const ant = linha(p0, -1), f = U.y - (ant.length ? Math.max(...ant.map((q) => q.c.y + q.c.a)) : 3); // linha 1: sobe até 3 mm da borda do papel (a margem é livre)
    let escrito = false;
    {
      const lim = f - 2 * VAO - 0.2, gera = (tam) => { const tr = escreverEm(m.texto, { x: 0, y: 0, l: 0, a: 0 }, { alinhamento: 'centro', tamanho: tam }, ctx.fontes, maoN); return [tr, caixaDe(tr)]; };
      let [tr, b] = gera(tn);
      if (tr.length && b.a > lim) [tr, b] = lim >= 0.6 * b.a ? gera(tn * (lim / b.a)) : [[], b]; // piso: abaixo de 0,6 da altura natural vai para a margem
      if (tr.length && b.l <= coluna.l) {
        const dx = Math.min(Math.max((U.x + U.x1) / 2, coluna.x + b.l / 2), coluna.x + coluna.l - b.l / 2);
        const t2 = mover(tr, dx, U.y - VAO - 0.1 - (b.y + b.a));
        escrito = livre(t2);
        if (escrito) pôr(t2);
      }
    }
    if (!escrito) fila.push({ p: p0, texto: m.texto });
  }

  // 2. sublinhar, depois circular
  for (const m of marcas.filter((x) => x.tipo === 'sublinhar')) for (const p of alvos(m)) { marcadas.add(p.k); tentar([sublinhado(p, `s${p.k}`)], [p.k], 'sublinhado'); }
  for (const m of marcas.filter((x) => x.tipo === 'circular')) {
    for (const p of alvos(m)) {
      marcadas.add(p.k);
      const c = p.c, cx = c.x + c.l / 2, cy = c.y + c.a / 2;
      const viz = linha(p).filter((q) => q.k !== p.k), esq = viz.filter((q) => q.c.x < c.x), dr = viz.filter((q) => q.c.x > c.x);
      const ant = linha(p, -1), pos = linha(p, 1);
      // vão real até as vizinhas; o laço usa o que sobra depois de VAO e amp (mín. 0,1 mm: rente à palavra)
      const folga = (g, max) => Math.max(0.1, Math.min(g - VAO - amp, max));
      const a = c.l / 2 + folga(Math.min(esq.length ? c.x - Math.max(...esq.map((q) => q.c.x + q.c.l)) : Infinity, dr.length ? Math.min(...dr.map((q) => q.c.x)) - c.x - c.l : Infinity), VAO + 0.5);
      const b = c.a / 2 + folga(Math.min(ant.length ? c.y - Math.max(...ant.map((q) => q.c.y + q.c.a)) : Infinity, pos.length ? Math.min(...pos.map((q) => q.c.y)) - c.y - c.a : Infinity), VAO + 0.3);
      const th0 = rr(`laco|${p.k}`)() * TAU, n = Math.max(48, Math.ceil((TAU * 1.08 * Math.max(a, b)) / 0.5));
      const t = Array.from({ length: n + 1 }, (_, i) => { // superelipse |x/a|^4 + |y/b|^4 = 1, 1,08 volta, abrindo 0,2 mm
        const u = i / n, th = th0 + 1.08 * TAU * u, g = 0.2 * (u - 1), co = Math.cos(th), si = Math.sin(th);
        return [cx + (a + g) * Math.sign(co) * Math.sqrt(Math.abs(co)), cy + (b + g) * Math.sign(si) * Math.sqrt(Math.abs(si))];
      });
      tentar([mao(t, `l${p.k}`)], [p.k], 'laço');
    }
  }

  // 3. notas: na faixa de margem quando há e a nota não pede posição; senão no lugar livre mais perto, ligada por seta
  for (const m of marcas.filter((x) => x.tipo === 'nota')) {
    const p = palavras.find((q) => q.indice === m.ini);
    if (p) fila.push({ p, texto: m.texto, pos: m.pos, ordem: m.ordem });
  }
  fila.sort((a, b) => a.p.y - b.p.y);
  const notas = []; // { ordem, caixa } das notas soltas: a interface arrasta por aqui
  // ponto de q (inflada em f) mais perto de (cx, cy)
  const perto = (cx, cy, q, f) => [Math.min(Math.max(cx, q.x - f), q.x + q.l + f), Math.min(Math.max(cy, q.y - f), q.y + q.a + f)];
  const solta = ({ p, texto, pos, ordem }) => {
    const larg = Math.max(15, Math.min(45, 0.3 * papel.largura)), borda = 3, rn = rr(`nota|${p.k}|${ordem ?? texto}`);
    const r = compor(texto, ctx.fontes, maoN, { largura: larg, altura: papel.altura, margens: { topo: 0, dir: 0, base: 0, esq: 0 } }, { tamanho: tn, entrelinha: 1.3 });
    const tr0 = r.paginas[0];
    if (!tr0.length) return;
    // inclinação de mão: cada nota sorteia um ângulo pequeno; girar (até 90°) só quando o lugar perto pede
    const base = pos?.ang ?? (rn() * 2 - 1) * inclinacao;
    const angulos = pos?.ang != null || !girar ? [base] : [...new Set([base, base + 15, base - 15, base + 30, base - 30, 45, -45, 90, -90].map((a) => Math.round(a * 10) / 10))];
    const forma = (ang) => { const t = girarEm(tr0, ang), b = caixaDe(t); return { ang, t, b }; };
    const formas = angulos.map(forma);
    let alvo = null;
    if (pos?.x != null) alvo = { ...formas[0], x: pos.x, y: pos.y };
    else {
      const c = p.c, lw = linha(p), G = 2 * VAO + amp + 2.8, ocupa = [...caixas.filter(Boolean), ...colocados]; // folga: cabe uma seta visível
      // a seta precisa de caminho: reta do ponto da nota mais perto da palavra até a palavra, sem passar por outra palavra ou nota
      const outros = [...caixas.filter((q, k) => q && k !== p.k), ...colocados], f0 = VAO + amp;
      const caminhoLivre = (q) => {
        const fim = perto(q.x + q.l / 2, q.y + q.a / 2, c, f0 + 0.3), ini = perto(fim[0], fim[1], q, VAO), L = dist(ini, fim), n = Math.max(2, Math.ceil(L / 0.4));
        for (let i = 1; i < n; i++) {
          const x = ini[0] + ((fim[0] - ini[0]) * i) / n, y = ini[1] + ((fim[1] - ini[1]) * i) / n;
          if (outros.some((o) => x > o.x - f0 && x < o.x + o.l + f0 && y > o.y - f0 && y < o.y + o.a + f0)) return false;
        }
        return true;
      };
      const xe = Math.min(c.x, ...lw.map((q) => q.c.x)), xd = Math.max(c.x + c.l, ...lw.map((q) => q.c.x + q.c.l));
      const passos = (n, d) => Array.from({ length: 2 * n + 1 }, (_, i) => (i % 2 ? -1 : 1) * Math.ceil(i / 2) * d); // 0, d, -d, 2d…
      const lados = (b) => ({ // [x, y] de partida e para onde andar procurando espaço
        direita: (k, j) => [xd + G + 2 * j, c.y + c.a / 2 - b.a / 2 + k], esquerda: (k, j) => [xe - G - b.l - 2 * j, c.y + c.a / 2 - b.a / 2 + k],
        acima: (k, j) => [c.x + c.l / 2 - b.l / 2 + k, c.y - G - b.a - 2 * j], abaixo: (k, j) => [c.x + c.l / 2 - b.l / 2 + k, c.y + c.a + G + 2 * j],
      });
      const livreCaixa = (q) => q.x >= borda && q.y >= borda && q.x + q.l <= papel.largura - borda && q.y + q.a <= papel.altura - borda
        && !ocupa.some((o) => q.x < o.x + o.l + VAO && o.x < q.x + q.l + VAO && q.y < o.y + o.a + VAO && o.y < q.y + q.a + VAO);
      const buscar = (lista) => {
        let melhor = Infinity, achado = null;
        for (const f of formas) {
          const L = lados(f.b), custoGiro = 0.08 * Math.abs(f.ang - base); // mm por grau: só gira se ganhar espaço de verdade
          for (const lado of lista) {
            for (const j of [0, 1, 2, 4, 8]) for (const k of passos(15, 2)) {
              const [x, y] = L[lado](k, j);
              if (!livreCaixa({ x, y, l: f.b.l, a: f.b.a }) || !caminhoLivre({ x, y, l: f.b.l, a: f.b.a })) continue;
              const d = Math.hypot(x + f.b.l / 2 - (c.x + c.l / 2), y + f.b.a / 2 - (c.y + c.a / 2)) + custoGiro;
              if (d < melhor) { melhor = d; achado = { ...f, x, y }; }
              break; // o primeiro livre de cada desvio já é o mais perto nessa direção
            }
          }
        }
        return achado;
      };
      alvo = buscar(pos?.lado ? [pos.lado] : LADOS);
      if (!alvo && pos?.lado) { // lado pedido sem espaço: vai para o lugar livre mais perto, com aviso
        alvo = buscar(LADOS);
        if (alvo) avisos.push(`nota sem espaço ${pos.lado === 'acima' || pos.lado === 'abaixo' ? '' : 'à '}${pos.lado} da palavra; foi para o lugar livre mais perto: "${resumo(texto)}"`);
      }
    }
    if (!alvo) { avisos.push(`nota descartada: sem espaço livre perto da palavra: "${resumo(texto)}"`); return; }
    const tr = mover(alvo.t, alvo.x - alvo.b.x, alvo.y - alvo.b.y), b = { x: alvo.x, y: alvo.y, l: alvo.b.l, a: alvo.b.a };
    if (pos?.x == null && !livre(tr)) { avisos.push(`nota descartada: tocaria texto ou outra nota: "${resumo(texto)}"`); return; }
    pôr(tr, [b]);
    if (ordem != null) notas.push({ ordem, caixa: b, ang: alvo.ang });
    // seta da nota até a palavra: curva de mão (lado da barriga sorteado), depois a outra curva, reta e cotovelos
    const c = p.c;
    const fim = perto(b.x + b.l / 2, b.y + b.a / 2, c, VAO + amp + 0.3), ini = perto(fim[0], fim[1], b, VAO);
    const s = rn() < 0.5 ? 1 : -1;
    const caminhos = [curvaMao(ini, fim, s * curva), curvaMao(ini, fim, -s * curva), [ini, fim], [ini, [fim[0], ini[1]], fim], [ini, [ini[0], fim[1]], fim]];
    for (const pts of caminhos) {
      const cons = limpar([pts, ...pontaMao(pts, ponta, rn)]), jit = cons.map((t, i) => mao(t, `n${p.k}|${i}`));
      if (cons.length && livre(jit, [p.k])) { pôr(jit, caixasSeg(cons)); return; }
    }
    avisos.push(`conector descartado: cruzaria texto ou outra nota: "${resumo(texto)}"`);
  };
  let fimNota = -Infinity;
  for (const item of fila) {
    const { p, texto } = item;
    if (!faixa || item.pos) { solta(item); continue; }
    const y = Math.max(p.y - tamanho, faixa.y, fimNota + VAO + 0.5 * tn);
    const pf = { largura: papel.largura, altura: papel.altura, margens: { topo: faixa.y, dir: papel.largura - faixa.x - faixa.l, base: papel.altura - faixa.y - faixa.a, esq: faixa.x } };
    const r = compor(texto, ctx.fontes, maoN, pf, { tamanho: tn, entrelinha: 1.3, topo: y });
    const tr = r.paginas[0], b = caixaDe(tr);
    if (r.paginas.length > 1 || b.y + b.a > faixa.y + faixa.a + 1e-6) { avisos.push(`nota não coube na página ${pagina + 1}: "${resumo(texto)}"`); continue; }
    if (!tr.length) continue;
    if (!livre(tr)) { avisos.push(`nota descartada: tocaria texto ou outra nota: "${resumo(texto)}"`); continue; }
    pôr(tr, [b]);
    fimNota = b.y + b.a;
    if (!calha) continue;
    const dir = faixa.x > coluna.x, lw = linha(p);
    const g = { dir, xTexto: dir ? Math.max(...lw.map((q) => q.c.x + q.c.l)) : Math.min(...lw.map((q) => q.c.x)), base: p.y, tam: tamanho, calha, tn,
      xNota: dir ? b.x - VAO : b.x + b.l + VAO, yNota: y + 0.7 * tn };
    // nasce além do tremor da mão; tenta vias verticais/saídas diferentes até achar uma livre (duas notas na mesma calha não se sobrepõem)
    let ok = false;
    for (const ex of [0, 1.5]) for (const dy of [0, 0.9, -0.9]) for (const f of [0.5, 0.25, 0.75, 0.12, 0.88]) { // ex: recua a saída se a palavra tem laço em volta
      if (ok) break;
      const cons = conectar(cfg.conector ?? 'linha', { ...g, f, dy, nasce: VAO + amp + 0.1 + ex });
      const jit = cons.map((t, i) => mao(t, `c${p.k}|${i}`));
      if (ok = livre(jit)) pôr(jit, caixasSeg(cons));
    }
    if (!ok) avisos.push(`conector descartado: cruzaria texto ou outra nota: "${resumo(texto)}"`);
  }

  // 4. espontâneo (0 = nada). ponytail: 40 sorteios em grade de 2 mm por rabisco em vez de enumerar a grade toda.
  if (esp > 0) {
    const r = rr('esp'), n = Math.floor(esp * 6 + r());
    const fim = palavras.length ? Math.max(...palavras.map((p) => p.c.y + p.c.a)) : papel.margens.topo;
    const calhaR = calha && { ...calha, y: papel.margens.topo, a: papel.altura - papel.margens.topo - papel.margens.base };
    const abaixo = { x: coluna.x, y: fim, l: coluna.l, a: papel.altura - papel.margens.base - fim };
    // sem faixa de notas (livro, carta sem margem): as margens laterais do papel recebem os rabiscos
    const ytopo = papel.margens.topo, alt = papel.altura - papel.margens.topo - papel.margens.base, fd = coluna.x + coluna.l + 1;
    const laterais = faixa ? [] : [{ x: 3, y: ytopo, l: coluna.x - 4, a: alt }, { x: fd, y: ytopo, l: papel.largura - 3 - fd, a: alt }].filter((q) => q.l >= 4);
    let cm = 0; // contador de itens com mão
    const colocar = (item, regs) => {
      const b = caixaDe(item);
      for (let i = 0; i < 40; i++) {
        const reg = regs[Math.floor(r() * regs.length)];
        if (!reg || reg.l < b.l || reg.a < b.a) continue;
        const x = reg.x + 2 * Math.floor((r() * (reg.l - b.l)) / 2), y = reg.y + 2 * Math.floor((r() * (reg.a - b.a)) / 2);
        const t = mover(item, x - b.x, y - b.y).map((s, j) => mao(s, `m${cm}|${j}`));
        if (livre(t)) { cm++; pôr(t); return; }
      }
    };
    for (let i = 0; i < n; i++) {
      const u = r();
      if (u < 0.3) {
        const livres = palavras.filter((p) => !marcadas.has(p.k));
        const p = livres[Math.floor(r() * livres.length)];
        if (p) { const t = [sublinhado(p, `e${i}`)]; if (livre(t, [p.k])) pôr(t); }
      } else if (u < 0.5) {
        const reg = calha ?? faixa ?? laterais[0], p = palavras[Math.floor(r() * palavras.length)];
        if (reg && p) {
          const [cx, cy, a] = [reg.x + reg.l / 2, p.y - 0.3 * tamanho, 0.8];
          const t = [0, 1, 2].map((j) => { const th = (j * Math.PI) / 3 + Math.PI / 6; return mao([[cx - a * Math.cos(th), cy - a * Math.sin(th)], [cx + a * Math.cos(th), cy + a * Math.sin(th)]], `a${i}|${j}`); });
          if (livre(t)) pôr(t);
        }
      } else if (u < 0.65) colocar(escreverEm('?', { x: 0, y: 0, l: 0, a: 0 }, { tamanho: tn }, ctx.fontes, maoN), [calhaR, faixa, ...laterais].filter(Boolean));
      else {
        const lado = 5 + 3 * r(), tipo = ['espiral', 'estrela', 'caixa', 'flor'][Math.floor(r() * 4)];
        colocar(rabisco(tipo, { x: 0, y: 0, l: lado, a: lado }, `${seed}|${pagina}|${i}`), [faixa, abaixo, calhaR, ...laterais].filter(Boolean));
      }
    }
  }
  return { tracos: saida, avisos, notas };
}

// Prévias. ctx.escrever(mao, texto, opcoes) = traços de uma folha de amostra 60×40.
const RAB = ['espiral', 'estrela', 'caixa', 'flor'];
// Prévia de nota solta: palavra, nota acima à direita e a seta feita com a mão das notas (o foco muda conforme o controle).
const notaPrevia = (ctx, m = {}) => {
  const q = { ...PADRAO_MAO, ...m }, fino = 0.12 * (0.5 + q.irregular), lento = 0.45 * q.irregular;
  const texto = ctx.escrever(ctx.mao, 'palavra', { tamanho: 4 }), bt = caixaDe(texto);
  const nota = girarEm(mover(ctx.escrever(ctx.mao, 'nota', { tamanho: 3 }), bt.x + bt.l + 10, -9), q.inclinacao), bn = caixaDe(nota);
  const ini = [bn.x, bn.y + bn.a + 0.5], fim = [bt.x + bt.l + 0.6, bt.y - 0.6], curvo = curvaMao(ini, fim, q.curva);
  const seta = [curvo, ...pontaMao(curvo, q.ponta, rng('previa|ponta'))].map((t, i) => tracoMao(t, fino, lento, `previa|${i}`));
  return { texto, nota, seta };
};
export const PARAMS = [
  { chave: 'espontaneo', grupo: 'notas', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.05, padrao: 0, rotulo: 'rabiscos espontâneos',
    ajuda: 'Quantos sublinhados, asteriscos, interrogações e rabiscos aparecem sozinhos na margem e na calha. 0 = nenhum; 1 = a página bem rabiscada.',
    previa: (v, ctx) => ({ fundo: ctx.escrever(ctx.mao, 'nota', { tamanho: 6 }),
      foco: Array.from({ length: Math.round(v * 4) }, (_, i) => rabisco(RAB[i], { x: 22 + (i % 2) * 10, y: 2 + Math.floor(i / 2) * 10, l: 8, a: 8 }, 1)).flat() }) },
  { chave: 'conector', grupo: 'notas', nivel: 'basico', tipo: 'opcao', padrao: 'linha', rotulo: 'conector da nota',
    ajuda: 'Como a nota da margem se liga à linha do texto: uma linha reta com cotovelos, uma chave } ou uma seta.',
    opcoes: [{ valor: 'linha', rotulo: 'linha' }, { valor: 'chave', rotulo: 'chave' }, { valor: 'seta', rotulo: 'seta' }],
    previa: (v, ctx) => {
      const texto = ctx.escrever(ctx.mao, 'texto', { tamanho: 4 });
      const bt = caixaDe(texto), nota = mover(ctx.escrever(ctx.mao, 'nota', { tamanho: 2.5 }), 30, 0), bn = caixaDe(nota);
      const calha = { x: bt.x + bt.l, l: bn.x - bt.x - bt.l };
      return { fundo: [...texto, ...nota], foco: conectar(v, { dir: true, xTexto: bt.x + bt.l, base: 6, tam: 4, calha, xNota: bn.x - VAO, yNota: bn.y + bn.a / 2, tn: 2.5 }) };
    } },
  { chave: 'curva', grupo: 'notas', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.05, padrao: PADRAO_MAO.curva, rotulo: 'curva da seta',
    ajuda: 'Quanto a seta da nota solta faz barriga, como um gesto de mão. 0 = reta; 1 = bem arqueada. O lado da curva é sorteado por nota.',
    previa: (v, ctx) => { const n = notaPrevia(ctx, { curva: v }); return { fundo: [...n.texto, ...n.nota], foco: n.seta }; } },
  { chave: 'irregular', grupo: 'notas', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.05, padrao: PADRAO_MAO.irregular, rotulo: 'irregularidade do traço',
    ajuda: 'Tremor e desvio lento das setas, conectores, riscos, sublinhados e laços. 0 = traço de régua; 1 = mão bem solta. As pontas sempre acertam o alvo.',
    previa: (v, ctx) => { const n = notaPrevia(ctx, { irregular: v }); return { fundo: [...n.texto, ...n.nota], foco: n.seta }; } },
  { chave: 'ponta', grupo: 'notas', nivel: 'basico', tipo: 'opcao', padrao: PADRAO_MAO.ponta, rotulo: 'ponta da seta',
    ajuda: 'Como a seta termina: duas farpas desiguais (aberta), uma farpa só (gancho) ou um triângulo fechado.',
    opcoes: [{ valor: 'aberta', rotulo: 'aberta' }, { valor: 'gancho', rotulo: 'gancho' }, { valor: 'fechada', rotulo: 'fechada' }],
    previa: (v, ctx) => { const n = notaPrevia(ctx, { ponta: v }); return { fundo: [...n.texto, ...n.nota], foco: n.seta }; } },
  { chave: 'inclinacao', grupo: 'notas', nivel: 'basico', tipo: 'faixa', min: 0, max: 30, passo: 1, padrao: PADRAO_MAO.inclinacao, unidade: '°', rotulo: 'inclinação das notas',
    ajuda: 'Até quantos graus cada nota solta se inclina, para um lado ou para o outro (sorteado por nota). 0 = notas retas. Cada nota pode ter um ângulo fixo: {nota@direita/30: …}.',
    previa: (v, ctx) => { const n = notaPrevia(ctx, { inclinacao: v }); return { fundo: [...n.texto, ...n.seta], foco: n.nota }; } },
  { chave: 'girar', grupo: 'notas', nivel: 'avancado', tipo: 'marca', padrao: PADRAO_MAO.girar, rotulo: 'girar para caber',
    ajuda: 'Deixa a nota girar (diagonal, até de lado a 90°) quando assim ela cabe mais perto da palavra, como na margem estreita de um livro.',
    previa: (v, ctx) => {
      const texto = ctx.escrever(ctx.mao, 'linha de texto', { tamanho: 4 }), bt = caixaDe(texto), x = bt.x + bt.l + 2;
      const nota = ctx.escrever(ctx.mao, 'nota longa', { tamanho: 3 }), bn = caixaDe(nota);
      const posta = v ? mover(girarEm(nota, 90), x + bn.a / 2 - (bn.x + bn.l / 2) + 1, bt.y - (bn.y + bn.a / 2) + bn.l / 2 - 2) : mover(nota, x - bn.x, bt.y - 8 - bn.y);
      return { fundo: [...texto, [[x + 8, bt.y - 12], [x + 8, bt.y + 12]]], foco: posta };
    } },
];
