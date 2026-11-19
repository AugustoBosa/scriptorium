// Documento: papel, canetas, camadas e traços. Ponto de entrada único para o modelo de dados (M14).
import { ROTULOS, AJUDA } from '../ajuda.js';
import { papelMaximo } from '../maquina/perfis.js';
import { compor } from '../layout.js';
import { caixaDe, ret } from '../geo.js';
/** @typedef {[number, number][]} Traco  mm, origem no canto sup-esq do papel, y para baixo */
/** @typedef {{id:string, caneta:string, personagem:string|null, ordem:'escrita'|'otimizada', tracos:Traco[], grupos?:number[]}} Camada */
/** @typedef {{camadas:Camada[]}} Pagina */
/** @typedef {{largura:number, altura:number, margens:{topo:number,dir:number,base:number,esq:number}}} Papel */
/** @typedef {{nome:string, cor:string, espessura:number}} Caneta */
/** @typedef {{papel:Papel, canetas:Object<string,Caneta>, paginas:Pagina[], avisos:string[]}} Documento */

// [largura, altura, margem padrão] em mm, retrato.
export const PAPEIS = {
  A3: [297, 420, 25], A4: [210, 297, 20], A5: [148, 210, 12], A6: [105, 148, 9],
  A7: [74, 105, 6], A8: [52, 74, 4], carta: [215.9, 279.4, 20], oficio: [215.9, 355.6, 20],
};

const finito = (n) => Number.isFinite(n) && n > 0;

export function papel(nome, { paisagem = false, margem, largura, altura } = {}) {
  let l, a, m0;
  if (nome === 'personalizado') {
    if (!finito(largura) || !finito(altura)) throw new Error('papel personalizado exige largura e altura finitas > 0');
    [l, a] = [largura, altura];
    m0 = Math.round(Math.min(l, a) * 0.08);
  } else if (Object.hasOwn(PAPEIS, nome)) {
    [l, a, m0] = PAPEIS[nome];
  } else {
    throw new Error(`papel desconhecido: ${nome}`);
  }
  const m = margem ?? m0;
  return { largura: paisagem ? a : l, altura: paisagem ? l : a, margens: { topo: m, dir: m, base: m, esq: m } };
}

export const CANETAS = {
  preta: { nome: 'preta', cor: '#1a1a1a', espessura: 0.4 },
  vermelha: { nome: 'vermelha (rubrica)', cor: '#9b2d20', espessura: 0.4 },
  sepia: { nome: 'sépia', cor: '#704214', espessura: 0.4 },
  azul: { nome: 'azul', cor: '#1f3a6b', espessura: 0.4 },
};

// Escreve `texto` numa caixa {x,y,l,a}: 1ª linha de base em caixa.y + tamanho. Não encolhe; quem chama confere caixaDe.
export function escreverEm(texto, caixa, { alinhamento = 'esquerda', tamanho }, fontes, mao) {
  const p = { largura: 1e4, altura: 1e4, margens: { topo: 0, dir: 0, base: 0, esq: 0 } };
  const tr = compor(texto, fontes, mao, p, { tamanho, entrelinha: 1.3 }).paginas[0];
  const b = caixaDe(tr);
  const dx = alinhamento === 'centro' ? caixa.x + caixa.l / 2 - (b.x + b.l / 2)
    : alinhamento === 'direita' ? caixa.x + caixa.l - (b.x + b.l) : caixa.x - b.x;
  return tr.map((t) => t.map(([x, y]) => [x + dx, y + caixa.y]));
}

// Ponte até os materiais migrarem (M20): embrulha Traco[][] em uma camada por página.
export function deTracos(paginas, papelDoc, { avisos = [] } = {}) {
  return {
    papel: papelDoc,
    canetas: { preta: CANETAS.preta },
    paginas: paginas.map((tracos) => ({ camadas: [{ id: 'texto', caneta: 'preta', personagem: null, ordem: 'otimizada', tracos }] })),
    avisos,
  };
}

// Devolve os problemas do documento; lista vazia = válido.
export function validarDocumento(doc) {
  const erros = [];
  if (!finito(doc.papel?.largura) || !finito(doc.papel?.altura)) erros.push('papel sem dimensões finitas > 0');
  for (const [i, pag] of doc.paginas.entries()) {
    for (const c of pag.camadas) {
      const onde = `página ${i + 1}, camada ${c.id}`;
      if (!doc.canetas?.[c.caneta]) erros.push(`${onde}: caneta inexistente "${c.caneta}"`);
      if (c.ordem !== 'escrita' && c.ordem !== 'otimizada') erros.push(`${onde}: ordem inválida "${c.ordem}"`);
      if (c.grupos && !c.grupos.every((g, k) => Number.isInteger(g) && g >= 0 && g <= c.tracos.length && (k === 0 || g >= c.grupos[k - 1]))) erros.push(`${onde}: grupos fora de ordem ou do intervalo`);
      for (const [j, t] of c.tracos.entries()) {
        if (t.length < 2) erros.push(`${onde}: traço ${j + 1} com menos de 2 pontos`);
        if (!t.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))) erros.push(`${onde}: traço ${j + 1} com coordenada não finita`);
      }
    }
  }
  return erros;
}

// Parâmetros editáveis. Prévia: contorno do papel + janela útil da máquina, ou papel + área dentro das margens.
// fundo = o que fica igual; foco = o que o controle muda (pintado em destaque na prévia).
const comJanela = (l, a, ctx) => { const m = papelMaximo(ctx.perfil); return { fundo: [ret(0, 0, m.largura, m.altura)], foco: [ret(0, 0, l, a)] }; };
const comMargens = (l, a, { topo, dir, base, esq }) => ({ fundo: [ret(0, 0, l, a)], foco: [ret(esq, topo, l - dir, a - base)] });
const lado = (k) => (v, ctx) => comMargens(ctx.papel.largura, ctx.papel.altura, { ...ctx.papel.margens, [k]: v });
const marg = (chave, k, rot) => ({ chave, grupo: 'papel', nivel: 'avancado', tipo: 'faixa', min: 0, max: 60, passo: 1, padrao: 12, unidade: 'mm', rotulo: ROTULOS[rot], ajuda: AJUDA[rot], previa: lado(k) });
export const PARAMS = [
  { chave: 'papel', grupo: 'papel', nivel: 'basico', tipo: 'opcao', padrao: 'A5', rotulo: ROTULOS.pagina, ajuda: AJUDA.pagina,
    opcoes: [...Object.keys(PAPEIS), 'personalizado'].map((valor) => ({ valor, rotulo: valor })),
    previa: (v, ctx) => { const p = v === 'personalizado' ? ctx.papel : papel(v); return comJanela(p.largura, p.altura, ctx); } },
  { chave: 'paisagem', grupo: 'papel', nivel: 'basico', tipo: 'marca', padrao: false, rotulo: 'paisagem',
    ajuda: 'Deita o papel: a folha fica mais larga que alta. Desligado, a folha fica em pé (retrato).',
    previa: (v, ctx) => { const [a, b] = [Math.min(ctx.papel.largura, ctx.papel.altura), Math.max(ctx.papel.largura, ctx.papel.altura)]; return v ? comJanela(b, a, ctx) : comJanela(a, b, ctx); } },
  { chave: 'largura', grupo: 'papel', nivel: 'basico', tipo: 'faixa', min: 20, max: 420, passo: 1, padrao: 148, unidade: 'mm', rotulo: ROTULOS.larguraPagina, ajuda: AJUDA.larguraPagina, previa: (v, ctx) => comJanela(v, ctx.papel.altura, ctx) },
  { chave: 'altura', grupo: 'papel', nivel: 'basico', tipo: 'faixa', min: 20, max: 420, passo: 1, padrao: 210, unidade: 'mm', rotulo: ROTULOS.alturaPagina, ajuda: AJUDA.alturaPagina, previa: (v, ctx) => comJanela(ctx.papel.largura, v, ctx) },
  { chave: 'margem', grupo: 'papel', nivel: 'basico', tipo: 'faixa', min: 0, max: 30, passo: 0.5, padrao: 12, unidade: 'mm', rotulo: 'margem (mm)',
    ajuda: 'Espaço em branco, em mm, nas quatro bordas do papel. Para ajustar cada lado separadamente, use as margens individuais.',
    previa: (v, ctx) => comMargens(ctx.papel.largura, ctx.papel.altura, { topo: v, dir: v, base: v, esq: v }) },
  marg('margemTopo', 'topo', 'margemTopo'), marg('margemDir', 'dir', 'margemDir'), marg('margemBase', 'base', 'margemBase'), marg('margemEsq', 'esq', 'margemEsq'),
];
