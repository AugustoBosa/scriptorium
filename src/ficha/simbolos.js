// Ficha D&D → sistema de símbolos: a classe e o antecedente escolhem o preset; os atributos mudam o traço. Puro: sem DOM.
import { clamp } from '../geo.js';
import { dePreset } from '../arcano/presets.js';
import { lei } from './sugerir.js';

// Afinidade de cada classe e antecedente com os presets (pesos somados; antecedente vale 1,5×, como na letra).
const CLASSE = {
  mago: { transmutacao: 2, colar: 2 }, artifice: { colar: 2, transmutacao: 1 }, bruxo: { kamea: 3 }, feiticeiro: { spare: 2, colar: 1 },
  clerigo: { selo: 3 }, paladino: { selo: 3 }, druida: { colar: 1, spare: 2 }, patrulheiro: { spare: 2 }, bardo: { transmutacao: 1, spare: 2 },
  monge: { colar: 2 }, barbaro: { spare: 1 }, guerreiro: { selo: 1 }, ladino: { kamea: 1 },
};
const ANTECEDENTE = {
  acolito: { selo: 2 }, sabio: { transmutacao: 1, colar: 1 }, eremita: { kamea: 1, colar: 1 }, nobre: { selo: 2 }, artesao: { transmutacao: 1 },
  charlatao: { kamea: 1 }, criminoso: { kamea: 1 }, artista: { spare: 1 }, forasteiro: { spare: 1 }, soldado: { selo: 1 },
};

export function sugerirPreset(ficha = {}) {
  const soma = {};
  for (const [tab, k, f] of [[CLASSE, ficha.classe, 1], [ANTECEDENTE, ficha.antecedente, 1.5]]) {
    for (const [p, v] of Object.entries(tab[k] ?? {})) soma[p] = (soma[p] ?? 0) + v * f;
  }
  const melhor = Object.entries(soma).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return melhor?.[0] ?? 'classico';
}

const mod = (ficha, k) => ((ficha.atributos?.[k] ?? 10) - 10) / 10; // 8 → -0,2; 20 → +1
const r2 = (x) => Math.round(x * 100) / 100;

// INT → complexidade, CAR → ornamento, DES → firmeza; ordeiro gira a base para o topo exato, caótico desalinha.
export function modular(sistema, ficha = {}) {
  if (sistema.classico) return sistema;
  const s = structuredClone(sistema), L = lei(ficha);
  s.traco = {
    ...(s.traco ?? {}),
    complexidade: r2(clamp(0.3 + 0.6 * mod(ficha, 'int'), 0, 1)),
    ornamento: r2(clamp(0.3 + 0.6 * mod(ficha, 'car'), 0, 1)),
    firmeza: r2(clamp(0.85 + 0.3 * mod(ficha, 'des'), 0.5, 1)),
  };
  s.base = { ...(s.base ?? {}), inicio: L < 0 ? 0.04 : 0 };
  return s;
}

export const sugerirSistema = (ficha) => modular(dePreset(sugerirPreset(ficha)), ficha);

// Sistema em uso pelo personagem: o salvo nele, senão o sugerido pela ficha, senão o clássico.
export const sistemaDe = (p) => p?.simbolos ?? (p?.ficha ? sugerirSistema(p.ficha) : dePreset('classico'));
