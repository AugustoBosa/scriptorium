# Design: Scriptorium

Mundo visual: **manual do grimório**. É fantasia medieval e D&D. De dia (tema Claro) o app parece um manual de RPG: uma faixa vermelha no topo, títulos em versalete e personagens em blocos de ficha. À noite (tema Vela) é um grimório iluminado: couro escuro, filetes de ouro e capitulares em lápis-lazúli e vermelhão. A folha da prévia é sempre papel claro, porque é o objeto que sai da máquina.

Os valores ficam em `src/ui/tema.css`. O comentário no topo desse arquivo traz as razões de contraste. Este arquivo explica as regras e não repete os números.

## Temas
- **Claro**: manual do aventureiro. **Vela**: grimório iluminado.
- Se o usuário não escolher, o tema segue o sistema (`prefers-color-scheme`). O botão do cabeçalho força um dos dois (`<html data-tema>`).
- Cada token tem um valor só, escrito com `light-dark()`. Nenhum seletor de tema repete cor.

## Tokens de cor
| Papel | Token | Uso |
|---|---|---|
| Superfícies | `--mesa`, `--pergaminho`, `--campo`, `--folha` | Fundo do app (pergaminho cru ou couro), painéis e blocos, campos, papel da prévia |
| Tinta | `--tinta`, `--tinta-2` | Texto principal; texto secundário |
| Sinais | `--rubrica`, `--aviso`, `--foco` | Títulos, seção atual, botão primário, filetes dos blocos, erro; avisos; anel de foco |
| Iluminura | `--faixa`, `--faixa-tinta`, `--ouro`, `--lapis`, `--vermelhao`, `--ouro-cap` | Faixa do cabeçalho e o texto sobre ela; filetes e molduras; fundo e letra das capitulares |
| Linhas | `--contorno`, `--regua` | Borda de controle (≥ 3:1); divisórias (só ornamento) |
| Folha (fixos) | `--tinta-folha`, `--fantasma-folha`, `--destaque-folha` | Dentro da folha e da prévia viva |
| Mesa (fixos) | `--mesa-*` | A cena técnica da plotter, igual nos dois temas |

Regras:
- Texto ≥ 4,5:1. Borda de controle e anel de foco ≥ 3:1. Os testes `e2e/visual.spec.js` medem isso.
- `--ouro` é ornamento no tema Claro: só filete, moldura e borda, nunca cor de texto. Uma etiqueta como "em uso" tem texto em `--rubrica` e moldura em `--ouro`.
- No cabeçalho, os botões têm borda opaca `--faixa-tinta`. Borda translúcida não passa no teste de contraste.
- Cor nova entra como token em `tema.css`. O CSS de cada vista usa só tokens.

## Tipografia
- **EB Garamond** (`--fonte-titulo`): nome do app, navegação, títulos em versalete, nomes de personagem e de material, capitulares.
- **Fonte do sistema** (`--fonte-ui`): rótulos, controles e texto corrido. **Mono** (`--fonte-mono`): G-code.
- Títulos de área na home e nas páginas: 1,75 rem, versalete, cor `--rubrica`.

## Assinaturas
1. **Capitular iluminada** (`.capitular`): é a letra inicial de cada área (P de Personagens, E de Escrever). Fica num quadrado de lápis-lazúli ou vermelhão, com moldura de ouro.
2. **Bloco de ficha**: filete de rubrica de 3 px em cima e embaixo, como o bloco de estatísticas de um livro de RPG. Vale para os personagens na home, os cartões da galeria, o painel da oficina e o editor. O detector do impeccable aponta isso como "side-tab border". É de propósito: não mexer.
3. **Filete duplo de ouro** (`3px double var(--ouro)`): fica embaixo do cabeçalho, dos títulos de área e da barra de exportação.
4. **Miniaturas traçadas**: os cartões de material desenham a página real traço a traço (`.tracando`). Na miniatura, o traço é mais grosso que o da caneta real (`stroke-width: .8`), senão ele some na tela.

## Layout
- **Cabeçalho**: faixa com o nome do app e a navegação sempre à vista no desktop, na ordem Início · Personagens · ESCREVER (Carta, Livro, Magias, Sigilos) · Biblioteca. No celular (≤ 800 px) a navegação fica no ☰ (popover nativo). As telas Minha letra e Ficha marcam "Personagens" como seção atual.
- **Home**: duas colunas, Personagens (blocos de ficha e "Novo personagem" com 3 jeitos de começar) e Escrever (quem escreve e os 4 materiais). Embaixo fica a faixa Continuar.
  - Sem personagens, os 3 jeitos de começar viram a ação principal.
  - No celular, com personagem pronto, Escrever vem antes de Personagens.
- **Oficinas**: no desktop, o painel fica à esquerda (`--painel` 360 px) e a prévia à direita. Em cima da prévia fica "Escrito por <personagem> · perfil <x> · Editar personagem ›". No celular a ordem é prévia → exportar → painel.
- **Personagens**: cabeçalho com capitular, espécime, galeria em blocos de ficha e o editor em acordeão: Mão em uso, Letra, Tamanho e linhas, Identidade, Execução, Notas na margem.

## Fronteira personagem × material
O material nunca edita a letra. Dentro da oficina, o painel Personagem só escolhe o personagem e o perfil, e o material oferece só a **escala da letra**. Fontes, tamanho, entrelinha e o gesto das notas ficam no editor de personagem.

## Movimento
- Só três momentos: o traço das miniaturas, a elevação do cartão no hover (ease-out) e o fade dos popovers.
- Tudo fica dentro de `prefers-reduced-motion: no-preference`. Com movimento reduzido, o estado final aparece direto.

## Interação
- Toda tela abre uma seção por vez (`<details name>`).
- O foco é visível em tudo (`--foco`, 2 px). No cabeçalho, o anel de foco usa `--faixa-tinta`.
- A alça da nota solta arrasta com mouse ou toque e anda pelo teclado com as setas (Shift anda 5 mm).
