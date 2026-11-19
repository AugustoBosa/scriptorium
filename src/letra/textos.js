// Texto modelo da "Minha letra": palavras reais escolhidas de um corpus da língua para expor,
// em uso real, os pares de letras (conexões) e as letras no início e no fim de palavra.
// O texto não precisa fazer sentido; precisa repetir cada padrão comum algumas vezes.
// Outra língua = outro corpus no script scripts/gerar-texto-modelo.mjs; este módulo não sabe de língua.
import { rng } from '../rng.js';

// Padrões de uma palavra (minúscula): "^a" = começa com a, "a$" = termina com a, "ab" = par dentro da palavra.
export function padroes(p) {
  const s = [...p], r = ['^' + s[0], s.at(-1) + '$'];
  for (let i = 1; i < s.length; i++) r.push(s[i - 1] + s[i]);
  return r;
}

// Palavras do corpus em minúscula com contagem. Descarta nome próprio (nunca aparece em minúscula).
export function vocabulario(texto, { min = 2, max = 12 } = {}) {
  const conta = new Map(), minusc = new Set();
  for (const w of texto.match(/\p{L}+/gu) ?? []) {
    const l = w.toLowerCase();
    if (w === l) minusc.add(l);
    conta.set(l, (conta.get(l) ?? 0) + 1);
  }
  return new Map([...conta].filter(([w]) => minusc.has(w) && /^\p{Ll}+$/u.test(w) && [...w].length >= min && [...w].length <= max));
}

// Padrões mais frequentes até cobrir a fração pedida de cada tipo (pares, início, fim), pesando pela contagem da palavra.
export function alvos(vocab, cobertura = 0.9) {
  const tipos = { par: new Map(), ini: new Map(), fim: new Map() };
  const tipo = (k) => (k[0] === '^' ? 'ini' : k.at(-1) === '$' ? 'fim' : 'par');
  for (const [w, n] of vocab) for (const k of padroes(w)) { const m = tipos[tipo(k)]; m.set(k, (m.get(k) ?? 0) + n); }
  const r = [];
  for (const m of Object.values(tipos)) {
    const tot = [...m.values()].reduce((a, b) => a + b, 0);
    let acc = 0;
    for (const [k, n] of [...m].sort((a, b) => b[1] - a[1])) { if (acc / tot >= cobertura) break; r.push(k); acc += n; }
  }
  return r;
}

// Escolha gulosa: a palavra que mais reduz a falta de padrões por letra escrita; cada palavra uma vez.
// ponytail: guloso O(palavras × escolhas), ok para corpus de dezenas de milhares de palavras
export function escolher(vocab, alvosLista, repeticoes = 3) {
  const falta = new Map(alvosLista.map((k) => [k, repeticoes]));
  const livres = new Set(vocab.keys()), escolhidas = [];
  for (;;) {
    let melhor = null, nota = 0;
    for (const w of livres) {
      let g = 0;
      for (const k of padroes(w)) if (falta.get(k) > 0) g++;
      const s = g / (w.length + 1);
      if (s > nota || (s === nota && melhor && w < melhor)) { melhor = w; nota = s; }
    }
    if (!melhor) break;
    livres.delete(melhor); escolhidas.push(melhor);
    for (const k of padroes(melhor)) if (falta.get(k) > 0) falta.set(k, falta.get(k) - 1);
  }
  return { palavras: escolhidas, faltando: [...falta].filter(([, n]) => n > 0).map(([k]) => k) };
}

// Embaralha (determinístico), põe uma maiúscula inicial para cada letra que puder e quebra em linhas.
export function montarTexto(palavras, { seed = 'texto-modelo', largura = 32 } = {}) {
  const r = rng(seed), ws = [...palavras];
  for (let i = ws.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ws[i], ws[j]] = [ws[j], ws[i]]; }
  const feitas = new Set();
  const final = ws.map((w) => {
    const c = [...w][0];
    if (feitas.has(c)) return w;
    feitas.add(c);
    return c.toUpperCase() + w.slice(c.length);
  });
  const linhas = [];
  for (const w of final) {
    if (linhas.length && (linhas.at(-1) + ' ' + w).length <= largura) linhas[linhas.length - 1] += ' ' + w;
    else linhas.push(w);
  }
  return linhas;
}
