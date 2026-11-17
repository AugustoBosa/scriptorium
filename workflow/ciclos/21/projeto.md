# M19 — Arcano (spec do conselheiro)

DoD (EXPANSAO §4.7): mesmos critérios do M18 — cada gerador determinístico, dentro da caixa, sem NaN, sem traço < 2 pontos, com golden e prévia — e `sigilo(magia)` de `alfabeto.js` **inalterado** (goldens de `test/golden.test.mjs` passam sem regravar).
Contrato (§4.2): gerador `(caixa {x,y,l,a}, params, seed) → Traco[]`, mm, y para baixo. **4º argumento opcional `ctx = {fontes, mao}`** só onde há texto (círculo, selo, fusão); sem ele, cai no alfabeto arcano (`gerarAlfabeto({seed})`) e nunca falha. `params` incompleto → completa com o `P` do módulo. Caixa com `l <= 0` ou `a <= 0` → `[]`. Todo gerador termina em `return recortarCaixa(limpar(tracos), caixa)` (cinto de segurança, como no M18).
**Caneta 0,4 mm (lição do revisor do M18):** `const VAO = 0.5` (mm) no topo de cada módulo; todo vão, folga, banda dupla e espaçamento de marcas tem piso `VAO`; nenhum enfeite desenhado sobre outro — onde um enfeite pousa (nó, satélite, marca de início), o que está embaixo é cortado com `recortarRaio(t, c, r + VAO)`.
**Proibido tocar:** `src/ornamento/*` (ciclo de correção em paralelo; importar pode), `src/motor/*`, `src/layout.js`, `src/geo.js`, `src/rng.js`, `src/ui/*`, `test/params.test.mjs`, `test/golden.test.mjs` e todo `.snapshot` existente. Nunca `npm run golden`.
Regra do rng (M16/M18): nunca `hash()` cru; fluxo próprio por decisão, `rng(seed + '|nome|' + chave)()`.
Reuso de `src/geo.js` (não reescrever): `circulo`, `arco`, `reamostrar`, `recortarCaixa`, `recortarRaio`, `afastar`, `encaixar`, `inset`, `limpar`, `caixaDe`, `comprimento`, `dist`, `problemas`.

## 1. `src/arcano/circulo.js` — círculo mágico, `textoEmArco`, `selo`

Importa: `../geo.js`, `../rng.js`, `../motor/escrita.js` (`escreverPalavra`), `../motor/mao.js` (`glifo`, `NEUTRA`), `./alfabeto.js` (`gerarAlfabeto`, `cifrar`, `LETRAS`). Nada de `layout.js`.
Unidades da spec: **raios e larguras em fração de `R`**, `R = min(l, a)/2 − 0.2`, centro `c` = centro da caixa. Ângulos em radianos, 0 = direita, cresce no sentido horário (y para baixo).

```
spec = {
  aneis:     [{ raio, tipo: 'linha'|'dupla'|'runas'|'texto'|'dentes'|'pontos'|'onda', largura = 0.1, texto?, sentido = 1, inicio = −π/2 }],
  poligonos: [{ n, passo = 1, raio, rot = −π/2 }],      // estrela {n/passo}
  raios:     { n, de, ate, rot = −π/2 } | null,         // riscos radiais de de·R a ate·R
  nos:       { n, raio, tamanho, rot = −π/2 } | null,   // círculos pequenos (tamanho·R) em n ângulos sobre raio·R
  centro:    { tipo: 'nenhum'|'circulo'|'cruz'|'runa'|'tracos', raio = 0.2, tracos? },
  satelites: { n, raio, tamanho, rot = −π/2, spec? } | null,
}
P = { aneis: [{raio: 1, tipo: 'linha'}], poligonos: [], raios: null, nos: null, centro: {tipo: 'nenhum'}, satelites: null }
```
Cada anel ocupa a banda `[raio − largura, raio]·R` (`linha` ocupa só `raio`). Discretização de todo arco: `n = max(24, ceil(2π·r / 0.5))` (segmentos ≤ 0,5 mm).

```
anel(a):  r = a.raio·R, b = max(a.largura·R, VAO)
  linha  → circulo(c, r, n)
  dupla  → circulo(r) + circulo(r − b)
  dentes → circulo(r) + k riscos radiais de r a r − b, k = floor(2πr / max(1.0, 2·b))      // passo ≥ 1 mm
  pontos → circulo(r) + k pontos em r − b/2, k = floor(2πr / max(1.2, 3·VAO));
           ponto = circulo(p, 0.3, 8)
  onda   → ρ(θ) = r − b/2 + (b/2 − VAO/2)·sin(m·θ), m = max(3, round(2πr / max(2, 4·b)))  // λ ≥ 2 mm
  runas  → circulo(r) + circulo(r − b) + textoEmArco(letras sorteadas, fonte arcana, arco da banda interna)
           letras: k = floor(2π(r − b/2) / (0.75·alt)), alt = b − 2·VAO; cada uma LETRAS[floor(rng(seed|'runa'|i)()·26)];
           a cada 4–6 letras um ' ' (rng); fonte = {arcano: gerarAlfabeto({seed})}, mão = {...NEUTRA, base: [{fonte:'arcano', peso:1}], seed}
  texto  → textoEmArco(a.texto, banda, ctx ?? fallback arcano com cifrar(a.texto)); sem a.texto vira 'runas'
poligono(p): d = mdc(n, passo); para j < d: vértices k·passo·2π/n + rot + j·2π/n, k = 0..n/d → d traços fechados (hexagrama {6/2} = 2 triângulos)
raios: n riscos de de·R a ate·R
centro: circulo(raio·R) | cruz (2 retas de diâmetro 2·raio·R) | runa (glifo LETRAS[rng(seed|'centro')] do alfabeto arcano encaixado no quadrado de lado raio·R·√2)
        | tracos: encaixar(tracos, quadrado de lado raio·R·√2)  ← é por aqui que o M20 põe um sigiloPalavra no miolo sem circulo importar sigilo
```

```
circulo(caixa, spec, seed, ctx):
  se caixa degenerada → []
  S = {...P, ...spec}
  base = [...S.aneis.flatMap(anel), ...S.poligonos.flatMap(poligono), ...raios, ...centro]
  furos = posições dos nós (r = tamanho·R) e dos satélites (r = tamanho·R)
  para cada furo f: base = base.flatMap(t => recortarRaio(t, f.c, f.r + VAO))      // nada sob o enfeite
  enfeites = nós: circulo(f.c, f.r)
           + satélites: circulo(caixa quadrada de lado 2·f.r em f.c, sat.spec ?? SAT_PADRAO, seed + '|sat|' + i, ctx)
             com sat.spec.satelites ignorado (profundidade 1). SAT_PADRAO = {aneis:[{raio:1,tipo:'linha'}], poligonos:[{n:3,raio:0.8}]}
  return recortarCaixa(limpar([...base, ...enfeites]), caixa)
```

**`circuloAleatorio(seed, complexidade 0–1) → spec`** (pura; só sorteia; `x = (k) => rng(seed + '|aleat|' + k)()`):
```
nAneis = 1 + round(c·3); atual = 1
anel 0: tipo 'linha' ou 'dupla'; anéis seguintes: sorteio em [dupla, runas, dentes, pontos, onda], largura 0.08 + 0.06·x
  depois de cada anel: atual −= largura + 0.04          // bandas nunca se sobrepõem (sem enfeite sobre enfeite)
poligono: n = 3 + floor(x·10) (3–12), passo sorteado entre os coprimos de n < n/2 (ou 1), raio = atual
raios: c > 0.4 → {n, de: 0.15, ate: atual·0.9};  nos: c > 0.6 → {n, raio: atual, tamanho: 0.05}
satelites: c > 0.85 → {n: 2 + floor(x·4), raio: atual·0.6, tamanho: 0.12}
centro: c > 0.3 → tipo sorteado em circulo|cruz|runa, raio 0.15; senão nenhum
```

**`textoEmArco(texto, arco, ctx) → Traco[]`** — `arco = {c: [cx, cy], r, inicio, sentido: 1|−1, altura, centrar = true}`, `ctx = {fontes, mao}` (mão **completa**; quem chama resolve). Não importa layout: recebe tudo por argumento.
```
cont = new Map(); espaco = (glifo(fontes, mao, ' ', 0).adv + mao.espacoPalavra)·altura
palavras = texto.split(/\s+/).filter(Boolean)
monta(alt): X = 0; para cada palavra i:
    w = escreverPalavra(p, {fontes, mao, tamanho: alt, cont, indice: i, t: 0, F: 0})
    locais = w.tracos ?? glifos concatenados (x += g.adv·w.s), ponto (X + px·w.s, py·w.s)   // sem tremor/tan/dy
    X += w.largura + espaco; gasta os caracteres em cont (como `gastar` do layout)
  devolve {tracos (em X, Y para cima), L = X − espaco}
m = monta(altura); se m.L > 0.95·2πr → m = monta(altura·0.95·2πr / m.L)     // encolhe para caber, uma vez
a0 = inicio − (centrar ? sentido·m.L/(2r) : 0)
dobra (X, Y) → θ = a0 + sentido·X/r; ρ = r + sentido·Y; ponto = (cx + ρ cos θ, cy + ρ sin θ)
  sentido 1: base no raio r, letras para fora, lê no sentido horário (texto do topo)
  sentido −1: letras para dentro, lê da esquerda para a direita embaixo (inicio = π/2)
cada traço é reamostrar(t, 0.3) ANTES de dobrar (segmento longo vira curva, não corda)
```
Na banda de um anel `texto`/`runas`: `altura = b − 2·VAO`, base em `r − b + VAO` (sentido 1).

**`selo(caixa, {texto = '', faixa = 0.18, pontas = 0, centro}, seed, ctx)`** = `circulo` com:
`aneis: [{raio:1, tipo:'linha'}, {raio: 1 − VAO/R, tipo: texto ? 'texto' : 'runas', largura: faixa, texto}, {raio: 1 − faixa − 0.03, tipo:'linha'}]`,
`poligonos: pontas ≥ 3 ? [{n: pontas, passo: pontas ≥ 5 ? 2 : 1, raio: 1 − faixa − 0.03}] : []`, `centro: centro ?? {tipo: 'runa', raio: 0.3}`.

**PARAMS** (`rotulo`/`ajuda` ≤ 220 no arquivo; prévias em `C30 = {x:0,y:0,l:30,a:30}`, seed 1, `ctx` da prévia repassado):
`complexidade` (faixa 0–1, 0.05, padrão 0.5; `circulo(C30, circuloAleatorio(1, v), 1, ctx)`), `anel` (opção, os 7 tipos, padrão 'dupla'; anel `{raio:1, tipo:v, largura:0.15, texto:'anel'}` + linha em 0.6), `pontas` (faixa 3–12, passo 1, padrão 5; polígono `{n:v, passo: v ≥ 5 ? 2 : 1, raio:0.9}` + linha), `faixa` (faixa 0.1–0.3, 0.01, padrão 0.18; `selo(C30, {texto:'selo', faixa:v}, 1, ctx)`). Sem `seed` como PARAM.

## 2. `src/arcano/sigilo.js` (novo) — `sigiloPalavra`, kamea, roda, fusão

`sigilo(magia)` de `alfabeto.js` **não é tocado nem reexportado**. Importa `../geo.js`, `../rng.js`, `./alfabeto.js` (`cifrar`, `gerarAlfabeto`).

```
sigiloPalavra(caixa, {frase, metodo: 'kamea'|'roda'|'fusao', ordem: 3, reduzir: true}, seed, ctx)
P = { frase: 'sigilo', metodo: 'kamea', ordem: 3, reduzir: true }
reduzir(frase): s = cifrar(frase) só com [a-z0-9]; tira vogais (aeiou; y fica); tira repetidas (fica a 1ª ocorrência)
  'Abracadabra é luz' → 'brcdlz'.  Se der '' → só tira repetidas.  Exportar `reduzir`.
letras = params.reduzir ? reduzir(frase) : cifrar(frase) só [a-z0-9]
valor(ch) = LETRAS.indexOf(ch) (0–35)
```
**kamea** — quadrados de Agrippa, tabela literal `KAMEAS` (exportada; conferidos: linhas, colunas e diagonais somam n(n²+1)/2):
```
3 Saturno [[4,9,2],[3,5,7],[8,1,6]]
4 Júpiter [[4,14,15,1],[9,7,6,12],[5,11,10,8],[16,2,3,13]]
5 Marte   [[11,24,7,20,3],[4,12,25,8,16],[17,5,13,21,9],[10,18,1,14,22],[23,6,19,2,15]]
6 Sol     [[6,32,3,34,35,1],[7,11,27,28,8,30],[19,14,16,15,23,24],[18,20,22,21,17,13],[25,29,10,9,26,12],[36,5,33,4,2,31]]
número(ch) = (valor(ch) mod n²) + 1     // ordem 3 = redução pitagórica clássica (a=1 … i=9, j=1 …)
quadrado Q = 0.9·min(l, a) centrado; célula e = Q/n; ponto(v) = centro da célula onde KAMEAS[n] vale v
pts = números → pontos, tirando repetidos consecutivos
```
**roda** — três anéis concêntricos, constante `RODA = [['aeiouy', 0.3], ['bcdfghjklm', 0.6], ['npqrstvwxz0123456789', 0.9]]` (36 = LETRAS); letra k de um anel com `len` letras no ângulo `−π/2 + 2πk/len`, raio `f·min(l, a)/2·0.9`. `pts` = pontos das letras, sem repetidos consecutivos.
**caminho comum (kamea e roda)**:
```
segmento i→j já desenhado (chave não orientada) → vira curva quadrática com controle deslocado 0.2·e (roda: 0.08·raio) pela normal, 8 pontos
caminho = polilinha; r0 = max(0.12·e, 0.6) (roda: 0.6·escala equivalente, piso 0.6 mm)
início: circulo(pts[0], r0, 12); caminho = recortarRaio(caminho, pts[0], r0 + VAO)        // linha nasce fora do círculo
fim: barra perpendicular ao último segmento, centrada em pts[último], comprimento max(0.35·e, 1.2)
1 ponto só → só o círculo; frase vazia → []
seed não muda kamea nem roda (o sigilo é da frase); só a fusão sorteia
```
**fusao** (Austin Spare: letras restantes sobrepostas num monograma):
```
fonte = ctx?.fontes?.[params.fonte] ?? 1ª de ctx.fontes que tenha 'B' ?? gerarAlfabeto({seed})  (essa só tem minúsculas)
H = 0.8·min(l, a); para cada letra i (ordem de `letras`):
  g = fonte.glifos[ch.toUpperCase()] ?? fonte.glifos[ch]; sem glifo → pula
  traços em y para baixo, escala uniforme para altura H, base comum (caixa vertical igual para todas)
  r = rng(seed + '|fusao|' + i): r() < 0.3 → espelho horizontal; r() < 0.15 → gira 90°
  haste esquerda (segmento quase vertical, |dx| < 0.1·|dy|, |dy| ≥ 0.6·H, a ≤ 0.15·H do x mínimo)?
     sim → alinha o x mínimo em cx − 0.3·H (as hastes coincidem: E F P R B D L K H N M)
     não → centraliza em cx
  novos = afastar(tracosLetra, acumulado, VAO, 0.25).filter(t => comprimento(t) ≥ 0.8)    // haste comum sai uma vez só
  acumulado.push(...novos)
return recortarCaixa(limpar(acumulado), caixa)
```
**PARAMS** (frase fixa `'abracadabra'`, C30): `metodo` (opção kamea|roda|fusao, padrão kamea), `ordem` (faixa 3–6, passo 1, padrão 3; kamea), `reduzir` (marca, padrão true; kamea — com e sem dão caminhos diferentes).

## 3. Alfabeto: novos estilos em `gerarAlfabeto` (`src/arcano/alfabeto.js`)

Chave nova `estilo.forma`, padrão `'grade'`. **`forma` ausente ou `'grade'` = código atual intocado** (mesmo fluxo `rng(\`${seed}|${ch}|${n}\`)`, mesma ordem de chamadas). Formas novas usam fluxo próprio `rng(\`${seed}|${forma}|${ch}|${n}\`)` e o mesmo laço de unicidade por `assinatura`. Tudo em unidades da `CAIXA` (500×700, y para cima), dentro de [0,500]×[0,700].
```
FORMAS = { angular, curvo, ogham, pontilhado };   letra(r, e) continua sendo a 'grade'
angular (rúnico): haste vertical x ∈ {100, 250, 400} (sorteio) de y 0 a 700 + 1 a 1+round(2·complexidade) galhos retos
   de um ponto da haste (y ∈ LINS) a um nó (COLS × LINS) com x ≠ x da haste; curva ignorada; assinatura = galhos ordenados
curvo: 1 a 1+round(2·complexidade) arcos de centro (250, 350 ± 117·{−1,0,1}), raio ∈ {120, 180, 240},
   início múltiplo de π/4, abertura π/2·{1,2,3}, arco(…, n = 10); 30%: ponto = circulo r 40 n 8 em nó livre
ogham: perm = LETRAS embaralhadas por Fisher–Yates com rng(`${seed}|ogham`); código q = posição do caractere em perm
   haste x = 250, y 0–700; k = q mod 5 + 1 entalhes em y = 150 + 110·j; grupo = floor(q/5) mod 4:
   0 direita (250→430), 1 esquerda (70→250), 2 diagonal ((110, y−60)→(390, y+60)), 3 cruzando curto (190→310)
   q ≥ 20 → tampa (180,700)→(320,700). Os 36 códigos são distintos; não depende de curva/complexidade
pontilhado: esqueleto = letra(r, e) da 'grade' com o fluxo da forma; cada traço reamostrar(t, 100) e cada ponto vira
   traço de 2 pontos de 12 u na direção local (passo 100 u = 0,43 mm já com letra de 3 mm; abaixo disso empasta: documentar)
```
PARAMS: acrescentar `forma` (opção grade|angular|curvo|ogham|pontilhado, grupo 'tradicao', padrão 'grade', prévia `letras('forma')`). Os 7 PARAMS atuais **não mudam**. A UI não muda (o painel usa as chaves por nome; `forma` entra no M20).

## 4. Testes (um arquivo por módulo; cada um grava só o seu `.snapshot`)

Helpers `r3`/`linhas` copiados de `test/no.test.mjs`. Caixas: `{x:13, y:7, l:40, a:25}`, `{x:2, y:3, l:60, a:8}` (estreita), `{x:0, y:0, l:30, a:30}`. Invariantes por caso: `problemas(t, caixa)` = `[]`, `t.length ≥ 1`, duas chamadas `deepEqual`; caixa degenerada → `[]`. Goldens com 3 casas, poucos traços.

- **`test/circulo.test.mjs`**: cada tipo de anel × 3 caixas; `circuloAleatorio` com `c` ∈ {0, 0.5, 1} × seeds 1–5 → `problemas` vazio; seed muda (aleatório; anel runas); `{6/2}` dá 2 traços fechados e `{5/2}` 1; **vão limpo**: com `nos`, nenhum ponto de outro traço no anel `(tamanho·R, tamanho·R + VAO − 0.01)` em volta de cada nó; `dupla` com `largura: 0.001` → círculos a ≥ VAO; `textoEmArco` (fallback arcano e com `EMSBird` real): todo ponto a distância do centro em `[r − 0.4·altura, r + 1.5·altura]`, 1º ponto a ângulo próximo de `a0`; texto longo encolhe e cabe em 2πr; anel `texto` com `ctx` real sem problemas. Goldens: (1) dupla + `{5/2}` em C30; (2) `JSON.stringify(r3(circuloAleatorio(1, 0.5)))`; (3) `selo(C30, {texto: 'abc'}, 1)` sem ctx.
- **`test/sigilo.test.mjs`**: `KAMEAS` 3–6 mágicos e permutações de 1..n²; `reduzir('Abracadabra é luz') === 'brcdlz'`; `reduzir('aeiou')` não vazio; 3 métodos × 3 caixas × frases `'abracadabra'`, `'eu sou'`, `'z'`; kamea/roda: seed 1 e 2 dão `deepEqual`, fusão dá `notDeepEqual` (com `ctx` de `HersheySans1` real); `'bcb'` em kamea 3 tem curva (traço principal > 3 pontos); nenhum ponto do caminho a < r0 + VAO − 0.01 do centro do círculo de início; frase `''` → `[]`. Goldens: kamea 3 `'abracadabra'` C30; roda idem; fusão com `HersheySans1`, seed 1.
- **`test/alfabeto.test.mjs`**: **primeiro, antes de editar `alfabeto.js`**, grava golden da saída atual: `gerarAlfabeto({seed:1})` e `({seed:3, curva:1, complexidade:1})`, glifos de `'ab9.'`. Depois: golden de `'ab9'` por forma nova (seed 1); para cada forma: 36 glifos com traços distintos (JSON), todo ponto em [0,500]×[0,700], todo traço ≥ 2 pontos, determinístico; ogham não depende de `curva`; `forma: 'grade'` = sem `forma` (`deepEqual`).
- `test/params.test.mjs` descobre os PARAMS novos e passa **sem edição**; `test/golden.test.mjs` (goldens de `sigilo` e `comporGrimorio`, que usa `gerarAlfabeto({seed:3})`) passa sem regravar.

Gravar golden: só `node --test --test-update-snapshots test/<arquivo>.test.mjs`, uma vez, e rodar de novo sem a flag.

## 5. Tarefas — uma onda, 3 em paralelo (nenhum arquivo em comum)

| tarefa | modelo | arquivos (só estes) | faz |
|---|---|---|---|
| **21-A** | sonnet | `src/arcano/circulo.js`, `test/circulo.test.mjs` | §1 (círculo, `circuloAleatorio`, `textoEmArco`, `selo`, PARAMS) |
| **21-B** | sonnet | `src/arcano/sigilo.js`, `test/sigilo.test.mjs` | §2 (kamea, roda, fusão, `reduzir`, PARAMS) |
| **21-C** | haiku | `src/arcano/alfabeto.js`, `test/alfabeto.test.mjs` | §3, golden da saída atual **antes** de editar |

21-A importa `gerarAlfabeto` de `alfabeto.js` enquanto 21-C o edita: só usa a forma padrão, que 21-C garante idêntica; se o import quebrar no meio, rodar de novo. Faltou algo em `geo.js`? O worker **não edita**: faz local e relata.
Verificação de cada tarefa: `node --test test/<seu>.test.mjs` verde (snapshot gravado e re-rodado sem a flag); `node --test test/params.test.mjs` e `node --test test/golden.test.mjs` verdes sem edição; `git status` só com os seus 2 arquivos (+ `.snapshot`).
Gate do orquestrador: `npm test`, `npm run build`, `npm run e2e` (nada de UI muda; screenshot diferente = bug), `git diff --stat` sem `src/ornamento`, `src/motor`, `src/geo.js`, `src/ui`, snapshots antigos.

## 6. Ficha de espécimes (o orquestrador gera; o revisor não vê pixels sem ela)

Script descartável `workflow/ciclos/21/especimes.mjs` (Node, fontes reais, seed fixa) → um SVG por folha (traço preto 0.4 mm = a caneta real, caixa de cada espécime em cinza tracejado, legenda com params, barra de 10 mm) + PNG pelo Playwright instalado. Folhas:
1. **Anéis**: os 7 tipos em Ø 40 e Ø 20 mm, `largura` 0.08/0.15; detalhe ampliado 4× de `pontos`, `dentes` e `onda` no Ø 20 (a caneta empasta?).
2. **Polígonos e enfeites**: `{5/2}`, `{6/2}`, `{7/3}`, `{9/2}`, com raios, nós e satélites; ampliado 4× de um nó (vão limpo em volta).
3. **Aleatórios**: `circuloAleatorio` complexidade 0/0.3/0.6/1 × 3 seeds, Ø 50 mm.
4. **Texto em arco**: `'que a luz guarde esta casa'` em EMSBird, sentido 1 no topo e −1 embaixo, Ø 60 e Ø 25 (encolhido); o mesmo no fallback arcano.
5. **Selos**: Ø 30 e Ø 50, com texto, sem texto (runas), `pontas` 0/5/7, centro runa e centro com um `sigiloPalavra` (via `centro.tracos`).
6. **Sigilos de palavra**: `'abracadabra'`, `'eu sou forte'`, `'proteção'` em kamea 3/4/5/6, roda e fusão (HersheySans1 e EMSDelight; 3 seeds na fusão), 25×25 mm; kamea com a grade desenhada em cinza ao lado (só na ficha) para conferir o caminho.
7. **Alfabetos**: as 5 formas, 36 glifos cada, a 6 mm e a 3 mm.
O revisor responde por folha: reconhecível como arcano? algo fora da caixa, vão sujo, enfeite em cima de outro, densidade que a caneta 0,4 mm empasta, texto de cabeça para baixo ou sobreposto?

## 7. Riscos e o que NÃO fazer

Riscos:
1. **Golden do alfabeto**: qualquer chamada de `r()` a mais na forma `'grade'` muda tudo → o `if` da forma fica **antes** de criar o rng, e o golden atual é gravado antes da edição.
2. **`textoEmArco` depende do motor** (M17 fechado): a mão precisa ser completa (`NEUTRA` + base); cinemática/ligadura/fadiga entram de graça. Mão incompleta → NaN; o teste com `EMSBird` pega.
3. **Banda estreita**: em Ø 20 mm, `b − 2·VAO` pode ficar < 1 mm → texto ilegível (não erro). Ficha 1/4 decide se precisa piso de altura.
4. **Kamea 3** concentra 36 caracteres em 9 casas: frases diferentes podem dar o mesmo sigilo. Aceito (é o método clássico); ordem maior separa.
5. **Fusão**: `afastar` é O(n·m) e quebra traços em migalhas → filtro ≥ 0,8 mm; fonte sem maiúscula (arcano) dá monograma menos legível. Detecção de haste é heurística (`ponytail:` no código).
6. **`params.test.mjs` importa todo `src/`**: erro de sintaxe num módulo derruba o contrato de todos — cada worker roda o próprio teste antes de dar por pronto.
7. **Goldens entre SO** (muito seno/cosseno): 3 casas; se o CI divergir, os goldens do arcano rodam só localmente.

Não fazer:
- Não mudar `sigilo(magia)`, `cifrar`, `moldura`, `LETRAS`, `CAIXA` nem os 7 PARAMS atuais do `alfabeto.js`. Não reexportar `sigilo` em `sigilo.js` (nome igual confunde: o novo é `sigiloPalavra`).
- Não tocar `src/ornamento/*`, `src/motor/*`, `src/geo.js`, `src/rng.js`, `src/layout.js`, `src/ui/*`, `test/params.test.mjs`, `test/golden.test.mjs`, snapshots existentes. Não rodar `npm run golden`.
- Sem DOM, `Math.random`, `Date`, `hash()` cru, dependência nova, booleanos de polígono. Não criar `seed` como PARAM nem painel de UI.
- Não afrouxar teste que falha por defeito do gerador: relatar.

Fora do escopo (QUADRO): painel da oficina #sigilos e folha de sigilos (M20); tabela de kameas de Agrippa 7–9 (Vênus, Mercúrio, Lua); roda hebraica (3/7/12); anel de texto com duas linhas ou texto em espiral; verificação automática de sobreposição em spec manual (só o `circuloAleatorio` garante bandas disjuntas); laço no caminho do kamea quando ele atravessa o centro de uma casa não visitada; caneta vermelha para o texto do selo; satélites aninhados (profundidade > 1).
