import './tema.css';
import { parseFonte, FONTES } from '../fonte.js';
import { PERFIS, mesclarPerfil } from '../maquina/perfis.js';
import { papel, deTracos } from '../materiais/documento.js';
import { novoPersonagem } from '../personagem.js';
import { EXEMPLOS, trocarExemplo } from '../materiais/exemplos.js';
import { AJUDA } from '../ajuda.js';
import { dica } from './controle.js';
import { desenhar, listar } from './previa.js';
import * as pPersonagem from './personagem.js';
import * as pFontes from './fontes.js';
import * as pTexto from './texto.js';
import * as pExportar from './exportar.js';
import { criar as criarGrimorio } from './grimorio.js';
import * as pMat from './materiais.js';
import { montar as montarMesa, desenharMesa } from './mesa.js';
import { montar as montarInicio } from './inicio.js';
import { montar as montarPersonagens } from './personagens.js';

const OFICINAS = { carta: 'escrita', livro: 'escrita', magias: 'grimorio', sigilos: 'sigilos' };
const ANTIGAS = { scroll: true, grimorio: false }; // rota antiga → porPagina em #magias
const PAGINAS = { inicio: montarInicio, personagens: montarPersonagens };
const NOMES = { inicio: 'Início', personagens: 'Personagens', carta: 'Carta', magias: 'Magias', livro: 'Livro', sigilos: 'Sigilos' };
const VAZIO = { magias: 'Escolha uma magia na lista.', carta: 'Escreva o texto no painel Texto.', livro: 'Escreva o texto no painel Texto.', sigilos: 'Escreva as frases no painel.' };
const COMPARTILHADAS = ['fontes', 'nomesFontes', 'personagem', 'perfilNome', 'perfil', 'otimizar', 'trajeto', 'mesa'];
const $ = (id) => document.getElementById(id);

const lerJSON = (chave) => { try { return JSON.parse(localStorage.getItem(chave)); } catch { return null; } };
const ui = lerJSON('writer.ui') ?? {};
const salvarUi = () => { try { localStorage.setItem('writer.ui', JSON.stringify(ui)); } catch { /* sem storage: segue */ } };

async function baixar(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`não foi possível carregar ${url} (HTTP ${r.status})`);
  return r;
}

// ---- instâncias ----
function criarEscrita() {
  const estado = {
    fontes: {}, nomesFontes: FONTES, personagem: novoPersonagem(), variacao: 'normal', comparar: false, variacaoB: 'normal',
    texto: EXEMPLOS.anotacao, exemplo: 'anotacao',
    paginaNome: 'A5', pagina: papel('A5'), opcoes: { tamanho: 6, entrelinha: 1.6, alinhamento: 'esquerda', colunas: 1 },
    perfil: structuredClone(PERFIS.megaS), perfilNome: 'megaS', otimizar: true, trajeto: false, paginaAtual: 0,
    carta: pMat.carta0(), livro: pMat.livro0(),
  };
  try { pPersonagem.restaurar(estado); } catch { /* usa personagem novo */ }
  const salvo = lerJSON('writer.perfil');
  if (salvo && typeof salvo === 'object') { estado.perfil = mesclarPerfil(salvo); estado.perfilNome = 'personalizado'; }
  return {
    estado,
    grupos: [
      { titulo: 'Personagem', montar: pPersonagem.montar },
      { titulo: 'Texto', fechado: true, montar: pTexto.montar },
      { titulo: 'Notas', so: 'carta', aberto: true, montar: pMat.montarCarta },
      { titulo: 'Fontes', aberto: true, montar: pFontes.montar },
      { titulo: 'Livro', so: 'livro', aberto: true, montar: pMat.montarLivro },
      { titulo: 'Papel e aparência', montar: pTexto.montarPapel },
      { titulo: 'Máquina', nivel: 'avancado', montar: pExportar.montar },
    ],
    entrar(oficina) {
      estado.opcoes.colunas = oficina === 'livro' ? (estado.colunasLivro ?? 2) : 1;
      const tipo = oficina === 'livro' ? 'livro' : estado.carta.tipo;
      estado.texto = trocarExemplo(estado.texto, estado.exemplo, tipo);
      estado.exemplo = tipo;
    },
    compor: () => pMat.comporEscrita(estado, estado.variacao),
    composB: () => pMat.comporEscrita(estado, estado.variacaoB),
    barra: pExportar.montarBarra,
  };
}

function criarSigilos() {
  const estado = {
    papelNome: 'A6', paisagem: false, largura: 148, altura: 210, estilo: { seed: 1, curva: 0.4, complexidade: 0.5 }, sig: pMat.sigilos0(),
    personagem: novoPersonagem(), fontes: {}, perfil: structuredClone(PERFIS.megaS), perfilNome: 'megaS', otimizar: true, trajeto: false, paginaAtual: 0,
  };
  try { pPersonagem.restaurar(estado); } catch { /* usa personagem novo */ }
  const salvo = lerJSON('writer.perfil');
  if (salvo && typeof salvo === 'object') { estado.perfil = mesclarPerfil(salvo); estado.perfilNome = 'personalizado'; }
  estado.pagina = papel('A6');
  return {
    estado,
    grupos: [
      { titulo: 'Folha', montar: pMat.montarFolha },
      { titulo: 'Sigilos', montar: pMat.montarSigilos },
      { titulo: 'Tradição', montar: pMat.montarTradicao },
      { titulo: 'Máquina', nivel: 'avancado', montar: pExportar.montar },
    ],
    entrar() {},
    compor: () => pMat.comporDeSigilos(estado),
    barra: pExportar.montarBarra,
  };
}

const FABRICAS = { escrita: criarEscrita, grimorio: criarGrimorio, sigilos: criarSigilos };
const insts = {}; // nome → instância
const vistas = new Map(); // instância → { detalhes, barra, atualizar: [] }
let atual = null, fontesCarregadas = null, ticket = 0, vindoDePagina = false, porPaginaPedido = null;
const paginasAtualizar = {}; // id → atualizar() da página, montada uma vez

// ---- render ----
function renderizar() {
  const inst = atual;
  if (!inst) return;
  const e = inst.estado, escrita = inst.composB && ['carta', 'livro'].includes(e.oficina);
  let r, rB = null;
  try {
    r = inst.compor();
    if (escrita && e.comparar) rB = inst.composB();
    $('erro').textContent = '';
  } catch (err) {
    $('erro').textContent = `Erro: ${err.message}`;
    return;
  }
  const emDoc = (x) => (x.paginas[0]?.camadas ? x : deTracos(x.paginas.length ? x.paginas : [[]], e.pagina, { avisos: x.avisos }));
  e.doc = emDoc(r);
  const docB = rB && emDoc(rB);

  const total = Math.max(1, r.paginas.length, rB?.paginas.length ?? 0);
  e.paginaAtual = Math.min(Math.max(0, e.paginaAtual), total - 1);
  $('pag-info').textContent = `Página ${e.paginaAtual + 1} de ${total}`;
  $('pag-ant').disabled = e.paginaAtual <= 0;
  $('pag-prox').disabled = e.paginaAtual >= total - 1;

  const opc = { pagina: e.paginaAtual, trajeto: e.trajeto, otimizar: e.otimizar };
  const mesa = ui.vista === 'mesa';
  document.querySelector('.paginas').hidden = mesa;
  $('vista-pagina').setAttribute('aria-pressed', String(!mesa));
  $('vista-mesa').setAttribute('aria-pressed', String(mesa));
  if (mesa) desenharMesa($('previa'), e); else desenhar($('previa'), e.doc, opc);
  if (!mesa && e.doc.paginas.every((p) => p.camadas.every((c) => !c.tracos.length))) $('previa').insertAdjacentHTML('beforeend', `<p class="vazio">${VAZIO[e.oficina] ?? 'Nada para desenhar ainda.'}</p>`);
  $('rotulo-a').hidden = !escrita;
  $('rotulo-a').textContent = escrita ? `Variação: ${e.variacao || 'mão base'}` : '';
  $('previa-b-bloco').hidden = !docB || mesa;
  $('previas').classList.toggle('comparando', !!docB);
  if (docB && !mesa) {
    desenhar($('previa-b'), docB, opc);
    $('rotulo-b').textContent = `Variação: ${e.variacaoB || 'mão base'}`;
  }

  const chaves = Object.keys(e.personagem?.variacoes ?? {});
  if (escrita) {
    if (!chaves.includes(e.variacaoB)) e.variacaoB = chaves.find((k) => k !== e.variacao) ?? chaves[0] ?? '';
    const selB = $('variacao-b'), assinatura = chaves.join('|');
    if (selB.dataset.chaves !== assinatura) { selB.replaceChildren(...chaves.map((k) => new Option(k, k))); selB.dataset.chaves = assinatura; }
    selB.value = e.variacaoB;
  }
  $('variacao-b').hidden = !docB;

  const sem = (a) => !String(a).startsWith('tolerancia de limites');
  listar($('avisos'), [...r.avisos.filter(sem), ...(rB ? rB.avisos.filter(sem).map((a) => `B: ${a}`) : [])]);
  const v = vistas.get(inst);
  v.atualizar.forEach((f) => f());
  v.atualizarBarra();
}

let agendado = false;
function aoMudar() {
  if (agendado) return;
  agendado = true;
  requestAnimationFrame(() => { agendado = false; renderizar(); });
}

// ---- roteamento ----
function montarVista(inst) {
  const v = { detalhes: [], atualizar: [], barra: document.createElement('div') };
  inst.grupos.flatMap((g) => (g.titulo === 'Máquina' ? [g, { titulo: 'Mesa e folha', nivel: 'basico', montar: montarMesa }] : [g])).forEach((g, i) => {
    const d = document.createElement('details'), s = document.createElement('summary'), corpo = document.createElement('div');
    s.textContent = g.titulo;
    d.append(s, corpo);
    d.open = (i < 2 && !g.fechado) || !!g.aberto;
    if (g.nivel === 'avancado') d.dataset.nivel = 'avancado';
    if (g.so) d.dataset.so = g.so;
    $('grupos').append(d);
    v.detalhes.push(d);
    v.atualizar.push(g.montar(corpo, inst.estado, aoMudar));
  });
  $('exportar').append(v.barra);
  v.atualizarBarra = inst.barra(v.barra, inst.estado, aoMudar);
  vistas.set(inst, v);
}

async function rotear() {
  if (!fontesCarregadas) return;
  const id = location.hash.slice(1), minha = ++ticket;
  if (id in ANTIGAS) { porPaginaPedido = ANTIGAS[id]; location.replace('#magias'); return; }
  if (!OFICINAS[id] && !PAGINAS[id]) { location.replace('#inicio'); return; }
  const marcar = () => {
    document.querySelectorAll('nav.oficinas a').forEach((a) => (a.getAttribute('href') === '#' + id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    document.title = `Scriptorium — ${NOMES[id]}`;
  };
  document.querySelector('main').hidden = !!PAGINAS[id];
  for (const p in PAGINAS) $('vista-' + p).hidden = p !== id;
  if (PAGINAS[id]) {
    paginasAtualizar[id] ??= PAGINAS[id]($('vista-' + id), { fontes: fontesCarregadas });
    paginasAtualizar[id]();
    marcar();
    vindoDePagina = true;
    return;
  }
  const nome = OFICINAS[id];
  const inst = insts[nome] ??= FABRICAS[nome]();
  if (atual && atual !== inst) for (const c of COMPARTILHADAS) if (c in atual.estado) inst.estado[c] = atual.estado[c]; // ponytail: cópia na troca; store único se duas oficinas ficarem visíveis juntas
  if (vindoDePagina) { try { pPersonagem.restaurar(inst.estado); } catch { /* mantém o personagem atual */ } vindoDePagina = false; }
  if (!atual) { inst.estado.fontes = fontesCarregadas; inst.estado.nomesFontes = FONTES; }
  inst.estado.oficina = id;
  if (porPaginaPedido != null && inst.estado.cfg) { inst.estado.cfg.porPagina = porPaginaPedido; porPaginaPedido = null; }
  await inst.entrar(id);
  if (minha !== ticket) return;
  if (!vistas.has(inst)) montarVista(inst);
  for (const [i, v] of vistas) {
    v.barra.hidden = i !== inst;
    v.detalhes.forEach((d) => { d.hidden = i !== inst || (!!d.dataset.so && d.dataset.so !== id); });
  }
  atual = inst;
  marcar();
  $('rotulo-comparar').hidden = nome !== 'escrita';
  inst.estado.paginaAtual = 0;
  if (nome !== 'escrita') inst.estado.comparar = false;
  $('comparar').checked = !!inst.estado.comparar;
  renderizar();
}

for (const v of ['pagina', 'mesa']) $('vista-' + v).addEventListener('click', () => { ui.vista = v; salvarUi(); aoMudar(); });

// ---- nível e tema ----
const temaEfetivo = () => document.documentElement.dataset.tema ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'vela' : 'claro');
function pintarTema() {
  const vela = temaEfetivo() === 'vela';
  $('tema').textContent = vela ? 'Claro' : 'Vela';
  $('tema').setAttribute('aria-label', `Mudar para tema ${vela ? 'claro' : 'vela'}`);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', vela ? '#1e1812' : '#f4ecd8');
}
if (ui.tema) document.documentElement.dataset.tema = ui.tema;
document.body.dataset.nivel = ui.nivel === 'avancado' ? 'avancado' : 'basico';
document.querySelector(`input[name=nivel][value=${document.body.dataset.nivel}]`).checked = true;
pintarTema();
$('tema').addEventListener('click', () => {
  ui.tema = temaEfetivo() === 'vela' ? 'claro' : 'vela';
  document.documentElement.dataset.tema = ui.tema;
  pintarTema();
  salvarUi();
});
document.querySelectorAll('input[name=nivel]').forEach((i) => i.addEventListener('change', () => {
  if (!i.checked) return;
  document.body.dataset.nivel = ui.nivel = i.value;
  salvarUi();
}));

$('rotulo-comparar').append(' ', dica(AJUDA.comparar, 'comparar'));
$('comparar').addEventListener('change', (ev) => { atual.estado.comparar = ev.target.checked; aoMudar(); });
$('variacao-b').addEventListener('change', (ev) => { atual.estado.variacaoB = ev.target.value; aoMudar(); });
$('pag-ant').addEventListener('click', () => { atual.estado.paginaAtual -= 1; aoMudar(); });
$('pag-prox').addEventListener('click', () => { atual.estado.paginaAtual += 1; aoMudar(); });
window.addEventListener('hashchange', rotear);

(async () => {
  try {
    const lidas = await Promise.all(FONTES.map(async (nome) => parseFonte(await (await baixar(`fontes/${nome}.svg`)).text(), nome)));
    fontesCarregadas = Object.fromEntries(FONTES.map((nome, i) => [nome, lidas[i]]));
  } catch (e) {
    $('erro').textContent = `Erro ao carregar: ${e.message}`;
    return;
  }
  await rotear();
})();
