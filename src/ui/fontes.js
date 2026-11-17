import { mutar, PARAMS } from '../motor/mao.js';
import { rotulo, AJUDA } from '../ajuda.js';
import { controle, ligar, dica } from './controle.js';
import { resolver } from '../personagem.js';
import { amostra } from '../layout.js';
import { abrirCatalogo } from './catalogo.js';

const P = Object.fromEntries(PARAMS.map((p) => [p.chave, p]));

function titulo(texto, chave) {
  const h = document.createElement('h3');
  h.append(texto);
  if (chave) h.append(' ', dica(AJUDA[chave], texto));
  return h;
}

export function montar(elemento, estado, aoMudar) {
  const lista = document.createElement('div');
  let linhas = [];
  const ctx = () => ({
    fontes: estado.fontes,
    mao: resolver(estado.personagem, estado.variacao || null),
    escrever: (m, t, o) => amostra(estado.fontes, m, t, o),
  });

  function criarLinha(i) {
    const fonte = controle({
      chave: 'base', nivel: 'basico', tipo: 'opcao', grade: false, rotulo: rotulo('base'), ajuda: AJUDA.base,
      opcoes: estado.nomesFontes.map((n) => ({ valor: n, rotulo: n })),
      previa: (v, c) => amostra(c.fontes, { ...c.mao, base: [{ fonte: v, peso: 1 }] }, 'a mão viu', { tamanho: 6 }),
    }, {
      ler: () => estado.personagem.mao.base[i].fonte,
      gravar: (v) => { estado.personagem.mao.base[i].fonte = v; },
      ctx,
    }, aoMudar);

    const peso = controle(P.peso, {
      ler: () => estado.personagem.mao.base[i].peso,
      gravar: (v) => { estado.personagem.mao.base[i].peso = Math.max(0.01, v); },
      ctx: () => ({ ...ctx(), indice: i }),
    }, aoMudar);

    const remover = document.createElement('button');
    remover.type = 'button';
    remover.textContent = 'Remover';
    remover.addEventListener('click', () => {
      estado.personagem.mao.base.splice(i, 1);
      aoMudar();
    });

    const linha = document.createElement('div');
    linha.append(fonte.el, peso.el, remover);
    return { linha, fonte, peso, remover };
  }

  const adicionar = document.createElement('button');
  adicionar.type = 'button';
  adicionar.textContent = 'Adicionar fonte';
  adicionar.addEventListener('click', () => {
    estado.personagem.mao.base.push({ fonte: estado.nomesFontes[0], peso: 0.5 });
    aoMudar();
  });

  const seed = controle(P.seed, ligar(() => estado.personagem.mao, 'seed', ctx), aoMudar);

  const m = { mutarSeed: 1, mutarForca: 0.3 };
  const mutarCtx = () => ({ ...ctx(), mao: estado.personagem.mao });
  const cSeed = controle(P.mutarSeed, ligar(m, 'mutarSeed', mutarCtx), aoMudar);
  const cForca = controle(P.mutarForca, ligar(m, 'mutarForca', mutarCtx), aoMudar);

  const botaoMutar = document.createElement('button');
  botaoMutar.type = 'button';
  botaoMutar.textContent = 'Mutar';
  botaoMutar.addEventListener('click', () => {
    estado.personagem.mao = mutar(estado.personagem.mao, m.mutarSeed, m.mutarForca);
    m.mutarSeed += 1;
    aoMudar();
  });

  const tabela = document.createElement('button');
  tabela.type = 'button';
  tabela.textContent = 'Tabela de fontes';
  tabela.addEventListener('click', () => abrirCatalogo(estado, aoMudar));

  elemento.replaceChildren(
    titulo('Fontes da mão', 'base'),
    tabela,
    lista,
    adicionar,
    seed.el,
    titulo('Mutar', 'mutarForca'),
    cSeed.el,
    cForca.el,
    botaoMutar,
  );

  return function atualizar() {
    const base = estado.personagem.mao.base;
    if (base.length !== linhas.length) {
      linhas = base.map((_, i) => criarLinha(i));
      lista.replaceChildren(...linhas.map((l) => l.linha));
    }
    base.forEach((it, i) => {
      const l = linhas[i];
      l.fonte.atualizar();
      l.peso.atualizar();
      l.remover.disabled = base.length <= 1;
    });
    seed.atualizar();
    cSeed.atualizar();
    cForca.atualizar();
  };
}
