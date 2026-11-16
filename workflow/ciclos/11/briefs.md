# Briefs do ciclo 11 — M14 (Documento, máquinas, papel)

Spec completa: `workflow/ciclos/11/projeto.md` (o worker pode lê-la; os trechos relevantes estão copiados abaixo). Raiz: `C:\Users\augus\Desktop\augusto\projects\3dprinter_plotter`.

## Tarefa 11-A

modelo: sonnet

**Arquivos permitidos:** `src/maquina/perfis.js` (novo), `src/maquina/gcode.js`, `src/maquina/otimizar.js`, `test/perfis.test.mjs` (novo), `test/gcode-camadas.test.mjs` (novo). Nada mais.

**Regras comuns:** só os arquivos listados (criar/editar); nenhum outro. Os goldens (`test/golden.test.mjs.snapshot`) devem passar **intactos**; **nunca** `--test-update-snapshots` nem `npm run golden`; não edite `golden.test.mjs`, `layout.test.mjs`, `exportar.test.mjs`, `grimorio.test.mjs` nem `src/ui/`. Sem pacotes novos, sem commit. Testes: `node:test` + `node:assert/strict`, ESM (`.mjs`). Golden vermelho = bug seu.

**Fatos lidos do código atual**
- `src/maquina/gcode.js` hoje começa com o literal (copiar header/footer byte a byte para `PERFIS.megaS`):
```js
export const PERFIL_PADRAO = {
  zEscrita: 3, zLevantada: 6, fDesenho: 2400, fViagem: 6000, fZ: 500,
  offsetX: 0, offsetY: 0, mesaX: 210, mesaY: 210,
  header: "G21\nG91\nG0 Z10 F500\nG90\nM412 S0\nG28 X Y\nG28 Z\nG0 Z6 F500\n",
  footer: "G0 Z15 F500\nG0 X0 Y200 F6000\nM84\n",
};
```
- `gcode(tracos, pagina, perfil)` e `svg()` **não mudam** (pode extrair helper interno do bloco de um traço, mas a saída deve ser idêntica). Bloco de um traço hoje: `G0 X{x} Y{y} F{fViagem}\nG1 Z{zEscrita} F{fZ}\n` + `G1 X Y F{fDesenho}\n` por ponto restante + `G0 Z{zLevantada} F{fZ}\n`, coordenadas `toFixed(3)`. Mapeamento atual: `x + offsetX`, `pagina.altura - y + offsetY`.
- Exemplo exato de teste existente (`exportar.test`): um traço `[[10,20],[30,20]]` em página 210×210 gera `G0 X10.000 Y190.000 F6000\nG1 Z3 F500\nG1 X30.000 Y190.000 F2400\nG0 Z6 F500\n` entre header e footer.
- `otimizar.js` hoje: `export function otimizar(tracos, tol = 0.1, { janela } = {})`, primeira linha do corpo `const restantes = tracos.filter(valido).map((t) => t.map((p) => [...p]));`. `valido` já existe no arquivo.
- `perfis.js` não importa nada. `gcode.js` importa de `perfis.js` (nunca o contrário). Não importar `materiais/documento.js`.

**Especificação (da spec do conselheiro)**

## 2. `src/maquina/perfis.js` (tarefa A)

```js
export const PERFIS = { megaS, p2s, personalizado };
export function papelMaximo(perfil)          // → { largura, altura } = tamanho da janela
export function cabeNaMaquina(papel, perfil) // → { ok: boolean, motivo: string }  ('' quando ok)
```

| campo | megaS | p2s |
|---|---|---|
| nome | `'megaS'` | `'p2s'` |
| mesaX, mesaY | 210, 210 | 256, 256 |
| janela {x0,y0,x1,y1} | 0, 0, 210, 210 | 48, 55, 255, 255 (útil 207×200) |
| zEscrita / zLevantada / zMin | 3 / 6 / 0 | 17 / 21 / 16 |
| fDesenho / fViagem / fZ | 2400 / 6000 / 500 | 2400 / 6000 / 500 |
| offsetX, offsetY | 0, 0 | 0, 0 |
| estaciona {x,y,z} | 0, 200, 15 | 150, 60, 30 |
| trocaCaneta | `'M0 Trocar caneta: {nome}'` | `'; Trocar caneta: {nome}\nM400 U1'` |
| experimental | false | true |

- `megaS.header` e `megaS.footer`: **cópia byte a byte** das strings de `PERFIL_PADRAO` de hoje (recortar e colar; `exportar.test` e o golden conferem).
- `p2s.header`: `"G21\nG90\nM106 S0\nG28\nG0 Z30 F500\nG0 X150 Y60 F6000\nM400 U1\n"` (homing sem caneta → sobe → estaciona na frente → pausa para montar a caneta).
- `p2s.footer`: `"G0 Z30 F500\nG0 X150 Y250 F6000\nM400 U1\n"` (estaciona atrás → pausa para tirar a caneta). Sem `M84` (não verificado na P2S).
- `personalizado`: `{ ...megaS, nome: 'personalizado' }`. Persistência em localStorage é UI (M15).
- Números da P2S conferidos na PESQUISA §1: janela X48–255/Y55–255 (item 4), Z de desenho ≈ 17, levantar 20–25, piso 16 (item 2), sem `M412` (1), sem `M104`/`M109`/E (5), ventoinha 0 (7), 2400 mm/min = 40 mm/s, dentro dos 30–60 mm/s (8). Header e footer são **montados a partir do fluxo descrito**; nenhuma fonte publica o texto real.
- `papelMaximo`: `j = perfil.janela ?? { x0: 0, y0: 0, x1: perfil.mesaX, y1: perfil.mesaY }` → `{ largura: j.x1 - j.x0, altura: j.y1 - j.y0 }` (perfil salvo antigo não tem `janela`).
- `cabeNaMaquina`: ok se `papel.largura <= max.largura + 1e-6` e idem altura. Motivo: `` `papel ${l}×${a} mm não cabe na janela útil ${L}×${A} mm do perfil ${nome}` ``. Não tenta girar o papel.

## 3. `src/maquina/gcode.js` e `otimizar.js` (tarefa A)

`gcode.js`: sai o literal `PERFIL_PADRAO`, entra `import { PERFIS, papelMaximo, cabeNaMaquina } from './perfis.js'; export const PERFIL_PADRAO = PERFIS.megaS;`. **`svg()` e `gcode()` ficam como estão** (podem compartilhar um helper interno que emite o bloco de 4 linhas de um traço; o golden de gcode é o guarda).

```js
export function gcodeDocumento(pagina, papel, perfil = PERFIS.megaS, { camadas, canetas = {} } = {})
// pagina: Pagina; camadas: ids a exportar (undefined = todas, na ordem de pagina.camadas)
// → { texto, avisos, nTracos, comprimento, trocas }
```
Passos:
1. `zMin = perfil.zMin ?? 0`. Se `zEscrita`, `zLevantada` ou `estaciona.z` < `zMin` → `throw new Error('Z de escrita 15 abaixo do piso 16 (zMin) do perfil p2s')` (texto conforme o campo).
2. `c = cabeNaMaquina(papel, perfil)`; se `!c.ok` → `throw new Error(c.motivo)`.
3. Mapeamento (canto inferior esquerdo do papel no canto `x0,y0` da janela): `xm = j.x0 + offsetX + x`, `ym = j.y0 + offsetY + (papel.altura - y)`. Com megaS (x0 = y0 = 0) é igual ao de hoje.
4. `texto = header`. Para cada camada selecionada com ≥ 1 traço válido:
   - `nome = (canetas[camada.caneta]?.nome ?? camada.caneta).replace(/[\r\n]/g, ' ')`.
   - Se já saiu alguma camada e a caneta é **diferente** da anterior: `G0 Z{estaciona.z} F{fZ}` → `G0 X{estaciona.x} Y{estaciona.y} F{fViagem}` → `trocaCaneta` com `{nome}` trocado + `\n`; `trocas++`. A primeira camada não pausa.
   - Uma linha `; camada {id} caneta {nome}`.
   - Cada traço: o mesmo bloco de hoje (`G0 X Y F{fViagem}`, `G1 Z{zEscrita} F{fZ}`, `G1 X Y F{fDesenho}`…, `G0 Z{zLevantada} F{fZ}`), `toFixed(3)`.
   - Ponto com `xm`/`ym` fora de `[x0,x1]×[y0,y1]` → aviso `` `camada ${id}: traço ${i + 1} fora da janela` `` (um por traço; o G-code é emitido mesmo assim, como hoje).
5. `texto += footer`.

`gcodeDocumento` **não otimiza**; quem chama aplica `otimizar` por camada.

`otimizar.js` — a assinatura ganha uma opção, nada mais:
```js
export function otimizar(tracos, tol = 0.1, { janela, ordem = 'otimizada' } = {})
// primeira linha: if (ordem === 'escrita') return tracos.filter(valido).map((t) => t.map((p) => [...p]));
```

**Casos de teste** (arquivos `test/perfis.test.mjs` e `test/gcode-camadas.test.mjs`; use papéis literais como `{ largura: 105, altura: 148 }`, camadas literais `{id, caneta, personagem:null, ordem:'otimizada', tracos}`):

**A — casos de teste**
1. P2S, A6, 2 camadas: texto sem `M412`, sem `M104`/`M109`, nenhuma palavra `E` (`/(^|\s)E[-\d.]/m`).
2. Mesmo texto: todo `X`/`Y` numérico (header e footer incluídos) dentro de 48–255 / 55–255; todo `Z` ≥ 16.
3. Duas camadas com canetas diferentes na megaS → exatamente uma linha `M0 Trocar caneta: Vermelha`, depois de `G0 Z15` e `G0 X0.000 Y200.000`; `trocas === 1`. Mesma caneta nas duas → nenhuma pausa. Na P2S → `M400 U1` a mais.
4. `{ camadas: ['notas'] }` exporta só essa camada, sem pausa.
5. `zEscrita: 15` na P2S → `throw` com "zMin"; `zLevantada` abaixo também.
6. A4 na megaS → `throw` com "não cabe"; `cabeNaMaquina` de A5 na megaS ok; A5 na P2S não ok (retrato e paisagem); A6 na P2S ok; `papelMaximo(p2s)` = 207×200; perfil sem `janela` usa `mesaX/mesaY`.
7. Traço fora do papel → aviso "fora da janela".
8. megaS, uma camada: o corpo (sem a linha `; camada`) é igual ao de `gcode(tracos, papel)`.
9. `otimizar(x, 0.1, { ordem: 'escrita' })` devolve cópia na mesma ordem e sentido; sem a opção, igual a antes.
10. Nome de caneta com `\n` não gera linha nova de G-code.

Verificação: `node --test test/perfis.test.mjs test/gcode-camadas.test.mjs test/exportar.test.mjs test/golden.test.mjs` e `git status --short test/golden.test.mjs.snapshot` vazio.

**Verificação:** `node --test test/perfis.test.mjs test/gcode-camadas.test.mjs test/exportar.test.mjs test/golden.test.mjs` e `git status --short test/golden.test.mjs.snapshot` vazio. Rode também `npm test`.

**NÃO fazer:** não mudar `svg()`/`gcode()` antigos; não tocar `src/ui/`; não otimizar dentro de `gcodeDocumento`; não inventar `M84` na P2S; não girar papel em `cabeNaMaquina`; `PERFIL_PADRAO` deve ser exatamente `PERFIS.megaS`.

## Tarefa 11-B

modelo: sonnet

**Arquivos permitidos:** `src/layout.js`, `test/layout-caixas.test.mjs` (novo). Nada mais.

**Regras comuns:** só os arquivos listados (criar/editar); nenhum outro. Os goldens (`test/golden.test.mjs.snapshot`) devem passar **intactos**; **nunca** `--test-update-snapshots` nem `npm run golden`; não edite `golden.test.mjs`, `layout.test.mjs`, `exportar.test.mjs`, `grimorio.test.mjs` nem `src/ui/`. Sem pacotes novos, sem commit. Testes: `node:test` + `node:assert/strict`, ESM (`.mjs`). Golden vermelho = bug seu.

**Fatos lidos do código atual (`src/layout.js`, 139 linhas)**
- `PAGINAS` (A4, A5, mesa) fica **literal**, não mexer. `compor(texto, fontes, mao, pagina, opcoes = {})` devolve hoje `{ paginas, avisos, fim }`; usado em `src/materiais/scroll.js` e nos testes golden/layout/espacamento/grimorio. Primeiro aviso é sempre `` `tolerancia de limites: ${tol} mm` ``; depois `glifo ausente: X`; `palavra longa quebrada: ${p}` durante a quebra.
- Estrutura atual: `quebrar(texto, medir, gastar, espaco, W, avisos)` produz linhas `{pals, w, just}` (null = linha em branco; `just` true só para linhas fechadas por estouro, a última do parágrafo é `fecha(false)`); `medir` usa o mapa `cont` de ocorrências (`glifo(fontes, mao, ch, cont+n).adv * tamanho`), `gastar` incrementa `cont`; depois `desenhar` usa outro mapa `ocor` e chama `glifo` de novo, consumindo `r = rng(mao.seed + '|tremor')` com `tx` e depois `ty` por ponto; `x` acumulado: `x += g.adv * tamanho` e `x += espaco + extra`. `base = (k) => topo + tamanho + k*tamanho*entrelinha + mao.queda*k`. Quebra de página: `k > 0 && base(k) > limite` -> nova página, `k=0`, `topo = margens.topo`; linha em branco no topo (k==0) é ignorada; linha em branco que provoca quebra é descartada. `fim = k > 0 ? base(k-1) : topo`.
- Palavra longa (maior que W): quebra por letra; cada pedaço vira linha `just:false`, o último pedaço vira `atual` e pode receber mais palavras. `espaco = (glifo(' ').adv + mao.espacoPalavra) * tamanho`.
- Você está **reescrevendo** `quebrar` + laço de paginação + `desenhar` como um passo só (cursor). O golden é o guarda: mesma ordem de `gastar`, mesmo consumo do rng, mesmas somas em ponto flutuante, mesma ordem dos avisos. Rode o golden a cada passo da reescrita.

**Especificação (da spec do conselheiro)**

## 4. `src/layout.js` — layout por palavra (tarefa B)

```js
compor(texto, fontes, mao, pagina, opcoes) → { paginas, avisos, fim, ancoras }
// opcoes novas: obstaculos = [], colunas = 1, vaoColunas = 2 * tamanho
```
- **Obstáculo**: `{ x, y, l, a, pagina = 0 }` — caixa em mm no papel (canto sup-esq), índice da página. Sem folga: quem chama infla a caixa.
- **Coluna**: `colunas` = inteiro ≥ 1. Coluna `i`: `l = (W - (n - 1) * vao) / n`, `x = margens.esq + i * (l + vao)`. Com `n === 1` usar literalmente `{ x: margens.esq, l: W }` (sem conta). Fluxo: coluna 0 de cima a baixo, depois a 1, depois página nova. Na 1ª página todas as colunas começam em `opcoes.topo`.
- **Âncora** (uma por palavra desenhada, na ordem do desenho): `{ pagina, coluna, linha, indice, texto, x, y, l }`. `x` = borda esquerda, `y` = linha de base, `l` = largura, sem tremor e já com o espaço extra do justificado; `linha` = `k` na coluna; `indice` = ordinal da palavra no texto (por espaços e quebras). Palavra quebrada por letra gera uma âncora por pedaço, com o mesmo `indice`.
- **Palavra como unidade**: `escrever(p) → { texto, largura, glifos: [{ tracos, adv }] }`, feita uma vez com as ocorrências de `cont` (como o `medir` de hoje). A linha guarda o objeto; desenhar usa `glifos` guardados. Somem o mapa `ocor` e a segunda chamada a `glifo`. É a costura que o M16 troca por `escreverPalavra`.
- `fim`: linha de base da última linha escrita; com `colunas > 1`, a maior entre as colunas da última página.

Quebra com cursor (substitui o par `quebrar` + laço de paginação):
```
cur = { pag: 0, col: 0, k: 0, topo: opcoes.topo ?? margens.topo }
base(k) = cur.topo + tamanho + k*tamanho*entrelinha + mao.queda*k          // fórmula de hoje
avancar():                                 // regra de quebra de hoje, coluna antes de página
  se cur.k > 0 e base(cur.k) > limite:
     cur.k = 0; cur.col++
     se cur.col == cols.length: cur.col = 0; cur.pag++; cur.topo = margens.topo; paginas.push([])
     devolve true
  devolve false
vaga():                                    // → { x0, W, y } da próxima linha com espaço
  repete:
    avancar(); y = base(cur.k); c = cols[cur.col]
    obs = obstáculos da página cur.pag com  o.y < y + 0.3*tamanho  e  o.y + o.a > y - tamanho
    se obs vazio: devolve { x0: c.x, W: c.l, y }              // caminho antigo, mesmos floats
    s = maior trecho de [c.x, c.x + c.l] menos os intervalos [o.x, o.x + o.l]
    se s.l >= 2*tamanho: devolve { x0: s.x, W: s.l, y }
    cur.k++                                // linha tapada: pula
linha em branco:  se cur.k == 0: ignora;  senão se avancar(): ignora;  senão cur.k++
palavra p (w = escrever(p)):
  cabe na linha aberta (atual.w + espaco + w.largura <= atual.W) → entra; gastar(p)
  senão: fecha(just = true); v = vaga()
    w.largura <= v.W            → abre a linha com p; gastar(p)
    w.largura <= cols[cur.col].l → cur.k++ e tenta vaga() de novo (só a linha é estreita)
    senão                        → aviso 'palavra longa quebrada' + quebra por letra, cada pedaço com vaga()
fecha(just): desenha em (v.x0, v.y) com W = v.W, gera âncoras, cur.k++
```
`// ponytail: usa só o maior trecho livre; texto não corre dos dois lados de um obstáculo central.`

**Invariantes do golden** (sem `obstaculos` e `colunas = 1`): mesma ordem de `gastar`; mesmo consumo do rng de tremor (`tx` depois `ty`, por ponto, na ordem de desenho); `x` continua acumulado com `x += g.adv * tamanho` e `x += espaco + extra` dentro do desenho (não pré-somar offsets); mesma ordem dos `avisos`; `centro`/`justificado` com as mesmas expressões, trocando `margens.esq`→`x0`.

**Casos de teste** (`test/layout-caixas.test.mjs`; fontes e mão como em `test/layout.test.mjs`: `parseFonte(fs.readFileSync(new URL('fontes/EMSBird.svg', raiz), 'utf8'), 'EMSBird')`, `mao = { ...NEUTRA, base: [{ fonte: 'EMSBird', peso: 1 }] }`, `import { NEUTRA } from '../src/motor/mao.js'`):

**B — casos de teste**
1. Sem opções novas: `ancoras.length` = nº de palavras; âncoras em ordem de leitura; `x` e `l` dentro das margens.
2. Bbox dos traços de cada palavra cabe em `[x - tol, x + l + tol]` da âncora (medida = desenhada), mão neutra.
3. Obstáculo no canto sup-esq (capitular 20×20): nenhum ponto dentro da caixa; linhas abaixo voltam a `margens.esq`.
4. Obstáculo que tapa a largura toda em uma faixa: nenhuma linha na faixa, texto continua abaixo.
5. `colunas: 2`: nenhum ponto no vão; a 2ª coluna começa no topo; a 3ª "coluna" vai para a página 2.
6. Palavra maior que a linha estreitada mas menor que a coluna: desce, sem aviso de quebra.
7. Determinismo: duas chamadas com obstáculos e colunas dão `deepEqual`.
8. `obstaculos: []` e `colunas: 1` explícitos → `paginas` e `fim` `deepEqual` à chamada sem opções.

Verificação: `node --test test/layout-caixas.test.mjs test/layout.test.mjs test/espacamento.test.mjs test/grimorio.test.mjs test/golden.test.mjs` e snapshot sem diff.

**Verificação:** `node --test test/layout-caixas.test.mjs test/layout.test.mjs test/espacamento.test.mjs test/grimorio.test.mjs test/golden.test.mjs` e `git status --short test/golden.test.mjs.snapshot` vazio. Rode também `npm test`.

**NÃO fazer:** não importar nada de `materiais/` em `layout.js`; não remover `PAGINAS`; não implementar texto dos dois lados do obstáculo, folga de obstáculo nem âncoras por linha; não mudar a assinatura além das 3 opções novas e do campo `ancoras` no retorno; não alterar o consumo do rng nem somar offsets antes do laço de desenho.

## Tarefa 11-C

modelo: haiku

**Arquivos permitidos:** `src/materiais/documento.js` (novo), `src/materiais/scroll.js` (só as linhas descritas), `test/documento.test.mjs` (novo). Nada mais.

**Regras comuns:** só os arquivos listados (criar/editar); nenhum outro. Os goldens (`test/golden.test.mjs.snapshot`) devem passar **intactos**; **nunca** `--test-update-snapshots` nem `npm run golden`; não edite `golden.test.mjs`, `layout.test.mjs`, `exportar.test.mjs`, `grimorio.test.mjs` nem `src/ui/`. Sem pacotes novos, sem commit. Testes: `node:test` + `node:assert/strict`, ESM (`.mjs`). Golden vermelho = bug seu.

**Fatos lidos do código atual**
- `src/materiais/scroll.js` linhas 7–15 hoje:
```js
// [largura, altura, margem] em mm.
export const FOLHAS = { A5: [148, 210, 12], A6: [105, 148, 9], A7: [74, 105, 6], A8: [52, 74, 4] };

export function folha(nome, paisagem = false, margem) {
  const [l, a, m0] = FOLHAS[nome];
  const m = margem ?? m0;
  return { largura: paisagem ? a : l, altura: paisagem ? l : a, margens: { topo: m, dir: m, base: m, esq: m } };
}
```
  Substitua **só** isso (mantendo o resto do arquivo e os imports existentes; acrescente o import de `./documento.js`) pelas linhas dadas na especificação abaixo. `papel()` deve devolver o mesmo objeto que `folha()` devolve hoje (`{ largura, altura, margens: {topo,dir,base,esq} }`, chaves nessa ordem), para os goldens do grimório não mudarem.
- `src/ui/grimorio.js` usa `FOLHAS.A6[2]` e `Object.entries(FOLHAS)` (`[k, [l, a]]`): o formato `[l, a, m]` e as 4 chaves A5–A8 devem permanecer.
- `PAGINAS` em `src/layout.js` (só leitura, teste 4): `A4: 210×297 margem 20`, `A5: 148×210 margem 15` (margem difere de `PAPEIS.A5` = 12 de propósito; o teste compara só largura e altura).
- `documento.js` não importa nada de `layout.js` nem de `perfis.js`.

**Especificação (da spec do conselheiro)**

## 1. `src/materiais/documento.js` (tarefa C)

```js
/** @typedef {[number, number][]} Traco  mm, origem no canto sup-esq do papel, y para baixo */
/** @typedef {{id:string, caneta:string, personagem:string|null, ordem:'escrita'|'otimizada', tracos:Traco[]}} Camada */
/** @typedef {{camadas:Camada[]}} Pagina */
/** @typedef {{largura:number, altura:number, margens:{topo:number,dir:number,base:number,esq:number}}} Papel */
/** @typedef {{nome:string, cor:string, espessura:number}} Caneta */
/** @typedef {{papel:Papel, canetas:Object<string,Caneta>, paginas:Pagina[], avisos:string[]}} Documento */
/** @typedef {{x:number, y:number, l:number, a:number}} Caixa */
```

`PAPEIS` — `[largura, altura, margem padrão]` em mm, retrato:

| nome | l | a | margem |   | nome | l | a | margem |
|---|---|---|---|---|---|---|---|---|
| A3 | 297 | 420 | 25 | | A7 | 74 | 105 | 6 |
| A4 | 210 | 297 | 20 | | A8 | 52 | 74 | 4 |
| A5 | 148 | 210 | 12 | | carta | 215.9 | 279.4 | 20 |
| A6 | 105 | 148 | 9 | | oficio | 215.9 | 355.6 | 20 |

A5–A8 repetem exatamente os valores de `FOLHAS` de hoje (goldens do grimório dependem disso). `personalizado` não entra na tabela.

Helpers (3):
1. `papel(nome, { paisagem = false, margem, largura, altura } = {}) → Papel`. Nome da tabela: usa `PAPEIS`. `'personalizado'`: exige `largura` e `altura` finitos > 0 (senão `throw`), margem padrão `Math.round(Math.min(l, a) * 0.08)`. Nome desconhecido: `throw`. Motivo: único construtor de papel do app.
2. `deTracos(paginas, papel, { id = 'texto', caneta = 'preta', personagem = null, ordem = 'otimizada', avisos = [] } = {}) → Documento`. Embrulha a saída antiga (`Traco[][]` de `compor`/`comporGrimorio`) em uma camada por página; `canetas = { [caneta]: { nome: caneta, cor: '#1a1a1a', espessura: 0.4 } }`. Motivo: ponte até os materiais migrarem (M20).
3. `validarDocumento(doc) → string[]` (vazio = válido). Checa: papel com dimensões finitas > 0; toda `camada.caneta` existe em `doc.canetas`; `ordem` é um dos dois valores; todo traço tem ≥ 2 pontos e só números finitos. Motivo: DoD do M20 e teste de `deTracos`.

Em `src/materiais/scroll.js` (mesma tarefa), só isto muda:
```js
import { PAPEIS, papel } from './documento.js';
export const FOLHAS = Object.fromEntries(['A5', 'A6', 'A7', 'A8'].map((n) => [n, PAPEIS[n]]));
export const folha = (nome, paisagem = false, margem) => papel(nome, { paisagem, margem });
```
Formato `[l, a, m]` e as 4 chaves de `FOLHAS` ficam iguais (`ui/grimorio.js` usa `FOLHAS.A6[2]` e `Object.entries`).

**Casos de teste** (`test/documento.test.mjs`):

**C — casos de teste**
1. `PAPEIS` tem as 8 chaves com as dimensões da tabela; `papel('A4')` = 210×297 com margens 20; `paisagem` troca os lados.
2. `papel('personalizado', { largura: 100, altura: 150 })` funciona; sem dimensões → `throw`; nome desconhecido → `throw`.
3. `FOLHAS` `deepEqual` a `{ A5: [148, 210, 12], A6: [105, 148, 9], A7: [74, 105, 6], A8: [52, 74, 4] }`; `folha('A6', true, 5)` igual ao objeto de antes.
4. `PAGINAS.A4`/`.A5` (layout.js, só leitura) têm as mesmas dimensões de `PAPEIS`.
5. `deTracos([[t1], [t2]], papel('A6'))` → 2 páginas, 1 camada cada; `validarDocumento` devolve `[]`.
6. `validarDocumento` acusa: caneta inexistente, `ordem` inválida, traço de 1 ponto, `NaN`.

Verificação: `node --test test/documento.test.mjs test/grimorio.test.mjs test/golden.test.mjs` e snapshot sem diff.

**Verificação:** `node --test test/documento.test.mjs test/grimorio.test.mjs test/golden.test.mjs` e `git status --short test/golden.test.mjs.snapshot` vazio. Rode também `npm test`.

**NÃO fazer:** não incluir `personalizado` em `PAPEIS`; não criar outros helpers além dos 3 (`papel`, `deTracos`, `validarDocumento`); não tocar `src/ui/`, `layout.js`, `perfis.js`; não mudar a margem de A5–A8; não importar `perfis.js` (`cabeNaMaquina` é da tarefa A).
