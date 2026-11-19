// Monta scrolls e grimórios: empilha nome, sigilo, ficha e efeito de cada magia nas páginas.
import { compor } from '../layout.js';
import { glifo } from '../motor/mao.js';
import { blocos } from '../magia.js';
import { cifrar, sigilo, moldura, LETRAS } from '../arcano/alfabeto.js';
import { PAPEIS, papel, CANETAS } from './documento.js';
import { separador } from '../ornamento/filigrana.js';

// [largura, altura, margem] em mm.
export const FOLHAS = Object.fromEntries(['A5', 'A6', 'A7', 'A8'].map((n) => [n, PAPEIS[n]]));
export const folha = (nome, paisagem = false, margem) => papel(nome, { paisagem, margem });

export const CFG_PADRAO = {
  tamanho: 4, minimo: 2.5, entrelinha: 1.5,
  sigilo: 0.35,           // diâmetro do sigilo como fração do menor lado útil; 0 = sem sigilo
  moldura: true,
  cifrar: { nome: false, ficha: false, efeito: false },
  completo: 'auto',       // 'auto' = texto completo se couber, senão resumo | 'sim' | 'nao'
  porPagina: true,        // true = um pergaminho por página; false = grimório, as magias fluem
  separador: 'losango',   // entre magias corridas: 'nenhum' | 'losango' | 'asteriscos' | 'onda'
  chave: false,           // acrescenta a página com a chave do alfabeto
};

// ponytail: WeakSet por identidade em vez de reestruturar; vale enquanto os traços não forem copiados no caminho.
const SIGILO = new WeakSet(), MOLDURA = new WeakSet();

// ctx = { fontes (inclui 'arcano'), mao, maoArcana, sigilos: { id: traços desenhados à mão }, seed }
// Devolve { pags: [traços por página], fim } começando em `topo` na primeira página.
function comporMagia(m, ctx, cfg, pagina, topo, { tamanho, completo, sigilo: comSigilo }) {
  const b = blocos(m, completo);
  const { margens } = pagina;
  const W = pagina.largura - margens.esq - margens.dir;
  const limite = pagina.altura - margens.base;
  const pags = [[]];
  const avisos = [];
  let y = topo;

  const bloco = (chave, tam, alinhamento) => {
    if (!b[chave]) return;
    const cif = cfg.cifrar[chave];
    const r = compor(cif ? cifrar(b[chave]) : b[chave], ctx.fontes, cif ? ctx.maoArcana : ctx.mao, pagina,
      { tamanho: tam, entrelinha: cfg.entrelinha, alinhamento, topo: y });
    pags[pags.length - 1].push(...r.paginas[0]);
    for (const p of r.paginas.slice(1)) pags.push(p);
    for (const a of r.avisos) if (a.startsWith('glifo ausente')) avisos.push(`${m.nome}: ${a}`);
    y = r.fim + tam * 0.9;
  };

  bloco('nome', tamanho * 1.4, 'centro');
  const d = !comSigilo ? 0 : cfg.sigilo * Math.min(W, limite - margens.topo);
  if (d > 0) {
    if (y + d > limite && y > margens.topo) { pags.push([]); y = margens.topo; }
    const cx = margens.esq + W / 2, cy = y + d / 2;
    const tr = ctx.sigilos?.[m.id] ?? sigilo(m, ctx.seed);
    const pos = tr.map((t) => t.map(([x, yy]) => [cx + (x * d) / 2, cy + (yy * d) / 2]));
    for (const t of pos) SIGILO.add(t);
    pags[pags.length - 1].push(...pos);
    y += d + tamanho * 0.5;
  }
  bloco('ficha', tamanho, 'esquerda');
  bloco('efeito', tamanho, 'esquerda');
  return { pags, fim: y, avisos };
}

// Escolhe o modo para a magia caber numa página vazia: completo (diminuindo a letra até o mínimo), depois resumo, depois sem sigilo.
function ajustar(m, ctx, cfg, pagina) {
  const tenta = (modo) => comporMagia(m, ctx, cfg, pagina, pagina.margens.topo, modo).pags.length === 1 && { ...modo, cabe: true };
  const cheio = { tamanho: cfg.tamanho, completo: true, sigilo: true };
  if (cfg.completo === 'sim') return { ...cheio, cabe: true };
  const modos = [[false, true], [false, false]];
  if (cfg.completo === 'auto') modos.unshift([true, true]);
  for (const [completo, sigilo] of modos) {
    for (let tamanho = cfg.tamanho; tamanho >= cfg.minimo - 1e-9; tamanho -= 0.25) {
      const ok = tenta({ tamanho, completo, sigilo });
      if (ok) return ok;
    }
  }
  return { tamanho: cfg.minimo, completo: false, sigilo: false, cabe: false };
}

// Página(s) com cada letra legível ao lado do símbolo arcano.
function chave(ctx, cfg, pagina) {
  const { margens } = pagina;
  const tam = cfg.tamanho;
  const lw = tam * 3.2, lh = tam * 2;
  const cols = Math.max(1, Math.floor((pagina.largura - margens.esq - margens.dir) / lw));
  const lins = Math.max(1, Math.floor((pagina.altura - margens.topo - margens.base) / lh));
  const pags = [];
  [...LETRAS].forEach((ch, i) => {
    const k = i % (cols * lins);
    if (k === 0) pags.push([]);
    const x = margens.esq + (k % cols) * lw, y = margens.topo + Math.floor(k / cols) * lh + tam * 1.2;
    const por = (g, x0) => g.tracos.filter((t) => t.length).map((t) => t.map(([px, py]) => [x0 + px * tam, y - py * tam]));
    const leg = glifo(ctx.fontes, ctx.mao, ch, 0);
    pags[pags.length - 1].push(...por(leg, x), ...por(glifo(ctx.fontes, ctx.maoArcana, ch, 0), x + leg.adv * tam + tam * 0.6));
  });
  return pags;
}

// Faixa do separador logo abaixo do fim da magia anterior, na largura útil.
const faixaSeparador = (p, y, tam) => ({ x: p.margens.esq, y: y + tam * 0.5, l: p.largura - p.margens.esq - p.margens.dir, a: tam * 1.2 });

// Devolve { paginas: [traços], avisos, modos: { id: { tamanho, completo, sigilo, cabe } } }.
export function paginasGrimorio(magias, ctx, cfgParcial, pagina) {
  const cfg = { ...CFG_PADRAO, ...cfgParcial, cifrar: { ...CFG_PADRAO.cifrar, ...cfgParcial?.cifrar } };
  const { margens } = pagina;
  const paginas = [];
  const avisos = [];
  const modos = {};
  let y = margens.topo;
  for (const m of magias) {
    const modo = ajustar(m, ctx, cfg, pagina);
    modos[m.id] = modo;
    if (!modo.cabe) avisos.push(`${m.nome}: não coube em uma página nem no tamanho mínimo`);
    else if (!modo.sigilo && cfg.sigilo > 0) avisos.push(`${m.nome}: sem sigilo para caber na página`);
    const nova = cfg.porPagina || paginas.length === 0;
    const sep = !nova && cfg.separador !== 'nenhum' && faixaSeparador(pagina, y, cfg.tamanho);
    let r = nova ? null : comporMagia(m, ctx, cfg, pagina, sep ? sep.y + sep.a + cfg.tamanho * 0.8 : y + cfg.tamanho * 1.5, modo);
    if (r && r.pags.length === 1 && sep) {
      const t = separador(sep, { separador: cfg.separador }, `${ctx.seed}|${m.id}`);
      for (const x of t) MOLDURA.add(x);
      paginas[paginas.length - 1].push(...t);
    }
    if (!r || r.pags.length > 1) { // não cabe no resto da página: começa em página nova
      r = comporMagia(m, ctx, cfg, pagina, margens.topo, modo);
      paginas.push(...r.pags);
    } else {
      paginas[paginas.length - 1].push(...r.pags[0]);
    }
    avisos.push(...r.avisos);
    y = r.fim;
  }
  if (cfg.chave) paginas.push(...chave(ctx, cfg, pagina));
  if (cfg.moldura) for (const p of paginas) { const m = moldura(pagina); for (const t of m) MOLDURA.add(t); p.push(...m); }
  return { paginas, avisos: [...new Set(avisos)], modos };
}

// Grimório como Documento: 3 camadas por página (texto, moldura, sigilo em caneta vermelha). cfg.papel obrigatório.
export function comporGrimorio(magias, ctx, cfg) {
  const r = paginasGrimorio(magias, ctx, cfg, cfg.papel);
  const vermelha = cfg.rubrica === false ? 'preta' : 'vermelha';
  const camada = (id, caneta, p, f) => ({ id, caneta, personagem: null, ordem: 'otimizada', tracos: p.filter(f) });
  return {
    papel: cfg.papel,
    canetas: { preta: CANETAS.preta, ...(vermelha === 'vermelha' && { vermelha: CANETAS.vermelha }) },
    paginas: r.paginas.map((p) => ({ camadas: [
      camada('texto', 'preta', p, (t) => !SIGILO.has(t) && !MOLDURA.has(t)),
      camada('moldura', 'preta', p, (t) => MOLDURA.has(t)),
      camada('sigilo', vermelha, p, (t) => SIGILO.has(t)),
    ] })),
    avisos: r.avisos,
    modos: r.modos,
  };
}
export const comporScroll = (magias, ctx, cfg) => comporGrimorio(magias, ctx, { ...cfg, porPagina: true });

// Parâmetros editáveis. Prévia: papel (retângulo em mm) com o que o parâmetro desenha, ou a escrita de uma palavra.
const ret = (l, a) => [[0, 0], [l, 0], [l, a], [0, a], [0, 0]];
const util = (p) => ({ l: p.largura - p.margens.esq - p.margens.dir, a: p.altura - p.margens.topo - p.margens.base });
const pautas = (p, n) => Array.from({ length: n }, (_, i) => { const y = p.margens.topo + ((i + 0.5) * util(p).a) / n; return [[p.margens.esq, y], [p.largura - p.margens.dir, y]]; });
const cif = (v, ctx) => (v ? ctx.escrever(ctx.maoArcana, cifrar('magia')) : ctx.escrever(ctx.mao, 'magia'));
const P = (chave, grupo, nivel, rotulo, ajuda, previa, resto) => ({ chave, grupo, nivel, rotulo, ajuda, previa, ...resto });
// Prévia de disposição: blocos de pauta (uma magia = 3 linhas) em uma ou duas folhas lado a lado.
const blocoMagia = (x, y) => [[[x + 6, y], [x + 24, y]], [[x + 3, y + 5], [x + 27, y + 5]], [[x + 3, y + 8], [x + 22, y + 8]]];
const SEP = { x: 3, y: 15, l: 24, a: 4 };
export const PARAMS = [
  P('porPagina', 'disposicao', 'basico', 'uma magia por página', 'Ligado: cada magia ocupa uma folha própria, como um pergaminho avulso. Desligado: as magias seguem uma depois da outra, como num grimório.',
    (v) => (v ? [ret(30, 42), ...blocoMagia(0, 6), ...[ret(30, 42), ...blocoMagia(0, 6)].map((t) => t.map(([x, y]) => [x + 34, y]))]
      : [ret(30, 42), ...blocoMagia(0, 6), ...blocoMagia(0, 24)]), { tipo: 'marca', padrao: CFG_PADRAO.porPagina, semEscala: true }),
  P('separador', 'disposicao', 'basico', 'separador entre magias', 'Enfeite horizontal entre uma magia e a seguinte, quando as magias seguem na mesma folha.',
    (v) => [ret(30, 42), ...blocoMagia(0, 4), ...blocoMagia(0, 25), ...(v === 'nenhum' ? [] : separador(SEP, { separador: v }, 1))],
    { tipo: 'opcao', padrao: CFG_PADRAO.separador, semEscala: true, opcoes: [{ valor: 'nenhum', rotulo: 'nenhum' }, { valor: 'losango', rotulo: 'losango' }, { valor: 'asteriscos', rotulo: 'asteriscos' }, { valor: 'onda', rotulo: 'onda' }] }),
  P('tamanho', 'folha', 'basico', 'tamanho da letra', 'Altura das letras da magia, em mm. O programa diminui a letra até o mínimo se a magia não couber na folha.',
    (v, ctx) => ctx.escrever(ctx.mao, 'magia', { tamanho: v }), { tipo: 'faixa', min: 2, max: 8, passo: 0.25, padrao: CFG_PADRAO.tamanho, unidade: 'mm' }),
  P('minimo', 'folha', 'avancado', 'letra mínima', 'Menor altura de letra permitida ao encolher uma magia para caber na folha. Abaixo disso o texto vira resumo.',
    (v, ctx) => ctx.escrever(ctx.mao, 'magia', { tamanho: v }), { tipo: 'faixa', min: 1.5, max: 5, passo: 0.25, padrao: CFG_PADRAO.minimo, unidade: 'mm' }),
  P('entrelinha', 'folha', 'avancado', 'entrelinha da magia', 'Distância entre as linhas do texto da magia, de 1,1 a 2,2. Valores menores deixam a magia mais compacta e ajudam a caber.',
    (v, ctx) => ctx.escrever(ctx.mao, 'magia\nruna', { tamanho: 4, entrelinha: v }), { tipo: 'faixa', min: 1.1, max: 2.2, passo: 0.05, padrao: CFG_PADRAO.entrelinha }),
  P('sigilo', 'folha', 'basico', 'tamanho do sigilo', 'Tamanho do sigilo desenhado acima do texto, como fração da folha. 0 = sem sigilo. O sigilo codifica nível, escola e componentes.',
    (v, ctx) => {
      const p = ctx.papel, u = util(p), r = (v * Math.min(u.l, u.a)) / 2;
      return [ret(p.largura, p.altura), ...sigilo(ctx.magia, ctx.estilo.seed).map((t) => t.map(([x, y]) => [p.largura / 2 + x * r, p.altura / 2 + y * r]))];
    }, { tipo: 'faixa', min: 0, max: 0.8, passo: 0.05, padrao: CFG_PADRAO.sigilo }),
  P('moldura', 'folha', 'basico', 'moldura', 'Desenha uma moldura dupla com losangos nos cantos em volta de cada página.',
    (v, ctx) => [ret(ctx.papel.largura, ctx.papel.altura), ...(v ? moldura(ctx.papel) : [])], { tipo: 'marca', padrao: CFG_PADRAO.moldura }),
  P('completo', 'folha', 'basico', 'texto completo', 'Escolhe entre o texto inteiro da magia (sempre completo), só um resumo ou o texto inteiro apenas quando couber na folha (auto).',
    (v, ctx) => [ret(ctx.papel.largura, ctx.papel.altura), ...pautas(ctx.papel, { nao: 3, auto: 6, sim: 10 }[v])],
    { tipo: 'opcao', padrao: CFG_PADRAO.completo, semEscala: true, opcoes: [{ valor: 'auto', rotulo: 'auto' }, { valor: 'nao', rotulo: 'só resumo' }, { valor: 'sim', rotulo: 'sempre completo' }] }),
  P('chave', 'folha', 'basico', 'página da chave', 'Acrescenta no fim uma página com cada letra legível ao lado do símbolo arcano, para decifrar o texto.',
    (v, ctx) => [...ctx.escrever(ctx.mao, 'a b c'), ...(v ? ctx.escrever(ctx.maoArcana, 'a b c').map((t) => t.map(([x, y]) => [x, y + 14])) : [])], { tipo: 'marca', padrao: CFG_PADRAO.chave }),
  P('cifrarNome', 'cifrar', 'basico', 'cifrar o nome', 'Escreve o nome da magia no alfabeto arcano em vez da sua letra.', cif, { tipo: 'marca', padrao: CFG_PADRAO.cifrar.nome }),
  P('cifrarFicha', 'cifrar', 'basico', 'cifrar a ficha', 'Escreve a ficha da magia (nível, tempo, alcance) no alfabeto arcano em vez da sua letra.', cif, { tipo: 'marca', padrao: CFG_PADRAO.cifrar.ficha }),
  P('cifrarEfeito', 'cifrar', 'basico', 'cifrar o efeito', 'Escreve a descrição do efeito da magia no alfabeto arcano em vez da sua letra.', cif, { tipo: 'marca', padrao: CFG_PADRAO.cifrar.efeito }),
];
