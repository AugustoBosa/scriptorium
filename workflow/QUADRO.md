# Quadro

Estado do projeto e o que falta. O histórico antigo (ciclos M1–M23) está no git, até o commit `156fdca`.

## Retomada (2026-11-19) — LEIA PRIMEIRO

- Auditoria completa e redesenho estrutural (2026-11-19) PUBLICADOS: `main` = `origin/main`, Pages verde, árvore limpa.
- Gates na última entrega: `npm test` 839/0; `npx playwright test` 97/97 (tema escuro só roda `visual.spec.js`); build ok.
- Regras de design em `DESIGN.md` e do produto em `PRODUCT.md`: ler antes de mexer em UI. Cor nova = token em `tema.css`.
- O usuário vai voltar com **adições**. Trabalhar em branch, um commit por etapa, gates, merge em `main`, push e conferir o site (`curl -s https://augustobosa.github.io/scriptorium/ | grep '<script'` deve apontar para `./assets/…`).
- O Claude age como dono do repositório: decide e organiza; pergunta só o que muda o produto. Respostas em pt-BR simples, com tabelas.

## Estado

- Repositório `AugustoBosa/scriptorium`; site em https://augustobosa.github.io/scriptorium/ (publicado pelo Actions a cada push no `main`).
- Pages: Settings › Pages › Source = **GitHub Actions** (`build_type: workflow`). Em "Deploy from branch" o GitHub publica o `index.html` cru por cima do build e o site quebra (aconteceu em 2026-11-19; conferir com `gh api repos/AugustoBosa/scriptorium/pages --jq .build_type`).
- Gates: `npm test`, `npm run build`, `npx playwright test`.
- Prévia local: `.claude/launch.json` → `caligrafia` (`npm run dev`, porta 8765).
- Se a porta 127.0.0.1:8765 estiver ocupada, o e2e roda com uma config temporária que troca `localhost` por `[::1]` (não versionar).
- Golden de ornamento/motor: regravar só com `node --test --test-update-snapshots test/<arquivo>`, nunca `npm run golden` inteiro. Antes de regravar, conferir que só a camada esperada mudou.
- Edição por script: heredoc com python e a ferramenta Write estragam `\n` e `\uXXXX` dentro de strings JS. Para texto com barra invertida, usar a ferramenta Edit e conferir com `grep`/`od -c`.

## Mapa rápido (onde mexer)

| Assunto | Arquivos |
|---|---|
| Rotas, menu ☰, render, biblioteca no app | `src/ui/app.js`, `index.html` |
| Home (cartões animados, materiais recentes) | `src/ui/inicio.js`, `inicio.css` |
| Oficinas Carta e Livro | `src/materiais/carta.js`, `livro.js`, painéis em `src/ui/materiais.js`, `texto.js` |
| Oficina Magias (pergaminho/grimório, separador) | `src/materiais/scroll.js`, `src/ui/grimorio.js` |
| Sigilos | `src/materiais/sigilos.js`, `src/arcano/*` |
| Notas (marcação, posição livre, seta natural) | `src/materiais/notas.js` (`PADRAO_MAO`, `tracoMao`, `curvaMao`, `pontaMao`, `girarEm`, `posicionarNota`), arrastar: `src/ui/arrastar.js` |
| Texto de exemplo e visual padrão por tipo | `src/materiais/exemplos.js` |
| Controles e prévia viva (`{ fundo, foco }`, 2 casas) | `src/ui/controle.js`; contrato em `test/params.test.mjs` |
| Mesa e imposição (cena, passadas, Ampliar) | `src/ui/mesa.js`, `mesa.css`, `src/maquina/imposicao.js` |
| Ajudantes de DOM/armazenamento (`el`, `botao`, `baixar`, `lerPersonagens`, nomes das oficinas) | `src/ui/util.js` |
| Geometria comum (`dist`, `comprimento`, `clamp`, `ret`, `VAO`, `valido`) | `src/geo.js` — não copiar em outro arquivo |
| Salvar no navegador | trabalho: `src/ui/trabalho.js` (localStorage `trabalho.*`, `grimorio.estado`); biblioteca e magias: `src/ui/armazem.js` (IndexedDB `scriptorium`), `src/ui/biblioteca.js` |
| Minha letra (oficina #letra: a máquina plota as folhas de coleta) | `src/letra/folha.js` (`comporColeta`, código da folha), `src/letra/textos.js` + `scripts/gerar-texto-modelo.mjs <corpus> <lingua>` → `src/letra/linguas/<lingua>.json`, painel `src/ui/letra.js`; plano em `workflow/experimentos/fonte-propria/PESQUISA.md` |

## Entregas

- 2026-11-18 — Reorganização: oficina Magias (pergaminho + grimório, separador entre magias), oficinas com a mesma ordem de painéis e a mesma lista de papéis, texto de exemplo e visual padrão por tipo, valores com 2 casas, destaque em vermelho na prévia dos controles, menu ☰ nas oficinas e home com cartões animados. Os textos do teste inicial e o histórico antigo saíram.
- 2026-11-18 — Notas livres e biblioteca: notas com posição automática, por lado ou livre (arrastar) na Carta e no Livro; Livro com notas e rabiscos; trabalho salvo sozinho; aba Biblioteca com materiais (.json) e cópia de tudo; magias importadas guardadas no navegador.
- 2026-11-19 — Mão natural nas notas: setas curvas e irregulares, notas inclinadas e giradas para caber, ângulo por nota (`{nota@lado/graus: …}`), controles com prévia; a nota só fica onde a seta tem caminho livre.
- 2026-11-19 — Site quebrado (no celular e no desktop): o Pages estava em "Deploy from branch". Voltou para GitHub Actions.
- 2026-11-19 — Mesa: texto projetado sobre a mesa (com e sem imposição), cena legível (tampo com grade, área da caneta, papel, parte fora da mesa, FRENTE/TRÁS, X0 Y0, topo), passadas vazias marcadas e fora do "Baixar todas", legenda e botão Ampliar.
- 2026-11-19 — Auditoria completa (ponytail): G-code sobe a caneta para `zLevantada` logo após o header e recusa `zLevantada <= zEscrita`; pontos NaN não viram `XNaN`; sigilo de 1 coluna em papel deitado cabe; grimório ajusta quando tamanho < mínimo e "sempre completo" avisa se não cabe; bloco empilhado que transborda na 1ª linha vai para a página seguinte; XSS no editor de símbolos fechado; erros do grimório aparecem; importação da biblioteca valida materiais e personagens; ids únicos e rótulos acessíveis; CI em Node 24 e testes em PR; helpers duplicados unificados (`geo.js`, `ui/util.js`); shims e código morto fora; `ilustracoes/*/saida/` fora do git.
- 2026-11-19 — Redesenho estrutural (impeccable, identidade mantida): no celular a barra Exportar vem logo após a prévia (antes ficava 3 telas abaixo); alça de nota anda pelo teclado (setas, Shift = 5 mm), fica à vista no toque e não briga com a rolagem; EB Garamond servido pelo próprio site (`@fontsource`, sem Google Fonts); cores da Mesa viram tokens `--mesa-*` e o halo dos rótulos da cena voltou (`mesa.css` estava quebrado); aviso de folha vazia sobre a página; cartão Minha letra na home; `h2` de Parâmetros e Prévia; seleção, cursor e barras de rolagem na paleta; `PRODUCT.md` e `DESIGN.md`.
- 2026-11-19 — Painel em acordeão: em todas as oficinas só uma seção fica aberta por vez (`<details name>` nativo; abre a seção marcada `aberto`, senão a primeira). Painel Personagem das oficinas só escolhe a mão salva e a variação (`pPersonagem.montar`); o ajuste da mão ficou só na aba Personagens (`pPersonagem.editor`). Corrigida a prévia de controle numérico sem fantasmas (`reading 'foco'`).

## Pendências de hardware (usuário)

1. Na Mega S, `G0 X0 Y0` deve levar a caneta ao canto frente-esquerda (o ponto X0 Y0 da vista Mesa). Se não levar, ajustar "origem" no painel Mesa e folha.
2. Imposição: Carta → A6 → Mesa e folha → folha A4 → baixar a passada → rodar com a caneta levantada, depois com a caneta. Conferir que a folha real bate com a vista Mesa.
3. Conferir se o `M0` (troca de caneta) retoma na tela da Mega S.
4. Calibrar no papel: tamanho e legibilidade, `fluidez`, fadiga, ligações (EMSAllure, Swiss, Society), arremate; notas soltas, setas (irregularidade 0,5 parece natural ou tremida?) e rabiscos no Livro.
5. P2S nunca testada: pesquisa em `workflow/experimentos/p2s/PESQUISA.md`.

## Pendências técnicas

- Mesa: faixas intermediárias; `M0` entre passadas.
- Notas na faixa de margem (anotação/diário) ainda saem retas; inclinação e giro valem só para notas soltas.
- Motor: 2-opt de blocos (a ordem de escrita viaja 1,6 a 1,7× mais); `PARES` por fonte (z da EMSSwiss).
- Livro: 2 colunas sem equilíbrio na última página.
- Arcano: ogham e curvo empastam abaixo de 5 mm.
- CI: `actions/deploy-pages@v4` roda em Node 20; atualizar quando sair versão nova.
- Auditoria, deixado de propósito: traço fora da janela só avisa (Marlin limita pelos endstops); a 1ª camada não pede troca de caneta (teste `por('notas').trocas === 0` documenta); ornamentos `filigrana`/`peDeMosca`/`manicula` e `PARAMS` de `no`/`vinha` sem uso na UI (catálogo para o futuro); API antiga `gcode()`/`svg()` só nos goldens; `circulo` do alfabeto (n=12) separado do `geo.circulo` para não mexer nos goldens.
