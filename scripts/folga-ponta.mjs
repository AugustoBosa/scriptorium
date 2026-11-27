// Simula a ponta da caneta com a folga do porta-caneta (src/maquina/folga.js) em todas as letras das 43 fontes e grava:
//   src/maquina/folga-fontes.js            tabela do tamanho mínimo legível por fonte (o app lê daqui)
//   workflow/experimentos/folga/simulacao.html   página da simulação: letras ideal × ponta, animação da cabeça e da ponta
// Uso: node scripts/folga-ponta.mjs [r em mm = raioFolga()] [espessura da caneta = 0.4]
// Rode de novo quando mudar FOLGA_PORTA (hardware), DESVIO_MAX, RECONHECER ou as fontes. Leva alguns minutos.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseFonte, FONTES } from '../src/fonte.js';
import { raioFolga, letrasDa, tamanhoMinimo, DESVIO_MAX, RECONHECER } from '../src/maquina/folga.js';

const r = +(process.argv[2] ?? raioFolga()), esp = +(process.argv[3] ?? 0.4);
const fontes = {}, letras = {};
for (const n of FONTES) {
  const t0 = Date.now();
  letras[n] = letrasDa(parseFonte(readFileSync(new URL(`../fontes/${n}.svg`, import.meta.url), 'utf8'), n));
  fontes[n] = tamanhoMinimo(letras[n], r, esp);
  console.log(n.padEnd(28), fontes[n].minimo ?? 'nenhum', fontes[n].reprovadas.slice(0, 40), `${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

const tabela = { r: +r.toFixed(3), esp, desvioMax: DESVIO_MAX, reconhecer: RECONHECER, fontes };
writeFileSync(new URL('../src/maquina/folga-fontes.js', import.meta.url),
  `// Gerado por scripts/folga-ponta.mjs: não editar à mão. minimo = menor tamanho (mm) em que todas as letras ficam legíveis com a folga\n` +
  `// da ponta; null = nem 15 mm passa. reprovadas = letras que falham meio passo abaixo do mínimo (ou em 15 mm, se null).\n` +
  `export const FOLGA_FONTES = ${JSON.stringify(tabela, null, 1)};\n`);

// Página da simulação: o código de folga.js vai colado (sem export) e as letras em em, arredondadas.
const codigo = readFileSync(new URL('../src/maquina/folga.js', import.meta.url), 'utf8').replace(/^export /gm, '');
const arred = (v) => JSON.stringify(v, (k, x) => (typeof x === 'number' ? +x.toFixed(4) : x));
const pasta = new URL('../workflow/experimentos/folga/', import.meta.url);
mkdirSync(pasta, { recursive: true });
writeFileSync(new URL('simulacao.html', pasta), readFileSync(new URL('folga-ponta.html', import.meta.url), 'utf8')
  .replace('/*CODIGO*/', () => codigo)
  .replace('/*DADOS*/', () => `const TABELA = ${JSON.stringify(tabela)};\nconst LETRAS_FONTES = ${arred(letras)};`));
console.log('ok: src/maquina/folga-fontes.js e workflow/experimentos/folga/simulacao.html');
