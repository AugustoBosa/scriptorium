# Quadro

Atualizado pelo gerente a cada ciclo. Status de tarefa: pendente | em andamento | aceita | devolvida (n) | bloqueada.

## Marcos

| Marco | Status |
|---|---|
| M1 Fontes | FECHADO (ciclo 02) |
| M2 Mão | FECHADO (ciclo 02) |
| M3 Personagens e variações | FECHADO (ciclo 03) |
| M4 Texto e layout | FECHADO (ciclo 03) |
| M5 Exportar | FECHADO (ciclo 01) |
| M6 Página integrada | FECHADO (ciclo 04, verificado no navegador pelo orquestrador) |
| M7 Sem presets, personagens na UI | FECHADO (ciclo 05, verificado no navegador pelo orquestrador) |
| M8 Tabela de fontes | FECHADO (ciclo 05, verificado no navegador pelo orquestrador) |
| M9 Ajuda "?" em cada configuração | FECHADO (ciclo 05, verificado no navegador pelo orquestrador) |
| M10 2-opt, trajeto, exportar tudo, importar .txt | FECHADO (ciclo 06, verificado no navegador pelo orquestrador) |
| M11 Scrolls e grimórios de D&D (grimorio.html) | FECHADO (11 testes em test/grimorio.test.mjs; verificado no navegador; falta plotar em papel) |
| M12 gerar-magias com texto completo pt-BR | FECHADO (commit 4f1cd71) |
| M13 Fundação (árvore nova, goldens, 2-opt adaptativo, Action do Pages) | FECHADO (ciclos 07–10; revisor Fable devolveu 1 bloqueante, corrigido no ciclo 10 e verificado pelo orquestrador) |
| M14 Documento, máquinas, papel | FECHADO (ciclo 11; gates verdes; revisor Fable aceitou sem bloqueante) |
| M15 Identidade + oficinas (PARADA para aprovação do usuário) | FECHADO (aprovado pelo usuário em 2026-11-16 com "continue"; ciclos 12–14; gates verdes; revisor devolveu 3 bloqueantes, corrigidos no ciclo 14) |
| M16 Motor I: contexto | FECHADO (ciclos 15–17; revisor devolveu 1 bloqueante, corrigido no 17) |
| M17 Motor II: ductus | FECHADO (ciclo 18; revisor Opus aceitou com PARES v/w) |
| M18 Ornamento | FECHADO (ciclos 19–20; revisor Opus devolveu 4 bloqueantes, corrigidos e re-revisados) |
| M19 Arcano | FECHADO (ciclos 21 e 23; revisor Opus devolveu 2 bloqueantes, corrigidos) |
| M20 Materiais | FECHADO (ciclos 22 e 24; revisores Opus devolveram 6 bloqueantes, corrigidos e re-revisados) |
| M21 Polimento | FECHADO (ciclos 25–26; revisor Opus aceitou) |

## Itens do DoD comprovados

- M1 `rng`/`hash` — test/rng.test.mjs (7 testes)
- M1 `parsePath` — test/svgpath.test.mjs (13 testes)
- M5 `svg` — test/exportar.test.mjs ('svg com página retangular')
- M5 `otimizar` — test/exportar.test.mjs ('funde', 'inverte', 'não aumenta a viagem', 'não muta')
- M5 `gcode` header/footer/formato/Y invertido/offset/aviso — test/exportar.test.mjs
- M5 `nTracos`/`comprimento` — test/exportar.test.mjs ('traço de 3 pontos', 'traço de 1 ponto')
- M1 `parseFonte` — test/fonte.test.mjs (7 testes: 11 fontes, acentos EMS, espaço, entidades, valores reais)
- M2 determinismo/seed, NEUTRA, idio vs variacao, misturar, mutar (JSON), caractere ausente — test/mao.test.mjs (7 testes)
- M3 todos os 4 itens — test/personagem.test.mjs (resolver/erro, identidade intacta, 4 presets validar, glifo de Teste)
- M4 todos os 6 itens — test/layout.test.mjs (PAGINAS, quebra, parágrafo/página, alinhamentos, limites, queda)
- M13 goldens de `compor`, `comporGrimorio`, `sigilo`, `gcode` — test/golden.test.mjs (8 testes, gravados antes de mover o código; passam intactos depois)
- M13 2-opt adaptativo, viagem nova ≤ antiga — test/exportar.test.mjs ('otimizar 2-opt completo ... não é pior que janela 50')
- M13 `npm test` verde na árvore nova — 101/101
- M13 `pages.yml` criado (verificação real só com push em main). `npm run build` ok e `npm run e2e` 4/4 (orquestrador); `npm test` numa cópia limpa sem `arquivo/` (simula o CI): 100 pass, 1 skipped
- M14 G-code P2S sem M412/M104/M109/E, dentro da janela, Z >= zMin; pausa na troca de caneta; erro papel > janela e Z < zMin — test/gcode-camadas.test.mjs, test/perfis.test.mjs
- M14 papéis A3–A8, carta, ofício, personalizado; `FOLHAS` derivada; `deTracos`/`validarDocumento` — test/documento.test.mjs
- M14 `compor` com `ancoras`, `obstaculos`, `colunas`; saída antiga idêntica ao golden — test/layout-caixas.test.mjs, test/golden.test.mjs (126/126)
- M15 `PARAMS` válidos nos 7 módulos — test/params.test.mjs (9 testes); `svgDocumento` — test/svg-documento.test.mjs (8)
- M15 um `index.html`, 5 oficinas navegáveis, `grimorio.html` redireciona, controles migrados com prévia viva, Básico/Avançado, tema persistido — e2e/smoke.spec.js, e2e/controle.spec.js (npm run e2e 42/42)
- M15 contraste AA nos dois temas e screenshots por oficina e tema — e2e/visual.spec.js (falta a aprovação do usuário)

## Tarefas

| ID | Marco | Arquivos | Status | Nota |
|---|---|---|---|---|
| 01-A | M1 | src/rng.js, test/rng.test.mjs | aceita | 7 testes |
| 01-B | M1 | src/svgpath.js, test/svgpath.test.mjs | aceita | 13 testes |
| 01-C | M5 | src/exportar.js, test/exportar.test.mjs | aceita | 12 testes |
| 02-A | M1 | src/fonte.js, test/fonte.test.mjs | aceita | 7 testes |
| 02-B | M2 | src/mao.js, test/mao.test.mjs | aceita | 7 testes |
| 03-A | M3 | src/personagem.js, personagens/*.json, test/personagem.test.mjs | aceita | 6 testes |
| 03-B | M4 | src/layout.js, test/layout.test.mjs | aceita | 10 testes |
| 04-A | M6 | src/ui-personagem.js | aceita | node --check + import ok |
| 04-B | M6 | src/ui-fontes.js, src/ui-texto.js | aceita | idem |
| 04-C | M6 | src/ui-exportar.js | aceita | idem |
| 04-D | M6 | index.html | aceita | ids e sintaxe conferidos; falta navegador |
| 04-E | ajuste | personagens/strahd.json, test/espacamento.test.mjs | aceita | strahd espacamento -0.09 |
| 05-A | M9 | src/ajuda.js, test/ajuda.test.mjs | aceita | 6 testes; textos revisados |
| 05-B | M8 | src/ui-catalogo.js, test/catalogo.test.mjs | aceita | 5 testes |
| 05-C | M7 | src/personagem.js, test/personagem.test.mjs, test/espacamento.test.mjs | aceita | novoPersonagem, ajustarVariacao |
| 05-D | M7/M9 | index.html, src/ui-personagem.js | aceita | sem presets, CSS .ajuda |
| 05-E | M8/M9 | src/ui-fontes.js | aceita | botão Tabela de fontes |
| 05-F | M9 | src/ui-texto.js, src/ui-exportar.js | aceita | rótulos + ? |
| 07-A | M13 | test/golden.test.mjs | aceita | 8 testes de snapshot; gravados pelo orquestrador (173 KB) |
| 07-D | M13 | .github/workflows/pages.yml | aceita | Node 25; usuário troca a fonte do Pages para Actions |
| 08-C | M13 | src/exportar.js (hoje src/maquina/otimizar.js), test/exportar.test.mjs | aceita | 2-opt completo ≤ 2000 traços, janela 50 acima; `{ janela }`; 1 teste |
| 09-B | M13 | git mv para a árvore nova + imports | aceita | motor/, arcano/, materiais/, maquina/{gcode,otimizar}, ui/; 101 pass; goldens intactos |
| 10-A | M13 | test/exportar.test.mjs, src/ui/grimorio.js | aceita | devolução do revisor: teste do vpype.toml pula se `arquivo/` ausente (CI) |
| 11-A | M14 | src/maquina/perfis.js, gcode.js, otimizar.js, test/perfis, test/gcode-camadas | aceita | removi import não usado |
| 11-B | M14 | src/layout.js, test/layout-caixas.test.mjs | aceita | glifo pode invadir caixa até ~0,3 mm |
| 11-C | M14 | src/materiais/documento.js, scroll.js, test/documento.test.mjs | aceita | 7 testes |
| 12-A | M15 | PARAMS em mao/layout/documento/perfis/otimizar/scroll/alfabeto, amostra, mesclarPerfil, test/params.test.mjs | aceita | 9 testes; desvios aceitos (ver ciclos/12/relatorio.md) |
| 12-B | M15 | src/ui/controle.js, tema.css, e2e/controle.html, e2e/controle.spec.js | aceita | 14 e2e (2 temas); popover sem verificação visual humana |
| 12-C | M15 | src/maquina/gcode.js, test/svg-documento.test.mjs | aceita | svgDocumento + viagemSvg privada; 8 testes |
| 13-A | M15 | index.html, grimorio.html, src/ui/app.js, previa.js, e2e/smoke, e2e/visual | aceita | shell único, 5 oficinas; papel de Sigilos fixo 148×210 (personalizado) |
| 13-B | M15 | ui/personagem.js, fontes.js, catalogo.js, ajuda.js, test/ajuda | aceita | controle()+dica; `ajuda()` e seu teste removidos |
| 13-C | M15 | ui/texto.js, exportar.js, grimorio.js | aceita | montarPapel, montarBarra, criar(); compor() do grimório captura erro de comporGrimorio |

## Ciclos

| Ciclo | Resultado |
|---|---|
| 01 | OK: rng, svgpath, exportar aceitos; M5 fechado; 32 pass / 0 fail |
| 02 | OK: fonte e mao aceitos; M1 e M2 fechados; 46 pass / 0 fail |
| 03 | OK: personagem e layout aceitos; M3 e M4 fechados; 62 pass / 0 fail |
| 04 | OK: UI M6 entregue (4 ui-*.js + index.html) e espaçamento do Strahd corrigido; 65 pass / 0 fail; falta verificar M6 no navegador |
| 05 | OK: Fase 2 entregue (M7-M9) em 2 lotes; personagens/ apagado; 76 pass / 0 fail; falta verificação no navegador |
| 06 | OK: M10 feito pelo orquestrador (2-opt em janela, trajeto na prévia, baixar todas as páginas, importar .txt); 81 pass / 0 fail. Medido: `otimizar` A5 6 mm 87 ms, A4 6 mm 327 ms; A4 com letra de 3 mm (9600 traços) ~8 s (lento, só nesse extremo; o guloso O(n²) é a maior parte) |
| 07 | M13 parcial: goldens (07-A) e pages.yml (07-D) aceitos; 92 pass / 8 fail (só "Missing snapshots" até o orquestrador gravar). M13 segue ABERTO: faltam árvore nova e 2-opt adaptativo (ciclo 08) |
| 08 | OK: 2-opt adaptativo (08-C) aceito; 101 pass / 0 fail |
| 09 | OK: árvore nova (09-B) aceita; imports sem resto antigo; 101 pass / 0 fail. M13: faltam gates build/e2e, pages.yml no GitHub e revisor (orquestrador fecha) |
| 10 | OK: revisor devolveu 1 bloqueante (teste lia `arquivo/vpype.toml`, fora do git → CI quebraria); 10-A corrigiu; gates verdes; **M13 FECHADO** |
| 11 | OK: M14 entregue (perfis P2S/megaS, gcodeDocumento, papéis, layout com âncoras/obstáculos/colunas); 126 pass / 0 fail; goldens intactos. Faltam gates build/e2e/revisor. A5 não cabe na P2S (207×200): levar ao usuário |
| 12 | OK: M15 parte 1 (PARAMS nos 7 módulos, controle com prévia viva, tema.css, svgDocumento); 143 pass / 0 fail; goldens intactos; controle.spec 14/14; build ok. M15 segue ABERTO: falta ciclo 13 (shell + migração dos painéis) e a PARADA para aprovação |
| 13 | OK: M15 parte 2 (shell Scriptorium, 5 oficinas, painéis migrados para controle/dica, exportação por Documento); 142 pass / 0 fail (143 menos o teste de `ajuda()` removido); goldens intactos; build ok; e2e 42/42 (smoke, controle, visual com contraste AA, claro e vela). **M15 segue ABERTO**: falta revisor e PARADA para o usuário aprovar a UI |

## Retomada (2026-11-17, EXPANSÃO CONCLUÍDA) — LEIA ESTA PRIMEIRA

- M13–M21 FECHADOS. Merge fast-forward de `expansao` em `main` (`11b263e`) e push feitos em 2026-11-17; Pages publicado via Actions e verificado (https://augustobosa.github.io/3dprinter_plotter/). `npm test` 794/0; build ok; e2e 68/68. Decisões de todos os ciclos: `workflow/ciclos/LEDGER-expansao.md`; relatórios por ciclo em `workflow/ciclos/NN/relatorio.md`.
- **Pendências do usuário:** hardware: confirmar que `M0` retoma na Mega S; P2S nunca testada (A5 não cabe na janela 207×200); calibrar no papel cinemática, fadiga, encaixe e ligações (EMSAllure/Swiss/Society).
- **Pendências técnicas (próximo pedido):** 2-opt de blocos para a ordem de escrita (viagem 1,6–1,7× hoje); `PARES` por fonte (z da EMSSwiss); livro 2 colunas sem equilíbrio na última página; prévia viva em "Quem escreve"/"Variação" do grimório; "mostrar trajeto" otimiza a cada render; grade antiga do alfabeto passa ~10% da caixa; ogham/curvo empastam < 5 mm; habitada A/M com vinha em gravetos; Fable exige créditos (papéis dele rodaram em Opus desde o M17).
- CI: `actions/deploy-pages@v4` roda em Node 20 (descontinuado pelo GitHub); atualizar a action quando sair versão nova.
- Ambiente: `127.0.0.1:8765` estava ocupada por processo de outra sessão; e2e rodado com config temporária `[::1]`.

## Retomada (2026-11-16, após M16)

- Fechados: M13 `92c9b1a`, M14 `de2b12a`, M15 `eb41202`, M16 (commit "M16: ..."). `npm test` 166/166. ~45% da expansão.
- **Em andamento (2026-11-16):** M18: spec pronta (`workflow/ciclos/19/projeto.md`, ondas: 19-A geo → 19-B no ∥ 19-C vinha ∥ 19-D filigrana → 19-E borda ∥ 19-F capitular); 19-A ACEITA (geo.js); onda 2: 19-C vinha ACEITA (golden gravado); 19-B no ACEITA (golden gravado); 19-D filigrana ACEITA (golden gravado); onda 3: 19-E borda e 19-F capitular ACEITAS (goldens gravados). gates verdes; fichas `workflow/ciclos/19/folha-1..7.png` prontas; revisor Opus DEVOLVEU (4 bloqueantes); ciclo 20 de correção (`workflow/ciclos/20/briefs.md`): 20-A e 20-B ENTREGUES; goldens vinha+capitular regravados (560/0); fichas regeneradas; re-revisão Opus rodando; depois regravar goldens de ornamento, regenerar fichas, re-revisar — goldens de cada um gravados pelo orquestrador depois. M17: spec pronta (`workflow/ciclos/18/projeto.md`; 18-A junções ∥ 18-B cinemática → 18-C motor+PARAMS+UI ∥ 18-D testes DoD); 18-B ACEITA (cinematica.js); 18-A ACEITA (ductus.js); M17 FECHADO (commit "M17: ..."). 18-C e 18-D ACEITAS; gates verdes (554/0, build, e2e 42/42 — ver nota da porta abaixo); ficha `workflow/ciclos/18/especime.png`; revisor M17 rodando (Opus: Fable passou a exigir créditos de uso) (pacote `.superpowers/sdd/EXPANSAO/m17-review.diff`). Golden de ornamento: gravar só com `node --test --test-update-snapshots test/<arquivo>`, NUNCA `npm run golden`. Se cair: `npm test`, ver quais arquivos da onda existem e re-despachar o que faltar.
- M16 entregou: `src/motor/contexto.js` (variante, deformar, encaixe, arrematar), `src/motor/escrita.js` (`escreverPalavra`), `ruido1d`, 7 params novos neutros (alternativas, contexto, arremate, ondulacao, deriva, ritmo, fadiga) com prévia; goldens `golden.test.mjs` + `golden-layout.test.mjs` intactos. Ficha: `workflow/ciclos/16/especime.png`.
- Menores do M16: encaixe em EMSBird só abre avanço (~8% mais largo; conferir EMSAllure no papel); fadiga sempre chega ao máximo no fim do texto (calibrar no papel).
- Nota (2026-11-17): `127.0.0.1:8765` estava ocupada por `node recv.mjs` de outra sessão; o Vite fica em `[::1]:8765`. Se o e2e der timeout com página "ready", rodar com config temporária trocando `localhost` por `[::1]` (não versionar).
- M19 FECHADO (commit "M19: ..."). Menores: ogham empasta < 5 mm; círculo do curvo vira borrão a 3 mm; arcano em arco ilegível (usar angular/ogham); grupo 'sigilo' em 2 módulos.
- M20 FECHADO (commit "M20: ..."). Menores: viagem escrita 1,6–1,7× (2-opt de blocos); livro 2 colunas sem equilíbrio na última página; teste do reclamo não lê o traço; chave longe do texto; selects das notas fora da grade; Tradição de Sigilos não troca a mão.
- **M21 em andamento:** desempenho já ok (A4 6 mm: 11 ms neutra, 153 ms cheia). Auditoria pronta (`workflow/ciclos/25/auditoria.md`, 20 achados). Ciclo 25: 25-A tema/shell ACEITA, 25-B controles+painéis da mão, 25-C materiais/export/grimório ACEITA, 25-D README+ui-smoke ACEITA. 25-B ACEITA. Gates verdes (794/0, build, e2e 68/68, A4 8/148 ms). Revisor Opus M21 rodando; depois commit M21 e encerramento da expansão. Se cair: `npm test`, `git status` e re-despachar a tarefa sem entrega (seção 3 da auditoria).
- (plano original) **M21 Polimento** (auditoria de prévias, a11y, e2e nos dois temas, desempenho A4 6 mm < 400 ms, `test/ui-smoke.md` e README, deploy). Revisor com `impeccable` + `web-design-guidelines`.
- M18 FECHADO (commit "M18: ..."). Menores: habitada A/M com vinha em gravetos curtos soltos; vinha densidade 0,2 para em ~45% da tira; contorno de traços vizinhos se cruza.
- Menores do M17: z da EMSSwiss sobe através da própria letra ("zinco") — precisa `PARES` por fonte; cinemática quase invisível a 10 mm (H = 0,10 baixo, calibrar no papel); Society d→i/u, Brush f→e/m/n, Swiss d/f/h→o ligam pouco e com ponte longa (rever no papel; se feio, `PARES`).
- Ledger: `.superpowers/sdd/EXPANSAO/progress.md` (fora do git).

## Retomada (ciclo 13 aceito)

- Ciclos 12–13 aceitos; `npm test` 142/142; e2e 42/42. **Próxima ação:** revisor do M15, screenshots (`test-results/`, claro + vela, cada oficina, tiradas com rede) e **PARADA: usuário aprova a identidade visual**. Mostrar também: A4 na Mega S agora bloqueia o G-code (D8); Sigilos com papel fixo 148×210; seletores de dado sem prévia viva (D10); `variacao` do grimório é sobrescrita pela da escrita ao trocar de oficina (cópia de COMPARTILHADAS).
- M15 itens do DoD comprovados: ver seção "Itens do DoD comprovados".

## Retomada (ciclo 12 aceito)

- Ciclo 12 aceito, `npm test` 143/143. **Próxima ação:** despachar 13-A, 13-B, 13-C (briefs em `ciclos/13/briefs.md`; app fica quebrado até as três entrarem; gate = `npm run build` + `npm run e2e`), depois screenshots e PARADA do M15.
- Menores do ciclo 12: previa de `colunas`/`alinhamento` usa parágrafo de 44 caracteres (não `3 linhas curtas`); `tema.css` e popover nunca vistos por humano (só e2e); `perfil` tem rótulo "máquina".

## Retomada (2026-11-16, M15 na parada)

- M15 entregue e commitado; **parado esperando o usuário aprovar a identidade visual** (capturas em `test-results/visual-captura-*`, geradas por `npx playwright test e2e/visual.spec.js`). Após aprovação: marcar M15 FECHADO e seguir M16 (antes, gravar golden de `compor` multipágina + justificado + palavra longa).
- Ciclo 14 (correção): grimório/scroll vazio sem erro ("Nada para plotar ainda", botões desabilitados); barra de exportação em flex; captura do popover sem fullPage e com asserts; rótulos sem unidade duplicada; nav quebra em vez de cortar; sem `aria-pressed` no tema; aviso de oficina em construção sem jargão.
- Menores pendentes do M15 (revisor + orquestrador):
  - Em 375 px: cabeçalho quebra a navegação em 3 linhas e o botão "Vela" encosta na borda; botões desabilitados ("Abrir", "Excluir", "remover") parecem mais destacados que os ativos (fundo `--regua`).
  - Select de fonte da mão sem prévia viva (pedido 5, fora pelo D10); seletores de dado e campos de texto sem prévia.
  - "?" do Nome cai sozinho numa linha; Básico de Personagem abre com 9 botões de gestão antes dos sliders (mover JSON/"Meus personagens" para Avançado).
  - Caixa inconsistente ("Nome" vs "variação", "megaS", "remover"); `margem (mm)` escrito direto em `src/materiais/documento.js:77`.
  - Contraste automático não cobre `.rotulo`, `h3`, placeholder, desabilitado; fantasmas min/máx do popover com a mesma cor.
  - Variação salva do grimório sobrescrita em memória pela da escrita ao trocar de oficina; Sigilos com papel personalizado fixo 148×210.
  - EB Garamond só carrega com rede.

## Retomada (2026-11-16, após M14)

- M13 e M14 FECHADOS. `npm test` 126/126. M14: `src/maquina/perfis.js` (megaS, p2s experimental, personalizado; `papelMaximo`, `cabeNaMaquina`), `gcodeDocumento` multicamada com troca de caneta, `ordem:'escrita'`, `src/materiais/documento.js` (PAPEIS, papel, deTracos, validarDocumento), `compor` com `obstaculos`/`colunas`/`ancoras` (revisor provou saída bit a bit igual à antiga em 384 combinações).
- **Próxima ação:** M15 (Identidade + oficinas) — Conselheiro Fable com `impeccable`/`frontend-design`, ciclo 12. **PARADA obrigatória após M15** para aprovação da UI.
- Para o usuário (hardware): A5 não cabe na janela P2S (207×200) em nenhuma orientação — maior papel de tabela é A6; header/footer P2S montado da PESQUISA, nunca testado; confirmar que `M0` é retomável na Mega S (tela TFT sem encoder), senão a troca de caneta trava.
- Menores do revisor M14 (fazer quando tocar no arquivo):
  - M15 precisa: `svg()` por camada/cor; bloquear download com aviso "fora da janela" em perfil experimental; perfil `personalizado` carregado do localStorage deve mesclar com `PERFIS.megaS` (sem `estaciona`/`trocaCaneta` dá TypeError, `gcode.js:63`) e usar `structuredClone` (`perfis.js:28` é cópia rasa); validar `colunas` ≥ 1 inteiro no controle (`layout.js:45`).
  - Antes do M20: sanitizar `camada.id` no comentário do G-code (`gcode.js:82`, `
` vira linha real).
  - `gcode.js:64` mensagem diz "Z de escrita" para os 3 campos; falta teste de `estaciona.z < zMin`; `gcode.js:68` repete `janelaDe` de `perfis.js:30`.
  - Antes do M16: gravar golden de `compor` multipágina + justificado + palavra longa (DoD do M16 depende); testes de âncoras em justificado/centro, obstáculo em página ≥ 1, palavra quebrada.
  - Papel girado em `cabeNaMaquina` (fora do escopo M14).

## Retomada (2026-11-15, após M13)

- M13 FECHADO (commit "M13: ..."): árvore nova (`src/motor`, `arcano`, `materiais`, `maquina`, `ui`), goldens em `test/golden.test.mjs` (+ `.snapshot`), 2-opt adaptativo em `src/maquina/otimizar.js`, `.github/workflows/pages.yml`. `npm test` 101/101.
- **Próxima ação:** M14 (Documento, máquinas, papel) — começa pelo Conselheiro Fable (§5.2 passo 2), ciclo 11.
- Pendente do usuário: trocar a fonte do GitHub Pages para "GitHub Actions" antes do primeiro push em main.
- Menores do revisor M13 (fazer quando tocar no arquivo):
  - `src/ajuda.js:108` usa `document.createElement` fora de `src/ui/` (regra §4.1) → mover `ajuda()` para `src/ui/` quando nascer `ui/controle.js` (M15).
  - Golden guarda `avisos` com float cru ("1.7999999999999998 mm") — ponto frágil entre SO.
  - `pages.yml` com `node-version: 25` (ímpar, sem LTS); trocar por `lts/*` (≥ 23.4 por causa do snapshot) se o setup-node falhar.
  - `workflow/DOD.md`, `EXPANSAO.md` §1/§3, `experimentos/otimizar/RESULTADOS.md`, `p2s/PESQUISA.md` citam caminhos antigos (só documentação).

## Retomada (2026-11-15, planejamento)

- Expansão "Scriptorium" planejada: **workflow/EXPANSAO.md** tem decisões, arquitetura, DoD de M13–M21 e o laço de orquestração. Branch `expansao`.
- Ambiente pronto: npm + Vite + Playwright (Chromium) + hachure-fill; `npm test` 92/92; `npm run build` ok.
- **Próxima ação:** M13, começando pelos goldens (antes de mover qualquer código).
- O 2-opt adaptativo virou tarefa do M13; o perfil P2S, tarefa do M14.

## Retomada (2026-11-10)

- Fechado: M1–M10, 81/81 testes, commit `3f39497` publicado em `main` (M10: 2-opt em janela, trajeto na prévia, baixar todas as páginas, importar `.txt`).
- **Próxima ação já decidida:** aplicar a regra adaptativa em `otimizar` (2-opt completo até 2.000 traços, janela 50 acima). Passo a passo e medições em `workflow/experimentos/otimizar/RESULTADOS.md`. Algoritmo genético descartado.
- Outras pendências: offset caneta↔bico (hardware, `offsetX/Y = 0`); plotter na Bambu P2S (futuro, `workflow/experimentos/p2s/PESQUISA.md`).
- Experimentos (scripts e desenhos de teste: carta Tarokka, mapa Ravenloft) em `workflow/experimentos/otimizar/`; mapas vêm de `dnd/tools/5etools/.../img/adventure/CoS/`.
- Não versionado ainda: `workflow/experimentos/` e a pasta `ilustracoes/` (esta não é minha; vem de outra sessão).

## Retomada anterior (2026-11-08)

- Tudo fechado: M1–M9, 76/76 testes, commit `e3098c4` publicado em `main` e no Pages (https://augustobosa.github.io/3dprinter_plotter/).
- Nenhuma tarefa aberta. Próximo pedido do usuário vira M10 no `DOD.md` e roda no mesmo loop (gerente sonnet → workers haiku → orquestrador confere testes e navegador).
- Pendências conhecidas, não pedidas: offset caneta↔bico não medido (padrão 0); EMSSpaceRocks sem acentos.
- Fontes da pesquisa de fontes: github.com/golanlevin/p5-single-line-font-resources, gitlab.com/oskay/svg-fonts, github.com/isdat-type/Mistral-SingleLine, github.com/isdat-type/Relief-SingleLine.
- Verificar no navegador do app: cache não limpa com Ctrl+Shift+R; abrir http://127.0.0.2:8765/ (ou outro 127.x) depois de `preview_start caligrafia`.

## Notas do orquestrador

- 2026-11-08: fontes expandidas de 11 para 43 (resto das EMS, 11 Hershey-EMS, Mistral SingleLine convertida de OTF-SVG, TwinSans). Créditos em `fontes/LICENCAS.md`; catálogo em `src/catalogo.js` (feito pelo orquestrador). Descartadas: duplicatas Hershey do vpype, ISO3098 e Shriinivas (licença não documentada), Relief Ornament (não é letra). Tabela de fontes ganhou coluna com nome da fonte e linhas compactas.

## Varredura geral (2026-11-08) — pontos em aberto

Estado: 78/78 testes. **Lote 1 (itens 1, 2 e 4) feito em `src/layout.js`**: troca de aspas/`…`/`—` por ASCII quando a fonte não tem, aviso `glifo ausente: X` (cobre os acentos da EMSSpaceRocks), e medição de largura com as mesmas ocorrências do desenho (excesso de margem 6,5 → 1,4 mm no pior caso com variacao=1 e pressa=1; o resto é a inclinação do glifo, dentro da tolerância). Demais itens abertos.

### Prioridade (candidatos a M10)
1. **Glifo ausente some sem aviso** (`src/layout.js`). `‘ ’ …` faltam em 40/43 fontes; `“ ” — – « » €` e acentos `á ã ç é ê õ` faltam em `EMSSpaceRocks`. Correção: `compor` avisar "glifo ausente: X" e/ou trocar `“ ” ‘ ’ … —` por `" ' ... -`. ~15 linhas + teste.
2. **Largura medida ≠ desenhada** (`medir()` usa ocorrência 0; desenho usa `variacao`/`pressa` por ocorrência). Caso medido: texto passou 0,55 mm da margem direita (A5, justificado, variacao=1, pressa=1). Desalinha centro/justificado. Correção: medir com as mesmas ocorrências ou dar folga.

### Outros
3. Offset caneta↔bico não medido (`offsetX/Y = 0`) — exige teste físico; maior impacto real.
4. ~~`EMSSpaceRocks` sem acentos~~ FEITO: a tabela de fontes mostra "sem acentos" (usa `SEM_ACENTOS` de `src/fonte.js`).
5. ~~Sem teste de UI~~ FEITO: roteiro manual em `test/ui-smoke.md`, rodado no navegador (5/5 ok). Sem automação (ceiling: virar script Playwright se incomodar).
6. ~~Desempenho~~ MEDIDO: `compor` com A4 cheia, 3 fontes, variacao=1: mediana 43 ms, pior 60 ms. Sem correção necessária.
7. ~~`otimizar` guloso~~ 2-opt feito no M10 (janela 50). **DECISÃO TOMADA, FALTA APLICAR (2026-11-09):** regra adaptativa — 2-opt completo até 2.000 traços, janela 50 acima disso. Experimento, números e passo a passo em `workflow/experimentos/otimizar/RESULTADOS.md`. Algoritmo genético descartado. Início ainda fixo em (0,0).

8. **Plotter na Bambu P2S (futuro, 2026-11-10):** viável, nada implementado. Pesquisa, suportes de caneta e plano em `workflow/experimentos/p2s/PESQUISA.md`.

### Higiene
- `arquivo/` LIMPO (2026-11-08): 147 MB → 3,7 MB. Ficou `vpype.toml`, `testes-fisicos/` e `modelos/`. O resto (scripts Python, mapas, cartas, originais de fontes) foi apagado por ser obsoleto.
- README atualizado com `workflow/`, mesa 210×210 e aviso "fora da mesa".

### Ideias M10 — FEITAS
Exportar todas as páginas; prévia com ordem de traçado e viagens; importar `.txt`; 2-opt (item 7 acima resolvido).

### Verificado nesta varredura
Nenhum traço com <2 pontos nos glifos (descarte em `valido()` não perde dados); CRLF no texto funciona.
