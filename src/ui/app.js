import './tema.css';
import { parseFonte, FONTES } from '../fonte.js';
import { compor } from '../layout.js';
import { PERFIS, mesclarPerfil } from '../maquina/perfis.js';
import { papel, deTracos, PARAMS as PARAMS_DOC } from '../materiais/documento.js';
import { resolver, novoPersonagem } from '../personagem.js';
import { magiaVazia } from '../magia.js';
import { sigilo, moldura, PARAMS as PARAMS_ALF } from '../arcano/alfabeto.js';
import { AJUDA } from '../ajuda.js';
import { controle, ligar, dica } from './controle.js';
import { desenhar, listar } from './previa.js';
import * as pPersonagem from './personagem.js';
import * as pFontes from './fontes.js';
import * as pTexto from './texto.js';
import * as pExportar from './exportar.js';
import { criar as criarGrimorio } from './grimorio.js';

const OFICINAS = { carta: 'escrita', livro: 'escrita', scroll: 'grimorio', grimorio: 'grimorio', sigilos: 'sigilos' };
const NOMES = { carta: 'Carta', scroll: 'Scroll', grimorio: 'Grimório', livro: 'Livro', sigilos: 'Sigilos' };
const COMPARTILHADAS = ['fontes', 'nomesFontes', 'personagem', 'variacao', 'perfilNome', 'perfil', 'otimizar', 'trajeto'];
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
    texto: 'Caro viajante,\n\nA neblina cobre Barovia e o castelo espera por você. Venha antes do pôr do sol.',
    paginaNome: 'A5', pagina: papel('A5'), opcoes: { tamanho: 6, entrelinha: 1.6, alinhamento: 'esquerda', colunas: 1 },
    perfil: structuredClone(PERFIS.megaS), perfilNome: 'megaS', otimizar: true, trajeto: false, paginaAtual: 0,
  };
  try { pPersonagem.restaurar(estado); } catch { /* usa personagem novo */ }
  const salvo = lerJSON('writer.perfil');
  if (salvo && typeof salvo === 'object') { estado.perfil = mesclarPerfil(salvo); estado.perfilNome = 'personalizado'; }
  const comVariacao = (v) => compor(estado.texto, estado.fontes, resolver(estado.personagem, v || null), estado.pagina, estado.opcoes);
  return {
    estado,
    grupos: [
      { titulo: 'Personagem', montar: pPersonagem.montar },
      { titulo: 'Fontes', montar: pFontes.montar },
      { titulo: 'Texto', montar: pTexto.montar },
      { titulo: 'Papel e aparência', montar: pTexto.montarPapel },
      { titulo: 'Máquina', nivel: 'avancado', montar: pExportar.montar },
    ],
    entrar(oficina) { estado.opcoes.colunas = oficina === 'livro' ? (estado.colunasLivro ?? 2) : 1; },
    compor: () => comVariacao(estado.variacao),
    composB: () => comVariacao(estado.variacaoB),
    barra: pExportar.montarBarra,
  };
}

function criarSigilos() {
  const estado = { papelNome: 'A6', paisagem: false, estilo: { seed: 1, curva: 0.4, complexidade: 0.5 }, perfil: structuredClone(PERFIS.megaS) };
  const exemplo = { ...magiaVazia(), id: 'exemplo', nivel: 3, escola: 'V', comp: 'V, S, M' };
  const P = Object.fromEntries([...PARAMS_DOC, ...PARAMS_ALF].map((p) => [p.chave, p]));
  const ctx = () => ({ papel: estado.pagina, perfil: estado.perfil, estilo: estado.estilo, magia: exemplo });
  const grupo = (titulo, itens) => ({
    titulo,
    montar(div, _e, aoMudar) {
      const cs = itens.map(([chave, est]) => controle(P[chave], est, aoMudar));
      div.append(...cs.map((c) => c.el));
      return () => cs.forEach((c) => c.atualizar());
    },
  });
  estado.pagina = papel('A6');
  return {
    estado,
    grupos: [
      grupo('Folha', [
        ['papel', { ler: () => estado.papelNome, gravar: (v) => { estado.papelNome = v; }, ctx }],
        ['paisagem', ligar(estado, 'paisagem', ctx)],
      ]),
      grupo('Tradição', ['seed', 'curva', 'complexidade'].map((c) => [c, ligar(estado.estilo, c, ctx)])),
    ],
    entrar() {},
    compor() {
      const p = estado.pagina = papel(estado.papelNome, { paisagem: estado.paisagem, largura: 148, altura: 210 });
      const { topo, dir, base, esq } = p.margens;
      const r = Math.min(p.largura - esq - dir, p.altura - topo - base) * 0.35;
      const cx = esq + (p.largura - esq - dir) / 2, cy = topo + (p.altura - topo - base) / 2;
      const s = sigilo(exemplo, estado.estilo.seed).map((t) => t.map(([x, y]) => [cx + x * r, cy + y * r]));
      return { paginas: [[...moldura(p), ...s]], avisos: ['Em breve: esta oficina ainda está em construção.'] };
    },
    barra: pExportar.montarBarra,
  };
}

const FABRICAS = { escrita: criarEscrita, grimorio: criarGrimorio, sigilos: criarSigilos };
const insts = {}; // nome → instância
const vistas = new Map(); // instância → { detalhes, barra, atualizar: [] }
let atual = null, fontesCarregadas = null, ticket = 0;

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
  e.doc = deTracos(r.paginas.length ? r.paginas : [[]], e.pagina, { avisos: r.avisos });
  const docB = rB && deTracos(rB.paginas, e.pagina, { avisos: rB.avisos });

  const total = Math.max(1, r.paginas.length, rB?.paginas.length ?? 0);
  e.paginaAtual = Math.min(Math.max(0, e.paginaAtual), total - 1);
  $('pag-info').textContent = `Página ${e.paginaAtual + 1} de ${total}`;
  $('pag-ant').disabled = e.paginaAtual <= 0;
  $('pag-prox').disabled = e.paginaAtual >= total - 1;

  const opc = { pagina: e.paginaAtual, trajeto: e.trajeto, otimizar: e.otimizar };
  desenhar($('previa'), e.doc, opc);
  $('rotulo-a').hidden = !escrita;
  $('rotulo-a').textContent = escrita ? `Variação: ${e.variacao || 'mão base'}` : '';
  $('previa-b-bloco').hidden = !docB;
  $('previas').classList.toggle('comparando', !!docB);
  if (docB) {
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
  inst.grupos.forEach((g, i) => {
    const d = document.createElement('details'), s = document.createElement('summary'), corpo = document.createElement('div');
    s.textContent = g.titulo;
    d.append(s, corpo);
    d.open = i < 2;
    if (g.nivel === 'avancado') d.dataset.nivel = 'avancado';
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
  if (!OFICINAS[id]) { location.replace('#carta'); return; }
  const nome = OFICINAS[id];
  const inst = insts[nome] ??= FABRICAS[nome]();
  if (atual && atual !== inst) for (const c of COMPARTILHADAS) if (c in atual.estado) inst.estado[c] = atual.estado[c]; // ponytail: cópia na troca; store único se duas oficinas ficarem visíveis juntas
  if (!atual) { inst.estado.fontes = fontesCarregadas; inst.estado.nomesFontes = FONTES; }
  inst.estado.oficina = id;
  await inst.entrar(id);
  if (minha !== ticket) return;
  if (!vistas.has(inst)) montarVista(inst);
  for (const [i, v] of vistas) {
    v.barra.hidden = i !== inst;
    v.detalhes.forEach((d) => { d.hidden = i !== inst; });
  }
  atual = inst;
  document.querySelectorAll('nav.oficinas a').forEach((a) => (a.getAttribute('href') === '#' + id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.title = `Scriptorium — ${NOMES[id]}`;
  $('rotulo-comparar').hidden = nome !== 'escrita';
  inst.estado.paginaAtual = 0;
  if (nome !== 'escrita') inst.estado.comparar = false;
  $('comparar').checked = !!inst.estado.comparar;
  renderizar();
}

// ---- nível e tema ----
const temaEfetivo = () => document.documentElement.dataset.tema ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'vela' : 'claro');
function pintarTema() {
  const vela = temaEfetivo() === 'vela';
  $('tema').textContent = vela ? 'Claro' : 'Vela';
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

$('rotulo-comparar').append(' ', dica(AJUDA.comparar));
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
