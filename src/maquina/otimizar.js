import { ROTULOS, AJUDA } from '../ajuda.js';
import { valido, dist } from '../geo.js';

// Viagem no ar (mm), partindo de (0,0), na ordem dada.
export function viagem(tracos) {
  let pos = [0, 0], total = 0;
  for (const t of tracos.filter(valido)) { total += dist(pos, t[0]); pos = t[t.length - 1]; }
  return total;
}

// Escrita com grupos: blocos de palavra, guloso pela 1ª ponta mais perto; nunca inverte nem reordena dentro do bloco.
// ponytail: só guloso; 2-opt de blocos sem inversão se a viagem pesar
function blocosEscrita(tracos, grupos) {
  const cortes = [0, ...grupos, tracos.length];
  const rest = [];
  for (let i = 0; i < cortes.length - 1; i++) {
    const b = tracos.slice(cortes[i], cortes[i + 1]).filter(valido).map((t) => t.map((p) => [...p]));
    if (b.length) rest.push(b);
  }
  const saida = [];
  let pos = [0, 0];
  while (rest.length) {
    let m = 0;
    rest.forEach((b, i) => { if (dist(pos, b[0][0]) < dist(pos, rest[m][0][0])) m = i; });
    const [b] = rest.splice(m, 1);
    saida.push(...b);
    pos = b[b.length - 1].at(-1);
  }
  return saida;
}

// ponytail: guloso + 2-opt; completo até 2000 traços, janela de 50 acima (custo O(n²): 2465 traços ~2 s, 7600 ~30 s, travaria a prévia); até 5 passadas; Or-opt se a viagem ainda pesar
export function otimizar(tracos, tol = 0.1, { janela, ordem = 'otimizada', grupos } = {}) {
  if (ordem === 'escrita' && grupos) return blocosEscrita(tracos, grupos);
  if (ordem === 'escrita') return tracos.filter(valido).map((t) => t.map((p) => [...p]));
  const restantes = tracos.filter(valido).map((t) => t.map((p) => [...p]));
  let seq = [];
  let pos = [0, 0];
  while (restantes.length) {
    let melhor = -1, inverter = false, melhorD = Infinity;
    restantes.forEach((t, i) => {
      const dIni = dist(pos, t[0]), dFim = dist(pos, t[t.length - 1]);
      if (dIni < melhorD) { melhorD = dIni; melhor = i; inverter = false; }
      if (dFim < melhorD) { melhorD = dFim; melhor = i; inverter = true; }
    });
    const [t] = restantes.splice(melhor, 1);
    if (inverter) t.reverse();
    seq.push(t);
    pos = t[t.length - 1];
  }
  // 2-opt: inverte o trecho seq[i..j] (ordem e sentido de cada traço) se encurta a viagem.
  const ini = (k) => seq[k][0], fim = (k) => seq[k][seq[k].length - 1];
  const J = janela ?? (seq.length <= 2000 ? Infinity : 50);
  for (let passada = 0, melhorou = true; melhorou && passada < 5; passada++) {
    melhorou = false;
    for (let i = 0; i < seq.length; i++) {
      for (let j = i; j < Math.min(seq.length, i + J); j++) {
        const a = i ? fim(i - 1) : [0, 0];
        const antes = dist(a, ini(i)) + (j + 1 < seq.length ? dist(fim(j), ini(j + 1)) : 0);
        const depois = dist(a, fim(j)) + (j + 1 < seq.length ? dist(ini(i), ini(j + 1)) : 0);
        if (depois < antes - 1e-9) {
          const trecho = seq.slice(i, j + 1).reverse();
          trecho.forEach((t) => t.reverse());
          seq.splice(i, j - i + 1, ...trecho);
          melhorou = true;
        }
      }
    }
  }
  const saida = [];
  for (const t of seq) {
    const ultimo = saida[saida.length - 1];
    if (ultimo && dist(ultimo[ultimo.length - 1], t[0]) <= tol) ultimo.push(...t.slice(1));
    else saida.push(t);
  }
  return saida;
}

// Prévia: traços de uma frase mais a viagem no ar (segmentos de 2 pontos) a partir de (0,0).
const comViagem = (t) => {
  let pos = [0, 0];
  const ar = [];
  for (const x of t) { ar.push([pos, x[0]]); pos = x[x.length - 1]; }
  return { fundo: t, foco: ar };
};
export const PARAMS = [
  { chave: 'otimizar', grupo: 'maquina', nivel: 'basico', tipo: 'marca', padrao: true, rotulo: ROTULOS.otimizar, ajuda: AJUDA.otimizar,
    previa: (v, ctx) => { const t = ctx.escrever(ctx.mao, 'mão viu'); return comViagem(v ? otimizar(t) : t); } },
  { chave: 'trajeto', grupo: 'maquina', nivel: 'avancado', tipo: 'marca', padrao: false, rotulo: 'mostrar trajeto',
    ajuda: 'Desenha na prévia o caminho da caneta no ar entre um traço e o próximo. Só aparece na tela; o desenho e o G-code não mudam.',
    previa: (v, ctx) => { const t = otimizar(ctx.escrever(ctx.mao, 'mão viu')); return v ? comViagem(t) : { fundo: t, foco: [] }; } },
];
