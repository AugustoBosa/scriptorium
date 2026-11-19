// Carta, anotação e diário: o mesmo material com 3 presets. Texto numa camada, notas (marginália, risco, rabiscos) em outra.
import { compor } from '../layout.js';
import { ret } from '../geo.js';
import { parsearNotas, comporNotas } from './notas.js';
import { CANETAS } from './documento.js';

export const PRESETS = {
  carta: { marginalia: 'nenhuma', espontaneo: 0 },
  anotacao: { marginalia: 'direita', faixa: 0.3, espontaneo: 0.2 },
  diario: { marginalia: 'esquerda', faixa: 0.25, espontaneo: 0.35 },
};
const PADRAO = { tipo: 'carta', tamanho: 6, entrelinha: 1.6, alinhamento: 'esquerda', conector: 'linha', canetaTexto: 'preta', canetaNotas: 'vermelha', seed: 1 };

// Geometria da folha: área do texto, faixa e calha (null onde não há marginália).
function geometria(papel, tamanho, marginalia, frac) {
  const m = papel.margens, util = papel.largura - m.esq - m.dir, calhaL = Math.max(3, 0.5 * tamanho) + 0.3 * tamanho;
  if (marginalia !== 'direita' && marginalia !== 'esquerda') return { texto: papel, coluna: { x: m.esq, l: util }, faixa: null, calha: null };
  const fl = frac * util, dir = marginalia === 'direita', y = m.topo, a = papel.altura - m.topo - m.base;
  const texto = { ...papel, margens: { ...m, [dir ? 'dir' : 'esq']: m[dir ? 'dir' : 'esq'] + fl + calhaL } };
  const x = dir ? papel.largura - m.dir - fl : m.esq;
  return { texto, coluna: { x: m.esq + (dir ? 0 : fl + calhaL), l: util - fl - calhaL }, faixa: { x, y, l: fl, a }, calha: { x: dir ? x - calhaL : x + fl, l: calhaL } };
}

export function comporCarta(texto, ctx, cfg) {
  const def = Object.fromEntries(Object.entries(cfg).filter(([, v]) => v !== undefined));
  const c = { ...PADRAO, faixa: 0.3, ...PRESETS[def.tipo ?? 'carta'], ...def };
  const { papel } = c, { tamanho } = c;
  const { limpo, marcas, avisos: avisosMarca } = parsearNotas(texto);
  marcas.filter((m) => m.tipo === 'nota').forEach((m, k) => { m.ordem = k; }); // k-ésima {nota} do texto: a interface reescreve a posição dela
  const g = geometria(papel, tamanho, c.marginalia, c.faixa);
  const r = compor(limpo, ctx.fontes, ctx.mao, g.texto, { tamanho, entrelinha: c.entrelinha, alinhamento: c.alinhamento });
  const avisos = [...r.avisos.filter((a) => !a.startsWith('tolerancia')), ...avisosMarca];
  const pagDe = (ind) => r.ancoras.find((a) => a.indice === ind)?.pagina ?? 0;
  const paginas = r.paginas.map((tracos, i) => {
    const ancoras = r.ancoras.filter((a) => a.pagina === i);
    const daPagina = marcas.filter((m) => (m.tipo === 'nota' || m.tipo === 'correcao' ? pagDe(m.ini) === i : ancoras.some((a) => a.indice >= m.ini && a.indice <= m.fim)));
    const n = comporNotas(daPagina, { pagina: i, tracos, grupos: r.grupos[i], ancoras, papel, coluna: g.coluna, faixa: g.faixa, calha: g.calha, tamanho },
      ctx, { tamanhoNotas: c.tamanhoNotas, conector: c.conector, espontaneo: c.espontaneo, seed: c.seed, curva: c.curva, irregular: c.irregular, ponta: c.ponta, inclinacao: c.inclinacao, girar: c.girar });
    avisos.push(...n.avisos);
    return { camadas: [
      { id: 'texto', caneta: c.canetaTexto, personagem: ctx.personagens?.texto ?? null, ordem: 'escrita', grupos: r.grupos[i], tracos },
      { id: 'notas', caneta: c.canetaNotas, personagem: ctx.personagens?.notas ?? null, ordem: 'otimizada', tracos: n.tracos },
    ], notas: n.notas };
  });
  return { papel, canetas: { [c.canetaTexto]: CANETAS[c.canetaTexto], [c.canetaNotas]: CANETAS[c.canetaNotas] }, paginas, avisos };
}

// Prévia: papel + área do texto + faixa da marginália.
const previa = (marginalia, faixa) => (v, ctx) => {
  const p = ctx.papel, g = geometria(p, 6, marginalia(v), faixa(v)), m = p.margens;
  return { fundo: [ret(0, 0, p.largura, p.altura), ret(g.coluna.x, m.topo, g.coluna.x + g.coluna.l, p.altura - m.base)], foco: g.faixa ? [ret(g.faixa.x, g.faixa.y, g.faixa.x + g.faixa.l, g.faixa.y + g.faixa.a)] : [] };
};
export const PARAMS = [
  { chave: 'tipo', grupo: 'carta', nivel: 'basico', tipo: 'opcao', padrao: 'carta', rotulo: 'tipo de folha',
    ajuda: 'Carta: só o texto. Anotação: margem à direita com notas. Diário: margem à esquerda com mais rabiscos.',
    opcoes: [{ valor: 'carta', rotulo: 'carta' }, { valor: 'anotacao', rotulo: 'anotação' }, { valor: 'diario', rotulo: 'diário' }],
    previa: previa((v) => PRESETS[v].marginalia, (v) => PRESETS[v].faixa ?? 0.3) },
  { chave: 'marginalia', grupo: 'carta', nivel: 'basico', tipo: 'opcao', padrao: 'nenhuma', rotulo: 'margem de notas',
    ajuda: 'Lado da folha reservado para as notas escritas à margem. Sem margem, as notas marginais são descartadas com um aviso.',
    opcoes: [{ valor: 'nenhuma', rotulo: 'nenhuma' }, { valor: 'esquerda', rotulo: 'esquerda' }, { valor: 'direita', rotulo: 'direita' }],
    previa: previa((v) => v, () => 0.3) },
  { chave: 'faixa', grupo: 'carta', nivel: 'avancado', tipo: 'faixa', min: 0.15, max: 0.45, passo: 0.01, padrao: 0.3, rotulo: 'largura da margem de notas',
    ajuda: 'Fração da largura útil da folha reservada para as notas. Faixa larga dá mais espaço às notas e deixa o texto mais estreito.',
    previa: previa(() => 'direita', (v) => v) },
];
