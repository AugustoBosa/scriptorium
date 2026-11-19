import { PARAMS as PARAMS_DOC, PAPEIS, papel } from '../materiais/documento.js';
import { PARAMS as PARAMS_LAYOUT, amostra } from '../layout.js';
import { resolver } from '../personagem.js';
import { AJUDA, rotulo } from '../ajuda.js';
import { controle, dica, ligar } from './controle.js';

const PD = Object.fromEntries(PARAMS_DOC.map((p) => [p.chave, p]));
const PL = Object.fromEntries(PARAMS_LAYOUT.map((p) => [p.chave, p]));
const MARGENS = ['margemTopo', 'margemDir', 'margemBase', 'margemEsq'];
const LADOS = { margemTopo: 'topo', margemDir: 'dir', margemBase: 'base', margemEsq: 'esq' };

const ctxDe = (estado) => () => ({
  fontes: estado.fontes,
  mao: resolver(estado.personagem, estado.variacao || null),
  escrever: (m, t, o) => amostra(estado.fontes, m, t, o),
  papel: estado.pagina,
  perfil: estado.perfil,
});

function titulo(texto, dicaTexto) {
  const h = document.createElement('h3');
  h.append(texto);
  if (dicaTexto) h.append(' ', dica(dicaTexto, texto));
  return h;
}

export function montar(elemento, estado, aoMudar) {
  const textarea = document.createElement('textarea');
  textarea.rows = 8;
  textarea.addEventListener('input', () => {
    estado.texto = textarea.value;
    aoMudar();
  });

  const arquivo = document.createElement('input');
  arquivo.type = 'file';
  arquivo.accept = '.txt,text/plain';
  arquivo.addEventListener('change', async () => {
    const f = arquivo.files[0];
    arquivo.value = '';
    const erro = document.getElementById('erro');
    if (!f) return;
    if (f.size > 200_000) { erro.textContent = 'Arquivo grande demais (máximo 200 KB).'; return; }
    erro.textContent = '';
    estado.texto = await f.text();
    aoMudar();
  });
  arquivo.id = 'importar-txt';
  const rotuloArquivo = document.createElement('div');
  rotuloArquivo.className = 'linha-campo';
  const lab = document.createElement('label');
  lab.htmlFor = arquivo.id;
  lab.append(rotulo('importarTxt'));
  rotuloArquivo.append(lab, ' ', dica(AJUDA.importarTxt, 'Importar .txt'));

  elemento.replaceChildren(titulo('Texto', AJUDA.texto), textarea, rotuloArquivo, arquivo);

  return function atualizar() {
    if (textarea.value !== estado.texto) textarea.value = estado.texto;
  };
}

// Constrói o Papel a partir da configuração: papel() e depois as 4 margens individuais.
export function construir(cfg) {
  const p = papel(cfg.papel, { paisagem: cfg.paisagem, margem: cfg.margem, largura: cfg.largura, altura: cfg.altura });
  for (const k of MARGENS) p.margens[LADOS[k]] = cfg[k];
  return p;
}

function cfgInicial(estado) {
  const { largura, altura, margens: m } = estado.pagina;
  const nome = estado.paginaNome;
  const ehPadrao = Object.hasOwn(PAPEIS, nome);
  const [l, a] = ehPadrao ? PAPEIS[nome] : [largura, altura];
  return {
    papel: ehPadrao ? nome : 'personalizado',
    paisagem: ehPadrao && largura > altura,
    largura: l, altura: a, margem: m.topo,
    margemTopo: m.topo, margemDir: m.dir, margemBase: m.base, margemEsq: m.esq,
  };
}

export const montarSoPapel = (elemento, estado, aoMudar) => montarPapel(elemento, estado, aoMudar, { aparencia: false });

export function montarPapel(elemento, estado, aoMudar, { aparencia: comAparencia = true } = {}) {
  estado.papelCfg ??= cfgInicial(estado);
  const cfg = estado.papelCfg;
  const ctx = ctxDe(estado);

  const recalcular = () => {
    estado.pagina = construir(cfg);
    estado.paginaNome = cfg.papel;
  };

  const gravar = (chave) => (v) => {
    cfg[chave] = v;
    if (chave === 'papel') {
      if (v !== 'personalizado') {
        [cfg.largura, cfg.altura] = PAPEIS[v];
        cfg.margem = PAPEIS[v][2];
        for (const k of MARGENS) cfg[k] = cfg.margem;
      }
      estado.paginaAtual = 0;
    } else if (chave === 'margem') {
      for (const k of MARGENS) cfg[k] = v;
    }
    recalcular();
  };

  const ctrl = (def, ler, gr) => controle(def, { ler, gravar: gr, ctx }, aoMudar);
  const doCfg = (def) => ctrl(def, () => cfg[def.chave], gravar(def.chave));
  const dasOpcoes = (def) => controle(def, ligar(estado.opcoes, def.chave, ctx), aoMudar);

  const controles = ['papel', 'paisagem', 'largura', 'altura', 'margem', ...MARGENS].map((c) => doCfg(PD[c]));
  const [, , cLargura, cAltura] = controles;
  const cColunas = comAparencia && ctrl(PL.colunas, () => estado.opcoes.colunas, (v) => {
    estado.opcoes.colunas = v;
    if (estado.oficina === 'livro') estado.colunasLivro = v;
  });
  const aparencia = comAparencia ? [dasOpcoes(PL.tamanho), dasOpcoes(PL.entrelinha), dasOpcoes(PL.alinhamento), cColunas] : [];

  elemento.replaceChildren(
    ...(comAparencia ? [titulo('Papel')] : []), ...controles.map((c) => c.el),
    ...(comAparencia ? [titulo('Aparência'), ...aparencia.map((c) => c.el)] : []),
  );

  return function atualizar() {
    for (const c of [...controles, ...aparencia]) c.atualizar();
    cLargura.el.hidden = cAltura.el.hidden = cfg.papel !== 'personalizado';
    if (cColunas) cColunas.el.hidden = estado.oficina === 'carta';
  };
}
