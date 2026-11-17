// Painéis e composição dos materiais novos (M20): carta, livro e folha de sigilos. O shell (app.js) monta os grupos.
import { resolver, validar } from '../personagem.js';
import { amostra } from '../layout.js';
import { papel as fabricaPapel, PARAMS as PARAMS_DOC, CANETAS } from '../materiais/documento.js';
import { comporCarta, PRESETS, PARAMS as PARAMS_CARTA } from '../materiais/carta.js';
import { parsearNotas, PARAMS as PARAMS_NOTAS } from '../materiais/notas.js';
import { comporLivro, PARAMS as PARAMS_LIVRO } from '../materiais/livro.js';
import { comporSigilos, PARAMS as PARAMS_SIG } from '../materiais/sigilos.js';
import { PARAMS as PARAMS_METODO } from '../arcano/sigilo.js';
import { PARAMS as PARAMS_ALF } from '../arcano/alfabeto.js';
import { controle, dica, ligar } from './controle.js';

// Um mapa por módulo: 'faixa' existe em carta.js e em circulo.js, então nunca se junta PARAMS de módulos diferentes.
const mapa = (ps) => Object.fromEntries(ps.map((p) => [p.chave, p]));
const PD = mapa(PARAMS_DOC), PC = mapa(PARAMS_CARTA), PN = mapa(PARAMS_NOTAS), PL = mapa(PARAMS_LIVRO), PS = mapa(PARAMS_SIG), PM = mapa(PARAMS_METODO), PA = mapa(PARAMS_ALF);

export const carta0 = () => ({ tipo: 'anotacao', marginalia: 'direita', faixa: 0.3, conector: 'linha', espontaneo: 0, canetaNotas: 'vermelha', personagemNotas: '' });
export const livro0 = () => ({ titulo: '', inicio: 1, numeracao: true, reclamo: true, rubrica: true, capitularLivro: 'nenhuma', bordaLivro: 'nenhuma' });
export const sigilos0 = () => ({ frases: 'abracadabra\nluz da lua\nsol\nmar e céu', tipo: 'selo', metodo: 'kamea', colunas: 3, legendas: true, caneta: 'preta' });

const salvos = () => { try { return JSON.parse(localStorage.getItem('writer.personagens')) ?? {}; } catch { return {}; } };

const ctxDe = (estado) => () => {
  const mao = resolver(estado.personagem, estado.variacao || null);
  return { fontes: estado.fontes, mao, escrever: (m, t, o) => amostra(estado.fontes, m, t, o), papel: estado.pagina, perfil: estado.perfil, estilo: estado.estilo };
};

function el(tag, props = {}, ...filhos) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...filhos);
  return e;
}
const titulo = (texto, ajuda) => el('h3', {}, texto, ...(ajuda ? [' ', dica(ajuda, texto)] : []));
const rotulado = (texto, campo) => el('label', {}, texto + ' ', campo);

// Select com prévia viva: opções [valor, rótulo] recalculadas a cada atualizar (personagens salvos mudam).
function opcao(chave, rotulo, ajuda, opcoes, ler, gravar, previa, aoMudar, ctx) {
  const def = { chave, grupo: 'notas', nivel: 'basico', tipo: 'opcao', rotulo, ajuda, opcoes: [], previa };
  const monta = (ops) => { def.opcoes = ops.map(([valor, r]) => ({ valor, rotulo: r })); };
  let ass = JSON.stringify(opcoes());
  monta(opcoes());
  const c = controle(def, { ler, gravar, ctx }, aoMudar);
  return {
    el: c.el,
    atualizar() {
      const ops = opcoes(), a = JSON.stringify(ops);
      if (a !== ass) { ass = a; monta(ops); c.el.querySelector('select').replaceChildren(...def.opcoes.map((o, i) => new Option(o.rotulo, i))); }
      c.atualizar();
    },
  };
}
const nota = (mao, x) => x.escrever(mao, 'nota', { tamanho: 6 });
const CANETA_OPS = () => Object.entries(CANETAS).map(([k, v]) => [k, v.nome]);

// Monta os controles, anexa e devolve o atualizar do grupo.
function juntar(div, itens, extras = []) {
  div.append(...extras, ...itens.map((c) => c.el));
  return () => itens.forEach((c) => c.atualizar());
}

// ---- composição ----
export function comporEscrita(estado, variacao) {
  const o = estado.opcoes, mao = resolver(estado.personagem, variacao || null);
  const base = { papel: estado.pagina, tamanho: o.tamanho, entrelinha: o.entrelinha, alinhamento: o.alinhamento };
  if (estado.oficina === 'livro') {
    const l = estado.livro, nenhuma = (v, extra) => (v === 'nenhuma' ? null : { estilo: v, ...extra });
    const { limpo, avisos } = parsearNotas(estado.texto); // a marcação da Carta não vale no Livro: só o texto limpo
    const r = comporLivro(limpo, { fontes: estado.fontes, mao, personagens: { texto: estado.personagem.nome } }, {
      ...base, colunas: o.colunas, titulo: l.titulo, inicio: l.inicio, numeracao: l.numeracao, reclamo: l.reclamo, rubrica: l.rubrica,
      capitular: nenhuma(l.capitularLivro, { linhas: 3 }), borda: nenhuma(l.bordaLivro, { largura: 6 }),
    });
    return { ...r, avisos: [...avisos, ...r.avisos] };
  }
  const c = estado.carta, outro = salvos()[c.personagemNotas], pn = outro && !validar(outro).length ? outro : estado.personagem;
  const ctx = { fontes: estado.fontes, mao, maoNotas: pn === estado.personagem ? mao : resolver(pn, null), personagens: { texto: estado.personagem.nome, notas: pn.nome } };
  return comporCarta(estado.texto, ctx, { ...base, tipo: c.tipo, marginalia: c.marginalia, faixa: c.faixa, conector: c.conector, espontaneo: c.espontaneo, canetaNotas: c.canetaNotas });
}

export function comporDeSigilos(estado) {
  const s = estado.sig, p = estado.pagina = fabricaPapel(estado.papelNome, { paisagem: estado.paisagem, largura: estado.largura, altura: estado.altura });
  const ctx = { fontes: estado.fontes, mao: resolver(estado.personagem, null) };
  return comporSigilos(s.frases, ctx, { papel: p, tipo: s.tipo, metodo: s.metodo, colunas: s.colunas, legendas: s.legendas, caneta: s.caneta, seed: estado.estilo.seed, complexidade: estado.estilo.complexidade });
}

// ---- painéis ----
const MARCACAO = [
  ['{nota: texto}', 'nota na margem, ligada à palavra anterior'],
  ['{~errado~>certo}', 'risca "errado" e escreve "certo" acima ou na margem'],
  ['{_trecho_}', 'sublinha o trecho'],
  ['{o:trecho}', 'faz um laço em volta do trecho'],
];

export function montarCarta(div, estado, aoMudar) {
  const c = estado.carta, ctx = ctxDe(estado);
  const tipo = { ler: () => c.tipo, gravar: (v) => Object.assign(c, { tipo: v, faixa: 0.3, ...PRESETS[v] }), ctx };
  const pers = opcao('personagemNotas', 'Personagem das notas', 'Quem escreve as notas da margem. "O mesmo da escrita" usa a mão do texto; os outros são personagens salvos no navegador.',
    () => [['', 'o mesmo da escrita'], ...Object.keys(salvos()).map((n) => [n, n])], () => c.personagemNotas, (v) => { c.personagemNotas = v; },
    (v, x) => { const p = salvos()[v]; return nota(p && !validar(p).length ? resolver(p, null) : x.mao, x); }, aoMudar, ctx);
  const caneta = opcao('canetaNotas', 'Caneta das notas', 'Cor da caneta que desenha a camada de notas. Troque de caneta no plotter entre as camadas.',
    CANETA_OPS, () => c.canetaNotas, (v) => { c.canetaNotas = v; }, (v, x) => nota(x.mao, x), aoMudar, ctx);
  const ajuda = el('ul', { className: 'marcacao' }, ...MARCACAO.map(([m, t]) => el('li', {}, el('code', {}, m), ` ${t}`)));
  return juntar(div, [
    controle(PC.tipo, tipo, aoMudar), controle(PC.marginalia, ligar(c, 'marginalia', ctx), aoMudar), controle(PC.faixa, ligar(c, 'faixa', ctx), aoMudar),
    controle(PN.conector, ligar(c, 'conector', ctx), aoMudar), controle(PN.espontaneo, ligar(c, 'espontaneo', ctx), aoMudar), pers, caneta,
  ], [titulo('Marcação no texto', 'Escreva estas marcas no texto. Elas não aparecem na folha: viram notas e riscos na camada de notas.'), ajuda]);
}

export function montarLivro(div, estado, aoMudar) {
  const l = estado.livro, ctx = ctxDe(estado);
  const tit = el('input', { type: 'text' }), ini = el('input', { type: 'number', min: 0, step: 1 });
  tit.addEventListener('input', () => { l.titulo = tit.value; aoMudar(); });
  ini.addEventListener('input', () => { const n = Math.trunc(Number(ini.value)); if (Number.isFinite(n)) { l.inicio = n; aoMudar(); } });
  const campos = [
    { el: rotulado('Título corrente', tit), atualizar() { if (tit !== document.activeElement) tit.value = l.titulo; } },
    { el: rotulado('Primeira página', ini), atualizar() { if (ini !== document.activeElement) ini.value = l.inicio; } },
  ];
  const cs = ['numeracao', 'reclamo', 'rubrica', 'capitularLivro', 'bordaLivro'].map((k) => controle(PL[k], ligar(l, k, ctx), aoMudar));
  return juntar(div, [...campos, ...cs]);
}

export function montarFolha(div, estado, aoMudar) {
  const ctx = ctxDe(estado);
  const cs = [
    controle(PD.papel, ligar(estado, 'papelNome', ctx), aoMudar), controle(PD.paisagem, ligar(estado, 'paisagem', ctx), aoMudar),
    controle(PD.largura, ligar(estado, 'largura', ctx), aoMudar), controle(PD.altura, ligar(estado, 'altura', ctx), aoMudar),
  ];
  div.append(...cs.map((c) => c.el));
  return () => { cs.forEach((c) => c.atualizar()); cs[2].el.hidden = cs[3].el.hidden = estado.papelNome !== 'personalizado'; };
}

export function montarSigilos(div, estado, aoMudar) {
  const s = estado.sig, ctx = ctxDe(estado);
  const frases = el('textarea', { id: 'frases', rows: 5 });
  frases.addEventListener('input', () => { s.frases = frases.value; aoMudar(); });
  const de = (def, ler, gravar) => controle(def, { ler, gravar, ctx }, aoMudar);
  const caneta = opcao('caneta', 'Caneta dos sigilos', 'Cor da caneta que desenha os sigilos.', CANETA_OPS, () => s.caneta, (v) => { s.caneta = v; },
    (v, x) => x.escrever(x.mao, 'sigilo', { tamanho: 6 }), aoMudar, ctx);
  const atualizar = juntar(div, [
    de(PS.tipoSigilo, () => s.tipo, (v) => { s.tipo = v; }), de(PM.metodo, () => s.metodo, (v) => { s.metodo = v; }),
    de(PS.colunasGrade, () => s.colunas, (v) => { s.colunas = v; }), de(PS.legendas, () => s.legendas, (v) => { s.legendas = v; }), caneta,
  ], [rotulado('Frases (uma por linha)', frases)]);
  return () => { if (frases.value !== s.frases) frases.value = s.frases; atualizar(); };
}

export function montarTradicao(div, estado, aoMudar) {
  const ctx = ctxDe(estado);
  return juntar(div, ['seed', 'complexidade'].map((k) => controle(PA[k], ligar(() => estado.estilo, k, ctx), aoMudar)));
}
