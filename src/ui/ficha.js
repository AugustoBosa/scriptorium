import './ficha.css';
import { el, botao, lerPersonagens, gravarPersonagens } from './util.js';
import { especime } from './especime.js';
import { PARAMS } from '../motor/mao.js';
import { novoPersonagem, nomeLivre, validar, ESCRITA_PADRAO, notasDe } from '../personagem.js';
import { RACAS, CLASSES, ANTECEDENTES, IDIOMAS, ALINHAMENTOS, IDADES, ESCRITAS } from '../ficha/dnd.js';
import { propostas, sugerirLetras, letrasDerivadas, maoDaFicha } from '../ficha/sugerir.js';
import { montarPerfis, variacoesDe } from '../ficha/perfis.js';
import { controle } from './controle.js';
import { abrirCatalogo } from './catalogo.js';
import { amostra } from '../layout.js';

// Wizard "Criar personagem": ficha D&D em passos, um aberto por vez. Rascunho em localStorage.
const CHAVE = 'writer.ficha.rascunho';
const FOLHA = { largura: 120, altura: 40, margens: { topo: 4, dir: 4, base: 4, esq: 4 } };
const ATRIBUTOS = [['for', 'FOR'], ['des', 'DES'], ['con', 'CON'], ['int', 'INT'], ['sab', 'SAB'], ['car', 'CAR']];
const ARRAY_PADRAO = [15, 14, 13, 12, 10, 8];
const AUTO = { druida: 'druidico', ladino: 'giria' }; // idioma secreto que a classe ensina sozinha
const TIPOS = [['padrão', 'Padrão'], ['exótico', 'Exótico'], ['secreto', 'Secreto']];
const P = Object.fromEntries(PARAMS.map((p) => [p.chave, p]));
const LETRAS_FIXAS = [{ id: 'principal', nome: 'Principal' }, { id: 'caprichada', nome: 'Caprichada' }, { id: 'corrida', nome: 'Corrida' }];

const FICHA0 = () => ({ v: 1, raca: 'humano', classe: 'guerreiro', antecedente: 'soldado', idade: 'adulto', destro: true, atributos: { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 }, alinhamento: 'N', idiomas: ['comum'], ferramentas: { caligrafo: false, falsificacao: false } });

const nomeDe = (lista, id) => lista.find((x) => x.id === id)?.nome ?? '';
const valido = (lista, id, padrao) => (lista.some((x) => x.id === id) ? id : padrao);

function lerRascunho() {
  let g = null;
  try { g = JSON.parse(localStorage.getItem(CHAVE)); } catch { /* corrompido: começa do zero */ }
  const f = FICHA0();
  if (g?.ficha && typeof g.ficha === 'object') {
    Object.assign(f, g.ficha, { atributos: { ...f.atributos, ...g.ficha.atributos }, ferramentas: { ...f.ferramentas, ...g.ficha.ferramentas } });
  }
  f.raca = valido(RACAS, f.raca, 'humano');
  f.classe = valido(CLASSES, f.classe, 'guerreiro');
  f.antecedente = valido(ANTECEDENTES, f.antecedente, 'soldado');
  f.idade = valido(IDADES, f.idade, 'adulto');
  f.alinhamento = valido(ALINHAMENTOS, f.alinhamento, 'N');
  if (!Array.isArray(f.idiomas)) f.idiomas = ['comum'];
  return { nome: typeof g?.nome === 'string' ? g.nome : '', ficha: f, base: g?.base ?? null, perfis: g?.perfis ?? null, editando: typeof g?.editando === 'string' ? g.editando : null };
}
const gravar = (r) => { try { localStorage.setItem(CHAVE, JSON.stringify(r)); } catch { /* sem storage: o rascunho vale só nesta aba */ } };

// Idiomas: fixos da raça e os secretos da classe entram sozinhos; o resto é escolha livre, até o limite da raça + antecedente.
function infoIdiomas(f) {
  const raca = RACAS.find((r) => r.id === f.raca), antecedente = ANTECEDENTES.find((a) => a.id === f.antecedente);
  const fixos = raca.idiomas, auto = AUTO[f.classe] ? [AUTO[f.classe]] : [];
  const livre = (id) => !fixos.includes(id) && IDIOMAS.some((i) => i.id === id && i.tipo !== 'secreto');
  return { fixos, auto, livre, livres: raca.idiomasLivres + antecedente.idiomasLivres };
}
function normalizarIdiomas(f) {
  const info = infoIdiomas(f);
  f.idiomas = [...new Set([...info.fixos, ...info.auto, ...f.idiomas.filter(info.livre).slice(0, info.livres)])];
}

// Letra e perfis: a base efetiva é a escolhida pelo usuário, ou a proposta "Fiel" enquanto ele não escolhe.
const baseDe = (r) => r.base ?? propostas(r.ficha)[0].base;
const maoPrevia = (r) => maoDaFicha(r.ficha, baseDe(r));
const letras = (r) => letrasDerivadas(r.ficha, baseDe(r));
function derivar(r) {
  const { sugeridos, outros } = montarPerfis(r.ficha, letras(r));
  return [...sugeridos, ...outros.map((p) => ({ ...p, outro: true }))];
}
const perfisEf = (r) => r.perfis ?? derivar(r);
const escritasDoPJ = (ficha) => new Set(ficha.idiomas.map((id) => IDIOMAS.find((i) => i.id === id)?.escrita));
const opcoesLetra = (p, esc) => [...LETRAS_FIXAS, ...ESCRITAS.filter((e) => e.ligacao && (esc.has(e.id) || 'escrita:' + e.id === p.letra)).map((e) => ({ id: 'escrita:' + e.id, nome: 'Escrita ' + e.nome }))];
const iguais = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const nota1 = (x) => x.toFixed(1).replace('.', ',');
const grupo = (titulo, ...filhos) => { const g = el('fieldset', 'ficha-grupo'); g.append(el('legend', null, titulo), ...filhos); return g; };

// Erro da lista de perfis ligados (vazio = ok). Usado no passo 7 e para bloquear o salvamento.
function erroPerfis(lista) {
  const nomes = lista.filter((p) => p.ligado).map((p) => p.nome.trim());
  if (nomes.some((n) => !n)) return 'Erro: perfis ligados precisam de nome.';
  if (new Set(nomes).size !== nomes.length) return 'Erro: há perfis ligados com o mesmo nome.';
  if (nomes.includes('normal')) return "Erro: 'normal' é nome reservado para a variação padrão.";
  return '';
}

// Controles
let uid = 0;
const campo = (texto, controle) => { controle.id = 'ficha-c' + ++uid; const l = el('label', null, texto); l.htmlFor = controle.id; return [l, controle]; };
const opcao = (texto, controle) => { const l = el('label', 'ficha-opcao'); l.append(controle, el('span', null, texto)); return l; };
const selecao = (lista, valor, aoMudar) => { const sel = el('select'); sel.append(...lista.map((o) => new Option(o.nome, o.id))); sel.value = valor; sel.addEventListener('change', () => aoMudar(sel.value)); return sel; };
const caixa = (marcado, aoMudar) => { const c = el('input'); c.type = 'checkbox'; c.checked = marcado; c.addEventListener('change', () => aoMudar(c.checked)); return c; };

// ---- passos: montar(corpo, s) e resumo(s); s = { r, fontes, ganchos, mudou() } ----
function passoQuem(corpo, s) {
  const f = s.r.ficha;
  const nome = el('input');
  nome.type = 'text'; nome.value = s.r.nome; nome.autocomplete = 'off';
  nome.addEventListener('input', () => { s.r.nome = nome.value; s.mudou(); });
  const mao = el('fieldset', 'ficha-grupo');
  mao.append(el('legend', null, 'Mão'));
  for (const [valor, texto] of [['destra', 'Destra'], ['canhota', 'Canhota']]) {
    const rd = el('input');
    rd.type = 'radio'; rd.name = 'ficha-mao'; rd.value = valor; rd.checked = (valor === 'destra') === f.destro;
    rd.addEventListener('change', () => { f.destro = valor === 'destra'; s.mudou(); });
    mao.append(opcao(texto, rd));
  }
  const erroBranco = el('p', 'erro');
  const branco = botao('Começar em branco', () => {
    try {
      localStorage.setItem('writer.personagem', JSON.stringify({ personagem: novoPersonagem(s.r.nome || undefined), variacao: 'normal' }));
    } catch (e) { erroBranco.textContent = 'Erro: não foi possível gravar neste navegador (' + e.message + ').'; return; }
    location.hash = '#personagens';
  });
  branco.className = 'ficha-branco';
  corpo.append(
    ...campo('Nome', nome),
    ...campo('Raça', selecao(RACAS, f.raca, (v) => { f.raca = v; s.mudou(); })),
    ...campo('Idade', selecao(IDADES, f.idade, (v) => { f.idade = v; s.mudou(); })),
    mao, branco, erroBranco,
  );
}

function passoClasse(corpo, s) {
  const f = s.r.ficha;
  const ferramenta = (chave, texto) => opcao(texto, caixa(f.ferramentas[chave], (v) => { f.ferramentas[chave] = v; s.mudou(); }));
  corpo.append(
    ...campo('Classe', selecao(CLASSES, f.classe, (v) => { f.classe = v; s.mudou(); })),
    ...campo('Antecedente', selecao(ANTECEDENTES, f.antecedente, (v) => { f.antecedente = v; s.mudou(); })),
    ferramenta('caligrafo', 'Ferramentas de calígrafo'),
    ferramenta('falsificacao', 'Kit de falsificação'),
  );
}

function passoAtributos(corpo, s) {
  const f = s.r.ficha, grade = el('div', 'ficha-atributos'), campos = {};
  const aplicar = (valores) => {
    ATRIBUTOS.forEach(([k], i) => { f.atributos[k] = valores[i]; campos[k].value = valores[i]; });
    s.mudou();
  };
  for (const [k, rotulo] of ATRIBUTOS) {
    const n = el('input');
    n.type = 'number'; n.min = '3'; n.max = '20'; n.step = '1'; n.value = f.atributos[k];
    campos[k] = n;
    n.addEventListener('change', () => {
      const v = parseInt(n.value, 10);
      f.atributos[k] = Number.isNaN(v) ? f.atributos[k] : Math.min(20, Math.max(3, v));
      n.value = f.atributos[k];
      s.mudou();
    });
    const celula = el('div');
    celula.append(...campo(rotulo, n));
    grade.append(celula);
  }
  const predefinidos = el('div', 'linha-botoes');
  predefinidos.append(botao('Array padrão (15, 14, 13, 12, 10, 8)', () => aplicar(ARRAY_PADRAO)), botao('Tudo 10', () => aplicar(ATRIBUTOS.map(() => 10))));
  corpo.append(grade, predefinidos);
}

function passoAlinhamento(corpo, s) {
  const grade = el('div', 'ficha-alinhamento');
  const botoes = ALINHAMENTOS.map((a) => botao(a.nome, () => { s.r.ficha.alinhamento = a.id; s.mudou(); }));
  grade.append(...botoes);
  s.ganchos.push(() => botoes.forEach((b, i) => b.setAttribute('aria-pressed', String(ALINHAMENTOS[i].id === s.r.ficha.alinhamento))));
  corpo.append(grade, el('p', 'ficha-nota', 'Bem e Mal não mudam a letra; Leal e Caótico sim.'));
}

function passoIdiomas(corpo, s) {
  const caixas = new Map(), faltam = el('p', 'ficha-nota');
  faltam.setAttribute('aria-live', 'polite');
  for (const [tipo, titulo] of TIPOS) {
    const grupoIdiomas = el('fieldset', 'ficha-grupo');
    grupoIdiomas.append(el('legend', null, titulo));
    for (const idioma of IDIOMAS.filter((i) => i.tipo === tipo)) {
      const c = caixa(false, (marcado) => {
        const f = s.r.ficha;
        f.idiomas = marcado ? [...f.idiomas, idioma.id] : f.idiomas.filter((x) => x !== idioma.id);
        s.mudou();
      });
      caixas.set(idioma.id, c);
      grupoIdiomas.append(opcao(idioma.nome, c));
    }
    corpo.append(grupoIdiomas);
  }
  corpo.append(faltam);
  s.ganchos.push(() => {
    const f = s.r.ficha, info = infoIdiomas(f), livres = info.livres - f.idiomas.filter(info.livre).length;
    for (const [id, c] of caixas) {
      const secreto = IDIOMAS.find((i) => i.id === id).tipo === 'secreto';
      if (info.fixos.includes(id)) { c.checked = true; c.disabled = true; }
      else if (secreto) { c.checked = info.auto.includes(id); c.disabled = true; }
      else { c.checked = f.idiomas.includes(id); c.disabled = !c.checked && livres === 0; }
    }
    faltam.textContent = livres ? `Faltam ${livres} ${livres === 1 ? 'idioma' : 'idiomas'}` : 'Nenhum idioma livre restante';
  });
}

// Passo 6: cartões das propostas, misturar fontes sugeridas e a letra atual (com pesos e catálogo).
function passoLetra(corpo, s) {
  const { fontes } = s;
  const cartoes = el('div', 'ficha-cartoes'), misturar = el('ul', 'ficha-lista'), atual = el('div', 'ficha-atual');
  let chaveCartoes = null, chaveAtual = null, botoesUsar = [], controles = [];
  const editarBase = () => (s.r.base ??= structuredClone(baseDe(s.r)));

  function montarCartoes(props, rank) {
    botoesUsar = [];
    cartoes.replaceChildren(...props.map((prop) => {
      const c = el('article', 'ficha-cartao'), m = el('div', 'folha');
      especime(m, fontes, { nome: '', mao: maoDaFicha(s.r.ficha, prop.base), variacoes: { normal: {} } }, null, 'Querida Elena,');
      const chips = el('div', 'ficha-chips');
      chips.append(...(rank.find((x) => x.fonte === prop.base[0].fonte)?.motivos ?? []).map((t) => el('span', 'ficha-chip', t)));
      const usar = botao('Usar', () => { s.r.base = structuredClone(prop.base); s.mudou(); });
      botoesUsar.push({ usar, base: prop.base });
      c.append(el('h3', null, prop.nome), m, el('p', 'ficha-nota', prop.base.map((i) => i.fonte).join(' + ')), chips, ...(prop.aviso ? [el('p', 'ficha-aviso', prop.aviso)] : []), usar);
      return c;
    }));
  }

  function montarMisturar(rank) {
    misturar.replaceChildren(...rank.slice(0, 8).map((x) => {
      const li = el('li', 'ficha-linha');
      li.append(el('span', 'ficha-fonte', x.fonte), el('span', 'ficha-num', 'nota ' + nota1(x.nota)), botao('+ Misturar', () => {
        const base = editarBase(), item = base.find((i) => i.fonte === x.fonte);
        if (item) item.peso = 0.5; else base.push({ fonte: x.fonte, peso: 0.5 });
        s.mudou();
      }, 'Misturar ' + x.fonte));
      return li;
    }));
  }

  function montarAtual(base) {
    controles = [];
    atual.replaceChildren(...base.map((item, i) => {
      const peso = controle(P.peso, {
        ler: () => baseDe(s.r)[i].peso,
        gravar: (v) => { editarBase()[i].peso = Math.max(0.01, v); },
        ctx: () => ({ fontes, mao: maoPrevia(s.r), escrever: (m, t, o) => amostra(fontes, m, t, o), indice: i }),
      }, s.mudou);
      controles.push(peso);
      const remover = botao('Remover', () => { editarBase().splice(i, 1); s.mudou(); }, 'Remover ' + item.fonte);
      remover.disabled = base.length <= 1;
      const linha = el('div', 'ficha-atual-linha');
      linha.append(el('span', 'ficha-fonte', item.fonte), peso.el, remover);
      return linha;
    }));
  }

  // Só reconstrói cartões/misturar quando a lista de propostas muda, e as linhas de peso quando muda a lista de fontes.
  // Os pesos apenas atualizam os controles existentes, para o slider não perder o foco.
  s.ganchos.push(() => {
    const ficha = s.r.ficha, props = propostas(ficha), rank = sugerirLetras(ficha), base = baseDe(s.r);
    const kCartoes = JSON.stringify([props, rank.map((x) => [x.fonte, x.nota, x.motivos])]);
    if (kCartoes !== chaveCartoes) { chaveCartoes = kCartoes; montarCartoes(props, rank); montarMisturar(rank); }
    botoesUsar.forEach(({ usar, base: b }) => usar.setAttribute('aria-pressed', String(iguais(b, base))));
    const kAtual = base.map((i) => i.fonte).join('|');
    if (kAtual !== chaveAtual) { chaveAtual = kAtual; montarAtual(base); }
    else controles.forEach((c) => c.atualizar());
  });

  const catalogo = botao('Ver catálogo completo', () => {
    const estadoFalso = { fontes, personagem: { mao: { base: structuredClone(baseDe(s.r)) } } };
    abrirCatalogo(estadoFalso, () => { s.r.base = estadoFalso.personagem.mao.base; s.mudou(); });
  });
  corpo.append(
    el('p', 'ficha-nota', 'A prévia no topo mostra a mão com a letra escolhida. Sem escolha, vale a proposta Fiel.'),
    grupo('Sugeridas pela ficha', cartoes),
    grupo('Misturar', misturar),
    grupo('Letra atual', atual, catalogo),
  );
}

// Passo 7: perfis de escrita (sugeridos e outros), com letra, nome, execução e duplicar.
function passoPerfis(corpo, s) {
  const { fontes } = s;
  const sugeridos = el('div', 'ficha-perfis'), listaOutros = el('div', 'ficha-perfis'), outros = el('details');
  outros.append(el('summary'), listaOutros);
  const erro = el('p', 'erro');
  const editar = () => (s.r.perfis ??= structuredClone(perfisEf(s.r)));
  let chave = null, linhas = [];

  function linhaPerfil(i, p0, esc) {
    const atual = () => perfisEf(s.r)[i];
    const linha = el('div', 'ficha-perfil');
    const usar = caixa(!!p0.ligado, (v) => { editar()[i].ligado = v; s.mudou(); });
    usar.setAttribute('aria-label', 'Usar ' + p0.nome);
    const nome = el('input');
    nome.type = 'text'; nome.value = p0.nome; nome.autocomplete = 'off';
    nome.addEventListener('input', () => { editar()[i].nome = nome.value; s.mudou(); });
    const cab = el('div', 'ficha-perfil-cab'), caixaNome = el('div', 'ficha-perfil-nome');
    caixaNome.append(...campo('Nome do perfil', nome));
    cab.append(opcao('Usar', usar), caixaNome);
    const letra = selecao(opcoesLetra(p0, esc), p0.letra, (v) => {
      const L = letras(s.r), lista = editar();
      lista[i].letra = v;
      lista[i].base = structuredClone(v.startsWith('escrita:') ? L.escrita[v.slice(8)] : L[v]);
      s.mudou();
    });
    const mini = el('div', 'folha ficha-mini');
    const ajustes = ['pressa', 'capricho', 'tremor', 'desleixo'].map((k) => controle(P[k], {
      ler: () => atual().exec[k] ?? maoPrevia(s.r)[k],
      gravar: (v) => { editar()[i].exec[k] = v; },
      ctx: () => { const p = atual(); return { fontes, mao: { ...maoPrevia(s.r), ...p.exec, base: p.base }, escrever: (m, t, o) => amostra(fontes, m, t, o) }; },
    }, s.mudou));
    const ajuste = el('details');
    ajuste.append(el('summary', null, 'Ajustar'), ...ajustes.map((c) => c.el));
    const dup = botao('Duplicar', () => {
      const lista = editar(), copia = structuredClone(lista[i]);
      copia.nome = nomeLivre(lista.map((p) => p.nome), lista[i].nome + ' (cópia)');
      copia.ligado = true;
      lista.splice(i + 1, 0, copia);
      s.mudou();
    });
    linha.append(cab, el('p', 'ficha-nota', p0.descricao), mini, ...campo('Letra', letra), ajuste, dup);

    // Atualiza no lugar: não reconstrói a linha, para o slider e o detalhe aberto não se perderem.
    const atualizar = () => {
      const p = atual(), maoPJ = maoPrevia(s.r);
      usar.checked = !!p.ligado;
      usar.setAttribute('aria-label', 'Usar ' + p.nome);
      if (document.activeElement !== nome) nome.value = p.nome;
      letra.value = p.letra;
      especime(mini, fontes, { nome: '', mao: { ...maoPJ, ...p.exec, base: p.base }, variacoes: { normal: {} } }, null, 'Querida Elena,');
      ajustes.forEach((c) => c.atualizar());
    };
    return { el: linha, atualizar };
  }

  function montarLista(lista, esc) {
    linhas = lista.map((p, i) => linhaPerfil(i, p, esc));
    sugeridos.replaceChildren(...linhas.filter((_, i) => !lista[i].outro).map((l) => l.el));
    listaOutros.replaceChildren(...linhas.filter((_, i) => lista[i].outro).map((l) => l.el));
    const n = lista.filter((p) => p.outro).length;
    outros.querySelector('summary').textContent = `Outros perfis (${n})`;
    outros.hidden = n === 0;
  }

  s.ganchos.push(() => {
    const lista = perfisEf(s.r), esc = escritasDoPJ(s.r.ficha);
    const k = JSON.stringify([lista.map((p) => [p.id, !!p.outro]), [...esc]]);
    if (k !== chave) { chave = k; montarLista(lista, esc); }
    linhas.forEach((l) => l.atualizar());
    erro.textContent = erroPerfis(lista);
  });

  const acoes = el('div', 'linha-botoes');
  acoes.append(
    botao('Refazer sugestões', () => { s.r.perfis = null; s.mudou(); }),
    botao('+ Perfil em branco', () => {
      const L = letras(s.r), lista = editar();
      lista.push({ id: 'livre', nome: nomeLivre(lista.map((p) => p.nome), 'Perfil'), descricao: '', letra: 'principal', base: structuredClone(L.principal), exec: {}, ligado: true });
      s.mudou();
    }),
  );
  corpo.append(
    el('p', 'ficha-nota', 'Cada perfil é um jeito de escrever: letra e execução. Os sugeridos vêm da ficha; a prévia mostra a mão do personagem neste perfil.'),
    grupo('Perfis', sugeridos),
    outros,
    acoes, erro,
  );
}

// Passo 8: resumo do que será salvo e o botão de salvar.
function passoResumo(corpo, s) {
  const tbody = el('tbody'), tabela = el('table', 'ficha-resumo');
  tabela.append(tbody);
  const erro = el('p', 'erro');
  erro.setAttribute('role', 'alert');
  const salvar = botao('Salvar personagem', () => {
    const r = s.r, nome = r.nome.trim(), lista = perfisEf(r);
    if (!nome) { erro.textContent = 'Erro: dê um nome ao personagem no passo 1.'; return; }
    const errosPerfis = erroPerfis(lista);
    if (errosPerfis) { erro.textContent = errosPerfis; return; }
    const salvos = lerPersonagens();
    if (r.editando) delete salvos[r.editando];
    const final = nomeLivre(Object.keys(salvos), nome);
    const mao = { ...maoDaFicha(r.ficha, baseDe(r)), ...ESCRITA_PADRAO };
    const personagem = { nome: final, mao, variacoes: variacoesDe(mao, lista.map((p) => ({ ...p, nome: p.nome.trim() }))), notas: notasDe(null), ficha: structuredClone(r.ficha) };
    const errosP = validar(personagem);
    if (errosP.length) { erro.textContent = 'Erro: ' + errosP.join('; '); return; }
    try {
      gravarPersonagens({ ...salvos, [final]: personagem });
      localStorage.setItem('writer.personagem', JSON.stringify({ personagem, variacao: 'normal' }));
      localStorage.removeItem(CHAVE);
    } catch (e) { erro.textContent = 'Erro: não foi possível salvar neste navegador: ' + e.message; return; }
    location.hash = '#personagens';
  });
  salvar.className = 'primario';
  corpo.append(tabela, salvar, erro);
  s.ganchos.push(() => {
    const r = s.r, base = baseDe(r), total = base.reduce((t, i) => t + i.peso, 0);
    const nomes = perfisEf(r).filter((p) => p.ligado).map((p) => p.nome.trim() || '(sem nome)');
    const linhas = [
      ['Nome', r.nome.trim() || '(sem nome)'],
      ['Ficha', [nomeDe(RACAS, r.ficha.raca), nomeDe(CLASSES, r.ficha.classe), nomeDe(ANTECEDENTES, r.ficha.antecedente), nomeDe(ALINHAMENTOS, r.ficha.alinhamento), nomeDe(IDADES, r.ficha.idade)].join(', ')],
      ['Letra', base.map((i) => `${i.fonte} ${Math.round((i.peso / total) * 100)}%`).join(' + ')],
      ['Perfis', nomes.length ? nomes.join(', ') : 'nenhum'],
    ];
    tbody.replaceChildren(...linhas.map(([titulo, valor]) => {
      const tr = el('tr'), th = el('th', null, titulo);
      th.scope = 'row';
      tr.append(th, el('td', null, valor));
      return tr;
    }));
  });
}

// Para acrescentar um passo, basta incluir um item aqui.
const PASSOS = [
  { titulo: 'Quem é', resumo: (s) => [s.r.nome.trim(), nomeDe(RACAS, s.r.ficha.raca), nomeDe(IDADES, s.r.ficha.idade)].filter(Boolean).join(', '), montar: passoQuem },
  { titulo: 'Classe e origem', resumo: (s) => [nomeDe(CLASSES, s.r.ficha.classe), nomeDe(ANTECEDENTES, s.r.ficha.antecedente)].filter(Boolean).join(', '), montar: passoClasse },
  { titulo: 'Atributos', resumo: (s) => ATRIBUTOS.map(([k, r]) => `${r} ${s.r.ficha.atributos[k]}`).join(' · '), montar: passoAtributos },
  { titulo: 'Alinhamento', resumo: (s) => nomeDe(ALINHAMENTOS, s.r.ficha.alinhamento), montar: passoAlinhamento },
  { titulo: 'Idiomas', resumo: (s) => s.r.ficha.idiomas.map((id) => nomeDe(IDIOMAS, id)).join(', '), montar: passoIdiomas },
  { titulo: 'Letra', resumo: (s) => baseDe(s.r).map((i) => i.fonte).join(' + '), montar: passoLetra },
  { titulo: 'Perfis de escrita', resumo: (s) => { const n = perfisEf(s.r).filter((p) => p.ligado).length; return `${n} ${n === 1 ? 'ligado' : 'ligados'}`; }, montar: passoPerfis },
  { titulo: 'Resumo e salvar', resumo: () => '', montar: passoResumo },
];

// Contrato de página: montar(raiz, { fontes }) → atualizar()
export function montar(raiz, { fontes }) {
  const s = {
    r: null,
    fontes,
    ganchos: [],
    mudou() { normalizarIdiomas(s.r.ficha); gravar(s.r); reflete(); },
  };
  let detalhes = [], previa = null, aberto = 0;

  function atualizarPrevia() {
    const nome = s.r.nome.trim();
    const p = { nome, mao: maoPrevia(s.r), variacoes: { normal: {} } };
    especime(previa, fontes, p, null, `${nome || 'Seu personagem'} escreve: o vento cheira a trigo.`, FOLHA);
  }

  function reflete() {
    detalhes.forEach((d, i) => {
      const passo = PASSOS[i], resumo = passo.resumo(s);
      d.querySelector('summary').textContent = `${i + 1}. ${passo.titulo}${resumo ? ' — ' + resumo : ''}`;
    });
    s.ganchos.forEach((f) => f());
    atualizarPrevia();
  }

  function irPara(i) {
    detalhes.forEach((d, j) => { d.open = j === i; });
    detalhes[i].querySelector('summary').focus();
  }
  const navegacao = (i) => {
    const barra = el('div', 'linha-botoes');
    if (i > 0) barra.append(botao('Voltar', () => irPara(i - 1)));
    if (i < PASSOS.length - 1) barra.append(botao('Próximo', () => irPara(i + 1)));
    return barra;
  };

  // Relê o rascunho e monta a página inteira; o passo que estava aberto continua aberto.
  function render() {
    const atualAberto = detalhes.findIndex((d) => d.open);
    if (atualAberto >= 0) aberto = atualAberto;
    s.r = lerRascunho();
    normalizarIdiomas(s.r.ficha);
    s.ganchos = [];
    previa = el('div', 'folha ficha-previa');
    const passos = el('div', 'ficha-passos');
    detalhes = PASSOS.map((passo, i) => {
      const d = el('details', 'ficha-passo');
      d.name = 'ficha';
      const corpo = el('div');
      d.append(el('summary'), corpo);
      passo.montar(corpo, s);
      corpo.append(navegacao(i));
      passos.append(d);
      return d;
    });
    detalhes[aberto].open = true;

    const topo = el('div', 'ficha-topo');
    topo.append(previa);
    const pagina = el('div', 'ficha');
    pagina.append(
      el('h2', null, 'Criar personagem'),
      el('p', 'ficha-intro', 'Responda à ficha de D&D. A letra e os perfis de escrita saem dela; tudo pode ser mudado depois.'),
      topo, passos,
    );
    raiz.replaceChildren(pagina);
    reflete();
  }

  render();
  return render;
}
