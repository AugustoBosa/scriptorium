// Folha-chave de um sistema de símbolos: grade de magias de amostra, cada uma com o sigilo e a legenda (nome · escola nível).
import { desenharSistema } from '../arcano/sistema.js';
import { ESCOLAS } from '../magia.js';
import { caixaDe, VAO } from '../geo.js';
import { escreverEm, CANETAS } from './documento.js';

const PADRAO = { colunas: 3, tamanhoLegenda: 2.5, caneta: 'vermelha', seed: 1 };

export const legenda = (m) => `${m.nome}\n${ESCOLAS[m.escola] ?? m.escola} ${m.nivel ? m.nivel + 'º' : 'truque'}`;

export function comporChave(magias, sistema, ctx, cfg) {
  const C = { ...PADRAO, ...cfg }, { papel, colunas, tamanhoLegenda: tl } = C;
  const m = papel.margens;
  const util = { x: m.esq, y: m.topo, l: papel.largura - m.esq - m.dir, a: papel.altura - m.topo - m.base };
  const leg = 2 * 2.2 * tl; // duas linhas de legenda
  const cw = Math.min((util.l - (colunas - 1) * 4) / colunas, util.a - leg);
  const ch = cw + leg;
  const porPagina = colunas * Math.max(1, Math.floor((util.a + 4) / (ch + 4)));
  const avisos = magias.length ? [] : ['Nenhuma magia de amostra'];
  const paginas = Array.from({ length: Math.max(1, Math.ceil(magias.length / porPagina)) }, () => ({ sigilos: [], legendas: [] }));
  magias.forEach((mg, k) => {
    const pag = paginas[Math.floor(k / porPagina)], slot = k % porPagina;
    const x = util.x + (slot % colunas) * (cw + 4), y = util.y + Math.floor(slot / colunas) * (ch + 4);
    const r = cw / 2 - VAO, cx = x + cw / 2, cy = y + cw / 2;
    pag.sigilos.push(...desenharSistema(sistema, mg, C.seed, ctx).map((t) => t.map(([px, py]) => [cx + px * r, cy + py * r])));
    const t = escreverEm(legenda(mg), { x, y: y + cw, l: cw, a: leg }, { alinhamento: 'centro', tamanho: tl }, ctx.fontes, ctx.mao);
    if (caixaDe(t).l > cw + 0.01) avisos.push(`legenda mais larga que a célula: ${mg.nome}`);
    pag.legendas.push(...t);
  });
  return {
    papel,
    canetas: Object.fromEntries([...new Set([C.caneta, 'preta'])].map((k) => [k, CANETAS[k]])),
    paginas: paginas.map((p) => ({ camadas: [
      { id: 'sigilo', caneta: C.caneta, personagem: null, ordem: 'otimizada', tracos: p.sigilos },
      { id: 'legendas', caneta: 'preta', personagem: null, ordem: 'otimizada', tracos: p.legendas },
    ] })),
    avisos,
  };
}

// Amostra variada: para cada escola, a magia de menor nível e a de maior nível (ordem estável por id).
export function amostraVariada(magias, n = 12) {
  const por = {};
  for (const m of [...magias].sort((a, b) => a.id.localeCompare(b.id))) (por[m.escola] ??= []).push(m);
  const out = [];
  for (const lista of Object.values(por)) {
    lista.sort((a, b) => a.nivel - b.nivel);
    out.push(lista[0], lista[lista.length - 1]);
  }
  return [...new Set(out)].slice(0, n);
}
