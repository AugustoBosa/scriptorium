// Folha de coleta da "Minha letra", desenhada pela própria máquina em qualquer papel.
// Numa caneta só (a caneta guia) a máquina desenha: 4 marcas de canto, cabeçalho, linhas-guia,
// o texto a copiar (ou o rótulo de cada caixa) e um código de traços que diz que folha é.
// O app sabe a geometria exata de tudo isso: a leitura da foto (etapa 2) acha as marcas,
// endireita a folha e apaga as guias pela posição. Medidas em mm, y para baixo.
import { escreverEm, PAPEIS } from '../materiais/documento.js';
import { circulo } from '../geo.js';
import { NEUTRA } from '../motor/mao.js';
import { quebrar } from './textos.js';

export const MAO_GUIA = { ...NEUTRA, base: [{ fonte: 'HersheySans1', peso: 1 }] }; // letra simples e sem variação
export const TAM = 2.5; // mm: cabeçalho, texto a copiar e rótulos
const R = 3; // mm: raio da marca de canto
export const VARIANTES = 2; // folhas de letras soltas por modo
const LARG_CHAR = 1.1; // ponytail: largura média de uma letra escrita ≈ 1,1 × altura do x; calibrar com as primeiras fotos

export const TIPOS = [
  { id: 'N', tipo: 'texto', modo: 'natural', como: 'do seu jeito de sempre, ligando só o que você liga sem pensar' },
  { id: 'C', tipo: 'texto', modo: 'cursiva', como: 'tudo ligado, sem levantar a caneta dentro da palavra' },
  { id: 'F', tipo: 'texto', modo: 'forma', como: 'tudo separado, uma letra de cada vez' },
  { id: 'LC', tipo: 'letras', modo: 'cursiva', como: 'letras soltas cursivas, com a entrada e a saída que você faz' },
  { id: 'LF', tipo: 'letras', modo: 'forma', como: 'letras soltas de forma' },
];

// Caracteres das folhas de letras: letras da língua, as maiúsculas delas, dígitos e pontuação.
export const caracteres = (letras) => [...new Set([...letras, ...[...letras].map((c) => c.toUpperCase()), ...'0123456789', ...'.,;:!?\'"()-/&@#%*+=ªº'])];

// Código da folha: 16 bits = tipo (3) | parte (5) | altura do x em meios mm (5) | papel (3; 7 = outro).
// 3 bits = 7 papéis + 'outro'; oficio (8º) também vira 'outro' (a etapa 2 mede o tamanho pela foto)
const NOMES_PAPEL = Object.keys(PAPEIS).slice(0, 7);
const CAMPOS = [['tipo', 3], ['parte', 5], ['meioX', 5], ['papel', 3]];
export function codificar({ tipo, parte, x, papelNome }) {
  const v = { tipo: TIPOS.findIndex((t) => t.id === tipo), parte, meioX: Math.round(x * 2), papel: NOMES_PAPEL.includes(papelNome) ? NOMES_PAPEL.indexOf(papelNome) : 7 };
  return CAMPOS.flatMap(([k, n]) => {
    if (!(v[k] >= 0 && v[k] < 2 ** n)) throw new Error(`código da folha: ${k} fora da faixa (${v[k]})`);
    return Array.from({ length: n }, (_, i) => (v[k] >> (n - 1 - i)) & 1);
  });
}
export function decodificar(bits) {
  let i = 0;
  const v = Object.fromEntries(CAMPOS.map(([k, n]) => [k, bits.slice(i, (i += n)).reduce((a, b) => a * 2 + b, 0)]));
  return { tipo: TIPOS[v.tipo]?.id, parte: v.parte, x: v.meioX / 2, papelNome: v.papel === 7 ? 'outro' : NOMES_PAPEL[v.papel] };
}

const linha = (x0, x1, y) => [[x0, y], [x1, y]];
const tracejado = (x0, x1, y, traco, passo) => { const r = []; for (let x = x0; x + traco <= x1 + 1e-9; x += passo) r.push(linha(x, x + traco, y)); return r; };
const marca = (cx, cy, dupla) => [circulo(cx, cy, R), linha(cx - R - 1.5, cx + R + 1.5, cy), [[cx, cy - R - 1.5], [cx, cy + R + 1.5]], ...(dupla ? [circulo(cx, cy, R / 2)] : [])];

// Guias de uma faixa de escrita com base em y: base cheia e "x" tracejado. Sem linha de haste e de perna:
// a altura natural delas é dado a coletar, não regra a seguir.
// ponytail: cada traço do tracejado é uma levantada de caneta; espaçado para a folha sair em poucos minutos
export const guias = (x0, x1, base, x) => [...tracejado(x0, x1, base - x, 1.5, 5), linha(x0, x1, base)];

// Documento com as folhas de um tipo (N, C, F, LC ou LF). ctx = { fontes }. Cada página leva `coleta` com a geometria para a leitura.
export function comporColeta(lingua, ctx, { papel, papelNome, tipo = 'N', x = 4, caneta = 'vermelha', canetas }) {
  const T = TIPOS.find((t) => t.id === tipo);
  if (!T) throw new Error(`tipo de folha desconhecido: ${tipo}`);
  const m = papel.margens, x0 = m.esq, y0 = m.topo, x1 = papel.largura - m.dir, y1 = papel.altura - m.base;
  const topo = y0 + 2 * R + 4, fundo = y1 - 2 * R - 4, W = x1 - x0;
  const escrever = (texto, cx, cy, l = W) => escreverEm(texto, { x: cx, y: cy, l, a: TAM }, { tamanho: TAM }, ctx.fontes, MAO_GUIA);
  const avisos = [];

  // Conteúdo de cada página: { tracos (guias + modelo), linhas | celulas }.
  const paginas = [];
  if (T.tipo === 'texto') {
    const passo = TAM + 2 + 3 * x + Math.max(2, x / 2), porPagina = Math.floor((fundo - topo) / passo);
    if (porPagina < 1) throw new Error('papel pequeno demais para a altura do x escolhida');
    const linhas = quebrar(lingua.palavras, Math.max(8, Math.floor(W / (LARG_CHAR * x))));
    for (let i = 0; i < linhas.length; i += porPagina) {
      const tracos = [], meta = [];
      linhas.slice(i, i + porPagina).forEach((texto, k) => {
        const yL = topo + k * passo, base = yL + TAM + 2 + 2 * x;
        tracos.push(...escrever(texto, x0, yL), ...guias(x0, x1, base, x));
        meta.push({ n: i + k + 1, texto, base, x0, x1 });
      });
      paginas.push({ tracos, linhas: meta });
    }
  } else {
    const l = Math.max(3 * x, 8), a = TAM + 2 + 3 * x + 2, gap = Math.min(2, l * 0.15);
    const cols = Math.floor(W / l), rows = Math.floor((fundo - topo) / a), cap = cols * rows;
    if (cap < 1) throw new Error('papel pequeno demais para a altura do x escolhida');
    const chars = caracteres(lingua.letras);
    for (let v = 0; v < VARIANTES; v++) for (let i = 0; i < chars.length; i += cap) {
      const tracos = [], meta = [];
      chars.slice(i, i + cap).forEach((ch, k) => {
        const cx = x0 + (k % cols) * l, cy = topo + Math.floor(k / cols) * a, base = cy + TAM + 2 + 2 * x;
        tracos.push(...escrever(ch, cx + 0.5, cy, l), ...guias(cx + gap / 2, cx + l - gap / 2, base, x));
        meta.push({ ch, x: cx, y: cy, l, a, base, variante: v + 1 });
      });
      paginas.push({ tracos, celulas: meta });
    }
  }

  if (paginas.length > 31) throw new Error(`seriam ${paginas.length} folhas (máximo 31): use papel maior ou altura do x menor`);
  return {
    papel,
    canetas: { [caneta]: canetas[caneta] },
    paginas: paginas.map((p, i) => {
      const parte = i + 1, bits = codificar({ tipo, parte, x, papelNome });
      const marcas = [[x0 + R, y0 + R], [x1 - R, y0 + R], [x0 + R, y1 - R], [x1 - R, y1 - R]];
      const cab = escrever(`Scriptorium · minha letra · ${tipo}${parte} · ${T.modo} · x ${x} mm · ${lingua.lingua}`, x0 + 2 * R + 3, y0 + R - TAM / 2, W - 4 * R - 6);
      // Código: duas barras longas de entrada, 16 traços (longo = 1, curto = 0) e uma barra de saída, alinhados por baixo.
      const longo = 5, curto = 2.5, dx = 1.5, alturas = [longo, longo, ...bits.map((b) => (b ? longo : curto)), longo];
      const cx0 = (x0 + x1) / 2 - ((alturas.length - 1) * dx) / 2;
      const codigo = alturas.map((h, k) => [[cx0 + k * dx, y1], [cx0 + k * dx, y1 - h]]);
      return {
        camadas: [
          { id: 'marcas', caneta, personagem: null, ordem: 'escrita', tracos: [...marcas.flatMap(([cx, cy], k) => marca(cx, cy, k === 0)), ...codigo] },
          { id: 'guias', caneta, personagem: null, ordem: 'otimizada', tracos: [...cab, ...p.tracos] },
        ],
        coleta: { codigo: `${tipo}${parte}`, tipo, modo: T.modo, parte, x, bits, marcas, ...(p.linhas ? { linhas: p.linhas } : { celulas: p.celulas }) },
      };
    }),
    avisos,
  };
}
