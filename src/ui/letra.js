// Oficina Minha letra: a máquina plota as folhas de coleta; você escreve nelas à mão.
// Etapa 1 de 3 (próximas: ler a foto e gerar a fonte de traço único).
import { controle } from './controle.js';
import { comporColeta, guias, TIPOS, MAO_GUIA, TAM } from '../letra/folha.js';
import { escreverEm, CANETAS } from '../materiais/documento.js';
import ptBR from '../letra/linguas/pt-BR.json';

const LINGUAS = { 'pt-BR': ptBR }; // nova língua: gerar o JSON com scripts/gerar-texto-modelo.mjs e somar aqui
export const coleta0 = () => ({ tipo: 'N', x: 4, caneta: 'vermelha', lingua: 'pt-BR' });

export function comporDeColeta(estado) {
  const c = estado.col;
  return comporColeta(LINGUAS[c.lingua] ?? ptBR, { fontes: estado.fontes }, { papel: estado.pagina, papelNome: estado.paginaNome, tipo: c.tipo, x: c.x, caneta: c.caneta, canetas: CANETAS });
}

import { el } from './util.js';
const amostra = (ctx, texto, x) => ({ fundo: guias(0, 60, TAM + 2 + 2 * x, x), foco: escreverEm(texto, { x: 0, y: 0, l: 60, a: TAM }, { tamanho: TAM }, ctx.fontes, MAO_GUIA) });

const PARAMS = [
  { chave: 'folhaColeta', grupo: 'coleta', nivel: 'basico', tipo: 'opcao', rotulo: 'folhas',
    ajuda: 'Que folhas plotar. N, C e F trazem o mesmo texto modelo para você escrever de três jeitos; LC e LF trazem caixas para as letras soltas. Comece pelas N.',
    opcoes: TIPOS.map((t) => ({ valor: t.id, rotulo: `${t.id}: ${t.tipo === 'texto' ? 'texto' : 'letras soltas'} ${t.modo}` })),
    previa: (v, ctx) => amostra(ctx, v.startsWith('L') ? 'a  b  c  d' : 'Acerta sucessos mensagem', 4) },
  { chave: 'alturaX', grupo: 'coleta', nivel: 'basico', tipo: 'faixa', min: 2, max: 8, passo: 0.5, padrao: 4, unidade: 'mm', rotulo: 'altura do x',
    ajuda: 'Altura das letras baixas (a, o, x) na sua letra de sempre. Meça um "a" seu com a régua. As guias e o espaço de cada linha seguem este valor.',
    previa: (v, ctx) => amostra(ctx, 'casa de', v) },
  { chave: 'canetaGuia', grupo: 'coleta', nivel: 'basico', tipo: 'opcao', rotulo: 'caneta das guias',
    ajuda: 'Caneta que a máquina usa para guias, marcas e texto a copiar. Escreva com outra cor (preta ou azul): a leitura da foto separa as duas mais fácil.',
    opcoes: Object.entries(CANETAS).map(([k, c]) => ({ valor: k, rotulo: c.nome })),
    previa: (v, ctx) => amostra(ctx, 'guia', 4) },
];

const PASSOS = [
  'Plote uma folha de cada vez (Página ‹ ›). O código da folha (N1, C2, LF1…) já sai no cabeçalho e no código de traços embaixo.',
  'Escreva com caneta escura de outra cor que a das guias, na sua velocidade de sempre.',
  'Texto (N, C, F): copie cada linha pequena na faixa logo abaixo dela, com a base na linha cheia. O "x" vai até a tracejada.',
  'Letras soltas (LC, LF): uma letra por caixa, a que está no rótulo.',
  'Não escreva sobre as marcas de canto nem sobre o código de traços: a foto usa os dois.',
];

export function montarColeta(div, estado, aoMudar) {
  const c = estado.col, ctx = () => ({ fontes: estado.fontes });
  const [tipo, x, caneta] = PARAMS;
  const itens = [
    controle(tipo, { ler: () => c.tipo, gravar: (v) => { c.tipo = v; estado.paginaAtual = 0; }, ctx }, aoMudar),
    controle(x, { ler: () => c.x, gravar: (v) => { c.x = v; }, ctx }, aoMudar),
    controle(caneta, { ler: () => c.caneta, gravar: (v) => { c.caneta = v; }, ctx }, aoMudar),
  ];
  const como = el('p', 'ajuda-texto');
  const passos = el('ol');
  passos.append(...PASSOS.map((t) => el('li', null, t)));
  div.append(...itens.map((i) => i.el), como, passos);
  return () => {
    itens.forEach((i) => i.atualizar());
    const t = TIPOS.find((k) => k.id === c.tipo);
    como.textContent = t ? `Como escrever: ${t.como}.` : '';
  };
}
