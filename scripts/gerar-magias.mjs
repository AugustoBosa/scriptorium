// Gera dados/magias.json (fora do git) a partir dos JSON de magias do 5etools.
// Uso: node scripts/gerar-magias.mjs [pasta-das-magias]
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizar } from '../src/magia.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = process.argv[2] ?? join(raiz, '..', '..', 'dnd', 'data', 'spells');
// dados/traducao-ptbr.txt: uma linha por magia, `id|Nome|Resumo`; magias do PHB podem vir sem o sufixo -phb.
const arqTrad = join(raiz, 'dados', 'traducao-ptbr.txt');
const trad = {};
if (existsSync(arqTrad)) {
  for (const linha of readFileSync(arqTrad, 'utf8').split(/\r?\n/)) {
    if (!linha.trim() || linha.startsWith('#')) continue;
    const [id, nome, ...resto] = linha.split('|');
    trad[id] = { nome, resumo: resto.join('|') };
  }
}

// dados/trad-texto/NN.pt.txt: blocos `@@id`, linhas `T parágrafo` (texto) e `S parágrafo` (níveis superiores) em pt-BR.
const pastaTexto = join(raiz, 'dados', 'trad-texto');
const textos = {};
if (existsSync(pastaTexto)) {
  for (const f of readdirSync(pastaTexto).filter((n) => n.endsWith('.pt.txt'))) {
    let atual;
    for (const linha of readFileSync(join(pastaTexto, f), 'utf8').split(/\r?\n/)) {
      if (linha.startsWith('@@')) atual = textos[linha.slice(2)] = { T: [], S: [] };
      else if (atual && /^[TS] /.test(linha)) atual[linha[0]].push(linha.slice(2));
    }
  }
}

const magias = readdirSync(origem).filter((f) => f.endsWith('.json')).map((f) => {
  const id = f.slice(0, -5);
  const m = normalizar(JSON.parse(readFileSync(join(origem, f), 'utf8')), id, trad[id] ?? trad[id.replace(/-phb$/, '')]);
  const t = textos[id];
  if (t) { m.texto = t.T.join('\n'); m.superior = t.S.join('\n'); m.textoPt = true; }
  return m;
}).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

mkdirSync(join(raiz, 'dados'), { recursive: true });
writeFileSync(join(raiz, 'dados', 'magias.json'), JSON.stringify(magias));
const semTrad = magias.filter((m) => !m.resumo).length;
console.log(`${magias.filter((m) => !m.textoPt).length} magias com texto ainda em inglês`);
console.log(`${magias.length} magias em dados/magias.json (${semTrad} sem tradução)`);
