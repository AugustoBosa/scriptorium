// Oficinas de scroll e grimório: estado, painéis e composição. O shell (app.js) monta os grupos e chama compor().
import { resolver, novoPersonagem, validar } from '../personagem.js';
import { restaurar } from './personagem.js';
import { NEUTRA } from '../motor/mao.js';
import { parseFonte } from '../fonte.js';
import { PERFIS } from '../maquina/perfis.js';
import { magiaVazia, ESCOLAS } from '../magia.js';
import { gerarAlfabeto, sigilo, LETRAS, CAIXA, PARAMS as PARAMS_ARCANO } from '../arcano/alfabeto.js';
import { comporGrimorio, folha, FOLHAS, CFG_PADRAO, PARAMS as PARAMS_SCROLL } from '../materiais/scroll.js';
import { PARAMS as PARAMS_DOC } from '../materiais/documento.js';
import { amostra } from '../layout.js';
import * as pExportar from './exportar.js';
import { controle, dica, ligar } from './controle.js';

const $ = (id) => document.getElementById(id);
const CHAVE = 'grimorio.estado';
const SALVOS = ['selecionadas', 'atual', 'folhaNome', 'paisagem', 'margem', 'cfg', 'estilo', 'simbolos', 'variacao'];
const PD = Object.fromEntries(PARAMS_DOC.map((p) => [p.chave, p]));
const PS = Object.fromEntries(PARAMS_SCROLL.map((p) => [p.chave, p]));
const PA = Object.fromEntries(PARAMS_ARCANO.map((p) => [p.chave, p]));

// el('label', { className: 'x' }, 'texto', filho...) cria o elemento, aplica as propriedades e anexa os filhos.
function el(tag, props = {}, ...filhos) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...filhos.filter((f) => f != null));
  return e;
}

export function criar() {
  const estado = {
    magias: [],            // catálogo carregado de dados/magias.json ou importado
    selecionadas: [],      // cópias editáveis das magias do scroll/grimório
    atual: 0,              // índice da magia em edição
    folhaNome: 'A6', paisagem: false, margem: FOLHAS.A6[2],
    cfg: structuredClone(CFG_PADRAO),
    estilo: { seed: 1, curva: 0.4, complexidade: 0.5 },
    simbolos: { letras: {}, sigilos: {} },
    personagem: null, variacao: 'normal',
    fontes: {},
    // usados pelos painéis de exportação (ui/exportar.js) e pelo shell
    perfil: structuredClone(PERFIS.megaS), perfilNome: 'megaS', otimizar: true, trajeto: false,
    paginaAtual: 0, resultado: null, pagina: null, oficina: 'scroll', doc: null,
  };

  try {
    Object.assign(estado, JSON.parse(localStorage.getItem(CHAVE)) ?? {});
    estado.cfg = { ...structuredClone(CFG_PADRAO), ...estado.cfg };
  } catch { /* estado salvo ilegível: começa do zero */ }
  estado.personagem = novoPersonagem();
  const variacaoSalva = estado.variacao;
  try { restaurar(estado); } catch { /* usa personagem novo */ }
  if (variacaoSalva === '' || variacaoSalva in (estado.personagem.variacoes ?? {})) estado.variacao = variacaoSalva;
  estado.pagina = folha(estado.folhaNome, estado.paisagem, estado.margem);

  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(Object.fromEntries(SALVOS.map((k) => [k, estado[k]]))));
    } catch (e) { $('erro').textContent = `Não foi possível salvar no navegador: ${e.message}`; }
  }

  // Carrega do disco as fontes da mão que ainda não estão em memória.
  async function garantirFontes() {
    const faltam = estado.personagem.mao.base.map((b) => b.fonte).filter((n) => !estado.fontes[n]);
    await Promise.all(faltam.map(async (nome) => {
      const r = await fetch(`fontes/${nome}.svg`);
      if (!r.ok) throw new Error(`não foi possível carregar a fonte ${nome}`);
      estado.fontes[nome] = parseFonte(await r.text(), nome);
    }));
  }

  function contexto() {
    const arcano = gerarAlfabeto(estado.estilo, estado.simbolos.letras);
    return {
      fontes: { ...estado.fontes, arcano },
      mao: resolver(estado.personagem, estado.variacao || null),
      maoArcana: { ...NEUTRA, base: [{ fonte: 'arcano', peso: 1 }], seed: estado.estilo.seed },
      sigilos: estado.simbolos.sigilos,
      seed: estado.estilo.seed,
    };
  }

  // Contexto das prévias dos controles.
  const ctx = () => ({
    ...contexto(),
    papel: estado.pagina,
    estilo: estado.estilo,
    magia: estado.selecionadas[estado.atual] ?? magiaVazia(),
    escrever: (m, t, o) => amostra({ ...estado.fontes, arcano: gerarAlfabeto(estado.estilo, estado.simbolos.letras) }, m, t, o),
    perfil: estado.perfil,
  });

  // ---------- painel Magias ----------
  function painelMagias(raiz, aoMudar) {
    const busca = el('input', { type: 'search', placeholder: 'Buscar por nome (pt ou en)…', ariaLabel: 'Buscar magia' });
    const nivel = el('select', { ariaLabel: 'Nível' }, new Option('Todos os níveis', ''), ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => new Option(n === 0 ? 'Truques' : `${n}º nível`, n)));
    const classe = el('select', { ariaLabel: 'Classe' }, new Option('Todas as classes', ''));
    const achados = el('div', { className: 'achados' });
    const lista = el('ol', { className: 'selecionadas' });
    const semDados = el('p', { hidden: true }, 'Sem dados de magias nesta cópia da página. Importe um magias.json (gerado por scripts/gerar-magias.mjs) ou crie magias em branco. ');
    const arquivo = el('input', { type: 'file', accept: '.json' });
    arquivo.addEventListener('change', async () => {
      try {
        const dados = JSON.parse(await arquivo.files[0].text());
        if (!Array.isArray(dados) || !dados[0]?.nome) throw new Error('não é um magias.json');
        estado.magias = dados;
        aoMudar();
      } catch (e) { $('erro').textContent = `Importação falhou: ${e.message}`; }
    });
    semDados.append(arquivo);

    const adicionar = (m) => {
      const copia = structuredClone(m);
      if (estado.selecionadas.some((s) => s.id === copia.id)) copia.id += '-' + Date.now();
      estado.selecionadas.push(copia);
      estado.atual = estado.selecionadas.length - 1;
      aoMudar();
    };
    const filtrar = () => {
      const q = busca.value.trim().toLowerCase();
      const ok = estado.magias.filter((m) =>
        (!q || m.nome.toLowerCase().includes(q) || m.nomeEn.toLowerCase().includes(q))
        && (nivel.value === '' || m.nivel === Number(nivel.value))
        && (!classe.value || m.classes.includes(classe.value)));
      achados.replaceChildren(...ok.slice(0, 40).map((m) =>
        el('button', { type: 'button', title: m.nomeEn, onclick: () => adicionar(m) }, `${m.nome} (${m.nivel})`)));
      if (ok.length > 40) achados.append(el('small', {}, ` +${ok.length - 40}: refine a busca`));
    };
    for (const c of [busca, nivel, classe]) c.addEventListener('input', filtrar);

    raiz.append(semDados, busca, el('div', { className: 'linha-botoes' }, nivel, classe), achados,
      el('h3', {}, 'No scroll / grimório'), lista,
      el('div', { className: 'linha-botoes' },
        el('button', { type: 'button', onclick: () => adicionar(magiaVazia()) }, 'Magia em branco'),
        el('button', { type: 'button', onclick: () => { if (!confirm(`Limpar as ${estado.selecionadas.length} magias da lista?`)) return; estado.selecionadas = []; estado.atual = 0; aoMudar(); } }, 'Limpar lista')));

    let nMagias = -1;
    return () => {
      semDados.hidden = estado.magias.length > 0;
      if (nMagias !== estado.magias.length) {
        nMagias = estado.magias.length;
        const classes = [...new Set(estado.magias.flatMap((m) => m.classes))].sort();
        classe.replaceChildren(new Option('Todas as classes', ''), ...classes.map((c) => new Option(c, c)));
        filtrar();
      }
      lista.replaceChildren(...estado.selecionadas.map((m, i) => {
        const mover = (d) => () => {
          const [x] = estado.selecionadas.splice(i, 1);
          estado.selecionadas.splice(i + d, 0, x);
          estado.atual = i + d;
          aoMudar();
        };
        return el('li', { className: i === estado.atual ? 'atual' : '' },
          el('button', { type: 'button', className: 'nome', onclick: () => { estado.atual = i; aoMudar(); } }, m.nome),
          el('button', { type: 'button', title: 'Subir', disabled: i === 0, onclick: mover(-1) }, '↑'),
          el('button', { type: 'button', title: 'Descer', disabled: i === estado.selecionadas.length - 1, onclick: mover(1) }, '↓'),
          el('button', { type: 'button', title: 'Remover', onclick: () => { estado.selecionadas.splice(i, 1); estado.atual = Math.max(0, Math.min(estado.atual, estado.selecionadas.length - 1)); aoMudar(); } }, '✕'));
      }));
    };
  }

  // ---------- painel Editar magia ----------
  const CAMPOS_MAGIA = [
    ['nome', 'Nome'], ['linhaNivel', 'Linha de nível'], ['tempo', 'Tempo'], ['alcance', 'Alcance'], ['comp', 'Componentes'], ['duracao', 'Duração'],
    ['mec', 'Mecânica', 2], ['resumo', 'Resumo', 3], ['texto', 'Texto completo', 6], ['superior', 'Níveis superiores', 2],
  ];
  function painelEditar(raiz, aoMudar) {
    const vazio = el('p', {}, 'Escolha uma magia na lista acima.');
    const form = el('div');
    const sincs = [];
    const m = () => estado.selecionadas[estado.atual];
    for (const [chave, rotulo, linhas] of CAMPOS_MAGIA) {
      const c = linhas ? el('textarea', { rows: linhas }) : el('input', { type: 'text' });
      c.addEventListener('input', () => { m()[chave] = c.value; aoMudar(); });
      form.append(el('label', {}, rotulo + ' ', c));
      sincs.push(() => { if (c.value !== m()[chave]) c.value = m()[chave]; });
    }
    // O controle só existe com magia escolhida; sem ela, ler() devolve o padrão.
    const ctrls = ['nivel', 'escola', 'conc', 'ritual'].map((chave) =>
      controle(PA[chave], { ler: () => m()?.[chave] ?? PA[chave].padrao, gravar: (v) => { if (m()) m()[chave] = v; }, ctx }, aoMudar));
    form.append(
      el('h3', {}, 'Sigilo ', dica('O sigilo codifica a magia: pontas = nível + 2, miolo = escola, anel duplo = concentração, dentes no anel = ritual, marcas no anel = componentes V, S e M.', 'Sigilo')),
      ...ctrls.map((c) => c.el));
    sincs.push(...ctrls.map((c) => c.atualizar));
    raiz.append(vazio, form);
    return () => {
      vazio.hidden = !!m();
      form.hidden = !m();
      if (m()) sincs.forEach((s) => s());
    };
  }

  // ---------- painel Folha ----------
  function painelFolha(raiz, aoMudar) {
    const cfg = () => estado.cfg;
    const defPapel = { ...PD.papel, opcoes: PD.papel.opcoes.filter((o) => o.valor in FOLHAS), padrao: 'A6' };
    const ctrls = [
      controle(defPapel, {
        ler: () => estado.folhaNome,
        gravar: (v) => { estado.folhaNome = v; estado.margem = FOLHAS[v][2]; },
        ctx,
      }, aoMudar),
      controle(PD.paisagem, ligar(estado, 'paisagem', ctx), aoMudar),
      controle(PD.margem, ligar(estado, 'margem', ctx), aoMudar),
      ...['completo', 'tamanho', 'minimo', 'entrelinha', 'sigilo', 'moldura'].map((c) => controle(PS[c], ligar(cfg, c, ctx), aoMudar)),
    ];
    raiz.append(...ctrls.map((c) => c.el));
    return () => ctrls.forEach((c) => c.atualizar());
  }

  // ---------- painel Escrita ----------
  function painelEscrita(raiz, aoMudar) {
    const salvos = () => { try { return JSON.parse(localStorage.getItem('writer.personagens')) ?? {}; } catch { return {}; } };
    const pers = el('select');
    const vari = el('select');
    pers.addEventListener('change', async () => {
      const p = salvos()[pers.value];
      if (!p || validar(p).length) return;
      estado.personagem = p;
      estado.variacao = Object.keys(p.variacoes ?? {})[0] ?? '';
      try { await garantirFontes(); } catch (e) { $('erro').textContent = e.message; return; }
      aoMudar();
    });
    vari.addEventListener('change', () => { estado.variacao = vari.value; aoMudar(); });
    const cifrar = (chave, campo) => controle(PS[chave], { ler: () => estado.cfg.cifrar[campo], gravar: (v) => { estado.cfg.cifrar[campo] = v; }, ctx }, aoMudar);
    const estilo = () => estado.estilo;
    const ctrls = [
      cifrar('cifrarNome', 'nome'), cifrar('cifrarFicha', 'ficha'), cifrar('cifrarEfeito', 'efeito'),
      controle(PS.chave, ligar(() => estado.cfg, 'chave', ctx), aoMudar),
      ...['seed', 'curva', 'complexidade'].map((c) => controle(PA[c], ligar(estilo, c, ctx), aoMudar)),
    ];
    raiz.append(
      el('div', { className: 'linha-campo' }, el('label', {}, 'Quem escreve ', pers), ' ', dica('Personagens salvos na página de caligrafia. Crie ou ajuste a mão lá e salve; ela aparece aqui.', 'Quem escreve')),
      el('label', {}, 'Variação ', vari),
      el('p', {}, el('a', { href: '#carta' }, 'Criar ou editar personagens')),
      el('h3', {}, 'Escrever em alfabeto arcano ', dica('O bloco marcado sai no alfabeto inventado, sem acentos e em minúsculas. Plote também a chave para os jogadores decifrarem.', 'Alfabeto arcano')),
      ...ctrls.map((c) => c.el));
    const importar = el('input', { type: 'file', accept: '.json', hidden: true });
    importar.addEventListener('change', async () => {
      try {
        const d = JSON.parse(await importar.files[0].text());
        if (!d.estilo || !d.simbolos?.letras || !d.simbolos?.sigilos) throw new Error('arquivo sem estilo/simbolos');
        estado.estilo = d.estilo;
        estado.simbolos = d.simbolos;
        aoMudar();
      } catch (e) { $('erro').textContent = `Importação falhou: ${e.message}`; }
    });
    raiz.append(el('div', { className: 'linha-botoes' },
      el('button', { type: 'button', onclick: () => { estado.estilo.seed = Math.floor(Math.random() * 100000); aoMudar(); } }, 'Sortear tradição'),
      el('button', { type: 'button', onclick: () => abrirEditor(aoMudar) }, 'Desenhar símbolos…'),
      el('button', { type: 'button', onclick: () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify({ estilo: estado.estilo, simbolos: estado.simbolos })], { type: 'application/json' }));
        el('a', { href: url, download: `tradicao-${estado.estilo.seed}.json` }).click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } }, 'Exportar tradição'),
      el('button', { type: 'button', onclick: () => importar.click() }, 'Importar tradição'), importar));

    return () => {
      const lista = salvos();
      const nomes = Object.keys(lista);
      const atual = estado.personagem.nome;
      pers.replaceChildren(...[...new Set([atual, ...nomes])].map((n) => new Option(n, n)));
      pers.value = atual;
      const vs = Object.keys(estado.personagem.variacoes ?? {});
      vari.replaceChildren(new Option('mão base', ''), ...vs.map((v) => new Option(v, v)));
      vari.value = estado.variacao;
      ctrls.forEach((c) => c.atualizar());
    };
  }

  // ---------- editor de símbolos (letras do alfabeto e sigilo da magia atual) ----------
  function abrirEditor(aoMudar) {
    const dlg = $('editor');
    const magia = estado.selecionadas[estado.atual];
    const alvo = el('select', {},
      ...(magia ? [new Option(`Sigilo: ${magia.nome}`, 'sigilo')] : []),
      ...[...LETRAS].map((ch) => new Option(`Letra ${ch.toUpperCase()}`, ch)));
    const NS = 'http://www.w3.org/2000/svg';
    const tela = document.createElementNS(NS, 'svg');
    tela.classList.add('tela');
    const estadoEd = el('span');
    let tracos = [], ehSigilo = false, desenhando = null;

    // Letras vivem em unidades da fonte com y para cima; na tela o y desce.
    const paraTela = ([x, y]) => (ehSigilo ? [x, y] : [x, CAIXA.altura - y]);
    const daTela = paraTela; // a mesma conta desfaz a inversão
    const gerado = () => (ehSigilo ? sigilo(magia, estado.estilo.seed) : gerarAlfabeto(estado.estilo).glifos[alvo.value].tracos);
    const salvo = () => (ehSigilo ? estado.simbolos.sigilos[magia.id] : estado.simbolos.letras[alvo.value]);

    const desenhar = () => {
      const guia = ehSigilo
        ? '<circle cx="0" cy="0" r="1" class="guia"/><circle cx="0" cy="0" r="0.02" class="guia"/>'
        : `<rect x="0" y="0" width="${CAIXA.largura}" height="${CAIXA.altura}" class="guia"/>`;
      tela.setAttribute('viewBox', ehSigilo ? '-1.1 -1.1 2.2 2.2' : `-80 -80 ${CAIXA.largura + 160} ${CAIXA.altura + 160}`);
      tela.innerHTML = guia + tracos.map((t) => `<polyline points="${t.map((p) => paraTela(p).join(',')).join(' ')}"/>`).join('');
      tela.style.setProperty('--traco', ehSigilo ? '0.02' : '10');
      estadoEd.textContent = salvo() ? 'desenhado à mão' : 'gerado';
    };
    const carregar = () => {
      ehSigilo = alvo.value === 'sigilo';
      tracos = structuredClone(salvo() ?? gerado());
      desenhar();
    };
    const ponto = (ev) => {
      const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(tela.getScreenCTM().inverse());
      const casas = ehSigilo ? 1000 : 1;
      return daTela([p.x, p.y]).map((v) => Math.round(v * casas) / casas);
    };
    tela.addEventListener('pointerdown', (ev) => {
      tela.setPointerCapture(ev.pointerId);
      desenhando = [ponto(ev)];
      tracos.push(desenhando);
    });
    tela.addEventListener('pointermove', (ev) => {
      if (!desenhando) return;
      const p = ponto(ev), u = desenhando[desenhando.length - 1];
      if (Math.hypot(p[0] - u[0], p[1] - u[1]) < (ehSigilo ? 0.03 : 15)) return; // ignora tremidas do mouse
      desenhando.push(p);
      desenhar();
    });
    const soltar = () => {
      if (desenhando && desenhando.length < 2) tracos.pop();
      desenhando = null;
      desenhar();
    };
    tela.addEventListener('pointerup', soltar);
    tela.addEventListener('pointercancel', soltar);
    alvo.addEventListener('change', carregar);

    const gravar = () => {
      if (ehSigilo) estado.simbolos.sigilos[magia.id] = tracos; else estado.simbolos.letras[alvo.value] = tracos;
      tracos = structuredClone(tracos);
      desenhar();
      aoMudar();
    };
    const reverter = () => {
      if (ehSigilo) delete estado.simbolos.sigilos[magia.id]; else delete estado.simbolos.letras[alvo.value];
      carregar();
      aoMudar();
    };
    dlg.replaceChildren(
      el('div', { className: 'linha-botoes' }, alvo, estadoEd),
      tela,
      el('p', {}, 'Arraste para desenhar. Cada arrastada é um traço da caneta.'),
      el('div', { className: 'linha-botoes' },
        el('button', { type: 'button', onclick: () => { tracos.pop(); desenhar(); } }, 'Desfazer traço'),
        el('button', { type: 'button', onclick: () => { tracos = []; desenhar(); } }, 'Limpar'),
        el('button', { type: 'button', onclick: gravar }, 'Salvar símbolo'),
        el('button', { type: 'button', onclick: reverter }, 'Voltar ao gerado'),
        el('button', { type: 'button', onclick: () => dlg.close() }, 'Fechar')));
    carregar();
    dlg.showModal();
  }

  let primeira = true;
  async function entrar(oficina) {
    estado.oficina = oficina;
    estado.cfg.porPagina = oficina === 'scroll';
    if (!primeira) return;
    primeira = false;
    try {
      const r = await fetch('dados/magias.json');
      if (r.ok) estado.magias = await r.json();
    } catch { /* sem dados locais: o painel oferece importar */ }
    try { await garantirFontes(); } catch (e) { $('erro').textContent = `Erro ao carregar: ${e.message}`; }
  }

  function compor() {
    estado.pagina = folha(estado.folhaNome, estado.paisagem, estado.margem);
    let r;
    try {
      r = comporGrimorio(estado.selecionadas, contexto(), { ...estado.cfg, papel: estado.pagina });
      $('erro').textContent = '';
    } catch (e) {
      $('erro').textContent = `Erro ao compor: ${e.message}`;
      return { paginas: [[]], avisos: [] };
    }
    estado.resultado = r;
    salvar();
    const linhas = estado.selecionadas.map((m) => {
      const modo = r.modos[m.id];
      return `${m.nome}: ${modo.completo ? 'texto completo' : 'resumo'}, letra de ${modo.tamanho} mm`;
    });
    return { ...r, avisos: [...linhas, ...r.avisos.map((a) => 'Aviso: ' + a)] };
  }

  const grupo = (titulo, painel, extra) => ({ titulo, ...extra, montar: (raiz, _estado, aoMudar) => painel(raiz, aoMudar) });
  return {
    estado,
    grupos: [
      grupo('Magias', painelMagias),
      grupo('Editar magia', painelEditar),
      grupo('Folha', painelFolha),
      grupo('Escrita', painelEscrita),
      { titulo: 'Máquina', nivel: 'avancado', montar: pExportar.montar },
    ],
    entrar,
    compor,
    barra: pExportar.montarBarra,
  };
}
