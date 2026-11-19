// Texto de exemplo de cada tipo de folha. Abre com o tipo e é trocado ao mudar de tipo, enquanto o usuário não editar.
export const EXEMPLOS = {
  carta: 'Querida Elena,\n\nChegamos à vila do moinho depois de três dias de estrada. O vento aqui cheira a trigo e a chuva, e as noites são frias. Amanhã seguimos para o norte, se o rio deixar.\n\nCom saudade,\nTomás',
  anotacao: 'Tinta ferrogálica\n\nMoer as galhas e deixar de molho por {_três dias_}. {nota: usar água da chuva} Juntar o sulfato de ferro aos poucos e mexer {~bem~>devagar}. A cor escurece ao secar no {o:papel}, então não corrigir antes de um dia.',
  diario: '12 de outubro\n\nAcordei antes do sol. O mosteiro estava em silêncio, só o sino da torre. {nota: perguntar ao irmão Anselmo} Copiei duas páginas do salmo e errei a capitular {~outra~>mais uma} vez. Amanhã começo de novo, com a pena nova.',
  livro: 'No tempo em que os rios ainda tinham nomes antigos, havia no alto do vale um scriptorium onde sete copistas trabalhavam à luz de velas. Cada um tinha a sua mão, e nenhum livro saía igual a outro.\n\nO mais velho escrevia devagar, com letras redondas e largas. O mais novo tinha pressa, e as suas linhas subiam para a direita como quem quer chegar ao fim da página antes do sino.\n\nNo inverno, a tinta engrossava no tinteiro e era preciso aquecê-la perto do fogo. No verão, as moscas pousavam no pergaminho fresco. Mesmo assim, os livros cresciam uma página por dia, e o vale inteiro vinha ouvir as histórias que eles guardavam.',
};

// Troca o texto pelo exemplo de `para` só se ele ainda for o exemplo de `de` (ou estiver vazio).
export const trocarExemplo = (texto, de, para) => (!texto.trim() || texto === EXEMPLOS[de] ? EXEMPLOS[para] ?? texto : texto);

// Visual padrão de cada tipo de folha, aplicado na primeira vez que o tipo abre (depois vale o que o usuário mudou).
export const VISUAL = {
  carta: { opcoes: { tamanho: 6, entrelinha: 1.6, alinhamento: 'esquerda' } },
  anotacao: { opcoes: { tamanho: 5, entrelinha: 1.5, alinhamento: 'esquerda' } },
  diario: { opcoes: { tamanho: 5, entrelinha: 1.4, alinhamento: 'esquerda' } },
  livro: { opcoes: { tamanho: 4.5, entrelinha: 1.5, alinhamento: 'justificado' }, livro: { capitularLivro: 'lombarda', bordaLivro: 'linhas', titulo: 'Os sete copistas' } },
};

// Aplica o visual de `tipo` em `estado` uma única vez por tipo.
export function aplicarVisual(estado, tipo) {
  estado.vistos ??= [];
  if (estado.vistos.includes(tipo) || !VISUAL[tipo]) return;
  estado.vistos.push(tipo);
  for (const [grupo, valores] of Object.entries(VISUAL[tipo])) Object.assign(estado[grupo], valores);
}
