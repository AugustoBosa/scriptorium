import { resolver, validar, ajustarVariacao, escritaDe, notasDe, NOTAS } from '../personagem.js';
import { PARAMS as PARAMS_LAYOUT } from '../layout.js';
import { PARAMS as PARAMS_NOTAS } from '../materiais/notas.js';
import * as pFontes from './fontes.js';
import { rotulo, AJUDA } from '../ajuda.js';
import { controle, dica } from './controle.js';
import { PARAMS } from '../motor/mao.js';
import { amostra } from '../layout.js';
import { el, botao, lerPersonagens as lerSalvos, novaFicha } from './util.js';

const P = Object.fromEntries(PARAMS.map((p) => [p.chave, p]));
const PL = Object.fromEntries(PARAMS_LAYOUT.map((p) => [p.chave, p]));
const PN = Object.fromEntries(PARAMS_NOTAS.map((p) => [p.chave, p]));
const CHAVES_IDENTIDADE = ['inclinacao', 'largura', 'altura', 'espacamento', 'espacoPalavra', 'idio', 'alternativas', 'contexto', 'arremate', 'ligadura', 'adiamento'];
const CHAVES_EXECUCAO = ['pressa', 'capricho', 'tremor', 'queda', 'compressao', 'variacao', 'desleixo', 'ondulacao', 'deriva', 'ritmo', 'fadiga', 'fluidez', 'ultrapassagem', 'retoque'];

export function slug(nome) {
  return (nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'personagem';
}

// Personagens salvos no navegador. Leitura tolerante; gravação lança erro para o chamador avisar.

// Restaura personagem salvo no localStorage. Qualquer erro: ignora.
export function restaurar(estado) {
  try {
    const salvo = JSON.parse(localStorage.getItem('writer.personagem'));
    const p = salvo?.personagem;
    if (!p || validar(p).length !== 0) return;
    const chaves = Object.keys(p.variacoes ?? {});
    const v = salvo.variacao;
    estado.personagem = p;
    estado.variacao = v === '' || chaves.includes(v) ? v : (chaves[0] ?? '');
  } catch {}
}

const lembrar = (estado) => {
  try { localStorage.setItem('writer.personagem', JSON.stringify({ personagem: estado.personagem, variacao: estado.variacao })); } catch {}
};
const linhaBotoes = (...itens) => { const d = el('div', 'linha-botoes'); d.append(...itens); return d; };
// "?" irmão do label (não filho): o nome acessível do campo fica só o texto
function campo(id, texto, entrada, ajuda) {
  entrada.id = id;
  const l = el('label', null, texto);
  l.htmlFor = id;
  return [linhaBotoes(l, dica(ajuda, texto)), entrada];
}
// Só reconstrói as opções quando a lista muda (reconstruir fecha o select aberto)
function opcoes(sel, lista) {
  const assinatura = JSON.stringify(lista);
  if (sel.dataset.lista === assinatura) return;
  sel.dataset.lista = assinatura;
  sel.replaceChildren(...lista.map(([texto, valor]) => new Option(texto, valor)));
}
const opcoesVariacao = (chaves) => (chaves.length ? chaves.map((k) => [k, k]) : [['(mão base)', '']]);
// Perfil com letra própria (base na variação): diz de que fonte vem a letra
const notaPerfil = () => { const n = el('p', 'nota-perfil'); n.hidden = true; return n; };
function atualizarNota(nota, p, variacao) {
  const base = p.variacoes?.[variacao]?.base;
  nota.hidden = !base;
  if (!base) return;
  const letra = `Este perfil usa a letra ${base.map((i) => i.fonte).join(' + ')}`;
  nota.textContent = p.ficha ? `${letra} — mude em Reabrir ficha.` : `${letra}.`;
}

let montados = 0; // cada oficina monta o próprio painel: sufixo evita id repetido

// Oficinas: só escolhe a mão (personagem salvo) e o estilo (variação). Editar é na aba Personagens.
export function montar(elemento, estado, aoMudar) {
  const sufixo = ++montados === 1 ? '' : '-' + montados;
  const erro = el('p', 'erro');
  const selPers = el('select');
  selPers.addEventListener('change', () => {
    const p = lerSalvos()[selPers.value];
    const errs = p ? validar(p) : ['personagem não encontrado'];
    if (errs.length) { erro.textContent = errs.join('; '); return; }
    erro.textContent = '';
    estado.personagem = structuredClone(p);
    estado.variacao = Object.keys(p.variacoes ?? {})[0] ?? '';
    aoMudar();
  });
  const selVar = el('select');
  selVar.addEventListener('change', () => { estado.variacao = selVar.value; aoMudar(); });
  const editar = el('p'), link = el('a', null, 'Editar mãos em Personagens');
  link.href = '#personagens';
  editar.append(link);
  const nota = notaPerfil();

  elemento.append(
    ...campo('p-personagem' + sufixo, 'Personagem', selPers, AJUDA.personagem),
    ...campo('p-variacao' + sufixo, rotulo('variacaoSel'), selVar, AJUDA.variacaoSel),
    nota, editar, erro,
  );

  function atualizar() {
    const p = estado.personagem, nomes = Object.keys(lerSalvos()), salvo = nomes.includes(p.nome);
    const chaves = Object.keys(p.variacoes ?? {});
    if (!chaves.includes(estado.variacao)) estado.variacao = chaves[0] ?? '';
    opcoes(selPers, [...(salvo ? [] : [[`${p.nome || 'sem nome'} (não salvo)`, '']]), ...nomes.map((n) => [n, n])]);
    selPers.value = salvo ? p.nome : '';
    opcoes(selVar, opcoesVariacao(chaves));
    selVar.value = estado.variacao;
    atualizarNota(nota, p, estado.variacao);
    lembrar(estado);
  }
  atualizar();
  return atualizar;
}

// Aba Personagens: edita tudo da letra (nome, perfis, fontes, tamanho, identidade, execução, notas). As oficinas só escolhem.
export function editor(elemento, estado, aoMudar) {
  const inputNome = el('input');
  inputNome.type = 'text';
  inputNome.addEventListener('input', () => { estado.personagem.nome = inputNome.value; aoMudar(); });

  const selVar = el('select');
  selVar.addEventListener('change', () => { estado.variacao = selVar.value; aoMudar(); });
  const btnRenomear = botao('Renomear', () => {
    const atual = estado.variacao;
    const nome = prompt('Nome da variação', atual)?.trim();
    const v = estado.personagem.variacoes;
    if (!nome || nome === atual || Object.hasOwn(v, nome)) return;
    estado.personagem.variacoes = Object.fromEntries(Object.entries(v).map(([k, val]) => [k === atual ? nome : k, val]));
    estado.variacao = nome;
    aoMudar();
  });
  const nota = notaPerfil();
  const btnRemover = botao('Remover', () => {
    const atual = estado.variacao;
    if (!confirm(`Remover a variação "${atual}"?`)) return;
    delete estado.personagem.variacoes[atual];
    estado.variacao = Object.keys(estado.personagem.variacoes)[0] ?? '';
    aoMudar();
  });

  // Controles de parâmetro: prévia viva com o valor atual
  const ctx = () => ({
    fontes: estado.fontes,
    mao: resolver(estado.personagem, estado.variacao || null),
    escrever: (m, t, o) => amostra(estado.fontes, m, t, o),
  });
  const ctrlIdentidade = CHAVES_IDENTIDADE.map((chave) => controle(P[chave], {
    ler: () => estado.personagem.mao[chave] ?? P[chave].padrao,
    gravar: (v) => { estado.personagem.mao[chave] = v; },
    ctx,
  }, aoMudar));
  const ctrlExecucao = CHAVES_EXECUCAO.map((chave) => controle(P[chave], {
    ler: () => resolver(estado.personagem, estado.variacao || null)[chave] ?? P[chave].padrao,
    gravar: (v) => ajustarVariacao(estado.personagem, estado.variacao || null, chave, v),
    ctx,
  }, aoMudar));
  // Tamanho e entrelinha: por perfil (variação), como a execução
  const ctrlEscrita = ['tamanho', 'entrelinha'].map((chave) => controle(PL[chave], {
    ler: () => escritaDe(resolver(estado.personagem, estado.variacao || null))[chave],
    gravar: (v) => ajustarVariacao(estado.personagem, estado.variacao || null, chave, v),
    ctx,
  }, aoMudar));
  // Gesto das notas na margem: um só por personagem
  const ctrlNotas = NOTAS.filter((k) => PN[k]).map((chave) => controle(PN[chave], {
    ler: () => notasDe(estado.personagem)[chave],
    gravar: (v) => { estado.personagem.notas = { ...notasDe(estado.personagem), [chave]: v }; },
    ctx,
  }, aoMudar));
  const letra = el('div');
  const atualizarFontes = pFontes.montar(letra, estado, aoMudar);
  const avancado = el('div');
  avancado.dataset.nivel = 'avancado';
  avancado.append(linhaBotoes(
    botao('Adicionar', () => {
      const nome = prompt('Nome da variação')?.trim();
      if (!nome) return;
      estado.personagem.variacoes ??= {};
      if (Object.hasOwn(estado.personagem.variacoes, nome)) return;
      estado.personagem.variacoes[nome] = {};
      estado.variacao = nome;
      aoMudar();
    }),
    btnRenomear,
    btnRemover,
  ));

  // acordeão nativo: abrir uma seção fecha as outras
  const secao = (titulo, ...itens) => {
    const d = el('details');
    d.name = 'pers-editor';
    d.append(el('summary', null, titulo), ...itens);
    return d;
  };
  const mao = secao('Mão em uso',
    ...campo('pg-nome', 'Nome', inputNome, AJUDA.personagem),
    linhaBotoes(botao('Novo personagem', () => novaFicha())),
    ...campo('pg-variacao', rotulo('variacaoSel'), selVar, AJUDA.variacaoSel),
    nota, avancado);
  mao.open = true;
  elemento.append(
    mao,
    secao('Letra', letra),
    secao('Tamanho e linhas', el('p', 'nota-secao', 'Vale para o perfil escolhido. Nas oficinas dá para só aumentar ou diminuir.'), ...ctrlEscrita.map((c) => c.el)),
    secao('Identidade', ...ctrlIdentidade.map((c) => c.el)),
    secao('Execução', ...ctrlExecucao.map((c) => c.el)),
    secao('Notas na margem', el('p', 'nota-secao', 'Como este personagem desenha setas e anotações nas cartas e livros.'), ...ctrlNotas.map((c) => c.el)),
  );

  function atualizar() {
    const p = estado.personagem;
    if (document.activeElement !== inputNome) inputNome.value = p.nome;
    const chaves = Object.keys(p.variacoes ?? {});
    if (!chaves.includes(estado.variacao)) estado.variacao = chaves[0] ?? '';
    opcoes(selVar, opcoesVariacao(chaves));
    selVar.value = estado.variacao;
    atualizarNota(nota, p, estado.variacao);
    btnRenomear.disabled = btnRemover.disabled = !chaves.length;
    [...ctrlEscrita, ...ctrlIdentidade, ...ctrlExecucao, ...ctrlNotas].forEach((c) => c.atualizar());
    atualizarFontes();
    lembrar(estado);
  }
  atualizar();
  return atualizar;
}
