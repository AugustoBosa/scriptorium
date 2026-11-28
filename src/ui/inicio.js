import './inicio.css';
import { novoPersonagem, validar, resolver } from '../personagem.js';
import { especime } from './especime.js';
import { desenhar } from './previa.js';
import { papel } from '../materiais/documento.js';
import { comporCarta } from '../materiais/carta.js';
import { comporLivro } from '../materiais/livro.js';
import { comporGrimorio } from '../materiais/scroll.js';
import { comporSigilos } from '../materiais/sigilos.js';
import { comporChave } from '../materiais/chave.js';
import { dePreset } from '../arcano/presets.js';
import { EXEMPLOS } from '../materiais/exemplos.js';
import { gerarAlfabeto } from '../arcano/alfabeto.js';
import { magiaVazia } from '../magia.js';
import { NEUTRA } from '../motor/mao.js';
import { materiais } from './biblioteca.js';
import { CLASSES, RACAS } from '../ficha/dnd.js';
import { el, NOMES_OFICINA, lerPersonagens, comecarPersonagem, INICIOS } from './util.js';

const MAGIA = { ...magiaVazia(), id: 'exemplo', nome: 'Bola de Fogo', nivel: 3, linhaNivel: 'Evocação de 3º nível', alcance: '45 m', comp: 'V, S, M',
  duracao: 'Instantânea', resumo: 'Uma explosão de chamas atinge uma esfera de 6 m de raio.', texto: 'Uma explosão de chamas atinge uma esfera de 6 m de raio.' };

// Cada material: rota, nome, descrição e a miniatura real feita pelo próprio compositor, com o texto de exemplo.
const OFICINAS = [
  ['carta', 'Carta', 'Cartas, anotações e diários, com notas na margem.',
    (ctx) => comporCarta(EXEMPLOS.anotacao, ctx, { papel: papel('A7'), tamanho: 3.5, tipo: 'anotacao' })],
  ['livro', 'Livro', 'Páginas em colunas, com capitular e borda.',
    (ctx) => comporLivro(EXEMPLOS.livro, ctx, { papel: papel('A7'), tamanho: 2.5, entrelinha: 1.5, colunas: 1, titulo: 'Os sete copistas',
      capitular: { estilo: 'lombarda', linhas: 3 }, borda: { estilo: 'linhas', largura: 4 } })],
  ['magias', 'Magias', 'Pergaminhos avulsos ou um grimório corrido.',
    (ctx) => comporGrimorio([MAGIA], { ...ctx, fontes: { ...ctx.fontes, arcano: gerarAlfabeto({ seed: 1, curva: 0.4, complexidade: 0.5 }) },
      maoArcana: { ...NEUTRA, base: [{ fonte: 'arcano', peso: 1 }], seed: 1 }, sigilos: {}, seed: 1 }, { papel: papel('A7'), tamanho: 3, completo: 'nao' })],
  ['sigilos', 'Sigilos', 'Frases viram selos e círculos mágicos.',
    (ctx) => comporSigilos('luz\nmar\nsol\nlua', ctx, { papel: papel('A7'), tipo: 'selo', colunas: 2, legendas: true, seed: 1 })],
  ['simbolos', 'Símbolos', 'Seu sistema de escrita mágica: escola, nível e a magia viram sigilo.',
    (ctx) => comporChave([{ ...MAGIA, escola: 'V', mec: 'Res. DES · 8d6 fogo' }, { ...MAGIA, id: 'escudo', nome: 'Escudo', nivel: 1, escola: 'A', alcance: 'Pessoal', duracao: '1 rodada', mec: '' }], dePreset('colar'), ctx, { papel: papel('A7'), colunas: 2, tamanhoLegenda: 2 })],
];

function ler(chave, padrao) {
  try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch { return padrao; }
}
function gravarAtual(p, variacao) {
  try { localStorage.setItem('writer.personagem', JSON.stringify({ personagem: p, variacao })); } catch {}
}
// Desenha a miniatura traço a traço (CSS anima stroke-dashoffset; sem animação com prefers-reduced-motion).
function tracar(f) {
  const ps = [...f.querySelectorAll('path')];
  ps.forEach((p, i) => { p.setAttribute('pathLength', '1'); p.style.animationDelay = `${(i / ps.length) * 1.4}s`; });
  f.classList.remove('tracando');
  void f.offsetWidth; // reinicia a animação
  f.classList.add('tracando');
}

const nomeDe = (lista, id) => lista.find((x) => x.id === id)?.nome;
// Linha de ficha: "Mago · Elfo · 5 perfis"
function resumoFicha(p) {
  const f = p.ficha ?? {}, n = Object.keys(p.variacoes ?? {}).length;
  return [nomeDe(CLASSES, f.classe), nomeDe(RACAS, f.raca), `${n} ${n === 1 ? 'perfil' : 'perfis'}`].filter(Boolean).join(' · ');
}
// Capitular iluminada: a letra inicial de cada área, como num manuscrito.
function cabecalho(letra, cor, titulo, id) {
  const h = el('header', 'cab-area');
  const cap = el('span', `capitular ${cor}`, letra);
  cap.setAttribute('aria-hidden', 'true');
  const t = el('div'), h2 = el('h2', null, titulo), sub = el('p', 'sub');
  h2.id = id;
  t.append(h2, sub);
  h.append(cap, t);
  return { h, sub };
}

export function montar(raiz, { fontes, abrir }) {
  // ---- Personagens: quem escreve ----
  const areaP = el('section', 'area area-personagens');
  areaP.setAttribute('aria-labelledby', 'h-personagens');
  const cabP = cabecalho('P', 'lapis', 'Personagens', 'h-personagens');
  cabP.sub.textContent = 'Quem escreve. Cada um tem a sua letra, os seus tamanhos e perfis.';
  const blocos = el('div', 'blocos');
  const vazioP = el('p', 'vazio', 'Ainda não há personagens. Comece criando quem vai escrever.');
  const inicios = el('div', 'inicios');
  inicios.append(...INICIOS.map(([modo, rotulo, ajuda]) => {
    const b = el('button', 'inicio');
    b.type = 'button';
    b.append(el('strong', null, rotulo), el('span', null, ajuda));
    b.addEventListener('click', () => comecarPersonagem(modo));
    return b;
  }));
  const todos = el('a', 'todos', 'Todos os personagens ›');
  todos.href = '#personagens';
  areaP.append(cabP.h, blocos, vazioP, el('h3', 'rotulo-inicios', 'Novo personagem'), inicios, todos);

  // ---- Escrever: o que escrever ----
  const areaE = el('section', 'area area-escrever');
  areaE.setAttribute('aria-labelledby', 'h-escrever');
  const cabE = cabecalho('E', 'vermelhao', 'Escrever', 'h-escrever');
  const gradeOf = el('div', 'grade');
  areaE.append(cabE.h, gradeOf);

  // ---- Continuar: materiais salvos ----
  const areaC = el('section', 'area area-continuar');
  areaC.setAttribute('aria-labelledby', 'h-continuar');
  const topoC = el('div', 'topo-continuar'), hC = el('h2', null, 'Continuar'), todosBib = el('a', 'todos', 'Biblioteca ›');
  hC.id = 'h-continuar';
  todosBib.href = '#biblioteca';
  topoC.append(hC, todosBib);
  const recentes = el('div', 'recentes');
  const semMateriais = el('p', 'vazio', 'Nenhum material salvo ainda. Nas oficinas, use "Salvar na biblioteca".');
  areaC.append(topoC, recentes, semMateriais);

  const colunas = el('div', 'colunas');
  colunas.append(areaP, areaE);
  raiz.replaceChildren(colunas, areaC);

  function atual() {
    const s = ler('writer.personagem', null);
    if (s?.personagem && validar(s.personagem).length === 0) return s;
    return { personagem: novoPersonagem(), variacao: 'normal' };
  }
  function usar(salvo) {
    gravarAtual(salvo, Object.keys(salvo.variacoes ?? {})[0] ?? '');
    atualizar();
  }
  function botao(pai, rotulo, nome, fn, classe) {
    const b = el('button', classe, rotulo);
    b.type = 'button';
    b.setAttribute('aria-label', `${rotulo} ${nome}`);
    b.addEventListener('click', fn);
    pai.append(b);
  }

  function atualizar() {
    const { personagem: p, variacao } = atual();
    const salvos = Object.values(lerPersonagens()).filter((s) => validar(s).length === 0);
    // em uso primeiro; três na home, o resto em Personagens
    const ordem = [...salvos.filter((s) => s.nome === p.nome), ...salvos.filter((s) => s.nome !== p.nome)].slice(0, 3);
    blocos.replaceChildren(...ordem.map((s) => {
      const emUso = s.nome === p.nome;
      const b = el('article', `bloco-ficha${emUso ? ' em-uso' : ''}`);
      const topo = el('div', 'bloco-topo'), nomes = el('div'), acoes = el('div', 'acoes');
      nomes.append(el('h3', null, s.nome), el('p', 'resumo', resumoFicha(s)));
      if (emUso) acoes.append(el('span', 'marca', 'em uso'));
      else botao(acoes, 'Usar', s.nome, () => usar(s));
      botao(acoes, 'Editar', s.nome, () => { usar(s); location.hash = '#personagens'; }, 'sec');
      topo.append(nomes, acoes);
      const f = el('div', 'folha amostra');
      b.append(topo, f);
      especime(f, fontes, s, emUso ? variacao : Object.keys(s.variacoes ?? {})[0] ?? '', 'Querida Elena, o vento cheira a trigo.');
      return b;
    }));
    vazioP.hidden = salvos.length > 0;
    todos.hidden = salvos.length <= 3;
    areaP.classList.toggle('primeira-vez', !salvos.length);

    cabE.sub.replaceChildren('Escolha o material. Escrito por ', el('strong', null, p.nome), variacao ? ` · perfil ${variacao}` : '', '.');
    const escrita = resolver(p, variacao || null);
    const ctx = { fontes, mao: escrita, maoNotas: escrita, personagens: { texto: p.nome, notas: p.nome } };
    gradeOf.replaceChildren(...OFICINAS.map(([id, nome, desc, compor]) => {
      const a = el('a', `cartao oficina ${id}`);
      a.href = `#${id}`;
      const f = el('div', 'folha'), txt = el('div', 'txt');
      txt.append(el('span', 'nome', nome), el('span', 'desc', desc));
      a.append(f, txt);
      try { desenhar(f, compor(ctx)); f.style.maxWidth = ''; } catch { especime(f, fontes, p, variacao, nome); }
      tracar(f);
      a.addEventListener('pointerenter', () => tracar(f));
      return a;
    }));

    materiais().then((ms) => {
      semMateriais.hidden = ms.length > 0;
      recentes.replaceChildren(...ms.slice(0, 4).map((m, i) => {
        const b = el('button', `material${i === 0 ? ' ultimo' : ''}`);
        b.type = 'button';
        const quem = m.estado?.personagem?.nome;
        b.append(el('span', 'nome', m.nome),
          el('span', 'desc', [NOMES_OFICINA[m.oficina] ?? m.oficina, quem && `por ${quem}`, new Date(m.quando).toLocaleDateString('pt-BR')].filter(Boolean).join(' · ')));
        b.addEventListener('click', () => abrir(m));
        return b;
      }));
    });
  }

  return atualizar;
}
