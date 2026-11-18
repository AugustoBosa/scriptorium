import './inicio.css';
import { novoPersonagem, validar } from '../personagem.js';
import { especime } from './especime.js';

const OFICINAS = [
  ['carta', 'Carta', 'Caro viajante,', 'carta, nota ou diário'],
  ['scroll', 'Scroll', 'Bola de Fogo', 'uma magia por folha'],
  ['grimorio', 'Grimório', 'Livro de magias', 'magias em sequência'],
  ['livro', 'Livro', 'Capítulo I', 'colunas e capitular'],
  ['sigilos', 'Sigilos', 'Selo e sigilo', 'frases em selos'],
];

function ler(chave, padrao) {
  try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch { return padrao; }
}
function gravarAtual(p, variacao) {
  try { localStorage.setItem('writer.personagem', JSON.stringify({ personagem: p, variacao })); } catch {}
}
function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto != null) e.textContent = texto;
  return e;
}

export function montar(raiz, { fontes }) {
  const lema = el('p', 'lema', 'Caligrafia de traço único para plotter de caneta.');
  const mao = el('p', 'mao-atual');
  const gradeOf = el('div', 'grade');
  const faixa = el('div', 'grade faixa');
  const vazio = el('p', 'vazio', 'Nenhum personagem salvo ainda.');
  const todos = el('a', 'todos', 'Todos os personagens ›');
  todos.href = '#personagens';
  const hPe = el('h2');
  hPe.append(el('span', null, 'Personagens'), todos);
  raiz.append(lema, mao, el('h2', null, 'Oficinas'), gradeOf, hPe, faixa, vazio);

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

    gradeOf.replaceChildren(...OFICINAS.map(([id, nome, frase, desc]) => {
      const a = el('a', 'cartao');
      a.href = `#${id}`;
      miniatura(a, p, variacao, frase);
      a.append(el('span', 'nome', nome), el('span', 'desc', desc));
      return a;
    }));

    const salvos = Object.values(ler('writer.personagens', {})).filter((s) => validar(s).length === 0).slice(0, 7);
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
  }

  return atualizar;
}
