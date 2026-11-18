// Painel "Mesa e folha" + simulação da mesa (folha, slots, passadas). Imposição: src/maquina/imposicao.js.
import './mesa.css';
import { gcodeDocumento } from '../maquina/gcode.js';
import { otimizar } from '../maquina/otimizar.js';
import { impor, paraMesa, aPassada, instrucao } from '../maquina/imposicao.js';
import { PAPEIS, papel } from '../materiais/documento.js';
import { controle } from './controle.js';

const CHAVE = 'writer.mesa';
const PADRAO = { ligada: false, folha: 'A4', paisagem: false, largura: 210, altura: 297, canto: 'auto', encosto: 'auto', dx: 0, dy: 0, modo: 'agrupar', espaco: 0, origem: 'frente-esquerda' };
const CORES = ['var(--foco)', 'var(--rubrica)', 'var(--aviso)', 'var(--tinta-2)'];
const NS = 'http://www.w3.org/2000/svg';
const op = (o) => Object.entries(o).map(([valor, rotulo]) => ({ valor, rotulo }));
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
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

export function montar(elemento, estado, aoMudar) {
  const m = mesaDe(estado);
  const cs = DEFS.map((d) => controle(d, { ler: () => m[d.chave], gravar: (v) => { m[d.chave] = v; gravar(m); } }, aoMudar));
  elemento.replaceChildren(...cs.map((c) => c.el));
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

const otim = (estado, pag) => ({ ...pag, camadas: pag.camadas.map((c) => ({ ...c, tracos: otimizar(c.tracos, 0.1, { ordem: estado.otimizar ? c.ordem : 'escrita', grupos: estado.otimizar ? c.grupos : undefined }) })) });
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

function baixar(conteudo, nome) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/plain' }));
  Object.assign(document.createElement('a'), { href: url, download: nome }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// arquivos de uma passada: [nome, gerar()]; um (agrupar) ou um por slot com página (pagina)
function arquivos(estado, p, f, k) {
  const cam = camadaDe(p), of = estado.oficina ?? 'escrita', sf = cam ? `-${cam}` : '';
  if (p.m.modo !== 'pagina') return [[`${of}-f${f + 1}-pa${k + 1}${sf}.gcode`, () => gcodePassada(estado, p, f, k)]];
  return p.imp.passadas[k].slots.filter((i) => p.doc.paginas[pg(p, f, i)])
    .map((i) => [`${of}-p${pg(p, f, i) + 1}-f${f + 1}-pa${k + 1}${sf}.gcode`, () => gcodePassada(estado, p, f, k, i)]);
}

export function desenharMesa(elemento, estado) {
  const raiz = el('div', 'mesa');
  elemento.replaceChildren(raiz);
  elemento.style.maxWidth = ''; // `desenhar` da página deixa largura×4
  const m = mesaDe(estado);
  if (!m.ligada) { raiz.append(el('p', 'mesa-aviso', 'Imposição desligada. Ligue "imposição na mesa" no painel "Mesa e folha".')); return; }
  const p = plano(estado);
  if (p.erro) { raiz.append(el('p', 'mesa-erro', p.erro)); return; }
  const { imp, passos } = p, perfil = estado.perfil;
  const sel = (estado.mesaSel ??= { f: 0, k: 0 });
  if (!passos.some((s) => s.f === sel.f && s.k === sel.k)) { sel.f = 0; sel.k = 0; }
  const { f, k } = sel, j = imp.janela, mx = perfil.mesaX, my = perfil.mesaY;
  const Y = ([x, y]) => `${x.toFixed(2)} ${(my - y).toFixed(2)}`;
  const poli = (pts) => 'M' + pts.map(Y).join('L') + 'Z';
  const cantos = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];

  // seletor "Folha f · Passada k de n" + downloads
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
  passos.forEach((x, i) => s.append(new Option(`Folha ${x.f + 1} · Passada ${x.k + 1} de ${imp.passadas.length}`, i)));
  s.value = passos.findIndex((x) => x.f === f && x.k === k);
  s.addEventListener('change', () => { Object.assign(sel, passos[Number(s.value)]); desenharMesa(elemento, estado); });
  rot.append(s);
  barra.append(
    rot,
    botao('Baixar esta passada', () => baixarTodos(arquivos(estado, p, f, k)), 'primario'),
    botao('Baixar todas as passadas', () => baixarTodos(passos.flatMap((x) => arquivos(estado, p, x.f, x.k)))),
  );

  // desenho (Y da máquina para cima); o viewBox une a mesa e a folha em todas as passadas (o balanço aparece)
  const fm = paraMesa(imp, k, { x: 0, y: 0, giro: 0 }, imp.folha), cf = cantos(imp.folha.largura, imp.folha.altura);
  const pts = [[0, 0], [mx, my], ...imp.passadas.flatMap((_, kk) => cf.map(paraMesa(imp, kk, { x: 0, y: 0, giro: 0 }, imp.folha)))];
  const M = 14, x0 = Math.min(...pts.map((q) => q[0])) - M, x1 = Math.max(...pts.map((q) => q[0])) + M;
  const y0 = my - Math.max(...pts.map((q) => q[1])) - M, y1 = my - Math.min(...pts.map((q) => q[1])) + M;
  const d = sv('svg', { viewBox: `${x0} ${y0} ${x1 - x0} ${y1 - y0}`, role: 'img', 'aria-label': 'Simulação da mesa, folha e passadas' });
  d.style.aspectRatio = `${x1 - x0} / ${y1 - y0}`;
  const defs = sv('defs', {}, d);
  sv('path', { d: 'M0 6L6 0', stroke: 'var(--tinta-2)', 'stroke-width': .6 }, sv('pattern', { id: 'm-hach', width: 6, height: 6, patternUnits: 'userSpaceOnUse' }, defs));
  sv('rect', { x: 0, y: 0, width: mx, height: my }, sv('clipPath', { id: 'm-corte' }, defs)); // y = 0..my já é o SVG da mesa
  const dobra = poli(cf.map(fm));
  sv('path', { class: 'm-fora-mesa', d: dobra }, d); // a folha toda, hachurada: o que sobra para fora aparece
  sv('rect', { class: 'm-contorno', x: 0, y: 0, width: mx, height: my }, d);
  sv('rect', { class: 'm-janela', x: j.x0, y: my - j.y1, width: j.x1 - j.x0, height: j.y1 - j.y0 }, d);
  sv('path', { class: 'm-folha', d: dobra, 'clip-path': 'url(#m-corte)' }, d); // a parte sobre a mesa, cheia
  sv('rect', { class: 'm-mesa-borda', x: 0, y: 0, width: mx, height: my }, d);
  // nomes das bordas da mesa: X0 Y0 é o canto de baixo à esquerda do desenho
  const [fb, lr] = (p.m.origem || 'frente-esquerda').split('-');
  const outro = { frente: 'trás', tras: 'frente', esquerda: 'direita', direita: 'esquerda' }, nome = (w) => (w === 'tras' ? 'trás' : w);
  const borda = (txt, x, y, rotacao) => sv('text', { class: 'm-txt m-borda', x, y, 'text-anchor': 'middle', ...(rotacao && { transform: `rotate(${rotacao} ${x} ${y})` }) }, d).textContent = txt;
  borda(outro[fb] ?? 'trás', mx / 2, -4);
  borda(nome(fb), mx / 2, my + 10);
  borda(nome(lr), -4, my / 2, -90);
  borda(outro[lr] ?? 'direita', mx + 10, my / 2, 90);
  // bordas de referência engrossadas: as duas arestas da caixa que tocam o canto
  const c = imp.passadas[k].caixa, dir = imp.canto[1] === '1' ? -1 : 1, cima = imp.canto[3] === '1' ? -1 : 1;
  const cx = dir > 0 ? c.x : c.x + c.w, cy = cima > 0 ? c.y : c.y + c.h;
  sv('path', { class: 'm-ref', d: `M${Y([cx + dir * c.w, cy])}L${Y([cx, cy])}L${Y([cx, cy + cima * c.h])}` }, d);
  imp.slots.forEach((sl, i) => {
    const dentro = imp.passadas[k].slots.includes(i), cor = CORES[imp.passadas.findIndex((x) => x.slots.includes(i)) % CORES.length];
    const t = paraMesa(imp, k, sl, p.doc.papel), g = sv('g', { 'data-slot': i + 1, 'data-passada': dentro ? 'sim' : 'nao' }, d);
    sv('path', { class: 'm-slot' + (dentro ? '' : ' m-fora'), d: poli(cantos(p.doc.papel.largura, p.doc.papel.altura).map(t)), stroke: cor }, g);
    const pag = p.doc.paginas[pg(p, f, i)];
    if (pag && dentro) for (const cam of pag.camadas) for (const tr of cam.tracos) sv('path', { class: 'm-traco', stroke: cor, d: 'M' + tr.map((q) => Y(t(q))).join('L') }, g);
    const [qx, qy] = t([6, 10]);
    sv('text', { class: 'm-txt', x: qx, y: my - qy }, g).textContent = pag ? `pág. ${pg(p, f, i) + 1}` : 'vazio';
  });
  // seta "topo" da folha
  const [a, b] = [[imp.folha.largura / 2, imp.folha.altura * .1], [imp.folha.largura / 2, imp.folha.altura * .03]].map(fm);
  sv('path', { class: 'm-ref', d: `M${Y(a)}L${Y(b)}` }, d);
  const [tx, ty] = fm([imp.folha.largura / 2 + 4, imp.folha.altura * .1 + 8]);
  sv('text', { class: 'm-txt', x: tx, y: my - ty }, d).textContent = 'topo';

  const resumo = `${imp.porFolha} páginas por folha · ${p.nFolhas} folha(s) · ${passos.length} passada(s)${imp.perdidos.length ? ` · ${imp.perdidos.length} posição(ões) inalcançável(is), sem página` : ''}`;
  raiz.append(barra, el('p', 'mesa-instrucao', instrucao(imp, k, { nomeFolha: nomeFolha(p.m), origem: p.m.origem, folha: f + 1, nFolhas: p.nFolhas })), el('p', 'mesa-aviso', resumo), aviso, d);
}
