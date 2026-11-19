// Aba Minha letra: folha-guia das letras soltas e texto modelo (conexões em uso real) para o caderno pontilhado.
// Etapa 1 de 3 (próximas: ler a foto e gerar a fonte de traço único).
import './letra.css';
import { svgFolha, celulas, caracteres, coleta, LINHAS_POR_FOLHA, PASSO, CAIXA } from '../letra/folha.js';
import ptBR from '../letra/linguas/pt-BR.json';

const LINGUAS = { 'pt-BR': ptBR }; // nova língua: gerar o JSON com scripts/gerar-texto-modelo.mjs e somar aqui
const el = (tag, classe, texto) => { const e = document.createElement(tag); if (classe) e.className = classe; if (texto != null) e.textContent = texto; return e; };

function baixarSvg(svg, nome) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const a = el('a'); a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const botao = (texto, fn) => { const b = el('button', null, texto); b.type = 'button'; b.addEventListener('click', fn); return b; };
const lista = (itens) => { const o = el('ol', 'letra-passos'); o.append(...itens.map((t) => el('li', null, t))); return o; };

// Contrato de página: montar(el) → atualizar()
export function montar(raiz) {
  const lingua = LINGUAS['pt-BR'];
  const chars = caracteres(lingua.letras), svg = svgFolha(chars);
  const folha = el('div', 'letra-folha');
  folha.innerHTML = svg;
  const texto = el('ol', 'letra-texto');
  texto.append(...lingua.linhas.map((l) => el('li', null, l)));
  const plano = el('table', 'letra-plano');
  plano.innerHTML = '<thead><tr><th>Folha</th><th>O que escrever</th><th>Como</th></tr></thead>';
  const corpo = el('tbody');
  for (const f of coleta(lingua.linhas.length)) {
    const tr = el('tr'), ini = (f.parte - 1) * LINHAS_POR_FOLHA + 1;
    const oque = f.tipo === 'texto' ? `Texto modelo, linhas ${ini}–${Math.min(ini + LINHAS_POR_FOLHA - 1, lingua.linhas.length)}` : `Letras soltas, variante ${f.parte}`;
    tr.append(el('td', 'codigo', f.codigo), el('td', null, oque), el('td', null, `${f.modo[0].toUpperCase() + f.modo.slice(1)}: ${f.como}`));
    corpo.append(tr);
  }
  plano.append(corpo);

  raiz.append(
    el('h2', null, 'Minha letra'),
    el('p', 'letra-intro', 'Transforma a sua letra numa fonte de traço único. Etapa 1: escrever no caderno pontilhado as letras soltas e o texto modelo. A leitura da foto vem na próxima etapa.'),
    el('h3', null, 'Plano de coleta'),
    el('p', 'letra-intro', 'Você escreve ligado, separado e misturando, então a fonte guarda os três modos. Cada linha da tabela é uma folha do caderno. Escreva o código da folha na margem de cima. A ordem é a prioridade: comece pelas folhas N (o seu jeito natural).'),
    plano,
    el('h3', null, '1. Letras soltas (folhas LC e LF)'),
    lista([
      `Escreva só na frente da folha (o papel é fino).`,
      `Furos da argola à esquerda. Pule ${PASSO * 2} mm (2 pontos) da borda dos furos e 1 ponto nas outras bordas.`,
      `Cada caixa tem ${CAIXA.largura} × ${CAIXA.altura} pontos. Apoie a letra na linha vermelha; o "x" vai até a linha tracejada (1 ponto = ${PASSO} mm).`,
      `Escreva os ${celulas(chars).length} caracteres na ordem da folha-guia, um por caixa. Caixa sem letra: deixe vazia, não pule a ordem.`,
      `Use caneta escura (preta ou azul), não lápis.`,
    ]),
    (() => { const d = el('div', 'linha-botoes'); d.append(botao('Baixar folha-guia (SVG)', () => baixarSvg(svg, 'folha-guia-minha-letra.svg'))); return d; })(),
    folha,
    el('h3', null, '2. Texto modelo (folhas N, C e F)'),
    el('p', 'letra-intro', `Palavras reais escolhidas para mostrar como as suas letras se ligam: os ${lingua.alvos} padrões mais comuns do ${lingua.lingua} (pares de letras, começo e fim de palavra) aparecem ${lingua.repeticoes} vezes cada. O texto não faz sentido de propósito.`),
    lista([
      'Escreva o mesmo texto três vezes: N do seu jeito natural, C todo ligado, F todo separado. Use a velocidade de sempre e não capriche mais do que o normal.',
      `Cada folha leva ${LINHAS_POR_FOLHA} linhas do texto (veja a tabela do plano).`,
      'Uma linha do texto = uma linha do caderno, com a base sobre uma fileira de pontos. Deixe 3 fileiras livres entre as linhas (4 pontos de uma base à outra).',
      'Mesmas margens da folha de letras soltas. Se a linha não couber, continue na fileira seguinte e anote o número da linha na margem.',
    ]),
    texto,
  );
  return () => {};
}
