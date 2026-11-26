// Sugestão de letra e de execução a partir da ficha D&D. Puro: sem DOM.
import { CLASSES, ANTECEDENTES, RACAS, ESCRITAS, ARQ } from './dnd.js';
import { CATALOGO, ARQUETIPOS } from '../catalogo.js';
import { FONTES, SEM_ACENTOS } from '../fonte.js';
import { clamp } from '../geo.js';
import { NEUTRA, PARAMS } from '../motor/mao.js';

const achar = (lista, id) => lista.find((x) => x.id === id);
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const atr = (ficha, k) => ficha.atributos?.[k] ?? 10;
const m = (x) => (x - 10) / 4;

export function lei(ficha) {
  const a = ficha.alinhamento ?? '';
  return a.startsWith('L') ? 1 : a.startsWith('C') ? -1 : 0;
}

export function pesosArquetipo(ficha) {
  const cl = achar(CLASSES, ficha.classe), an = achar(ANTECEDENTES, ficha.antecedente);
  const bruto = ARQ.map((_, i) => (cl?.arq[i] ?? 0) + 1.5 * (an?.arq[i] ?? 0));
  const soma = bruto.reduce((s, v) => s + v, 0);
  return Object.fromEntries(ARQ.map((a, i) => [a, soma ? bruto[i] / soma : 0]));
}

export function alvosEixo(ficha) {
  const L = lei(ficha);
  const cal = ficha.ferramentas?.caligrafo ? 1 : 0;
  const v = (x) => clamp(r1(x), 1, 5);
  return {
    legibilidade: v(3 + m(atr(ficha, 'int'))),
    capricho: v(3 + m(atr(ficha, 'sab')) + L + cal),
    ornamento: v(2 + m(atr(ficha, 'car')) + cal),
    velocidade: v(3 + m(atr(ficha, 'des')) - 0.5 * L),
  };
}

export const CANDIDATOS = CATALOGO.filter((c) => c.ligacao !== 'titulo' && !SEM_ACENTOS.includes(c.fonte) && FONTES.includes(c.fonte));

export function pontuar(entrada, fonte) {
  if (entrada.obrigatoria && !entrada.ligacao.includes(fonte.ligacao)) return -Infinity;
  const pesos = entrada.pesos ?? {};
  let nota = 0;
  for (const a of Object.keys(pesos)) nota += pesos[a] * fonte.aptidao[a];
  for (const e of Object.keys(entrada.alvos)) nota -= 0.4 * Math.abs(fonte.eixos[e] - entrada.alvos[e]);
  if (entrada.ligacao.includes(fonte.ligacao)) nota += 1.5;
  return nota;
}

const ATR_EIXO = { legibilidade: 'int', capricho: 'sab', ornamento: 'car', velocidade: 'des' };
const TEXTO_EIXO = {
  legibilidade: (v) => `INT ${v} → clara`,
  capricho: (v) => `SAB ${v} → caprichada`,
  ornamento: (v) => `CAR ${v} → floreada`,
  velocidade: (v, alvo) => `DES ${v} → ${alvo >= 3 ? 'rápida' : 'lenta'}`,
};

// Até 3 motivos, na ordem: arquétipo, ligação, eixos (só atributo diferente de 10).
function motivos(ficha, entrada, item) {
  const out = [];
  const add = (t) => { if (out.length < 3) out.push(t); };
  const cl = achar(CLASSES, ficha.classe), an = achar(ANTECEDENTES, ficha.antecedente), raca = achar(RACAS, ficha.raca);

  let melhor = null;
  for (const a of ARQ) {
    const v = entrada.pesos[a] * item.aptidao[a];
    if (v > 0 && (!melhor || v > melhor.v)) melhor = { a, v };
  }
  if (melhor && item.aptidao[melhor.a] >= 2) {
    const i = ARQ.indexOf(melhor.a);
    const origem = (cl?.arq[i] ?? 0) >= (an?.arq[i] ?? 0) ? cl : an;
    add(`${origem.nome} → ${ARQUETIPOS[melhor.a].nome.toLowerCase()}`);
  }

  if (raca && raca.ligacao.includes(item.ligacao)) add(`${raca.nome} → ${item.ligacao}`);

  for (const e of Object.keys(ATR_EIXO)) {
    const alvo = entrada.alvos[e], v = atr(ficha, ATR_EIXO[e]);
    if (v !== 10 && Math.abs(item.eixos[e] - alvo) <= 0.5 + 1e-9) add(TEXTO_EIXO[e](v, alvo));
  }

  return out;
}

export function sugerirLetras(ficha) {
  const raca = achar(RACAS, ficha.raca);
  const entrada = { pesos: pesosArquetipo(ficha), alvos: alvosEixo(ficha), ligacao: raca?.ligacao ?? [] };
  return CANDIDATOS
    .map((item) => ({ fonte: item.fonte, item, nota: pontuar(entrada, item), motivos: motivos(ficha, entrada, item) }))
    .sort((a, b) => b.nota - a.nota);
}

export function propostas(ficha) {
  const rank = sugerirLetras(ficha);
  const top1 = rank[0], outras = rank.slice(1);
  const pesos = pesosArquetipo(ficha);

  const mesma = outras.find((r) => r.item.familia === top1.item.familia);
  const mistura = mesma
    ? { id: 'mistura', nome: 'Mistura', base: [{ fonte: top1.fonte, peso: 0.6 }, { fonte: mesma.fonte, peso: 0.4 }] }
    : { id: 'mistura', nome: 'Mistura', base: [{ fonte: top1.fonte, peso: 0.6 }, { fonte: rank[1].fonte, peso: 0.4 }], aviso: 'famílias diferentes misturam pior' };

  const a2 = [...ARQ].sort((x, y) => pesos[y] - pesos[x])[1];
  const Y = pesos[a2] === 0
    ? outras.find((r) => r.item.familia !== top1.item.familia) ?? outras[0]
    : outras.reduce((melhor, r) => (r.item.aptidao[a2] > melhor.item.aptidao[a2] ? r : melhor));

  return [
    { id: 'fiel', nome: 'Fiel', base: [{ fonte: top1.fonte, peso: 1 }] },
    mistura,
    { id: 'contraste', nome: 'Contraste', base: [{ fonte: Y.fonte, peso: 1 }] },
  ];
}

export function letrasDerivadas(ficha, base) {
  const top5 = sugerirLetras(ficha).slice(0, 5);
  // top5 vem ordenada por nota: reduce com > mantém a de melhor nota em caso de empate.
  const melhorPor = (f) => top5.reduce((m, r) => (f(r) > f(m) ? r : m));
  const caprichada = melhorPor((r) => r.item.eixos.capricho + r.item.eixos.legibilidade);
  const corrida = melhorPor((r) => r.item.eixos.velocidade);

  const escrita = {};
  for (const e of ESCRITAS) {
    if (!e.ligacao) continue;
    const entrada = { alvos: e.alvo, ligacao: e.ligacao, obrigatoria: true };
    const melhor = CANDIDATOS.reduce((m, item) => {
      const nota = pontuar(entrada, item);
      return nota > m.nota ? { item, nota } : m;
    }, { item: null, nota: -Infinity });
    escrita[e.id] = [{ fonte: melhor.item.fonte, peso: 1 }];
  }

  return {
    principal: base,
    caprichada: [{ fonte: caprichada.fonte, peso: 1 }],
    corrida: [{ fonte: corrida.fonte, peso: 1 }],
    escrita,
  };
}

// deltas em fração do intervalo [min, max] de cada chave de PARAMS.
export function aplicarDeltas(mao, deltas) {
  const out = {};
  for (const [chave, k] of Object.entries(deltas)) {
    const p = PARAMS.find((x) => x.chave === chave);
    out[chave] = r2(clamp(mao[chave] + k * (p.max - p.min), p.min, p.max));
  }
  return out;
}

export function execucao(ficha) {
  const des = atr(ficha, 'des'), con = atr(ficha, 'con'), sab = atr(ficha, 'sab');
  const L = lei(ficha);
  const idade = ficha.idade;
  // ponytail: NEUTRA.capricho = 1 é o teto; a ficha parte de 0,8 para a SAB ter efeito.
  const d = aplicarDeltas({ ...NEUTRA, capricho: 0.8 }, {
    tremor: 0.04 * Math.max(0, 10 - des) + (idade === 'idoso' ? 0.15 : idade === 'maduro' ? 0.05 : 0),
    capricho: 0.04 * Math.max(0, sab - 10) + 0.10 * L,
    pressa: 0.03 * Math.max(0, des - 10) + (L < 0 ? 0.10 : 0),
    desleixo: (L < 0 ? 0.15 : 0) + (L > 0 ? -0.10 : 0),
    variacao: L < 0 ? 0.10 : 0,
    fadiga: 0.04 * Math.max(0, 10 - con),
  });
  return { ...d, inclinacao: ficha.destro === false ? -5 : NEUTRA.inclinacao };
}

export function maoDaFicha(ficha, base) {
  return { ...structuredClone(NEUTRA), base: structuredClone(base), ...execucao(ficha) };
}
