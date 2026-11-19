// Gera o texto modelo e as letras de uma língua para a aba "Minha letra".
// Uso: node scripts/gerar-texto-modelo.mjs <corpus.txt> <lingua> [cobertura=0.9] [repeticoes=3]
// Corpus = qualquer texto corrido da língua (quanto maior e mais variado, melhor). Saída: src/letra/linguas/<lingua>.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { vocabulario, alvos, escolher, montarTexto } from '../src/letra/textos.js';

const [corpus, lingua, cob = '0.9', rep = '3'] = process.argv.slice(2);
if (!corpus || !lingua) { console.error('uso: node scripts/gerar-texto-modelo.mjs <corpus.txt> <lingua> [cobertura] [repeticoes]'); process.exit(1); }

const texto = readFileSync(corpus, 'utf8');
const vocab = vocabulario(texto);
const lista = alvos(vocab, Number(cob));
const { palavras, faltando } = escolher(vocab, lista, Number(rep));
const letras = [...new Set(texto.toLowerCase().match(/\p{Ll}/gu))].sort((a, b) => a.localeCompare(b, lingua));
const saida = {
  lingua, cobertura: Number(cob), repeticoes: Number(rep), letras: letras.join(''),
  alvos: lista.length, faltando, linhas: montarTexto(palavras, { seed: 'texto-modelo|' + lingua }),
};
mkdirSync('src/letra/linguas', { recursive: true });
writeFileSync(`src/letra/linguas/${lingua}.json`, JSON.stringify(saida, null, 1) + '\n');
console.log(`${lingua}: ${vocab.size} palavras no vocabulário, ${lista.length} padrões-alvo, ${palavras.length} palavras escolhidas, ${saida.linhas.length} linhas, ${faltando.length} sem cobertura completa`);
