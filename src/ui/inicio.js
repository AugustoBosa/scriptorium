import './inicio.css';
import { novoPersonagem, validar, resolver } from '../personagem.js';
import { especime } from './especime.js';
import { desenhar } from './previa.js';
import { papel } from '../materiais/documento.js';
import { comporCarta } from '../materiais/carta.js';
import { comporLivro } from '../materiais/livro.js';
import { comporGrimorio } from '../materiais/scroll.js';
import { comporSigilos } from '../materiais/sigilos.js';
import { EXEMPLOS } from '../materiais/exemplos.js';
import { gerarAlfabeto } from '../arcano/alfabeto.js';
import { magiaVazia } from '../magia.js';
import { NEUTRA } from '../motor/mao.js';
import { materiais } from './biblioteca.js';
import { el, NOMES_OFICINA, lerPersonagens } from './util.js';

const MAGIA = { ...magiaVazia(), id: 'exemplo', nome: 'Bola de Fogo', nivel: 3, linhaNivel: 'Evocação de 3º nível', alcance: '45 m', comp: 'V, S, M',
  duracao: 'Instantânea', resumo: 'Uma explosão de chamas atinge uma esfera de 6 m de raio.', texto: 'Uma explosão de chamas atinge uma esfera de 6 m de raio.' };

// Cada oficina: rota, nome, descrição e a miniatura real feita pelo próprio compositor, com o texto de exemplo.
const OFICINAS = [
  ['carta', 'Carta', 'Cartas, anotações e diários. Notas na margem, palavras riscadas e sublinhadas, numa segunda caneta.',
    (ctx) => comporCarta(EXEMPLOS.anotacao, ctx, { papel: papel('A7'), tamanho: 3.5, tipo: 'anotacao' })],
  ['livro', 'Livro', 'Páginas de livro em colunas, com título corrente, número de página, capitular e borda.',
    (ctx) => comporLivro(EXEMPLOS.livro, ctx, { papel: papel('A7'), tamanho: 2.5, entrelinha: 1.5, colunas: 1, titulo: 'Os sete copistas',
      capitular: { estilo: 'lombarda', linhas: 3 }, borda: { estilo: 'linhas', largura: 4 } })],
  ['magias', 'Magias', 'Magias de D&D em pergaminhos avulsos ou num grimório corrido, com sigilo, moldura e alfabeto arcano.',
    (ctx) => comporGrimorio([MAGIA], { ...ctx, fontes: { ...ctx.fontes, arcano: gerarAlfabeto({ seed: 1, curva: 0.4, complexidade: 0.5 }) },
      maoArcana: { ...NEUTRA, base: [{ fonte: 'arcano', peso: 1 }], seed: 1 }, sigilos: {}, seed: 1 }, { papel: papel('A7'), tamanho: 3, completo: 'nao' })],
  ['sigilos', 'Sigilos', 'Frases viram selos, sigilos e círculos mágicos, arrumados em grade numa folha.',
    (ctx) => comporSigilos('luz\nmar\nsol\nlua', ctx, { papel: papel('A7'), tipo: 'selo', colunas: 2, legendas: true, seed: 1 })],
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


export function montar(raiz, { fontes, abrir }) {
  const lema = el('p', 'lema', 'Caligrafia de traço único para plotter de caneta.');
  const mao = el('p', 'mao-atual');
  const gradeOf = el('div', 'grade');
  const faixa = el('div', 'grade faixa');
  const vazio = el('p', 'vazio', 'Nenhum personagem salvo ainda.');
  const todos = el('a', 'todos', 'Todos os personagens ›');
  todos.href = '#personagens';
  const hPe = el('h2');
  hPe.append(el('span', null, 'Personagens'), todos);
  const hBib = el('h2'), todosBib = el('a', 'todos', 'Biblioteca ›');
  todosBib.href = '#biblioteca';
  hBib.append(el('span', null, 'Materiais salvos'), todosBib);
  const recentes = el('div', 'grade recentes'), semMateriais = el('p', 'vazio', 'Nenhum material salvo ainda. Nas oficinas, use "Salvar na biblioteca".');
  raiz.append(lema, mao, el('h2', null, 'Oficinas'), gradeOf, hBib, recentes, semMateriais, hPe, faixa, vazio);

  function miniatura(pai, p, variacao, texto) {
    const f = el('div', 'folha');
    pai.append(f);
    especime(f, fontes, p, variacao, texto);
  }

  function atual() {
    const s = ler('writer.personagem', null);
    if (s?.personagem && validar(s.personagem).length === 0) return s;
    return { personagem: novoPersonagem(), variacao: 'normal' };
  }

  function botao(pai, rotulo, nome, fn) {
    const b = el('button', null, rotulo);
    b.type = 'button';
    b.setAttribute('aria-label', `${rotulo} ${nome}`);
    b.addEventListener('click', fn);
    pai.append(b);
  }

  function usar(salvo) {
    gravarAtual(salvo, Object.keys(salvo.variacoes ?? {})[0] ?? '');
    atualizar();
  }

  function atualizar() {
    const { personagem: p, variacao } = atual();
    const trocar = el('a', null, 'Trocar ›');
    trocar.href = '#personagens';
    mao.replaceChildren('Mão atual: ', el('strong', null, p.nome), variacao ? ` · ${variacao}` : '', ' ', trocar);

    const escrita = resolver(p, variacao || null);
    const ctx = { fontes, mao: escrita, maoNotas: escrita, personagens: { texto: p.nome, notas: p.nome } };
    const cartao = (id, nome, desc, desenho) => {
      const a = el('a', `cartao oficina ${id}`);
      a.href = `#${id}`;
      const f = el('div', 'folha');
      a.append(f, el('span', 'nome', nome), el('span', 'desc', desc));
      desenho(f);
      tracar(f);
      a.addEventListener('pointerenter', () => tracar(f));
      return a;
    };
    gradeOf.replaceChildren(
      ...OFICINAS.map(([id, nome, desc, compor]) => cartao(id, nome, desc, (f) => {
        try { desenhar(f, compor(ctx)); f.style.maxWidth = ''; } catch { especime(f, fontes, p, variacao, nome); }
      })),
      cartao('personagens', 'Personagens', 'Crie a mão de cada personagem: fontes, inclinação, pressa e as variações do jeito de escrever.',
        (f) => especime(f, fontes, p, variacao, p.nome || 'Personagem')),
    );

    const salvos = Object.values(lerPersonagens()).filter((s) => validar(s).length === 0).slice(0, 7);
    faixa.replaceChildren(...salvos.map((s) => {
      const c = el('div', 'cartao');
      miniatura(c, s, Object.keys(s.variacoes ?? {})[0] ?? '', s.nome);
      c.append(el('span', 'nome', s.nome));
      const acoes = el('span', 'acoes');
      if (s.nome === p.nome) acoes.append(el('span', 'marca', 'em uso'));
      else botao(acoes, 'Usar', s.nome, () => usar(s));
      botao(acoes, 'Editar', s.nome, () => { usar(s); location.hash = '#personagens'; });
      c.append(acoes);
      return c;
    }));
    const novo = el('button', 'cartao novo', '+ Novo personagem');
    novo.type = 'button';
    novo.addEventListener('click', () => { gravarAtual(novoPersonagem(), 'normal'); location.hash = '#personagens'; });
    faixa.append(novo);
    vazio.hidden = salvos.length > 0;
    materiais().then((ms) => {
      semMateriais.hidden = ms.length > 0;
      recentes.replaceChildren(...ms.slice(0, 4).map((m) => {
        const b = el('button', 'cartao material');
        b.type = 'button';
        b.append(el('span', 'nome', m.nome), el('span', 'desc', `${NOMES_OFICINA[m.oficina] ?? m.oficina} · ${new Date(m.quando).toLocaleDateString('pt-BR')}`));
        b.addEventListener('click', () => abrir(m));
        return b;
      }));
    });
  }

  return atualizar;
}
