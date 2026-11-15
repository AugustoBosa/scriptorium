# Expansão "Scriptorium" — workflow multiagente (M13–M21)

Documento autocontido para executar numa sessão nova do Claude Code. Raiz: `C:\Users\augus\Desktop\augusto\projects\3dprinter_plotter`. Branch: `expansao`. Idioma: pt-BR em tudo.

---

## 0. Prompt de partida (colar na sessão nova)

```
Leia workflow/EXPANSAO.md inteiro e execute como ORQUESTRADOR, a partir do marco aberto
mais baixo em workflow/QUADRO.md. Siga o laço da seção 5. Commit por marco na branch
`expansao`, sem push. Pare só nos pontos da seção 5.4. Use as skills
superpowers:subagent-driven-development, ponytail e karpathy-guidelines.
```

---

## 1. Contexto

O app gera caligrafia de traço único (SVG + G-code) para uma Anycubic i3 Mega S adaptada como plotter de caneta. Até M12: 43 fontes de traço único, mão por mistura/mutação de fontes com 15 parâmetros (`src/mao.js`), layout de página (`src/layout.js`), otimização guloso + 2-opt (`src/exportar.js`), grimório/scroll de D&D (`grimorio.html`, `src/scroll.js`, `src/arcano.js`, `src/magia.js`). 92 testes `node --test` verdes.

**Pedido do usuário:**
1. Caligrafia **extremamente humana**: variação da mesma letra a cada ocorrência, variação conforme as letras anteriores/posteriores, caminho natural de escrita (ductus) e ligações.
2. Grimórios, scrolls, livros, anotações: **qualquer tamanho de papel** até o máximo que cabe na bandeja da máquina selecionada.
3. Sistemas procedurais configuráveis: **iluminuras medievais** (capitulares, bordas, vinhas, nós, filigranas) e **desenho de magias** (sigilos, círculos, selos, runas).
4. **Camada de anotações** com estilo de letra e escritor configuráveis: notas, observações, correções, rabiscos.
5. **Todo controle** (slider, select, checkbox) tem popup mostrando **ao vivo** o efeito aplicado e a **escala**.
6. **Identidade visual** nova coerente com o material; UI/UX intuitiva com opções **Básico/Avançado** agrupadas por tema.

## 2. Decisões já tomadas (não reabrir)

| Tema | Decisão |
|---|---|
| Máquinas | Perfis `megaS` (210×210), `p2s` (experimental, janela útil ~207×200) e `personalizado` (editável). Papel máximo = janela útil do perfil. |
| Stack | **npm + Vite** (já instalado). Testes de unidade continuam em `node --test`. E2E/visual com Playwright (já instalado, Chromium baixado). Libs só quando poupam trabalho real; já instalada: `hachure-fill`. |
| Caligrafia | **Procedural + cinemática**, determinística por seed, com acentos pt-BR. **Sem rede neural.** |
| Identidade | **Scriptorium sóbrio**: pergaminho claro, tinta ferro-gálico/sépia, vermelho rubrica, serifa de livro (EB Garamond ou Cormorant) para títulos + fonte de UI legível; tema escuro **"vela"**. Legibilidade dos controles vem antes do ornamento. |
| Páginas | **App único com oficinas**: carta/anotação/diário, scroll, grimório, livro, folha de sigilos. Personagens (mãos) compartilhados. Painéis por tema com Básico/Avançado. |
| Materiais v1 | Os cinco acima. |
| Anotações | Cada camada (texto, iluminura, notas) tem **personagem e caneta**. G-code pausa na troca de caneta (**`M0` com mensagem** na Mega S). Exportar completo e por camada. |
| Execução | Commit por marco na branch `expansao`, sem push. Parar só nos pontos da seção 5.4. **Parada obrigatória após M15** para o usuário aprovar a UI. |
| Deploy | GitHub Pages via **GitHub Actions** (o usuário troca a fonte do Pages; workflow criado no M13). |

## 3. Fatos do código que moldam o plano

- `compor()` (`src/layout.js`) mede largura com `glifo()` e redesenha letra a letra. Com variação por vizinho isso quebra → a unidade passa a ser a **palavra**: escrita uma vez, usada para medir e desenhar.
- `otimizar()` (`src/exportar.js`) reordena e inverte traços → destrói ordem de escrita, pingos adiados e junções. A camada de texto ganha `ordem: 'escrita'` (otimiza só a viagem entre palavras/linhas, nunca inverte traço dentro da palavra).
- Fontes são lidas por `fetch('fontes/X.svg')`. O `vite.config.js` copia `fontes/` (e `dados/`, se existir) para `dist/` em `closeBundle`. Testes leem `fontes/` da raiz.
- Chaves do localStorage `writer.*` ficam como estão (não perder personagens salvos).
- Reusar, não reescrever: `rng/hash` (`src/rng.js`), `glifo/misturar/mutar/NEUTRA` (`src/mao.js`), `parsePath` (`src/svgpath.js`), `parseFonte/FONTES/SEM_ACENTOS` (`src/fonte.js`), `otimizar/viagem/svg/gcode` (`src/exportar.js`), `gerarAlfabeto/cifrar/sigilo/moldura` (`src/arcano.js`), `comporGrimorio/FOLHAS` (`src/scroll.js`), `resolver/validar` (`src/personagem.js`), `AJUDA/ROTULOS` (`src/ajuda.js`), `CATALOGO` (`src/catalogo.js`).
- Decisão pronta, falta aplicar: 2-opt completo até 2.000 traços, janela 50 acima (`workflow/experimentos/otimizar/RESULTADOS.md`).
- Perfil P2S pesquisado: sem `M412`, Z offset ~17 mm, homing sem caneta com pausa, ventoinhas 0, janela ~207×200 numa mesa 256×256 (`workflow/experimentos/p2s/PESQUISA.md`). Nunca testado na máquina.

## 4. Projeto técnico

### 4.1 Arquitetura-alvo

```
index.html            único; oficinas por hash (#carta #scroll #grimorio #livro #sigilos)
grimorio.html         vira redirect para index.html#grimorio (no M15)
vite.config.js  package.json  playwright.config.js  e2e/*.spec.js  .github/workflows/pages.yml
fontes/               fica na raiz
src/
  rng.js (+ruido1d)  geo.js  svgpath.js  fonte.js  personagem.js  catalogo.js  magia.js  ajuda.js
  layout.js           quebra por palavra, caixas, obstáculos, colunas, âncoras
  motor/     mao.js  contexto.js  cinematica.js  escrita.js
  ornamento/ capitular.js  borda.js  no.js  filigrana.js
  arcano/    alfabeto.js  sigilo.js  circulo.js
  materiais/ documento.js  carta.js  scroll.js  livro.js  sigilos.js  notas.js
  maquina/   perfis.js  gcode.js  otimizar.js
  ui/        app.js  controle.js  previa.js  painel-*.js  tema.css
```

**Regra dura:** fora de `src/ui/`, nada de DOM, `import.meta.glob`, `?raw` ou import de CSS. É o que mantém `node --test` rodando sem Vite/vitest. Testes ficam em `test/*.test.mjs`; Playwright só em `e2e/*.spec.js` (o `node --test` não pega `.spec.js`).

### 4.2 Contrato do documento (`src/materiais/documento.js`: só JSDoc + 2–3 helpers)

```
Traco     = [[x,y], ...]          mm, origem no canto sup-esq do papel, y para baixo (como hoje)
Camada    = { id, caneta, personagem, ordem: 'escrita'|'otimizada', tracos: Traco[] }
Pagina    = { camadas: Camada[] }
Documento = { papel: {largura, altura, margens}, canetas: {id: {nome, cor, espessura}}, paginas: Pagina[], avisos: string[] }
```
- Hachura é só mais traços.
- Todo material: `compor<Material>(conteudo, ctx, cfg) → Documento`.
- Todo gerador de ornamento/arcano: `(caixa {x,y,l,a}, params, seed) → Traco[]`.

### 4.3 Máquina (`src/maquina/perfis.js`, `gcode.js`, `otimizar.js`)

- Perfil: `{ nome, mesaX, mesaY, janela {x0,y0,x1,y1}, zEscrita, zLevantada, zMin, fDesenho, fViagem, fZ, offsetX, offsetY, header, footer, trocaCaneta, experimental }`.
- `megaS`: valores do `PERFIL_PADRAO` atual; `trocaCaneta: 'M0 Trocar caneta: {nome}'`.
- `p2s`: janela X48–255 / Y55–255, Z 17/21, `zMin` 16, sem `M412`, `M106 S0`, pausa `M400 U1`, `experimental: true`. Conferir números em `PESQUISA.md` antes de gravar.
- `personalizado`: editável na UI, salvo em localStorage.
- `papelMaximo(perfil) → {largura, altura}`; `cabeNaMaquina(papel, perfil) → {ok, motivo}`.
- `gcode(pagina, papel, perfil, {camadas})`: percorre camadas; quando a caneta muda → levanta, estaciona, emite `trocaCaneta`. Recusa Z < `zMin`. Aviso "fora da janela".
- `otimizar`: regra adaptativa (2-opt completo ≤ 2.000 traços, janela 50 acima). Respeita `ordem: 'escrita'`.

### 4.4 Controle com prévia viva (`src/ui/controle.js`, um componente para todos)

- Cada módulo exporta `PARAMS` ao lado do gerador (sem arquivo central → tarefas paralelas não disputam arquivo):
  `{ chave, grupo, nivel: 'basico'|'avancado', min, max, passo, padrao, unidade, rotulo, ajuda, previa(valor, ctx) → Traco[] }`.
- `controle(def, estado, aoMudar)` monta rótulo + range + output + "?".
- Um único `<div popover="manual">` reaproveitado. Abre em `pointerenter`, `focus` e `input`; posicionado junto ao polegar por `getBoundingClientRect`; render em `requestAnimationFrame`.
- Conteúdo do popup: amostra no valor atual em tinta; fantasmas tênues do mínimo e do máximo; **régua** com min, padrão, max, marcador do valor e unidade; **barra de escala de 10 mm**.
- `select` e `checkbox` usam o mesmo popup, com miniatura por opção.
- Teste de contrato: percorre todos os `PARAMS` exportados e exige `rotulo`, `ajuda` e `previa` que devolve ≥ 1 traço válido.

### 4.5 Motor de escrita (`src/motor/`)

Pipeline por palavra em `escrita.js`: `escreverPalavra(palavra, ctx) → { tracos, largura, ancoras }`, com cache por (palavra, índice). Serve para medir e desenhar.

1. **Alternativas** (`alternativas` 1–5, identidade): pool de K variantes por caractere via `rng(seed|ch|alt|v)`. Deformação de baixa frequência (2–3 deslocamentos de controle interpolados ao longo do arco, escala de ascendente/descendente, tamanho de laço, peso de mistura entre fontes quando `misturar()` é possível). Escolha por ocorrência, nunca repete a variante da ocorrência anterior. Letra dobrada (ss, rr, ll): a segunda sai menor. O jitter atual continua por cima.
2. **Contexto** (`contexto` 0–1): inicial da palavra um pouco maior; final recebe `arremate` (0–1), prolongando o traço de saída. **Encaixe óptico**: perfil direito do glifo anterior × perfil esquerdo do seguinte em 6 faixas de y → ajusta o avanço para um vão-alvo (kerning que as fontes não têm).
3. **Junções** (`ligadura` 0–1, identidade; só fontes da lista `CURSIVAS`): entrada/saída detectadas pela geometria (primeiro/último ponto do traço principal; traços pequenos acima da altura-x são diacríticos). Classes de saída: base | alta (o v w b r) | nenhuma. Entrada: subida (i u n m r t l) | oval (a c d g o q) | nenhuma. Acentuadas herdam a classe da base por NFD. P(ligar) = `ligadura × compat[saida][entrada] × f(vão) × (1 − 0,5·capricho)`, com overrides por par. Junção = Hermite cúbica com as tangentes reais, **fundindo** os dois traços numa polilinha.
4. **Ordem** (`adiamento` 0–1): em palavra ligada, pingos, acentos, til e corte do t vão para o fim da palavra. Erro de posição cresce com `pressa`; o pingo pode virar tracinho.
5. **Deriva lenta**: `ruido1d(seed|canal, t)` (ruído de valor suavizado, ~10 linhas em `rng.js`). `ondulacao` (0–1, linha de base até ±0,15 em), `deriva` (0–1, inclinação até ±6° e tamanho até ±8%), `ritmo` (20–200 mm, comprimento de onda). Tamanho amostrado por palavra antes de medir; base e inclinação aplicadas depois de posicionar. Por linha: recuo inicial e margem esquerda que "anda".
6. **Cinemática** (`cinematica.js`): spike de ~1 h no início do M17 escolhe entre (a) ΣΛ leve à Berio (vértices RDP → alvos virtuais, submovimentos lognormais sobrepostos → arredondamento e ultrapassagem) e (b) filtro por comprimento de arco com janela proporcional à velocidade (lei de potência 2/3). Params `fluidez`, `ultrapassagem` (0–1); `pressa` escala os dois. Reamostragem com densidade ∝ 1/v. Desligado abaixo de 3 mm de corpo. Fora: F variável por segmento e pressão em Z (só com teste físico).
7. **Fadiga** (`fadiga` 0–1): função da fração já escrita aumenta tremor, desleixo, queda e deriva e reduz capricho; recuperação parcial por parágrafo e página.
8. **Retoques** (`retoque` 0–1, até 3% por letra): trecho repassado com deslocamento, ou ganchinho no início do traço.

**Compatibilidade:** todo parâmetro novo é neutro na `NEUTRA` (0, ou 1 para `alternativas`). Goldens antigos passam intactos e `validar()` aceita personagens antigos.

Referências (só leitura, não vendorizar): Plamondon/Berio sigma-lognormal (doc.gold.ac.uk/autograff, arXiv 2507.03166), github.com/andrew-healey/sigma-lognormal (matemática), distill.pub/2016/handwriting.

### 4.6 Ornamento (`src/ornamento/`) e arcano (`src/arcano/`)

Tudo sai em traço único. Preenchimento: `hachura(poligono, {angulo, espaco, cruzada})` em `geo.js`, sobre `hachure-fill`.

- **capitular** `(letra, fontes, caixa, {estilo, linhas 2–8, hachura})`. Estilos: lombarda, contornada, habitada (vinha dentro da caixa), filigranada, em caixa de nó. Usa HersheyGoth/SerifBold existentes. "Contornada" = offset ingênuo por normais (`ponytail:` trocar por paper.js se autointerseção incomodar). O layout recebe a caixa como obstáculo.
- **borda** `{estilo: linhas|barra|vinha|no, lados, cantos: losango|trevo|no}`. Vinha por **colonização de espaço** na faixa da margem, partindo do canto ou da capitular; params `densidade, curvatura, folhas, frutos, espirais`. Ref.: jasonwebb.github.io/2d-space-colonization-experiments.
- **no** `{celulas, quebras, simetria, fita, vao}`. Porta o algoritmo de github.com/BorisTheBrave/celtic-knot (MIT; grade com quebras). Por cima/por baixo: apara a polilinha de baixo num raio em torno do cruzamento (sem booleanos). Presets: faixa, canto, painel, anel (transformação polar).
- **filigrana**: preenche-linha (onda, ziguezague, laços, pontos), pé-de-mosca, rubrica (atribuir à caneta vermelha), reclamo, manícula, florão, separadores, cabeçalho corrente, número de página.
- **circulo**: spec declarativa `aneis: [{raio, tipo: linha|dupla|runas|texto|dentes|pontos|onda}]`, `poligonos: [{n, passo, raio, rot}]`, `raios`, `nos`, `centro`, `satelites`. `circuloAleatorio(seed, complexidade)` gera uma spec. `textoEmArco` reaproveita `escreverPalavra`.
- **sigiloPalavra** `(frase, {metodo})`: kamea (caminho em quadrado mágico) e roda de letras, com círculo no início e barra no fim; depois fusão de letras (tira vogais e repetidas, sobrepõe hastes).
- **selo**: preset de `circulo` com texto no anel.
- **alfabeto**: novos estilos (angular, curvo, ogham, pontilhado). `sigilo(magia)` atual **não muda**.
- **notas** (`src/materiais/notas.js`, camada com personagem e caneta próprios). Marcação no texto: `{nota: …}`, `{~errado~>certo}`, `{_sublinhar_}`, `{o:circular}`. `espontaneo` (0–1) espalha por seed sublinhados, asteriscos, "?", rabiscos (espiral, estrela, caixinha hachurada, flor). Posiciona pelas `ancoras` do layout; nota marginal tem conector (linha, chave ou seta). Nota não sobrepõe texto.

**Bibliotecas:** só `hachure-fill`. Descartadas por ora: vpype-js (9,7 MB; `otimizar` cobre), paper.js (recorte por raio resolve o nó), rough.js (a mão já tem ruído), lindsvg/simplex-noise (10–15 linhas próprias), d3-delaunay (sem uso).

### 4.7 Marcos

Dependências: **M13 → M14 → M15**; depois a trilha do **motor (M16 → M17)** e a trilha de **ornamento (M18, M19)** correm em paralelo (pastas disjuntas); convergem em **M20**; **M21** fecha.

| Marco | Objetivo | DoD testável | Tarefas (paralelas = arquivos distintos) · modelo |
|---|---|---|---|
| **M13 Fundação** | Árvore nova, goldens antes de mudar, 2-opt adaptativo, Action do Pages | `npm test` verde; snapshots (`t.assert.snapshot`, coordenadas arredondadas a 3 casas) de `compor`, `comporGrimorio`, `sigilo`, `gcode` gravados **antes** de mover código; viagem nova ≤ antiga; `npm run build` e `npm run e2e` verdes; `.github/workflows/pages.yml` (npm ci → test → build → deploy-pages) | A: goldens (haiku) — **primeiro**. B: `git mv` para a árvore nova + imports + atualizar testes (sonnet). C: 2-opt adaptativo, brief pronto em `RESULTADOS.md` (haiku). D: `pages.yml` (haiku) |
| **M14 Documento, máquinas, papel** | Contrato, perfis, G-code multicamada, papel livre, layout por palavra | G-code P2S sem `M412`, sem `M104`, sem E, tudo dentro da janela, nenhum Z < `zMin`; troca de caneta emite a pausa; papel maior que a janela dá erro claro; papéis A3–A8, carta, ofício, personalizado; `compor` devolve `ancoras` e aceita `obstaculos` e `colunas`; saída antiga idêntica ao golden | Conselheiro Fable. A: perfis + gcode (sonnet). B: layout por palavra, caixas, âncoras (sonnet). C: papéis + `cabeNaMaquina` (haiku) |
| **M15 Identidade + oficinas** | Scriptorium sóbrio, tema vela, shell único, `controle.js`, Básico/Avançado | Um `index.html`; 5 oficinas navegáveis (as novas podem ter painel mínimo); todos os controles atuais migrados com prévia viva; teste de `PARAMS` verde; contraste AA nos dois temas; `e2e/visual.spec.js` com screenshots por oficina e tema; **PARADA para aprovação do usuário** | Conselheiro Fable com skills `impeccable` e `frontend-design` (tokens, `tema.css`, wireframe do shell). A: `app.js` + `previa.js` (sonnet). B: `controle.js` (sonnet). C: migração dos painéis (haiku, um arquivo por tarefa) |
| **M16 Motor I: contexto** | Alternativas, encaixe óptico, deriva lenta, fadiga | Params novos neutros → saída idêntica ao golden; duas ocorrências vizinhas da mesma letra nunca iguais; determinismo por seed; largura medida = desenhada | Conselheiro Fable (spec). A: `contexto.js` + `escrita.js` (sonnet). B: prévias + testes (haiku) |
| **M17 Motor II: ductus** | Junções, adiamento de pingos/cortes, cinemática, retoques | Com `ligadura`=1 em fonte cursiva, "minimum" sai com ≤ 3 traços; pingo do i depois do último traço da palavra com `adiamento`=1; junção < 0,6 em; ficha de espécimes aprovada pelo revisor | Conselheiro Fable (tabela de junção + spike cinemática). A: junções + ordem (sonnet). B: `cinematica.js` (sonnet). C: testes + prévias (haiku) |
| **M18 Ornamento** | Capitular, borda/vinha, nó, filigrana, hachura | Cada gerador determinístico, dentro da caixa, sem NaN, sem traço < 2 pontos, com golden e prévia | Conselheiro Fable. `geo.js` primeiro (haiku). Depois em paralelo: `no.js`, `borda.js`, `capitular.js` (sonnet); `filigrana.js` (haiku) |
| **M19 Arcano** | Círculo, sigilo de palavra, selo, estilos de alfabeto | Mesmos critérios do M18; `sigilo(magia)` atual inalterado (golden) | Conselheiro Fable. `circulo.js` (sonnet); kamea, roda, selo (haiku); fusão de letras (sonnet) |
| **M20 Materiais** | Carta/anotação/diário com marginália; livro; folha de sigilos; scroll e grimório no contrato novo | Cada material devolve `Documento` válido; export completo e por camada; nota não sobrepõe texto; cabeçalho, nº de página e reclamo corretos em ≥ 3 páginas; livro até 2 colunas | `notas.js` + `carta.js` (sonnet); `livro.js` (sonnet); `sigilos.js` (haiku); porte do `scroll.js` (sonnet) |
| **M21 Polimento** | Auditoria de prévias, a11y, e2e, desempenho, README, deploy | Playwright verde nos dois temas; A4 com letra de 6 mm compõe em < 400 ms; `test/ui-smoke.md` e README atualizados | Revisor Fable com `impeccable` + `web-design-guidelines`; correções (sonnet/haiku) |

Escopo de cada marco = **versão mínima que cumpre o DoD**. Extras vão para o `QUADRO.md`, não para o marco.

### 4.8 Riscos registrados

1. Junções dependem de fontes cursivas → lista `CURSIVAS` + ficha de espécimes por fonte no gate do M17.
2. `ordem: 'escrita'` aumenta a viagem → medir com `viagem()` e registrar no relatório.
3. Cinemática pode encolher letra pequena → limite de sobreposição; desliga < 3 mm.
4. P2S nunca testada → perfil `experimental`, piso `zMin`, tudo editável; semântica de `M400 U1` não confirmada.
5. Goldens entre SO → arredondar a 3 casas; se o CI divergir, goldens rodam só localmente.
6. Fable não vê pixels → o orquestrador sempre entrega screenshots ao revisor.

---

## 5. Orquestração

### 5.1 Papéis e modelos

| Papel | Quem | Modelo | Faz |
|---|---|---|---|
| Orquestrador | a sessão principal | (o da sessão) | Roda o laço, gates, navegador, commits, atualiza `QUADRO.md` |
| Conselheiro | `Agent` `subagent_type: "Plan"` | `fable` | Só leitura. Devolve a spec do marco: assinaturas, faixas, pseudocódigo, critérios, riscos. Orquestrador grava em `workflow/ciclos/NN/projeto.md` |
| Gerente | `Agent` `general-purpose` | `sonnet` | Segue `workflow/GERENTE.md`: ≤ 3 briefs por ciclo, sem arquivo em comum, campo `modelo:` em cada brief |
| Consultas | `Agent` `Explore` | `haiku` | Achar código/uso sem encher o contexto |
| Workers | `Agent` `general-purpose` | `haiku` ou `sonnet` (o do brief) | Seguem `workflow/WORKER.md`, uma tarefa cada, em paralelo |
| Revisor | `Agent` `general-purpose` | `fable` | Lê diff + screenshots + relatório; devolve "aceita" ou "devolve" com lista concreta |

Critério de modelo: **haiku** para módulo pequeno e bem especificado, testes, prévias, migração mecânica; **sonnet** para motor, layout, integração de UI, ports de algoritmo; **fable** para projeto e revisão (nunca para digitar código de rotina).

### 5.2 Laço por marco

1. Ler `QUADRO.md` (seção "Retomada") e o último `ciclos/*/relatorio.md`. Rodar `npm test`.
2. **Conselheiro Fable** (M14–M19, e M15 com skills de design): prompt = seções 1–4 deste arquivo relevantes + arquivos do marco. Gravar a resposta em `workflow/ciclos/NN/projeto.md`.
3. **Gerente Sonnet** (modo PLANEJAR): prompt = `GERENTE.md` + "marco M##, spec em `ciclos/NN/projeto.md`". Escreve `ciclos/NN/briefs.md`.
4. **Workers** em paralelo (uma mensagem com vários `Agent`), prompt = `WORKER.md` + brief.
5. **Gerente Sonnet** (modo REVISAR) → `ciclos/NN/relatorio.md`.
6. **Gates do orquestrador** (todos verdes, nesta ordem):
   1. `npm test`
   2. `npm run build`
   3. `npm run e2e`
   4. Navegador embutido: `preview_start caligrafia`, abrir a oficina tocada, `read_console_messages` sem erro, screenshot no tema claro e no vela (`resize_window colorScheme`).
7. **Revisor Fable**: diff do marco (`git diff`), screenshots, relatório. "Devolve" → novo ciclo só com as correções. Máximo 2 devoluções; na terceira, perguntar ao usuário.
8. Atualizar golden **só** pelo orquestrador (`npm run golden`) e só com motivo escrito no relatório.
9. Marcar o marco FECHADO no `QUADRO.md`, atualizar "Retomada", commit `M##: <resumo>` com a linha `Co-Authored-By` exigida pelo sistema. Sem push.

### 5.3 Regras de paralelismo

- Tarefas do mesmo ciclo nunca tocam o mesmo arquivo (inclui `test/*.test.mjs`).
- Trilhas motor (M16–M17) e ornamento (M18–M19) podem rodar em ciclos intercalados; nunca dois ciclos editando a mesma pasta ao mesmo tempo.
- `PARAMS` vive junto ao gerador; nada de registro central editado por várias tarefas.

### 5.4 Quando parar e perguntar ao usuário

1. **Após M15**: mostrar screenshots (claro + vela, cada oficina) e esperar aprovação da identidade visual.
2. Tarefa devolvida 2 vezes pelo revisor.
3. Qualquer coisa que exija a máquina física (offset caneta↔bico, validar P2S, Z real).
4. Qualquer dependência nova além das instaladas (justificar contra a regra ponytail).

Fora isso: seguir sem perguntar.

### 5.5 Skills e ferramentas disponíveis

- Processo: `superpowers:subagent-driven-development`, `superpowers:verification-before-completion`, `ponytail`, `karpathy-guidelines`, `one-skill-to-rule-them-all`.
- Design (M15, M21): `impeccable`, `frontend-design:frontend-design`, `web-design-guidelines`, `interaction-design:micro-interaction-spec`.
- Verificação: navegador embutido (`mcp__Claude_Browser__*`), `playwright-cli`, `code-review`.
- Instalado no repo: `vite`, `@playwright/test` (Chromium), `hachure-fill`. Scripts: `npm run dev|build|preview|test|e2e|golden`.

---

## 6. Ambiente (preparado na sessão de planejamento, 2026-11-15)

- Branch `expansao` criada; commit "pré-expansão" com `ilustracoes/` e `workflow/experimentos/`.
- `package.json` (`type: module`, scripts acima), `vite.config.js` (copia `fontes/` e `dados/` para `dist/`), `playwright.config.js` (projetos `claro` e `vela`, servidor `npm run dev` na 8765), `e2e/smoke.spec.js`.
- `.claude/launch.json`: `caligrafia` → `npm run dev` porta 8765.
- `.gitignore`: `node_modules/ dist/ test-results/ playwright-report/`.
- Verificado: `npm test` 92/92; `npm run build` gera `dist/` com 46 arquivos de fonte; `npm run e2e` (ver seção 7).

## 7. Verificação da preparação (2026-11-15)

- `npm test`: 92 pass / 0 fail.
- `npm run build`: `dist/index.html`, `dist/grimorio.html`, `dist/fontes/` (46 arquivos).
- `npm run e2e`: 4/4 (index e grimório, projetos claro e vela, zero erro de console).
- Navegador embutido via `preview_start caligrafia` (Vite): prévia desenha, console limpo.
- **Pendente do usuário:** allowlist de permissões em `.claude/settings.json` (o agente não pode gravar as próprias permissões); trocar a fonte do GitHub Pages para "GitHub Actions" quando o M13 criar o `pages.yml`.
