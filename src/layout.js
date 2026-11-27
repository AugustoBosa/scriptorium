import { glifo, NEUTRA } from './motor/mao.js';
import { escreverPalavra } from './motor/escrita.js';
import { rng, ruido1d } from './rng.js';
import { ROTULOS, AJUDA } from './ajuda.js';
import { minimoTamanho } from './maquina/perfis.js';

export const PAGINAS = {
  A4: { largura: 210, altura: 297, margens: { topo: 20, dir: 20, base: 20, esq: 20 } },
  A5: { largura: 148, altura: 210, margens: { topo: 15, dir: 15, base: 15, esq: 15 } },
  mesa: { largura: 210, altura: 210, margens: { topo: 15, dir: 15, base: 15, esq: 15 } },
};

// Equilíbrio de 2 colunas: compõe uma vez; se a última página tem a 2ª coluna parcial, recompõe com as duas colunas do mesmo tamanho.
// ponytail: não equilibra a página com obstáculo (capitular); se a paginação mudar, fica com o 1º passe.
function equilibrada(texto, fontes, mao, pagina, opcoes) {
  const r1 = compor(texto, fontes, mao, pagina, { ...opcoes, equilibrar: false });
  const pag = r1.paginas.length - 1, a = r1.ancoras.filter((x) => x.pagina === pag);
  if (!a.some((x) => x.coluna === 1) || (opcoes.obstaculos ?? []).some((o) => (o.pagina ?? 0) === pag)) return r1;
  const linhas = (c) => Math.max(...a.filter((x) => x.coluna === c).map((x) => x.linha)) + 1;
  const metade = Math.ceil((linhas(0) + linhas(1)) / 2);
  const m = { ...NEUTRA, ...mao }, t = opcoes.tamanho ?? 6, k = metade - 1;
  const topo = pag === 0 ? opcoes.topo ?? pagina.margens.topo : pagina.margens.topo;
  const limite = topo + t + k * t * (opcoes.entrelinha ?? 1.6) + m.queda * k + 0.01;
  const r2 = compor(texto, fontes, mao, pagina, { ...opcoes, equilibrar: false, _eq: { pag, limite } });
  return r2.paginas.length === r1.paginas.length ? r2 : r1;
}

export function compor(texto, fontes, mao, pagina, opcoes = {}) {
  if (opcoes.equilibrar && opcoes.colunas === 2 && !opcoes._eq) return equilibrada(texto, fontes, mao, pagina, opcoes);
  mao = { ...NEUTRA, ...mao }; // personagem antigo pode não ter os campos novos
  const tamanho = opcoes.tamanho ?? 6;
  const entrelinha = opcoes.entrelinha ?? 1.6;
  const alinhamento = opcoes.alinhamento ?? 'esquerda';
  const { margens } = pagina;
  const W = pagina.largura - margens.esq - margens.dir;
  const limite = pagina.altura - margens.base;
  const eq = opcoes._eq; // 2º passe do equilíbrio: a última página fecha mais cedo
  const lim = () => (eq && cur.pag === eq.pag ? eq.limite : limite);
  const tol = tamanho * 0.3;
  const avisos = [`tolerancia de limites: ${tol} mm`];

  // Glifo ausente: troca tipografica por ASCII se a fonte nao tem; se ainda faltar, avisa.
  const tem = (ch) => mao.base.some((it) => fontes[it.fonte]?.glifos?.[ch]);
  const ASCII = { '“': '"', '”': '"', '‘': "'", '’': "'", '…': '...', '—': '-', '–': '-' };
  texto = texto.replace(/[“”‘’…—–]/g, (c) => (tem(c) ? c : ASCII[c]));
  const faltam = new Set([...texto].filter((c) => c.trim() && !tem(c)));
  for (const c of faltam) avisos.push(`glifo ausente: ${c}`);

  // Palavra como unidade: glifos medidos com as ocorrencias que o desenho usara (variacao/pressa mudam a largura).
  const cont = new Map();
  const N = Math.max(1, texto.split(/[ \n]/).filter(Boolean).length);
  const ctxE = { fontes, mao, tamanho, cont, indice: 0, t: 0, F: 0 };
  let percorrido = 0, cans = 0; // mm escritos (ondulação/deriva) e cansaço acumulado em [0,1]
  const escrever = (p) => {
    ctxE.indice = indice; ctxE.t = percorrido / mao.ritmo; ctxE.F = mao.fadiga * cans;
    return escreverPalavra(p, ctxE);
  };
  const gastar = (s) => { for (const ch of s) cont.set(ch, (cont.get(ch) ?? 0) + 1); };
  const espaco = (glifo(fontes, mao, ' ', 0).adv + mao.espacoPalavra) * tamanho;
  const aceitar = (w) => { percorrido += w.largura + espaco; cans = Math.min(1, cans + 1 / N); };

  const n = opcoes.colunas ?? 1;
  const vao = opcoes.vaoColunas ?? 2 * tamanho;
  const cols = n === 1 ? [{ x: margens.esq, l: W }]
    : Array.from({ length: n }, (_, i) => { const l = (W - (n - 1) * vao) / n; return { x: margens.esq + i * (l + vao), l }; });
  const obstaculos = (opcoes.obstaculos ?? []).map((o) => ({ pagina: 0, ...o }));

  const r = rng(mao.seed + '|tremor');
  const paginas = [[]];
  const grupos = [[]]; // por página: índice do 1º traço de cada palavra (mesma ordem das âncoras)
  const ancoras = [];
  // opcoes.topo: onde a primeira página começa (blocos empilhados); as seguintes voltam à margem.
  const cur = { pag: 0, col: 0, k: 0, topo: opcoes.topo ?? margens.topo };
  const base = (k) => cur.topo + tamanho + k * tamanho * entrelinha + mao.queda * k;
  let fimPag = -Infinity; // maior base de colunas já fechadas na página atual

  const avancar = () => {
    // bloco empilhado (topo abaixo da margem) pode transbordar já na 1ª linha
    if (!(base(cur.k) > lim() && (cur.k > 0 || cur.topo > margens.topo))) return false;
    if (cur.k > 0) fimPag = Math.max(fimPag, base(cur.k - 1));
    cur.k = 0;
    if (++cur.col === cols.length) {
      cur.col = 0; cur.pag++; cans *= 0.5; cur.topo = margens.topo; fimPag = -Infinity;
      paginas.push([]); grupos.push([]);
    }
    return true;
  };
  // Margem que anda: recuo só para a direita, então nunca invade margem nem obstáculo.
  const recuo = ({ pag, col, k }) => mao.deriva > 0 && alinhamento !== 'centro'
    ? mao.deriva * tamanho * (0.45 * (ruido1d(mao.seed + '|margem|' + pag + '|' + col, k / 5) + 1) / 2
      + 0.15 * rng(mao.seed + '|recuo|' + pag + '|' + col + '|' + k)())
    : 0;
  // próxima linha com espaço: { x0, W, y, pag, col, k }
  const vaga = () => {
    for (;;) {
      avancar();
      const y = base(cur.k), c = cols[cur.col];
      const pos = { y, pag: cur.pag, col: cur.col, k: cur.k };
      const obs = obstaculos.filter((o) => o.pagina === cur.pag && o.y < y + 0.3 * tamanho && o.y + o.a > y - tamanho);
      const d = recuo(pos);
      if (!obs.length) return { x0: c.x + d, W: c.l - d, d, ...pos };
      // ponytail: usa só o maior trecho livre; texto não corre dos dois lados de um obstáculo central.
      let s = { x: c.x, l: 0 }, ini = c.x;
      const fim = c.x + c.l;
      for (const o of [...obs.map((o) => [o.x, o.x + o.l]), [fim, fim]].sort((a, b) => a[0] - b[0])) {
        if (Math.min(o[0], fim) - ini > s.l) s = { x: ini, l: Math.min(o[0], fim) - ini };
        ini = Math.max(ini, o[1]);
      }
      if (s.l >= 2 * tamanho) return { x0: s.x + d, W: s.l - d, d, ...pos };
      cur.k++;
    }
  };

  const fecha = (L, just) => {
    const { v } = L;
    const pag = paginas[v.pag];
    const np = L.pals.length;
    const extra = alinhamento === 'justificado' && just && np > 1 ? (v.W - L.w) / (np - 1) : 0;
    let x = v.x0;
    if (alinhamento === 'centro') x += (v.W - L.w) / 2;
    L.pals.forEach((w, i) => {
      if (i > 0) x += espaco + extra;
      grupos[v.pag].push(pag.length);
      ancoras.push({ pagina: v.pag, coluna: v.col, linha: v.k, indice: w.indice, texto: w.texto, x, y: v.y, l: w.largura });
      const dyW = w.dy + w.F * 0.25 * tamanho * (x - v.x0) / v.W; // base ondulante; fadiga faz a linha cair
      const ponto = ([px, py]) => {
        const tx = (r() - 0.5) * 2 * w.tremor;
        const ty = (r() - 0.5) * 2 * w.tremor;
        return [x + px * w.s + tx + py * w.s * w.tan, v.y - py * w.s + ty + dyW];
      };
      if (w.tracos) {
        for (const t of w.tracos) if (t.length > 0) pag.push(t.map(ponto));
        x += w.largura;
      } else {
        for (const g of w.glifos) {
          for (const t of g.tracos) {
            if (t.length === 0) continue;
            pag.push(t.map(ponto));
          }
          x += g.adv * w.s;
        }
      }
    });
    cur.k++;
  };

  let indice = 0;
  for (const entrada of texto.split('\n')) {
    if (entrada.trim() === '') {
      if (cur.k > 0 && !avancar()) cur.k++;
      continue;
    }
    if (indice > 0) cans *= 0.7; // parágrafo: a mão descansa um pouco
    let atual = null;
    for (const p of entrada.split(' ').filter(Boolean)) {
      const w = escrever(p);
      w.indice = indice++;
      if (atual && atual.w + espaco + w.largura <= atual.v.W) {
        atual.pals.push(w);
        atual.w += espaco + w.largura;
        gastar(p); aceitar(w);
        continue;
      }
      if (atual) { fecha(atual, true); atual = null; }
      let v = vaga();
      const abrir = () => { if (w.largura > v.W && w.largura <= v.W + v.d) { v.x0 -= v.d; v.W += v.d; } }; // a linha abre mão do recuo
      abrir();
      while (w.largura > v.W && w.largura <= cols[cur.col].l) { cur.k++; v = vaga(); abrir(); }
      if (w.largura <= v.W) {
        atual = { pals: [w], w: w.largura, v };
        gastar(p); aceitar(w);
        continue;
      }
      // palavra maior que a linha: quebra por letra, reaproveitando os glifos já escritos
      avisos.push(`palavra longa quebrada: ${p}`);
      [...p].forEach((ch, i) => {
        const a = { largura: w.glifos[i].adv * w.s, glifos: [w.glifos[i]] };
        if (atual && atual.w + a.largura > atual.v.W) { fecha(atual, false); atual = null; }
        if (!atual) atual = { pals: [{ ...w, tracos: undefined, texto: '', largura: 0, glifos: [] }], w: 0, v: vaga() };
        const q = atual.pals[0];
        q.texto += ch; q.largura += a.largura; q.glifos.push(...a.glifos);
        atual.w += a.largura;
        gastar(ch);
      });
      aceitar(w);
    }
    if (atual) fecha(atual, false);
  }

  // fim: linha de base da última linha escrita (a maior entre as colunas da última página).
  const fim = cur.k > 0 ? Math.max(fimPag, base(cur.k - 1)) : (fimPag > -Infinity ? fimPag : cur.topo);
  return { paginas, avisos, fim, ancoras, grupos };
}

const FOLHA_AMOSTRA = { largura: 60, altura: 40, margens: { topo: 2, dir: 2, base: 2, esq: 2 } };
// Traços (mm) da 1ª página de um texto curto numa folha pequena: prévia dos parâmetros.
export function amostra(fontes, mao, texto, opcoes = {}) {
  return compor(texto, fontes, mao, opcoes.pagina ?? FOLHA_AMOSTRA, { tamanho: 6, ...opcoes }).paginas[0];
}

// Mínimo do slider de tamanho com o porta-caneta (folga da ponta): { valor, texto } ou null.
export function minimoFolga(ctx) {
  const m = minimoTamanho(ctx?.perfil, ctx?.mao);
  if (!m) return null;
  return { valor: m.valor, texto: m.sem.length ? `${m.sem.join(', ')} não fica legível com a folga do porta-caneta, nem em 15 mm.` : `mín. ${String(m.valor).replace('.', ',')} mm pela folga do porta-caneta` };
}

const PARAGRAFO = 'a lua cheia sobe no mar e a noite fica calma';
export const PARAMS = [
  { chave: 'tamanho', grupo: 'aparencia', nivel: 'basico', tipo: 'faixa', min: 3, max: 15, passo: 0.5, padrao: 6, unidade: 'mm', rotulo: ROTULOS.tamanho, ajuda: AJUDA.tamanho,
    minimo: (ctx) => minimoFolga(ctx),
    previa: (v, ctx) => amostra(ctx.fontes, ctx.mao, 'mão', { tamanho: v }) },
  { chave: 'entrelinha', grupo: 'aparencia', nivel: 'basico', tipo: 'faixa', min: 1, max: 3, passo: 0.01, padrao: 1.6, rotulo: ROTULOS.entrelinha, ajuda: AJUDA.entrelinha,
    previa: (v, ctx) => amostra(ctx.fontes, ctx.mao, 'uma\nduas', { entrelinha: v }) },
  { chave: 'escala', grupo: 'aparencia', nivel: 'basico', tipo: 'faixa', min: 0.5, max: 1.6, passo: 0.05, padrao: 1, rotulo: 'escala da letra', ajuda: 'Aumenta ou diminui a letra do personagem só neste material. 1 = o tamanho do perfil; o tamanho de verdade fica no personagem.',
    previa: (v, ctx) => amostra(ctx.fontes, ctx.mao, 'mão', { tamanho: (ctx.mao.tamanho ?? 6) * v }) },
  { chave: 'alinhamento', grupo: 'aparencia', nivel: 'basico', tipo: 'opcao', padrao: 'esquerda', rotulo: ROTULOS.alinhamento, ajuda: AJUDA.alinhamento,
    opcoes: [{ valor: 'esquerda', rotulo: 'esquerda' }, { valor: 'centro', rotulo: 'centro' }, { valor: 'justificado', rotulo: 'justificado' }],
    previa: (v, ctx) => amostra(ctx.fontes, ctx.mao, PARAGRAFO, { tamanho: 3, alinhamento: v }) },
  { chave: 'colunas', grupo: 'aparencia', nivel: 'basico', tipo: 'faixa', min: 1, max: 2, passo: 1, padrao: 1, rotulo: 'colunas',
    ajuda: 'Divide o texto em colunas lado a lado, como num jornal. Com 2 colunas cada linha fica mais curta e o texto desce em duas faixas.',
    previa: (v, ctx) => amostra(ctx.fontes, ctx.mao, PARAGRAFO, { tamanho: 3, colunas: v }) },
];
