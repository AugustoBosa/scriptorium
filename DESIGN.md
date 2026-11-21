# Design: Scriptorium

Mundo visual: **a mesa de um copista**. A interface é a mesa e o pergaminho em volta; a folha da prévia é o papel que a máquina vai escrever. A fonte de verdade dos valores é `src/ui/tema.css`, com as razões de contraste medidas no comentário do topo. Este arquivo explica as regras e não repete os números.

## Temas
- **Claro** (dia) e **Vela** (noite). Sem escolha, segue o sistema (`prefers-color-scheme`); o botão do cabeçalho força um dos dois (`<html data-tema>`).
- Um valor por token com `light-dark()`: nenhum seletor de tema repete cor.
- O `theme-color` do navegador acompanha o `--pergaminho` do tema em uso (lido em `app.js`).

## Tokens de cor
| Papel | Token | Uso |
|---|---|---|
| Superfícies | `--mesa`, `--pergaminho`, `--campo`, `--folha` | fundo do app, cabeçalho e painéis, campos, papel da prévia |
| Tinta | `--tinta`, `--tinta-2` | texto principal e botão primário; texto secundário |
| Sinais | `--rubrica`, `--aviso`, `--foco` | títulos de grupo, oficina atual e erro; avisos; anel de foco |
| Linhas | `--contorno`, `--regua` | borda de controle (≥ 3:1); pautas e divisórias (só ornamento) |
| Oficinas | `--acento-carta`, `-livro`, `-magias`, `-sigilos`, `-letra`, `-personagens` | borda superior e nome do cartão na home, AA nos dois temas |
| Folha (fixos) | `--tinta-folha`, `--fantasma-folha`, `--destaque-folha` | dentro da folha e da prévia viva dos controles |
| Mesa (fixos) | `--mesa-cena`, `--mesa-tampo`, `--mesa-grade`, `--mesa-janela`, `--mesa-papel`… | a cena técnica da plotter, igual nos dois temas |

Regras:
- Texto ≥ 4,5:1; borda de controle e anel de foco ≥ 3:1.
- `--regua` nunca é a única borda de um controle nem cor de texto.
- Cor nova entra como token em `tema.css`, com a razão medida no comentário. Os CSS de cada vista (`inicio.css`, `mesa.css`, …) só usam tokens.
- Na Mesa, o SVG recebe cor em atributo (onde `var()` não vale): `mesa.js` lê os `--mesa-*` com `getComputedStyle`.

## Tipografia
- **EB Garamond** (`--fonte-titulo`, servida pelo pacote `@fontsource/eb-garamond`, pesos 400, 500 e 400 itálico): nome do app, títulos de grupo em versalete, menu e nomes nos cartões.
- **Fonte do sistema** (`--fonte-ui`): rótulos, controles e texto corrido. **Mono** (`--fonte-mono`): G-code.
- Escala: `--t-pequeno` 13 px, `--t-ui` 15 px, `--t-grupo` 17 px, `--t-titulo` 24 px; entrelinha `--linha` 1,45.
- Números em `output` usam `tabular-nums`.

## Espaço e forma
- Espaçamento na base 4 px (`--e1` a `--e6`), raio `--raio` 3 px.
- Alvo mínimo `--alvo`: 28 px com mouse, 44 px em tela de toque. Botões pequenos (`.dica`) ampliam a área de toque com `::after`.
- Sombra só na folha e nos popovers (`--sombra-folha`, `--sombra-pop`). Popover tem borda, então leva só sombra curta, sem halo largo.
- A `.folha` define a própria cor de texto (`--tinta-folha`): nada escrito sobre o papel herda a tinta da interface.
- Painéis em acordeão: oficinas, Personagens e Biblioteca abrem uma seção por vez (`<details name>`). Subseção dentro de um grupo (`details.subsecao`, hoje só em "Mesa e folha") usa linha simples e título no tamanho da interface, abaixo da pauta dupla.

## Verificação
- `impeccable detect --viewport 1280x800` e `--viewport 390x844` nas 8 rotas com a prévia rodando: zero achados em 2026-11-20.

## Assinatura
- **Pauta dupla de escriba** (`3px double var(--regua)`): separa os grupos do painel, o cabeçalho e a barra de exportação, e segue os títulos da home.
- Títulos de grupo em versalete na cor da rubrica.
- Miniaturas da home desenhadas traço a traço (`.tracando`), com o motor real.

## Layout
- **Desktop**: painel de parâmetros fixo à esquerda (`--painel` 360 px) e prévia à direita, com a barra de exportação presa embaixo.
- **Celular (≤ 800 px)**: uma coluna na ordem **prévia → exportar → painel**. Ver o resultado e baixar o G-code vêm antes dos ajustes finos.
- Folha vazia: o aviso fica sobre a página, no terço de cima, em EB Garamond itálico.

## Movimento
- Só três momentos: traço das miniaturas da home, elevação do cartão no hover e fade dos popovers e da alça de nota.
- Tudo dentro de `prefers-reduced-motion: no-preference`; com movimento reduzido, o estado final aparece direto.

## Interação
- Foco visível em tudo (`--foco`, 2 px, afastado 2 px).
- Alça de nota solta: arrasta com mouse ou toque (`touch-action: none`, `pointercancel` desfaz) e anda pelo teclado com as setas (Shift = 5 mm). Fica sempre à vista no toque.
- Superfícies do navegador na paleta: seleção, cursor de texto e barras de rolagem.
