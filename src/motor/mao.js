import { rng, hash } from '../rng.js';
import { ROTULOS, AJUDA } from '../ajuda.js';
import { CURSIVAS } from '../fonte.js';

export const IDENTIDADE = ['base', 'seed', 'inclinacao', 'largura', 'altura', 'espacamento', 'espacoPalavra', 'idio', 'alternativas', 'contexto', 'arremate', 'ligadura', 'adiamento'];
export const EXECUCAO = ['pressa', 'capricho', 'tremor', 'queda', 'compressao', 'variacao', 'desleixo', 'ondulacao', 'deriva', 'ritmo', 'fadiga', 'fluidez', 'ultrapassagem', 'retoque'];
export const NEUTRA = { base: [], seed: 0, inclinacao: 0, largura: 1, altura: 1, espacamento: 0, espacoPalavra: 0, idio: 0, pressa: 0, capricho: 1, tremor: 0, queda: 0, compressao: 1, variacao: 0, desleixo: 0, alternativas: 1, contexto: 0, arremate: 0, ondulacao: 0, deriva: 0, ritmo: 80, fadiga: 0, ligadura: 0, adiamento: 0, fluidez: 0, ultrapassagem: 0, retoque: 0 };

const N = 32;

function dist([ax, ay], [bx, by]) {
  return Math.hypot(bx - ax, by - ay);
}

// Reamostra um traço em N pontos igualmente espaçados por comprimento de arco.
function reamostrar(pts) {
  if (pts.length === 0) return [];
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + dist(pts[i - 1], pts[i]));
  const L = d[d.length - 1];
  if (L === 0) return Array.from({ length: N }, () => [...pts[0]]);
  const out = [];
  let j = 0;
  for (let k = 0; k < N; k++) {
    const s = (L * k) / (N - 1);
    while (j < pts.length - 2 && d[j + 1] < s) j++;
    const seg = d[j + 1] - d[j];
    const u = seg > 0 ? Math.min(1, Math.max(0, (s - d[j]) / seg)) : 0;
    const [ax, ay] = pts[j], [bx, by] = pts[j + 1];
    out.push([ax + (bx - ax) * u, ay + (by - ay) * u]);
  }
  return out;
}

export function misturar(glifoA, glifoB, t) {
  if (glifoA.tracos.length !== glifoB.tracos.length) return null;
  if (t === 0) return structuredClone(glifoA);
  if (t === 1) return structuredClone(glifoB);
  const tracos = glifoA.tracos.map((ta, i) => {
    const pa = reamostrar(ta);
    const pb = reamostrar(glifoB.tracos[i]);
    return pa.map(([ax, ay], k) => [(1 - t) * ax + t * pb[k][0], (1 - t) * ay + t * pb[k][1]]);
  });
  return { adv: (1 - t) * glifoA.adv + t * glifoB.adv, tracos };
}

// Escolhe/mistura os candidatos (já em em) segundo os pesos.
function escolher(cands, ch, seed) {
  const total = cands.reduce((s, c) => s + c.peso, 0);
  if (cands.length === 1 || total === 0) return cands[0].g;
  let g = cands[0].g, acc = cands[0].peso, ok = true;
  for (let i = 1; i < cands.length && ok; i++) {
    const p = cands[i].peso;
    const m = misturar(g, cands[i].g, acc + p > 0 ? p / (acc + p) : 0);
    if (m === null) ok = false;
    else { g = m; acc += p; }
  }
  if (ok) return g;
  const u = (hash(ch + seed) % 10000) / 10000;
  let cum = 0;
  for (const c of cands) {
    cum += c.peso / total;
    if (cum > u) return c.g;
  }
  return cands[cands.length - 1].g;
}

export function glifo(fontes, mao, ch, ocorrencia) {
  const cands = [];
  for (const it of mao.base) {
    const f = fontes[it.fonte];
    const g = f?.glifos?.[ch];
    if (!g) continue;
    cands.push({
      peso: it.peso,
      g: { adv: g.adv / f.upm, tracos: g.tracos.map(t => t.map(([x, y]) => [x / f.upm, y / f.upm])) },
    });
  }
  if (cands.length === 0) {
    const f = mao.base.map(it => fontes[it.fonte]).find(Boolean);
    return { adv: f ? f.advPadrao / f.upm : 0.4, tracos: [] };
  }
  const g = escolher(cands, ch, mao.seed);

  // Identidade: fixa por caractere, não depende da ocorrência.
  const ri = rng(mao.seed + '|' + ch + '|idio');
  const sx = 1 + (ri() - 0.5) * mao.idio * 0.2;
  const sy = 1 + (ri() - 0.5) * mao.idio * 0.2;
  const dx = (ri() - 0.5) * mao.idio * 0.1;
  const dy = (ri() - 0.5) * mao.idio * 0.1;
  const tan = Math.tan(mao.inclinacao * Math.PI / 180);
  let adv = g.adv * sx * mao.largura;
  let tracos = g.tracos.map(t => t.map(([x, y]) => {
    const x1 = (x * sx + dx) * mao.largura;
    const y1 = (y * sy + dy) * mao.altura;
    return [x1 + y1 * tan, y1];
  }));

  // Execução: varia por ocorrência.
  const re = rng(mao.seed + '|' + ch + '|' + ocorrencia);
  const ex = 1 + (re() - 0.5) * mao.variacao * 0.2;
  const ey = 1 + (re() - 0.5) * mao.variacao * 0.2;
  const ox = (re() - 0.5) * mao.variacao * 0.08;
  const oy = (re() - 0.5) * mao.variacao * 0.08;
  const amp = mao.desleixo * 0.03 * (1 - mao.capricho);
  tracos = tracos.map(t => t.map(([x0, y0]) => {
    let x = x0 * ex + ox;
    let y = y0 * ey + oy;
    x += y * 0.3 * mao.pressa;
    x += (re() - 0.5) * 2 * amp;
    y += (re() - 0.5) * 2 * amp;
    return [x, y];
  }));
  adv = adv * ex * mao.compressao * (1 - 0.2 * mao.pressa) + mao.espacamento;
  adv = Math.max(0, adv);

  return { adv, tracos };
}

export function mutar(mao, seed, forca) {
  const m = structuredClone(mao);
  const r = rng(seed);
  const j = () => (r() - 0.5) * 2;
  m.seed = Math.floor(r() * 2147483647);
  m.inclinacao += j() * forca * 10;
  m.largura *= 1 + j() * forca * 0.2;
  m.altura *= 1 + j() * forca * 0.2;
  m.espacamento += j() * forca * 0.05;
  m.espacoPalavra += j() * forca * 0.05;
  m.idio = Math.min(1, Math.max(0, m.idio + j() * forca * 0.3));
  for (const item of m.base) {
    item.peso = Math.max(0.01, item.peso * (1 + j() * forca * 0.5));
  }
  return m;
}

// Parâmetros editáveis. previa: traços em mm via ctx.escrever.
const viaMao = (chave, texto = 'minimum', extra = () => ({})) => (v, ctx) => ctx.escrever({ ...ctx.mao, ...extra(ctx), [chave]: v }, texto);
const mutacao = (seed, forca, ctx) => ctx.escrever(mutar(ctx.mao, seed, forca), 'minimum');
// Prévias de ligadura/adiamento precisam de fonte cursiva: primeira da mão, senão a primeira cursiva disponível.
const curs = (ctx) => {
  const F = ctx.mao.base.map((it) => it.fonte).find((f) => CURSIVAS.includes(f)) ?? Object.keys(ctx.fontes).find((f) => CURSIVAS.includes(f));
  return F ? { base: [{ fonte: F, peso: 1 }] } : {};
};
const FRASE = 'a lua cheia sobe no mar e a noite fica calma';
export const PARAMS = [
  { chave: 'inclinacao', grupo: 'identidade', nivel: 'basico', tipo: 'faixa', min: -30, max: 30, passo: 0.5, padrao: NEUTRA.inclinacao, unidade: '°', rotulo: ROTULOS.inclinacao, ajuda: AJUDA.inclinacao, previa: viaMao('inclinacao') },
  { chave: 'largura', grupo: 'identidade', nivel: 'basico', tipo: 'faixa', min: 0.5, max: 1.5, passo: 0.01, padrao: NEUTRA.largura, rotulo: ROTULOS.largura, ajuda: AJUDA.largura, previa: viaMao('largura') },
  { chave: 'altura', grupo: 'identidade', nivel: 'basico', tipo: 'faixa', min: 0.5, max: 1.5, passo: 0.01, padrao: NEUTRA.altura, rotulo: ROTULOS.altura, ajuda: AJUDA.altura, previa: viaMao('altura') },
  { chave: 'espacamento', grupo: 'identidade', nivel: 'avancado', tipo: 'faixa', min: -0.2, max: 0.3, passo: 0.005, padrao: NEUTRA.espacamento, unidade: 'em', rotulo: ROTULOS.espacamento, ajuda: AJUDA.espacamento, previa: viaMao('espacamento') },
  { chave: 'espacoPalavra', grupo: 'identidade', nivel: 'avancado', tipo: 'faixa', min: 0, max: 0.6, passo: 0.01, padrao: NEUTRA.espacoPalavra, unidade: 'em', rotulo: ROTULOS.espacoPalavra, ajuda: AJUDA.espacoPalavra, previa: viaMao('espacoPalavra', 'a mão viu') },
  { chave: 'idio', grupo: 'identidade', nivel: 'avancado', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.idio, rotulo: ROTULOS.idio, ajuda: AJUDA.idio, previa: viaMao('idio') },
  { chave: 'alternativas', grupo: 'identidade', nivel: 'basico', tipo: 'faixa', min: 1, max: 5, passo: 1, padrao: NEUTRA.alternativas, rotulo: ROTULOS.alternativas, ajuda: AJUDA.alternativas, previa: viaMao('alternativas', 'minimum') },
  { chave: 'contexto', grupo: 'identidade', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.contexto, rotulo: ROTULOS.contexto, ajuda: AJUDA.contexto, previa: viaMao('contexto', 'Ave lua') },
  { chave: 'arremate', grupo: 'identidade', nivel: 'avancado', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.arremate, rotulo: ROTULOS.arremate, ajuda: AJUDA.arremate, previa: viaMao('arremate', 'a mão viu') },
  { chave: 'ligadura', grupo: 'identidade', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.ligadura, rotulo: ROTULOS.ligadura, ajuda: AJUDA.ligadura, previa: viaMao('ligadura', 'minimum', curs) },
  { chave: 'adiamento', grupo: 'identidade', nivel: 'avancado', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.adiamento, rotulo: ROTULOS.adiamento, ajuda: AJUDA.adiamento, previa: viaMao('adiamento', 'ti-ti-ti', (ctx) => ({ ...curs(ctx), ligadura: 1, capricho: 0, pressa: Math.max(ctx.mao.pressa, 0.6) })) },
  { chave: 'seed', grupo: 'identidade', nivel: 'avancado', tipo: 'numero', min: 0, max: 2147483647, passo: 1, padrao: NEUTRA.seed, rotulo: ROTULOS.seed, ajuda: AJUDA.seed, previa: viaMao('seed', 'minimum', (ctx) => ({ idio: Math.max(ctx.mao.idio, 0.5) })) },
  { chave: 'pressa', grupo: 'execucao', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.pressa, rotulo: ROTULOS.pressa, ajuda: AJUDA.pressa, previa: viaMao('pressa') },
  { chave: 'capricho', grupo: 'execucao', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.capricho, rotulo: ROTULOS.capricho, ajuda: AJUDA.capricho, previa: viaMao('capricho', 'minimum', () => ({ desleixo: 1 })) },
  { chave: 'tremor', grupo: 'execucao', nivel: 'basico', tipo: 'faixa', min: 0, max: 2, passo: 0.05, padrao: NEUTRA.tremor, unidade: 'mm', rotulo: ROTULOS.tremor, ajuda: AJUDA.tremor, previa: viaMao('tremor') },
  { chave: 'variacao', grupo: 'execucao', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.variacao, rotulo: ROTULOS.variacao, ajuda: AJUDA.variacao, previa: viaMao('variacao', 'mmmm') },
  { chave: 'queda', grupo: 'execucao', nivel: 'avancado', tipo: 'faixa', min: -2, max: 2, passo: 0.05, padrao: NEUTRA.queda, unidade: 'mm', rotulo: ROTULOS.queda, ajuda: AJUDA.queda, previa: viaMao('queda', 'um\ndois\ntrês') },
  { chave: 'compressao', grupo: 'execucao', nivel: 'avancado', tipo: 'faixa', min: 0.6, max: 1.4, passo: 0.01, padrao: NEUTRA.compressao, rotulo: ROTULOS.compressao, ajuda: AJUDA.compressao, previa: viaMao('compressao') },
  { chave: 'desleixo', grupo: 'execucao', nivel: 'avancado', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.desleixo, rotulo: ROTULOS.desleixo, ajuda: AJUDA.desleixo, previa: viaMao('desleixo', 'minimum', () => ({ capricho: 0 })) },
  { chave: 'ondulacao', grupo: 'execucao', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.ondulacao, rotulo: ROTULOS.ondulacao, ajuda: AJUDA.ondulacao, previa: viaMao('ondulacao', FRASE) },
  { chave: 'deriva', grupo: 'execucao', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.deriva, rotulo: ROTULOS.deriva, ajuda: AJUDA.deriva, previa: viaMao('deriva', FRASE) },
  { chave: 'ritmo', grupo: 'execucao', nivel: 'avancado', tipo: 'faixa', min: 20, max: 200, passo: 5, padrao: NEUTRA.ritmo, unidade: 'mm', rotulo: ROTULOS.ritmo, ajuda: AJUDA.ritmo, previa: viaMao('ritmo', FRASE, () => ({ ondulacao: 1, deriva: 1 })) },
  { chave: 'fadiga', grupo: 'execucao', nivel: 'avancado', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.fadiga, rotulo: ROTULOS.fadiga, ajuda: AJUDA.fadiga, previa: viaMao('fadiga', FRASE) },
  { chave: 'fluidez', grupo: 'execucao', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.fluidez, rotulo: ROTULOS.fluidez, ajuda: AJUDA.fluidez, previa: viaMao('fluidez') },
  { chave: 'ultrapassagem', grupo: 'execucao', nivel: 'avancado', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.ultrapassagem, rotulo: ROTULOS.ultrapassagem, ajuda: AJUDA.ultrapassagem, previa: viaMao('ultrapassagem', 'minimum', (ctx) => ({ fluidez: Math.max(ctx.mao.fluidez ?? 0, 0.5) })) },
  { chave: 'retoque', grupo: 'execucao', nivel: 'avancado', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: NEUTRA.retoque, rotulo: ROTULOS.retoque, ajuda: AJUDA.retoque, previa: viaMao('retoque', FRASE) },
  { chave: 'peso', grupo: 'fontes', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.05, padrao: 0.5, rotulo: ROTULOS.peso, ajuda: AJUDA.peso,
    previa: (v, ctx) => { const m = structuredClone(ctx.mao); m.base[ctx.indice ?? 0].peso = Math.max(0.01, v); return ctx.escrever(m, 'minimum'); } },
  { chave: 'mutarForca', grupo: 'fontes', nivel: 'avancado', tipo: 'faixa', min: 0, max: 1, passo: 0.05, padrao: 0.3, rotulo: ROTULOS.mutarForca, ajuda: AJUDA.mutarForca, previa: (v, ctx) => mutacao(1, v, ctx) },
  { chave: 'mutarSeed', grupo: 'fontes', nivel: 'avancado', tipo: 'numero', min: 0, max: 99999, passo: 1, padrao: 1, rotulo: ROTULOS.mutarSeed, ajuda: AJUDA.mutarSeed, previa: (v, ctx) => mutacao(v, 0.3, ctx) },
];
