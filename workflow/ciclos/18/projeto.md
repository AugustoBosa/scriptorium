# M17 — Motor II: ductus (spec do conselheiro)

DoD (EXPANSAO §4.7): com `ligadura`=1 em fonte cursiva, "minimum" sai com ≤ 3 traços; pingo do i depois do último traço da palavra com `adiamento`=1; junção < 0,6 em; ficha de espécimes aprovada pelo revisor. Mais o de sempre: params novos neutros → os dois goldens intactos; determinismo; sem NaN nem traço < 2 pontos.

Medido num protótipo descartável (fontes reais, `glifo()` real) antes de escrever esta spec. Os números do §2 e a escolha do §3 vêm dele.

## 1. Parâmetros novos

| chave | faixa | passo | NEUTRA | lista | grupo/nível | prévia |
|---|---|---|---|---|---|---|
| `ligadura` | 0–1 | 0.01 | 0 | IDENTIDADE | identidade · basico | `'minimum'`, extra `curs(ctx)` |
| `adiamento` | 0–1 | 0.01 | 0 | IDENTIDADE | identidade · avancado | `'ti-ti-ti'`, extra `{ ...curs(ctx), ligadura: 1, capricho: 0, pressa: max(ctx.mao.pressa, 0.6) }` |
| `fluidez` | 0–1 | 0.01 | 0 | EXECUCAO | execucao · basico | `'minimum'` |
| `ultrapassagem` | 0–1 | 0.01 | 0 | EXECUCAO | execucao · avancado | `'minimum'`, extra `{ fluidez: max(ctx.mao.fluidez ?? 0, 0.5) }` |
| `retoque` | 0–1 | 0.01 | 0 | EXECUCAO | execucao · avancado | `FRASE` (34 letras: garante ≥ 1 retoque no máximo, ver §2.6) |

`curs(ctx)` = `{ base: [{ fonte: F, peso: 1 }] }`, com `F` = primeira fonte de `ctx.mao.base` que está em `CURSIVAS`; se não houver, a primeira chave de `ctx.fontes` que está em `CURSIVAS`; se não houver, `{}`. (No teste de contrato a mão é Delight + Allure → usa Allure. Sem isso `ligadura` daria "min = max" e o `params.test.mjs` quebra.)

`src/ajuda.js` (`ROTULOS` / `AJUDA`, ≤ 220 caracteres):
- `ligadura` · "ligação" · "Liga uma letra à seguinte sem levantar a caneta. Só funciona em fonte cursiva. Com 1, a palavra sai num traço só sempre que as letras permitem."
- `adiamento` · "pingos no fim" · "Em palavra ligada, deixa pingos, acentos e o corte do t para depois da palavra inteira, como quem escreve com pressa. Com pressa alta, o pingo cai fora do lugar e pode virar um tracinho."
- `fluidez` · "fluidez" · "Arredonda os cantos do traço, como a mão que não para em cada curva. Não age em letra menor que 3 mm."
- `ultrapassagem` · "ultrapassagem" · "Faz o traço passar um pouco do ponto nas curvas fechadas, como a mão que vai rápido demais. Não age em letra menor que 3 mm."
- `retoque` · "retoques" · "De vez em quando a mão repassa um trecho da letra ou começa o traço com um ganchinho. No máximo, cerca de 3 letras em cada 100."

`validar()` (`src/personagem.js`): acrescentar as 5 chaves em `OPCIONAIS` (a faixa `[0,1]` já é o caso geral do laço). Variações: `fluidez`, `ultrapassagem`, `retoque` aceitas (execução); `ligadura`, `adiamento` recusadas (identidade) — nada a programar, já sai das listas.

`src/fonte.js`: `export const CURSIVAS = ['EMSAllure', 'EMSBrush', 'EMSCapitol', 'EMSDecorousScript', 'EMSLeague', 'EMSSociety', 'EMSSwiss', 'MistralSingleLine'];`
Critério: no protótipo, "minimum" com todas as junções sai em **3 traços** nas 8 (1 corpo + 2 pingos). Ficam fora, apesar de `ligacao: 'cursiva'` no catálogo: `HersheyScript1`/`HersheyScriptMed` (letra em vários traços que não se tocam: "minimum" fica em 11 e 27), `EMSPepita` (traços internos em sentidos opostos: 4), `EMSQwandry` e `EMSInvite` (letras não se encostam).

## 2. Junções, adiamento e retoque (`src/motor/ductus.js`, novo)

Unidades: em, y para cima. "Coordenada de palavra" = x do glifo + soma dos `adv` anteriores (depois do encaixe do M16).

### 2.1 Regra do rng e do golden (igual à do M16 §2.1)

1. Fluxos novos, só estes: `seed|lig|indice|i`, `seed|adia|indice|i|k`, `seed|erro|indice|i|k`, `seed|retoque`, `seed|retoque|indice|i`. Nunca consumir dos existentes.
2. Guardas: `ligadura > 0 && cursiva(mao)`, `retoque > 0`, `(fl > 0 || ul > 0) && s >= 3`. Com neutro nada disso é chamado e `escreverPalavra` devolve exatamente o objeto de hoje (sem a chave `tracos`).
3. Nenhum efeito mexe em `adv` nem em `largura`.

### 2.2 Constantes e tabela

```js
const TOQUE = 0.03;   // em: até aqui os traços já se tocam → só concatena
const CHEIO = 0.3;    // vão até aqui: f = 1
const LIM   = 0.6;    // vão a partir daqui: f = 0 (DoD: junção < 0,6 em)
const DIAC  = 0.8;    // traço inteiro acima de DIAC × altura-x = diacrítico
const SAI_X = 0.2, SAI_ALTA = 0.2, ENT_X = 0.15, VIRA = 0.15, PASSO = 0.03;
const COMPAT = {      // [saída][entrada]
  base:    { subida: 1,   oval: 1,   nenhuma: 0.4 },
  alta:    { subida: 0.8, oval: 0.6, nenhuma: 0.2 },
  nenhuma: { subida: 0,   oval: 0,   nenhuma: 0 },
};
const PARES = {};     // override por par de letras-base ('ov': 0.9, 'gj': 0…): substitui COMPAT. Vazio no M17; o revisor preenche pela ficha.
```

### 2.3 Detecção pela geometria

```
cursiva(mao) = existe item com peso > 0  &&  todo item com peso > 0 tem fonte em CURSIVAS
comprimento(t) = soma dos segmentos;  dist(a, b) = hypot

medidas(fontes, mao) → { xh, ySai }          // uma vez por compor: memo em ctx.med (como ctx.alvo)
  G(c) = glifo(fontes, mao, c, 0)
  xh   = mediana do maior y de cada letra de 'acemnorsuvwxz'
  ySai = mediana de analisar(G(c), xh).S[1] para c em 'acemnu'      (letra sem corpo conta 0)

analisar(g, xh) → { pr, extras, E, S } | null
  corpo = [], extras = []
  para t de g.tracos (pula vazio), na ordem da fonte:
    se min y de t > DIAC*xh  ou  (max y de t < 0 e comprimento(t) < 0.3):  extras.push(t)   // pingo, acento, til, corte alto do t; cedilha
    senão se corpo não vazio e dist(último ponto do último de corpo, t[0]) <= TOQUE:  funde t no último (sem repetir o ponto)
    senão corpo.push(t)
  corpo vazio → null
  pr = traço mais longo de corpo ("traço principal"); os outros de corpo vão para extras (corte baixo do t, perna do k, segundo traço do x)
  se pr[0].x − pr.último.x > VIRA:  pr = pr invertido     // fonte desenhou da direita para a esquerda (Society 'm', Allure 'a')
  E = pr[0];  S = pr.último                                  // pr é cópia; nunca mutar g

saida(a, adv, med)  = a.S.x < adv − SAI_X ? 'nenhuma' : a.S.y > med.ySai + SAI_ALTA*med.xh ? 'alta' : 'base'
entrada(a, med)     = a.E.y > 1.3*med.xh ou a.E.y < −0.1*med.xh ? 'nenhuma' : a.E.x <= ENT_X ? 'subida' : 'oval'
```
As classes saem da geometria, não de lista de letras: na prática `v w` (e `o b r` em algumas fontes) dão `alta`; `i u n m r t l` dão `subida`; `a c d g o q` dão `oval`; `b p s x` de várias fontes dão saída `nenhuma` (terminam do lado esquerdo). Só `\p{Ll}` é analisada: maiúscula, dígito e pontuação nunca ligam (nem saída, nem entrada). Acentuada usa a geometria do próprio glifo (acento vira extra) e herda o **override** da base: `baseDe(c) = c.normalize('NFD')[0]`.

### 2.4 Ponte (Hermite cúbica, tangentes reais)

```
tang(t, noFim): p = ponta; q = primeiro ponto, andando para dentro do traço, com dist(p, q) >= 0.04 (não há → a outra ponta)
                devolve o vetor unitário no sentido da escrita (q→p no fim; p→q no começo)
ponte(A, B) → polilinha única                 // A, B em coordenada de palavra
  p0 = A.último; p1 = B[0]; d = dist(p0, p1)
  se d <= TOQUE: return [...A, ...B.slice(1)]
  t0 = tang(A, true); t1 = tang(B, false); n = max(2, ceil(d / PASSO))
  para j = 1..n−1: u = j/n
    h00 = 2u³−3u²+1; h10 = u³−2u²+u; h01 = −2u³+3u²; h11 = u³−u²
    ponto = h00*p0 + h10*d*t0 + h01*p1 + h11*d*t1
  return [...A, ...pontos, ...B]
```

### 2.5 `ligar` (junção + ordem)

```
ligar(glifos, chars, m, med, indice) → Traco[] em coordenada de palavra | null
  sd = m.seed; x = 0; corpo = []; fimRun = []; fimPal = []; aberto = null; ant = null; nJ = 0
  fecharRun = () => { corpo.push(...fimRun); fimRun = [] }
  para i, g:
    mv = t → t.map(([px, py]) → [px + x, py])
    a = /\p{Ll}/u.test(chars[i]) ? analisar(g, med.xh) : null
    se !a:  fecharRun(); corpo.push(...traços não vazios de g, com mv); aberto = ant = null; x += g.adv; continue
    pr = mv(a.pr); ligou = false
    se aberto:
      v = dist(aberto.último, pr[0])
      f = clamp((LIM − v) / (LIM − CHEIO), 0, 1)
      P = m.ligadura * (PARES[baseDe(chars[i−1]) + baseDe(chars[i])] ?? COMPAT[ant][entrada(a, med)]) * f * (v <= TOQUE ? 1 : 1 − 0.5*m.capricho)
      se rng(sd + '|lig|' + indice + '|' + i)() < P:
        novo = ponte(aberto, pr); corpo[corpo.lastIndexOf(aberto)] = novo; aberto = novo; ligou = true; nJ++
    se !ligou:  fecharRun(); corpo.push(pr); aberto = pr
    para k, t de a.extras:
      adia = m.adiamento > 0 && rng(sd + '|adia|' + indice + '|' + i + '|' + k)() < m.adiamento
      adia ? fimPal.push(adiar(mv(t), m, rng(sd + '|erro|' + indice + '|' + i + '|' + k))) : fimRun.push(mv(t))
    ant = saida(a, g.adv, med); x += g.adv
  fecharRun()
  return nJ === 0 ? null : [...corpo, ...fimPal]
```
Ordem que resulta: cada "run" (trecho fundido) sai inteiro; os extras das suas letras vêm logo depois do run (`adiamento` 0) ou depois de **todos** os traços da palavra (`adiamento` 1). Palavra sem nenhuma junção → `null` → caminho antigo por `glifos` ("em palavra ligada").

```
const ERRO = 0.02, ERRO_PRESSA = 0.10, VIES = 0.05, TRACINHO = 0.7;
adiar(t, m, r):                              // consome sempre 3 valores
  e = ERRO + ERRO_PRESSA*m.pressa
  dx = e*(r()*2−1) + VIES*m.pressa;  dy = 0.5*e*(r()*2−1);  u = r()      // a mão já andou: erra para a direita
  se comprimento(t) < 0.08 e u < TRACINHO*m.pressa:                       // pingo vira tracinho
    c = centro da caixa de t; L = 0.05 + 0.06*m.pressa
    return [[c.x − L/2 + dx, c.y − 0.15*L + dy], [c.x + L/2 + dx, c.y + 0.15*L + dy]]
  return t deslocado de (dx, dy)
```

### 2.6 Retoque

Frequência estratificada (não sorteio por letra): dá exatamente `0,03 × retoque` das letras, e a prévia nunca sai "min = max".
```
const RETOQUE = 0.03;
retocada(seed, n, retoque):  p = RETOQUE*retoque; fi = rng(seed + '|retoque')();  return floor((n+1)*p + fi) > floor(n*p + fi)
   // n = índice global do caractere = soma dos valores de ctx.cont + i.  ponytail: espaçamento regular com fase por seed; sortear dentro do bloco se parecer mecânico
retocar(g, primeira, r):                     // muta g (já é cópia); r = rng(seed + '|retoque|' + indice + '|' + i)
  t = traço mais longo de g; não há ou t.length < 2 → sai
  sinal = r() < 0.5 ? 1 : −1;  u = r()
  se t.length >= 6 e !(primeira e u < 0.5):                               // repasse: volta e refaz um trecho, deslocado
    a = floor(t.length*(0.2 + 0.4*u)); b = min(t.length−1, a + max(2, floor(t.length*0.15))); seg = t.slice(a, b+1); o = 0.012*sinal
    t.splice(b+1, 0, ...seg invertido com (+o, +o/2), ...seg.slice(1) com (+o/2, +o/4))
  senão:                                                                  // ganchinho no início
    d = tang(t, false); t.unshift([t[0].x − 0.02*d.x − 0.04*sinal*d.y, t[0].y − 0.02*d.y + 0.04*sinal*d.x])
```

## 3. Cinemática (`src/motor/cinematica.js`, novo) — spike feito

**Escolha: (b) filtro por comprimento de arco com janela ∝ velocidade.** Comparado com (a) ΣΛ leve em "minimum", EMSAllure (ligada, 1 traço) e EMSReadability (letra de forma, cantos vivos), fluidez/ultrapassagem em 0,5 e 1:

| | (a) ΣΛ leve | (b) filtro de arco |
|---|---|---|
| visual | a 0,5 a letra fica **facetada** (aparecem os vértices do RDP); só arredonda perto de 1 | arredonda de forma contínua já em 0,5; cantos vivos da Readability viram curva de mão |
| encolhe? | comprimento 86–87% com fluidez 1 (corta curva); altura 99–100% | comprimento 92–94%; altura 98–100% |
| custo | 0,2–2,2 ms por palavra; 124 → 750–1300 pontos | 0,2–0,4 ms por palavra; 124 → ~450 pontos |
| código | RDP + erf + alvos + soma de CDFs (~45 linhas, 6 constantes) | reamostrar + curvatura + média (~30 linhas, 4 constantes) |

(a) só ganha se os submovimentos forem arcos (Berio completo), o que não cabe no marco. Fica (b).

```js
const DS = 0.01, H = 0.10, K0 = 4, JK = 0.04, GANHO = 1.2;   // em; K0 em 1/em
// suavizar(t, fl, ul) → traço novo. fl, ul em [0,1]. Pontas preservadas. Pura.
```
```
suavizar(t, fl, ul):
  p = reamostra de t com passo DS por comprimento de arco (mantém primeiro e último ponto); n = p.length; n < 5 → return t
  kap[i] = |diferença de ângulo entre os segmentos i−1 e i, normalizada para (−π, π]| / DS      (0 nas pontas)
  ks[i]  = média de kap em i ± round(JK/DS)
  v[i]   = (K0 / (ks[i] + K0))^(1/3)                         // lei 2/3: 1 na reta, cai na curva
  media(i, h): m = min(round(h/DS), i, n−1−i); m < 1 → p[i]; senão média de p[i−m..i+m] com peso triangular 1 − |j−i|/(m+1)
  para i: a = media(i, fl*H*v[i])
          se ul > 0: hu = H*(0.4 + 0.6*fl)*v[i]; a += ul*GANHO*(media(i, hu) − media(i, 2*hu))   // passa do ponto na curva
  reamostragem ∝ 1/v: sempre guarda i = 0 e n−1; no meio, guarda o ponto quando o contador desde o último guardado
          chega a 1 + 6*max(0, v[i] − 0.5)     (curva: todo ponto; reta: 1 em 4)
```
A janela nunca passa da distância até a ponta (`m ≤ i`, `m ≤ n−1−i`): é o "limite de sobreposição" do risco 3 e o que mantém as pontas no lugar (junção e arremate intactos).

## 4. Encaixe no motor

`escreverPalavra` (`src/motor/escrita.js`), depois do laço do encaixe e **antes** da soma da largura; nada aqui muda `adv`:
```
1. se m.retoque > 0:  n0 = soma dos valores de cont
     para i: se glifos[i].tracos.length e retocada(sd, n0 + i, m.retoque): retocar(glifos[i], i === 0, rng(sd + '|retoque|' + indice + '|' + i))
2. tracos = undefined
   se m.ligadura > 0 e chars.length > 1 e cursiva(m):
     ctx.med ??= medidas(fontes, mao)
     tracos = ligar(glifos, chars, m, ctx.med, indice) ?? undefined
3. fl = min(1, m.fluidez*(1 + m.pressa)); ul = min(1, m.ultrapassagem*(1 + m.pressa))
   se (fl > 0 || ul > 0) e s >= 3:                           // "corpo" = s, mm por em
     cin = t → t.length < 2 || comprimento(t) < 0.15 ? t : suavizar(t, fl, ul)
     tracos ? tracos = tracos.map(cin) : para cada g de glifos: g.tracos = g.tracos.map(cin)
4. return { ...como hoje, ...(tracos && { tracos }) }        // sem junção a chave NÃO existe (golden de escreverPalavra)
```
18-A escreve 1, 2 e 4; 18-C acrescenta 3.

`fecha` em `src/layout.js` — um ramo novo; o `else` é o código de hoje, intocado:
```
const ponto = ([px, py]) => { tx, ty como hoje; return [x + px*w.s + tx + py*w.s*w.tan, v.y − py*w.s + ty + dyW] }
se w.tracos:  para t de w.tracos (t.length > 0): pag.push(t.map(ponto));  x += w.largura
senão:        laço por glifo de hoje
```
Palavra longa quebrada por letra: o pedaço é `{ ...w, tracos: undefined, texto: '', largura: 0, glifos: [] }` (sai sem junção; retoque e cinemática por glifo continuam valendo).

## 5. `ordem: 'escrita'` — fica fora do M17

Decisão: **não mexer em `src/maquina/otimizar.js` nem no contrato do documento neste marco.**
- A saída de `compor` já está em ordem de escrita (palavra a palavra, run a run, extras no lugar certo) e `ordem: 'escrita'` hoje é identidade: nunca inverte nem reordena. É o que o DoD testa.
- "Otimizar só a viagem entre palavras" exige o documento saber onde cada palavra começa (grupos por camada): muda `documento.js`, `otimizar.js`, `layout.js` e a UI, e colide com a trilha M18/M20. Vai para o M20, junto com as camadas de texto no contrato novo.
- No papel a tinta é a mesma em qualquer ordem; o que muda é a viagem. Risco 2 do EXPANSAO: o orquestrador mede `viagem()` de um A5 de prosa em `'escrita'` × `'otimizada'`, com `ligadura` 0 e 1, e registra no relatório.

## 6. Testes ligados ao DoD

Mão: `L = { ...NEUTRA, seed: 7, base: [{ fonte: 'EMSAllure', peso: 1 }], ligadura: 1, capricho: 0 }`. `TUDO = { ...L, adiamento: 1, fluidez: 1, ultrapassagem: 1, retoque: 1, pressa: 0.6, alternativas: 5, contexto: 1, arremate: 1, tremor: 0.3 }`.

1. **Golden intacto**: `npm test` verde sem `--test-update-snapshots`. `compor` com mão sem as 5 chaves `deepEqual` `compor` com `{ ...NEUTRA }`. `escreverPalavra('minimum')` com NEUTRA não tem a chave `tracos`.
2. **≤ 3 traços**: `compor('minimum', fontes, L, A5)` → `paginas[0].length <= 3` em EMSAllure, EMSSociety, EMSBrush, EMSLeague, EMSSwiss, EMSDecorousScript e MistralSingleLine (vão ≤ `CHEIO` no protótipo). EMSCapitol tem vão de 0,45 em em `i→n`: só exigir `<= 6` e registrar o número no relatório. Controle: `ligadura: 0` → 9 traços em EMSAllure; EMSBird (fora de `CURSIVAS`) com `ligadura: 1` → `deepEqual` ao de `ligadura: 0`.
3. **Pingo depois**: `{ ...L, adiamento: 1 }`, `escreverPalavra('minimum').tracos`: o primeiro traço é o mais longo; os 2 últimos têm comprimento < 0,15 em e y mínimo > 0,8 × altura-x. Também com `{ ...L, capricho: 1, ligadura: 0.6, adiamento: 1 }` em 30 seeds e a palavra `infinito`: sempre que há `tracos`, os `k` últimos são os extras (`k` = nº de pingos + cortes), nunca um traço de corpo.
4. **Junção < 0,6 em**: unitário — `ponte(A, B)` com pontas a 0,59 em: todo segmento novo ≤ `PASSO` + 1e-9, primeiro e último ponto de A e B preservados; `ligar` com par a 0,61 em → não liga (`f = 0`). No documento: `compor(PROSA, …, L)` → nenhum segmento de nenhum traço maior que 0,6 × tamanho.
5. **Determinismo**: `compor` duas vezes com `TUDO` → `deepEqual`; outra seed → `notDeepEqual`.
6. **Sanidade**: `TUDO` em ~60 palavras com acentos, hífen, maiúsculas e dígitos: nenhum NaN, nenhum traço < 2 pontos, páginas ≥ 1; `tamanho: 2.5` (abaixo de 3 mm) com fluidez 1 `deepEqual` ao de fluidez 0.
7. **Largura**: com `TUDO` sem tremor, `|w.largura − Σ g.adv*w.s| < 1e-9` e todo ponto de "minimum" em `[a.x − 0.3*tamanho, a.x + a.l + 0.3*tamanho]`.
8. **Cinemática** (unitário): pontas iguais às da entrada; reta de 2 pontos devolvida igual; quadrado aberto de lado 0,5 em com `fl: 1`: caixa ≥ 90% da original e nenhum ponto a mais de 0,06 em do traço original; com `ul: 1` algum ponto sai da caixa original; saída determinística; sem NaN.
9. **Retoque**: `retocada` em n = 0..999 com retoque 1 → exatamente 30 (±1); retoque 0 → 0; `retocar` não muda primeiro (no repasse) nem último ponto e aumenta o nº de pontos.
10. **validar**: personagem sem as 5 chaves → `[]`; `ligadura: 2` → erro; variação `{ fluidez: 0.5 }` ok; variação `{ ligadura: 1 }` → erro de identidade.
11. **Contrato**: `test/params.test.mjs` passa sem ser editado; as 5 chaves em `PARAMS` com `padrao === NEUTRA[chave]`.

**Ficha de espécimes** (`workflow/ciclos/18/especime.svg` + `.png`, gerada pelo orquestrador; o revisor aprova pela imagem). Deve mostrar, a ~12 mm de corpo, **um traço = uma cor**, bolinha no início de cada traço:
- Para cada uma das 8 `CURSIVAS`: `minimum vovó ação total bravo quilo` com `ligadura` 0 e com `ligadura` 1 (`capricho` 0), e o nº de traços por palavra ao lado.
- EMSAllure: `ligadura` 0,5 com `capricho` 1 em 3 seeds (mostra a quebra em runs); `adiamento` 0 × 1 com `pressa` 0 e 0,8 em `ti-ti-ti infinito`, com os traços numerados na ordem.
- Cinemática em preto: `minimum` em EMSAllure e EMSReadability com fluidez 0 / 0,5 / 1 e ultrapassagem 0 / 1; uma linha a 2,5 mm e outra a 3 mm de corpo (em escala ampliada) para ver o corte.
- Retoque: uma letra com repasse e uma com ganchinho, ampliadas 3×.
O revisor olha: ponte que atravessa a letra, laço indevido, bico na emenda, letra que encolheu, pingo longe demais. Pares ruins viram entrada em `PARES`; fonte ruim sai de `CURSIVAS`.

## 7. Tarefas

**Sequência: 18-A ∥ 18-B → depois 18-C ∥ 18-D.** Nenhuma dupla paralela tem arquivo em comum.

### 18-A — junções, ordem, retoque · modelo: sonnet
Arquivos: `src/motor/ductus.js` (novo), `src/motor/escrita.js`, `src/layout.js`, `src/fonte.js` (`CURSIVAS`), `src/motor/mao.js` (**só** `NEUTRA`, `IDENTIDADE`, `EXECUCAO`), `src/ajuda.js`, `src/personagem.js` (`OPCIONAIS`), `test/ductus.test.mjs` (novo).
Faz: §1 (dados, ajuda, validar, `CURSIVAS`), §2 inteiro, §4 passos 1, 2, 4 e o ramo de `fecha`. Exporta de `ductus.js`: `cursiva`, `medidas`, `analisar`, `saida`, `entrada`, `ponte`, `ligar`, `adiar`, `retocada`, `retocar`.
Casos em `test/ductus.test.mjs`: `analisar` de 'i' de EMSAllure (1 extra, `pr` com E.x < S.x) e de 'm' de EMSSociety (invertido: E.x < S.x); 'ç' e 'ã' com cedilha/til em `extras`; `saida`/`entrada` das três classes com glifos sintéticos; `ponte` (§6.4); `ligar` devolve `null` com 1 letra e com `ligadura` tal que nada liga; `adiar` com `pressa: 1` transforma pingo em traço de 2 pontos; §6.9.
Verificação: `npm test` verde, goldens intactos, **sem** `npm run golden`.

### 18-B — cinemática · modelo: sonnet
Arquivos: `src/motor/cinematica.js` (novo), `test/cinematica.test.mjs` (novo).
Faz: §3 (`export function suavizar`), sem importar nada do projeto. Casos: §6.8.
Verificação: `node --test test/cinematica.test.mjs` verde; 1.000 chamadas num traço de 120 pontos em < 500 ms.

### 18-C — cinemática no motor, prévias e controles · modelo: haiku
Arquivos: `src/motor/escrita.js` (**só** o passo 3 do §4 + import), `src/motor/mao.js` (**só** `PARAMS`), `src/ui/personagem.js`.
Faz: passo 3; 5 entradas de `PARAMS` da tabela do §1 (`viaMao` + helper `curs`, importando `CURSIVAS` de `../fonte.js`); `CHAVES_IDENTIDADE` += `ligadura`, `adiamento`; `CHAVES_EXECUCAO` += `fluidez`, `ultrapassagem`, `retoque`.
Verificação: `node --test test/params.test.mjs test/ajuda.test.mjs` verde (se alguma das 5 der "min = max", reportar — não trocar o algoritmo); `npm test` e `npm run build` verdes.

### 18-D — testes do DoD · modelo: haiku
Arquivos: `test/ductus-dod.test.mjs` (novo), `test/personagem.test.mjs`.
Faz: §6 itens 1–7 e 11 em `ductus-dod.test.mjs` (os que usam fluidez/ultrapassagem dependem do 18-C: rodar depois dele ou marcar o que faltou); item 10 em `personagem.test.mjs`.
Verificação: `npm test` verde. Teste que falha por defeito do motor **não** é afrouxado: vai para o relatório.

Gate do orquestrador: `npm test`, `npm run build`, `npm run e2e` (capturas mudam: 5 controles a mais), ficha de espécimes ao revisor, medida de `viagem()` (§5) e tempo de `compor` A4 ~400 palavras com `TUDO` (M16: 23 ms com mão cheia; meta do M21 < 400 ms).

## 8. Riscos

1. **Golden**: todo efeito atrás de guarda e a chave `tracos` só existe com junção. Se quebrar, o defeito é do código novo.
2. **Sentido do traço na fonte**: a regra `VIRA` acerta Society 'm' e Allure 'a', mas letra de vários traços fica como a fonte desenhou. Ponte estranha → `PARES[par] = 0` ou tirar a fonte de `CURSIVAS`. É para isso a ficha.
3. **`capricho` corta a ponte pela metade** (fórmula do EXPANSAO): mão padrão (`capricho` 1) com `ligadura` 1 liga tudo que já se toca, mas só metade das pontes de verdade. Testes do DoD usam `capricho: 0`. Se o usuário estranhar, trocar o fator, não a spec.
4. **Encaixe (M16) muda o vão** antes da junção: medir sempre depois do encaixe (é o que o §4 faz). `deformar` com `alternativas` > 1 desloca pontas ~0,03 em: pares que se tocavam podem virar ponte curta — aceito.
5. **Cinemática encolhe laço pequeno**: janela limitada, traço < 0,15 em não entra, desliga com `s < 3`. O revisor confere a linha de 3 mm.
6. **Pontos por palavra sobem ~3,5×** com fluidez > 0 (G-code maior, tremor consome mais rng). Aceito; medir no gate.
7. **Amplitudes** (ERRO, VIES, H, GANHO, 0,012 do repasse…) são chute: constantes nomeadas no topo, calibradas no papel pelo usuário.
8. **Altura-x agora é medida** (`medidas`) no ductus, mas `contexto.js` continua com `XH = 0.45` fixo: não unificar neste marco.

## 9. Não fazer

- Não mexer em `glifo()`, `misturar()`, `mutar()`, `contexto.js`, `otimizar.js`, `documento.js`, nem nos fluxos de rng existentes.
- Não acrescentar chave às `ancoras`; não mudar `adv`/`largura` em nenhum efeito novo.
- Não rodar `npm run golden` / `--test-update-snapshots`.
- Não importar `layout.js` de `src/motor/`. Nada de DOM fora de `src/ui/`. Nenhuma dependência nova. Não vendorizar código de sigma-lognormal.
- Não usar `hash()` cru como aleatório. Não guardar estado entre palavras além de `ctx.med`.
- Não ligar maiúsculas, dígitos nem pontuação. Não pôr lista de letras por classe no código: classe vem da geometria.
- Não variar F nem Z por segmento (só com teste físico).

Fora do escopo (vai para o `QUADRO.md`):
- `ordem: 'escrita'` com viagem otimizada entre palavras (grupos no documento) → M20.
- Fusão de traços internos com inversão/retraço (habilitaria EMSPepita e HersheyScript1); EMSFelix (`semi`) como candidata a `CURSIVAS` (deu 3 traços no protótipo).
- Maiúscula ligando à minúscula; ligadura atravessando hífen; `PARES` por fonte.
- ΣΛ com arcos (Berio completo); velocidade/pressão no G-code.
- `mutar()` variar os 5 params; arremate ciente do ductus (hoje continua o do M16, aplicado antes da junção e só na última letra).
- Sorteio do retoque dentro do bloco; retoque em traço fundido atravessando letras.
- Unificar `XH` de `contexto.js` com `medidas().xh`.
