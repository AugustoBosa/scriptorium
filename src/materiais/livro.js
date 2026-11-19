// Livro: texto em 1 ou 2 colunas com capitular, borda, cabeçalho corrente, nº de página e reclamo (M20).
import { compor } from '../layout.js';
import { caixaDe } from '../geo.js';
import { capitular, caixaCapitular, PARAMS as PARAMS_CAP } from '../ornamento/capitular.js';
import { borda, miolo, PARAMS as PARAMS_BORDA } from '../ornamento/borda.js';
import { escreverEm, CANETAS } from './documento.js';
import { parsearNotas, comporNotas } from './notas.js';

const D = {
  tamanho: 5, entrelinha: 1.5, alinhamento: 'justificado', colunas: 1, titulo: '', inicio: 1, numeracao: true, reclamo: true,
  cabecalhoNaPrimeira: false, capitular: null, borda: null, rubrica: true, seed: 1,
  conector: 'seta', espontaneo: 0, canetaNotas: 'vermelha',
};

// Plano de texto de cada página (puro): número, cabeçalho corrente e reclamo (1ª palavra da página seguinte).
export function paginacao(r, cfg) {
  const { inicio = D.inicio, numeracao = D.numeracao, titulo = D.titulo, cabecalhoNaPrimeira = D.cabecalhoNaPrimeira, reclamo = D.reclamo } = cfg;
  return r.paginas.map((_, i) => ({
    numero: numeracao ? String(inicio + i) : null,
    cabecalho: titulo && (i > 0 || cabecalhoNaPrimeira) ? titulo : null,
    reclamo: reclamo ? r.ancoras.find((a) => a.pagina === i + 1)?.texto ?? null : null,
  }));
}

// Faixas da página: área (miolo da borda), cabeçalho no topo, rodapé no pé e texto entre as duas.
export function geometria(papel, cfg) {
  const m = papel.margens;
  const util = { x: m.esq, y: m.topo, l: papel.largura - m.esq - m.dir, a: papel.altura - m.topo - m.base };
  const mi = cfg.borda ? miolo(util, cfg.borda) : util, v = cfg.borda ? Math.max(0.5, 0.4 * cfg.tamanho) : 0; // vão texto↔borda
  const area = { x: mi.x + v, y: mi.y, l: mi.l - 2 * v, a: mi.a };
  const tc = Math.max(2.5, 0.6 * cfg.tamanho);
  const topo = { x: area.x, y: area.y, l: area.l, a: 2 * tc };
  const pe = { x: area.x, y: area.y + area.a - 2 * tc, l: area.l, a: 2 * tc };
  const texto = { x: area.x, y: topo.y + topo.a + 0.5 * tc, l: area.l, a: pe.y - 0.5 * tc - (topo.y + topo.a + 0.5 * tc) };
  return { util, area, tc, topo, pe, texto };
}

const dentro = (c, f) => c.x >= f.x - 0.5 && c.x + c.l <= f.x + f.l + 0.5 && c.y >= f.y && c.y + c.a <= f.y + f.a;
const choca = (a, b, g) => a.x < b.x + b.l + g && b.x < a.x + a.l + g && a.y < b.y + b.a && b.y < a.y + a.a;

// Desenha número, reclamo (camada paginacao) e cabeçalho (camada rubrica) de uma página.
function desenhar(p, G, ctx, avisos, i) {
  const { tc, topo, pe, area } = G, esc = (t, f, alinhamento) => escreverEm(t, { ...f, y: f.y + 0.25 * tc }, { alinhamento, tamanho: tc }, ctx.fontes, ctx.mao);
  const out = { paginacao: [], cabecalho: [] };
  if (p.cabecalho) out.cabecalho = esc(p.cabecalho, topo, 'centro');
  const num = p.numero ? esc(p.numero, pe, 'centro') : [];
  let rec = p.reclamo ? esc(p.reclamo, pe, 'direita') : [];
  if (num.length && rec.length && choca(caixaDe(num), caixaDe(rec), 0.5 * tc)) {
    rec = rec.map((t) => t.map(([x, y]) => [x, y + 0.5 * tc]));
    if (choca(caixaDe(num), caixaDe(rec), 0.5 * tc) || !dentro(caixaDe(rec), pe)) avisos.push(`página ${i + 1}: número e reclamo muito juntos`);
  }
  if (rec.length && caixaDe(rec).x < area.x) avisos.push(`página ${i + 1}: reclamo mais largo que o rodapé`);
  out.paginacao = [...num, ...rec];
  return out;
}

// texto aceita a marcação das notas ({nota…}, {~…~>…}, {_…_}, {o:…}): as notas saem soltas, perto da palavra, ligadas por seta.
export function comporLivro(bruto, ctx, cfg) {
  const c = { ...D, ...cfg };
  const { limpo: texto, marcas, avisos: avisosMarca } = parsearNotas(bruto);
  marcas.filter((m) => m.tipo === 'nota').forEach((m, k) => { m.ordem = k; });
  if (c.colunas !== 1 && c.colunas !== 2) throw new Error('livro: 1 ou 2 colunas');
  const { papel, tamanho, entrelinha, seed } = c, G = geometria(papel, c), avisos = [];
  const caneta = c.rubrica ? 'vermelha' : 'preta';
  const personagem = ctx.personagens?.texto ?? null;

  // Capitular: a 1ª letra sai do texto e vira obstáculo na coluna 0 da página 0.
  let cap = [], obstaculos = [], corpo = texto;
  if (c.capitular) {
    const letra = [...texto][0] ?? '';
    if (/\p{L}/u.test(letra)) {
      const linhas = c.capitular.linhas ?? 3, caixa = caixaCapitular({ x: G.texto.x, y: G.texto.y, linhas, entrelinha: tamanho * entrelinha });
      cap = capitular(caixa, { ...c.capitular, linhas, letra }, `${seed}|livro|capitular`, ctx.fontes);
      obstaculos = [{ pagina: 0, ...caixa }];
      corpo = texto.slice(letra.length);
    } else avisos.push('capitular: o texto não começa com letra');
  }

  const papelTexto = { largura: papel.largura, altura: papel.altura,
    margens: { topo: G.texto.y, esq: G.texto.x, dir: papel.largura - G.texto.x - G.texto.l, base: papel.altura - G.texto.y - G.texto.a } };
  const r = compor(corpo, ctx.fontes, ctx.mao, papelTexto, { tamanho, entrelinha, alinhamento: c.alinhamento, colunas: c.colunas, vaoColunas: c.vaoColunas, obstaculos });
  avisos.unshift(...r.avisos.filter((a) => !a.startsWith('tolerancia')), ...avisosMarca);
  // a capitular tira a 1ª letra: se ela era uma palavra inteira, os índices das marcas andam uma palavra
  const conta = (s) => s.split(/\s+/).filter(Boolean).length, desl = conta(texto) - conta(corpo);
  for (const m of marcas) { m.ini = Math.max(0, m.ini - desl); m.fim = Math.max(0, m.fim - desl); }
  const pagDe = (ind) => r.ancoras.find((a) => a.indice === ind)?.pagina ?? 0;

  const plano = paginacao(r, c);
  const paginas = r.paginas.map((tracos, i) => {
    const d = desenhar(plano[i], G, ctx, avisos, i);
    const ilum = c.borda ? borda(G.util, c.borda, `${seed}|livro|borda`) : [];
    const ancoras = r.ancoras.filter((a) => a.pagina === i);
    const daPagina = marcas.filter((m) => (m.tipo === 'nota' || m.tipo === 'correcao' ? pagDe(m.ini) === i : ancoras.some((a) => a.indice >= m.ini && a.indice <= m.fim)));
    const n = comporNotas(daPagina, { pagina: i, tracos, grupos: r.grupos[i], ancoras, papel, coluna: { x: G.texto.x, l: G.texto.l }, faixa: null, calha: null, tamanho,
      ocupado: [...d.paginacao, ...ilum, ...(i === 0 ? cap : []), ...d.cabecalho] }, { ...ctx, maoNotas: ctx.maoNotas ?? ctx.mao },
    { conector: c.conector, espontaneo: c.espontaneo, seed: `${seed}|livro`, curva: c.curva, irregular: c.irregular, ponta: c.ponta, inclinacao: c.inclinacao, girar: c.girar });
    avisos.push(...n.avisos);
    return { notas: n.notas, camadas: [
      { id: 'texto', caneta: 'preta', personagem, ordem: 'escrita', grupos: r.grupos[i], tracos },
      { id: 'paginacao', caneta: 'preta', personagem, ordem: 'otimizada', tracos: d.paginacao },
      { id: 'iluminura', caneta: 'preta', personagem: null, ordem: 'otimizada', tracos: ilum },
      { id: 'rubrica', caneta, personagem, ordem: 'otimizada', tracos: [...(i === 0 ? cap : []), ...d.cabecalho] },
      { id: 'notas', caneta: c.canetaNotas, personagem: ctx.personagens?.notas ?? personagem, ordem: 'otimizada', tracos: n.tracos },
    ] };
  });
  const comNotas = paginas.some((p) => p.camadas.at(-1).tracos.length); // sem notas, a caneta das notas não entra (nada de troca à toa)
  if (!comNotas) for (const p of paginas) p.camadas.at(-1).caneta = 'preta';
  return { papel, canetas: { preta: CANETAS.preta, ...(c.rubrica && { vermelha: CANETAS.vermelha }), ...(comNotas && { [c.canetaNotas]: CANETAS[c.canetaNotas] }) }, paginas, avisos };
}

// Prévias: folha A6 com pautas e o elemento.
const A6 = { largura: 105, altura: 148, margens: { topo: 9, dir: 9, base: 9, esq: 9 } };
const PAUTA = 5 * 1.5;
const folha = (extra = []) => ({ fundo: Array.from({ length: 12 }, (_, k) => [[9, 30 + k * PAUTA], [96, 30 + k * PAUTA]]), foco: extra });
const retBorda = { x: 3, y: 3, l: 99, a: 142 };
const G6 = geometria(A6, { ...D });
const op = (...vs) => vs.map(([valor, rotulo]) => ({ valor, rotulo }));
const estilos = PARAMS_CAP.find((x) => x.chave === 'estilo').opcoes, bordas = PARAMS_BORDA.find((x) => x.chave === 'estilo').opcoes;
const capPrev = (v, ctx) => folha(v === 'nenhuma' ? [] : capitular(caixaCapitular({ x: 9, y: 30, linhas: 3, entrelinha: PAUTA }), { estilo: v, letra: 'A' }, 1, ctx.fontes));

export const PARAMS = [
  { chave: 'numeracao', grupo: 'livro', nivel: 'basico', tipo: 'marca', padrao: true, rotulo: 'número da página',
    ajuda: 'Escreve o número de cada página, centrado no rodapé. Desligado, as páginas ficam sem número.',
    previa: (v, ctx) => folha(v ? escreverEm('12', G6.pe, { alinhamento: 'centro', tamanho: G6.tc }, ctx.fontes, ctx.mao) : []) },
  { chave: 'reclamo', grupo: 'livro', nivel: 'avancado', tipo: 'marca', padrao: true, rotulo: 'reclamo',
    ajuda: 'Escreve no pé de cada página, à direita, a primeira palavra da página seguinte, como nos livros antigos. A última página fica sem.',
    previa: (v, ctx) => folha(v ? escreverEm('noite', G6.pe, { alinhamento: 'direita', tamanho: G6.tc }, ctx.fontes, ctx.mao) : []) },
  { chave: 'rubrica', grupo: 'livro', nivel: 'avancado', tipo: 'marca', padrao: true, rotulo: 'rubrica vermelha',
    ajuda: 'Capitular e cabeçalho corrente saem na caneta vermelha, em camada própria. Desligado, saem na preta.',
    previa: (v, ctx) => folha(v ? escreverEm('Livro I', G6.topo, { alinhamento: 'centro', tamanho: G6.tc }, ctx.fontes, ctx.mao) : []) },
  { chave: 'capitularLivro', grupo: 'livro', nivel: 'basico', tipo: 'opcao', padrao: 'nenhuma', rotulo: 'capitular do livro',
    ajuda: 'Letra grande no começo do texto, na primeira página. O texto corre ao lado dela. Escolha o estilo ou nenhuma.',
    opcoes: [...op(['nenhuma', 'nenhuma']), ...estilos], previa: capPrev },
  { chave: 'bordaLivro', grupo: 'livro', nivel: 'basico', tipo: 'opcao', padrao: 'nenhuma', rotulo: 'borda do livro',
    ajuda: 'Moldura ao redor de cada página. O texto ocupa só o que sobra dentro dela. Escolha o estilo ou nenhuma.',
    opcoes: [...op(['nenhuma', 'nenhuma']), ...bordas],
    previa: (v) => folha(v === 'nenhuma' ? [] : borda(retBorda, { estilo: v, largura: 6 }, 1)) },
];
