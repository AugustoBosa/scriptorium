# Ciclos 12–13 — M15: Identidade + oficinas (spec do conselheiro)

Base: `EXPANSAO.md` §1 (pedidos 5 e 6), §2, §4.1, §4.4, §4.7 (M15), §5.4; `QUADRO.md` "Retomada (após M14)"; código do commit de2b12a.
Tokens prontos: `workflow/ciclos/12/tema-proposto.css`. Escopo = mínimo que cumpre o DoD. Nada de dependência nova.

## 0. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Fontes web:** `<link>` do Google Fonts só para **EB Garamond** (400, 500, itálico 400, `display=swap`), usada em título, abas e títulos de grupo. UI em `system-ui`. Pilha de reserva: Palatino Linotype → Palatino → Book Antiqua → Georgia. | `@fontsource` não está instalado (dependência nova = parar e perguntar). Sem rede o app continua inteiro com a reserva; nenhum controle depende da fonte web. Auto-hospedar o woff2 fica no QUADRO. |
| D2 | Temas por **`light-dark()` + `color-scheme`**: um valor por token; `<html data-tema="claro|vela">` força, ausente segue o sistema. | Sem bloco de tokens duplicado; controles nativos acompanham o tema; os projetos `claro`/`vela` do Playwright (`colorScheme`) funcionam sem código. Mesmo piso de navegador do `popover`. |
| D3 | A **folha da prévia continua papel** nos dois temas (`--folha` clara, traço escuro). | Fidelidade ao que sai da caneta; `svg()` não precisa trocar cor. |
| D4 | `PARAM` ganha **`tipo`** (`'faixa'｜'numero'｜'opcao'｜'marca'`), **`opcoes`** e **`semEscala`** além do contrato da §4.4. | §4.4 pede select/checkbox no mesmo popup mas não diz como declarar; seed inteira não cabe num range. |
| D5 | `previa(valor, ctx)` da mão usa **`ctx.escrever(mao, texto, opcoes)`** injetado, não importa `compor`. | `layout.js` importa `mao.js`; o inverso daria ciclo. No M16 basta trocar `escrever` por `escreverPalavra` sem tocar os PARAMS. |
| D6 | Rótulo/ajuda dos PARAMS já existentes vêm de `ROTULOS`/`AJUDA` (`src/ajuda.js`, só leitura); chaves **novas** levam texto literal no próprio módulo. `ajuda()` (DOM) sai de `src/ajuda.js`; nasce `dica()` em `src/ui/controle.js`. | `ajuda.js` não vira arquivo disputado; cumpre a regra §4.1 (menor do M13). |
| D7 | **3 instâncias para 5 oficinas:** `escrita` serve `#carta` e `#livro` (livro = colunas 2 + controle `colunas`); `grimorio` serve `#scroll` e `#grimorio` (o hash define `cfg.porPagina`; o select "Montagem" some); `sigilos` é painel mínimo. Cada instância tem seu `estado`; as chaves compartilhadas são copiadas na troca de oficina. | Painéis atuais mantêm a assinatura `montar(el, estado, aoMudar) → atualizar`. Materiais próprios chegam no M20. |
| D8 | Exportação passa a usar **`gcodeDocumento` + `svgDocumento`** (via `deTracos`). Papel maior que a janela = erro claro e download bloqueado; "fora da janela" em perfil experimental bloqueia o G-code. | Menores do M14. Muda o comportamento: A4 na Mega S hoje só avisa; passa a bloquear o G-code (SVG continua). |
| D9 | `e2e/visual.spec.js` **grava** screenshots (`testInfo.outputPath`), não compara com baseline. | Baseline varia com SO e com a fonte web; o objetivo é a aprovação do usuário (§5.4). |
| D10 | Fora do contrato de prévia viva: campos de texto/arquivo/busca, botões e **seletores de dado** (personagem salvo, variação, variação B, filtros de magia, alvo do editor de símbolos, `comparar`). Recebem `dica()` quando já tinham "?". | Pedido 5 fala de parâmetros (slider, select, checkbox que mudam o desenho). Avisar o usuário na aprovação. |

**Contraria a EXPANSAO:** (a) §4.7 pede migração "haiku, um arquivo por tarefa"; aqui são 2 tarefas com vários arquivos, porque §5.1 limita a 3 briefs por ciclo e o pedido é no máximo 2 ciclos. (b) §4.1 lista `painel-*.js`; os painéis ficam com os nomes atuais (`personagem.js`, `texto.js`...) — renomear só gera diff.

## 1. Identidade (resumo; valores em `tema-proposto.css`)

- **Direção:** a mesa do escriba. `--mesa` é o tampo, `--pergaminho` os painéis, `--folha` a página. Tinta ferro-gálico no texto, **rubrica** só onde o manuscrito usaria vermelho: título de grupo, oficina atual, polegar do slider, marcador da régua, erro. Foco em lápis-lazúli (claro) / chama (vela) para nunca confundir com rubrica.
- **Assinatura (uma só):** a **pauta** — divisória dupla (`3px double var(--regua)`) entre grupos e a régua graduada do popover. Sem textura de papel, sem capitular, sem gradiente, sem ícones decorativos.
- **Tipografia:** EB Garamond 500 em `h1` (24px), abas e `summary` (17px, versalete, `letter-spacing .04em`). Todo o resto em `system-ui` 15px/1.45; números com `tabular-nums`; 13px para unidade, ajuda e régua. Rótulos em minúsculas como hoje; botões em frase ("Baixar G-code").
- **Espaço/raio/sombra:** base 4px (`--e1..--e6`); raio 3px (papel não é arredondado); sombra só na folha e no popover.
- **Contraste (calculado, WCAG 2.x):** texto ≥ 5,8 em toda superfície nos dois temas; borda de controle ≥ 3,2; foco ≥ 5,5. Tabela completa no cabeçalho do CSS. `--regua` é ornamento (< 3:1): nunca borda única de controle.
- **Movimento:** só `opacity .12s` no popover, dentro de `prefers-reduced-motion: no-preference`.

## 2. Shell (`index.html`)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ Scriptorium     Carta  Scroll  Grimório  Livro  Sigilos                    [ Vela ] │ <header> 56px, --pergaminho
│                 ─────  (atual: rubrica + sublinhado 2px)                            │ <nav class="oficinas"> a[href="#carta"][aria-current="page"]
├──────────────────────────┬─────────────────────────────────────────────────────────┤
│ [ Básico | Avançado ]    │ ‹ Anterior   Página 1 de 3   Próxima ›    ☐ comparar ?  │ .barra-previa
│ ════════════════════════ │                                                         │
│ ▾ Personagem             │              ┌─────────────────┐                        │
│   nome [______________]  │              │                 │  --mesa                │
│   inclinação ──●──── 12° ?│              │  .folha         │  largura máx. = papel × 4 px/mm
│   pressa     ─●───── 0,2 ?│              │  (#previa)      │                        │
│ ════════════════════════ │              │                 │                        │
│ ▸ Fontes                 │              └─────────────────┘                        │
│ ▾ Texto                  │ Erro: …  (#erro)      • avisos (#avisos)                │
│ ▸ Papel                  ├─────────────────────────────────────────────────────────┤
│ ▸ Máquina   (avançado)   │ máquina [Mega S ▾]  412 traços · 3,2 m                  │ <footer class="barra-exportar">
│  <aside> 360px, rola só  │              [Baixar SVG] [Baixar G-code] [Todas as páginas ▾] │ sticky bottom; G-code = .primario
└──────────────────────────┴─────────────────────────────────────────────────────────┘
```

- Marcação fixa (ids que os testes usam): `header`, `nav.oficinas`, `#tema` (botão `aria-pressed`), `#nivel` (dois `input[type=radio][name=nivel]`), `aside#painel`, `#previa`, `#previa-b`, `#pag-ant`, `#pag-info`, `#pag-prox`, `#comparar`, `#erro` (`role="alert"`), `#avisos`, `footer#exportar`, `dialog#editor`.
- Grupos = `<details>` com `summary`; grupo com `nivel: 'avancado'` recebe `data-nivel="avancado"` (some no Básico). Aberto por padrão: os dois primeiros de cada oficina.
- **Básico/Avançado:** `body[data-nivel]`; a regra CSS já está no tema. Padrão `basico`. Persistido com o tema em `localStorage['writer.ui'] = {tema, nivel}`.
- **Grupos por oficina:** carta/livro → Personagem, Fontes, Texto, Papel e aparência, Máquina (avançado). Scroll/grimório → Magias, Editar magia, Folha, Escrita, Máquina (avançado). Sigilos → Folha, Tradição.
- **Tela estreita (< 800px):** uma coluna na ordem cabeçalho → prévia → painel → barra de exportação (`position: sticky; bottom: 0`). `nav.oficinas` rola na horizontal (`overflow-x: auto`, sem quebrar linha). A folha ocupa 100% da largura menos 16px de cada lado. Comparar empilha as duas folhas. Popover: largura `min(320px, 100vw − 16px)`, preso à viewport. Alvos de toque 44px (`pointer: coarse`).
- `grimorio.html` inteiro: `<meta http-equiv="refresh" content="0; url=index.html#grimorio">` + `<script>location.replace('index.html#grimorio')</script>` + um link visível. Continua em `vite.config.js` (`input.grimorio`), que **não muda**.
- `<head>` do `index.html`: `preconnect` para `fonts.googleapis.com` e `fonts.gstatic.com`, o `<link>` da D1, `<title>Scriptorium — caligrafia para plotter</title>`. CSS entra por `import './tema.css'` em `app.js`.

## 3. PARAMS (módulos puros) — tarefa 12-A

### 3.1 Contrato

```js
/** @typedef {{ chave:string, grupo:string, nivel:'basico'|'avancado', tipo:'faixa'|'numero'|'opcao'|'marca',
 *   min?:number, max?:number, passo?:number, padrao:any, unidade?:string, semEscala?:boolean,
 *   opcoes?:{valor:any, rotulo:string}[], rotulo:string, ajuda:string,
 *   previa:(valor:any, ctx:Ctx) => Traco[] }} Param   // traços em mm, y para baixo, origem livre (o popover enquadra)
 * @typedef {{ fontes, mao, escrever:(mao, texto:string, opcoes?) => Traco[], papel, perfil, estilo, magia, maoArcana, indice?:number }} Ctx */
export const PARAMS = [ ... ];   // um array por módulo; chave única dentro do módulo
```
- `faixa` e `numero` exigem `min < max`, `passo > 0`, `min ≤ padrao ≤ max`. `marca`: `padrao` booleano. `opcao`: `opcoes` ≥ 2 e `padrao` entre elas.
- `previa` é pura, determinística, não lança com `ctx` completo, devolve ≥ 1 traço com ≥ 2 pontos finitos. Para `faixa`, `previa(min) ≠ previa(max)` (o controle tem de mostrar efeito).
- `semEscala: true` = desenho esquemático (o popover esconde a barra de mm).
- `escrever` (injetado) = `amostra(fontes, mao, texto, opcoes)` de `layout.js` (abaixo).

### 3.2 Onde mora cada PARAM

`src/layout.js` ganha o helper puro (a saída de `compor` não muda; goldens intactos):
```js
const FOLHA_AMOSTRA = { largura: 60, altura: 40, margens: { topo: 2, dir: 2, base: 2, esq: 2 } };
export function amostra(fontes, mao, texto, opcoes = {}) {            // Traco[] da 1ª página
  return compor(texto, fontes, mao, opcoes.pagina ?? FOLHA_AMOSTRA, { tamanho: 6, ...opcoes }).paginas[0];
}
```

| Módulo | Chaves (min..max / passo, padrão, unidade, nível) | `previa(v, ctx)` |
|---|---|---|
| `src/motor/mao.js` grupo `identidade` | `inclinacao` −30..30/0,5 `°` B · `largura` 0,5..1,5/0,01 B · `altura` idem B · `espacamento` −0,2..0,3/0,005 `em` A · `espacoPalavra` 0..0,6/0,01 `em` A · `idio` 0..1/0,01 A · `seed` numero 0..2147483647/1 A | `ctx.escrever({...ctx.mao, [chave]: v}, T)`; `T = 'minimum'`, exceto `espacoPalavra`: `'a mão viu'` |
| `mao.js` grupo `execucao` | `pressa` 0..1 B · `capricho` 0..1 B · `tremor` 0..2/0,05 `mm` B · `variacao` 0..1 B · `queda` −2..2/0,05 `mm` A · `compressao` 0,6..1,4 A · `desleixo` 0..1 A (passo 0,01 onde não dito) | idem; `queda`: `'um\ndois\ntrês'`; `variacao`: `'mmmm'`; `desleixo` e `capricho`: forçar o par (`desleixo: 1` ao variar `capricho`, `capricho: 0` ao variar `desleixo`) para o efeito aparecer |
| `mao.js` grupo `fontes` | `peso` 0..1/0,05 pad 0,5 B · `mutarForca` 0..1/0,05 pad 0,3 A · `mutarSeed` numero 0..99999/1 pad 1 A | `peso`: troca o peso de `ctx.mao.base[ctx.indice ?? 0]` por `max(0,01, v)`; mutar: `ctx.escrever(mutar(ctx.mao, seed, forca), 'minimum')` |
| `src/layout.js` grupo `aparencia` | `tamanho` 3..15/0,5 pad 6 `mm` B · `entrelinha` 1..3/0,05 pad 1,6 B · `alinhamento` opcao esquerda｜centro｜justificado B · `colunas` faixa 1..2/1 pad 1 B | `amostra(ctx.fontes, ctx.mao, T, {[chave]: v})`; `tamanho`: `'mão'`; `entrelinha`: `'uma\nduas'`; `alinhamento` e `colunas`: 3 linhas curtas com `tamanho: 3` |
| `src/materiais/documento.js` grupo `papel` | `papel` opcao (`PAPEIS` + `personalizado`) pad `A5` B · `paisagem` marca B · `largura`, `altura` 20..420/1 `mm` B · `margem` 0..30/0,5 `mm` B · `margemTopo/Dir/Base/Esq` 0..60/1 `mm` A | retângulo do papel (5 pontos) + janela útil de `ctx.perfil` (`papelMaximo`, tracejar não precisa); margens: papel + retângulo interno |
| `src/maquina/perfis.js` grupo `maquina` (tudo A, exceto `perfil` B) | `perfil` opcao megaS｜p2s｜personalizado · `zEscrita`, `zLevantada` 0..30/0,1 `mm` · `fDesenho` 300..6000/100 · `fViagem` 600..12000/100 · `fZ` 100..1500/50 `mm/min` · `offsetX`, `offsetY` −20..20/0,1 `mm` · `mesaX`, `mesaY` 100..400/1 `mm` | `perfil`/mesa: retângulo da mesa + janela. Z (`semEscala`): linha do papel + haste da caneta com a ponta em `y = −v`. F: segmento de `v/60/4` mm (percurso em 0,25 s). Offset: cruz na origem + cruz deslocada |
| `src/maquina/otimizar.js` grupo `maquina` | `otimizar` marca pad true B · `trajeto` marca pad false A | traços de `ctx.escrever(ctx.mao, 'mão viu')` + a viagem como segmentos entre fim e início, na ordem `v ? otimizar(t) : t` (`trajeto`: com e sem os segmentos) |
| `src/materiais/scroll.js` grupo `folha`/`cifrar` | `tamanho` 2..8/0,25 pad 4 `mm` B · `minimo` 1,5..5/0,25 pad 2,5 `mm` A · `entrelinha` 1,1..2,2/0,05 pad 1,5 A · `sigilo` 0..0,8/0,05 pad 0,35 B · `moldura` marca B · `completo` opcao auto｜nao｜sim B · `chave` marca B · `cifrarNome`, `cifrarFicha`, `cifrarEfeito` marcas B | letra: `ctx.escrever(ctx.mao, 'magia', {tamanho: v})`; `sigilo`: papel + `sigilo(ctx.magia, seed)` com raio `v × menor lado útil / 2`; `moldura`: papel + `moldura(ctx.papel)`; `completo`: papel + 3/6/10 pautas; cifrar/`chave`: `'magia'` na mão normal ou `ctx.escrever(ctx.maoArcana, cifrar('magia'))` |
| `src/arcano/alfabeto.js` grupos `tradicao`/`sigilo` | `seed` numero 0..99999/1 pad 1 B · `curva` 0..1/0,05 pad 0,4 B · `complexidade` 0..1/0,05 pad 0,5 B · `nivel` faixa 0..9/1 pad 1 B · `escola` opcao (8 letras de `ESCOLAS`) B · `conc`, `ritual` marcas B | tradição: letras `a b c` de `gerarAlfabeto({...ctx.estilo, [chave]: v})` lado a lado, 10 mm de altura, y invertido; sigilo: `sigilo({...ctx.magia, [chave]: v}, ctx.estilo.seed)` × 10 mm |

`padrao` da mão = `NEUTRA[chave]`; do perfil = `PERFIS.megaS[chave]`; do scroll = `CFG_PADRAO[chave]`. Textos de ajuda novos: 1–2 frases, ≤ 220 caracteres, dizer o que muda no desenho.

### 3.3 Menores do M14 absorvidos em `perfis.js`

- `PERFIS.personalizado = { ...structuredClone(megaS), nome: 'personalizado' }` (hoje é cópia rasa).
- `export function mesclarPerfil(salvo)` → `{ ...structuredClone(megaS), ...salvo, estaciona: { ...megaS.estaciona, ...salvo?.estaciona }, janela: salvo?.janela ?? null, nome: 'personalizado' }` (`janela: null` cai na mesa editável; sem `estaciona`/`trocaCaneta` não há mais TypeError).

### 3.4 Teste de contrato — `test/params.test.mjs` (node --test, sem DOM)

- **Descoberta automática:** `readdirSync('src', {recursive: true})`, ignora `ui/`, `import()` de cada `.js`, fica com os que exportam `PARAMS`. Falha se achar menos de 7 módulos.
- `ctx` de teste: 2 fontes reais de `fontes/` via `parseFonte` (as de `novoPersonagem()`), `mao = resolver(novoPersonagem())` com 2 entradas em `base`, `escrever = (m, t, o) => amostra(fontes, m, t, o)` com `fontes.arcano = gerarAlfabeto(estilo)`, `papel = papel('A5')`, `perfil = PERFIS.megaS`, `estilo = {seed: 1, curva: .4, complexidade: .5}`, `magia` fixa (id fixo, nível 3, comp `'V, S, M'`), `maoArcana` como em `ui/grimorio.js`.
- Casos, um `test` por módulo, mensagem com `modulo:chave`: (1) forma do contrato da §3.1; (2) `rotulo` e `ajuda` não vazios, `ajuda` ≤ 220; (3) `previa` nos valores `[min, padrao, max]` / cada opção / `[false, true]` devolve ≥ 1 traço válido; (4) determinismo (duas chamadas `deepEqual`); (5) `faixa`: `previa(min)` ≠ `previa(max)`; (6) chaves únicas por módulo; (7) `mesclarPerfil({})` e `mesclarPerfil({zEscrita: 5})` têm `estaciona` e `trocaCaneta` e não compartilham objeto com `PERFIS.megaS`.
- Verificação: `node --test test/params.test.mjs` e `npm test` (goldens sem diff).

## 4. `src/ui/controle.js` — tarefa 12-B

```js
export function controle(def, estado, aoMudar)  // → { el: HTMLElement, atualizar(): void }
//   estado = { ler(): valor, gravar(valor): void, ctx?(): Ctx }
export function ligar(alvo, chave, ctx)         // → estado; alvo = objeto ou () => objeto; lê/grava alvo[chave]
export function dica(texto)                     // → <button class="dica">?</button> que mostra só o texto no mesmo popover
```
- **Marcação** (id com contador, pois a mesma chave pode repetir — ex.: `peso`):
  ```html
  <div class="controle" data-chave="inclinacao" data-nivel="basico">
    <label for="c-inclinacao-3">inclinação (graus)</label>
    <input id="c-inclinacao-3" type="range" min="-30" max="30" step="0.5" aria-describedby="c-inclinacao-3-ajuda">
    <output for="c-inclinacao-3">12 °</output>
    <button type="button" class="dica" aria-label="Ajuda: inclinação (graus)">?</button>
    <span id="c-inclinacao-3-ajuda" class="so-leitor">Inclina as letras…</span>
  </div>
  ```
  `numero` → `input[type=number]` (sem `output`); `opcao` → `select`; `marca` → `input[type=checkbox]` antes do rótulo. Grade: `rótulo 1fr · controle 1,3fr · valor 4em · ? 20px`.
- `input`/`change` → valida (`numero`/`faixa`: ignora vazio/NaN, prende em `[min, max]`, arredonda ao `passo`; inteiro quando `passo` é inteiro — cobre "validar `colunas` ≥ 1 inteiro") → `estado.gravar(v)` → `aoMudar()`.
- `atualizar()`: ressincroniza do `estado.ler()` sem mexer no elemento em foco; `output` = valor com vírgula decimal + `unidade`.
- **Popover único:** um `<div id="previa-viva" popover="manual" role="tooltip">` criado na primeira abertura e reaproveitado. Abre em `pointerenter`, `focusin` e `input` da linha, e no clique do "?"; fecha em `pointerleave` (se o foco não estiver na linha), `focusout`, `Escape`, `scroll` e `resize`. Conteúdo redesenhado em `requestAnimationFrame` (no máximo 1 por quadro).
- **Posição:** `position: fixed; inset: auto; margin: 0`. `x` = polegar (`rect.left + (v − min)/(max − min) × rect.width`; centro do controle para os outros tipos) − metade da largura; `y` = acima da linha com 8px de folga, abaixo se não couber; tudo preso a 8px da viewport.
- **Conteúdo** (largura 320px, fundo `--campo`, borda `--contorno`, `--sombra-pop`):
  ```
  ┌──────────────────────────────────────┐
  │ inclinação                      12 ° │  rótulo + valor (tabular)
  │ ┌──────────────────────────────────┐ │  mini-folha (--folha), svg 288×104
  │ │   fantasma mín · AMOSTRA · máx   │ │  atual: --tinta-folha 1,5px; fantasmas: --fantasma-folha 1px, sobrepostos
  │ │ ├────┤ 10 mm                     │ │  barra de escala, canto inferior esquerdo
  │ └──────────────────────────────────┘ │
  │ −30 ├──────┼─────▼────────────┤ 30 ° │  régua: mín, traço do padrão, marcador do valor em --rubrica, máx, unidade
  │           padrão 0                   │
  │ Inclina as letras, de −30 a 30…      │  def.ajuda em --tinta-2, 13px
  └──────────────────────────────────────┘
  ```
  - Escala única: caixa que envolve atual + fantasmas, com 1 mm de folga, ajustada a 288×104 preservando proporção. Barra = maior entre 1, 10, 100 mm que ocupe ≤ 40% da largura, rotulada com o valor real; oculta com `semEscala`.
  - Fantasmas (`previa(min)`, `previa(max)`) calculados uma vez ao abrir; só o atual é recalculado no `input`. Régua e fantasmas só em `faixa`.
  - `opcao`: uma mini-folha por opção em grade (até 4 por linha), rótulo embaixo, a atual com contorno `--rubrica` 2px. `marca`: duas mini-folhas, "desligado" e "ligado". `numero`: só a amostra atual.
  - `previa` que lança → popover mostra só rótulo, valor e ajuda (nunca quebra o controle). `svg` com `aria-hidden="true"`; a ajuda chega ao leitor de tela pelo `aria-describedby`.
- **`src/ui/tema.css`:** cópia de `tema-proposto.css` + estilos de `.controle`, `.dica`, `#previa-viva`, shell (grade `360px minmax(0, 1fr)`, cabeçalho, `nav.oficinas`, `#nivel` segmentado, `footer#exportar`, bloco `@media (max-width: 800px)` da §2), `dialog`, `.linha-botoes`, `.achados`, `.selecionadas`, `.tela` (regras hoje em `grimorio.html`, trocando cores fixas por tokens). Só tokens: nenhum hex fora do `:root`.
- **Bancada de teste:** `e2e/controle.html` (importa `tema.css` e `controle.js`; monta 4 defs falsas, uma de cada `tipo`, com `previa` trivial) e `e2e/controle.spec.js`: (1) foco no range abre `#previa-viva` com ≥ 3 `path` (atual + 2 fantasmas), texto do mín, do máx, "padrão" e "10 mm"; (2) `fill`/seta muda o `output` e chama `gravar`; (3) passar por dois controles deixa um único `[popover]` no DOM; (4) `Escape` fecha; (5) select mostra uma miniatura por opção; (6) `previa` que lança não gera erro de console; (7) popover dentro da viewport a 375px de largura. Verificação: `npx playwright test e2e/controle.spec.js`.

## 5. `svgDocumento` — tarefa 12-C (`src/maquina/gcode.js`)

```js
export function svgDocumento(pagina, papel, canetas = {}, { camadas, trajeto = false } = {})  // → string SVG
```
- Um `<g data-camada="id" stroke="cor">` por camada (filtradas por `camadas`, como em `gcodeDocumento`); cor = `canetas[c.caneta]?.cor ?? '#000'`, `stroke-width` = `espessura ?? 0.3`. `trajeto` reusa o desenho de viagem do `svg()` atual sobre os traços na ordem das camadas. `svg()` e `gcode()` antigos **não mudam** (goldens).
- `test/svg-documento.test.mjs`: 2 camadas com canetas de cores diferentes → 2 grupos com as cores; filtro `camadas: ['notas']` → 1 grupo; traço com 1 ponto é descartado; `viewBox` = papel; `id` com `"`/`<` sai escapado; 1 camada preta sem trajeto tem os mesmos `d` de `svg()`.

## 6. `src/ui/app.js` e `src/ui/previa.js` — tarefa 13-A

```js
// previa.js
export function desenhar(el, doc, { pagina = 0, trajeto = false, otimizar: opt = true } = {})
//   el.innerHTML = svgDocumento(...) da página (camada passa por otimizar() quando trajeto && opt, respeitando camada.ordem);
//   el.style.maxWidth = `${doc.papel.largura * 4}px`; página inexistente → folha vazia.
export function listar(ul, itens)        // <li> por aviso (textContent), como hoje

// app.js
const OFICINAS = { carta: 'escrita', livro: 'escrita', scroll: 'grimorio', grimorio: 'grimorio', sigilos: 'sigilos' };
const COMPARTILHADAS = ['fontes', 'nomesFontes', 'personagem', 'variacao', 'perfilNome', 'perfil', 'otimizar', 'trajeto'];
// instância = { estado, grupos: [{ titulo, nivel?, montar(el, estado, aoMudar) → atualizar }],
//               entrar(oficina), compor() → { paginas: Traco[][], avisos: string[] }, barra: montarBarra }
```
- **Roteamento:** `hashchange` + carga inicial. Hash vazio ou desconhecido → `location.replace('#carta')`. Ao trocar: copia `COMPARTILHADAS` da instância que sai para a que entra (`// ponytail: cópia na troca; store único se duas oficinas ficarem visíveis juntas`), chama `entrar(oficina)`, mostra os grupos da instância (montados uma vez, alternados por `hidden`), marca `aria-current`, ajusta `document.title`, zera `paginaAtual`, renderiza.
- **Render** (um por quadro, como o `aoMudar` atual): `r = inst.compor()` em `try` (erro → `#erro` = `Erro: mensagem`, mantém a última prévia) → `doc = deTracos(r.paginas, estado.pagina, { avisos: r.avisos })` → `desenhar` (+ variação B se `comparar`, só em carta/livro) → paginação → `#avisos` (sem "tolerancia de limites") → `atualizar()` de cada grupo e da barra.
- **Instância `escrita`:** estado e `compor` saem do `<script>` do `index.html` atual. `entrar('carta')` põe `opcoes.colunas = 1`; `entrar('livro')` põe `opcoes.colunas = estado.colunasLivro ?? 2` e mostra o controle `colunas`.
- **Instância `grimorio`:** `criar()` de `ui/grimorio.js` (tarefa 13-C). `entrar('scroll')` → `cfg.porPagina = true`; `entrar('grimorio')` → `false`.
- **Instância `sigilos`** (dentro de `app.js`, ≤ 40 linhas): grupos Folha (`papel`, `paisagem`) e Tradição (`seed`, `curva`, `complexidade`); `compor` = `moldura(papel)` + um `sigilo(magiaExemplo, seed)` no centro; aviso fixo "Folha de sigilos completa chega no M19–M20."
- **Fontes:** carrega as 43 uma vez, como o `index.html` atual; falha → `#erro`.
- **localStorage:** `writer.personagem`, `writer.personagens` e `grimorio.estado` continuam lidos e gravados pelos mesmos módulos, mesmas chaves e formato. Novas: `writer.ui` (`{tema, nivel}`) e `writer.perfil` (perfil personalizado, lido com `mesclarPerfil`). Leitura sempre em `try/catch`.
- **Tema:** `#tema` alterna `html[data-tema]` entre `claro` e `vela` partindo do tema efetivo (`matchMedia`); sem valor salvo, nenhum atributo (segue o sistema — é o que os projetos do Playwright exercitam).

### 6.1 `e2e/smoke.spec.js` e `e2e/visual.spec.js` (mesma tarefa)

- `smoke`: `index.html` abre sem erro de console e com `#previa svg path`; `grimorio.html` termina em `index.html#grimorio`; hash inválido cai em `#carta`; com `writer.personagens = {"Teste": <novoPersonagem>}` semeado por `addInitScript`, "Teste" aparece no select de salvos; alternar Avançado mostra `[data-chave="espacamento"]`, Básico esconde. Só no `smoke`: `page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }))` (determinismo, roda sem rede); o `visual` deixa a fonte web carregar.
- `visual` (roda nos projetos `claro` e `vela`), para cada oficina: `goto('index.html#' + id)`, espera `#previa svg`, `await page.evaluate(() => document.fonts.ready)`, **screenshot** `fullPage` em `testInfo.outputPath(id + '.png')` + `testInfo.attach`. Mais um com Avançado ligado e o popover aberto (foco no primeiro range de `#carta`) e um a 375×812.
- **Contraste AA sem lib** — função de ~20 linhas dentro de `page.evaluate`:
  1. `lum(rgb)` e `razao(a, b)` pela fórmula WCAG 2.x; cor lida de `getComputedStyle` (`rgb()`/`rgba()`; `light-dark()` já chega resolvido).
  2. Fundo efetivo = primeiro ancestral com `background-color` de alfa 1.
  3. Texto ≥ **4,5**: `h1`, `nav.oficinas a`, `summary`, `.controle label`, `.controle output`, `button`, `select`, `#pag-info`, `#avisos li` e o texto de ajuda do popover aberto. Todos os elementos visíveis de cada seletor.
  4. Não-texto ≥ **3**: `border-color` de `select`, `input[type=number]`, `textarea`, `button` contra o fundo do pai; `outline-color` do elemento focado (depois de `Tab`) contra o fundo.
  5. Falha lista `seletor: razão` de cada reprovado. Roda uma vez por tema em `#carta` (Avançado) e em `#grimorio`.
- Verificação: `npm run e2e`; screenshots em `test-results/`.

## 7. Migração dos painéis — tarefas 13-B e 13-C

Regra geral: a assinatura `montar(elemento, estado, aoMudar) → atualizar` **não muda**. Todo `input[type=range|number|checkbox]` e `select` de parâmetro vira `controle(P.chave, ligar(...), aoMudar)`, com o `PARAM` importado do módulo dono (§3.2) e indexado por chave (`const P = Object.fromEntries(PARAMS.map((p) => [p.chave, p]))`). Todo `ajuda(chave)` restante vira `dica(AJUDA[chave])`. `atualizar` chama o `atualizar()` de cada controle. Nenhum `style` com cor fixa.

- **13-B** (`personagem.js`, `fontes.js`, `catalogo.js`, `src/ajuda.js`, `test/ajuda.test.mjs`)
  - `personagem.js`: identidade → `ligar(() => estado.personagem.mao, chave, ctx)`; execução → `{ ler: () => resolver(p, variacao)[chave], gravar: (v) => ajustarVariacao(...), ctx }`. `ctx = () => ({ fontes: estado.fontes, mao: resolver(estado.personagem, estado.variacao || null), escrever: (m, t, o) => amostra(estado.fontes, m, t, o) })`. `restaurar`, salvos e chaves `writer.*` sem alteração.
  - `fontes.js`: `peso` por linha com `ctx.indice = i`; `seed`, `mutarSeed`, `mutarForca` por `controle`. `catalogo.js`: só `ajuda` → `dica` e cores do `<style>` por tokens.
  - `src/ajuda.js`: remove `ajuda()` e o comentário sobre `document`; `test/ajuda.test.mjs`: tira o import e o caso de `ajuda()`, mantém o resto.
- **13-C** (`texto.js`, `exportar.js`, `grimorio.js`)
  - `texto.js`: papel por `PARAMS` de `documento.js` (`papel`, `paisagem`, `largura`, `altura`, 4 margens) no lugar de `PAGINAS`; `estado.pagina = papel(nome, {...})`; `tamanho`, `entrelinha`, `alinhamento`, `colunas` (este com `hidden` quando `opcoes.colunas === 1` e a oficina é carta — `app.js` chama `atualizar`). Estado salvo antigo com `paginaNome: 'mesa'|'personalizada'` → trata como `personalizado` com as medidas atuais.
  - `exportar.js`: exporta `montar` (grupo Máquina: PARAMS de `perfis.js` + `otimizar` + `trajeto` + `header`/`footer` em `textarea` mono + "Restaurar perfil") e **`montarBarra(el, estado, aoMudar) → atualizar`** (select `perfil`, resumo "N traços · X m", botões). Trocar `perfil` → `estado.perfil = structuredClone(PERFIS[nome])` (ou `mesclarPerfil(salvo)` no personalizado); editar qualquer campo → vira `personalizado` e grava `writer.perfil`. G-code por `gcodeDocumento` (D8) em `try/catch`: erro ou (`perfil.experimental` e algum aviso "fora da janela") → botões de G-code `disabled` e motivo em `.erro` na barra. SVG por `svgDocumento`.
  - `grimorio.js`: sai `iniciar()`/`renderizar()`/`$('previa')`; entra `export function criar() → instância` (§6) com o mesmo `estado`, `CHAVE = 'grimorio.estado'` e `salvar()` dentro de `compor`. `painelFolha`/`painelEscrita` usam PARAMS de `scroll.js`, `documento.js` (opções de `papel` filtradas por `FOLHAS`) e `alfabeto.js`; `painelEditar` usa `nivel`, `escola`, `conc`, `ritual`. `ctx` como em `contexto()` + `papel`, `estilo`, `magia = selecionadas[atual] ?? magiaVazia()`, `escrever`. O link "Criar ou editar personagens" aponta para `#carta`. Editor de símbolos (`dialog#editor`) fica igual.
- Casos de teste das duas: não há teste de unidade novo (DOM); a prova é `npm test` verde, `npm run build` sem import quebrado e `npm run e2e` (smoke + visual + controle) verde nos dois temas.

## 8. Tarefas e ordem

| Ciclo | Tarefa | Modelo | Arquivos (só estes) | Verificação |
|---|---|---|---|---|
| 12 | **12-A** PARAMS + contrato (§3) | sonnet | `src/motor/mao.js`, `src/layout.js`, `src/materiais/documento.js`, `src/maquina/perfis.js`, `src/maquina/otimizar.js`, `src/materiais/scroll.js`, `src/arcano/alfabeto.js`, `test/params.test.mjs` | `node --test test/params.test.mjs`; `npm test` sem diff de golden |
| 12 | **12-B** controle + tema (§4) | sonnet | `src/ui/controle.js`, `src/ui/tema.css`, `e2e/controle.html`, `e2e/controle.spec.js` | `npx playwright test e2e/controle.spec.js` |
| 12 | **12-C** `svgDocumento` (§5) | haiku | `src/maquina/gcode.js`, `test/svg-documento.test.mjs` | `node --test test/svg-documento.test.mjs`; `npm test` |
| 13 | **13-A** shell (§2, §6) | sonnet | `index.html`, `grimorio.html`, `src/ui/app.js`, `src/ui/previa.js`, `e2e/smoke.spec.js`, `e2e/visual.spec.js` | `npm run build`; `npm run e2e` (depende de 13-B e 13-C: rodar no fim do ciclo) |
| 13 | **13-B** painéis da mão (§7) | haiku | `src/ui/personagem.js`, `src/ui/fontes.js`, `src/ui/catalogo.js`, `src/ajuda.js`, `test/ajuda.test.mjs` | `npm test`; `npx vite build` |
| 13 | **13-C** texto, exportação, grimório (§7) | sonnet | `src/ui/texto.js`, `src/ui/exportar.js`, `src/ui/grimorio.js` | `npm test`; `npx vite build` |

Ordem: ciclo 12 inteiro em paralelo (12-B só precisa do contrato da §3.1, não do código de 12-A) → gate `npm test` + `controle.spec` → ciclo 13 inteiro em paralelo, contra os contratos das §6 e §7 → gates do §5.2 da EXPANSAO → screenshots → **PARADA para o usuário**. Durante o ciclo 13 o app fica quebrado até as três tarefas entrarem; o gate é do ciclo, não da tarefa.

## 9. Riscos

1. **Integração do ciclo 13 só fecha no fim** (shell × `criar()` × `montarBarra`). Mitigação: assinaturas desta spec copiadas literalmente para os três briefs; se o gate falhar, um ciclo de correção só com `app.js`.
2. **D8 muda comportamento** (A4 na Mega S bloqueia o G-code). Mostrar ao usuário na parada; se ele quiser o aviso antigo, é uma linha em `exportar.js`.
3. **Fonte web sem rede**: título cai para Palatino/Georgia; screenshots de aprovação devem ser tirados com rede. `smoke` roda sem rede por causa do `route.fulfill`.
4. **Desempenho do popover**: 3 `compor` ao abrir, 1 por `input`; `amostra` usa folha 60×40 mm (sub-milissegundo). Se engasgar com 3 fontes misturadas, cachear por valor.
5. **`previa(min) ≠ previa(max)`** pode falhar em parâmetro que só age com outro ligado (`capricho`/`desleixo`): o par forçado da §3.2 resolve; não afrouxar o teste.
6. **Popover sobre `dialog` modal** (catálogo, editor): `showPopover()` depois do `showModal()` fica por cima; conferir no gate do navegador.
7. **Haiku na 13-B**: brief precisa de um antes/depois literal do `slider()` de `personagem.js`.

## 10. Não fazer (extras → `QUADRO.md`)

- Sem dependência nova, sem `@fontsource`, sem woff2 no repo, sem ícones, sem textura/ornamento, sem animação além do `opacity` do popover.
- Não tocar `compor`, `glifo`, `gcode()`, `svg()`, `sigilo()`, `comporGrimorio` nem os goldens; nada de `npm run golden`.
- Não renomear chaves `writer.*`/`grimorio.estado`, não migrar formato de personagem.
- Não criar materiais novos (carta/livro/sigilos reais são M20), nem camadas/canetas na UI, nem exportar por camada (a API já existe; a UI é M20).
- Não reescrever o catálogo de fontes nem o editor de símbolos; só tokens e `dica`.
- Para o QUADRO: auto-hospedar EB Garamond (offline real); campo numérico ao lado do range para Z/F; store único de estado; papel girado em `cabeNaMaquina`; baseline visual com `toHaveScreenshot`; atualizar `test/ui-smoke.md` e README (M21); limpar unidades duplicadas em `ROTULOS` ("(mm)" + `unidade`).
