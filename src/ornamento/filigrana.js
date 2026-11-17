// Filigrana: preenchimentos e ornamentos de linha. Todo gerador: (caixa, params, seed) → Traco[] em mm, y para baixo.
import { arco, circulo, encaixar, hachura, recortarCaixa } from '../geo.js';
import { rng } from '../rng.js';

export const P = { tipo: 'preenche', padrao: 'onda', separador: 'losango', passo: 2.5, petalas: 5, irregular: 0.2 };

const vazia = (c) => c.l <= 0 || c.a <= 0;

export function preencheLinha(c, params, seed) {
  if (vazia(c)) return [];
  const { padrao, passo, irregular } = { ...P, ...params };
  const n = Math.max(1, Math.floor(c.l / passo));
  const per = c.l / n, A = c.a / 2, yc = c.y + A, e = 0.35 * per;
  let tracos;
  if (padrao === 'onda') {
    const pts = [];
    for (let k = 0; k < n; k++) for (let j = 0; j < 8; j++) pts.push([c.x + ((k + j / 8) * per), yc + A * Math.sin((2 * Math.PI * j) / 8)]);
    tracos = [[...pts, [c.x + c.l, yc]]];
  } else if (padrao === 'ziguezague') {
    tracos = [Array.from({ length: 2 * n + 1 }, (_, k) => [c.x + (k * per) / 2, yc + (k % 2 ? A : -A)])];
  } else if (padrao === 'lacos') {
    const pts = Array.from({ length: 12 * n + 1 }, (_, k) => {
      const th = (2 * Math.PI * k) / 12;
      return [c.x + e + ((c.l - 2 * e) * th) / (2 * Math.PI * n) - e * Math.sin(th), yc - A * Math.cos(th)];
    });
    // ponytail: a trocóide para em x+l−e; traço reto de fecho até a borda (DoD: termina no fim da caixa)
    tracos = [[...pts, [c.x + c.l, pts[pts.length - 1][1]]]];
  } else {
    const r = Math.min(A, per / 4);
    tracos = Array.from({ length: n }, (_, k) => circulo(c.x + (k + 0.5) * per, yc, r, 8));
    // ponytail: último círculo para em x+l−per/4; traço reto de fecho até a borda
    tracos.push([tracos[n - 1][8], [c.x + c.l, yc]]);
  }
  const ruido = rng(seed + '|irr');
  const amp = 2 * irregular * 0.08 * Math.min(c.a, passo);
  tracos = tracos.map((t) => t.map(([x, y]) => [x + (ruido() - 0.5) * amp, y + (ruido() - 0.5) * amp]));
  return recortarCaixa(tracos, c);
}

export function peDeMosca(c, params, seed) {
  if (vazia(c)) return [];
  const bojo = arco(0.45, 0.3, 0.3, Math.PI / 2, (3 * Math.PI) / 2, 12);
  const tudo = [
    bojo,
    [[0.45, 0], [0.45, 1]],
    [[0.65, 0], [0.65, 1]],
    [[0.45, 0], [0.8, 0]],
    ...hachura(bojo, { espaco: 0.08, angulo: 45 }),
  ];
  return recortarCaixa(encaixar(tudo, c), c);
}

export function manicula(c, params, seed) {
  if (vazia(c)) return [];
  const tudo = [
    [[0, 0.25], [0.35, 0.25], [0.35, 0.85], [0, 0.85], [0, 0.25]],
    [[0.35, 0.3], [0.9, 0.3], [1, 0.22], [1.9, 0.22], [1.97, 0.3], [1.9, 0.38], [1.2, 0.38], [1.2, 0.42]],
    [[1.2, 0.42], [1.3, 0.45], [1.3, 0.55], [1.15, 0.56]],
    [[1.15, 0.56], [1.25, 0.6], [1.25, 0.68], [1.1, 0.7]],
    [[1.1, 0.7], [1.18, 0.74], [1.15, 0.82], [0.35, 0.8]],
    [[0.75, 0.3], [0.95, 0.42], [1.1, 0.4]],
  ];
  return recortarCaixa(encaixar(tudo, c), c);
}

export function florao(c, params, seed) {
  if (vazia(c)) return [];
  const { petalas } = { ...P, ...params };
  const R = Math.min(c.l, c.a) / 2, cx = c.x + c.l / 2, cy = c.y + c.a / 2;
  const rot = rng(seed + '|rot')() * 2 * Math.PI;
  const n = 16 * petalas;
  const pts = Array.from({ length: n + 1 }, (_, k) => {
    const th = rot + (2 * Math.PI * k) / n;
    const r = R * (0.55 + 0.45 * Math.cos(petalas * th));
    return [cx + r * Math.cos(th), cy + r * Math.sin(th)];
  });
  return recortarCaixa([pts, circulo(cx, cy, 0.12 * R, 10)], c);
}

export function separador(c, params, seed) {
  if (vazia(c)) return [];
  const p = { ...P, ...params };
  const a = c.a, cx = c.x + c.l / 2, cy = c.y + c.a / 2;
  if (p.separador === 'asteriscos') {
    const tudo = [];
    for (const dx of [-2 * a, 0, 2 * a]) {
      for (const phi of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
        const ux = (a / 2) * Math.cos(phi), uy = (a / 2) * Math.sin(phi);
        tudo.push([[cx + dx - ux, cy - uy], [cx + dx + ux, cy + uy]]);
      }
    }
    return recortarCaixa(tudo, c);
  }
  if (p.separador === 'losango') {
    const h = a / 2;
    const losango = [[cx - h, cy], [cx, cy - h], [cx + h, cy], [cx, cy + h], [cx - h, cy]];
    return recortarCaixa([[[c.x, cy], [cx - h, cy]], losango, [[cx + h, cy], [c.x + c.l, cy]]], c);
  }
  // onda: preenche-linha nas duas metades, florão no centro
  const w = (c.l - a) / 2;
  const tudo = [
    ...preencheLinha({ x: c.x, y: c.y, l: w, a }, { ...p, padrao: 'onda' }, seed + '|e'),
    ...preencheLinha({ x: cx + a / 2, y: c.y, l: w, a }, { ...p, padrao: 'onda' }, seed + '|d'),
    ...florao({ x: cx - a / 2, y: c.y, l: a, a }, p, seed),
  ];
  return recortarCaixa(tudo, c);
}

export function filigrana(c, params, seed) {
  const p = { ...P, ...params };
  const gerador = { preenche: preencheLinha, 'pe-de-mosca': peDeMosca, manicula, florao, separador }[p.tipo];
  return gerador(c, p, seed);
}

const caixaPrevia = (l, a) => ({ x: 0, y: 0, l, a });
const CAIXA_TIPO = {
  preenche: caixaPrevia(40, 6), separador: caixaPrevia(40, 6), 'pe-de-mosca': caixaPrevia(8, 10),
  manicula: caixaPrevia(16, 8), florao: caixaPrevia(10, 10),
};
const pv = (chave, caixa, extra = {}) => (v) => filigrana(caixa, { ...P, ...extra, [chave]: v }, 1);

export const PARAMS = [
  { chave: 'tipo', grupo: 'filigrana', nivel: 'basico', tipo: 'opcao', padrao: 'preenche', rotulo: 'tipo de filigrana',
    ajuda: 'Qual ornamento de linha desenhar: um preenchimento contínuo, pé-de-mosca, manícula, florão ou separador.',
    opcoes: [{ valor: 'preenche', rotulo: 'preenchimento' }, { valor: 'pe-de-mosca', rotulo: 'pé-de-mosca' }, { valor: 'manicula', rotulo: 'manícula' }, { valor: 'florao', rotulo: 'florão' }, { valor: 'separador', rotulo: 'separador' }],
    previa: (v) => filigrana(CAIXA_TIPO[v], { ...P, tipo: v }, 1) },
  { chave: 'padrao', grupo: 'filigrana', nivel: 'basico', tipo: 'opcao', padrao: 'onda', rotulo: 'padrão da linha',
    ajuda: 'Desenho que se repete no preenchimento: ondas, ziguezague, laços ou pontos.',
    opcoes: [{ valor: 'onda', rotulo: 'onda' }, { valor: 'ziguezague', rotulo: 'ziguezague' }, { valor: 'lacos', rotulo: 'laços' }, { valor: 'pontos', rotulo: 'pontos' }],
    previa: pv('padrao', caixaPrevia(40, 4), { tipo: 'preenche' }) },
  { chave: 'separador', grupo: 'filigrana', nivel: 'basico', tipo: 'opcao', padrao: 'losango', rotulo: 'desenho do separador',
    ajuda: 'Enfeite do separador: um losango no meio, três asteriscos ou uma onda com florão no centro.',
    opcoes: [{ valor: 'losango', rotulo: 'losango' }, { valor: 'asteriscos', rotulo: 'asteriscos' }, { valor: 'onda', rotulo: 'onda' }],
    previa: pv('separador', caixaPrevia(40, 6), { tipo: 'separador' }) },
  { chave: 'passo', grupo: 'filigrana', nivel: 'basico', tipo: 'faixa', min: 1, max: 6, passo: 0.1, padrao: 2.5, rotulo: 'passo do preenchimento',
    ajuda: 'Largura de cada repetição do preenchimento, em mm. Valores pequenos enchem mais; grandes deixam o desenho aberto.',
    previa: pv('passo', caixaPrevia(40, 4)) },
  { chave: 'petalas', grupo: 'filigrana', nivel: 'avancado', tipo: 'faixa', min: 3, max: 8, passo: 1, padrao: 5, rotulo: 'pétalas do florão',
    ajuda: 'Quantas pétalas tem o florão, de 3 a 8. Número ímpar ou par muda só a forma, não o tamanho.',
    previa: pv('petalas', caixaPrevia(10, 10), { tipo: 'florao' }) },
  { chave: 'irregular', grupo: 'filigrana', nivel: 'avancado', tipo: 'faixa', min: 0, max: 1, passo: 0.01, padrao: 0.2, rotulo: 'irregularidade',
    ajuda: 'Quanto a mão treme o desenho, de 0 a 1. 0 deixa o desenho exato; valores altos dão traço à mão livre.',
    previa: pv('irregular', caixaPrevia(40, 4), { padrao: 'ziguezague' }) },
];
