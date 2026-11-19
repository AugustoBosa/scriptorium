import './personagens.css';
import { validar, novoPersonagem, nomeLivre, renomearSalvo } from '../personagem.js';
import * as pPersonagem from './personagem.js';
import { especime } from './especime.js';

const FRASE_GRANDE = 'Querida Elena, o vento cheira a trigo.';
const FRASE_CARTAO = 'Querida Elena,';
const FOLHA_GRANDE = { largura: 120, altura: 40, margens: { topo: 4, dir: 4, base: 4, esq: 4 } };

const el = (tag, classe, texto) => {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
};
const botao = (texto, fn, rotulo) => {
  const b = el('button', null, texto);
  b.type = 'button';
  if (rotulo) b.setAttribute('aria-label', rotulo);
  b.addEventListener('click', fn);
  return b;
};
const lerSalvos = () => { try { return JSON.parse(localStorage.getItem('writer.personagens')) ?? {}; } catch { return {}; } };
const primeiraVariacao = (p) => Object.keys(p.variacoes ?? {})[0] ?? '';

// Contrato de página: montar(el, { fontes }) → atualizar()
export function montar(raiz, { fontes }) {
  const estado = { personagem: novoPersonagem(), variacao: 'normal', fontes };
  pPersonagem.restaurar(estado);
  let salvos = {};

  const folha = el('div', 'folha pers-folha');
  const textoEstado = el('p', 'pers-estado');
  const erro = el('p', 'erro');
  const titulo = el('h2');
  const galeria = el('div', 'pers-galeria');
  const inputArquivo = el('input');
  inputArquivo.type = 'file';
  inputArquivo.accept = '.json,application/json';
  inputArquivo.hidden = true;

  function mostrarErro(msg) { erro.textContent = msg ? 'Erro: ' + msg : ''; }
  function gravarSalvos(novos) {
    try {
      localStorage.setItem('writer.personagens', JSON.stringify(novos));
    } catch (e) {
      mostrarErro('não foi possível salvar neste navegador: ' + e.message);
      return false;
    }
    mostrarErro('');
    salvos = novos;
    desenharGaleria();
    return true;
  }

  // Editor existente, sem as linhas de arquivo/salvos (a página oferece essas ações)
  const detalhes = el('details');
  detalhes.open = true;
  const corpo = el('div');
  detalhes.append(el('summary', null, 'Mão em uso'), corpo);
  const aside = el('aside', 'pers-editor');
  aside.append(detalhes);
  const atualizarEditor = pPersonagem.montar(corpo, estado, aoMudar, { galeria: true });

  let agendado = false;
  function aoMudar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => { agendado = false; atualizarEditor(); redesenhar(); });
  }

  const marcaDe = (chave) => {
    if (chave !== estado.personagem.nome) return '';
    return JSON.stringify(salvos[chave]) === JSON.stringify(estado.personagem) ? 'em uso' : 'em uso · alterações não salvas';
  };
  function redesenhar() {
    const p = estado.personagem;
    especime(folha, fontes, p, estado.variacao, FRASE_GRANDE, FOLHA_GRANDE);
    const salvo = salvos[p.nome];
    const situacao = !salvo ? 'não salvo na galeria' : JSON.stringify(salvo) === JSON.stringify(p) ? 'salvo' : 'alterações não salvas';
    textoEstado.textContent = `${p.nome} · ${estado.variacao || 'mão base'} — ${situacao}`;
    galeria.querySelectorAll('.marca').forEach((m) => { m.textContent = marcaDe(m.dataset.chave); });
  }

  function usar(chave) {
    estado.personagem = structuredClone(salvos[chave]);
    estado.variacao = primeiraVariacao(estado.personagem);
    aoMudar();
  }
  function duplicar(chave) {
    const nome = nomeLivre(Object.keys(salvos), chave + ' (cópia)');
    gravarSalvos({ ...salvos, [nome]: { ...structuredClone(salvos[chave]), nome } });
  }
  function renomear(chave) {
    const para = prompt('Novo nome do personagem', chave)?.trim();
    if (para == null || para === chave) return;
    let novos;
    try { novos = renomearSalvo(salvos, chave, para); } catch { mostrarErro('já existe um personagem com esse nome.'); return; }
    if (!gravarSalvos(novos)) return;
    if (chave === estado.personagem.nome) { estado.personagem.nome = para; aoMudar(); }
  }
  function exportar(chave) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(salvos[chave], null, 2)], { type: 'application/json' }));
    const a = el('a');
    a.href = url;
    a.download = pPersonagem.slug(chave) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function excluir(chave) {
    if (!confirm(`Excluir "${chave}" da galeria? O arquivo não pode ser recuperado.`)) return;
    const { [chave]: _, ...resto } = salvos;
    gravarSalvos(resto);
  }

  function desenharGaleria() {
    const chaves = Object.keys(salvos);
    titulo.textContent = `Galeria (${chaves.length})`;
    galeria.replaceChildren(...chaves.map((chave) => {
      const p = salvos[chave], c = el('div', 'pers-cartao');
      const mini = el('div', 'folha');
      especime(mini, fontes, p, primeiraVariacao(p), FRASE_CARTAO);
      const marca = el('span', 'marca');
      marca.dataset.chave = chave;
      const acao = (texto, fn) => botao(texto, () => fn(chave), `${texto} ${chave}`);
      const linha = el('div', 'linha-botoes');
      linha.append(acao('Usar', usar), acao('Duplicar', duplicar), acao('Renomear', renomear), acao('Exportar', exportar), acao('Excluir', excluir));
      c.append(mini, el('strong', 'nome', chave), marca, linha);
      return c;
    }));
    if (!chaves.length) galeria.append(el('p', 'pers-vazio', 'Nenhum personagem salvo ainda.'));
    redesenhar();
  }

  inputArquivo.addEventListener('change', async () => {
    const arq = inputArquivo.files[0];
    inputArquivo.value = '';
    if (!arq) return;
    let p, errs;
    try { p = JSON.parse(await arq.text()); errs = validar(p); } catch (e) { errs = ['arquivo inválido: ' + e.message]; }
    if (errs.length) { mostrarErro(errs.join('; ')); return; }
    p.nome = nomeLivre(Object.keys(salvos), p.nome);
    gravarSalvos({ ...salvos, [p.nome]: p });
  });

  const acoes = el('div', 'linha-botoes');
  acoes.append(
    botao('Salvar na galeria', () => {
      const nome = estado.personagem.nome?.trim();
      if (!nome) { mostrarErro('dê um nome ao personagem antes de salvar.'); return; }
      gravarSalvos({ ...salvos, [nome]: { ...structuredClone(estado.personagem), nome } });
    }),
    botao('Novo', () => { estado.personagem = novoPersonagem(); estado.variacao = 'normal'; aoMudar(); }),
    botao('Importar JSON', () => inputArquivo.click()),
    inputArquivo,
  );

  const mesa = el('div', 'pers-mesa');
  mesa.append(folha, textoEstado, acoes, erro, titulo, galeria);
  const grade = el('div', 'pers');
  grade.append(mesa, aside);
  raiz.replaceChildren(grade);

  // Entrada na rota: a home ou uma oficina pode ter trocado o atual
  function atualizar() {
    pPersonagem.restaurar(estado);
    salvos = lerSalvos();
    atualizarEditor();
    desenharGaleria();
  }
  atualizar();
  return atualizar;
}
