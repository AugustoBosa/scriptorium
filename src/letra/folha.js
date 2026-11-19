// Folha-guia da "Minha letra": onde cada caractere é escrito no caderno pontilhado (Tilibra, pontos a 5 mm).
// Medidas em PASSOS (1 passo = distância entre pontos) a partir do primeiro ponto útil, canto de cima à esquerda.
// Cada página do caderno guarda o conjunto inteiro uma vez: página 1 = variante 1, página 2 = variante 2...
// A leitura da foto (etapa 2) usa celulas() para saber onde cortar cada letra.

export const PASSO = 5; // mm entre pontos, medido pelo usuário

// Caderno 200 × 275 mm → 40 × 55 passos. Esquerda reserva 2 passos para os furos da argola.
// ponytail: margens chutadas; calibrar com a 1ª foto real (o nº exato de pontos por folha não foi contado)
export const GRADE = { colunas: 40, linhas: 55, margem: { esq: 2, dir: 1, topo: 1, base: 1 } };

// Caixa de uma letra: 4 × 4 passos. De cima para baixo: 2 passos de haste (maiúscula, b, d, l),
// linha de base, 1 passo de perna (g, p, q) e 1 passo livre entre fileiras. Altura do "x" = 1 passo (5 mm).
export const CAIXA = { largura: 4, altura: 4, base: 2, xAltura: 1 };

// Caracteres da folha: letras da língua (src/letra/linguas/<lingua>.json), as maiúsculas delas, dígitos e pontuação.
export const caracteres = (letras) => [...new Set([...letras, ...[...letras].map((c) => c.toUpperCase()), ...'0123456789', ...'.,;:!?\'"()-/&@#%*+=ªº'])];

// Linhas do texto modelo que cabem numa folha: 1 linha a cada altura de caixa (4 pontos de base a base).
export const LINHAS_POR_FOLHA = Math.floor((GRADE.linhas - GRADE.margem.topo - GRADE.margem.base) / CAIXA.altura);

// O usuário escreve ligado, separado e misturando: cada modo é uma folha (ou mais) com código próprio.
// O código vai escrito na margem de cima e é escolhido de novo ao enviar a foto (etapa 2).
// Ordem = prioridade: o modo natural mostra quais pares você liga de verdade; cursiva e forma completam os dois extremos.
export function coleta(nLinhasTexto) {
  const nTexto = Math.ceil(nLinhasTexto / LINHAS_POR_FOLHA);
  const folhas = (prefixo, n, tipo, modo, como) => Array.from({ length: n }, (_, i) => ({ codigo: `${prefixo}${i + 1}`, tipo, modo, como, parte: i + 1, partes: n }));
  return [
    ...folhas('N', nTexto, 'texto', 'natural', 'do seu jeito de sempre, ligando só o que você liga sem pensar'),
    ...folhas('C', nTexto, 'texto', 'cursiva', 'tudo ligado, sem levantar a caneta dentro da palavra'),
    ...folhas('F', nTexto, 'texto', 'forma', 'tudo separado, uma letra de cada vez'),
    ...folhas('LC', 2, 'letras', 'cursiva', 'letras soltas cursivas, com a entrada e a saída que você faz'),
    ...folhas('LF', 2, 'letras', 'forma', 'letras soltas de forma'),
  ];
}

// Uma célula por caractere, em passos. base = y da linha de base; xAltura = y do topo do "x".
export function celulas(caracteres) {
  const { colunas, linhas, margem } = GRADE;
  const porLinha = Math.floor((colunas - margem.esq - margem.dir) / CAIXA.largura);
  const fileiras = Math.floor((linhas - margem.topo - margem.base) / CAIXA.altura);
  if (caracteres.length > porLinha * fileiras) throw new Error(`cabem ${porLinha * fileiras} caracteres por página, pedidos ${caracteres.length}`);
  return caracteres.map((ch, i) => {
    const x = margem.esq + (i % porLinha) * CAIXA.largura, y = margem.topo + Math.floor(i / porLinha) * CAIXA.altura;
    return { ch, x, y, largura: CAIXA.largura, altura: CAIXA.altura, base: y + CAIXA.base, xAltura: y + CAIXA.base - CAIXA.xAltura };
  });
}

// SVG da folha-guia em mm (1:1 ao imprimir): pontos, caixas, linha de base, altura do "x" e o caractere de cada caixa.
export function svgFolha(caracteres) {
  const P = PASSO, W = GRADE.colunas * P, H = GRADE.linhas * P, f = (n) => +(n * P).toFixed(2);
  const pontos = [];
  for (let j = 0; j <= GRADE.linhas; j++) for (let i = 0; i <= GRADE.colunas; i++) pontos.push(`M${f(i)} ${f(j)}h0`);
  const caixas = celulas(caracteres).map((c) =>
    `<rect class="caixa" x="${f(c.x)}" y="${f(c.y)}" width="${f(c.largura)}" height="${f(c.altura - 1)}"/>`
    + `<path class="base" d="M${f(c.x)} ${f(c.base)}h${f(c.largura)}"/>`
    + `<path class="xalt" d="M${f(c.x)} ${f(c.xAltura)}h${f(c.largura)}"/>`
    + `<text x="${f(c.x) + 1}" y="${f(c.y) + 3}">${c.ch.replace(/[&<>"]/g, (m) => `&#${m.charCodeAt(0)};`)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="-2 -2 ${W + 4} ${H + 4}">`
    + '<style>.pontos{stroke:#999;stroke-width:.5;stroke-linecap:round}.caixa{fill:none;stroke:#c9b28a;stroke-width:.2}'
    + '.base{stroke:#8a3324;stroke-width:.25}.xalt{stroke:#8a3324;stroke-width:.15;stroke-dasharray:.8 .8}'
    + 'text{font:3px sans-serif;fill:#8a3324}</style>'
    + `<path class="pontos" d="${pontos.join('')}"/>${caixas}</svg>`;
}
