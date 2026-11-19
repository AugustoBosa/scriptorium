// Folha de sigilos (M20): grade de células, um selo, sigilo ou círculo por frase, legenda centrada embaixo.
import { sigiloPalavra } from '../arcano/sigilo.js';
import { selo, circuloAleatorio, circulo } from '../arcano/circulo.js';
import { caixaDe, ret } from '../geo.js';
import { escreverEm, CANETAS } from './documento.js';

const VAO = 0.5; // mm: piso de qualquer vão (caneta 0,4 mm)
const PADRAO = { tipo: 'selo', metodo: 'kamea', colunas: 3, legendas: true, tamanhoLegenda: 3, complexidade: 0.5, caneta: 'preta', seed: 1 };

// Desenha o sigilo da frase dentro do quadrado `q`.
function desenhar(tipo, q, frase, seed, ctx, { metodo, complexidade }) {
  if (tipo === 'sigilo') return sigiloPalavra(q, { frase, metodo }, seed, ctx);
  if (tipo === 'selo') {
    const centro = { tipo: 'tracos', raio: 0.3, tracos: sigiloPalavra({ x: 0, y: 0, l: 10, a: 10 }, { frase, metodo }, seed, ctx) };
    return selo(q, { texto: frase, pontas: 5, centro }, seed, ctx);
  }
  if (tipo === 'circulo') return circulo(q, circuloAleatorio(seed, complexidade), seed, ctx);
  throw new Error(`tipo de sigilo desconhecido: ${tipo}`);
}

export function comporSigilos(frases, ctx, cfg) {
  const C = { ...PADRAO, ...cfg };
  const { papel, colunas, legendas, tamanhoLegenda: tl } = C;
  const lista = frases.split('\n').map((s) => s.trim()).filter(Boolean);
  const m = papel.margens;
  const util = { x: m.esq, y: m.topo, l: papel.largura - m.esq - m.dir, a: papel.altura - m.topo - m.base };
  const cw = (util.l - (colunas - 1) * 4) / colunas;
  const ch = cw + (legendas ? 2.2 * tl : 0);
  const porPagina = colunas * Math.max(1, Math.floor((util.a + 4) / (ch + 4)));
  const avisos = lista.length ? [] : ['Nenhuma frase'];
  const paginas = Array.from({ length: Math.max(1, Math.ceil(lista.length / porPagina)) }, () => ({ sigilos: [], legendas: [] }));
  lista.forEach((frase, k) => {
    const pag = paginas[Math.floor(k / porPagina)];
    const slot = k % porPagina;
    const x = util.x + (slot % colunas) * (cw + 4);
    const y = util.y + Math.floor(slot / colunas) * (ch + 4);
    pag.sigilos.push(...desenhar(C.tipo, { x: x + VAO, y: y + VAO, l: cw - 2 * VAO, a: cw - 2 * VAO }, frase, C.seed + k, ctx, C));
    if (legendas) {
      const t = escreverEm(frase, { x, y: y + cw, l: cw, a: 2.2 * tl }, { alinhamento: 'centro', tamanho: tl }, ctx.fontes, ctx.mao);
      if (caixaDe(t).l > cw) avisos.push(`legenda mais larga que a célula: "${frase}"`);
      pag.legendas.push(...t);
    }
  });
  return {
    papel,
    canetas: Object.fromEntries([...new Set([C.caneta, 'preta'])].map((k) => [k, CANETAS[k]])),
    paginas: paginas.map((p) => ({ camadas: [
      { id: 'sigilos', caneta: C.caneta, personagem: null, ordem: 'otimizada', tracos: p.sigilos },
      { id: 'legendas', caneta: 'preta', personagem: null, ordem: 'otimizada', tracos: p.legendas },
    ] })),
    avisos,
  };
}

// Parâmetros editáveis. Prévia: uma célula de 30 mm, grade de retângulos ou célula com legenda.
const CELULA = { x: 0, y: 0, l: 30, a: 30 };
const grade = (v) => {
  const cw = (120 - (v - 1) * 4) / v;
  return Array.from({ length: v * 2 }, (_, i) => { const x = (i % v) * (cw + 4), y = Math.floor(i / v) * (cw + 4); return ret(x, y, x + cw, y + cw); });
};
export const PARAMS = [
  { chave: 'tipoSigilo', grupo: 'sigilos', nivel: 'basico', tipo: 'opcao', padrao: 'selo', rotulo: 'tipo de sigilo',
    ajuda: 'Selo: anel com a frase e estrela de cinco pontas. Sigilo: só o caminho da frase numa kamea. Círculo: enfeite sorteado com anéis e nós.',
    opcoes: [{ valor: 'selo', rotulo: 'selo' }, { valor: 'sigilo', rotulo: 'sigilo' }, { valor: 'circulo', rotulo: 'círculo' }],
    previa: (v, ctx) => desenhar(v, CELULA, 'sigilo', 1, ctx, PADRAO) },
  { chave: 'colunasGrade', grupo: 'sigilos', nivel: 'basico', tipo: 'faixa', min: 1, max: 5, passo: 1, padrao: 3, rotulo: 'colunas da grade',
    ajuda: 'Quantas células por linha na folha. Cada frase ocupa uma célula; quando a folha enche, a frase passa para a página seguinte.',
    previa: (v) => grade(v) },
  { chave: 'legendas', grupo: 'sigilos', nivel: 'basico', tipo: 'marca', padrao: true, rotulo: 'legendas',
    ajuda: 'Escreve a frase centrada embaixo de cada sigilo, em letra de 3 mm. Desligado, a célula fica só com o desenho.',
    previa: (v, ctx) => { const t = desenhar('sigilo', CELULA, 'sigilo', 1, ctx, PADRAO); return { fundo: t, foco: v ? escreverEm('sigilo', { x: 0, y: 31, l: 30, a: 6.6 }, { alinhamento: 'centro', tamanho: 3 }, ctx.fontes, ctx.mao) : [] }; } },
];
