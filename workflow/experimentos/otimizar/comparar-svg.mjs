import fs from 'node:fs';
const P = new URL('../../../', import.meta.url).href;
const { parseFonte } = await import(P + 'src/fonte.js');
const { compor, PAGINAS } = await import(P + 'src/layout.js');
const { NEUTRA } = await import(P + 'src/mao.js');
const { otimizar, viagem } = await import(P + 'src/exportar.js');
const { rng } = await import(P + 'src/rng.js');

const TEMPO_AG = Number(process.argv[2] ?? 15) * 1000;
const f = parseFonte(fs.readFileSync(new URL(P + 'fontes/EMSBird.svg'), 'utf8'), 'EMSBird');
const mao = { ...NEUTRA, base: [{ fonte: 'EMSBird', peso: 1 }] };
const txt = Array(400).fill('palavra exemplo grande').join(' ');
const { parsePath } = await import(P + 'src/svgpath.js');
const svgTxt = fs.readFileSync(process.env.SVG, 'utf8');
const cheia = [];
const num = (s) => s.trim().split(/[\s,]+/).map(Number);
for (const m of svgTxt.matchAll(/<line ([^>]*)\/>/g)) { const g = (k) => +m[1].match(new RegExp(k + '="([^"]+)"'))[1]; cheia.push([[g('x1'), g('y1')], [g('x2'), g('y2')]]); }
for (const m of svgTxt.matchAll(/<polygon points="([^"]+)"/g)) { const v = num(m[1]); const p = []; for (let i = 0; i < v.length; i += 2) p.push([v[i], v[i + 1]]); p.push(p[0]); cheia.push(p); }
for (const m of svgTxt.matchAll(/<polyline points="([^"]+)"/g)) { const v = num(m[1]); const p = []; for (let i = 0; i < v.length; i += 2) p.push([v[i], v[i + 1]]); if (p.length > 1) cheia.push(p); }
for (const m of svgTxt.matchAll(/<path d="([^"]+)"/g)) cheia.push(...parsePath(m[1]));
console.log('traços lidos', cheia.length);

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const ini = (t) => t[0], fim = (t) => t[t.length - 1];
const copia = (ts) => ts.map((t) => t.map((p) => [...p]));

// guloso puro (vizinho mais próximo)
function guloso(tracos) {
  const rest = copia(tracos), seq = [];
  let pos = [0, 0];
  while (rest.length) {
    let m = -1, inv = false, md = Infinity;
    rest.forEach((t, i) => {
      const a = dist(pos, ini(t)), b = dist(pos, fim(t));
      if (a < md) { md = a; m = i; inv = false; }
      if (b < md) { md = b; m = i; inv = true; }
    });
    const [t] = rest.splice(m, 1);
    if (inv) t.reverse();
    seq.push(t); pos = fim(t);
  }
  return seq;
}

// 2-opt com janela configurável (Infinity = completo)
function doisOpt(seqIn, janela, passadas = 5) {
  const seq = [...seqIn];
  for (let p = 0, melhorou = true; melhorou && p < passadas; p++) {
    melhorou = false;
    for (let i = 0; i < seq.length; i++) {
      const a = i ? fim(seq[i - 1]) : [0, 0];
      for (let j = i; j < Math.min(seq.length, i + janela); j++) {
        const antes = dist(a, ini(seq[i])) + (j + 1 < seq.length ? dist(fim(seq[j]), ini(seq[j + 1])) : 0);
        const depois = dist(a, fim(seq[j])) + (j + 1 < seq.length ? dist(ini(seq[i]), ini(seq[j + 1])) : 0);
        if (depois < antes - 1e-9) {
          const tr = seq.slice(i, j + 1).reverse();
          tr.forEach((t) => t.reverse());
          seq.splice(i, j - i + 1, ...tr);
          melhorou = true;
        }
      }
    }
  }
  return seq;
}

// Algoritmo genético básico. Indivíduo = {ord: ids, flip: 0/1 por id}.
function genetico(tracos, { semear, tempo, seed = 1 }) {
  const n = tracos.length, r = rng(seed);
  const S = tracos.map(ini), E = tracos.map(fim);
  const custo = ({ ord, flip }) => {
    let pos = [0, 0], c = 0;
    for (let k = 0; k < n; k++) {
      const id = ord[k], a = flip[id] ? E[id] : S[id], b = flip[id] ? S[id] : E[id];
      c += dist(pos, a); pos = b;
    }
    return c;
  };
  const aleatorio = () => {
    const ord = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    return { ord, flip: Array.from({ length: n }, () => (r() < 0.5 ? 1 : 0)) };
  };
  const TAM = 60;
  let pop = [];
  if (semear) {
    const g = guloso(tracos);
    const idx = new Map(tracos.map((t, i) => [t[0] === undefined ? -1 : i, i]));
    // mapeia o guloso de volta para ids/flip comparando pontas
    const porIni = new Map(), porFim = new Map();
    tracos.forEach((t, i) => { porIni.set(ini(t).join(), i); porFim.set(fim(t).join(), i); });
    const ord = [], flip = Array(n).fill(0);
    const usados = new Set();
    for (const t of g) {
      let id = porIni.get(ini(t).join()), fl = 0;
      if (id === undefined || usados.has(id) || dist(S[id], ini(t)) > 1e-9) { id = porFim.get(ini(t).join()); fl = 1; }
      if (id === undefined || usados.has(id)) { // desempate: busca linear
        id = tracos.findIndex((x, i) => !usados.has(i) && (dist(S[i], ini(t)) < 1e-9 || dist(E[i], ini(t)) < 1e-9));
        fl = dist(E[id], ini(t)) < 1e-9 && dist(S[id], ini(t)) >= 1e-9 ? 1 : 0;
      }
      usados.add(id); ord.push(id); flip[id] = fl;
    }
    const base = { ord, flip };
    pop.push(base);
    while (pop.length < TAM) pop.push(mutar(clone(base), 3));
  } else {
    while (pop.length < TAM) pop.push(aleatorio());
  }
  function clone(x) { return { ord: [...x.ord], flip: [...x.flip] }; }
  function mutar(x, vezes = 1) {
    for (let v = 0; v < vezes; v++) {
      const t = r();
      const i = Math.floor(r() * n), j = Math.floor(r() * n);
      if (t < 0.4) [x.ord[i], x.ord[j]] = [x.ord[j], x.ord[i]];              // troca
      else if (t < 0.8) {                                                      // inversão de trecho
        const [a, b] = i < j ? [i, j] : [j, i];
        const seg = x.ord.slice(a, b + 1).reverse();
        seg.forEach((id) => { x.flip[id] ^= 1; });
        x.ord.splice(a, b - a + 1, ...seg);
      } else x.flip[x.ord[i]] ^= 1;                                            // vira um traço
    }
    return x;
  }
  function cruzar(a, b) { // OX
    const i = Math.floor(r() * n), j = Math.floor(r() * n);
    const [s, e] = i < j ? [i, j] : [j, i];
    const filho = Array(n).fill(-1), flip = [...b.flip];
    const pego = new Set();
    for (let k = s; k <= e; k++) { filho[k] = a.ord[k]; pego.add(a.ord[k]); flip[a.ord[k]] = a.flip[a.ord[k]]; }
    let p = (e + 1) % n;
    for (let k = 0; k < n; k++) {
      const id = b.ord[(e + 1 + k) % n];
      if (!pego.has(id)) { filho[p] = id; p = (p + 1) % n; }
    }
    return { ord: filho, flip };
  }
  let cs = pop.map(custo), geracoes = 0;
  const t0 = performance.now();
  const torneio = () => { let b = Math.floor(r() * TAM); for (let k = 0; k < 2; k++) { const c = Math.floor(r() * TAM); if (cs[c] < cs[b]) b = c; } return b; };
  while (performance.now() - t0 < tempo) {
    const ordem = [...cs.keys()].sort((a, b) => cs[a] - cs[b]);
    const novo = [clone(pop[ordem[0]]), clone(pop[ordem[1]])];
    while (novo.length < TAM) {
      let filho = cruzar(pop[torneio()], pop[torneio()]);
      if (r() < 0.8) mutar(filho, 1 + Math.floor(r() * 3));
      novo.push(filho);
    }
    pop = novo; cs = pop.map(custo); geracoes++;
  }
  return { viagem: Math.min(...cs), geracoes };
}

const fmt = (v) => v.toFixed(0).padStart(6);
const seg = (mm) => (mm / 6000 * 60).toFixed(0); // viagem a F6000 mm/min
const linhas = [];
for (const pct of [0.25, 0.5, 0.75, 1]) {
  const tracos = copia(cheia.slice(0, Math.round(cheia.length * pct)));
  const n = tracos.length;
  const res = { n, pct };
  res.orig = viagem(tracos);
  let t = performance.now(); const g = guloso(tracos); res.guloso = viagem(g); res.tG = performance.now() - t;
  t = performance.now(); res.opt50 = viagem(doisOpt(g, 50)); res.t50 = performance.now() - t + res.tG;
  t = performance.now(); res.optFull = viagem(doisOpt(g, Infinity)); res.tFull = performance.now() - t + res.tG;
  t = performance.now(); res.atual = viagem(otimizar(tracos)); res.tAtual = performance.now() - t;
  const a1 = genetico(tracos, { semear: false, tempo: TEMPO_AG });
  const a2 = genetico(tracos, { semear: true, tempo: TEMPO_AG });
  res.agRand = a1.viagem; res.agRandG = a1.geracoes;
  res.agSem = a2.viagem; res.agSemG = a2.geracoes;
  linhas.push(res);
  console.log(JSON.stringify(res));
}
console.log('\n| volume | traços | original | guloso | guloso+2-opt(50) | guloso+2-opt completo | AG aleatório | AG semeado c/ guloso |');
for (const x of linhas) {
  console.log(`| ${x.pct * 100}% | ${x.n} | ${fmt(x.orig)} | ${fmt(x.guloso)} (${x.tG.toFixed(0)} ms) | ${fmt(x.opt50)} (${x.t50.toFixed(0)} ms) | ${fmt(x.optFull)} (${x.tFull.toFixed(0)} ms) | ${fmt(x.agRand)} (${x.agRandG} ger.) | ${fmt(x.agSem)} (${x.agSemG} ger.) |`);
}
