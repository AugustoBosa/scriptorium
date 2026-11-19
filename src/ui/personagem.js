import { resolver, validar, novoPersonagem, ajustarVariacao } from '../personagem.js';
import { rotulo, AJUDA } from '../ajuda.js';
import { controle, dica } from './controle.js';
import { PARAMS } from '../motor/mao.js';
import { amostra } from '../layout.js';
import { baixarJson, lerPersonagens as lerSalvos, gravarPersonagens as gravarSalvos } from './util.js';

const P = Object.fromEntries(PARAMS.map((p) => [p.chave, p]));
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

let montados = 0; // cada oficina monta o próprio painel: sufixo evita id repetido
export function montar(elemento, estado, aoMudar, { galeria = false } = {}) {
  const sufixo = galeria || ++montados === 1 ? '' : '-' + montados;
  const erro = document.createElement('p');
  erro.className = 'erro';

  function botao(texto, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = texto;
    b.addEventListener('click', fn);
    return b;
  }
  function linhaBotoes(...itens) {
    const d = document.createElement('div');
    d.className = 'linha-botoes';
    d.append(...itens);
    return d;
  }
  function titulo(...conteudo) {
    const h = document.createElement('h3');
    h.append(...conteudo);
    return h;
  }

  // Personagem: nome, novo, salvar/abrir arquivo
  const inputNome = document.createElement('input');
  inputNome.type = 'text';
  inputNome.addEventListener('input', () => {
    estado.personagem.nome = inputNome.value;
    aoMudar();
  });

  const inputArquivo = document.createElement('input');
  inputArquivo.type = 'file';
  inputArquivo.accept = '.json,application/json';
  inputArquivo.hidden = true;
  inputArquivo.addEventListener('change', async () => {
    const arq = inputArquivo.files[0];
    inputArquivo.value = '';
    if (!arq) return;
    let p, errs;
    try {
      p = JSON.parse(await arq.text());
      errs = validar(p);
    } catch (e) {
      errs = ['arquivo inválido: ' + e.message];
    }
    if (errs.length) {
      erro.textContent = errs.join('; ');
      return;
    }
    erro.textContent = '';
    estado.personagem = p;
    estado.variacao = Object.keys(p.variacoes ?? {})[0] ?? '';
    aoMudar();
  });

  // Meus personagens (navegador)
  const selSalvos = document.createElement('select');
  const btnAbrirSalvo = botao('Abrir', () => {
    const p = lerSalvos()[selSalvos.value];
    const errs = p ? validar(p) : ['personagem não encontrado'];
    if (errs.length) {
      erro.textContent = errs.join('; ');
      return;
    }
    erro.textContent = '';
    estado.personagem = structuredClone(p);
    estado.variacao = Object.keys(p.variacoes ?? {})[0] ?? '';
    aoMudar();
  });
  const btnExcluir = botao('Excluir', () => {
    const nome = selSalvos.value;
    if (!confirm(`Excluir "${nome}" dos salvos?`)) return;
    const salvos = lerSalvos();
    delete salvos[nome];
    try {
      gravarSalvos(salvos);
    } catch (e) {
      erro.textContent = 'Não foi possível excluir: ' + e.message;
      return;
    }
    erro.textContent = '';
    reconstruirSalvos();
  });
  let assinaturaSalvos = null;
  function reconstruirSalvos() {
    const nomes = Object.keys(lerSalvos());
    const assinatura = JSON.stringify(nomes);
    if (assinatura === assinaturaSalvos) return;
    assinaturaSalvos = assinatura;
    if (!nomes.length) {
      selSalvos.replaceChildren(new Option('(nenhum salvo)', ''));
    } else {
      selSalvos.replaceChildren(...nomes.map(n => new Option(n, n)));
    }
    selSalvos.disabled = btnAbrirSalvo.disabled = btnExcluir.disabled = !nomes.length;
  }

  // Variação
  const selVar = document.createElement('select');
  selVar.addEventListener('change', () => {
    estado.variacao = selVar.value;
    aoMudar();
  });
  let chavesVar = null;
  function reconstruirVariacoes(chaves) {
    if (JSON.stringify(chaves) === chavesVar) return;
    chavesVar = JSON.stringify(chaves);
    selVar.replaceChildren(...(chaves.length
      ? chaves.map(k => new Option(k, k))
      : [new Option('(mão base)', '')]));
  }
  const btnRenomear = botao('Renomear', () => {
    const atual = estado.variacao;
    const nome = prompt('Nome da variação', atual)?.trim();
    const v = estado.personagem.variacoes;
    if (!nome || nome === atual || Object.hasOwn(v, nome)) return;
    estado.personagem.variacoes = Object.fromEntries(
      Object.entries(v).map(([k, val]) => [k === atual ? nome : k, val]));
    estado.variacao = nome;
    aoMudar();
  });
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
  const ctrlIdentidade = CHAVES_IDENTIDADE.map((chave) =>
    controle(P[chave], {
      ler: () => estado.personagem.mao[chave] ?? P[chave].padrao,
      gravar: (v) => { estado.personagem.mao[chave] = v; },
      ctx,
    }, aoMudar));
  const ctrlExecucao = CHAVES_EXECUCAO.map((chave) =>
    controle(P[chave], {
      ler: () => resolver(estado.personagem, estado.variacao || null)[chave] ?? P[chave].padrao,
      gravar: (v) => ajustarVariacao(estado.personagem, estado.variacao || null, chave, v),
      ctx,
    }, aoMudar));

  // "?" irmão do label (não filho): o nome acessível do campo fica só "Nome"
  function campo(texto, entrada, ajuda) {
    entrada.id ||= (galeria ? 'pg-' : 'p-') + slug(texto) + sufixo; // prefixo próprio: o painel das oficinas também existe no DOM
    const l = document.createElement('label');
    l.htmlFor = entrada.id;
    l.textContent = texto;
    return [linhaBotoes(l, dica(ajuda, texto)), entrada];
  }
  const avancado = (...itens) => {
    const d = document.createElement('div');
    d.dataset.nivel = 'avancado';
    d.append(...itens);
    return d;
  };

  elemento.append(
    ...campo('Nome', inputNome, AJUDA.personagem),
    linhaBotoes(
      botao('Novo personagem', () => {
        estado.personagem = novoPersonagem();
        estado.variacao = 'normal';
        aoMudar();
      }),
    ),
    ...galeria ? [] : [avancado(linhaBotoes(
      botao('Salvar JSON', () => {
        baixarJson(slug(estado.personagem.nome) + '.json', estado.personagem);
      }),
      botao('Abrir JSON', () => inputArquivo.click()),
    ), inputArquivo),
    avancado(titulo('Meus personagens (neste navegador)'), linhaBotoes(
      selSalvos,
      botao('Salvar aqui', () => {
        const nome = estado.personagem.nome?.trim();
        if (!nome) {
          erro.textContent = 'Dê um nome ao personagem antes de salvar.';
          return;
        }
        try {
          const salvos = lerSalvos();
          salvos[nome] = structuredClone(estado.personagem);
          gravarSalvos(salvos);
        } catch (e) {
          erro.textContent = 'Não foi possível salvar neste navegador: ' + e.message;
          return;
        }
        erro.textContent = '';
        reconstruirSalvos();
        selSalvos.value = nome;
      }),
      btnAbrirSalvo,
      btnExcluir,
    ))],
    ...campo(rotulo('variacaoSel'), selVar, AJUDA.variacaoSel),
    avancado(linhaBotoes(
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
    )),
    titulo('Identidade'), ...ctrlIdentidade.map((c) => c.el),
    titulo('Execução'), ...ctrlExecucao.map((c) => c.el),
    erro,
  );

  function atualizar() {
    const p = estado.personagem;
    if (document.activeElement !== inputNome) inputNome.value = p.nome;
    reconstruirSalvos();
    const chaves = Object.keys(p.variacoes ?? {});
    if (!chaves.includes(estado.variacao)) estado.variacao = chaves[0] ?? '';
    reconstruirVariacoes(chaves);
    selVar.value = estado.variacao;
    btnRenomear.disabled = btnRemover.disabled = !chaves.length;
    [...ctrlIdentidade, ...ctrlExecucao].forEach((c) => c.atualizar());
    try {
      localStorage.setItem('writer.personagem', JSON.stringify({ personagem: p, variacao: estado.variacao }));
    } catch {}
  }

  atualizar();
  return atualizar;
}
