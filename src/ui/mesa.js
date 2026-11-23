// Painel "Mesa e folha" + simulação da mesa (folha, slots, passadas). Imposição: src/maquina/imposicao.js.
import './mesa.css';
import { gcodeDocumento } from '../maquina/gcode.js';
import { otimizar } from '../maquina/otimizar.js';
import { impor, paraMesa, aPassada, instrucao } from '../maquina/imposicao.js';
import { PAPEIS, papel } from '../materiais/documento.js';
import { janelaDe } from '../maquina/perfis.js';
import { controle } from './controle.js';
import { el, baixar } from './util.js';

const CHAVE = 'writer.mesa';
const PADRAO = { ligada: false, folha: 'A4', paisagem: false, largura: 210, altura: 297, canto: 'auto', encosto: 'auto', dx: 0, dy: 0, modo: 'agrupar', espaco: 0, origem: 'frente-esquerda' };
const NS = 'http://www.w3.org/2000/svg';
const op = (o) => Object.entries(o).map(([valor, rotulo]) => ({ valor, rotulo }));
const sv = (tag, a = {}, pai) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); pai?.append(e); return e; };

const BASICO = ['ligada', 'folha', 'paisagem', 'largura', 'altura', 'modo'];
const DEFS = [
  { chave: 'ligada', rotulo: 'imposição na mesa', tipo: 'marca', ajuda: 'Liga a imposição: várias páginas numa folha maior, plotada em passadas. Desligada, cada página sai como sempre.' },
  { chave: 'folha', rotulo: 'folha', tipo: 'opcao', opcoes: op({ ...Object.fromEntries(Object.keys(PAPEIS).map((n) => [n, n])), personalizado: 'personalizado' }), ajuda: 'Tamanho da folha física que você prende na mesa.' },
  { chave: 'paisagem', rotulo: 'folha deitada', tipo: 'marca', ajuda: 'Deita a folha: fica mais larga que alta.' },
  { chave: 'largura', rotulo: 'largura da folha', tipo: 'numero', min: 20, max: 1000, passo: 1, unidade: 'mm', ajuda: 'Largura da folha personalizada.' },
  { chave: 'altura', rotulo: 'altura da folha', tipo: 'numero', min: 20, max: 1000, passo: 1, unidade: 'mm', ajuda: 'Altura da folha personalizada.' },
  { chave: 'canto', rotulo: 'canto de referência', tipo: 'opcao', opcoes: op({ auto: 'automático', x0y0: 'frente-esquerda', x1y0: 'frente-direita', x0y1: 'trás-esquerda', x1y1: 'trás-direita' }), ajuda: 'Canto da janela da máquina onde a folha encosta (ou de onde você mede). Automático: o canto mais próximo da janela.' },
  { chave: 'encosto', rotulo: 'borda que encosta', tipo: 'opcao', opcoes: op({ auto: 'automática', curta: 'curta', longa: 'longa' }), ajuda: 'Qual borda da folha você encosta na frente da mesa. Automática: o programa escolhe a que cobre mais páginas.' },
  { chave: 'dx', rotulo: 'distância horizontal', tipo: 'numero', min: 0, max: 500, passo: 0.5, unidade: 'mm', ajuda: 'Distância da borda lateral da folha ao canto de referência. 0 = encostada.' },
  { chave: 'dy', rotulo: 'distância vertical', tipo: 'numero', min: 0, max: 500, passo: 0.5, unidade: 'mm', ajuda: 'Distância da borda frontal/traseira da folha ao canto de referência. 0 = encostada.' },
  { chave: 'modo', rotulo: 'arquivos', tipo: 'opcao', opcoes: op({ agrupar: 'um por passada', pagina: 'um por página' }), ajuda: 'Um arquivo por passada (todas as páginas dela juntas) ou um arquivo por página, com a mesma folha parada.' },
  { chave: 'espaco', rotulo: 'espaço entre páginas', tipo: 'numero', min: 0, max: 50, passo: 0.5, unidade: 'mm', ajuda: 'Vão entre as páginas na folha.' },
  { chave: 'origem', rotulo: 'origem X0 Y0', tipo: 'opcao', opcoes: op({ 'frente-esquerda': 'frente-esquerda', 'frente-direita': 'frente-direita', 'tras-esquerda': 'trás-esquerda', 'tras-direita': 'trás-direita' }), ajuda: 'Canto físico da mesa onde fica X0 Y0 (só muda as palavras da instrução). Confira mandando G0 X0 Y0.' },
].map((d) => ({ nivel: BASICO.includes(d.chave) ? 'basico' : 'avancado', ...d }));

function carregar() {
  try { return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE)) }; } catch { return { ...PADRAO }; }
}
const mesaDe = (estado) => (estado.mesa ??= carregar());
const gravar = (m) => { try { localStorage.setItem(CHAVE, JSON.stringify(m)); } catch { /* vale só nesta sessão */ } };

// Subseções do painel, uma aberta por vez (acordeão nativo; nome único por oficina)
const SECOES = [['Folha', ['ligada', 'folha', 'paisagem', 'largura', 'altura']], ['Posição na mesa', ['canto', 'encosto', 'dx', 'dy', 'espaco', 'origem']], ['Arquivos', ['modo']]];
let montados = 0;

export function montar(elemento, estado, aoMudar) {
  const m = mesaDe(estado), nome = 'mesa-' + ++montados;
  const cs = DEFS.map((d) => controle(d, { ler: () => m[d.chave], gravar: (v) => { m[d.chave] = v; gravar(m); } }, aoMudar));
  elemento.replaceChildren(...SECOES.map(([titulo, chaves], i) => {
    const d = el('details', 'subsecao'), doGrupo = cs.filter((c) => chaves.includes(c.el.dataset.chave));
    d.name = nome;
    d.open = i === 0;
    if (DEFS.every((x) => !chaves.includes(x.chave) || x.nivel === 'avancado')) d.dataset.nivel = 'avancado'; // só ajustes finos: some no Básico
    d.append(el('summary', null, titulo), ...doGrupo.map((c) => c.el));
    return d;
  }));
  const atualizar = () => {
    cs.forEach((c) => { c.atualizar(); const k = c.el.dataset.chave; c.el.hidden = (k === 'largura' || k === 'altura') && m.folha !== 'personalizado'; });
  };
  atualizar();
  return atualizar;
}

const folhaDe = (m) => papel(m.folha, { paisagem: m.paisagem, largura: m.largura, altura: m.altura });

// Imposição + lista de passos (folha, passada); { erro } se não couber.
function plano(estado) {
  const m = mesaDe(estado), doc = estado.doc;
  if (!doc) return { erro: 'Sem documento.' };
  try {
    const imp = impor({ perfil: estado.perfil, folha: folhaDe(m), pagina: doc.papel, referencia: { canto: m.canto, encosto: m.encosto, dx: m.dx, dy: m.dy }, espaco: m.espaco });
    const nFolhas = Math.max(1, Math.ceil(doc.paginas.length / imp.porFolha));
    const passos = [];
    for (let f = 0; f < nFolhas; f++) imp.passadas.forEach((_, k) => passos.push({ f, k }));
    return { m, doc, estado, imp, nFolhas, passos };
  } catch (e) { return { erro: e.message }; }
}

// "N folhas · M passadas" quando a imposição está ligada e cabe; senão null
export function resumoMesa(estado) {
  if (!mesaDe(estado).ligada) return null;
  const p = plano(estado);
  return p.erro ? null : `${p.nFolhas} folha${p.nFolhas > 1 ? 's' : ''} · ${p.passos.length} passada${p.passos.length > 1 ? 's' : ''}`;
}

// Página com cada camada reordenada conforme a opção "otimizar" (sem otimizar: ordem crua, sem grupos).
export const otim = (estado, pag) => ({ ...pag, camadas: pag.camadas.map((c) => ({ ...c, tracos: otimizar(c.tracos, 0.1, { ordem: estado.otimizar ? c.ordem : 'escrita', grupos: estado.otimizar ? c.grupos : undefined }) })) });
const nomeFolha = (m) => (m.folha === 'personalizado' ? `${m.largura}×${m.altura} mm` : m.folha);
// camada escolhida na barra de exportar, se alguma página do documento a tem; senão, todas (undefined)
const camadaDe = (p) => (p.doc.paginas.some((x) => x.camadas.some((c) => c.id === p.estado.camada)) ? p.estado.camada : undefined);
const pg = (p, f, i) => f * p.imp.porFolha + i; // índice da página do slot i na folha f

const MSG_EXP = 'Perfil experimental: há traços fora da janela da máquina.';
// G-code de uma passada (só o slot `so`, se dado), com a instrução como comentário no topo; { texto, fora } (fora = 1º aviso "fora da janela").
// rapido: páginas cruas, sem 2-opt (só para conferir avisos na vista).
function gcodePassada(estado, p, f, k, so, rapido = false) {
  const { doc, imp, m } = p, cam = camadaDe(p);
  const pags = imp.slots.map((_, i) => {
    const pag = doc.paginas[pg(p, f, i)];
    if (!pag || (so != null && so !== i)) return undefined;
    const so1 = cam ? { ...pag, camadas: pag.camadas.filter((c) => c.id === cam) } : pag;
    return rapido ? so1 : otim(estado, so1);
  });
  const { pagina, papel: pp } = aPassada(pags, imp, k, estado.perfil, doc.papel);
  const g = gcodeDocumento(pagina, pp, estado.perfil, { canetas: doc.canetas });
  const texto = `; ${instrucao(imp, k, { nomeFolha: nomeFolha(m), origem: m.origem, folha: f + 1, nFolhas: p.nFolhas, pagina: so == null ? undefined : pg(p, f, so) + 1 })}\n${g.texto}`;
  return { texto, fora: g.avisos.find((a) => a.includes('fora da janela')) };
}


// arquivos de uma passada: [nome, gerar()]; um (agrupar) ou um por slot com página (pagina)
function arquivos(estado, p, f, k) {
  const cam = camadaDe(p), of = estado.oficina ?? 'escrita', sf = cam ? `-${cam}` : '';
  if (p.m.modo !== 'pagina') return [[`${of}-f${f + 1}-pa${k + 1}${sf}.gcode`, () => gcodePassada(estado, p, f, k)]];
  return p.imp.passadas[k].slots.filter((i) => p.doc.paginas[pg(p, f, i)])
    .map((i) => [`${of}-p${pg(p, f, i) + 1}-f${f + 1}-pa${k + 1}${sf}.gcode`, () => gcodePassada(estado, p, f, k, i)]);
}

// Liga a vista da mesa com imposição? (sem imposição a vista mostra a página atual na posição da exportação normal)
export const mesaLigada = (estado) => !!mesaDe(estado).ligada;

// Cores da cena física: tokens --mesa-* de tema.css, fixos nos dois temas (a mesa e o papel são objetos, não interface).
// Lidas a cada cena porque o SVG recebe a cor em atributo, onde var() não vale.
const cores = () => {
  const s = getComputedStyle(document.documentElement), v = (n) => s.getPropertyValue('--mesa-' + n).trim();
  return { tampo: v('tampo'), grade: v('grade'), borda: v('borda'), janela: v('janela'), papel: v('papel'), papelBorda: v('papel-borda'),
    outra: v('outra'), ref: v('ref'), rotulo: v('rotulo'), num: v('num') };
};

// Cena da mesa em mm de máquina (x para a direita, y para trás); o SVG inverte y. folhas = polígonos do papel;
// paginas = [{ t: página→máquina, papel, camadas, ativa, rotulo }]; canetas = cor de cada caneta.
function cena({ mx, my, j, folhas, paginas, canetas, topo, refs = [], legenda }) {
  const COR = cores();
  const pts = [[0, 0], [mx, my], ...folhas.flat()];
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const S = Math.max(mx, my) / 40, M = 3 * S; // tamanho do rótulo e margem, em mm
  const x0 = Math.min(...xs) - M, x1 = Math.max(...xs) + M, ya = Math.min(...ys) - M, yb = Math.max(...ys) + M;
  const Y = ([x, y]) => `${x.toFixed(2)} ${(my - y).toFixed(2)}`;
  const poli = (q) => 'M' + q.map(Y).join('L') + 'Z';
  const d = sv('svg', { viewBox: `${x0} ${my - yb} ${x1 - x0} ${yb - ya}`, role: 'img', 'aria-label': legenda, class: 'm-cena' });
  d.style.aspectRatio = `${x1 - x0} / ${yb - ya}`;
  const defs = sv('defs', {}, d);
  sv('path', { d: 'M0 4L4 0', stroke: COR.papelBorda, 'stroke-width': 0.5 }, sv('pattern', { id: 'm-hach', width: 4, height: 4, patternUnits: 'userSpaceOnUse' }, defs));
  sv('path', { d: 'M10 0H0V10', fill: 'none', stroke: COR.grade, 'stroke-width': 0.3 }, sv('pattern', { id: 'm-grade', width: 10, height: 10, patternUnits: 'userSpaceOnUse', x: 0, y: my % 10 }, defs));
  sv('rect', { x: 0, y: 0, width: mx, height: my }, sv('clipPath', { id: 'm-corte' }, defs));
  const texto = (txt, [x, y], { ancora = 'middle', tam = 1, cor = COR.rotulo, giro = 0, cls = '' } = {}) => {
    const t = sv('text', { class: 'm-txt ' + cls, x, y: my - y, 'text-anchor': ancora, 'font-size': (S * tam).toFixed(2), fill: cor, style: `color: ${cor}`, ...(giro && { transform: `rotate(${giro} ${x} ${my - y})` }) }, d);
    t.textContent = txt;
  };
  // tampo com grade de 1 cm e área que a caneta alcança
  sv('rect', { x: 0, y: 0, width: mx, height: my, fill: COR.tampo }, d);
  sv('rect', { x: 0, y: 0, width: mx, height: my, fill: 'url(#m-grade)' }, d);
  // papel: inteiro hachurado (o que sobra para fora da mesa) e cheio sobre a mesa
  for (const f of folhas) sv('path', { d: poli(f), fill: COR.papel, 'fill-opacity': 0.55, stroke: COR.papelBorda, 'stroke-width': 0.5, 'stroke-dasharray': '3 2' }, d);
  for (const f of folhas) sv('path', { d: poli(f), fill: 'url(#m-hach)' }, d);
  for (const f of folhas) sv('path', { d: poli(f), fill: COR.papel, stroke: COR.papelBorda, 'stroke-width': 0.6, 'clip-path': 'url(#m-corte)' }, d);
  sv('rect', { x: j.x0, y: my - j.y1, width: j.x1 - j.x0, height: j.y1 - j.y0, fill: 'none', stroke: COR.janela, 'stroke-width': 0.8, 'stroke-dasharray': '4 2.5', class: 'm-janela' }, d);
  sv('rect', { x: 0, y: 0, width: mx, height: my, fill: 'none', stroke: COR.borda, 'stroke-width': 1.5 }, d);
  // páginas: contorno, número e texto (um path por camada; tinta da caneta na passada, cinza nas outras)
  for (const pg of paginas) {
    const g = sv('g', { class: 'm-pagina', ...pg.dados }, d), { largura: w, altura: h } = pg.papel;
    sv('path', { class: 'm-slot', d: poli([[0, 0], [w, 0], [w, h], [0, h]].map(pg.t)), fill: 'none', stroke: pg.ativa ? COR.janela : COR.outra, 'stroke-width': pg.ativa ? 0.6 : 0.4, 'stroke-dasharray': pg.ativa ? '' : '2 2' }, g);
    for (const c of pg.camadas ?? []) {
      const dd = c.tracos.filter((t) => t.length > 1).map((t) => 'M' + t.map((q) => Y(pg.t(q))).join('L')).join('');
      if (dd) sv('path', { class: 'm-traco', d: dd, fill: 'none', stroke: pg.ativa ? (canetas?.[c.caneta]?.cor ?? '#000') : COR.outra, 'stroke-width': 0.35, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    }
    if (pg.rotulo) texto(pg.rotulo, pg.t(pg.vazio ? [w / 2, h / 2] : [w / 2, 2 + S * 0.8]), { ancora: 'middle', tam: 0.75, cor: pg.ativa ? COR.janela : COR.num, cls: 'm-num' });
  }
  for (const r of refs) sv('path', { d: 'M' + r.map(Y).join('L'), fill: 'none', stroke: COR.ref, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, d);
  // topo da folha: seta dentro do papel
  if (topo) {
    const [a, b] = topo;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), p = (r, s) => [b[0] - S * 0.9 * Math.cos(ang + s * r), b[1] - S * 0.9 * Math.sin(ang + s * r)];
    sv('path', { d: `M${Y(a)}L${Y(b)}M${Y(p(0.5, 1))}L${Y(b)}L${Y(p(0.5, -1))}`, fill: 'none', stroke: COR.ref, 'stroke-width': 0.9, 'stroke-linecap': 'round' }, d);
    texto('topo', [a[0] - (b[0] - a[0]) * 0.4, a[1] - (b[1] - a[1]) * 0.4 - S * 0.4], { tam: 0.8, cor: COR.ref });
  }
  // bordas da mesa e origem
  texto('TRÁS', [mx / 2, my + S * 0.6], { tam: 1.1, cls: 'm-borda' });
  texto('FRENTE (onde você fica)', [mx / 2, -S * 1.6], { tam: 1.1, cls: 'm-borda' });
  texto('ESQUERDA', [-S * 0.9, my / 2], { tam: 1.1, giro: -90, cls: 'm-borda' });
  texto('DIREITA', [mx + S * 0.9, my / 2], { tam: 1.1, giro: 90, cls: 'm-borda' });
  sv('circle', { cx: 0, cy: my, r: S * 0.35, fill: COR.ref }, d);
  texto('X0 Y0', [S * 0.6, S * 0.6], { ancora: 'start', tam: 0.8, cor: COR.ref });
  return d;
}

const ITENS_LEGENDA = [
  ['m-l-papel', 'papel'], ['m-l-tinta', 'escrito agora'], ['m-l-outra', 'escrito em outra passada'],
  ['m-l-janela', 'até onde a caneta alcança'], ['m-l-fora', 'papel fora da mesa (prenda bem)'],
];
// botão que abre a cena num diálogo do tamanho da tela (o desenho é vetorial: amplia sem perder)
const ampliar = (svg) => {
  const b = el('button', 'mesa-ampliar', 'Ampliar'); b.type = 'button';
  b.addEventListener('click', () => {
    const dlg = el('dialog', 'mesa-dialogo'), fechar = el('button', null, 'Fechar'); fechar.type = 'button';
    fechar.addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => dlg.remove());
    dlg.append(fechar, svg.cloneNode(true), legenda());
    document.body.append(dlg);
    dlg.showModal();
  });
  return b;
};
const legenda = () => { const ul = el('ul', 'mesa-legenda'); for (const [c, t] of ITENS_LEGENDA) { const li = el('li'); li.append(el('span', 'm-amostra ' + c), t); ul.append(li); } return ul; };

export function desenharMesa(elemento, estado) {
  const raiz = el('div', 'mesa');
  elemento.replaceChildren(raiz);
  elemento.style.maxWidth = ''; // `desenhar` da página deixa largura×4
  const perfil = estado.perfil, mx = perfil.mesaX, my = perfil.mesaY, doc = estado.doc;
  if (!doc) return;
  const j = janelaDe(perfil);
  if (!mesaDe(estado).ligada) {
    // sem imposição: a página atual exatamente onde a exportação normal a põe (canto X0 Y0 da janela, topo para trás)
    const i = Math.min(estado.paginaAtual ?? 0, doc.paginas.length - 1), pp = doc.papel;
    const t = ([x, y]) => [j.x0 + perfil.offsetX + x, j.y0 + perfil.offsetY + (pp.altura - y)];
    const folha = [[0, 0], [pp.largura, 0], [pp.largura, pp.altura], [0, pp.altura]].map(t);
    const svg = cena({ mx, my, j, folhas: [folha], paginas: [{ t, papel: pp, camadas: doc.paginas[i].camadas, ativa: true }], canetas: doc.canetas,
      topo: [t([pp.largura - 8, Math.min(16, pp.altura * 0.2)]), t([pp.largura - 8, 3])], legenda: 'Simulação da mesa com a página' });
    raiz.append(
      ampliar(svg),
      el('p', 'mesa-instrucao', `Ponha a folha (${pp.largura} × ${pp.altura} mm) com o topo para trás, encostada no canto frente-esquerda da área da caneta (confira com G0 X${j.x0 - (perfil.caneta?.x ?? 0)} Y${j.y0 - (perfil.caneta?.y ?? 0)}: a ponta pára nesse canto). Página ${i + 1} de ${doc.paginas.length}.`),
      svg,
      legenda(),
      el('p', 'mesa-aviso', 'Para várias páginas numa folha maior, ligue "imposição na mesa" no painel "Mesa e folha".'),
    );
    return;
  }
  const p = plano(estado);
  if (p.erro) { raiz.append(el('p', 'mesa-erro', p.erro)); return; }
  const { imp, passos } = p;
  const comPagina = (x) => imp.passadas[x.k].slots.some((i) => doc.paginas[pg(p, x.f, i)]);
  const sel = (estado.mesaSel ??= { f: -1, k: -1 });
  if (!passos.some((s) => s.f === sel.f && s.k === sel.k)) Object.assign(sel, passos.find(comPagina) ?? passos[0]);
  const { f, k } = sel;

  const aviso = el('p', 'mesa-erro');
  const botao = (txt, fn, cls) => {
    const b = el('button', cls, txt); b.type = 'button';
    b.addEventListener('click', () => { aviso.textContent = ''; try { fn(); } catch (e) { aviso.textContent = e.message; } });
    return b;
  };
  // gera tudo antes de baixar: no perfil experimental, traço fora da janela não gera arquivo nenhum
  const baixarTodos = (lista) => {
    const gerados = lista.map(([n, g]) => [n, g()]), fora = gerados.map(([, r]) => r.fora).find(Boolean);
    if (fora && perfil.experimental) throw new Error(MSG_EXP);
    gerados.forEach(([n, r]) => baixar(r.texto, n));
    if (fora) aviso.textContent = fora;
  };
  try { const { fora } = gcodePassada(estado, p, f, k, undefined, true); if (fora) aviso.textContent = perfil.experimental ? MSG_EXP : fora; } catch { /* sem G-code, sem aviso */ }
  const barra = el('div', 'mesa-barra'), rot = el('label', null, 'Passada '), s = el('select');
  passos.forEach((x, i) => s.append(new Option(`Folha ${x.f + 1} · Passada ${x.k + 1} de ${imp.passadas.length}${comPagina(x) ? '' : ' (sem página)'}`, i)));
  s.value = passos.findIndex((x) => x.f === f && x.k === k);
  s.addEventListener('change', () => { Object.assign(sel, passos[Number(s.value)]); desenharMesa(elemento, estado); });
  rot.append(s);
  barra.append(
    rot,
    botao('Baixar esta passada', () => baixarTodos(arquivos(estado, p, f, k)), 'primario'),
    botao('Baixar todas as passadas', () => baixarTodos(passos.filter(comPagina).flatMap((x) => arquivos(estado, p, x.f, x.k)))),
  );

  // a folha inteira nesta passada, com o texto de todas as páginas dela: as desta passada em tinta, as outras em cinza
  const fm = paraMesa(imp, k, { x: 0, y: 0, giro: 0 }, imp.folha), W = imp.folha.largura, H = imp.folha.altura;
  const c = imp.passadas[k].caixa, dir = imp.canto[1] === '1' ? -1 : 1, cima = imp.canto[3] === '1' ? -1 : 1;
  const cx = dir > 0 ? c.x : c.x + c.w, cy = cima > 0 ? c.y : c.y + c.h;
  const paginas = imp.slots.map((sl, i) => {
    const n = pg(p, f, i), pag = doc.paginas[n], ativa = imp.passadas[k].slots.includes(i);
    return { t: paraMesa(imp, k, sl, doc.papel), papel: doc.papel, camadas: pag?.camadas, ativa: ativa && !!pag, rotulo: pag ? `pág. ${n + 1}` : 'vazio', vazio: !pag,
      dados: { 'data-slot': i + 1, 'data-passada': ativa ? 'sim' : 'nao' } };
  });
  const resumo = `${imp.porFolha} páginas por folha · ${p.nFolhas} folha(s) · ${passos.filter(comPagina).length} passada(s) com página${imp.perdidos.length ? ` · ${imp.perdidos.length} posição(ões) inalcançável(is), sem página` : ''}`;
  const svg = cena({ mx, my, j, folhas: [[[0, 0], [W, 0], [W, H], [0, H]].map(fm)], paginas, canetas: doc.canetas,
      topo: [fm([W * 0.7, Math.min(18, H * 0.2)]), fm([W * 0.7, 3])], refs: [[[cx + dir * c.w, cy], [cx, cy], [cx, cy + cima * c.h]]], legenda: 'Simulação da mesa, folha e passadas' });
  barra.append(ampliar(svg));
  raiz.append(barra, el('p', 'mesa-instrucao', instrucao(imp, k, { nomeFolha: nomeFolha(p.m), origem: p.m.origem, folha: f + 1, nFolhas: p.nFolhas })), aviso,
    svg, legenda(), el('p', 'mesa-aviso', resumo));
}
