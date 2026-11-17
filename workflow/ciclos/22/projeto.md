# M20 — Materiais (spec do conselheiro)

DoD (EXPANSAO §4.7): cada material devolve `Documento` válido (`validarDocumento(doc)` = `[]`); export completo e por camada; nota não sobrepõe texto; cabeçalho, nº de página e reclamo corretos em ≥ 3 páginas; livro até 2 colunas.
Contrato (§4.2): `compor<Material>(conteudo, ctx, cfg) → Documento`. `cfg.papel` é um `Papel` pronto (`papel()` de `documento.js`); `ctx = { fontes, mao, maoNotas?, personagens?: {texto, notas} }` com mãos **já resolvidas** (`resolver()`), nunca personagem cru. `Camada.personagem` = nome do personagem ou `null`.
APIs do M18/M19 tratadas como estáveis: `capitular/caixaCapitular`, `borda/miolo`, `florao`, `circulo/circuloAleatorio/selo`, `sigiloPalavra`. **Importar pode; editar não.**
Constantes: `VAO = 0.5` mm (caneta 0,4) em `notas.js`, `livro.js`, `sigilos.js`. rng sempre `rng(seed + '|nome|' + chave)()`, nunca `hash()` cru, nunca `Math.random`.

## 0. Fundação (onda 1): grupos, canetas, `escreverEm`, G-code

**Grupos de palavra** — a peça que serve a duas coisas: `ordem:'escrita'` com viagem entre palavras **e** a caixa real de cada palavra para a regra "nota não sobrepõe texto".
- `compor()` (`src/layout.js`) devolve chave nova `grupos: number[][]` (por página): em `fecha()`, antes de empurrar os traços de cada palavra, `grupos[v.pag].push(pag.length)`. Mesma ordem dos `ancoras` daquela página → `ancoras.filter(a => a.pagina === p)[k]` ↔ `grupos[p][k]` (inclui pedaços de palavra quebrada). Palavra sem traço vira grupo vazio (`g[k] === g[k+1]`). `paginas`, `ancoras`, `avisos`, `fim` **não mudam** → `golden-layout` e `golden` passam sem regravar (os snapshots escolhem chaves; conferir rodando).
- `Camada` ganha campo opcional `grupos?: number[]` (índice do 1º traço de cada palavra, crescente, `< tracos.length`). Regra: camada com `grupos` só tem traços de texto (ornamento vai para outra camada).
- `otimizar(tracos, tol, { ordem:'escrita', grupos })`: sem `grupos` = hoje (cópia na ordem). Com `grupos`: fatia em blocos `[g_k, g_k+1)` (traços antes de `g_0`, se houver, são um bloco); guloso pelo bloco cuja **1ª** ponta está mais perto da posição atual; **nunca inverte traço nem bloco**, nunca reordena dentro do bloco, não funde traços (`tol` ignorado). ~15 linhas. `ponytail:` só guloso; 2-opt de blocos sem inversão se a viagem pesar.
- **Decisão `ordem:'escrita'`: ENTRA.** Custo: layout +3 linhas, `otimizar` +15, `validarDocumento` +2, UI repassa `grupos` (2 linhas). Sem isso o adiamento de pingos do M17 é destruído no G-code. Só a camada `texto` de **carta e livro** usa; grimório/sigilos ficam `otimizada`. Risco §4.8.2 medido na ficha (viagem escrita÷otimizada).
- `validarDocumento`: se `c.grupos` existe, exige inteiros crescentes em `[0, tracos.length]`.

**`src/materiais/documento.js`** (continua pequeno):
- `CANETAS = { preta: {nome:'preta', cor:'#1a1a1a', espessura:0.4}, vermelha: {nome:'vermelha (rubrica)', cor:'#9b2d20', espessura:0.4}, sepia: {nome:'sépia', cor:'#704214', espessura:0.4}, azul: {nome:'azul', cor:'#1f3a6b', espessura:0.4} }`. Material põe em `doc.canetas` só as que usa.
- `escreverEm(texto, caixa, { alinhamento = 'esquerda'|'centro'|'direita', tamanho }, fontes, mao) → Traco[]`: `compor(texto, fontes, mao, {largura:1e4, altura:1e4, margens:{0,0,0,0}}, {tamanho, entrelinha:1.3})`.paginas[0]; desloca para a caixa: x pelo `caixaDe` dos traços (esquerda: x0 = caixa.x; centro: centro do x; direita: x1 = caixa.x + caixa.l), y: `+ caixa.y` (a 1ª linha de base fica em `caixa.y + tamanho`). Não encolhe; quem chama confere `caixaDe`. Usado por livro (paginação), sigilos (legendas), notas (`?`).

**`src/maquina/gcode.js`**: comentário `; camada ${id}` e aviso usam `String(camada.id).replace(/[\r\n]/g, ' ')` (menor pendente do M14).

## 1. `src/materiais/notas.js` — marcação, camada de notas, espontâneo

**Marcação** (`parsearNotas(texto) → { limpo, marcas }`):
| marca | no `limpo` | camada de notas faz |
|---|---|---|
| `{nota: texto}` | some (e um espaço duplo vira simples) | nota marginal com conector, ancorada na **palavra anterior** (ou na 1ª, se não houver) |
| `{~errado~>certo}` | fica `errado` (a mão do texto errou) | risca `errado`; escreve `certo` na entrelinha acima ou, sem espaço, vira nota marginal |
| `{_trecho_}` | fica `trecho` | sublinha cada palavra do trecho |
| `{o:trecho}` | fica `trecho` | laço em volta de cada palavra |
Marca = `{ tipo:'nota'|'correcao'|'sublinhar'|'circular', ini, fim, texto? }` com `ini/fim` = **índice de palavra** igual ao `ancora.indice` do `compor`: palavras = `limpo.split('\n')` → `split(' ').filter(Boolean)`, contagem contínua. Palavra parcialmente marcada conta inteira: `ini = n(tokens(limpo.slice(0, pos) + 'x')) − 1`, `fim = n(tokens(limpo.slice(0, posFim))) − 1`. Chave sem fechamento ou tipo desconhecido → fica literal no texto + aviso. Sem aninhamento (`ponytail:`).

**Caixas de palavra**: `caixasPalavras(tracos, grupos) → (caixa|null)[]` = `caixaDe` de cada bloco. `sobrepoe(tracos, caixas, folga = 0) → boolean`: `reamostrar(t, 0.2)` e algum ponto dentro de alguma caixa inflada por `folga`. Exportadas (o teste do DoD usa as duas).

**`comporNotas(marcas, base, ctx, cfg) → { tracos, avisos }`** por página. `base = { pagina, tracos, grupos, ancoras (desta página), papel, coluna:{x, l} (área do texto), faixa:{x,y,l,a}|null, calha:{x, l}, tamanho }`. `cfg = { tamanhoNotas = 0.6·tamanho, conector:'linha'|'chave'|'seta', espontaneo 0–1, seed }`. `ctx.maoNotas` escreve; traço de mão = `reamostrar(t, 0.5)` + desvio `ruido1d(seed|k, s/8)·(0.12 + 0.3·maoNotas.tremor)` mm na normal.
Ocupado = caixas das palavras (todas, infladas `VAO`) + o que já foi posto. Ordem: correções → sublinhar/circular → notas marginais (por y da âncora) → espontâneo.
- **Risco** (correção): polilinha de `x0 − 0.3` a `x1 + 0.3` em `y0 + 0.55·a` da caixa, ondulação ±0.2. **`certo`**: faixa livre acima = entre o fundo das caixas da linha anterior (mesma coluna; topo da coluna se 1ª linha) e o topo da caixa da palavra; se `≥ 1.8 mm`: `escreverEm(certo, …, centro)` com `tamanho = min(tn, faixaLivre − 2·VAO)` centrado sobre a palavra e preso na coluna; senão vira nota marginal `certo`.
- **Sublinhar**: `y = min(y1 + VAO, topo da linha seguinte − VAO)`, preso em `≥ base + 0.15·tamanho`; de `x0` a `x1`.
- **Circular**: superelipse `|x/a|^4 + |y/b|^4 = 1` em torno do centro, `a = l/2 + VAO + 0.5`, `b = alt/2 + VAO + 0.3`, 1,08 volta (o laço não fecha certinho).
- **Nota marginal** (só com `faixa`): topo desejado = base da linha âncora − `tamanho`; `y = max(desejado, fimAnterior + VAO + 0.5·tn)`; `compor(texto, fontes, maoNotas, paginaDaFaixa, {tamanho: tn, entrelinha: 1.3, topo: y})` com `paginaDaFaixa` = papel com margens que deixam só a faixa. Se der > 1 página ou sair pelo pé → **descarta + aviso** `nota não coube na página N: "…"`. Sem faixa (`marginalia:'nenhuma'`) → aviso e descarta.
- **Conector** (lado direito; esquerdo espelha): `xFim` = maior `x1` das caixas da linha âncora; `yM = base − 0.3·tamanho`; `xc = calha.x + calha.l/2`. `linha` = polilinha `(xFim + VAO, yM) → (xc, yM) → (xc, yNota) → (faixa.x − VAO, yNota)` com `yNota` = meio da 1ª linha da nota (ortogonal: só anda em branco). `seta` = `linha` + ponta de 2 riscos de 1.2 mm a ±30° em `(xFim + VAO, yM)`. `chave` = chave "}" na calha cobrindo `[base − tamanho, base + 0.3·tamanho]` da linha âncora, bico para a faixa; se `|yNota − yM| > tn`, rabicho do bico até a nota pelo mesmo caminho em L.
- **Espontâneo** (`espontaneo` 0 → nenhum traço extra, exatamente): por página `n = floor(esp·6 + r())`; tipo sorteado: sublinhado 30% (palavra sem marca), asterisco 20% (3 riscos de 1.6 mm a 60°, na calha ao lado de uma linha), `?` 15% (`escreverEm('?')` na calha/faixa), rabisco 35% (lado 5–8 mm). Lugar: candidatos em grade de 2 mm na faixa, na calha e abaixo do `fim` do texto, em ordem sorteada; primeiro que não `sobrepoe` o ocupado; sem lugar → pula (sem aviso).
- **Rabiscos** `rabisco(tipo, caixa, seed) → Traco[]` (dentro da caixa, `problemas` vazio): `espiral` (arquimediana, 3–4 voltas, ~8 linhas próprias), `estrela` (`circulo(caixa, {aneis: [], poligonos: [{n:5, passo:2, raio:1}]}, seed)` do arcano), `caixa` (retângulo + `hachura` de `geo.js`, espaço 0.8), `flor` (`florao(caixa, {petalas: 5}, seed)` da filigrana).

**Regra "nota não sobrepõe texto" (o algoritmo é a construção, o teste é a prova):** (1) o texto é composto com a faixa **fora** das margens, então nota marginal nunca disputa espaço; (2) todo traço da camada de notas é posto só depois de checar `sobrepoe(traço, ocupado, VAO) === false`, senão é descartado com aviso; (3) exceções declaradas — risco, sublinhado e laço podem tocar **a própria palavra-alvo** (nunca outra).

**PARAMS** (grupo `'notas'`, prévia `ctx.escrever` + desenho): `espontaneo` (faixa 0–1, 0.05, padrão 0; prévia: palavra 'nota' + rabiscos numa caixa 40×20 — v=0 ainda devolve a palavra), `conector` (opção linha|chave|seta, padrão linha; prévia: 'texto' à esquerda, 'nota' à direita, o conector entre).

## 2. Materiais

**`src/materiais/carta.js` — `comporCarta(texto, ctx, cfg) → Documento`** (carta/anotação/diário = presets do mesmo material)
`PRESETS = { carta: {marginalia:'nenhuma', espontaneo:0}, anotacao: {marginalia:'direita', faixa:0.3, espontaneo:0.2}, diario: {marginalia:'esquerda', faixa:0.25, espontaneo:0.35} }`; `cfg = { papel, tipo:'carta', tamanho:6, entrelinha:1.6, alinhamento:'esquerda', marginalia, faixa (fração da largura útil), conector:'linha', espontaneo, tamanhoNotas, canetaTexto:'preta', canetaNotas:'vermelha', seed:1 }` (cfg explícito vence o preset).
1. `{limpo, marcas} = parsearNotas(texto)`.
2. `calha = max(3, 0.5·tamanho) + 0.3·tamanho` (tolerância do layout); papel do texto = `cfg.papel` com a margem do lado da marginália somada de `faixa·útil + calha`.
3. `r = compor(limpo, fontes, mao, papelTexto, {tamanho, entrelinha, alinhamento})`.
4. por página: `comporNotas(marcas da página, base, ctx, cfg)`.
5. `paginas[i].camadas = [{id:'texto', caneta: canetaTexto, personagem, ordem:'escrita', grupos: r.grupos[i], tracos}, {id:'notas', caneta: canetaNotas, personagem: personagens.notas, ordem:'otimizada', tracos}]` — as duas sempre presentes (export por camada estável). `avisos` = do compor (sem a linha "tolerancia") + das notas.
PARAMS (grupo `'carta'`): `tipo` (opção carta|anotacao|diario), `marginalia` (opção nenhuma|esquerda|direita), `faixa` (faixa 0.15–0.45, 0.01, padrão 0.3); prévia: papel A5 com retângulos da área de texto e da faixa.

**`src/materiais/livro.js` — `comporLivro(texto, ctx, cfg) → Documento`**
`cfg = { papel, tamanho:5, entrelinha:1.5, alinhamento:'justificado', colunas:1|2, vaoColunas, titulo:'', inicio:1, numeracao:true, reclamo:true, cabecalhoNaPrimeira:false, capitular: null | {estilo, linhas:3}, borda: null | {estilo, …P da borda}, rubrica:true, seed:1 }`. `colunas` fora de {1, 2} → `Error('livro: 1 ou 2 colunas')`.
1. Área: `miolo(caixa útil, cfg.borda)` se há borda, senão a caixa útil. `tc = max(2.5, 0.6·tamanho)`. Faixa do cabeçalho = topo da área, altura `2·tc`; rodapé = pé da área, altura `2·tc`; texto entre as duas com folga `0.5·tc`.
2. Capitular: se `cfg.capitular` e o 1º caractere é letra → `caixa = caixaCapitular({x, y: topoTexto, linhas, entrelinha: tamanho·entrelinha})`, `capitular(caixa, cfg.capitular, seed, fontes)`; obstáculo `{pagina:0, ...caixa}` (layout já trata; coluna 0 da página 0); texto composto sem a 1ª letra. Não é letra → sem capitular + aviso.
3. `r = compor(textoSemCapitular, fontes, mao, papelTexto, {tamanho, entrelinha, alinhamento, colunas, vaoColunas, obstaculos})`.
4. **Paginação** — `paginacao(r, cfg) → [{ numero, cabecalho, reclamo }]` (pura, exportada, testável): `numero = String(inicio + i)` se `numeracao`; `cabecalho = titulo` se `titulo` e (`i > 0` ou `cabecalhoNaPrimeira`), senão `null`; `reclamo = r.ancoras.find(a => a.pagina === i + 1)?.texto ?? null` se `reclamo` (última página: `null`). Desenho com `escreverEm(…, ctx.fontes, ctx.mao)`, tamanho `tc`: cabeçalho **centrado** na faixa do topo; número **centrado** no rodapé; reclamo **alinhado à direita** no rodapé (borda direita do texto). Número e reclamo nunca se tocam: se `caixaDe` colidir, reclamo desce `0.5·tc` (cabe na faixa) — senão aviso.
5. Camadas em ordem de caneta (1 troca por página): `texto` (preta, `'escrita'`, `grupos`), `paginacao` (preta: número + reclamo), `iluminura` (preta: borda), `rubrica` (caneta `cfg.rubrica ? 'vermelha' : 'preta'`: capitular + cabeçalho corrente). Camada vazia fica (export estável).
PARAMS (grupo `'livro'`): `numeracao` (marca), `reclamo` (marca), `rubrica` (marca), `capitularLivro` (opção nenhuma + estilos do M18), `bordaLivro` (opção nenhuma + estilos); prévia: papel A6 com pautas + o elemento.

**`src/materiais/sigilos.js` — `comporSigilos(frases, ctx, cfg) → Documento`** (folha de sigilos)
`frases`: string, uma por linha (vazias ignoradas). `cfg = { papel, tipo:'selo'|'sigilo'|'circulo', metodo:'kamea', colunas:3, legendas:true, tamanhoLegenda:3, complexidade:0.5, caneta:'preta', seed:1 }`.
Grade: `cw = (útil.l − (colunas−1)·4)/colunas`, `ch = cw + (legendas ? 2.2·tamanhoLegenda : 0)`, `linhas = max(1, floor((útil.a + 4)/(ch + 4)))`; pagina quando enche. Célula `i`: quadrado `lado = cw − 2·VAO` no topo da célula; `sigilo` → `sigiloPalavra(q, {frase, metodo}, seed + i, ctx)`; `selo` → `selo(q, {texto: frase, pontas: 5, centro: {tipo:'tracos', raio:0.3, tracos: sigiloPalavra({x:0,y:0,l:10,a:10}, {frase, metodo}, seed + i, ctx)}}, seed + i, ctx)`; `circulo` → `circulo(q, circuloAleatorio(seed + i, complexidade), seed + i, ctx)`. Legenda: `escreverEm(frase, faixa abaixo do quadrado, {centro, tamanhoLegenda})`; mais larga que `cw` → aviso (não encolhe).
Camadas: `sigilos` (caneta `cfg.caneta`, otimizada), `legendas` (preta, otimizada). Zero frases → 1 página vazia + aviso "Nenhuma frase".
PARAMS (grupo `'sigilos'`): `tipoSigilo` (opção selo|sigilo|circulo), `colunasGrade` (faixa 1–5, passo 1, padrão 3), `legendas` (marca); prévia: célula de 30 mm com o tipo / grade de retângulos.

**`src/materiais/scroll.js` — porte sem quebrar o golden**
- A função atual vira **`paginasGrimorio(magias, ctx, cfg, pagina)`**, corpo idêntico (mesma saída `{paginas: Traco[][], avisos, modos}`).
- Marcação por identidade, sem mudar a ordem: `const SIGILO = new WeakSet(), MOLDURA = new WeakSet()`; `comporMagia` faz `SIGILO.add` em cada traço de sigilo; o laço da moldura faz `MOLDURA.add`. (`ponytail:` WeakSet em vez de reestruturar; vale enquanto os traços não forem copiados no caminho.)
- **`comporGrimorio(magias, ctx, cfg) → Documento`** (`cfg.papel` obrigatório): `r = paginasGrimorio(magias, ctx, cfg, cfg.papel)`; cada página vira `[{id:'texto', preta, 'otimizada', p.filter(nem SIGILO nem MOLDURA)}, {id:'moldura', preta, …}, {id:'sigilo', caneta: cfg.rubrica === false ? 'preta' : 'vermelha', …}]`; `doc.avisos = r.avisos`; `doc.modos = r.modos` (campo extra; a UI mostra os modos). **`comporScroll(magias, ctx, cfg)`** = `comporGrimorio` com `porPagina: true`.
- `test/golden.test.mjs` e `test/grimorio.test.mjs`: **só a linha do import** muda para `import { paginasGrimorio as comporGrimorio, … }`; corpo dos testes e `.snapshot` intocados; passam **sem** `--test-update-snapshots`. `src/ui/grimorio.js:369` troca o nome da chamada para `paginasGrimorio` (a UI só passa ao Documento na onda 3).

## 3. Rubrica, reclamo, cabeçalho corrente, nº de página (adiados do M18): onde moram
- **Rubrica** não é gerador: é a **caneta** `vermelha` de uma camada. Mora em cada material: livro (camada `rubrica` = capitular + cabeçalho), grimório (camada `sigilo`), carta (camada `notas` por padrão). Flag `cfg.rubrica`.
- **Cabeçalho corrente, nº de página, reclamo**: em `livro.js` (`paginacao` = plano de texto, puro; desenho com `escreverEm`). Não vão para `src/ornamento/` (são texto; ornamento não importa layout/motor).

## 4. UI (onda 3) — mínimo para usar cada material
- **`app.js`**: `renderizar` aceita Documento: `e.doc = r.paginas?.[0]?.camadas ? r : deTracos(...)` (scroll/legado continuam). `criarEscrita.compor` chama `comporCarta` em `#carta` e `comporLivro` em `#livro` (o `composB` de comparar idem, com `variacaoB`). `criarSigilos` passa a `comporSigilos` e ganha o grupo **Máquina** (perfil personalizado editável também aqui). Tira `'variacao'` de `COMPARTILHADAS` (menor do M15: variação do grimório sobrescrita). Sigilos usa `largura`/`altura` do estado quando `personalizado` (menor: papel fixo 148×210).
- **`src/ui/materiais.js`** (novo; um `montar*` por oficina, com `controle()` dos PARAMS novos):
  - **Carta** — grupo "Notas": `tipo`, `marginalia`, `faixa`, `conector`, `espontaneo`; select **personagem das notas** (salvos em `writer.personagens` + "o mesmo da escrita") e select **caneta das notas** (`CANETAS`); bloco fixo de ajuda com a marcação (`{nota: …}`, `{~errado~>certo}`, `{_…_}`, `{o:…}`).
  - **Livro** — grupo "Livro": `titulo` (input texto), `inicio` (número), `numeracao`, `reclamo`, `rubrica`, `capitularLivro`, `bordaLivro`; `colunas` já existe em "Papel e aparência".
  - **Sigilos** — "Folha": papel (já existe); "Sigilos": textarea de frases (uma por linha), `tipoSigilo`, `metodo` (do `sigilo.js`), `colunasGrade`, `legendas`, caneta; "Tradição" fica (estilo do alfabeto arcano + `forma` do M19).
  - Grimório: `compor` passa a `comporGrimorio(..., {...cfg, papel})` e lê `doc.modos`.
- **`exportar.js`** (export por camada): select **"Camada: todas | <ids>"** na barra (ids da página atual); `svgDocumento`/`gcodeDocumento` recebem `{camadas: [id]}` quando não é "todas"; nome `${oficina}-p${i+1}-${id}.svg|gcode`; resumo de traços reflete a camada. `paginaOtimizada` e `previa.js` repassam `grupos: c.grupos` ao `otimizar` (com "otimizar" desligado, sem grupos = ordem crua).

## 5. Testes ligados ao DoD (um arquivo por tarefa; goldens pequenos)
Helpers `r3/linhas` copiados de `test/no.test.mjs`. Fontes reais `EMSBird` (texto) e `EMSAllure` (notas); `HersheyGothEnglish` para capitular. `resumo(doc)` = por página/camada: `{id, caneta, n: tracos.length, caixa: r3(caixaDe), primeiros: r3(tracos.slice(0, 2))}` — golden pequeno que pega mudança.
- **`test/grupos.test.mjs`** (22-A): `grupos[p].length === ancoras da página p`; grupos crescentes; texto com palavra quebrada e 2 colunas; `otimizar` escrita+grupos: blocos inteiros, ordem interna e sentido preservados, é permutação dos blocos; `viagem(escrita+grupos) ≤ viagem(escrita crua)` num texto de 3 linhas embaralhado; `validarDocumento` recusa grupos fora de ordem/ fora do intervalo; `gcodeDocumento` com `id: 'a\nG28'` não gera linha `G28`; `escreverEm` centro (|centro − alvo| < 0.01) e direita (x1 = alvo). `golden.test.mjs` e `golden-layout.test.mjs` verdes sem flag.
- **`test/notas.test.mjs`** (22-B): parser — os 4 tipos, palavra parcial, marca no início/fim, duas notas seguidas, chave sem fechar (literal + aviso), `\n` e espaços duplos (índices = `ancora.indice` de um `compor` real); `rabisco` × 4 tipos × 3 caixas: `problemas` vazio, determinístico; `sobrepoe` com casos de borda.
- **`test/carta.test.mjs`** (22-B): **DoD "nota não sobrepõe texto"**: 3 presets × conector 3 × `espontaneo` {0, 0.5, 1} × seeds 1–3, texto de ~80 palavras com 3 notas, 1 correção, 1 sublinhar, 1 circular em A5: `validarDocumento = []`; para cada traço de `notas`, `sobrepoe(t, caixas de palavras que não são o alvo dele) === false` (o teste reconstrói alvo: risco/sublinhado/laço por proximidade à caixa da marca); nota marginal inteira dentro da faixa; `espontaneo 0` sem marcas → camada `notas` vazia; determinismo (`deepEqual`). **DoD "export por camada"**: `gcodeDocumento(pg, papel, megaS, {camadas:['notas']}).nTracos + idem['texto'] = completo`, completo com `trocas === 1` (preta→vermelha), SVG por camada só com o `g[data-camada]` dela. Golden: `resumo` de carta A6 'anotacao' seed 1.
- **`test/livro.test.mjs`** (22-C): **DoD ≥ 3 páginas** (texto que dá 4 páginas A6, 1 e 2 colunas): `paginacao` — números `inicio..`, cabeçalho ausente na 1ª e presente nas demais, reclamo da página i = 1ª palavra das âncoras da i+1, última sem reclamo; geometria — caixa do número centrada (±0.5 mm) e dentro do rodapé, cabeçalho dentro da faixa do topo, reclamo encostado à direita do texto, nenhum deles `sobrepoe` palavras nem um ao outro; capitular não sobrepõe texto; `colunas: 2` tem âncoras com `coluna` 0 e 1 na mesma página; `colunas: 3` lança; `validarDocumento = []`; camadas na ordem e com as canetas da §2. Golden: `resumo` de A7 com 2 colunas, capitular lombarda, 3 páginas.
- **`test/sigilos.test.mjs`** (22-D): 7 frases × 3 tipos em A6 com 3 colunas → 2 páginas; todo traço de sigilo dentro da sua célula (`problemas(t, célula)`), legenda abaixo do quadrado e sem sobrepor sigilo; `validarDocumento = []`; zero frases → aviso; determinismo. Golden: `resumo` de 4 frases tipo selo, A6, 2 colunas.
- **`test/scroll-doc.test.mjs`** (22-E): para os 2 casos do golden, `comporGrimorio` (doc) concatenando camadas = mesmo multiconjunto de traços (JSON ordenado) de `paginasGrimorio`; camada `sigilo` não vazia na página da magia e vermelha; `validarDocumento = []`; `comporScroll` = 1 magia por página.
- `test/params.test.mjs` descobre os PARAMS novos e passa **sem edição**.
- **`e2e/materiais.spec.js`** (22-F): `#carta` com marcação no textarea → prévia com `g[data-camada=texto]` e `g[data-camada=notas]` e nenhum `{` desenhado (texto limpo); `#livro` com texto longo → "Página 1 de ≥3"; `#sigilos` com 4 frases → 4+ grupos de traços; troca de oficina não perde a variação do grimório. **`e2e/exportar.spec.js`** (22-G): escolher camada "notas" → download `carta-p1-notas.svg` só com aquele `g`; "todas" → os dois.

## 6. Tarefas (3 ondas; arquivos disjuntos dentro de cada onda, inclusive testes)
| onda | tarefa | modelo | arquivos (só estes) | faz |
|---|---|---|---|---|
| 1 | **22-A** | sonnet | `src/layout.js`, `src/maquina/otimizar.js`, `src/maquina/gcode.js`, `src/materiais/documento.js`, `test/grupos.test.mjs` | §0 |
| 2 | **22-B** | sonnet | `src/materiais/notas.js`, `src/materiais/carta.js`, `test/notas.test.mjs`, `test/carta.test.mjs` (+ `.snapshot`) | §1 + carta |
| 2 | **22-C** | sonnet | `src/materiais/livro.js`, `test/livro.test.mjs` (+ `.snapshot`) | livro + §3 |
| 2 | **22-D** | haiku | `src/materiais/sigilos.js`, `test/sigilos.test.mjs` (+ `.snapshot`) | folha de sigilos |
| 2 | **22-E** | sonnet | `src/materiais/scroll.js`, `test/scroll-doc.test.mjs`, import em `test/golden.test.mjs` e `test/grimorio.test.mjs`, 1 linha em `src/ui/grimorio.js` | porte do scroll |
| 3 | **22-F** | sonnet | `src/ui/app.js`, `src/ui/materiais.js` (novo), `src/ui/grimorio.js`, `e2e/materiais.spec.js` | §4 menos exportar |
| 3 | **22-G** | haiku | `src/ui/exportar.js`, `src/ui/previa.js`, `e2e/exportar.spec.js` | export por camada + grupos |
Sequência: onda 1 → gate → onda 2 (4 em paralelo) → gate → fichas 1–5 → revisor → onda 3 → gate → fichas 6–7 → revisor final do marco.
Verificação de cada worker: `node --test test/<seus>.test.mjs` verde (golden gravado uma vez com `--test-update-snapshots` **só no próprio arquivo** e re-rodado sem a flag); `node --test test/params.test.mjs test/golden.test.mjs test/golden-layout.test.mjs` verdes **sem edição de snapshot**; `git status` só com os seus arquivos. Faltou algo em arquivo de outra tarefa (`geo.js`, ornamento, arcano)? **Não edita**: faz local e relata.
Gate do orquestrador: `npm test`, `npm run build`, `npm run e2e` (onda 1–2: nada visual muda exceto a ordem de traçado da prévia com trajeto; captura diferente = investigar); `git diff --stat` sem `src/ornamento`, `src/arcano`, `src/motor`, `src/geo.js`, `src/ajuda.js`, snapshots antigos.

## 7. Fichas e capturas para o revisor (o orquestrador gera; script descartável `workflow/ciclos/22/especimes.mjs`)
SVG por folha com cor por caneta (preta/vermelha), caixa das palavras em cinza tracejado (só na ficha), barra de 10 mm; PNG pelo Playwright.
1. **Carta anotada** A5, preset anotação: 3 notas (curta, longa de 3 linhas, uma que precisa descer), 1 correção que cabe na entrelinha e 1 que vira marginal, sublinhado, laço; conector linha/chave/seta lado a lado.
2. **Espontâneo** 0 / 0.5 / 1 (mesmo texto, seed 1) + diário (marginália esquerda); ampliado 3× de uma espiral, estrela, caixinha hachurada, flor (a caneta 0,4 empasta?).
3. **Livro** A6, 4 páginas, 1 coluna com capitular lombarda + borda vinha; e 2 colunas com capitular habitada; números, cabeçalho e reclamos legíveis (ampliar rodapé 3×).
4. **Folha de sigilos** A5: selo, sigilo kamea e círculo, 3 colunas, com legendas.
5. **Grimório no Documento**: página com texto preto, sigilo vermelho, moldura — e o mesmo exportado por camada (3 SVGs lado a lado); tabela de `viagem` escrita÷otimizada para carta e livro (risco 4.8.2) e `trocas` por página.
6. **Capturas da UI** (onda 3): `#carta`, `#livro`, `#sigilos` com o painel novo aberto, claro e vela, 1280 px e 375 px; barra com o select de camada aberto.
7. **G-code**: trecho com a troca `M0 Trocar caneta: vermelha (rubrica)` entre camadas e o arquivo por camada sem `M0`.
O revisor responde por folha: alguma nota/marca sobre outra palavra? conector cruza texto? rabisco parece rabisco de pessoa? paginação no lugar certo e legível? 2 colunas equilibradas? legenda casa com o sigilo? painel usável sem ler a spec?

## 8. Riscos e o que NÃO fazer
Riscos:
1. **Golden do layout**: `grupos` é chave nova; qualquer mudança em `paginas/ancoras/fim` quebra `golden-layout` → só um `push` de inteiro em `fecha()`, rodar os goldens antes de entregar.
2. **`ordem:'escrita'` aumenta a viagem** (§4.8.2): o guloso por blocos limita; ficha 5 mede. Se passar de 1,5× a otimizada, registrar no QUADRO (não otimizar dentro da palavra).
3. **Entrelinha apertada**: com `entrelinha` < 1.4 quase nenhuma correção cabe acima → vira marginal; sem faixa, é descartada com aviso (não sobrepõe nunca).
4. **Nota longa / muitas notas**: descarta com aviso em vez de criar página — o usuário vê no painel de avisos.
5. **Laço em palavras coladas**: a superelipse pode tocar a vizinha com `espacoPalavra` negativo → o teste com mão padrão pega; se tocar, a marca é descartada (regra 2), não desenhada torta.
6. **WeakSet no scroll** depende de identidade dos traços; se alguém copiar traços em `comporMagia`, o sigilo cai na camada texto (o teste `scroll-doc` pega: camada sigilo não vazia).
7. **Desempenho**: carta chama `compor` 1× + 1 por nota; livro 1× + 3 pequenos por página; selo com fusão é O(n·m) por célula. M21 mede (< 400 ms A4); se a prévia arrastar, cache por página fica para o M21.
8. **`params.test` importa todo `src/`**: erro de sintaxe num material derruba o contrato de todos → cada worker roda o próprio teste + params antes de entregar.
9. **Fontes da capitular** (risco 6 do M18): a UI já carrega todas as `FONTES`; o teste usa `HersheyGothEnglish` real.

Não fazer:
- Não editar `src/ornamento/*`, `src/arcano/*`, `src/motor/*`, `src/geo.js`, `src/rng.js`, `src/ajuda.js` (rótulos/ajudas novos ficam inline nos PARAMS, ≤ 220), snapshots existentes. Nunca `npm run golden`.
- Não mudar a saída de `compor` além da chave `grupos`; não mudar `paginasGrimorio`; não mudar `otimizar` para `ordem:'otimizada'`.
- Sem DOM fora de `src/ui/`, sem `Math.random`/`Date`/`hash()` cru, sem dependência nova, sem booleanos de polígono (sobreposição = amostragem por pontos).
- Não criar `seed` como PARAM; não afrouxar teste que falha por defeito do gerador — relatar.

Fora do escopo (QUADRO): notas/glosas no livro e no grimório; marginália nos dois lados; nota que transborda para página nova ou rodapé de notas; marcação aninhada e acento circunflexo de inserção (‸); cabeçalho alternado verso/recto, nº externo, algarismo romano, foliação; `ordem:'escrita'` no grimório/scroll; 2-opt de blocos; sintaxe por linha na folha de sigilos (`selo: frase`); legenda que encolhe para caber; arrastar nota na prévia; caneta por elemento dentro da camada.
