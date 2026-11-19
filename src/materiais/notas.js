// Notas: marcação no texto ({nota:…}, {~errado~>certo}, {_…_}, {o:…}), camada de notas (marginais, risco, sublinhado, laço, rabiscos).
// Regra de ouro: nenhum traço de nota toca palavra que não seja o alvo dele (checado por amostragem de pontos, sem booleanos de polígono).
import { caixaDe, reamostrar, dist, recortarCaixa, hachura, ret, limpar } from '../geo.js';
import { rng, ruido1d } from '../rng.js';
import { compor } from '../layout.js';
import { circulo } from '../arcano/circulo.js';
import { florao } from '../ornamento/filigrana.js';
import { escreverEm } from './documento.js';

export const VAO = 0.5; // mm (caneta 0,4)
const TAU = 2 * Math.PI;
const contar = (s) => s.split('\n').flatMap((l) => l.split(' ').filter(Boolean)).length;
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
    else if ((m = /^nota:([\s\S]*)$/.exec(c)) && m[1].trim()) {
      marcas.push({ tipo: 'nota', ini: Math.max(0, contar(limpo) - 1), fim: Math.max(0, contar(limpo) - 1), texto: m[1].trim() });
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
const caixasSeg = (trs) => trs.flatMap((t) => t.slice(1).map((p, i) => caixaDe([[t[i], p]])));

// base = { pagina, tracos, grupos, ancoras (desta página), papel, coluna:{x,l}, faixa:{x,y,l,a}|null, calha:{x,l}|null, tamanho }
// cfg = { tamanhoNotas, conector, espontaneo, seed }; ctx = { fontes, mao, maoNotas }. → { tracos, avisos }
export function comporNotas(marcas, base, ctx, cfg = {}) {
  const { pagina, tracos, grupos, ancoras, papel, coluna, faixa, calha, tamanho } = base;
  const seed = cfg.seed ?? 1, tn = cfg.tamanhoNotas ?? 0.6 * tamanho, esp = cfg.espontaneo ?? 0;
  const maoN = ctx.maoNotas ?? ctx.mao;
  const rr = (chave) => rng(`${seed}|notas|${pagina}|${chave}`);
  const caixas = caixasPalavras(tracos, grupos);
  const palavras = ancoras.map((a, k) => ({ ...a, k, c: caixas[k] })).filter((p) => p.c);
  const saida = [], avisos = [], colocados = [], marcadas = new Set();
  const alvos = (m) => palavras.filter((p) => p.indice >= m.ini && p.indice <= m.fim);
  const livre = (trs, ks = []) => !sobrepoe(trs, [...caixas.filter((c, k) => c && !ks.includes(k)), ...colocados], VAO);
  const pôr = (trs, regs = [caixaDe(trs)]) => { saida.push(...trs); colocados.push(...regs); };
  const tentar = (trs, ks, desc, regs) => {
    const ok = livre(trs, ks);
    if (ok) pôr(trs, regs); else avisos.push(`${desc} descartado: tocaria outra palavra ou nota`);
    return ok;
  };
  const amp = 0.12 + 0.3 * (maoN.tremor ?? 0);
  const mao = (t, k) => { // traço de mão: reamostra a 0,5 mm e desvia na normal
    const p = reamostrar(t, 0.5), sd = `${seed}|notas|${pagina}|mao|${k}`;
    let s = 0;
    return p.map((q, i) => {
      if (i) s += dist(p[i - 1], q);
      const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], L = dist(a, b) || 1, d = ruido1d(sd, s / 8) * amp;
      return [q[0] - ((b[1] - a[1]) / L) * d, q[1] + ((b[0] - a[0]) / L) * d];
    });
  };
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

  // 3. notas marginais por y da âncora
  for (const m of marcas.filter((x) => x.tipo === 'nota')) {
    const p = palavras.find((q) => q.indice === m.ini);
    if (p) fila.push({ p, texto: m.texto });
  }
  fila.sort((a, b) => a.p.y - b.p.y);
  let fimNota = -Infinity;
  for (const { p, texto } of fila) {
    if (!faixa) { avisos.push(`nota descartada (sem margem para notas): "${resumo(texto)}"`); continue; }
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
        const reg = calha ?? faixa, p = palavras[Math.floor(r() * palavras.length)];
        if (reg && p) {
          const [cx, cy, a] = [reg.x + reg.l / 2, p.y - 0.3 * tamanho, 0.8];
          const t = [0, 1, 2].map((j) => { const th = (j * Math.PI) / 3 + Math.PI / 6; return mao([[cx - a * Math.cos(th), cy - a * Math.sin(th)], [cx + a * Math.cos(th), cy + a * Math.sin(th)]], `a${i}|${j}`); });
          if (livre(t)) pôr(t);
        }
      } else if (u < 0.65) colocar(escreverEm('?', { x: 0, y: 0, l: 0, a: 0 }, { tamanho: tn }, ctx.fontes, maoN), [calhaR, faixa].filter(Boolean));
      else {
        const lado = 5 + 3 * r(), tipo = ['espiral', 'estrela', 'caixa', 'flor'][Math.floor(r() * 4)];
        colocar(rabisco(tipo, { x: 0, y: 0, l: lado, a: lado }, `${seed}|${pagina}|${i}`), [faixa, abaixo, calhaR].filter(Boolean));
      }
    }
  }
  return { tracos: saida, avisos };
}

// Prévias. ctx.escrever(mao, texto, opcoes) = traços de uma folha de amostra 60×40.
const RAB = ['espiral', 'estrela', 'caixa', 'flor'];
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
];
