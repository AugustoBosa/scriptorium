// Fichas de espécimes do M20 (ciclo 22), §7 do projeto.md. Descartável: gera folha-1..5.svg e especimes.log ao lado deste arquivo.
// Rodar da raiz do repo: node workflow/ciclos/22/especimes.mjs
// Cada página é o próprio svgDocumento/gcodeDocumento aninhado na folha (mm), então a ficha mostra o que a exportação faz.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFonte } from '../../../src/fonte.js';
import { NEUTRA } from '../../../src/motor/mao.js';
import { gerarAlfabeto } from '../../../src/arcano/alfabeto.js';
import { normalizar } from '../../../src/magia.js';
import { papel as fabricaPapel, validarDocumento, CANETAS } from '../../../src/materiais/documento.js';
import { comporCarta } from '../../../src/materiais/carta.js';
import { comporLivro, geometria } from '../../../src/materiais/livro.js';
import { comporSigilos } from '../../../src/materiais/sigilos.js';
import { comporGrimorio } from '../../../src/materiais/scroll.js';
import { caixasPalavras, rabisco } from '../../../src/materiais/notas.js';
import { otimizar, viagem } from '../../../src/maquina/otimizar.js';
import { gcodeDocumento, svgDocumento } from '../../../src/maquina/gcode.js';
import { PERFIS } from '../../../src/maquina/perfis.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(DIR, '../../..');
const lerFonte = (n) => parseFonte(readFileSync(join(RAIZ, 'fontes', n + '.svg'), 'utf8'), n);
const EMSBird = lerFonte('EMSBird'), EMSAllure = lerFonte('EMSAllure'), HersheyGothEnglish = lerFonte('HersheyGothEnglish');

// Contextos: os mesmos dos testes (carta.test, livro.test, sigilos.test, scroll-doc.test).
const CTX_CARTA = {
  fontes: { EMSBird, EMSAllure },
  mao: { ...NEUTRA, seed: 3, base: [{ fonte: 'EMSBird', peso: 1 }], tremor: 0.05, ondulacao: 0.3, deriva: 0.3, variacao: 0.3 },
  maoNotas: { ...NEUTRA, seed: 5, base: [{ fonte: 'EMSAllure', peso: 1 }], tremor: 0.2 },
};
const CTX_LIVRO = { fontes: { EMSBird, HersheyGothEnglish }, mao: { ...NEUTRA, seed: 7, base: [{ fonte: 'EMSBird', peso: 1 }] } };
const CTX_SIG = { fontes: { EMSBird }, mao: { ...NEUTRA, seed: 1, base: [{ fonte: 'EMSBird', peso: 1 }] } };
const CTX_GRI = {
  fontes: { EMSBird, arcano: gerarAlfabeto({ seed: 3 }) },
  mao: { ...NEUTRA, seed: 0, base: [{ fonte: 'EMSBird', peso: 1 }] },
  maoArcana: { ...NEUTRA, base: [{ fonte: 'arcano', peso: 1 }] },
  seed: 1,
};

const TEXTO1 = 'Querida Ana, recebi {~ontem~>hoje} a sua carta da vila{nota: curta} e li duas vezes na varanda. A lua cheia sobe devagar sobre o mar e ilumina os barcos no porto velho, onde ninguém passa a essa hora. Os sinos da igreja {o:branca} tocam sozinhos desde a manhã, e as gaivotas voltam para os telhados como se nada tivesse mudado{nota: esta é longa de propósito e ocupa três linhas da margem}. Guardo o cheiro de {_sal_} nas mãos{nota: desce} e tenho saudade dos dias lentos à beira do cais.';
const TEXTO2 = 'A lua sobe sobre o mar e os barcos dormem no porto velho enquanto o vento leva o cheiro de sal pelas ruas estreitas da vila, onde as janelas se fecham uma a uma e só a igreja segue acesa até o amanhecer. Ninguém sabe quem acende a vela branca no alto do morro, mas todos juram tê-la visto na noite em que o mar subiu até a praça.';
const TEXTO3 = 'Barovia dorme sob a neblina desde o último inverno. Os camponeses fecham as portas antes do pôr do sol e ninguém se atreve a seguir a estrada que sobe até o castelo. Dizem que o senhor da casa espera por visitas há séculos, e que cada visita traz consigo um pouco da luz que ainda resta no vale. ';
const FRASES = 'abracadabra\neu sou forte\nproteção\nluz da lua\nsol\nmar e céu\npaz';

const bruta = {
  name: 'Fireball', source: 'PHB', level: 3, school: 'V',
  time: [{ number: 1, unit: 'action' }],
  range: { type: 'point', distance: { type: 'feet', amount: 150 } },
  components: { v: true, s: true, m: { text: 'gold dust', cost: 2500, consume: true } },
  duration: [{ type: 'timed', duration: { type: 'minute', amount: 1 }, concentration: true }],
  entries: ['Each creature takes {@damage 8d6} fire damage. '.repeat(2), { type: 'list', items: ['um {@condition prone|PHB|caído}'] }],
  entriesHigherLevel: [{ type: 'entries', name: 'At Higher Levels', entries: ['Increases by {@scaledamage 8d6|3-9|1d6}.'] }],
  savingThrow: ['dexterity'], damageInflict: ['fire'], meta: { ritual: true },
  classes: { class: [{ name: 'Wizard', source: 'PHB' }] },
};
const bola = normalizar(bruta, 'fireball-phb', { nome: 'Bola de Fogo', resumo: 'Explosão de chamas.' });

// ---------- log ----------
const LOG = [];
const log = (...a) => { const s = a.join(' '); LOG.push(s); console.log(s); };
const pt = (v, d = 2) => Number(v).toFixed(d).replace('.', ',');
function logDoc(nome, doc) {
  const erros = validarDocumento(doc);
  log(`[${nome}] páginas=${doc.paginas.length} validar=${erros.length ? erros.join(' | ') : 'ok'}`);
  for (const a of doc.avisos ?? []) log(`  aviso: ${a}`);
}

// ---------- SVG ----------
const f = (v) => +Number(v).toFixed(3);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const T = (x, y, s, size = 2.5, cor = '#222') => `<text x="${f(x)}" y="${f(y)}" font-size="${size}" font-family="sans-serif" fill="${cor}">${esc(s)}</text>`;

// Página do Documento como <svg> aninhado (coordenadas em mm). vb = recorte para ampliar (s = fator de zoom).
function pagina(doc, i, { x, y, s = 1, camadas, extra = '', vb }) {
  const pg = doc.paginas[i], p = doc.papel;
  const svg = svgDocumento(pg, p, doc.canetas, { camadas });
  const [vx, vy, vw, vh] = vb ?? [0, 0, p.largura, p.altura];
  const fundo = `<rect x="0" y="0" width="${p.largura}" height="${p.altura}" fill="#fff" stroke="#aaa" stroke-width="0.3"/>`;
  const aberto = `<svg x="${f(x)}" y="${f(y)}" width="${f(vw * s)}" height="${f(vh * s)}" viewBox="${vx} ${vy} ${vw} ${vh}">${fundo}`;
  return svg.replace(/^<svg[^>]*>/, aberto).replace(/<\/svg>\s*$/, extra + '</svg>');
}
// Caixas das palavras (cinza tracejado): só na ficha, sobre a camada de texto.
function caixas(pg) {
  const t = pg.camadas.find((c) => c.id === 'texto');
  if (!t || !t.grupos) return '';
  return caixasPalavras(t.tracos, t.grupos).filter(Boolean)
    .map((c) => `<rect x="${f(c.x)}" y="${f(c.y)}" width="${f(c.l)}" height="${f(c.a)}" fill="none" stroke="#999" stroke-width="0.15" stroke-dasharray="0.8 0.6"/>`).join('');
}
function montarFolha(n, titulo, sub, W, H, els) {
  const barra = `<path d="M10 ${H - 8} H20 M10 ${H - 9} V${H - 7} M20 ${H - 9} V${H - 7}" fill="none" stroke="#000" stroke-width="0.3"/>` + T(21, H - 6.8, '10 mm', 2.2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n<rect width="${W}" height="${H}" fill="#fff"/>\n${T(10, 9, `Folha ${n} · ${titulo}`, 4, '#000')}\n${T(10, 15, sub, 2.4, '#555')}\n${els.join('\n')}\n${barra}\n</svg>\n`;
  writeFileSync(join(DIR, `folha-${n}.svg`), svg);
  log(`folha ${n} gravada: ${W}x${H} mm`);
}

// ---------- viagem e trocas ----------
const LINHAS_VIAGEM = [];
const trocasDe = (pg, papel) => { try { return gcodeDocumento(pg, papel, PERFIS.megaS).trocas; } catch (e) { return `n/a (${e.message})`; } };
function registrarViagem(rotulo, doc) {
  doc.paginas.forEach((pg, i) => {
    const tx = pg.camadas.find((c) => c.id === 'texto');
    if (!tx || !tx.tracos.length) return;
    const crua = viagem(tx.tracos);
    const escrita = viagem(otimizar(tx.tracos, 0.1, { ordem: 'escrita', grupos: tx.grupos }));
    const otim = viagem(otimizar(tx.tracos));
    LINHAS_VIAGEM.push({ rotulo: `${rotulo} p${i + 1}`, crua, escrita, otim, razao: escrita / otim, trocas: trocasDe(pg, doc.papel), traços: tx.tracos.length });
  });
}
const tabelaTexto = () => [
  'viagem no ar (mm), partindo de (0,0). escrita = otimizar(ordem escrita, grupos); otimizada = otimizar() padrão.',
  'material p#  traços  crua    escrita   otimizada  escrita÷otim  trocas(preta→vermelha)',
  ...LINHAS_VIAGEM.map((l) => l.crua === null
    ? `${l.rotulo.padEnd(12)} ${'-'.padStart(6)}  ${'-'.padStart(6)}  ${'-'.padStart(8)}  ${'-'.padStart(9)}  ${'-'.padStart(12)}  trocas ${l.trocas}`
    : `${l.rotulo.padEnd(12)} ${String(l.traços).padStart(6)}  ${pt(l.crua, 0).padStart(6)}  ${pt(l.escrita, 0).padStart(8)}  ${pt(l.otim, 0).padStart(9)}  ${pt(l.razao).padStart(12)}${l.razao > 1.5 ? ' ACIMA 1,5×' : ''}  ${l.trocas}`),
];

// ---------- Folha 1: carta anotada ----------
function folha1() {
  const A5 = fabricaPapel('A5');
  const doc = comporCarta(TEXTO1, CTX_CARTA, { papel: A5, tipo: 'anotacao', tamanho: 6, entrelinha: 1.6, seed: 1, conector: 'linha' });
  logDoc('carta anotada A5', doc);
  registrarViagem('carta', doc);
  const els = [T(10, 24, 'carta anotada A5 (anotação, margem direita), linha 6 mm, entrelinha 1,6; caixas cinza = palavras', 2.6), pagina(doc, 0, { x: 10, y: 30, extra: caixas(doc.paginas[0]) })];
  // conectores lado a lado: mesma frase, cada conector numa folha 120 × 46
  ['linha', 'chave', 'seta'].forEach((c, k) => {
    const pp = fabricaPapel('personalizado', { largura: 120, altura: 46, margem: 6 });
    const d = comporCarta('a lua cheia{nota: nota} sobe devagar sobre o mar', CTX_CARTA, { papel: pp, tipo: 'anotacao', tamanho: 5, entrelinha: 1.6, seed: 1, conector: c, espontaneo: 0 });
    logDoc(`conector ${c}`, d);
    const y = 30 + k * 70;
    els.push(T(168, y - 4, `conector: ${c}`, 3.2, '#000'), pagina(d, 0, { x: 168, y, extra: caixas(d.paginas[0]) }));
  });
  montarFolha(1, 'carta anotada', 'notas em vermelha (caneta rubrica); correção, sublinhado (sal) e laço (branca); faixa de notas à direita', 300, 240, els);
}

// ---------- Folha 2: espontâneo e diário; rabiscos ampliados ----------
function folha2() {
  const A6 = fabricaPapel('A6');
  const els = [];
  const colunas = [
    ['espontâneo 0', { tipo: 'anotacao', espontaneo: 0 }],
    ['espontâneo 0,5', { tipo: 'anotacao', espontaneo: 0.5 }],
    ['espontâneo 1', { tipo: 'anotacao', espontaneo: 1 }],
    ['diário (margem esq.)', { tipo: 'diario' }],
  ];
  colunas.forEach(([rotulo, cfg], k) => {
    const d = comporCarta(TEXTO2, CTX_CARTA, { papel: A6, tamanho: 5, entrelinha: 1.6, seed: 1, ...cfg });
    logDoc(`espontâneo ${rotulo}`, d);
    const x = 10 + k * 115;
    els.push(T(x, 24, rotulo, 3), pagina(d, 0, { x, y: 28, extra: caixas(d.paginas[0]) }));
  });
  els.push(T(10, 196, 'rabiscos ampliados 3× (geometria 20 mm → 60 mm, caneta 0,4 mm sem ajuste)', 3));
  ['espiral', 'estrela', 'caixa', 'flor'].forEach((tipo, k) => {
    const pp = { largura: 20, altura: 20, margens: { topo: 0, dir: 0, base: 0, esq: 0 } };
    const d = { papel: pp, canetas: { preta: CANETAS.preta }, paginas: [{ camadas: [{ id: tipo, caneta: 'preta', tracos: rabisco(tipo, { x: 0, y: 0, l: 20, a: 20 }, 1) }] }] };
    const x = 10 + k * 75;
    els.push(T(x, 206, tipo, 3), pagina(d, 0, { x, y: 210, s: 3 }));
  });
  montarFolha(2, 'espontâneo, diário e rabiscos', 'espontâneo 0 / 0,5 / 1 com seed 1, mesmo texto; diário com margem à esquerda; última linha: rabiscos a 3×', 470, 290, els);
}

// ---------- Folha 3: livro ----------
function folha3() {
  const A6 = fabricaPapel('A6');
  const base = { papel: A6, tamanho: 4, entrelinha: 1.5, titulo: 'Barovia', inicio: 5 };
  const cfgA = { ...base, capitular: { estilo: 'lombarda', linhas: 3 }, borda: { estilo: 'vinha', largura: 6 } };
  let txt = TEXTO3, a = comporLivro(txt, CTX_LIVRO, cfgA);
  while (a.paginas.length < 4) { txt += TEXTO3; a = comporLivro(txt, CTX_LIVRO, cfgA); }
  logDoc('livro 1 coluna, lombarda, vinha', a);
  registrarViagem('livro 1c', a);
  const b = comporLivro(txt, CTX_LIVRO, { ...base, colunas: 2, capitular: { estilo: 'habitada', linhas: 3 } });
  logDoc('livro 2 colunas, habitada', b);
  registrarViagem('livro 2c', b);
  const els = [];
  for (let i = 0; i < 4; i++) {
    const x = 10 + i * 115;
    els.push(T(x, 24, `1 coluna · pág. ${i + 1}`, 3), pagina(a, i, { x, y: 28, extra: caixas(a.paginas[i]) }));
  }
  for (let i = 0; i < Math.min(2, b.paginas.length); i++) {
    const x = 10 + i * 115;
    els.push(T(x, 196, `2 colunas · pág. ${i + 1}`, 3), pagina(b, i, { x, y: 200, extra: caixas(b.paginas[i]) }));
  }
  // rodapé da página 2 (1 coluna) ampliado 3×: número, reclamo e borda
  const G = geometria(A6, cfgA), pe = G.pe, zx = 245;
  const vb = [G.util.x - 1, pe.y - 3, G.util.l + 2, pe.a + 6];
  els.push(T(zx, 196, 'rodapé da pág. 2, ampliado 3×', 3), pagina(a, 1, { x: zx, y: 200, s: 3, vb, extra: caixas(a.paginas[1]) }));
  montarFolha(3, 'livro A6', 'capitular e cabeçalho em vermelho (rubrica); número e reclamo no pé; 1 e 2 colunas; caixas cinza = palavras', 520, 370, els);
}

// ---------- Folha 4: sigilos A5 ----------
function folha4() {
  const A5 = fabricaPapel('A5');
  const els = [];
  ['selo', 'sigilo', 'circulo'].forEach((tipo, k) => {
    const d = comporSigilos(FRASES, CTX_SIG, { papel: A5, tipo, colunas: 3, legendas: true, tamanhoLegenda: 3, seed: 1 });
    logDoc(`sigilos ${tipo}`, d);
    const x = 10 + k * 160;
    els.push(T(x, 24, tipo + (tipo === 'sigilo' ? ' (kamea)' : ''), 3.2), pagina(d, 0, { x, y: 28 }));
  });
  montarFolha(4, 'folha de sigilos A5', '3 colunas, 7 frases, legenda de 3 mm centrada; selo, sigilo kamea e círculo', 490, 260, els);
}

// ---------- Folha 5: grimório no Documento + viagem ----------
function folha5() {
  const A6 = fabricaPapel('A6');
  const d = comporGrimorio([bola], CTX_GRI, { papel: A6, tamanho: 3 });
  logDoc('grimório A6', d);
  d.paginas.forEach((pg, i) => LINHAS_VIAGEM.push({ rotulo: `grimório p${i + 1}`, crua: null, escrita: null, otim: null, razao: null, trocas: trocasDe(pg, A6), traços: 0 }));
  const els = [
    T(10, 24, 'combinado', 3), pagina(d, 0, { x: 10, y: 28 }),
    T(125, 24, 'só texto (preta)', 3), pagina(d, 0, { x: 125, y: 28, camadas: ['texto'] }),
    T(240, 24, 'só moldura (preta)', 3), pagina(d, 0, { x: 240, y: 28, camadas: ['moldura'] }),
    T(355, 24, 'só sigilo (vermelha)', 3), pagina(d, 0, { x: 355, y: 28, camadas: ['sigilo'] }),
  ];
  const tab = tabelaTexto();
  tab.forEach((linha, k) => els.push(T(10, 190 + k * 4.2, linha, k === 1 ? 2.6 : 2.4, k <= 1 ? '#000' : '#222')));
  log('--- viagem e trocas ---');
  tab.forEach((l) => log(l));
  montarFolha(5, 'grimório no Documento', 'camadas texto (preta), moldura (preta), sigilo (vermelha); exportadas por camada lado a lado', 470, 190 + (tab.length + 2) * 4.2, els);
}

folha1();
folha2();
folha3();
folha4();
folha5();
writeFileSync(join(DIR, 'especimes.log'), LOG.join('\n') + '\n');
