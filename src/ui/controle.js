// Controle de parâmetro com prévia viva: um popover único (#previa-viva) mostra o desenho com o valor atual e os extremos.
const NS = 'http://www.w3.org/2000/svg';
const W = 288, H = 104;
let contador = 0, pop = null, ativo = null, raf = 0;

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const fmt = (v, un) => String(+Number(v).toFixed(2)).replace('.', ',').replace('-', '−') + (un ? ' ' + un : ''); // no máximo 2 casas

function valida(def, bruto) {
  let v = Number(bruto);
  if (bruto === '' || bruto == null || Number.isNaN(v)) return null;
  const { min = -Infinity, max = Infinity, passo } = def;
  if (passo) { v = Math.round((v - (Number.isFinite(min) ? min : 0)) / passo) * passo + (Number.isFinite(min) ? min : 0); }
  return +Math.min(max, Math.max(min, v)).toFixed(2);
}

// previa devolve traços (tudo muda com o valor) ou { fundo, foco }: o foco é o que o controle altera, pintado em destaque.
const tentar = (def, v, ctx) => {
  try {
    const t = def.previa(v, ctx);
    if (Array.isArray(t)) return { fundo: [], foco: t };
    return t && Array.isArray(t.foco) ? { fundo: t.fundo ?? [], foco: t.foco } : null;
  } catch { return null; }
};

// ---- desenho ----
function svg(w, h) { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', `0 0 ${w} ${h}`); s.setAttribute('aria-hidden', 'true'); return s; }

// camadas = [{ tracos, cls }]; escala única para todas; devolve <svg>
function desenhar(camadas, w, h, escala) {
  const pts = camadas.flatMap(c => c.tracos.flat()).filter(p => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  const s = svg(w, h);
  if (!pts.length) return s;
  const x0 = Math.min(...pts.map(p => p[0])) - .5, x1 = Math.max(...pts.map(p => p[0])) + .5;
  const y0 = Math.min(...pts.map(p => p[1])) - .5, y1 = Math.max(...pts.map(p => p[1])) + .5;
  const k = Math.min(w / (x1 - x0), h / (y1 - y0));
  const ox = (w - (x1 - x0) * k) / 2 - x0 * k, oy = (h - (y1 - y0) * k) / 2 - y0 * k;
  for (const { tracos, cls } of camadas) for (const t of tracos) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('class', cls);
    p.setAttribute('d', t.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * k + ox).toFixed(2)} ${(y * k + oy).toFixed(2)}`).join(''));
    s.append(p);
  }
  const mm = escala && [100, 10, 1].find(m => m * k <= w * .4);
  if (mm) {
    const l = document.createElementNS(NS, 'path'), t = document.createElementNS(NS, 'text'), y = h - 8;
    l.setAttribute('class', 'pv-escala');
    l.setAttribute('d', `M8 ${y - 3}V${y + 3}M8 ${y}H${8 + mm * k}M${8 + mm * k} ${y - 3}V${y + 3}`);
    t.setAttribute('class', 'pv-escala-txt'); t.setAttribute('x', 8 + mm * k + 6); t.setAttribute('y', y + 3.5);
    t.textContent = mm + ' mm';
    s.append(l, t);
  }
  return s;
}

const folha = (svgEl, sel) => { const d = el('div', 'pv-folha' + (sel ? ' pv-sel' : '')); d.append(svgEl); return d; };

// ---- popover ----
function popover() {
  if (!pop) {
    pop = el('div'); pop.id = 'previa-viva'; pop.setAttribute('popover', 'manual'); pop.setAttribute('role', 'tooltip');
    document.body.append(pop);
  }
  return pop;
}

function rotuloOpcao(def, v) { return def.opcoes.find(o => o.valor === v)?.rotulo ?? String(v); }
function textoValor(def, v) {
  if (def.tipo === 'opcao') return rotuloOpcao(def, v);
  if (def.tipo === 'marca') return v ? 'ligado' : 'desligado';
  return fmt(v, def.unidade);
}

function render() {
  const a = ativo; if (!a) return;
  const p = popover();
  if (a.texto != null) { p.replaceChildren(el('p', 'pv-ajuda', a.texto)); return; }
  const { def, estado } = a, v = estado.ler(), ctx = estado.ctx?.();
  const filhos = [];
  const cab = el('div', 'pv-cab'); cab.append(el('span', null, def.rotulo), el('span', null, textoValor(def, v)));
  filhos.push(cab);
  if (def.tipo === 'opcao') {
    // grade:false = só a opção atual (listas longas, como as 43 fontes)
    const ops = def.grade === false ? def.opcoes.filter(o => o.valor === v) : def.opcoes;
    const ts = ops.map(o => tentar(def, o.valor, ctx));
    if (ts.length && ts.every(Boolean)) filhos.push(grade(ops.map((o, i) => [o.rotulo, ts[i], o.valor === v]), def.grade === false ? 1 : 4));
  } else if (def.tipo === 'marca') {
    const ts = [false, true].map(b => tentar(def, b, ctx));
    if (ts.every(Boolean)) filhos.push(grade([['desligado', ts[0], !v], ['ligado', ts[1], !!v]], 2));
  } else {
    const atual = tentar(def, v, ctx);
    if (def.tipo === 'faixa') a.fant ??= [tentar(def, def.min, ctx), tentar(def, def.max, ctx)];
    const fant = a.fant || [];
    if (atual && fant.every(Boolean)) {
      filhos.push(folha(desenhar([
        { tracos: atual.fundo, cls: 'pv-fundo' }, { tracos: fant[0].foco, cls: 'pv-fantasma' }, { tracos: fant[1].foco, cls: 'pv-fantasma' }, { tracos: atual.foco, cls: 'pv-foco' },
      ], W, H, !def.semEscala)));
      if (def.tipo === 'faixa') filhos.push(...regua(def, v));
    }
  }
  if (def.ajuda) filhos.push(el('p', 'pv-ajuda', def.ajuda));
  p.replaceChildren(...filhos);
}

function grade(itens, cols = 4) {
  const g = el('div', 'pv-grade'); g.style.gridTemplateColumns = `repeat(${Math.min(cols, 4)}, 1fr)`;
  for (const [rot, t, sel] of itens) {
    const f = el('figure'), cx = [{ tracos: t.fundo, cls: 'pv-fundo' }, { tracos: t.foco, cls: 'pv-foco' }];
    const s = desenhar(cx, 96, 72, false);
    f.append(folha(s, sel), el('figcaption', null, rot));
    g.append(f);
  }
  return g;
}

function regua(def, v) {
  const pct = x => Math.max(0, Math.min(100, (x - def.min) / (def.max - def.min) * 100));
  const r = el('div', 'pv-regua'), tr = el('div', 'pv-trilho'), pd = el('span', 'pv-padrao'), mv = el('span', 'pv-valor', '▼');
  pd.style.left = pct(def.padrao) + '%'; mv.style.left = pct(v) + '%';
  tr.append(pd, mv);
  r.append(el('span', null, fmt(def.min)), tr, el('span', null, fmt(def.max, def.unidade)));
  return [r, el('div', 'pv-padrao-txt', 'padrão ' + fmt(def.padrao, def.unidade))];
}

function posicionar() {
  if (!ativo || !pop.matches(':popover-open')) return;
  const a = ativo, r = a.ancora.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  let cx = r.left + r.width / 2;
  if (a.def?.tipo === 'faixa') {
    const ir = a.entrada.getBoundingClientRect(), v = a.estado.ler();
    cx = ir.left + Math.min(1, Math.max(0, (v - a.def.min) / (a.def.max - a.def.min))) * ir.width;
  }
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  let y = r.top - 8 - h; if (y < 8) y = r.bottom + 8;
  pop.style.left = Math.max(8, Math.min(vw - w - 8, cx - w / 2)) + 'px';
  pop.style.top = Math.max(8, Math.min(vh - h - 8, y)) + 'px';
}

function abrir(novo) {
  if (ativo && ativo.ancora === novo.ancora && ativo.texto === novo.texto) return agendar();
  ativo = novo;
  render();
  const p = popover();
  if (!p.matches(':popover-open')) p.showPopover();
  posicionar();
}

function agendar() {
  raf ||= requestAnimationFrame(() => { raf = 0; if (ativo) { render(); posicionar(); } });
}

function fechar() {
  ativo = null;
  if (pop?.matches(':popover-open')) pop.hidePopover();
}

let global = false;
function ouvirGlobal() {
  if (global) return; global = true;
  document.addEventListener('keydown', e => e.key === 'Escape' && fechar());
  window.addEventListener('scroll', e => { if (!pop?.contains(e.target)) fechar(); }, true);
  window.addEventListener('resize', fechar);
}

// ---- API ----
export function ligar(alvo, chave, ctx) {
  const obj = () => typeof alvo === 'function' ? alvo() : alvo;
  return { ler: () => obj()[chave], gravar: v => { obj()[chave] = v; }, ctx: typeof ctx === 'function' ? ctx : () => ctx };
}

export function dica(texto, nome) {
  ouvirGlobal();
  const b = el('button', 'dica', '?'); b.type = 'button'; b.setAttribute('aria-label', nome ? 'Ajuda: ' + nome : 'Ajuda');
  const abre = () => abrir({ ancora: b, texto });
  b.addEventListener('pointerenter', abre); b.addEventListener('focus', abre); b.addEventListener('click', abre);
  b.addEventListener('pointerleave', () => document.activeElement !== b && fechar());
  b.addEventListener('blur', fechar);
  return b;
}

export function controle(def, estado, aoMudar) {
  ouvirGlobal();
  const id = `c-${def.chave}-${++contador}`, tipo = def.tipo;
  const linha = el('div', 'controle'); linha.dataset.chave = def.chave; linha.dataset.nivel = def.nivel; linha.dataset.tipo = tipo;
  const rot = el('label', null, def.rotulo); rot.htmlFor = id;
  let entrada, saida = null;
  if (tipo === 'opcao') {
    entrada = el('select');
    def.opcoes.forEach((o, i) => { const op = el('option', null, o.rotulo); op.value = i; entrada.append(op); });
  } else {
    entrada = el('input');
    entrada.type = { faixa: 'range', numero: 'number', marca: 'checkbox' }[tipo];
    if (tipo !== 'marca') {
      if (def.min != null) entrada.min = def.min;
      if (def.max != null) entrada.max = def.max;
      entrada.step = def.passo ?? 'any';
    }
  }
  entrada.id = id;
  const ajuda = el('span', 'so-leitor', def.ajuda); ajuda.id = id + '-ajuda';
  entrada.setAttribute('aria-describedby', ajuda.id);
  const bt = el('button', 'dica', '?'); bt.type = 'button'; bt.setAttribute('aria-label', 'Ajuda: ' + def.rotulo);
  if (tipo === 'faixa') { saida = el('output'); saida.htmlFor = id; }
  linha.append(...(tipo === 'marca' ? [entrada, rot] : [rot, entrada]), ...(saida ? [saida] : []), bt, ajuda);

  const atualizar = () => {
    const v = estado.ler();
    if (tipo === 'marca') entrada.checked = !!v;
    else if (tipo === 'opcao') entrada.value = Math.max(0, def.opcoes.findIndex(o => o.valor === v));
    else if (document.activeElement !== entrada) entrada.value = v;
    if (saida) saida.textContent = fmt(v, def.unidade);
  };
  const mudou = () => {
    let v;
    if (tipo === 'marca') v = entrada.checked;
    else if (tipo === 'opcao') v = def.opcoes[Number(entrada.value)].valor;
    else { v = valida(def, entrada.value); if (v === null) return; }
    estado.gravar(v);
    atualizar();
    aoMudar?.();
    abrir({ ancora: linha, def, estado, entrada });
  };
  entrada.addEventListener('input', mudou);
  entrada.addEventListener('change', mudou);

  const abre = () => abrir({ ancora: linha, def, estado, entrada });
  bt.addEventListener('click', abre);
  linha.addEventListener('pointerenter', abre);
  linha.addEventListener('focusin', abre);
  linha.addEventListener('pointerleave', () => !linha.contains(document.activeElement) && fechar());
  linha.addEventListener('focusout', e => !linha.contains(e.relatedTarget) && fechar());
  atualizar();
  return { el: linha, atualizar };
}
