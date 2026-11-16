# Ciclo 12 — M15 (Identidade + oficinas), parte 1: contratos e peças puras

Spec: `workflow/ciclos/12/projeto.md` (§3, §4, §5). Tokens: `workflow/ciclos/12/tema-proposto.css`. Contrato do marco: `workflow/EXPANSAO.md` §4.1, §4.4, §4.7 (M15). Estado de partida: `npm test` = 126/126. O ciclo 12 não muda o app que o usuário vê (o `index.html` continua o antigo até o ciclo 13).

Arquivos por tarefa (disjuntos): 12-A = `src/motor/mao.js`, `src/layout.js`, `src/materiais/documento.js`, `src/maquina/perfis.js`, `src/maquina/otimizar.js`, `src/materiais/scroll.js`, `src/arcano/alfabeto.js`, `test/params.test.mjs` · 12-B = `src/ui/controle.js`, `src/ui/tema.css`, `e2e/controle.html`, `e2e/controle.spec.js` · 12-C = `src/maquina/gcode.js`, `test/svg-documento.test.mjs`.

---

## Tarefa 12-A

modelo: sonnet

**Regras comuns (valem para esta tarefa, além de `workflow/WORKER.md`)**
- Raiz: `C:\Users\augus\Desktop\augusto\projects\3dprinter_plotter`. Escreva **só** nos arquivos da linha "Arquivos"; ler qualquer arquivo é livre. As outras tarefas do ciclo rodam em paralelo nos outros arquivos: não os toque (nem para "arrumar um import").
- **Goldens intactos:** `test/golden.test.mjs` e o `.snapshot` nunca mudam. **Nunca** rode `--test-update-snapshots` nem `npm run golden`. Se um golden falhar depois do seu código, você alterou a saída de `compor`, `svg`, `gcode`, `sigilo` ou `comporGrimorio`: desfaça. Não renomeie nem mude a assinatura de nada que já é exportado.
- **Sem dependência nova:** `package.json`/`package-lock.json` não mudam; não rode `npm install`. Só o que já está instalado (`hachure-fill`, `vite`, `@playwright/test`).
- **localStorage:** as chaves `writer.personagem`, `writer.personagens` e `grimorio.estado` mantêm nome e formato. Toda leitura em `try/catch`.
- Sem commit. Textos de interface em pt-BR. DOM só dentro de `src/ui/`.
- Resposta final: até 10 linhas (arquivos, saída `# pass`/`# fail`, dúvidas).

**Arquivos (só estes):** `src/motor/mao.js`, `src/layout.js`, `src/materiais/documento.js`, `src/maquina/perfis.js`, `src/maquina/otimizar.js`, `src/materiais/scroll.js`, `src/arcano/alfabeto.js`, `test/params.test.mjs` (novo). Nada de `src/ui/`, `src/ajuda.js` (só leitura), `src/maquina/gcode.js`.

**Objetivo:** cada módulo passa a exportar `export const PARAMS = [...]` descrevendo seus parâmetros editáveis, cada um com uma `previa(valor, ctx)` pura que devolve traços em mm para o popover de prévia viva (o controle é a tarefa 12-B). Mais: o helper `amostra` em `layout.js`, `mesclarPerfil` em `perfis.js` e o teste de contrato.

### Contrato de um `Param`
```js
/** @typedef {{ chave:string, grupo:string, nivel:'basico'|'avancado', tipo:'faixa'|'numero'|'opcao'|'marca',
 *   min?:number, max?:number, passo?:number, padrao:any, unidade?:string, semEscala?:boolean,
 *   opcoes?:{valor:any, rotulo:string}[], rotulo:string, ajuda:string,
 *   previa:(valor:any, ctx:Ctx) => Traco[] }} Param   // Traco = [[x,y],...] em mm, y para baixo, origem livre
 * @typedef {{ fontes, mao, escrever:(mao, texto:string, opcoes?) => Traco[], papel, perfil, estilo, magia, maoArcana, indice?:number }} Ctx */
```
- `faixa` e `numero`: `min < max`, `passo > 0`, `min ≤ padrao ≤ max`. `marca`: `padrao` booleano. `opcao`: `opcoes` com ≥ 2 itens e `padrao` entre os `valor`.
- `previa`: pura, determinística, **não lança** com um `ctx` completo, devolve ≥ 1 traço com ≥ 2 pontos finitos. Para `faixa`, `previa(min)` tem de ser diferente de `previa(max)` (o controle precisa mostrar efeito). Ela **não** importa `compor`: usa só `ctx.escrever` (injetado) — `layout.js` importa `mao.js`, o inverso daria ciclo.
- `semEscala: true` marca desenho esquemático (o popover esconde a barra de mm). Use onde o desenho não é em mm reais (pautas do `completo`, haste da caneta em Z).
- `rotulo` e `ajuda`: se a chave existir em `ROTULOS`/`AJUDA` de `src/ajuda.js` **com o mesmo significado**, use `ROTULOS[k]`/`AJUDA[k]` (`import { ROTULOS, AJUDA } from '../ajuda.js'`; esse arquivo não tem DOM no topo e roda no Node). Mapeamentos: documento `papel`→`pagina`, `largura`→`larguraPagina`, `altura`→`alturaPagina`; `margemTopo/Dir/Base/Esq` são iguais. Onde não existir (ex.: `perfil`, `paisagem`, `margem`, `colunas`, `trajeto`, `minimo`, `moldura`, `completo`, `chave`, `cifrar*`, `escola`, `nivel`, `conc`, `ritual`, `curva`, `complexidade`) **ou** o significado for outro (`tamanho`/`entrelinha` do scroll, `seed` do alfabeto), escreva texto literal em pt-BR: rótulo curto e minúsculo, ajuda de 1–2 frases com ≤ 220 caracteres dizendo o que muda no desenho. Confira com `grep -n "^  [a-zA-Z]*:" src/ajuda.js`.
- `padrao`: mão = `NEUTRA[chave]` (export de `mao.js`); perfil = `PERFIS.megaS[chave]`; scroll = `CFG_PADRAO[chave]` (`CFG_PADRAO.cifrar.nome` etc.).

Exemplo real (começo de `mao.js`, grupo identidade):
```js
import { ROTULOS, AJUDA } from '../ajuda.js';
const viaMao = (chave, texto = 'minimum', extra = {}) => (v, ctx) => ctx.escrever({ ...ctx.mao, ...extra, [chave]: v }, texto);
export const PARAMS = [
  { chave: 'inclinacao', grupo: 'identidade', nivel: 'basico', tipo: 'faixa', min: -30, max: 30, passo: 0.5,
    padrao: NEUTRA.inclinacao, unidade: '°', rotulo: ROTULOS.inclinacao, ajuda: AJUDA.inclinacao, previa: viaMao('inclinacao') },
  // ...
];
```

### Tabela de PARAMS (valores exatos; passo 0,01 onde não dito; B = `basico`, A = `avancado`)

**`src/motor/mao.js`** — texto da prévia `'minimum'` salvo indicação; via `ctx.escrever({...ctx.mao, [chave]: v}, texto)`.
- grupo `identidade`: `inclinacao` −30..30/0,5 `°` B · `largura` 0,5..1,5 B · `altura` 0,5..1,5 B · `espacamento` −0,2..0,3/0,005 `em` A · `espacoPalavra` 0..0,6 `em` A (texto `'a mão viu'`) · `idio` 0..1 A · `seed` **numero** 0..2147483647/1 A (para o efeito aparecer, force `idio: Math.max(ctx.mao.idio, 0.5)` na prévia).
- grupo `execucao`: `pressa` 0..1 B · `capricho` 0..1 B · `tremor` 0..2/0,05 `mm` B · `variacao` 0..1 B (texto `'mmmm'`) · `queda` −2..2/0,05 `mm` A (texto `'um\ndois\ntrês'`) · `compressao` 0,6..1,4 A · `desleixo` 0..1 A. Forçar o par para o efeito aparecer: ao variar `capricho` use `desleixo: 1`; ao variar `desleixo` use `capricho: 0` (senão `amp = desleixo*0.03*(1-capricho)` zera e `previa(min)` = `previa(max)`).
- grupo `fontes`: `peso` faixa 0..1/0,05 padrão 0,5 B (troca o `peso` de `ctx.mao.base[ctx.indice ?? 0]` por `Math.max(0.01, v)` numa cópia `structuredClone`; só mostra diferença com ≥ 2 entradas em `base` — é o esperado) · `mutarForca` faixa 0..1/0,05 padrão 0,3 A · `mutarSeed` numero 0..99999/1 padrão 1 A. Mutar: `ctx.escrever(mutar(ctx.mao, seed, forca), 'minimum')` (`mutar` já está em `mao.js`; `mutarForca` usa seed 1, `mutarSeed` usa força 0,3).

**`src/layout.js`** — acrescente (não mexe em `compor`):
```js
const FOLHA_AMOSTRA = { largura: 60, altura: 40, margens: { topo: 2, dir: 2, base: 2, esq: 2 } };
export function amostra(fontes, mao, texto, opcoes = {}) {            // Traco[] da 1ª página
  return compor(texto, fontes, mao, opcoes.pagina ?? FOLHA_AMOSTRA, { tamanho: 6, ...opcoes }).paginas[0];
}
```
grupo `aparencia`: `tamanho` 3..15/0,5 padrão 6 `mm` B (texto `'mão'`) · `entrelinha` 1..3/0,05 padrão 1,6 B (texto `'uma\nduas'`) · `alinhamento` opcao `esquerda|centro|justificado` padrão `esquerda` B (3 linhas curtas, `tamanho: 3`; escolha um texto em que justificado ≠ centro) · `colunas` faixa 1..2/1 padrão 1 B (3 linhas curtas, `tamanho: 3`; escolha um texto em que 1 e 2 colunas dão desenhos diferentes). Prévia: `amostra(ctx.fontes, ctx.mao, texto, { [chave]: v, ... })`. Se a fonte de teste não tiver um glifo do texto (`ã`, `ê`), troque por ASCII equivalente e diga na resposta.

**`src/materiais/documento.js`** — grupo `papel`: `papel` opcao (`Object.keys(PAPEIS)` + `'personalizado'`, rótulo = a própria chave) padrão `A5` B · `paisagem` marca padrão false B · `largura`, `altura` faixa 20..420/1 `mm` B (padrão 148 e 210) · `margem` 0..30/0,5 `mm` B (padrão 12) · `margemTopo/Dir/Base/Esq` 0..60/1 `mm` A (padrão 12). Prévia = retângulo do papel como traço de 5 pontos (`papel(v, …)`; `'personalizado'` usa `ctx.papel.largura/altura`) **mais** a janela útil de `ctx.perfil` (`papelMaximo(ctx.perfil)`, de `perfis.js`) como segundo retângulo; margens: retângulo do papel + retângulo interno.

**`src/maquina/perfis.js`** — grupo `maquina` (A, salvo `perfil` B): `perfil` opcao `megaS|p2s|personalizado` (retângulo da mesa e da janela de `PERFIS[v]`) · `zEscrita`, `zLevantada` 0..30/0,1 `mm` (`semEscala: true`: linha do papel + haste da caneta com a ponta em `y = −v`) · `fDesenho` 300..6000/100 · `fViagem` 600..12000/100 · `fZ` 100..1500/50, todos `mm/min` (segmento horizontal de `v/60/4` mm = percurso em 0,25 s) · `offsetX`, `offsetY` −20..20/0,1 `mm` (cruz na origem + cruz deslocada) · `mesaX`, `mesaY` 100..400/1 `mm` (retângulo da mesa + janela útil).
Menores do M14, mesmo arquivo: `PERFIS.personalizado = { ...structuredClone(megaS), nome: 'personalizado' }` (hoje é cópia rasa; hoje a linha é `personalizado: { ...megaS, nome: 'personalizado' }`) e
```js
export function mesclarPerfil(salvo) {
  return { ...structuredClone(megaS), ...salvo, estaciona: { ...megaS.estaciona, ...salvo?.estaciona }, janela: salvo?.janela ?? null, nome: 'personalizado' };
}
```
(`janela: null` cai na mesa editável; sem `estaciona`/`trocaCaneta` não há mais TypeError em `gcodeDocumento`.)

**`src/maquina/otimizar.js`** — grupo `maquina`: `otimizar` marca padrão true B · `trajeto` marca padrão false A. Prévia: traços de `ctx.escrever(ctx.mao, 'mão viu')` na ordem `v ? otimizar(t) : t` mais a viagem como segmentos de 2 pontos entre o fim de cada traço e o início do seguinte (começando em `[0,0]`). `trajeto`: com viagem (`true`) e sem (`false`), sempre na ordem otimizada.

**`src/materiais/scroll.js`** — grupos `folha`/`cifrar`: `tamanho` 2..8/0,25 padrão 4 `mm` B (letra: `ctx.escrever(ctx.mao, 'magia', { tamanho: v })`) · `minimo` 1,5..5/0,25 padrão 2,5 `mm` A · `entrelinha` 1,1..2,2/0,05 padrão 1,5 A · `sigilo` 0..0,8/0,05 padrão 0,35 B (papel + `sigilo(ctx.magia, ctx.estilo.seed)` escalado ao raio `v × menor lado útil / 2`, centrado; com `v = 0` ainda devolve o retângulo do papel) · `moldura` marca B (papel + `moldura(ctx.papel)`) · `completo` opcao `auto|nao|sim` B (`semEscala: true`; papel + 3/6/10 pautas horizontais) · `chave` marca B · `cifrarNome`, `cifrarFicha`, `cifrarEfeito` marcas B (`'magia'` na mão normal quando false; `ctx.escrever(ctx.maoArcana, cifrar('magia'))` quando true). `sigilo`, `moldura`, `cifrar` já estão importados nesse arquivo.

**`src/arcano/alfabeto.js`** — grupo `tradicao`: `seed` numero 0..99999/1 padrão 1 B · `curva` 0..1/0,05 padrão 0,4 B · `complexidade` 0..1/0,05 padrão 0,5 B (letras `a`,`b`,`c` de `gerarAlfabeto({ ...ctx.estilo, [chave]: v })` lado a lado, altura 10 mm, avanço por `adv`, y invertido: o glifo tem y para cima na caixa `CAIXA` 500×700). Grupo `sigilo`: `nivel` faixa 0..9/1 padrão 1 B · `escola` opcao (as 8 chaves de `ESCOLAS` de `src/magia.js`, rótulo = nome da escola; se importar `magia.js` criar ciclo, inline a lista) padrão `V` B · `conc`, `ritual` marcas B. Prévia: `sigilo({ ...ctx.magia, [chave]: v }, ctx.estilo.seed)` escalado para raio 10 mm (o sigilo vem em [−1,1], y para baixo).

### Teste de contrato `test/params.test.mjs` (node --test, sem DOM)
- **Descoberta automática:** `readdirSync(new URL('../src/', import.meta.url), { recursive: true })`; ignore caminhos dentro de `ui/` (no Windows vêm com `\`); `import()` de cada `.js`; fique com os que exportam `PARAMS`; **falha se achar menos de 7 módulos** (mao, layout, documento, perfis, otimizar, scroll, alfabeto).
- `ctx` de teste:
```js
const lerFonte = (n) => parseFonte(readFileSync(new URL(`../fontes/${n}.svg`, import.meta.url), 'utf8'), n);
const p = novoPersonagem(); p.mao.base = [{ fonte: 'EMSDelight', peso: 0.5 }, { fonte: 'EMSAllure', peso: 0.5 }];   // 2 entradas: peso precisa mostrar efeito
const estilo = { seed: 1, curva: 0.4, complexidade: 0.5 };
const fontes = { EMSDelight: lerFonte('EMSDelight'), EMSAllure: lerFonte('EMSAllure'), arcano: gerarAlfabeto(estilo) };
const ctx = { fontes, mao: resolver(p, null), escrever: (m, t, o) => amostra(fontes, m, t, o), papel: fabricaPapel('A5'), perfil: PERFIS.megaS, estilo,
  magia: { ...magiaVazia(), id: 'm-teste', nome: 'Teste', nivel: 3, comp: 'V, S, M' },
  maoArcana: { ...NEUTRA, base: [{ fonte: 'arcano', peso: 1 }], seed: estilo.seed } };   // igual a contexto() em src/ui/grimorio.js
```
  (imports: `parseFonte` de `src/fonte.js`, `resolver`/`novoPersonagem` de `src/personagem.js`, `NEUTRA` de `mao.js`, `amostra` de `layout.js`, `papel as fabricaPapel` de `documento.js`, `PERFIS`/`mesclarPerfil` de `perfis.js`, `gerarAlfabeto` de `alfabeto.js`, `magiaVazia` de `src/magia.js`.)
- Um `test` por módulo, mensagens com `modulo:chave` (caminho relativo do módulo). Casos: (1) forma do contrato acima; (2) `rotulo`/`ajuda` não vazios e `ajuda.length ≤ 220`; (3) `previa` nos valores `[min, padrao, max]` (faixa/numero), em cada `opcoes[].valor`, em `[false, true]` (marca) devolve ≥ 1 traço com ≥ 2 pontos finitos; (4) determinismo: duas chamadas dão `deepEqual`; (5) `faixa`: `notDeepEqual(previa(min), previa(max))`; (6) chaves únicas dentro do módulo; (7) `mesclarPerfil({})` e `mesclarPerfil({ zEscrita: 5 })` têm `estaciona` e `trocaCaneta`, `zEscrita` 5 no segundo, e nenhum objeto interno é o mesmo de `PERFIS.megaS` (`!==`); `PERFIS.personalizado.estaciona !== PERFIS.megaS.estaciona`.
- Não afrouxe o caso (5): se `previa(min)` = `previa(max)`, mude a prévia (texto, par forçado), não o teste.

**Verificação:** `node --test test/params.test.mjs`, depois `npm test` inteiro (126 anteriores + os novos; goldens sem diff) e `npx vite build` (nenhum import quebrado).

**NÃO fazer:** tocar `compor`/`glifo`/`sigilo`/`comporGrimorio`/`gcode`/`svg` (a saída deles não muda); editar `src/ajuda.js`; importar DOM/CSS; criar PARAM para texto livre, arquivo, botões, seletor de personagem/variação/magia (fora do contrato); adicionar chaves que a tabela não lista; dependência nova.

---

## Tarefa 12-B

modelo: sonnet

**Regras comuns (valem para esta tarefa, além de `workflow/WORKER.md`)**
- Raiz: `C:\Users\augus\Desktop\augusto\projects\3dprinter_plotter`. Escreva **só** nos arquivos da linha "Arquivos"; ler qualquer arquivo é livre. As outras tarefas do ciclo rodam em paralelo nos outros arquivos: não os toque.
- **Goldens intactos:** `test/golden.test.mjs` e o `.snapshot` nunca mudam. **Nunca** rode `--test-update-snapshots` nem `npm run golden`.
- **Sem dependência nova:** `package.json`/`package-lock.json` não mudam; não rode `npm install`.
- **localStorage:** as chaves `writer.personagem`, `writer.personagens` e `grimorio.estado` mantêm nome e formato (você não as toca). Toda leitura de storage em `try/catch`.
- Sem commit. Textos de interface em pt-BR.
- Resposta final: até 10 linhas (arquivos, saída dos testes, dúvidas).

**Arquivos (só estes):** `src/ui/controle.js` (novo), `src/ui/tema.css` (novo), `e2e/controle.html` (novo), `e2e/controle.spec.js` (novo). Leitura livre de `index.html`, `grimorio.html`, `src/ui/*.js`, `workflow/ciclos/12/tema-proposto.css`, `playwright.config.js`, `vite.config.js`. **Não** edite `playwright.config.js`, `vite.config.js`, `index.html` nem `grimorio.html` (a 13-A adota o `tema.css`).

**Objetivo:** o controle de parâmetro com prévia viva (pedido do usuário: ao passar o mouse ou focar num parâmetro, um popover mostra o desenho com o valor atual e os extremos) e o CSS do tema. Você não depende da 12-A: trabalhe contra o contrato `Param` abaixo e teste com defs falsas.

### Contrato `Param` (o que o controle consome)
`{ chave, grupo, nivel:'basico'|'avancado', tipo:'faixa'|'numero'|'opcao'|'marca', min?, max?, passo?, padrao, unidade?, semEscala?, opcoes?:[{valor, rotulo}], rotulo, ajuda, previa(valor, ctx) → Traco[] }`, `Traco = [[x,y],...]` em mm, y para baixo, origem livre (o popover enquadra). `previa` pode lançar: o controle nunca quebra.

### API
```js
export function controle(def, estado, aoMudar)  // → { el: HTMLElement, atualizar(): void }
//   estado = { ler(): valor, gravar(valor): void, ctx?(): Ctx }   (ctx é repassado a def.previa)
export function ligar(alvo, chave, ctx)         // → estado; alvo = objeto ou () => objeto; ler/gravar = alvo[chave]
export function dica(texto)                     // → <button type="button" class="dica" aria-label="Ajuda">?</button> que mostra só o texto no mesmo popover
```

### Marcação (id com contador global — a mesma chave pode repetir, ex.: `peso`)
```html
<div class="controle" data-chave="inclinacao" data-nivel="basico">
  <label for="c-inclinacao-3">inclinação (graus)</label>
  <input id="c-inclinacao-3" type="range" min="-30" max="30" step="0.5" aria-describedby="c-inclinacao-3-ajuda">
  <output for="c-inclinacao-3">12 °</output>
  <button type="button" class="dica" aria-label="Ajuda: inclinação (graus)">?</button>
  <span id="c-inclinacao-3-ajuda" class="so-leitor">Inclina as letras…</span>
</div>
```
`faixa` → `input[type=range]` + `output`; `numero` → `input[type=number]` (sem `output`); `opcao` → `select` (`option value` = índice; mapeie de volta ao `valor` real); `marca` → `input[type=checkbox]` **antes** do rótulo. Grade: `rótulo 1fr · controle 1,3fr · valor 4em · ? 20px`.
- `input`/`change` → valida (`faixa`/`numero`: ignora vazio e NaN; prende em `[min, max]`; arredonda ao `passo`; inteiro quando `passo` é inteiro — isso cobre "colunas ≥ 1 inteiro") → `estado.gravar(v)` → `aoMudar()`.
- `atualizar()`: ressincroniza de `estado.ler()` **sem mexer no elemento em foco**; `output` = valor com vírgula decimal + `unidade` (`12 °`, `0,5 mm`).
- O valor lido pode estar fora de `[min,max]` (dado antigo): mostre-o, não o prenda até o usuário mexer.

### Popover único
Um `<div id="previa-viva" popover="manual" role="tooltip">` criado na primeira abertura e reaproveitado (nunca mais de um `[popover]` no DOM; mantenha-o como filho de `document.body`, assim `showPopover()` depois do `showModal()` de um `dialog` fica por cima). Abre em `pointerenter`, `focusin` e `input` da linha `.controle`, e no clique do "?"; fecha em `pointerleave` (se o foco não estiver na linha), `focusout`, `Escape`, `scroll` e `resize`. Redesenho em `requestAnimationFrame`, no máximo 1 por quadro.
- **Posição:** `position: fixed; inset: auto; margin: 0` (CSS). `x` = centro do polegar (`rect.left + (v − min)/(max − min) × rect.width`; centro do controle nos outros tipos) menos metade da largura do popover; `y` = acima da linha com 8 px de folga, abaixo se não couber; tudo preso a 8 px da viewport. Largura `min(320px, 100vw − 16px)` (CSS).
- **Conteúdo** (fundo `--campo`, borda `--contorno`, sombra `--sombra-pop`):
```
┌──────────────────────────────────────┐
│ inclinação                      12 ° │  rótulo + valor (tabular)
│ ┌──────────────────────────────────┐ │  mini-folha (--folha), svg 288×104
│ │   fantasma mín · AMOSTRA · máx   │ │  atual: --tinta-folha 1,5 px; fantasmas: --fantasma-folha 1 px, sobrepostos
│ │ ├────┤ 10 mm                     │ │  barra de escala, canto inferior esquerdo
│ └──────────────────────────────────┘ │
│ −30 ├──────┼─────▼────────────┤ 30 ° │  régua: mín, traço do padrão, marcador do valor em --rubrica, máx, unidade
│           padrão 0                   │
│ Inclina as letras, de −30 a 30…      │  def.ajuda em --tinta-2, 13 px
└──────────────────────────────────────┘
```
  - **Escala única:** a caixa que envolve o atual **e** os fantasmas (+1 mm de folga) é ajustada a 288×104 preservando a proporção; transforme os pontos para pixels antes de gerar o `<path>` (assim a espessura é em px). Barra de escala = o maior entre 1, 10, 100 mm que ocupe ≤ 40% da largura, rotulada com o valor real (`10 mm`); oculta com `semEscala`.
  - Fantasmas = `previa(min)` e `previa(max)`, calculados **uma vez** ao abrir; só o atual é recalculado a cada `input`. Régua e fantasmas só em `faixa`. Cada traço = um `<path>`; a régua e a barra não precisam ser `<path>`.
  - `opcao`: uma mini-folha por opção em grade (até 4 por linha), rótulo embaixo, a atual com contorno `--rubrica` 2 px. `marca`: duas mini-folhas, "desligado" e "ligado". `numero`: só a amostra atual.
  - `previa` que lança (no atual, nos fantasmas ou nas opções) → popover mostra só rótulo, valor e ajuda; **nenhum erro de console**. `svg` com `aria-hidden="true"`; a ajuda chega ao leitor de tela pelo `aria-describedby`.
  - `dica(texto)`: abre/fecha com `pointerenter`, `focus`, clique, `Escape`; mostra só o texto (sem mini-folha nem régua) no mesmo popover, ancorado no botão.

### `src/ui/tema.css`
1. Copie `workflow/ciclos/12/tema-proposto.css` **inteiro** (cabeçalho de contraste incluso; tokens e base não mudam).
2. Acrescente (só `var(--token)`, **nenhum hex fora do `:root`**): `.controle` (grade acima; a regra `body[data-nivel="basico"] [data-nivel="avancado"]` já existe no tema), `.dica` (botão 20 px redondo, borda `--contorno`), `#previa-viva` (`position: fixed; inset: auto; margin: 0; width: min(320px, calc(100vw - 16px)); padding: var(--e3)`; a transição de `opacity` já está no tema), o shell: `main` com `display: grid; grid-template-columns: var(--painel) minmax(0, 1fr); grid-template-areas: "painel previa" "painel exportar"` sobre os três filhos diretos `aside#painel`, `section#area-previa`, `footer#exportar` (este `position: sticky; bottom: 0`, fundo `--pergaminho`, borda de cima em pauta dupla); `header` (56 px, fundo `--pergaminho`, `h1`, `nav.oficinas` com `a[aria-current="page"]` em `--rubrica` + sublinhado 2 px, botão `#tema`), `#nivel` como controle segmentado de 2 `input[type=radio][name=nivel]` dentro de `label`, `aside#painel` (rola sozinho: `position: sticky; max-height` até o pé da janela; `overflow-y: auto`), `.barra-previa`, `#previas` (1 coluna; `#previas.comparando` 2 colunas), `figure`, `.rotulo`, `#avisos` (cor `--aviso`), `dialog` (fundo `--campo`, borda `--contorno`), `.linha-botoes`, `.achados`, `.selecionadas`, `.tela`, `.folha`, `.nome`, `.topo`, `.fechar`, `h3`, `label`, `textarea`, `input[type=text|search]`. Traga as regras equivalentes que hoje vivem no `<style>` de `index.html`/`grimorio.html` (leia ambos; `.tela`/editor de símbolos também em `grimorio.html` e `src/ui/grimorio.js`/`catalogo.js`) trocando as cores fixas por tokens. **Não** porte `.ajuda`/`.ajuda::after` (o tooltip antigo sai).
3. `@media (max-width: 800px)`: `main` em 1 coluna na ordem previa, painel, exportar (`grid-template-areas: "previa" "painel" "exportar"`; `#painel` sem `max-height`); `nav.oficinas { overflow-x: auto; white-space: nowrap }`; `#previas.comparando` empilha; `.folha` ocupa 100% da largura menos 16 px de cada lado.
4. Só `opacity .12s` de movimento (já no tema, dentro de `prefers-reduced-motion: no-preference`).

### Bancada e teste
- `e2e/controle.html` (HTML completo, `lang="pt-BR"`, `<body data-nivel="avancado">`): `<script type="module">` com `import '../src/ui/tema.css'` e `import { controle, ligar } from '../src/ui/controle.js'`; monta 4 defs falsas (uma por `tipo`: `faixa` −30..30/0,5 padrão 0 `°`; `numero`; `opcao` com 3 opções; `marca`) e um 5º def `faixa` cuja `previa` **lança**. Cada `previa` trivial devolve 1 traço de ~40 mm cuja forma depende do valor (ex.: reta com inclinação `v`), para o desenho ter > 10 mm e a barra "10 mm" aparecer. Cada `gravar` empurra para `window.gravados` (array).
- `e2e/controle.spec.js` (`@playwright/test`; roda nos projetos `claro` e `vela`; `page.goto('e2e/controle.html')`, baseURL `http://localhost:8765/`, o `webServer` do Playwright já sobe o `vite`): (1) foco no range abre `#previa-viva` com ≥ 3 `path` (atual + 2 fantasmas) e contém o texto do mínimo (`−30` ou `-30`), do máximo, `padrão` e `10 mm`; (2) `fill`/seta no range muda o `output` e chama `gravar` (`window.gravados`); (3) passar o mouse por dois controles deixa um único `[popover]` no DOM; (4) `Escape` fecha (`:popover-open` ausente); (5) o select abre o popover com uma miniatura por opção; (6) o controle com `previa` que lança não gera erro de console (`page.on('console')`/`pageerror` vazios) e o popover ainda mostra rótulo e ajuda; (7) a 375 px de largura (`page.setViewportSize({ width: 375, height: 812 })`) a caixa do popover aberto fica inteira dentro da viewport.
- **Verificação:** `npx playwright test e2e/controle.spec.js` verde nos dois projetos; `npx vite build` sem erro; `npm test` continua 126/126 (você não toca testes de Node).

**NÃO fazer:** importar `src/ajuda.js` ou módulo de motor (o controle só consome o `def`); lib de popover/tooltip; `setInterval`; cor fixa fora do `:root`; mais de um `[popover]`; `innerHTML` com rótulo/ajuda (use `textContent`); tocar `index.html`/`grimorio.html`/`playwright.config.js`.

---

## Tarefa 12-C

modelo: haiku

**Regras comuns (valem para esta tarefa, além de `workflow/WORKER.md`)**
- Raiz: `C:\Users\augus\Desktop\augusto\projects\3dprinter_plotter`. Escreva **só** em `src/maquina/gcode.js` e `test/svg-documento.test.mjs`; as outras tarefas do ciclo rodam em paralelo nos outros arquivos.
- **Goldens intactos:** `test/golden.test.mjs` e o `.snapshot` nunca mudam. **Nunca** rode `--test-update-snapshots` nem `npm run golden`. Se um golden falhar, você mudou a saída de `svg()` ou `gcode()`: desfaça.
- **Sem dependência nova:** `package.json` não muda; não rode `npm install`.
- **localStorage:** não se aplica a você (chaves `writer.*` e `grimorio.estado` ficam como estão).
- Sem commit. Resposta final: até 10 linhas (arquivos, `# pass`/`# fail`, dúvidas).

**Arquivos (só estes):** `src/maquina/gcode.js`, `test/svg-documento.test.mjs` (novo).

**Objetivo:** acrescentar `svgDocumento`, o SVG de uma página do `Documento` (uma `<g>` por camada, na cor da caneta). `svg()`, `gcode()` e `gcodeDocumento()` **não mudam de saída** (os goldens dependem deles). A UI nova (ciclo 13) exporta SVG por esta função.

**Assinatura exata (acrescente ao final de `gcode.js`):**
```js
export function svgDocumento(pagina, papel, canetas = {}, { camadas, trajeto = false } = {})  // → string SVG
```
- `pagina` = `{ camadas: [{ id, caneta, personagem, ordem, tracos }] }`; `papel` = `{ largura, altura, ... }` (mm); `canetas` = `{ [id]: { nome, cor, espessura } }`.
- Raiz igual à de `svg()`: `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}mm" height="${altura}mm" viewBox="0 0 ${largura} ${altura}">` (viewBox = papel). Linhas unidas com `"\n"` como em `svg()`.
- Filtre as camadas por `camadas` (lista de ids; ausente = todas), como `gcodeDocumento` faz: `pagina.camadas.filter((k) => !camadas || camadas.includes(k.id))`.
- Para cada camada com ≥ 1 traço válido (`valido(t)` já existe no arquivo: array com ≥ 2 pontos): um grupo `<g data-camada="ID" fill="none" stroke="COR" stroke-width="ESP" stroke-linecap="round" stroke-linejoin="round">` com um `<path d="M x y L x y ..."/>` por traço. `COR = canetas[c.caneta]?.cor ?? '#000'`; `ESP = canetas[c.caneta]?.espessura ?? 0.3`. Camada sem traço válido não gera grupo.
- Números com a função `num` que já existe no arquivo (`num = (v) => String(+v.toFixed(3))`); `d` no mesmo formato de `svg()` (`"M 10 20 L 30 20"`).
- **Escape** de `id` e `cor` nos atributos: `const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');`
- `trajeto: true`: depois dos grupos, desenhe a viagem sobre **todos** os traços válidos, na ordem das camadas filtradas: o mesmo desenho do bloco `if (trajeto) { ... }` de `svg()` (linha tracejada `#888`, círculo verde no início, vermelho no fim, número azul). Extraia esse bloco para uma função privada `viagemSvg(validos)` (devolve o array `extra` de strings, **idêntico caractere a caractere**) e chame-a nos dois lugares; se qualquer golden mudar (`npm test`), desfaça a extração e copie o bloco para dentro de `svgDocumento`.

**Exemplo real** (entrada e trecho da saída):
```js
const pag = { camadas: [
  { id: 'texto', caneta: 'preta', personagem: null, ordem: 'otimizada', tracos: [[[10, 20], [30, 20]]] },
  { id: 'notas', caneta: 'vermelha', personagem: null, ordem: 'otimizada', tracos: [[[10, 40], [30, 40]]] } ] };
svgDocumento(pag, { largura: 105, altura: 148 }, { preta: { cor: '#111', espessura: 0.4 }, vermelha: { cor: '#c00', espessura: 0.5 } });
// <svg xmlns="http://www.w3.org/2000/svg" width="105mm" height="148mm" viewBox="0 0 105 148">
// <g data-camada="texto" fill="none" stroke="#111" stroke-width="0.4" stroke-linecap="round" stroke-linejoin="round">
// <path d="M 10 20 L 30 20"/>
// </g>
// <g data-camada="notas" fill="none" stroke="#c00" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round">
// <path d="M 10 40 L 30 40"/>
// </g>
// </svg>
```

**Casos do teste `test/svg-documento.test.mjs`** (`node:test` + `node:assert/strict`; importa `svg`, `svgDocumento` de `../src/maquina/gcode.js`):
1. 2 camadas com canetas de cores diferentes → 2 `<g data-camada` e as duas cores presentes (`stroke="#111"`, `stroke="#c00"`).
2. `{ camadas: ['notas'] }` → 1 grupo, `data-camada="notas"`, sem `texto`.
3. Traço com 1 ponto é descartado: camada com `[[[1, 1]], [[1, 1], [2, 2]]]` → exatamente 1 `<path`.
4. `viewBox="0 0 105 148"` = papel.
5. `id` com `"` e `<` (ex.: `a"b<c`) sai escapado (`a&quot;b&lt;c`) e o texto cru `a"b<c` não aparece.
6. 1 camada preta, sem `canetas`, sem trajeto: os `d="..."` (extraia com `[...s.matchAll(/ d="([^"]+)"/g)].map((m) => m[1])`) são os mesmos de `svg(tracos, papel)`.
7. `trajeto: true` traz ao menos um `<circle` e `stroke-dasharray`; sem trajeto não há `<circle`.
8. Camada cuja caneta não está em `canetas` usa `stroke="#000"` e `stroke-width="0.3"`.

**Verificação:** `node --test test/svg-documento.test.mjs` e `npm test` inteiro (126 anteriores + os novos, goldens sem diff).

**NÃO fazer:** mudar a saída de `svg()`/`gcode()`/`gcodeDocumento()`; mexer em `perfis.js`/`documento.js`; adicionar parâmetros além dos listados; formatar números de outro jeito que `num`; importar DOM.
