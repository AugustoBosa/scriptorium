# M16 — Motor I: contexto (spec do conselheiro)

DoD (EXPANSAO §4.7): params novos neutros → saída idêntica ao golden; duas ocorrências vizinhas da mesma letra nunca iguais; determinismo por seed; largura medida = desenhada.
Pré-condição: `test/golden-layout.test.mjs.snapshot` gravado e commitado **antes** do 16-A começar.

## 1. Parâmetros novos

| chave | faixa | passo | NEUTRA | grupo | nível | texto da prévia (`viaMao`) |
|---|---|---|---|---|---|---|
| `alternativas` | 1–5 (inteiro) | 1 | 1 | IDENTIDADE | basico | `'minimum'` |
| `contexto` | 0–1 | 0.01 | 0 | IDENTIDADE | basico | `'Ave lua'` |
| `arremate` | 0–1 | 0.01 | 0 | IDENTIDADE | avancado | `'a mão viu'` |
| `ondulacao` | 0–1 | 0.01 | 0 | EXECUCAO | basico | `FRASE` |
| `deriva` | 0–1 | 0.01 | 0 | EXECUCAO | basico | `FRASE` |
| `ritmo` | 20–200 mm | 5 | 80 | EXECUCAO | avancado | `FRASE`, extra `{ ondulacao: 1, deriva: 1 }` |
| `fadiga` | 0–1 | 0.01 | 0 | EXECUCAO | avancado | `FRASE` |

`FRASE = 'a lua cheia sobe no mar e a noite fica calma'`. Todos `tipo: 'faixa'`, `padrao: NEUTRA[chave]`, `rotulo: ROTULOS[chave]`, `ajuda: AJUDA[chave]`, `unidade: 'mm'` só no `ritmo`. Entram em `PARAMS` de `src/motor/mao.js` (é de lá que `src/ui/personagem.js` monta os controles).

`ritmo` não pode ser 0 (o teste de contrato exige `min <= padrao`): é neutro porque só age multiplicado por `ondulacao`/`deriva`/`fadiga`, que são 0.

`src/ajuda.js` — acrescentar em `ROTULOS` e `AJUDA` (≤ 220 caracteres):
- `alternativas` · "formas por letra" · "Quantas formas diferentes cada letra tem. Com 1, a letra sai sempre igual; com mais, a mão alterna entre formas e nunca repete a mesma duas vezes seguidas."
- `contexto` · "encaixe" · "Ajusta cada letra às vizinhas: a primeira da palavra sai um pouco maior e o espaço entre letras é corrigido pelo formato delas (como A e V, que se encaixam)."
- `arremate` · "arremate" · "Prolonga o traço final da última letra de cada palavra, como quem solta a caneta em movimento."
- `ondulacao` · "ondulação" · "Faz a linha de base subir e descer devagar ao longo do texto, como em papel sem pauta."
- `deriva` · "deriva" · "Deixa o tamanho e a inclinação das letras mudarem aos poucos ao longo do texto, e a margem esquerda andar de linha em linha."
- `ritmo` · "ritmo" · "Distância, em milímetros, que a ondulação e a deriva levam para mudar. Valor baixo: mudança rápida e nervosa. Valor alto: mudança lenta."
- `fadiga` · "cansaço" · "Cansaço da mão: quanto mais texto escrito, mais tremor e desleixo e mais a linha cai. Descansa um pouco a cada parágrafo e a cada página."

**`validar()`** (`src/personagem.js`): `const OPCIONAIS = ['alternativas','contexto','arremate','ondulacao','deriva','ritmo','fadiga']`.
- Chave de `OPCIONAIS` ausente em `p.mao` → sem erro (nem "mao sem chave", nem "valor não numérico").
- Presente → número finito e na faixa: `alternativas` inteiro em [1,5]; `ritmo` em [20,200]; as outras cinco em [0,1].
- Variações: nada a mudar (já aceitam qualquer chave de `EXECUCAO`; `alternativas`/`contexto`/`arremate` são recusadas por serem identidade).
- `resolver`, `novoPersonagem`, `mutar`: não mudam (`novoPersonagem` já herda os campos pela `NEUTRA`).

**Mão incompleta** (personagem antigo): primeira linha de `compor`: `mao = { ...NEUTRA, ...mao };`. É o único ponto por onde todo texto passa. Na UI, `ler` usa `?? P[chave].padrao`.

## 2. Algoritmos

Unidades: glifo em **em**, y para cima (como `glifo()` devolve). `s` = mm por em da palavra.

### 2.1 Regra do rng (o que mantém o golden)

1. Efeito novo **nunca** consome dos fluxos existentes (`seed|ch|idio`, `seed|ch|ocorrencia`, `seed|tremor`). Cada um usa fluxo próprio, sem estado: `rng(seed + '|' + nome + '|' + chave)`.
2. Todo efeito fica atrás de guarda (`K > 1`, `contexto > 0`, `arremate > 0`, `der > 0`, `ondulacao > 0`, `F > 0`). Com o parâmetro neutro a função **não é chamada**.
3. Não mudar o número nem a ordem dos pontos/traços no caminho neutro (o fluxo `|tremor` consome 2 valores por ponto, na ordem de desenho).
4. Não reordenar somas de ponto flutuante existentes (`largura += g.adv * s`, `x += g.adv * s`, `x + px * s + tx`).
5. Nunca usar `hash()` cru como número aleatório: FNV-1a de strings que só diferem no fim dá valores correlacionados. Sempre `rng(string)()`.

### 2.2 `ruido1d` (`src/rng.js`)

```js
// Ruído de valor suavizado em [-1, 1). Determinístico; seed é string.
export function ruido1d(seed, t) {
  const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f);
  const v = (k) => rng(seed + '|' + k)() * 2 - 1;
  return v(i) * (1 - u) + v(i + 1) * u;
}
```

### 2.3 Variante por ocorrência (`contexto.js`)

`n` = ocorrência global do caractere (o mesmo índice que hoje vai para `glifo()`). Par e ímpar sorteiam de conjuntos disjuntos → `n` e `n+1` nunca coincidem, sem guardar estado:

```
variante(seed, ch, n, K):
  if K <= 1: return 0
  u = rng(seed + '|' + ch + '|esc|' + n)()
  return n % 2 === 0 ? 2 * floor(u * ceil(K/2)) : 1 + 2 * floor(u * floor(K/2))
```
K=2 → 0,1,0,1…; K=5 → pares {0,2,4}, ímpares {1,3}. Variante 0 = glifo sem deformação.

### 2.4 Deformação de baixa frequência (`contexto.js`)

Campo suave sobre a caixa do glifo (pontos que se tocam continuam se tocando; por isso é espacial, não por arco de cada traço). Aplicada **sobre a saída de `glifo()`** — o jitter atual fica intacto.

```
const AMP = 0.03, XH = 0.45          // ponytail: altura-x fixa em 0,45 em; medir por fonte se distorcer
deformar(g, seed, ch, v, altura):     // devolve glifo novo; v === 0 → devolve g
  r = rng(seed + '|' + ch + '|alt|' + v);  j = () => r() * 2 - 1
  [p0,p1,p2,q0,q1,q2,sw,sa,sd] = nove chamadas de j(), nesta ordem
  caixa x0,x1,y0,y1 de todos os pontos; w = max(x1-x0, 1e-6); h = max(y1-y0, 1e-6); yx = XH * altura
  para cada ponto (x, y):
    xn = (x-x0)/w;  yn = (y-y0)/h
    y1 = y > yx ? yx + (y-yx)*(1 + 0.10*sa) : y < 0 ? y*(1 + 0.10*sd) : y      // ascendente / descendente
    x' = x*(1 + 0.05*sw) + AMP*(p0*(1-yn) + p1*yn + p2*sin(PI*yn))
    y' = y1               + AMP*(q0*(1-xn) + q1*xn + q2*sin(PI*xn))
  adv' = g.adv*(1 + 0.05*sw)
escalar(g, k): pontos e adv × k (origem na linha de base, canto esquerdo)
```

### 2.5 Encaixe óptico (`contexto.js`)

```
const Y0 = -0.25, DY = 1/6            // 6 faixas cobrindo y ∈ [-0,25; 0,75] em
perfis(g) → { esq[6], dir[6] }        // esq começa em +Infinity, dir em -Infinity
  para cada traço, cada segmento a→b (traço de 1 ponto: a→a), cada faixa k (lo = Y0 + k*DY, hi = lo + DY):
    se max(ay,by) < lo ou min(ay,by) > hi: pula
    dy = by - ay
    u0 = dy === 0 ? 0 : clamp((lo-ay)/dy, 0, 1);  u1 = dy === 0 ? 1 : clamp((hi-ay)/dy, 0, 1)
    para u em [u0, u1]: x = ax + (bx-ax)*u;  esq[k] = min(esq[k], x);  dir[k] = max(dir[k], x)
vaoMin(A, B) → menor (A.adv - dirA[k] + esqB[k]) nas faixas em que os dois são finitos; nenhuma → null
encaixe(A, B, contexto, alvo) → v = vaoMin(A, B);  (v === null || alvo === null) ? 0 : contexto * clamp(alvo - v, -0.12, 0.12)
```
Vão-alvo = `vaoMin(n, n)` com `n = glifo(fontes, mao, 'n', 0)` (sem tinta → `null`). É o espaçamento que a própria mão já usa; em fonte cursiva o ajuste tende a 0. Memo em `ctx.alvo`.

### 2.6 Arremate (`contexto.js`)

```
arrematar(g, arremate, r):            // muta g (glifo já é cópia); r = rng(seed + '|arremate|' + indice)
  t = último traço de g com comprimento ≥ 0.2 em (pula pingos e acentos); não há → sai
  fim = último ponto; ant = ponto anterior mais próximo do fim a distância ≥ 0.05 em; não há → sai
  d = normalizar(fim - ant);  se d.x < 0.2 → sai      // ponytail: só saída para a direita; o M17 conhece o ductus
  L = arremate * 0.35 * (0.6 + 0.8 * r())
  para j = 1..4: u = j/4;  t.push([fim.x + d.x*L*u, fim.y + d.y*L*u + 0.25*L*u*u])
  g.adv = max(g.adv, x do último ponto novo)           // arremate entra na medida
```

### 2.7 `escreverPalavra` (`escrita.js`)

```
escreverPalavra(palavra, ctx) → { texto, largura, s, glifos, tan, dy, tremor, F }
  ctx = { fontes, mao (completa), tamanho, cont = Map vazio, indice = 0, t = 0, F = 0, alvo? }
  m   = F > 0 ? { ...mao, desleixo: min(1, mao.desleixo + 0.5*F), capricho: max(0, mao.capricho - 0.5*F) } : mao
  K   = m.alternativas;  der = min(1, m.deriva + 0.5*F);  sd = m.seed
  s   = der > 0 ? tamanho * (1 + 0.08*der*ruido1d(sd + '|tam', t)) : tamanho       // tamanho ANTES de medir
  chars = [...palavra];  loc = Map
  para i, ch:
    n = (cont.get(ch) ?? 0) + (loc.get(ch) ?? 0);  loc.set(ch, +1)
    g = glifo(fontes, m, ch, n)
    se K > 1 e g.tracos.length:
      g = deformar(g, sd, ch, variante(sd, ch, n, K), m.altura)
      se ch === chars[i-1]: g = escalar(g, 0.93)                                    // letra dobrada
    se m.contexto > 0 e i === 0 e /\p{L}/u.test(ch): g = escalar(g, 1 + 0.12*m.contexto)   // inicial maior
    glifos.push(g)
  se m.arremate > 0 e o último é letra: arrematar(último, m.arremate, rng(sd + '|arremate|' + indice))
  se m.contexto > 0:
    ctx.alvo ??= alvo calculado com ctx.mao (§2.5)
    para i ≥ 1: glifos[i-1].adv = max(0, glifos[i-1].adv + encaixe(glifos[i-1], glifos[i], m.contexto, ctx.alvo))
  largura = 0;  para g: largura += g.adv * s          // mesma soma do layout antigo
  tan    = der > 0 ? Math.tan(6 * PI/180 * der * ruido1d(sd + '|inc', t)) : 0
  dy     = m.ondulacao > 0 ? 0.15 * m.ondulacao * tamanho * ruido1d(sd + '|base', t) : 0     // mm, + desce
  tremor = m.tremor + 0.04 * tamanho * F
```
Função pura: não altera `cont`. Escrita uma vez, o objeto devolvido serve para medir (`largura`) e desenhar (`glifos`, `s`).

### 2.8 Layout: deriva por linha e fadiga (`layout.js`)

Estado novo em `compor`: `ctxE = { fontes, mao, tamanho, cont, indice: 0, t: 0, F: 0 }` (um objeto só, reaproveitado), `percorrido = 0` (mm), `cans = 0`, `N = max(1, nº de palavras do texto)`.

```
escrever(p): ctxE.indice = indice; ctxE.t = percorrido / mao.ritmo; ctxE.F = mao.fadiga * cans
             return escreverPalavra(p, ctxE)
ao aceitar a palavra (junto de cada gastar(p) / fim da palavra quebrada):
             percorrido += w.largura + espaco;  cans = min(1, cans + 1/N)
parágrafo  (entrada não vazia, se indice > 0):  cans *= 0.7
página nova (em avancar(), junto de cur.pag++): cans *= 0.5      // vale da palavra seguinte em diante
```
Margem que anda (em `vaga()`, nos dois `return`), só com `mao.deriva > 0` e alinhamento ≠ `'centro'`:
```
d = mao.deriva * tamanho * (0.45 * (ruido1d(seed + '|margem|' + pag + '|' + col, k/5) + 1) / 2
                          + 0.15 * rng(seed + '|recuo|' + pag + '|' + col + '|' + k)())
x0 += d;  W -= d          // só para a direita: nunca invade margem nem obstáculo; medida já sabe do recuo
```
Desenho em `fecha` (base, inclinação e queda **depois** de posicionar; com neutros soma 0 exato):
```
dyW = w.dy + w.F * 0.25 * tamanho * (x - v.x0) / v.W        // x = início da palavra; fadiga faz a linha cair
ponto = [x + px*w.s + tx + py*w.s*w.tan,  v.y - py*w.s + ty + dyW]     // tx, ty com w.tremor no lugar de mao.tremor
x += g.adv * w.s
```
`espaco` continua calculado com `tamanho` (não com `w.s`).

Palavra longa: **não reescrever letra a letra**. Usar `w.glifos[i]` da palavra já escrita (as ocorrências são as mesmas de hoje): `a = { largura: w.glifos[i].adv * w.s, glifos: [w.glifos[i]] }`; pedaço de linha = `{ ...w, texto: '', largura: 0, glifos: [] }`. Assim inicial, arremate e encaixe valem para a palavra inteira.

## 3. Onde vive cada coisa

| arquivo | conteúdo | importa |
|---|---|---|
| `src/rng.js` | `+ ruido1d` | — |
| `src/motor/contexto.js` | `variante`, `deformar`, `escalar`, `perfis`, `vaoMin`, `encaixe`, `arrematar` (glifo entra, glifo sai) | `rng.js` |
| `src/motor/escrita.js` | `escreverPalavra` | `mao.js` (`glifo`), `contexto.js`, `rng.js` |
| `src/motor/mao.js` | `NEUTRA`, `IDENTIDADE`, `EXECUCAO`, `PARAMS` (+7). `glifo`/`misturar`/`mutar` intactos | `rng.js`, `ajuda.js` |
| `src/layout.js` | `compor` chama `escreverPalavra`; mantém `cont`/`gastar`, `espaco` via `glifo` | `mao.js`, `escrita.js`, `rng.js` |

Sem ciclo: `motor/*` nunca importa `layout.js`. As prévias dos `PARAMS` usam `ctx.escrever` (injetado pela UI e pelo teste; é a `amostra` do layout).

Largura medida = desenhada por construção: `largura` e o avanço do desenho saem dos mesmos `g.adv` e do mesmo `w.s`; encaixe, inicial, dobrada e arremate mexem em `adv` antes da soma; inclinação/base/queda entram depois de posicionar e não mexem em `adv`.

## 4. Testes ligados ao DoD

Mão dos testes: `{ ...NEUTRA, seed, base: [{ fonte: 'EMSBird', peso: 1 }] }`, fontes reais como em `golden.test.mjs`. `CHEIA` = alternativas 5, contexto 1, arremate 1, ondulacao 1, deriva 1, ritmo 40, fadiga 1, variacao 0.5.

1. **Golden intacto**: `npm test` verde em `golden.test.mjs` e `golden-layout.test.mjs` **sem** `--test-update-snapshots`. Mais: `compor` com mão sem as 7 chaves `deepEqual` `compor` com `{ ...NEUTRA }`.
2. **Vizinhas nunca iguais**: para K em 2..5, `ch` em `'aeioumnrsl'`, `n` em 0..40, `variacao: 0`: `escreverPalavra(ch, { cont: new Map([[ch, n]]) })` e o mesmo com `n+1` → `glifos[0].tracos` `notDeepEqual`. Controle: K=1 → `deepEqual`. Via `compor('a a a a a a')` com K=2: traços de palavras vizinhas, descontado o `x` da âncora, diferem em > 1e-6.
3. **Determinismo**: `compor` duas vezes com `CHEIA` → `deepEqual`; outra seed → `notDeepEqual`. `ruido1d`: mesmo (seed, t) igual; |valor| ≤ 1; `ruido1d(s, 3)` ≈ limite de `ruido1d(s, 3 - 1e-9)` (contínuo); seeds diferentes diferem.
4. **Largura medida = desenhada** (tolerância 1e-9): (a) `|w.largura − Σ g.adv*w.s|` para 20 palavras com `CHEIA`; (b) em `compor` de ~60 palavras com `CHEIA`, alinhamento esquerda: por linha, `a[i+1].x − (a[i].x + a[i].l)` é o mesmo valor em todo o documento, e `a.x + a.l ≤` borda direita da coluna; (c) `compor('minimum')` com alternativas 5, contexto 1, arremate 1, sem deriva/tremor: todo ponto com `x` em `[a.x − 0.3*tamanho, a.x + a.l + 0.3*tamanho]`.
5. **Sanidade**: com `CHEIA` + tremor 1, nenhum NaN, nenhum traço com < 2 pontos, páginas ≥ 1.
6. **validar**: personagem sem as 7 chaves → `[]`; `alternativas: 9` e `2.5` → erro; `ritmo: 5` → erro; `deriva: 2` → erro; variação `{ fadiga: 0.5 }` ok; variação `{ alternativas: 3 }` → erro de identidade.
7. **Contrato**: `test/params.test.mjs` passa **sem ser editado**. Mais: cada uma das 7 chaves tem entrada em `PARAMS` de `mao.js` com `padrao === NEUTRA[chave]` e grupo coerente com `IDENTIDADE`/`EXECUCAO`.

## 5. Tarefas

**Sequência: 16-A sozinho → depois 16-B ∥ 16-C.** (B e C dependem do motor pronto; entre si não têm arquivo em comum.)

### 16-A — motor e layout · modelo: sonnet
Arquivos: `src/rng.js`, `src/motor/contexto.js` (novo), `src/motor/escrita.js` (novo), `src/layout.js`, `src/motor/mao.js` (**só** `NEUTRA`, `IDENTIDADE`, `EXECUCAO`), `src/ajuda.js`, `src/personagem.js` (`validar`), `test/rng.test.mjs`, `test/escrita.test.mjs` (novo).
Faz: §1 (dados, ajuda, validar), §2 inteiro, §3. Casos em `test/escrita.test.mjs`: `variante` (K=1 → 0; n e n+1 diferem para K 2..5, n 0..200; resultado em [0, K)); `deformar` (v=0 devolve igual; v≠0 muda; determinístico; não altera a entrada); `perfis` de um traço vertical de 2 pontos preenche todas as faixas que cruza; `encaixe` limitado a ±0.12×contexto; `arrematar` aumenta `adv` e não cria NaN. `ruido1d` em `test/rng.test.mjs` (§4.3).
Verificação: `npm test` verde, com os dois goldens intactos e **sem** `npm run golden`; `test/params.test.mjs` não muda de resultado.

### 16-B — prévias e controles · modelo: haiku
Arquivos: `src/motor/mao.js` (**só** `PARAMS`), `src/ui/personagem.js`.
Faz: 7 entradas da tabela do §1 com `viaMao`; em `ui/personagem.js`, acrescenta as chaves em `CHAVES_IDENTIDADE` (alternativas, contexto, arremate) e `CHAVES_EXECUCAO` (ondulacao, deriva, ritmo, fadiga) e faz `ler` devolver `?? P[chave].padrao` quando o personagem salvo não tem o campo.
Verificação: `node --test test/params.test.mjs test/ajuda.test.mjs` verde (prévia de min ≠ prévia de max nas 7; se `arremate` der "min = max", trocar o texto da prévia por um cuja última letra saia para a direita); `npm run build` verde.

### 16-C — testes do DoD · modelo: haiku
Arquivos: `test/motor-dod.test.mjs` (novo), `test/personagem.test.mjs`.
Faz: §4 itens 1 (parte "mão sem as 7 chaves"), 2, 3 (parte `compor`), 4, 5, 7 em `motor-dod.test.mjs`; item 6 em `personagem.test.mjs`.
Verificação: `npm test` verde. Teste que falhar por defeito do motor **não** é afrouxado: vai para o relatório.

Gate do orquestrador: `npm test`, `npm run build`, `npm run e2e` (as capturas de `e2e/visual.spec.js` mudam: há 7 controles a mais no painel do personagem), navegador com os 7 sliders mexidos.

## 6. Riscos e o que NÃO fazer

Riscos:
1. **Golden quebra por ordem de soma ou de consumo do rng.** Seguir §2.1 à risca. Se quebrar, o defeito é do código novo; golden não se regrava neste marco.
2. **Altura-x fixa (0,45 em)** pode deformar mal fontes de proporção diferente → constante nomeada + comentário `ponytail:`; revisor olha 3 fontes.
3. **Encaixe em fonte cursiva** (letras que já se tocam): o alvo `nn` e o limite ±0,12 em seguram; conferir em EMSAllure.
4. **Arremate** só sai quando o traço final vai para a direita; em algumas fontes poucas letras recebem. Aceito no M16.
5. **Amplitudes** (0,03 em; 8%; 6°; 0,15 em; fadiga) são chute calibrado no papel só pelo usuário: ficam em constantes nomeadas no topo de cada arquivo.
6. **Desempenho**: `perfis` roda por letra só com `contexto > 0`. Medir A4 a 6 mm com `CHEIA` e registrar no relatório (meta do M21: < 400 ms).
7. **Personagens salvos** (`writer.*`) não têm os campos: cobertos por `validar` + `{ ...NEUTRA, ...mao }` + `?? padrao`.

Não fazer:
- Não mexer no corpo de `glifo()`, `misturar()`, `mutar()`, nem nos fluxos de rng existentes.
- Não acrescentar chave às `ancoras` de `compor` (o golden serializa todas).
- Não rodar `npm run golden` / `--test-update-snapshots`.
- Não importar `layout.js` de dentro de `src/motor/`. Nada de DOM fora de `src/ui/`. Nenhuma dependência nova.
- Não usar `hash()` cru como aleatório. Não guardar estado de variante entre chamadas.
- Nada de M17: junções/`ligadura`, `adiamento`, cinemática, `retoque`.

Fora do escopo (vai para o `QUADRO.md`):
- Cache por (palavra, índice): o layout escreve cada palavra uma vez e guarda o objeto; cache só quando houver quem escreva duas vezes.
- `tracos` planos por palavra e `ancoras` por letra no retorno de `escreverPalavra`: hoje `glifos[i]` (`ch` não, `adv`, `tracos`) cumpre; lista plana vem com as junções do M17.
- Peso de mistura entre fontes por variante e "tamanho de laço" (exigem mexer dentro de `glifo()`).
- `mutar()` variar os params novos; fadiga contínua entre blocos do grimório/scroll (cada `compor` começa descansado).
- Ondulação/inclinação variando dentro da palavra (hoje um valor por palavra).
- Testes de âncoras em justificado/centro e obstáculo em página ≥ 1 (pendência antiga do QUADRO).
