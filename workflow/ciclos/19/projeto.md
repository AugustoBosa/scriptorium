# M18 — Ornamento (spec do conselheiro)

DoD (EXPANSAO §4.7): cada gerador determinístico, dentro da caixa, sem NaN, sem traço < 2 pontos, com golden e prévia.
Contrato (§4.2): todo gerador é `(caixa {x,y,l,a}, params, seed) → Traco[]`, mm, y para baixo. `params` incompleto → completa com o `P` (padrões) do módulo. Caixa com `l <= 0` ou `a <= 0` → `[]`.
**Proibido tocar:** `src/motor/*`, `src/layout.js`, `src/ajuda.js`, `test/params.test.mjs`, snapshots existentes (M17 roda em paralelo).

**"Dentro da caixa" tem um mecanismo só:** todo gerador termina com `return recortarCaixa(tracos, caixa)` (recorta e prende as coordenadas na caixa). A geometria já é projetada para caber; o recorte é o cinto de segurança.

## 1. `src/geo.js` (import único: `hachureLines` de `'hachure-fill'`)

```js
dist(a, b)  comprimento(t)
ret(x0, y0, x1, y1) → Traco fechado     retDe(caixa) → Traco     inset(caixa, d) → caixa (l, a nunca < 0)
circulo(cx, cy, r, n = 24) → Traco fechado (n+1 pontos)     arco(cx, cy, r, a0, a1, n = 12) → Traco (radianos)
caixaDe(tracos) → {x, y, l, a}                      // caixa envolvente
limpar(tracos) → Traco[]                            // tira ponto repetido em sequência (dist < 1e-9) e traço com < 2 pontos. NÃO esconde NaN
reamostrar(t, passo) → Traco                        // n = max(1, ceil(L/passo)); pontos nos arcos k·L/n, k = 0..n (extremos inclusos)
encaixar(tracos, caixa) → Traco[]                   // escala uniforme s = min(l/b.l, a/b.a) (dimensão 0 → usa a outra; as duas 0 → 1) e centraliza
recortarCaixa(tracos, caixa) → Traco[]
recortarRaio(t, c, r) → Traco[]                     // tira a parte de t dentro do círculo
afastar(tracos, obstaculos, folga, passo = 0.5) → Traco[]
deslocar(t, d) → Traco                              // offset ingênuo por normais
hachura(poligonos, { angulo = 45, espaco = 1, cruzada = false } = {}) → Traco[]
problemas(tracos, caixa, eps = 1e-6) → string[]     // 'traço i: < 2 pontos' | 'não finito' | 'fora da caixa'; [] = ok (usado por todos os testes)
```

**API real do `hachure-fill` 0.5.2** (`node_modules/hachure-fill/bin/hachure.js`, ESM): `hachureLines(polygons, hachureGap, hachureAngle, hachureStepOffset = 1) → [[x,y],[x,y]][]`. Quatro armadilhas, conferidas rodando:
1. Polígono solto cujo primeiro x é `0` é tomado por lista de polígonos e **estoura** (`p is not iterable`) → passar **sempre lista** `[poligono]`.
2. **Muta** os polígonos (gira e desgira no lugar) → passar cópia.
3. Arredonda x para inteiro (`Math.round`) e, com `stepOffset = 1`, só serve para `gap` inteiro → trabalhar em centésimos de mm (`K = 100`) e passar `stepOffset = gap`.
4. A primeira linha cai sobre o vértice/aresta mais baixa (pode ter comprimento 0) → filtrar.
Vários polígonos = regra par-ímpar (anel = `[fora, dentro]`; conferido).

```
const K = 100
hachura(poligonos, {angulo, espaco, cruzada}):
  lista = typeof poligonos[0][0] === 'number' ? [poligonos] : poligonos
  e = max(espaco, 0.1) * K
  passada = (ang) => hachureLines(lista.map(p => p.map(([x,y]) => [x*K, y*K])), e, ang, e).map(l => l.map(([x,y]) => [x/K, y/K]))
  linhas = cruzada ? [...passada(angulo), ...passada(angulo + 90)] : passada(angulo)
  return linhas.filter(([a, b]) => dist(a, b) > 0.05)

recortarCaixa (Liang–Barsky por segmento): para cada traço, atual = []
  para cada segmento p→q, d = q−p, t0 = 0, t1 = 1:
    para (pk, qk) em [(−dx, px−x), (dx, x+l−px), (−dy, py−y), (dy, y+a−py)]:
      pk === 0: se qk < 0 → segmento fora;  senão r = qk/pk;  pk < 0 ? t0 = max(t0, r) : t1 = min(t1, r)
    t0 > t1 → fora
    dentro: se atual vazio ou t0 > 0 → fecha(atual), atual = [p + d·t0];  atual.push(p + d·t1);  se t1 < 1 → fecha
    fora: fecha
  todo ponto emitido é preso: x em [x, x+l], y em [y, y+a].  fecha = guarda se ≥ 2 pontos.  No fim: limpar

recortarRaio(t, c, r): atual = dist(t[0], c) >= r ? [t[0]] : []
  para cada segmento p→q: raízes u ∈ (0,1) de |p + u(q−p) − c|² = r², crescentes (discriminante ≤ 0 → nenhuma)
    para cada raiz X: se atual.length → atual.push(X), fecha;  senão atual = [X]        // alterna entra/sai
    se atual.length → atual.push(q)
  fecha; limpar

afastar: O = todos os pontos de obstaculos reamostrados a `passo`
  cada traço reamostrado a `passo` é quebrado nas sequências de pontos com distância mínima a O > folga; limpar
  // ponytail: O(n·m) ingênuo; grade espacial se ficar lento

deslocar(t, d): t sem pontos repetidos; fechado = dist(primeiro, último) < 1e-9
  normal do segmento = [−dy, dx] / comprimento
  em cada vértice: na = normal do segmento anterior, nb = do seguinte (ponta aberta: o único vizinho; fechado: dá a volta)
    m = normalizar(na + nb) (|na+nb| < 1e-9 → nb);  p' = p + m · d / max(0.5, m·nb)
  fechado → repete o primeiro ponto no fim
  // ponytail: mitra limitada a 2d, sem tratar autointerseção; trocar por paper.js se incomodar
```

## 2. Geradores

Regra do rng (igual ao M16): nunca `hash()` cru; cada decisão usa fluxo próprio sem estado, `rng(seed + '|nome|' + chave)()`, para que mexer num parâmetro não embaralhe os outros. `seed` é número ou string.

**PARAMS** (todo módulo de `src/ornamento/`): `rotulo` e `ajuda` (≤ 220 caracteres, pt-BR simples) **escritos no próprio arquivo**, como em `src/arcano/alfabeto.js` — não usar `src/ajuda.js`. Prévia: `const pv = (chave, caixa, extra = {}) => (v) => gerador(caixa, { ...P, ...extra, [chave]: v }, 1)`, caixa fixa em mm com origem em 0,0. `tipo: 'faixa'` exige prévia de `min` ≠ prévia de `max`; toda prévia devolve ≥ 1 traço.

### 2.1 `src/ornamento/no.js` — nó celta (método de Mercat, como o celtic-knot do BorisTheBrave; não copiar código)

`no(caixa, params, seed) → Traco[]`, `grade(caixa, celulas) → {C, L, tx, ty}`, `P`, `PARAMS` (grupo `'no'`).

| chave | tipo | faixa / opções | padrão | nível | caixa da prévia |
|---|---|---|---|---|---|
| `celulas` | faixa | 1–12, passo 1 (células no lado curto) | 4 | basico | 30×30 |
| `aro` | faixa | 0–3, passo 1 (0 = painel cheio; n = moldura de n células, miolo vazio) | 0 | avancado | 30×30, `celulas: 8` |
| `quebras` | faixa | 0–1, passo 0.01 | 0.15 | basico | 30×30 |
| `simetria` | opcao | `nenhuma`, `espelho`, `quadrupla` | `quadrupla` | basico | 30×30, `quebras: 0.3` |
| `fita` | faixa | 0–0.2, passo 0.01 (fração da célula; 0 = linha simples) | 0.12 | basico | 30×30 |
| `vao` | faixa | 0.02–0.15, passo 0.01 (fração da célula) | 0.06 | avancado | 30×30 |

```
grade: t = min(l,a)/celulas;  C = max(1, round(l/t));  L = max(1, round(a/t));  tx = l/C;  ty = a/L
ativa(i,j) = 0 ≤ i < C e 0 ≤ j < L e (aro === 0 ou min(i, j, C−1−i, L−1−j) < aro)
Pontos em meias-células (inteiros): px + py ímpar = meio de aresta. px ímpar = aresta horizontal (células (i, j−1) e (i, j), i = (px−1)/2, j = py/2);
  px par = aresta vertical (células (i−1, j) e (i, j), i = px/2, j = (py−1)/2).  mm = [x + px·tx/2, y + py·ty/2]
estado(aresta): n = nº de células vizinhas ativas
  n = 1 → parede ao longo da aresta ('h' se horizontal, 'v' se vertical)
  n = 2 → r = rng(seed + '|q|' + canon(aresta));  r() < quebras ? (r() < 0.5 ? 'h' : 'v') : 'x'
canon: 'nenhuma' → 'px|py';  'espelho' → menor string entre (px,py) e (2C−px, py);  'quadrupla' → menor entre os 4 espelhos (2C−px, 2L−py)
Segmentos: cada célula ativa tem 4 — de N (2i+1, 2j) dir (+1,+1); de E (2i+2, 2j+1) dir (−1,+1); de S (2i+1, 2j+2) dir (−1,−1); de W (2i, 2j+1) dir (+1,−1).
  chave do segmento = (2px+dx) + '|' + (2py+dy).  Para cada segmento não visitado, traça um laço:
  (p, d) = início;  repete: marca o segmento (p,d);  q = p + d;  e = estado(q)
     e === 'x' → tipo = ((q.x ímpar) === (d.x·d.y < 0)) ? 'cima' : 'baixo'          // garante alternância ao longo de qualquer fio
     senão     → tipo = 'volta';  d = e === 'h' ? (d.x, −d.y) : (−d.x, d.y)
     laço.push({q, tipo});  p = q;   até (p, d) voltar ao início
Peças: gira o laço para começar num 'baixo' e corta em todo 'baixo' (a peça inclui os dois extremos). Sem 'baixo' → peça fechada.
Polilinha da peça (mm): vértice 'cima' e extremos ficam; vértice 'volta' vira Bézier quadrática (meio do segmento anterior, vértice, meio do seguinte), 6 pontos.
  Peça fechada: todos os vértices, ciclicamente; repete o primeiro ponto.
Fita: f = min(fita, 0.2)·min(tx,ty);  g = vao·min(tx,ty)
  f < 0.05 → linhas = [poli], R = g;   senão linhas = [deslocar(poli, f/2), deslocar(poli, −f/2)], R = hypot(f/2, f/2 + g)
Por baixo: em peça aberta, cada linha passa por recortarRaio(·, extremoA, R) e cada pedaço por recortarRaio(·, extremoB, R).
return recortarCaixa(todas, caixa)
```
Cabe na caixa: os pontos ficam na grade (= caixa); a curva de volta chega a `ty/8` (ou `tx/8`) da parede e a meia-fita é ≤ 0,1 célula.
Fora: presets `anel` (polar) e `canto`; faixa = caixa estreita com `celulas: 1–2`; moldura = `aro`.

### 2.2 `src/ornamento/vinha.js` — colonização de espaço (módulo próprio: borda e capitular usam)

`vinha(caixa, params, seed) → Traco[]`, `P`, `PARAMS` (grupo `'vinha'`). Opcionais em `params` (sem PARAMS): `dentro: (p) => bool` (padrão: dentro da caixa), `raizes: [[x,y]]` (padrão: `[[x + E/2, y + a − E/2]]`), `escala: E` em mm (padrão `min(l,a)`).

| chave | faixa | padrão | nível | | chave | faixa | padrão | nível |
|---|---|---|---|---|---|---|---|---|
| `densidade` | 0.2–1 | 0.5 | basico | | `frutos` | 0–1 | 0.2 | avancado |
| `curvatura` | 0–1 | 0.4 | basico | | `espirais` | 0–1 | 0.2 | avancado |
| `folhas` | 0–1 | 0.5 | basico | | | | | |

Todos `faixa`, passo 0.01. Prévia: caixa 60×14, `escala: 14`.

```
D = clamp(0.12·E, 0.6, 3);  ALCANCE = 10·D;  MORTE = 2·D
atratores: n = min(1500, round(densidade · l·a / (2.5·D)²)) sorteios na caixa com rng(seed + '|atr'); fica quem passa em dentro()
nós = raízes que passam em dentro() (nenhuma → []), cada nó {p, pai, dir}
cada atrator guarda o nó mais próximo (perto, d) e só o atualiza contra os nós NOVOS de cada volta      // evita O(n·m) por volta
repete (máx. 600 voltas, máx. 3000 nós):
  para cada atrator com d < ALCANCE: soma em perto a direção unitária (atrator − nó)
  para cada nó k com soma: dir = normalizar(soma) girada de curvatura · 0.6 rad · ruido1d(seed + '|c', k·0.2)
     novo = p + dir·D;  descarta se !dentro(novo) ou se a posição arredondada a D/4 já existe (Set);  senão cria
  remove atratores com d ≤ MORTE;  volta sem nó novo → para
ramos: para cada ponta (nó sem filho), sobe pelos pais até um nó já emitido (inclusive) → polilinha ≥ 2 pontos
enfeites (fluxo rng(seed + '|enf'), consumo fixo: 3 números por ponta, 1 por nó de ramo):
  ponta: u1 < espirais → espiral (1,5 volta, raio 0.2·E, sai tangente);  senão u2 < frutos → cabinho + circulo(raio 0.07·E, 10);
         senão u3 < folhas → folha
  nó de ramo de índice múltiplo de 4, u < folhas → folha a ±60° da direção (lado alterna)
  folha = amêndoa fechada de comprimento 0.3·E e largura 0.12·E (dois arcos de 5 pontos, base → ponta → base)
  enfeite com algum ponto fora de dentro() não é desenhado
return recortarCaixa(ramos + enfeites, caixa)
```

### 2.3 `src/ornamento/borda.js`

`borda(caixa, params, seed) → Traco[]`, `miolo(caixa, params) → caixa` (o que sobra para o texto), `P`, `PARAMS` (grupo `'borda'`). Prévia: caixa 70×50, `largura: 6`.

| chave | tipo | faixa / opções | padrão | nível |
|---|---|---|---|---|
| `estilo` | opcao | `linhas`, `barra`, `vinha`, `no` | `linhas` | basico |
| `lados` | opcao | `todos`, `esquerda`, `topo`, `laterais`, `topo-base` | `todos` | basico |
| `cantos` | opcao | `nenhum`, `losango`, `trevo`, `no` | `losango` | basico |
| `largura` | faixa | 4–25 mm, passo 0.5 | 10 | basico |
| `hachura` | faixa | 0.4–3 mm, passo 0.1 (prévia com `estilo: 'barra'`) | 1.2 | avancado |

Sem PARAMS: `vinha` (objeto de params repassado a `vinha()`), `origem: [x,y]` (raiz da vinha, ex.: canto da capitular).

```
w = min(largura, min(l,a)/3)
partes (retângulos sem sobreposição): canto w×w onde os dois lados vizinhos estão ativos; tira de cada lado ativo entre os cantos
  canto vira enfeite se cantos ≠ 'nenhum'; senão é absorvido pela tira horizontal vizinha (se ativa; senão pela vertical)
  lado ativo sem vizinho ativo → a tira vai até o fim da caixa
canto q (centro c): losango → retDe(inset(q, 0.1w)) + losango pelos meios dos lados + losango de metade do tamanho
                    trevo   → 4 × circulo(c ± 0.2w no eixo, 0.22w) + circulo(c, 0.1w)
                    no      → no(q, { celulas: 2, quebras: 0 }, seed + '|canto' + k)
tira s: linhas → 2 retas ao longo do eixo longo, a 0.25w e 0.75w   (caso 'todos' + cantos 'nenhum': 2 retângulos concêntricos, insets 0.25w e 0.75w)
        barra  → r = inset(s, 0.15w): retDe(r) + hachura(retDe(r).slice(0, 4), { espaco: hachura })
        no     → no(s, { celulas: 2 }, seed + '|tira' + k)
        vinha  → UMA chamada para a borda inteira: região = tiras + cantos absorvidos, cada retângulo com inset 0.08w
                 vinha(caixa, { ...params.vinha, escala: w, dentro: p em algum retângulo da região,
                                raizes: origem (se dentro) senão uma por tira: meio do lado curto de início (esquerdo / de baixo), 0.3w para dentro }, seed)
miolo: caixa menos w em cada lado ativo
return recortarCaixa(tudo, caixa)
```

### 2.4 `src/ornamento/capitular.js`

`capitular(caixa, params, seed, fontes) → Traco[]` (4º argumento: mapa de fontes no formato de `parseFonte`), `caixaCapitular({ x, y, linhas, entrelinha, proporcao = 1 }) → { x, y, l: linhas·entrelinha·proporcao, a: linhas·entrelinha }` (é esta caixa que o M20 dá ao layout como obstáculo), `P`, `PARAMS` (grupo `'capitular'`).

| chave | tipo | faixa / opções | padrão | nível |
|---|---|---|---|---|
| `estilo` | opcao | `lombarda`, `contornada`, `habitada`, `filigranada`, `no` | `lombarda` | basico |
| `fonte` | opcao | `HersheyGothEnglish`, `HersheyGothGerman`, `HersheyGothItalian`, `HersheySerifBold` | `HersheyGothEnglish` | basico |
| `linhas` | faixa | 2–8, passo 1 | 3 | basico |
| `hachura` | faixa | 0–3 mm, passo 0.1 (0 = sem fundo) | 0 | avancado |

Sem PARAMS: `letra` (padrão `'A'`), `vinha`. Prévia: `(v, ctx) => capitular(caixaCapitular({ x: 0, y: 0, linhas: 3, entrelinha: 5 }), { ...P, [chave]: v }, 1, ctx.fontes)`; a de `linhas` usa `linhas: v` e soma `v` pautas `[[a + 2, (k + 0.8)·5], [a + 32, (k + 0.8)·5]]` (mostra quantas linhas a letra ocupa).

```
glifo: ch = letra.toUpperCase(); tenta ch e ch sem acento (NFD, tira U+0300–036F)
  fonte = fontes[params.fonte] se tem o glifo com traços; senão a primeira de Object.values(fontes) que tem     // o ctx do teste de contrato só tem EMSDelight/EMSAllure
  lê fonte.glifos[ch].tracos direto (unidades da fonte, y para cima) → [x, −y].  NÃO importa src/motor.  Sem glifo → só o quadro/enfeite do estilo
m = min(l, a);  letra(caixaInterna, contorno) = encaixar(contorno ? contornar(base) : base, caixaInterna)
contornar: pré-escala a base para altura a; d = 0.03·a; cada traço vira um laço fechado: deslocar(t, d) + inverso de deslocar(t, −d) + primeiro ponto
lombarda    → letra(inset(caixa, 0.06m), não)
contornada  → letra(inset(caixa, 0.06m), sim)
habitada    → retDe(caixa) + retDe(inset(caixa, 0.04m)) + L = letra(inset(caixa, 0.16m), sim)
              + vinha(inset(caixa, 0.07m), { ...params.vinha, escala: 0.35m, dentro: p na caixa interna e a mais de 0.05m de todo ponto de L reamostrado a 0.5 mm }, seed)
filigranada → L = letra(inset(caixa, 0.2m), sim) + renda na faixa de 0.16m: sobre retDe(inset(caixa, 0.16m)), semicírculos para fora
              (raio ρ ≈ 0.055m, ajustado para caber nº inteiro por lado), pérola circulo(0.3ρ, 8) a 1.6ρ sobre cada junção com rng(seed + '|p|' + i)() < 0.7,
              espiral de raio 0.06m em cada canto (sentido por seed)
no          → G = grade(caixa, 6);  no(caixa, { celulas: 6, aro: 1, quebras: 0 }, seed) + letra(inset(caixa, max(G.tx, G.ty) + 0.04m), sim)
fundo (hachura > 0, exceto habitada): afastar(hachura(retDe(interna).slice(0, 4), { espaco: hachura }), L, 0.04m)     // letra reservada em halo, sem booleanos
return recortarCaixa(tudo, caixa)
```
As letras Hershey são traços abertos (conferido: 9–28 traços, quase nenhum fechado): **não dá para hachurar "dentro da letra"**; por isso a hachura é de fundo.

### 2.5 `src/ornamento/filigrana.js`

`filigrana(caixa, params, seed) → Traco[]` despacha por `params.tipo`; também exporta `preencheLinha`, `peDeMosca`, `manicula`, `florao`, `separador` (mesma assinatura). `P`, `PARAMS` (grupo `'filigrana'`).

| chave | tipo | faixa / opções | padrão | nível | caixa da prévia |
|---|---|---|---|---|---|
| `tipo` | opcao | `preenche`, `pe-de-mosca`, `manicula`, `florao`, `separador` | `preenche` | basico | 40×6 (preenche, separador), 8×10, 16×8, 10×10 |
| `padrao` | opcao | `onda`, `ziguezague`, `lacos`, `pontos` | `onda` | basico | 40×4 |
| `separador` | opcao | `losango`, `asteriscos`, `onda` | `losango` | basico | 40×6 |
| `passo` | faixa | 1–6 mm, passo 0.1 | 2.5 | basico | 40×4 |
| `petalas` | faixa | 3–8, passo 1 | 5 | avancado | 10×10 |
| `irregular` | faixa | 0–1, passo 0.01 | 0.2 | avancado | 40×4, `padrao: 'ziguezague'` |

```
preencheLinha: n = max(1, floor(l/passo)); período = l/n (o desenho termina exatamente no fim da caixa); A = a/2; yc = y + a/2
  onda       → 8 pontos por período, yc + A·sin
  ziguezague → vértices a cada meio período, alternando yc ± A
  lacos      → trocóide: X = x + e + (l − 2e)·θ/(2πn) − e·sin θ, Y = yc − A·cos θ, e = 0.35·período, 12 pontos por volta
  pontos     → um circulo(raio min(A, período/4), 8) por período
peDeMosca (unidade 1×1, depois encaixar): arco esquerdo de centro (0.45, 0.3) e raio 0.3, de (0.45, 0.6) por (0.15, 0.3) até (0.45, 0);
  hastes [[0.45,0],[0.45,1]] e [[0.65,0],[0.65,1]]; barra [[0.45,0],[0.8,0]]; bojo hachurado: hachura(polígono do arco, { espaco: 0.08, angulo: 45 })
manicula (unidade 2×1, aponta para a direita, depois encaixar): punho [[0,.25],[.35,.25],[.35,.85],[0,.85],[0,.25]];
  mão e indicador [[.35,.3],[.9,.3],[1,.22],[1.9,.22],[1.97,.3],[1.9,.38],[1.2,.38],[1.2,.42]];
  dedos dobrados [[1.2,.42],[1.3,.45],[1.3,.55],[1.15,.56]], [[1.15,.56],[1.25,.6],[1.25,.68],[1.1,.7]], [[1.1,.7],[1.18,.74],[1.15,.82],[.35,.8]]; polegar [[.75,.3],[.95,.42],[1.1,.4]]
florao: R = min(l,a)/2; r(θ) = R·(0.55 + 0.45·cos(petalas·θ)), 16·petalas + 1 pontos, fechado; + circulo(centro, 0.12R, 10); rotação inicial por seed
separador: losango → reta, losango (altura a, largura a) no centro, reta;  asteriscos → 3 asteriscos de 6 braços, raio a/2, espaçados 2a, centrados;
           onda → preencheLinha('onda') nas duas metades com florao (caixa a×a) no centro
irregular: cada ponto recebe (rng(seed + '|irr')() − 0.5) · 2 · irregular · 0.08 · min(a, passo) em x e em y, antes do recorte (não aplica à hachura)
return recortarCaixa(tudo, caixa)
```

**Cortado do `filigrana.js` (vai para o M20):** rubrica (é só atribuir a camada à caneta vermelha — não é gerador), reclamo, cabeçalho corrente e número de página (são texto: precisam do motor/layout, que `src/ornamento/` não importa; o DoD do M20 já os cobra).

## 3. Onde vive cada coisa

| arquivo | exporta | importa |
|---|---|---|
| `src/geo.js` | §1 | `hachure-fill` |
| `src/ornamento/no.js` | `no`, `grade`, `P`, `PARAMS` | `../geo.js`, `../rng.js` |
| `src/ornamento/vinha.js` | `vinha`, `P`, `PARAMS` | `../geo.js`, `../rng.js` (`rng`, `ruido1d`) |
| `src/ornamento/filigrana.js` | `filigrana` + 5 geradores, `P`, `PARAMS` | `../geo.js`, `../rng.js` |
| `src/ornamento/borda.js` | `borda`, `miolo`, `P`, `PARAMS` | `../geo.js`, `./no.js`, `./vinha.js` |
| `src/ornamento/capitular.js` | `capitular`, `caixaCapitular`, `P`, `PARAMS` | `../geo.js`, `../rng.js`, `./no.js`, `./vinha.js` |

Nada de DOM, `import.meta.glob`, `?raw`. `src/ornamento/` não importa `layout.js`, `motor/*`, `ajuda.js` nem `ui/`. `src/rng.js` não muda. Nenhuma dependência nova. `test/params.test.mjs` descobre os 5 `PARAMS` novos sozinho e **passa sem ser editado**.

## 4. Testes (um arquivo por módulo; cada um grava só o seu `.snapshot`)

`test/geo.test.mjs`, `test/no.test.mjs`, `test/vinha.test.mjs`, `test/filigrana.test.mjs`, `test/borda.test.mjs`, `test/capitular.test.mjs`.

Em todo arquivo de gerador, para **cada estilo/tipo/opção** e 3 caixas (uma com origem ≠ 0, ex.: `{x: 13, y: 7, l: 40, a: 25}`; uma estreita; uma quadrada):
1. `assert.deepEqual(problemas(t, caixa), [])` — dentro da caixa, sem NaN, ≥ 2 pontos — e `t.length >= 1`.
2. Determinismo: duas chamadas `deepEqual`.
3. Seed diferente muda (`notDeepEqual`), **só onde há sorteio**: `no` (quebras 0.3), `vinha`, `borda` vinha/no, `capitular` habitada/filigranada, `filigrana` com `irregular: 0.5`.
4. Golden: `t.assert.snapshot` de 1 caso pequeno por gerador/estilo, com `r3` (3 casas, `+ 0`) e uma linha por traço — copiar `r3`/`linhas` de `test/golden.test.mjs`. Caixa ≤ 30 mm e params que deem poucos traços (ex.: `no` 2×2 células; vinha `densidade: 0.2` em 30×8).
5. Caixa degenerada (`l: 0`) → `[]`.

Específicos:
- **geo**: `hachura` de `[[0,0],[10,0],[10,5],[0,5]]` (primeiro x = 0!) não estoura, dá ≈ `5/espaco` linhas com ângulo 0, não muta a entrada, pontos na caixa do polígono ± 0.02; anel `[fora, dentro]` não risca o furo; `cruzada` dá mais linhas. `recortarCaixa`: traço que atravessa vira pedaço interno; que sai e volta vira 2; todo fora → `[]`. `recortarRaio`: reta pelo centro vira 2 pedaços com vão de 2r; toda dentro → `[]`; toda fora → igual. `deslocar`: reta horizontal desloca `d` em y; quadrado fechado continua fechado e a `d` do original. `afastar`: nenhum ponto restante a menos de `folga` do obstáculo. `encaixar`: caixa do resultado dentro da caixa pedida e tocando 2 lados opostos. `problemas` acusa NaN, 1 ponto e fora.
- **no**: `quebras: 0`, 3×3: todo cruzamento tem um fio por cima e um por baixo (contar tipos: nº de 'cima' = nº de 'baixo'; expor a contagem por função interna exportada só se preciso); `fita: 0` e `fita: 0.12` diferem; `aro: 1` em 6×6 não tem ponto no miolo (`inset(caixa, tx + eps)`); `simetria: 'quadrupla'` com `fita: 0`: conjunto de pontos (3 casas) igual ao seu espelho horizontal.
- **vinha**: com `dentro` = anel (caixa menos miolo), nenhum ponto no miolo; `folhas: 0, frutos: 0, espirais: 0` dá menos traços que tudo em 1; A5 inteiro (`148×210`, faixa de 12) roda em < 1 s.
- **borda**: para os 4 estilos × `lados` × `cantos`: nenhum ponto dentro de `inset(miolo(caixa, params), 0.01)`; `miolo` com `lados: 'esquerda'` só tira `w` da esquerda.
- **capitular**: fontes reais (`HersheyGothEnglish`, `HersheySerifBold`, lidas como em `golden.test.mjs`); letras `'A'`, `'Q'` (descendente), `'É'` (acento) e `'é'` (minúscula → maiúscula) nos 5 estilos; fonte ausente no mapa cai na que existe; mapa vazio → só quadro ou `[]`, sem erro; `hachura: 1` dá mais traços que `0`; `caixaCapitular` com 2 e 8 linhas.
- **filigrana**: `preenche` termina a ≤ 0.01 mm do fim da caixa nos 4 padrões; com `irregular: 0` a seed não muda nada.

Gravar golden: **só** `node --test --test-update-snapshots test/<arquivo>.test.mjs`, uma vez, depois rodar sem a flag. **Nunca `npm run golden`** (regravaria os goldens do motor no meio do M17).

## 5. Tarefas — 3 ondas (ajuste: `borda` e `capitular` importam `no` e `vinha`, então não podem começar junto com eles)

| onda | tarefa | modelo | arquivos (só estes) | faz |
|---|---|---|---|---|
| 1 | **19-A** | haiku | `src/geo.js`, `test/geo.test.mjs` | §1; testes "geo" do §4 |
| 2 ∥ | **19-B** | sonnet | `src/ornamento/no.js`, `test/no.test.mjs` | §2.1 |
| 2 ∥ | **19-C** | sonnet | `src/ornamento/vinha.js`, `test/vinha.test.mjs` | §2.2 |
| 2 ∥ | **19-D** | haiku | `src/ornamento/filigrana.js`, `test/filigrana.test.mjs` | §2.5 |
| 3 ∥ | **19-E** | sonnet | `src/ornamento/borda.js`, `test/borda.test.mjs` | §2.3 |
| 3 ∥ | **19-F** | sonnet | `src/ornamento/capitular.js`, `test/capitular.test.mjs` | §2.4 |

Nenhum arquivo em comum dentro de uma onda. Se faltar algo em `geo.js` nas ondas 2–3, o worker **não edita `geo.js`**: faz local e relata.
Verificação de cada tarefa: `node --test test/<seu>.test.mjs` verde (com o snapshot gravado e re-rodado sem a flag); `node --test test/params.test.mjs` verde sem edição (prévia min ≠ max em toda faixa; se der "min = max", ajustar a caixa/extra da prévia, não o teste); `git status` só com os arquivos da tarefa. Falha vinda de `src/motor` ou `layout.js` (M17 em andamento) vai para o relatório, não se conserta.
Gate do orquestrador depois da onda 3: `npm test`, `npm run build` (o `geo.js` entra no bundle só quando a UI importar; o build não pode quebrar), `git diff --stat` sem `src/motor`, `src/layout.js`, `src/ajuda.js` nem snapshots antigos. Sem e2e novo: o M18 não põe painel na UI (M20).

## 6. Ficha de espécimes (o orquestrador gera; o revisor não vê pixels sem ela)

Script descartável em `workflow/ciclos/19/especimes.mjs` (Node, fontes reais, seed fixa) que escreve um SVG por folha (traço preto 0.3 mm, caixa de cada espécime em cinza tracejado, legenda com params, barra de 10 mm) e captura PNG com o Playwright já instalado. Folhas:
1. **Hachura**: retângulo, triângulo e anel; ângulos 0/45/90; `espaco` 0.5/1/2; cruzada.
2. **Nó**: `celulas` 2/4/8; `quebras` 0/0.15/0.5; as 3 simetrias; `fita` 0/0.12/0.2; `vao` mín./máx.; `aro` 1/2; faixa 60×8; **um detalhe ampliado 4×** de um cruzamento (o vão do fio de baixo tem de aparecer limpo).
3. **Vinha**: faixa 120×12 com `densidade` 0.2/0.5/1; `curvatura` 0/1; só folhas, só frutos, só espirais; 3 seeds.
4. **Borda**: página A5 com cada estilo × cantos losango/trevo/nó; `lados` esquerda e topo-base; o `miolo` desenhado em cinza (nada pode entrar nele).
5. **Capitular**: 5 estilos × letras A, M, Q, É em HersheyGothEnglish; uma linha com as 4 fontes; `linhas` 2/4/8 ao lado de pautas; com e sem `hachura`.
6. **Filigrana**: os 4 preenche-linha, pé-de-mosca, manícula, florão com 3/5/8 pétalas, os 3 separadores; `irregular` 0/0.5/1.
7. **Página montada** (A5): borda de vinha + capitular habitada de 4 linhas + pautas cinza no miolo + separador e preenche-linha — para julgar proporção.
O revisor responde por folha: reconhecível? algum traço fora da caixa, vão sujo, enfeite em cima de outro, densidade que a caneta 0.4 mm empasta?

## 7. Riscos e o que NÃO fazer

Riscos:
1. **`hachure-fill`**: as 4 armadilhas do §1; o teste com primeiro x = 0 é obrigatório. Linhas com extremos arredondados a 0,01 mm.
2. **Nó**: erro de sinal no "por cima/por baixo" dá trama errada sem quebrar teste nenhum de caixa → teste de contagem + detalhe ampliado na ficha. Células não quadradas (caixa que não é múltipla) deformam um pouco o vão.
3. **Vinha**: pode travar cedo em faixa estreita ou região com obstáculo (resultado pobre, não erro); custo cresce com a área — teste de < 1 s no A5. Constantes (`D`, alcance, morte, tamanhos de enfeite) nomeadas no topo, calibradas pela ficha.
4. **Offset ingênuo** se cruza em curva fechada (laços do gótico): aceito no M18, comentário `ponytail:`.
5. **Manícula e pé-de-mosca** são desenhos fixos feitos às cegas: o revisor provavelmente pede ajuste de coordenadas.
6. **Fonte da capitular**: a UI só passa as fontes que carregou; a queda para "primeira fonte que tem o glifo" evita vazio, mas o M20 precisa carregar as Hershey para o estilo sair certo.
7. **Goldens entre SO** (risco 5 da EXPANSAO): muito seno/cosseno; 3 casas costuma bastar; se o CI divergir, os goldens de ornamento rodam só localmente.
8. **`params.test.mjs` importa todo `src/`**: um módulo de ornamento com erro de sintaxe derruba o teste de contrato de todo mundo (inclusive do M17) — worker roda o próprio teste antes de dar por pronto.

Não fazer:
- Não tocar `src/motor/*`, `src/layout.js`, `src/ajuda.js`, `src/rng.js`, `src/ui/*`, `test/params.test.mjs`, snapshots existentes. Não rodar `npm run golden`.
- Não vendorizar nem copiar código do celtic-knot ou do 2d-space-colonization (só o algoritmo). Nenhuma dependência nova (sem paper.js, clipper, simplex).
- Sem booleanos de polígono, sem DOM, sem `Math.random`, sem `Date`. Não usar `hash()` cru como aleatório.
- Não criar painel de UI, material, camada/caneta nem obstáculo no layout (M20). Não criar `seed` como PARAM.
- Não afrouxar teste que falha por defeito do gerador: relatar.

Fora do escopo (QUADRO): nó em `anel` (polar) e preset `canto`; nó contínuo dando a volta na página (hoje: painéis por tira + cantos); vinha que nasce da capitular automaticamente (hoje: `origem` manual); hachura dentro da letra (exige contorno fechado/paper.js); rubrica, reclamo, cabeçalho corrente, nº de página (M20); `lados` livres (qualquer combinação); folhas/frutos com formas alternativas; ligar linhas de hachura em vaivém para poupar levantadas (o `otimizar` cobre).
