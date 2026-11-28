# Quadro

Estado do projeto e o que falta. O histórico antigo (ciclos M1–M23) está no git, até o commit `156fdca`.

## Oficina Símbolos (2026-11-28, branch `simbolos`, sem push)

- **O que é.** É um editor de *sistemas de símbolos*: regras que transformam os atributos de uma magia no sigilo dela. O sistema fica salvo no personagem, em `personagem.simbolos`. O Grimório desenha os sigilos com ele (`ctx.sistema` em `scroll.js`). Um sigilo desenhado à mão continua tendo prioridade.
- **Motor** (`src/arcano/sistema.js`): `desenharSistema(s, magia, seed, ctx)` devolve coordenadas em [-1,1] e compõe numa caixa de 60 mm. Cada código liga um atributo a um desenho:
  - Atributos: nível, escola, dano, área, alcance, duração, salvaguarda, concentração, ritual e componentes.
  - Desenhos: `colar` (cordas binárias), `glifo`, `anel`, `lados` e `marca`.
  - Também entram o nome da magia (kamea, roda, spare ou anel), as molduras e o traço (complexidade, ornamento e firmeza).
- **Colar** (`colares(n)`): cada valor vira um número binário guardado como necklace (um representante por classe de rotação; N=13 dá 632). Cada bit 1 é uma corda de passo k. O método vem do Gorilla of Destiny (MIT).
- **Atributos** (`src/magia-atributos.js`): são extraídos dos textos pt-BR (`mec`, `alcance`, `duracao`, `resumo`, `texto`), porque a fonte 5etools não está mais no disco. O teste roda nas 525 magias quando `dados/` existe.
- **Modelos** (`src/arcano/presets.js`):

  | Modelo | O que faz |
  |---|---|
  | `classico` | delega para `sigilo()`; os goldens continuam iguais |
  | `colar` | cordas binárias (Gorilla of Destiny) |
  | `transmutacao` | círculo alquímico |
  | `kamea` | nome traçado no quadrado mágico |
  | `selo` | selo de cera |
  | `spare` | monograma |

- **Ficha** (`src/ficha/simbolos.js`): `sugerirPreset` usa classe + 1,5×antecedente. `modular` muda o traço: INT → complexidade, CAR → ornamento, DES → firmeza, caótico gira a base. `sistemaDe(p)` escolhe nesta ordem: o sistema salvo, o sugerido pela ficha, o clássico. Por isso, **personagem com ficha e sem sistema salvo já sai com o sugerido**. A ficha grava `simbolos` ao salvar e não sobrescreve um sistema editado ao reabrir.
- **Oficina** `#simbolos` (`src/ui/simbolos.js`): seções Sistema, Códigos, Base e cordas, Nome da magia, Molduras, Traço do personagem, Amostras, Papel e Máquina. Os códigos têm um acordeão interno (`details name="codigos"`). Exporta e importa o sistema em `.json`. A folha-chave (`src/materiais/chave.js`) é uma grade de amostras com legenda em 2 linhas; o sigilo sai na caneta vermelha.
- Gates: `npm test` 890 ok + 1 pulado; `npx playwright test` 104/104; build ok.
- **Falta**:
  - testar em papel (35 mm no A6);
  - legenda/chave impressa explicando cada código para os jogadores;
  - editor de glifo à mão por valor;
  - `impeccable detect` na oficina nova.

## Redesign "manual do grimório" (2026-11-27, publicado em 531e5c8)

- **A letra é do personagem.** Tamanho e entrelinha ficam em `mao` e cada perfil pode mudar (`ESCRITA`, `escritaDe`). O gesto das notas fica em `p.notas` (`notasDe`). Tudo isso está em `src/personagem.js`. O material só tem `escala` (Carta e Livro: `opcoes.escala`; Magias: `cfg.escala`). Fontes, tamanho e notas saíram das oficinas e foram para o editor de Personagens.
- **Navegação**: home com Personagens, Escrever e Continuar; navegação à vista no desktop; "Escrito por" em cima da prévia; Minha letra entra em "Novo personagem" (ficha D&D, minha letra, em branco).
- **Visual**: Claro = manual do aventureiro; Vela = grimório iluminado. Ver `DESIGN.md`.
- **Máquina lembrada** (`writer.maquina`, `maquinaSalva()` em `ui/exportar.js`): a última máquina escolhida vale ao recarregar e no editor de Personagens, onde "Tamanho e linhas" mostra o mínimo da folga do porta-caneta.
- Gates: `npm test` 862 ok; `npx playwright test` 101/101; build ok; `impeccable detect` só acusa o filete de 3 px em cima e embaixo dos blocos de ficha, que é de propósito.

## Retomada (2026-11-21)

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
| Símbolos (sistemas de sigilo de magia por personagem) | motor `src/arcano/sistema.js`, modelos `src/arcano/presets.js`, atributos `src/magia-atributos.js`, ficha `src/ficha/simbolos.js`, folha-chave `src/materiais/chave.js`, oficina `src/ui/simbolos.js` |
| Notas (marcação, posição livre, seta natural) | `src/materiais/notas.js` (`PADRAO_MAO`, `tracoMao`, `curvaMao`, `pontaMao`, `girarEm`, `posicionarNota`), arrastar: `src/ui/arrastar.js` |
| Texto de exemplo e visual padrão por tipo | `src/materiais/exemplos.js` |
| Controles e prévia viva (`{ fundo, foco }`, 2 casas) | `src/ui/controle.js`; contrato em `test/params.test.mjs` |
| Mesa e imposição (cena, passadas, Ampliar) | `src/ui/mesa.js`, `mesa.css`, `src/maquina/imposicao.js` |
| Ajudantes de DOM/armazenamento (`el`, `botao`, `baixar`, `lerPersonagens`, nomes das oficinas) | `src/ui/util.js` |
| Geometria comum (`dist`, `comprimento`, `clamp`, `ret`, `VAO`, `valido`) | `src/geo.js` — não copiar em outro arquivo |
| Salvar no navegador | trabalho: `src/ui/trabalho.js` (localStorage `trabalho.*`, `grimorio.estado`); biblioteca e magias: `src/ui/armazem.js` (IndexedDB `scriptorium`), `src/ui/biblioteca.js` |
| Criar personagem (#ficha: ficha D&D → letra → perfis) | tabelas `src/ficha/dnd.js`, pontuação `src/ficha/sugerir.js`, perfis `src/ficha/perfis.js`, wizard `src/ui/ficha.js` (rascunho `writer.ficha.rascunho`); variação com `base` em `src/personagem.js` |
| Folga da ponta do porta-caneta (tamanho mínimo de letra) | modelo e critério `src/maquina/folga.js`; tabela gerada `src/maquina/folga-fontes.js` por `node scripts/folga-ponta.mjs` (também gera `workflow/experimentos/folga/simulacao.html`); `folgaPonta` e `minimoTamanho` em `src/maquina/perfis.js`; gancho `def.minimo(ctx)` em `src/ui/controle.js` |
| Minha letra (oficina #letra: a máquina plota as folhas de coleta) | `src/letra/folha.js` (`comporColeta`, código da folha), `src/letra/textos.js` + `scripts/gerar-texto-modelo.mjs <corpus> <lingua>` → `src/letra/linguas/<lingua>.json`, painel `src/ui/letra.js`; plano em `workflow/experimentos/fonte-propria/PESQUISA.md` |

## Entregas

- 2026-11-27 — Folga da ponta (branch `folga-ponta`): o bloco do porta-caneta v5.1 tem folga de 0,4 mm nas varetas (guia 25, caneta 12 abaixo), então a cabeça anda ±0,39 mm sem a ponta sair do lugar. `simularPonta` faz a ponta atrasar (coleira de raio r, o deslocamento passa de um traço para o outro, 5 inícios). Letra legível = desvio (Hausdorff, com a letra alinhada) ≤ 15% da altura-x E mais perto da própria letra que da metade do caminho até qualquer outra (chamfer descontando a tinta de 0,4 mm). Com os perfis `megaSTroca*`, a escala da letra nas oficinas não desce abaixo do mínimo da fonte (6 a 14,5 mm; EMSMistyNight e EMSPepita não passam nem em 15; se nem 1,6 basta, a nota pede para aumentar o tamanho no personagem) e a barra avisa se a letra efetiva (tamanho do personagem × escala) está abaixo. A letra que mais segura o mínimo é o `i` (o pingo encolhe). Página da simulação com animação cabeça × ponta.

- 2026-11-25 — Wizard de personagem (`#ficha`, branch `wizard-personagem`): ficha D&D 5e (PHB 2014, pt-BR) em 8 passos (um aberto por vez) sugere a letra pelo catálogo (só critérios: arquétipo, eixos, ligação) e gera perfis de escrita filtrados pela classe e antecedente; cada escrita de idioma vira perfil com letra própria (variação aceita `base`). "+ Novo" abre o wizard ("Começar em branco" mantém o antigo); "Reabrir ficha" na galeria; aviso no painel quando o perfil usa outra letra. Capricho da ficha parte de 0,8 (NEUTRA = 1 é o teto).
- 2026-11-18 — Reorganização: oficina Magias (pergaminho + grimório, separador entre magias), oficinas com a mesma ordem de painéis e a mesma lista de papéis, texto de exemplo e visual padrão por tipo, valores com 2 casas, destaque em vermelho na prévia dos controles, menu ☰ nas oficinas e home com cartões animados. Os textos do teste inicial e o histórico antigo saíram.
- 2026-11-18 — Notas livres e biblioteca: notas com posição automática, por lado ou livre (arrastar) na Carta e no Livro; Livro com notas e rabiscos; trabalho salvo sozinho; aba Biblioteca com materiais (.json) e cópia de tudo; magias importadas guardadas no navegador.
- 2026-11-21 — Calibração da troca: `scripts/gerar-teste-troca.mjs` gera `TROCA1/2/3.GCO` (posições a seco, ciclo passo a passo, ciclo real) em `workflow/experimentos/troca-automatica/`, com o guia `CALIBRACAO.md` e as medidas propostas.
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

0. Troca automática (perfil `megaSTroca` na frente ou `megaSTrocaLado` no lado): imprimir a mesa 1, medir `vagas`, `base`, `afasta`, `recuo` (sinal!) e `subida` com a cabeça à mão, e rodar a 1ª vez **sem papel e com a mão no botão de parar**. Valores atuais são estimativas de `hardware/pen_holder/README.md`.

1. Na Mega S, `G0 X0 Y0` deve levar a caneta ao canto frente-esquerda (o ponto X0 Y0 da vista Mesa). Se não levar, ajustar "origem" no painel Mesa e folha.
2. Imposição: Carta → A6 → Mesa e folha → folha A4 → baixar a passada → rodar com a caneta levantada, depois com a caneta. Conferir que a folha real bate com a vista Mesa.
3. Conferir se o `M0` (troca de caneta) retoma na tela da Mega S.
4. Calibrar no papel: tamanho e legibilidade, `fluidez`, fadiga, ligações (EMSAllure, Swiss, Society), arremate; notas soltas, setas (irregularidade 0,5 parece natural ou tremida?) e rabiscos no Livro.
5. Folga da ponta: medir quanto a cabeça anda sem a ponta mexer (riscar um vaivém curto e medir no papel) e pôr em `FOLGA_PORTA`/`folgaPonta`; depois `node scripts/folga-ponta.mjs`. Hoje o mínimo é 6–14,5 mm por fonte; diminuir `FOLGA_TRILHO` ou aumentar `BH` no hardware baixa o mínimo.
6. P2S nunca testada: pesquisa em `workflow/experimentos/p2s/PESQUISA.md`.

## Pendências técnicas

- Mesa: faixas intermediárias; `M0` entre passadas.
- Notas na faixa de margem: ganharam inclinação (não giram para caber, só inclinam se ainda cabem na faixa).
- Motor: 2-opt de blocos (a ordem de escrita viaja 1,6 a 1,7× mais); `PARES` por fonte (z da EMSSwiss).
- Arcano: `estilo.forma` (angular/curvo/ogham/pontilhado) não tem seletor na UI; só entra por arquivo de tradição importado. Ogham (entalhes a 0,8 mm em 5 mm) e curvo (arcos a 0,43 mm) empastam abaixo de 5 mm. Só vale mexer se a forma ganhar seletor.
- CI: `actions/deploy-pages@v4` roda em Node 20; atualizar quando sair versão nova.
- Auditoria, deixado de propósito: traço fora da janela só avisa (Marlin limita pelos endstops); a 1ª camada não pede troca de caneta (teste `por('notas').trocas === 0` documenta); ornamentos `filigrana`/`peDeMosca`/`manicula` e `PARAMS` de `no`/`vinha` sem uso na UI (catálogo para o futuro); API antiga `gcode()`/`svg()` só nos goldens; `circulo` do alfabeto (n=12) separado do `geo.circulo` para não mexer nos goldens.
