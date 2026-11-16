import { glifo } from './mao.js';
import { variante, deformar, escalar, encaixe, vaoMin, arrematar } from './contexto.js';
import { rng, ruido1d } from '../rng.js';

// Amplitudes (chute calibrado no papel só pelo usuário).
const TAM_DERIVA = 0.08, INC_DERIVA = 6, ONDULACAO = 0.15, TREMOR_FADIGA = 0.02, DOBRADA = 0.93, INICIAL = 0.12;

// Escreve uma palavra: medir (largura) e desenhar (glifos, s, tan, dy, tremor) usam este mesmo objeto. Pura: não altera cont.
// ctx = { fontes, mao (completa), tamanho, cont = Map, indice, t, F, alvo? }
export function escreverPalavra(palavra, ctx) {
  const { fontes, mao, tamanho, cont = new Map(), indice = 0, t = 0, F = 0 } = ctx;
  const m = F > 0 ? { ...mao, desleixo: Math.min(1, mao.desleixo + 0.5 * F), capricho: Math.max(0, mao.capricho - 0.5 * F) } : mao;
  const K = m.alternativas, der = Math.min(1, m.deriva + 0.5 * F), sd = m.seed;
  const s = der > 0 ? tamanho * (1 + TAM_DERIVA * der * ruido1d(sd + '|tam', t)) : tamanho; // tamanho ANTES de medir
  const chars = [...palavra], loc = new Map(), glifos = [];
  chars.forEach((ch, i) => {
    const n = (cont.get(ch) ?? 0) + (loc.get(ch) ?? 0);
    loc.set(ch, (loc.get(ch) ?? 0) + 1);
    let g = glifo(fontes, m, ch, n);
    if (K > 1 && g.tracos.length) {
      g = deformar(g, sd, ch, variante(sd, ch, n, K), m.altura);
      if (ch === chars[i - 1]) g = escalar(g, DOBRADA); // letra dobrada
    }
    if (m.contexto > 0 && i === 0 && /\p{L}/u.test(ch)) g = escalar(g, 1 + INICIAL * m.contexto); // inicial maior
    glifos.push(g);
  });
  if (m.arremate > 0 && glifos.length && /\p{L}/u.test(chars[chars.length - 1])) {
    arrematar(glifos[glifos.length - 1], m.arremate, rng(sd + '|arremate|' + indice));
  }
  if (m.contexto > 0) {
    if (ctx.alvo === undefined) { const n = glifo(fontes, mao, 'n', 0); ctx.alvo = vaoMin(n, n); }
    for (let i = 1; i < glifos.length; i++) {
      glifos[i - 1].adv = Math.max(0, glifos[i - 1].adv + encaixe(glifos[i - 1], glifos[i], m.contexto, ctx.alvo));
    }
  }
  let largura = 0;
  for (const g of glifos) largura += g.adv * s; // mesma soma do layout antigo
  return {
    texto: palavra, largura, s, glifos, F,
    tan: der > 0 ? Math.tan(INC_DERIVA * Math.PI / 180 * der * ruido1d(sd + '|inc', t)) : 0,
    dy: m.ondulacao > 0 ? ONDULACAO * m.ondulacao * tamanho * ruido1d(sd + '|base', t) : 0, // mm, + desce
    tremor: m.tremor + TREMOR_FADIGA * tamanho * F,
  };
}
