# Quadro

Estado do projeto e o que falta. O histórico antigo (ciclos M1–M23) está no git, até o commit `156fdca`.

## Retomada (2026-11-21) — LEIA PRIMEIRO

- Tudo PUBLICADO até `3efc803` (2026-11-21): auditoria, redesenho estrutural e os acordeões. Pages verde.
- Gates na última entrega: `npm test` 838 ok + 1 pulado; `npx playwright test` 98/98 (tema escuro só roda `visual.spec.js`); build ok; `impeccable detect` com zero achados.
- Regras de design em `DESIGN.md` e do produto em `PRODUCT.md`: ler antes de mexer em UI. Cor nova = token em `tema.css`.
- **Painéis em acordeão** (regra do usuário): toda tela abre uma seção por vez com `<details name>` nativo. São as oficinas (`app.js`, nome `grupos-<instância>`), Personagens (`pers-editor`), Biblioteca (uma seção por oficina) e as subseções de "Mesa e folha" (`details.subsecao`). Seção nova entra no mesmo esquema. Testes e2e abrem a seção antes de usar um controle.
- **Personagem nas oficinas** só escolhe a mão salva e a variação (`pPersonagem.montar`). Ajustar a mão é só na aba Personagens (`pPersonagem.editor`).
- **Pasta principal**: está na branch `hardware-pen-holder`, com `hardware/` e `.gitignore` sem commit, de outro trabalho. Não mexer. Trabalhar em worktree: `git worktree add -b <nome> .claude/worktrees/<nome> main`, rodar `npm ci` dentro dela (junction de `node_modules` faz o Vite dar 403 nas fontes) e usar uma entrada temporária no `.claude/launch.json` com `npm --prefix <worktree> run dev -- --port 8766`. No fim: `git push origin <nome>:main`, `git branch -f main <sha>`, remover a worktree e a branch e tirar a entrada do `launch.json`.
- **Push no `main` só com o OK do usuário** (o modo automático bloqueia sem ele). Depois do push, conferir o Pages (`gh run watch`) e o bundle novo no site.
- **impeccable**: o launcher voltou a funcionar. Rodar o detector na prévia, não no arquivo: `~/.claude/skills/impeccable/scripts/impeccable detect --viewport 1280x800 http://localhost:8766/#carta …` (repetir com `390x844`). O scan estático de `index.html` acusa `flat-type-hierarchy` falso, porque não carrega o CSS.
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
- 2026-11-21 — Sistema multicor: perfil `megaSTroca` (`src/maquina/perfis.js`) e `trocaAuto` em `src/maquina/gcode.js` geram largar/pegar caneta no porta-caneta de 4 vagas no lugar do `M0`; vaga = posição da caneta em `canetas`; falta medir tudo na máquina.
- 2026-11-21 — Acabamento: Livro em 2 colunas equilibra a última página (`equilibrar` em `compor`, 2 passes); notas da faixa de margem (anotação/diário) se inclinam como as soltas.
- 2026-11-21 — Texto modelo pt-BR gerado de Dom Casmurro (Wikisource, domínio público; `dados/corpus/`, fora do git): 168 padrões, só "nã" sem cobertura (antes 3). O gerador sempre inclui a–z.
- 2026-11-19 — Mão natural nas notas: setas curvas e irregulares, notas inclinadas e giradas para caber, ângulo por nota (`{nota@lado/graus: …}`), controles com prévia; a nota só fica onde a seta tem caminho livre.
- 2026-11-19 — Site quebrado (no celular e no desktop): o Pages estava em "Deploy from branch". Voltou para GitHub Actions.
- 2026-11-19 — Mesa: texto projetado sobre a mesa (com e sem imposição), cena legível (tampo com grade, área da caneta, papel, parte fora da mesa, FRENTE/TRÁS, X0 Y0, topo), passadas vazias marcadas e fora do "Baixar todas", legenda e botão Ampliar.
- 2026-11-19 — Auditoria completa (ponytail): G-code sobe a caneta para `zLevantada` logo após o header e recusa `zLevantada <= zEscrita`; pontos NaN não viram `XNaN`; sigilo de 1 coluna em papel deitado cabe; grimório ajusta quando tamanho < mínimo e "sempre completo" avisa se não cabe; bloco empilhado que transborda na 1ª linha vai para a página seguinte; XSS no editor de símbolos fechado; erros do grimório aparecem; importação da biblioteca valida materiais e personagens; ids únicos e rótulos acessíveis; CI em Node 24 e testes em PR; helpers duplicados unificados (`geo.js`, `ui/util.js`); shims e código morto fora; `ilustracoes/*/saida/` fora do git.
- 2026-11-19 — Redesenho estrutural (impeccable, identidade mantida): no celular a barra Exportar vem logo após a prévia (antes ficava 3 telas abaixo); alça de nota anda pelo teclado (setas, Shift = 5 mm), fica à vista no toque e não briga com a rolagem; EB Garamond servido pelo próprio site (`@fontsource`, sem Google Fonts); cores da Mesa viram tokens `--mesa-*` e o halo dos rótulos da cena voltou (`mesa.css` estava quebrado); aviso de folha vazia sobre a página; cartão Minha letra na home; `h2` de Parâmetros e Prévia; seleção, cursor e barras de rolagem na paleta; `PRODUCT.md` e `DESIGN.md`.
- 2026-11-19 — Painel em acordeão: em todas as oficinas só uma seção fica aberta por vez (`<details name>` nativo; abre a seção marcada `aberto`, senão a primeira). Painel Personagem das oficinas só escolhe a mão salva e a variação (`pPersonagem.montar`); o ajuste da mão ficou só na aba Personagens (`pPersonagem.editor`). Corrigida a prévia de controle numérico sem fantasmas (`reading 'foco'`).
- 2026-11-20 — Aba Personagens em acordeão: o editor virou três seções (Mão em uso, Identidade, Execução), uma aberta por vez.
- 2026-11-20 — Biblioteca em acordeão (uma seção por oficina, abre a do material mais recente). Detector do impeccable (agora ativo) rodado nas 8 rotas, desktop e celular: corrigidos placeholder sem contraste no tema Vela, "Carregando fontes…" em sépia sem margem sobre o papel, `.folha` herdando a tinta da interface e sombra larga + borda no menu ☰; terminou com zero achados.
- 2026-11-21 — "Mesa e folha" dividida em subseções em acordeão: Folha (abre sozinha), Posição na mesa (só no Avançado) e Arquivos (`details.subsecao`, linha simples e título menor).

## Pendências de hardware (usuário)

0. Troca automática (perfil `megaSTroca`): imprimir a mesa 1, medir `vagasX`, `yBase`, `afastaY`, `recuoY` (sinal!) e `subida` com a cabeça à mão, e rodar a 1ª vez **sem papel e com a mão no botão de parar**. Valores atuais são estimativas de `hardware/pen_holder/README.md`.

1. Na Mega S, `G0 X0 Y0` deve levar a caneta ao canto frente-esquerda (o ponto X0 Y0 da vista Mesa). Se não levar, ajustar "origem" no painel Mesa e folha.
2. Imposição: Carta → A6 → Mesa e folha → folha A4 → baixar a passada → rodar com a caneta levantada, depois com a caneta. Conferir que a folha real bate com a vista Mesa.
3. Conferir se o `M0` (troca de caneta) retoma na tela da Mega S.
4. Calibrar no papel: tamanho e legibilidade, `fluidez`, fadiga, ligações (EMSAllure, Swiss, Society), arremate; notas soltas, setas (irregularidade 0,5 parece natural ou tremida?) e rabiscos no Livro.
5. P2S nunca testada: pesquisa em `workflow/experimentos/p2s/PESQUISA.md`.

## Pendências técnicas

- Mesa: faixas intermediárias; `M0` entre passadas.
- Notas na faixa de margem: ganharam inclinação (não giram para caber, só inclinam se ainda cabem na faixa).
- Motor: 2-opt de blocos (a ordem de escrita viaja 1,6 a 1,7× mais); `PARES` por fonte (z da EMSSwiss).
- Arcano: `estilo.forma` (angular/curvo/ogham/pontilhado) não tem seletor na UI; só entra por arquivo de tradição importado. Ogham (entalhes a 0,8 mm em 5 mm) e curvo (arcos a 0,43 mm) empastam abaixo de 5 mm. Só vale mexer se a forma ganhar seletor.
- CI: `actions/deploy-pages@v4` roda em Node 20; atualizar quando sair versão nova.
- Auditoria, deixado de propósito: traço fora da janela só avisa (Marlin limita pelos endstops); a 1ª camada não pede troca de caneta (teste `por('notas').trocas === 0` documenta); ornamentos `filigrana`/`peDeMosca`/`manicula` e `PARAMS` de `no`/`vinha` sem uso na UI (catálogo para o futuro); API antiga `gcode()`/`svg()` só nos goldens; `circulo` do alfabeto (n=12) separado do `geo.circulo` para não mexer nos goldens.
