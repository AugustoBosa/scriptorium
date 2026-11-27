// Sistema de símbolos: regras que transformam os atributos de uma magia num sigilo.
// O desenho é montado em mm numa caixa de 60 mm (VAO e larguras de anel fazem sentido nessa escala)
// e devolvido em [-1,1], y para baixo, como `sigilo()` de alfabeto.js.
import { circulo as circ, limpar, encaixar, reamostrar, clamp } from '../geo.js';
import { ruido1d } from '../rng.js';
import { atributos, OPCOES } from '../magia-atributos.js';
import { sigilo, gerarAlfabeto, LETRAS, mdc, MIOLO } from './alfabeto.js';
import { circulo as circuloMagico } from './circulo.js';
import { sigiloPalavra } from './sigilo.js';
import { PRESETS } from './presets.js';

const TAU = 2 * Math.PI;
const D = 60, R = D / 2; // ponytail: escala fixa de composição; o sigilo final é reescalado pelo material
const C = [R, R];
const polar = (r, a) => [C[0] + r * R * Math.cos(a), C[1] + r * R * Math.sin(a)];

export const CAMPOS = Object.keys(OPCOES);
export const MODOS = ['colar', 'glifo', 'anel', 'lados', 'marca'];
export const TIPOS_ANEL = ['linha', 'dupla', 'dentes', 'pontos', 'onda', 'runas'];

export const SISTEMA_PADRAO = {
  nome: 'Novo sistema', versao: 1,
  base: { pontos: 'auto', raio: 0.62, inicio: 0, marcador: true },
  codigos: [],
  nomeMagia: { modo: 'nenhum', escala: 0.3 },
  linha: { forma: 'arco', curva: 0.35, zero: 'omitir' },
  molduras: [{ raio: 1, tipo: 'linha' }],
  traco: { complexidade: 0.3, ornamento: 0.3, firmeza: 1 },
};

// Completa um sistema parcial com os padrões (só um nível de profundidade).
export function completar(s = {}) {
  const o = { ...SISTEMA_PADRAO, ...s };
  for (const k of ['base', 'nomeMagia', 'linha', 'traco']) o[k] = { ...SISTEMA_PADRAO[k], ...(s[k] ?? {}) };
  return o;
}

// Colares binários: um representante (o menor) por classe de rotação, em ordem crescente. N=13 → 632.
const memo = new Map();
export function colares(n) {
  if (memo.has(n)) return memo.get(n);
  const mask = (1 << n) - 1, rot = (x) => ((x << 1) | (x >>> (n - 1))) & mask, out = [];
  for (let x = 0; x <= mask; x++) {
    let m = x, y = x;
    for (let i = 1; i < n; i++) { y = rot(y); if (y < m) { m = y; break; } }
    if (m === x) out.push(x);
  }
  memo.set(n, out);
  return out;
}

// Valor do campo para esta magia: índice na ordem de opções do código (pode ser reordenada pelo usuário).
function valor(cod, attrs) {
  const ops = cod.opcoes ?? OPCOES[cod.campo];
  const v = attrs[cod.campo];
  if (Array.isArray(v)) return v.map((x) => ops.indexOf(x)).filter((i) => i >= 0);
  return Math.max(0, ops.indexOf(v));
}

// Corda entre dois pontos da base: reta ou arco (quadrática com flecha `curva`).
function corda(a, b, s) {
  if (s.linha.forma === 'reta' || !s.linha.curva) return [a, b];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const c = [(a[0] + b[0]) / 2 - dy * s.linha.curva * 0.5, (a[1] + b[1]) / 2 + dx * s.linha.curva * 0.5];
  return Array.from({ length: 13 }, (_, k) => { const u = k / 12, v = 1 - u; return [v * v * a[0] + 2 * u * v * c[0] + u * u * b[0], v * v * a[1] + 2 * u * v * c[1] + u * u * b[1]]; });
}
const tracejar = (t) => { // bit 0 pontilhado: 3 traços curtos ao longo da corda
  const L = t.slice(1).reduce((q, p, i) => q + Math.hypot(p[0] - t[i][0], p[1] - t[i][1]), 0);
  const r = reamostrar(t, L / 20 || 1), n = r.length - 1;
  return [0.2, 0.45, 0.7].map((f) => r.slice(Math.round(f * n), Math.round((f + 0.1) * n) + 1)).filter((x) => x.length >= 2);
};

function glifoDe(cod, idx, seed) {
  if (cod.campo === 'escola') return (MIOLO[OPCOES.escola[idx]] ?? MIOLO.V)();
  if ((cod.opcoes ?? OPCOES[cod.campo]).length === 2) return idx ? [circ(0, 0, 0.6, 24)] : [];
  const g = gerarAlfabeto({ seed: `${seed}|${cod.campo}` }).glifos[LETRAS[idx % LETRAS.length]];
  return g.tracos.map((t) => t.map(([x, y]) => [x, -y]));
}

function marcaDe(j, tam) { // formas de marca no anel, em volta de (0,0)
  const f = [
    () => [[[0, -1.2], [0, 1.2]]],
    () => [circ(0, 0, 1, 10)],
    () => [[[0, -1], [0.9, 0.7], [-0.9, 0.7], [0, -1]]],
    () => [[[0, -1], [1, 0], [0, 1], [-1, 0], [0, -1]]],
    () => [[[-1, 0], [1, 0]], [[0, -1], [0, 1]]],
    () => [[[-1, -1], [1, 1]], [[-1, 1], [1, -1]]],
  ][j % 6]();
  return f.map((t) => t.map(([x, y]) => [x * tam, y * tam]));
}

// Desenha um código. Devolve traços em mm na caixa de 60.
function codigo(cod, i, s, attrs, base, seed) {
  const v = valor(cod, attrs);
  const raio = cod.raio ?? 0.9;
  if (cod.modo === 'colar') {
    const lista = colares(base.length), q = Array.isArray(v) ? v.reduce((a, b) => a + (1 << b), 0) : v;
    // 0 = colar vazio; os outros valores saltam pela lista (passo primo) para não ficarem todos com poucos bits
    const bits = q ? lista[1 + ((q * 97) % (lista.length - 1))] : 0;
    const k = clamp(cod.passo ?? i + 1, 1, Math.floor(base.length / 2));
    const out = [];
    for (let p = 0; p < base.length; p++) {
      const t = corda(base[p], base[(p + k) % base.length], s);
      if ((bits >> p) & 1) out.push(t);
      else if (s.linha.zero === 'pontilhado') out.push(...tracejar(t));
    }
    return out;
  }
  if (cod.modo === 'glifo') {
    const idx = Array.isArray(v) ? v[0] ?? 0 : v;
    const g = glifoDe(cod, idx, seed);
    if (!g.length) return [];
    const [cx, cy] = cod.lugar ? polar(cod.lugar.r, -Math.PI / 2 + TAU * cod.lugar.a) : C;
    const t = (cod.tamanho ?? 0.25) * R;
    return encaixar(g, { x: cx - t, y: cy - t, l: 2 * t, a: 2 * t });
  }
  if (cod.modo === 'anel') {
    const n = Array.isArray(v) ? v.length : v;
    const tipo = cod.tipo ?? 'linha', passo = Math.max(cod.espaco ?? 0.04, 0.04); // 0,04 × 30 mm ≥ 2·VAO mesmo com o sigilo a ~35 mm
    if (!n) return [];
    const aneis = Array.from({ length: n }, (_, j) => ({ raio: raio - j * passo, tipo, largura: 0.06 }));
    return circuloMagico({ x: 0, y: 0, l: D, a: D }, { aneis }, `${seed}|anel${i}`);
  }
  if (cod.modo === 'lados') {
    const n = (Array.isArray(v) ? v.length : v) + (cod.minimo ?? 2);
    if (n < 3) return [circ(C[0], C[1], raio * 0.5 * R, 48)];
    const passos = []; for (let k = 1; k < n / 2; k++) if (mdc(n, k) === 1) passos.push(k);
    const k = cod.estrela === false ? 1 : passos[Math.min(1, passos.length - 1)];
    const rot = -Math.PI / 2 + TAU * (s.base.inicio ?? 0);
    return [Array.from({ length: n + 1 }, (_, j) => polar(raio, rot + (j * k * TAU) / n))];
  }
  if (cod.modo === 'marca') {
    const idxs = Array.isArray(v) ? v : v ? [v] : [];
    const total = (cod.opcoes ?? OPCOES[cod.campo]).length;
    const a0 = -Math.PI / 2 + TAU * (cod.inicio ?? i * 0.13);
    return idxs.flatMap((j) => {
      const [x, y] = polar(raio, a0 + (TAU * j) / total);
      return marcaDe(j, 0.05 * R).map((t) => t.map(([px, py]) => [x + px, y + py]));
    });
  }
  return [];
}

function nomeTracos(s, m, seed, ctx) {
  const { modo, escala } = s.nomeMagia;
  if (modo === 'nenhum' || !m.nome) return [];
  if (modo === 'anel') {
    const r = escala; // escala = largura da faixa
    return circuloMagico({ x: 0, y: 0, l: D, a: D }, { aneis: [{ raio: 1, tipo: 'texto', largura: clamp(r, 0.08, 0.25), texto: m.nome }] }, seed, ctx);
  }
  const t = escala * R;
  const metodo = modo === 'spare' ? 'fusao' : modo;
  return sigiloPalavra({ x: R - t, y: R - t, l: 2 * t, a: 2 * t }, { frase: m.nome, metodo, ordem: s.nomeMagia.ordem ?? 4 }, seed, ctx);
}

// Traço do personagem: complexidade e ornamento acrescentam anéis e nós; firmeza < 1 treme o traço.
function ornamentos(s, base) {
  const { complexidade: c, ornamento: o } = s.traco, out = [];
  if (c > 0.5) out.push(...circuloMagico({ x: 0, y: 0, l: D, a: D }, { aneis: [{ raio: 0.96, tipo: c > 0.8 ? 'runas' : 'pontos', largura: 0.07 }] }, 'orn'));
  if (o > 0.4 && base.length) for (const p of base) out.push(circ(p[0], p[1], 0.04 * R * o, 10));
  if (o > 0.75) out.push(...circuloMagico({ x: 0, y: 0, l: D, a: D }, { aneis: [{ raio: 0.99, tipo: 'onda', largura: 0.05 }] }, 'orn'));
  return out;
}
function tremer(tracos, firmeza, seed) {
  if (firmeza >= 1) return tracos;
  const a = (1 - firmeza) * 0.6; // mm
  return tracos.map((t, i) => reamostrar(t, 1).map(([x, y], k) => [x + a * ruido1d(`${seed}|tx${i}`, k / 4), y + a * ruido1d(`${seed}|ty${i}`, k / 4)]));
}

export function nPontos(s) {
  const n = s.base.pontos === 'auto' ? 2 * s.codigos.filter((c) => c.modo === 'colar').length + 1 : s.base.pontos;
  return clamp(Math.round(n), 3, 24);
}

// Sigilo da magia `m` pelo sistema `sist`, em [-1,1].
export function desenharSistema(sist, m, seed = 0, ctx) {
  if (!sist || sist.classico) return sigilo(m, seed);
  const s = completar(sist), attrs = atributos(m);
  const temColar = s.codigos.some((c) => c.modo === 'colar');
  const N = nPontos(s), a0 = -Math.PI / 2 + TAU * (s.base.inicio + 0.5 / N);
  const base = temColar ? Array.from({ length: N }, (_, i) => polar(s.base.raio, a0 + (TAU * i) / N)) : [];
  const tr = [
    ...(s.molduras.length ? circuloMagico({ x: 0, y: 0, l: D, a: D }, { aneis: s.molduras }, `${seed}|moldura`) : []),
    ...s.codigos.flatMap((c, i) => codigo(c, i, s, attrs, base, seed)),
    ...nomeTracos(s, m, `${seed}|${m.id}`, ctx),
    ...ornamentos(s, base),
  ];
  if (temColar && s.base.marcador) {
    const rp = 0.025 * R;
    base.forEach((p, i) => tr.push(circ(p[0], p[1], rp, 10), ...(i === 0 ? [circ(p[0], p[1], rp * 0.4, 8)] : [])));
  }
  return limpar(tremer(tr, s.traco.firmeza, `${seed}|${m.id}`)).map((t) => t.map(([x, y]) => [(x - R) / R, (y - R) / R]));
}

// Controles escalares do sistema. `caminho` = onde o valor mora no objeto Sistema (a oficina lê e grava por ele).
// Prévia: o sistema atual (ctx.sistema) ou, sem ele, o colar com nome em kamea, num raio de 10 mm.
const PREVIA = { ...PRESETS.colar, nomeMagia: { modo: 'kamea', escala: 0.3, ordem: 4 } };
export function gravarEm(s, caminho, v) {
  const [a, b] = caminho;
  return { ...s, [a]: { ...(s[a] ?? {}), [b]: v } };
}
const pv = (caminho, conv = (v) => v) => (v, ctx) => {
  const s = gravarEm(completar(ctx?.sistema?.classico ? PREVIA : ctx?.sistema ?? PREVIA), caminho, conv(v));
  return desenharSistema(s, ctx?.magia ?? { id: 'previa', nome: 'previa', nivel: 3, escola: 'V' }, 1, ctx).map((t) => t.map(([x, y]) => [x * 10, y * 10]));
};
const auto = (v) => (v ? v : 'auto');
const op = (lista) => lista.map((valor) => ({ valor, rotulo: valor }));
export const PARAMS = [
  { chave: 'pontos', caminho: ['base', 'pontos'], ler: (v) => (v === 'auto' ? 0 : v), conv: auto, grupo: 'base', nivel: 'basico', tipo: 'faixa', min: 0, max: 24, passo: 1, padrao: 0, rotulo: 'pontos da base', ajuda: 'Quantos pontos o círculo-base tem. 0 = automático (2 × códigos em colar + 1, para cada passo de corda ser único).', previa: pv(['base', 'pontos'], auto) },
  { chave: 'raioBase', caminho: ['base', 'raio'], grupo: 'base', nivel: 'basico', tipo: 'faixa', min: 0.3, max: 0.9, passo: 0.02, padrao: 0.62, rotulo: 'raio da base', ajuda: 'Tamanho do círculo de pontos, como fração do sigilo.', previa: pv(['base', 'raio']) },
  { chave: 'inicio', caminho: ['base', 'inicio'], grupo: 'base', nivel: 'avancado', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: 0, rotulo: 'giro', ajuda: 'Gira a base e as estrelas, em frações de volta. 0 = ponto inicial no topo.', previa: pv(['base', 'inicio']) },
  { chave: 'marcador', caminho: ['base', 'marcador'], grupo: 'base', nivel: 'basico', tipo: 'marca', padrao: true, rotulo: 'marcar os pontos', ajuda: 'Desenha um círculo pequeno em cada ponto da base; o ponto inicial ganha um segundo círculo para mostrar a orientação.', previa: pv(['base', 'marcador']) },
  { chave: 'formaLinha', caminho: ['linha', 'forma'], grupo: 'linha', nivel: 'basico', tipo: 'opcao', padrao: 'arco', opcoes: op(['reta', 'arco']), rotulo: 'forma das cordas', ajuda: 'Cordas do colar em linha reta ou em arco.', previa: pv(['linha', 'forma']) },
  { chave: 'curva', caminho: ['linha', 'curva'], grupo: 'linha', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.05, padrao: 0.35, rotulo: 'curvatura', ajuda: 'Quanto as cordas em arco se curvam. 0 = retas.', previa: pv(['linha', 'curva']) },
  { chave: 'zero', caminho: ['linha', 'zero'], grupo: 'linha', nivel: 'avancado', tipo: 'opcao', padrao: 'omitir', opcoes: op(['omitir', 'pontilhado']), rotulo: 'bit 0', ajuda: 'O que desenhar onde o código binário tem 0: nada, ou três traços curtos (pontilhado). Pontilhado dobra o tempo de plotagem.', previa: pv(['linha', 'zero']) },
  { chave: 'modoNome', caminho: ['nomeMagia', 'modo'], grupo: 'nome', nivel: 'basico', tipo: 'opcao', padrao: 'nenhum', opcoes: op(['nenhum', 'kamea', 'roda', 'spare', 'anel']), rotulo: 'nome da magia', ajuda: 'Como o nome entra no sigilo: kamea (caminho no quadrado mágico), roda (anéis de letras), spare (monograma) ou anel (escrito na borda).', previa: pv(['nomeMagia', 'modo']) },
  { chave: 'escalaNome', caminho: ['nomeMagia', 'escala'], grupo: 'nome', nivel: 'basico', tipo: 'faixa', min: 0.1, max: 0.6, passo: 0.02, padrao: 0.3, rotulo: 'tamanho do nome', ajuda: 'Tamanho do desenho do nome, como fração do sigilo. No modo anel, é a largura da faixa de letras.', previa: pv(['nomeMagia', 'escala']) },
  { chave: 'complexidade', caminho: ['traco', 'complexidade'], grupo: 'traco', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.05, padrao: 0.3, rotulo: 'complexidade', ajuda: 'Acima de 0,5 acrescenta um anel de pontos; acima de 0,8, um anel de runas. Vem da Inteligência na ficha.', previa: pv(['traco', 'complexidade']) },
  { chave: 'ornamento', caminho: ['traco', 'ornamento'], grupo: 'traco', nivel: 'basico', tipo: 'faixa', min: 0, max: 1, passo: 0.05, padrao: 0.3, rotulo: 'ornamento', ajuda: 'Acima de 0,4 põe nós nos pontos da base; acima de 0,75, uma onda na borda. Vem do Carisma na ficha.', previa: pv(['traco', 'ornamento']) },
  { chave: 'firmeza', caminho: ['traco', 'firmeza'], grupo: 'traco', nivel: 'basico', tipo: 'faixa', min: 0.5, max: 1, passo: 0.05, padrao: 1, rotulo: 'firmeza', ajuda: 'Mão firme (1) ou trêmula (0,5): o traço do sigilo oscila até 0,3 mm. Vem da Destreza na ficha.', previa: pv(['traco', 'firmeza']) },
];
