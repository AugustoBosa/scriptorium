# Auditoria M21 (Polimento) — ciclo 25

Auditor: Opus, com `impeccable` (audit) e `web-design-guidelines` (rules.md) como critério. Só leitura do código e das capturas em `test-results/visual-captura-*` (carta, livro, sigilos, grimório, popover, 375 px). O lançador do `impeccable` não rodou: ele baixa um binário, e a tarefa veta isso. Li o contexto direto (EXPANSAO §1, §2, §4.7; QUADRO "Retomada").

Desempenho de composição já medido (A4 6 mm: 11 ms neutra, 153 ms cheia). Fica fora daqui, exceto o item P1-3 (o render faz mais que compor).

Nota geral (escala do impeccable, 0–4): a11y 2, desempenho 3, responsivo 2, tema 4, integridade 3 → **14/20 (Bom)**. Os tokens e o contraste dos dois temas estão sólidos. As falhas estão nas bordas: rótulos, alvos de toque, cabeçalho estreito e um material quebrado (Livro).

---

## 1. Achados priorizados

Linhas conferidas no código atual (commit 0df1af5).

### P0: quebra visível

**P0-1. Livro imprime a marcação da Carta como texto literal.**
- Onde: `src/ui/materiais.js:62-67` (`comporEscrita`, ramo `livro`) passa `estado.texto` cru para `comporLivro`.
- Evidência: `test-results/visual-captura-livro-vela/livro.png` mostra "{_Barovia_}" e "{nota: chegar antes do anoitecer}" escritos na página. O texto é compartilhado com a Carta, e o texto padrão (`src/ui/app.js:35`) traz marcação. O Livro nunca chama `parsearNotas`.
- Correção: no ramo livro, usar `parsearNotas(estado.texto).limpo` (importar de `../materiais/notas.js`, que já é importado para `PARAMS`). Juntar os `avisos` do parse aos avisos do resultado. Teste e2e em `e2e/materiais.spec.js`: com o texto padrão, nenhum `{` aparece no SVG do livro (ou a contagem de traços cai).

### P1: usabilidade, a11y ou consistência visível

**P1-1. A Carta abre com um aviso de erro no texto de exemplo.**
- Onde: `src/ui/materiais.js:17` (`carta0`: `tipo: 'carta'`, `marginalia: 'nenhuma'`) junto com o texto padrão em `app.js:35`, que tem `{nota: …}`.
- Evidência: `visual-captura-em-375x812-claro/mobile.png` mostra "nota descartada (sem margem para notas): 'chegar antes do anoitece…'" logo no primeiro uso.
- Correção: `carta0` com `tipo: 'anotacao'` e `marginalia: 'direita'` (preset `PRESETS.anotacao` de `src/materiais/carta.js:9`). Assim o exemplo mostra a nota na margem em vez de um aviso.

**P1-2. O cabeçalho quebra em 3 linhas a 375 px e o botão "Vela" encosta na borda.**
- Onde: `src/ui/tema.css:102` (`header` sem `flex-wrap`, gap `--e5`) e `tema.css:183` (`nav.oficinas { flex-wrap: wrap }`).
- Evidência: `mobile.png`. O nav aparece como "Carta Scroll / Grimório Livro / Sigilos", ao lado do h1, e "Vela" sai cortado. É um menor do M15 que continua aberto.
- Correção: no `@media (max-width: 800px)`, `header { flex-wrap: wrap; gap: var(--e2) var(--e4); padding-block: var(--e2) }`. Pôr `nav.oficinas { order: 3; flex-basis: 100%; flex-wrap: nowrap; overflow-x: auto; gap: var(--e4) }`. O h1 e o `#tema` ficam na linha 1.

**P1-3. Cada movimento de slider gera um G-code completo, com 2-opt.**
- Onde: `src/ui/exportar.js:162-182` (`atualizar` da barra). Ele chama `gerarGcode` → `paginaOtimizada` → `otimizar` (2-opt completo até 2.000 traços) a cada `renderizar()`. Com "mostrar trajeto" ligado, `src/ui/previa.js:6` otimiza de novo.
- Impacto: a meta de 400 ms mede só `compor`. O render real soma o otimizar da página (o ciclo 06 mediu 327 ms no A4 6 mm, antes do adaptativo), e o slider engasga em texto longo.
- Correção: o resumo e o bloqueio não dependem da ordem dos traços. No `atualizar`, chamar `gcodeDocumento` sobre a página crua (sem `otimizar`) só para `nTracos`, `comprimento` e o aviso "fora da janela", e mostrar "≈". Otimizar só no clique de download. Verificar: `npm run e2e` verde e prévia fluida com A4 cheio.

**P1-4. Botões desabilitados chamam mais atenção que os ativos.**
- Onde: `src/ui/tema.css:75` (`button:disabled { background: var(--regua) … }`).
- Evidência: `carta.png` e `grimorio.png`. "Abrir", "Excluir", "‹ Anterior", "Próxima ›" e "Baixar G-code" (sem conteúdo) aparecem cheios e escuros, enquanto os ativos ficam em `--campo`. É menor do M15 ainda aberto.
- Correção: `button:disabled { background: transparent; color: var(--tinta-2); border-style: dashed; }`. Em `--pergaminho`, `--tinta-2` mede 7,5 no claro e 7,5 na vela, então segue AA. O `button.primario:disabled` fica igual.

**P1-5. O Básico de Personagem abre com 9 botões de gestão antes do primeiro slider.**
- Onde: `src/ui/personagem.js:192-248`.
- Evidência: `carta.png`. A Identidade só começa a ~500 px do topo. É menor do M15 ainda aberto.
- Correção: no Básico, ficam Nome, select de variação e "Novo personagem". Os botões "Salvar JSON"/"Abrir JSON", o bloco "Meus personagens" e a linha Adicionar/Renomear/Remover vão para wrappers com `dataset.nivel = 'avancado'` (o CSS de `tema.css:82` já esconde).

**P1-6. A caixa dos rótulos é inconsistente.**
- Onde: rótulos de controle em minúscula (ROTULOS: "inclinação", "máquina", "formato"); `rotulado()` em `src/ui/materiais.js:34` ("caneta das notas", "título corrente", "frases (uma por linha)"); `index.html:30` ("comparar"); `src/ui/fontes.js:58` ("remover") e `:71` ("adicionar fonte"); a opção "todas" em `src/ui/exportar.js:167`; os nomes de perfil crus em `src/maquina/perfis.js:63` ("megaS", "p2s", "personalizado"). Do outro lado ficam "Nome", "Camada", "Novo personagem" e "Remover".
- Correção: (a) uma linha de CSS, `label::first-letter, figcaption::first-letter { text-transform: uppercase }`, em `tema.css`. Ela cobre ROTULOS e `rotulado` sem mexer em `ajuda.js`. (b) Os botões em JS passam a "Remover" e "Adicionar fonte"; a opção vira "Todas"; o checkbox vira "Comparar". (c) Os perfis passam a `Anycubic Mega S`, `Bambu P2S (experimental)` e `Personalizado`, só no `rotulo`, sem mudar o `valor`.

**P1-7. Faltam prévias vivas em selects (pedido 5).**
- Onde: select de fonte da mão (`src/ui/fontes.js:38`, via `campo()`), `seletor()` de personagem e caneta das notas (`materiais.js:91-92`), caneta dos sigilos (`materiais.js:128`), Quem escreve e Variação do grimório (`grimorio.js:213-214`).
- Evidência: eles ficam fora da grade `.controle` (`mobile.png`: "personagem das notas" e "caneta das notas" desalinhados) e sem popover. São o D10 e o menor do M20.
- Correção:
  - Fonte da mão: virar `controle()` do tipo `opcao`, com `previa(v) = amostra` daquela fonte. Para não montar uma grade de 43 miniaturas, `controle.js` ganha a flag `def.grade === false`, que desenha só a opção atual (o mesmo caminho do `faixa` sem fantasmas).
  - Canetas e personagem das notas: virar `controle()` do tipo `opcao`, com `rotulo`/`ajuda` e uma prévia curta (a palavra "nota" na mão escolhida). Assim entram na grade.

**P1-8. Os botões "?" de `dica()` se chamam todos "Ajuda".**
- Onde: `src/ui/controle.js:164` (`aria-label 'Ajuda'`). Só o `?` de `controle()` (`:193`) diz de quê.
- Impacto: um leitor de tela lista dezenas de "Ajuda, botão" iguais (títulos h3, Nome, variação, tradição, cabeçalhos do catálogo).
- Correção: `dica(texto, nome)` com `aria-label = nome ? 'Ajuda: ' + nome : 'Ajuda'`, compatível com as chamadas atuais. Cada dono de arquivo passa o nome nas suas chamadas.

**P1-9. A busca e os filtros do grimório não têm rótulo.**
- Onde: `src/ui/grimorio.js:94` (search só com placeholder) e `:95-96` (selects de nível e classe sem label).
- Correção: `aria-label: 'Buscar magia'`, `'Nível'` e `'Classe'`; placeholder "Buscar por nome (pt ou en)…".

**P1-10. O alvo de toque do "?" tem 20×20 px.**
- Onde: `src/ui/tema.css:156` (`.dica { width: 20px; height: 20px; min-height: 0 }`). Isso ignora o `--alvo: 44px` de `pointer: coarse` (`tema.css:58`).
- Impacto: abaixo dos 24 px do WCAG 2.5.8. No celular, são mais de 30 botões minúsculos encostados no slider.
- Correção: `@media (pointer: coarse) { .dica { width: 32px; height: 32px; } .controle { grid-template-columns: 1fr 1.3fr 4em 32px } }`. No desktop, 24×24.

### P2: acabamento

**P2-1. O "?" fica preso dentro do `<label>`.**
- Onde: `src/ui/personagem.js:186-190`, `src/ui/fontes.js:19`, `src/ui/texto.js:49`, `src/ui/exportar.js:78` (header/footer), `src/ui/grimorio.js:232`.
- Efeito 1: o nome acessível do campo vira "Nome Ajuda".
- Efeito 2: no Nome, o `?` cai sozinho numa linha (`carta.png`, menor M15).
- Correção: `?` como irmão do label, não filho. Usar `h = div.linha-campo` com `label` + `dica` lado a lado e a entrada em largura total abaixo. No Nome: `[label "Nome"] [?]` e o input embaixo.

**P2-2. O botão de tema diz só "Vela" ou "Claro".**
- Onde: `index.html:17`, `app.js:196`.
- Correção: `aria-label` = "Mudar para tema vela" ou "Mudar para tema claro" (o texto visível continua igual), e `<meta name="theme-color">` atualizado pelo mesmo `pintarTema`.

**P2-3. Avisos e paginação mudam sem anúncio.**
- Onde: `index.html:38` (`#avisos`) e `index.html:29` (`#pag-info`).
- Correção: `aria-live="polite"` nos dois.

**P2-4. Não há estado de carregamento.**
- Onde: `app.js:221-229`. Os 43 SVGs de fonte descarregam com o painel e a folha vazios, sem sinal.
- Correção: `#previa` começa com `<p class="rotulo">Carregando fontes…</p>` em `index.html:34`, e `renderizar()` substitui.

**P2-5. O grimório vazio mostra uma folha em branco.**
- Onde: `grimorio.png`. O "Nada para plotar ainda" só aparece na barra de baixo.
- Correção: em `app.js` `renderizar`, quando o doc não tem traços, pôr na folha uma linha centrada: "Escolha uma magia na lista à esquerda."

**P2-6. O editor de símbolos não trata `pointercancel`.**
- Onde: `src/ui/grimorio.js:320`. No toque, um gesto interrompido deixa `desenhando` preso.
- Correção: o mesmo handler em `pointerup` e `pointercancel`.

**P2-7. "Limpar lista" apaga sem confirmar.**
- Onde: `src/ui/grimorio.js:134`. "Excluir" e "Remover" pedem `confirm`.
- Correção: `confirm('Limpar as N magias da lista?')`.

**P2-8. As colunas do catálogo de fontes são só glifos.**
- Onde: `src/ui/catalogo.js:139` (●●●○○ com `title`) e `:142` (★★). O leitor lê "círculo preto círculo preto…".
- Correção: `aria-label` = `${n} de 5` e `${n} estrelas`; o `title` fica.

**P2-9. O teste de contraste cobre só Carta e Grimório.**
- Onde: `e2e/visual.spec.js:69`. Scroll, Livro e Sigilos ficam sem asserção (só captura).
- Correção: iterar as 5 oficinas, nos dois temas (o Playwright já roda os projetos `claro` e `vela`). Acrescentar `h3`, `.rotulo` e `label` à lista de seletores de texto (menor M15).

(O comentário de `tema.css:1`, "Copiar para src/ui/tema.css (tarefa 12-B)", ficou velho. Trocar por "Tokens do Scriptorium" na tarefa A.)

**Contagem: P0 1 · P1 10 · P2 9 = 20.**

Pontos positivos a manter: tokens `light-dark()` com razões medidas e comentadas; foco visível global (`tema.css:76`); `prefers-reduced-motion` no popover; popover único reaproveitado, com régua e escala de 10 mm (`avancado-popover.png` está bom); Básico/Avançado só por CSS; `#erro` com `role="alert"`; `aria-current` na oficina; a folha continua papel no tema vela.

---

## 2. README.md e test/ui-smoke.md

### README.md (reescrever; hoje descreve o app de antes do M13)
Tirar:
- "`python -m http.server`" como forma de rodar: o app precisa do Vite (import de CSS).
- A seção "`grimorio.html`" como página própria: agora ela só redireciona.
- "Z3/Z6, mesa 210×210" como verdade única.
- "Node 20+, sem dependências".
- "Baixar todos": hoje é "Todas as páginas".

Estrutura nova (curta, em pt-BR):
1. **O que é**: caligrafia de traço único para plotter de caneta; mão procedural e determinística por seed, com variação por ocorrência, encaixe, ligaduras e cinemática.
2. **Oficinas** (`index.html#carta|scroll|grimorio|livro|sigilos`), uma linha cada:
   - Carta/anotação/diário: marcação `{nota: …}`, `{~errado~>certo}`, `{_sublinhar_}`, `{o:circular}`, com camada de notas de personagem e caneta próprios.
   - Scroll e Grimório: magias de D&D, sigilo, alfabeto arcano, "Desenhar símbolos…".
   - Livro: colunas, título corrente, numeração, reclamo, rubrica, capitular e borda.
   - Sigilos: frases viram selo, círculo ou sigilo, pelo método kamea ou roda.
3. **Interface**: Básico/Avançado; cada controle tem prévia viva com régua e escala (passar o mouse ou focar); temas claro e vela; personagens salvos no navegador (chaves `writer.*`).
4. **Máquinas**:
   - `megaS`: Anycubic i3 Mega S, 210×210.
   - `p2s`: experimental, janela ~207×200, nunca testado.
   - `personalizado`: editável.
   - Papel máximo = janela útil do perfil. Troca de caneta = `M0` com mensagem. Exportar SVG e G-code por página e por camada.
5. **Rodar**: `npm ci`, depois:
   - `npm run dev` abre `http://localhost:8765/`.
   - `npm test` roda os testes de unidade (`node --test`, Node ≥ 23.4 por causa dos snapshots).
   - `npm run e2e`: Playwright (Chromium), projetos `claro` e `vela`.
   - `npm run build` gera `dist/` e copia `fontes/` e `dados/`.
   - `npm run golden` regrava snapshots. Usar só de propósito; para ornamento, `node --test --test-update-snapshots test/<arquivo>`.
6. **Nota da porta**: se `127.0.0.1:8765` estiver ocupada, o Vite sobe em `[::1]:8765` e o e2e pode dar timeout. Liberar a porta, ou rodar com uma config temporária que use `http://[::1]:8765/` (não versionar).
7. **Deploy**: GitHub Pages por GitHub Actions (`.github/workflows/pages.yml`). Push em `main` roda `npm ci`, `npm test`, `npm run build` e publica `dist/`. Uma vez só: Settings › Pages › Source = "GitHub Actions". Sem `dados/magias.json` no Pages, o grimório oferece importar.
8. **Pastas**: `src/{motor,ornamento,arcano,materiais,maquina,ui}`. Regra: fora de `src/ui/`, sem DOM. Também `fontes/` (43 fontes, `LICENCAS.md`), `dados/` (fora do git), `scripts/gerar-magias.mjs` e `workflow/`.
9. **Dados das magias**: manter o parágrafo atual (gerar-magias, tradução).

### test/ui-smoke.md (reescrever)
- Preparar: `npm run dev`, abrir `http://localhost:8765/` (ou `[::1]`, conforme a nota). Tirar o truque dos "127.0.0.3": o Vite serve sem cache de módulo velho.
- Conferir, em claro e em vela:
  1. Console limpo e `#erro` vazio nas 5 oficinas.
  2. Cabeçalho a 375 px: o nav fica numa linha, sem corte.
  3. Básico/Avançado esconde e mostra grupos.
  4. Popover: foco e mouse num slider mostram amostra, fantasmas, régua e escala de 10 mm. O select mostra miniaturas. Escape fecha.
  5. Carta: as marcações viram notas na margem, sem aviso no texto padrão.
  6. Livro: texto longo gera 3 páginas ou mais, sem `{` visível.
  7. Sigilos: 4 frases dão 4 sigilos com legenda.
  8. Grimório: escolher magia, editar, "Desenhar símbolos…" (mouse e toque).
  9. Exportar: camada "notas" baixa `carta-p1-notas.svg`. G-code com `p2s` e papel grande bloqueia, com mensagem.
  10. Tabela de fontes: 43 linhas, "Usar" troca a mão.
  11. Importar `.txt` com mais de 200 KB dá erro.
  12. Teclado: Tab percorre tudo com anel de foco visível.
- Rodada de referência: trocar a de 2026-11-08 pela medição do M21 (A4 6 mm: 11 ms neutra, 153 ms cheia; meta < 400 ms).

---

## 3. Tarefas paralelas (sem arquivo em comum)

Contrato compartilhado: `dica(texto, nome?)` ganha um segundo parâmetro opcional (tarefa B). As outras tarefas já podem passar `nome` nas suas chamadas: até B entrar, o argumento é ignorado, então a ordem não importa.

| Tarefa | Modelo | Arquivos (exclusivos) | Itens |
|---|---|---|---|
| **25-A** shell e tema | sonnet | `src/ui/tema.css`, `index.html`, `src/ui/app.js`, `e2e/visual.spec.js`, `e2e/smoke.spec.js` | P1-2 cabeçalho; P1-4 desabilitado; P1-6(a) CSS first-letter e "Comparar"; P1-10 alvo do "?"; P2-2 botão de tema e theme-color; P2-3 aria-live; P2-4 "Carregando fontes…"; P2-5 estado vazio na folha; P2-9 contraste nas 5 oficinas; comentário de `tema.css:1`; `dica(…, nome)` em `app.js:214` |
| **25-B** controle e personagem | sonnet | `src/ui/controle.js`, `src/ui/personagem.js`, `src/ui/fontes.js`, `src/ui/catalogo.js`, `e2e/controle.spec.js` | P1-5 Básico enxuto; P1-6(b) "Remover"/"Adicionar fonte"; P1-7 fonte da mão com prévia (flag `grade:false`); P1-8 `dica(texto, nome)`; P2-1 "?" fora do label (personagem, fontes); P2-8 glifos do catálogo |
| **25-C** materiais, exportar, grimório | sonnet | `src/ui/materiais.js`, `src/ui/exportar.js`, `src/ui/grimorio.js`, `src/ui/texto.js`, `src/maquina/perfis.js`, `e2e/materiais.spec.js`, `e2e/exportar.spec.js` | P0-1 Livro com `parsearNotas`; P1-1 `carta0` = anotação; P1-3 barra sem otimizar por render; P1-6(c) nomes de perfil e "Todas"; P1-7 canetas e personagem das notas como `controle` (`seletor` removido); P1-9 rótulos do grimório; P2-1 "?" fora do label (texto, exportar, grimório); P2-6 pointercancel; P2-7 confirmar "Limpar lista" |
| **25-D** docs | haiku | `README.md`, `test/ui-smoke.md` | Seção 2 inteira |

Verificação (o orquestrador roda depois das 4):
- `npm test`: verde, goldens intactos. `perfis.js` só muda o `rotulo`. Se `test/params.test.mjs` ou um golden reclamar, o valor mudou por engano.
- `npm run build`: ok.
- `npm run e2e`, `claro` e `vela`: verde, com os testes novos:
  - livro sem `{` no SVG (C);
  - contraste nas 5 oficinas (A);
  - Básico sem "Salvar JSON" visível (B).
  - Usar a nota da porta `[::1]` se der timeout.
- Capturas regeradas (`npx playwright test e2e/visual.spec.js`) e olhadas: `mobile.png` com nav numa linha; `carta.png` com desabilitados apagados e Identidade mais acima; `livro.png` sem marcação.
- Por tarefa: `node --check` nos `.js` tocados. Em B, o e2e `controle.spec.js` continua verde com a flag `grade:false` e a prévia da fonte não lança.

---

## 4. Fica fora (vai para o QUADRO como pendência futura)

- EB Garamond só carrega com rede (Google Fonts). Hospedar o woff2 em `fontes/` exige verificar a licença OFL e o tamanho. Fallback Palatino aceitável.
- Popover em todo campo de texto (textarea, título corrente, campos da magia). O pedido 5 cobre controles de valor, não texto livre.
- Prévia por opção para o select de 43 fontes em grade completa (fica a prévia da opção atual, P1-7).
- Os sigilos da folha parecem quase iguais no tipo "selo" a A6 (`sigilos-vela.png`: pentagrama dominante, glifo kamea pequeno). É calibração do gerador (`src/arcano/circulo.js`), não da UI.
- Menores de motor e ornamento que só o papel decide:
  - M16: encaixe EMSBird; fadiga no fim.
  - M17: z da EMSSwiss; cinemática a 10 mm; pares de ligação.
  - M18: habitada A/M; vinha 0,2; contornos cruzados.
  - M19: ogham < 5 mm; curvo a 3 mm; arcano em arco.
  - M20: viagem escrita 1,6–1,7×; equilíbrio do livro em 2 colunas; teste do reclamo; chave longe do texto; Tradição de Sigilos não troca a mão.
- `pages.yml` com `node-version: 25`: trocar por `lts/*` (≥ 23.4) só se o setup-node falhar no primeiro push.
- Papel girado em `cabeNaMaquina`, `M0` retomável na Mega S, perfil P2S nunca testado: dependem de hardware.
- "Todos os SVG/G-code" dispara N downloads (o navegador pode bloquear). Um ZIP exigiria uma lib; manter o aviso no ui-smoke.
- URL não guarda estado além da oficina (nível, página, variação B). Não é necessário para uso local.
