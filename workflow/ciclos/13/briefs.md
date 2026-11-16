# Ciclo 13 — M15 (Identidade + oficinas), parte 2: shell e migração dos painéis

Spec: `workflow/ciclos/12/projeto.md` (§2, §6, §7). **Escrito assumindo o ciclo 12 aceito** (`PARAMS` nos 7 módulos, `amostra`, `mesclarPerfil`, `svgDocumento`, `src/ui/controle.js`, `src/ui/tema.css`). Contrato do marco: `workflow/EXPANSAO.md` §4.1, §4.4, §4.7 (M15), §5.2. Estado de partida: `npm test` verde (126 + testes do ciclo 12).

**O app fica quebrado entre as três tarefas** (o shell novo chama painéis que a 13-B/13-C ainda reescrevem). O gate é do ciclo: cada worker entrega contra o contrato abaixo e verifica o que dá para verificar sozinho; o gerente roda `npm run build` e `npm run e2e` depois que as três entram. Se o seu build falhar só porque um módulo das outras tarefas ainda não tem a função nova, **não crie stub nem edite o arquivo alheio**: relate isso na resposta.

Arquivos por tarefa (disjuntos): 13-A = `index.html`, `grimorio.html`, `src/ui/app.js` (novo), `src/ui/previa.js` (novo), `e2e/smoke.spec.js`, `e2e/visual.spec.js` (novo) · 13-B = `src/ui/personagem.js`, `src/ui/fontes.js`, `src/ui/catalogo.js`, `src/ajuda.js`, `test/ajuda.test.mjs` · 13-C = `src/ui/texto.js`, `src/ui/exportar.js`, `src/ui/grimorio.js`.

---

## Tarefa 13-A

modelo: sonnet

**Regras comuns (valem para esta tarefa, além de `workflow/WORKER.md`)**
- Raiz: `C:\Users\augus\Desktop\augusto\projects\3dprinter_plotter`. Escreva **só** nos arquivos da linha "Arquivos"; ler qualquer arquivo é livre. 13-B e 13-C rodam em paralelo nos outros arquivos: não os toque.
- **Goldens intactos:** `test/golden.test.mjs` e o `.snapshot` nunca mudam. **Nunca** rode `--test-update-snapshots` nem `npm run golden`.
- **Sem dependência nova:** `package.json`/`package-lock.json`/`vite.config.js`/`playwright.config.js` não mudam; não rode `npm install`.
- **localStorage:** `writer.personagem`, `writer.personagens` e `grimorio.estado` mantêm nome e formato (quem os grava são `personagem.js` e `grimorio.js`; você só garante que continuam sendo gravados e lidos). Chaves novas, suas: `writer.ui` = `{ tema, nivel }` e leitura de `writer.perfil` (perfil personalizado). Toda leitura em `try/catch`.
- Sem commit. Textos em pt-BR. Resposta final: até 10 linhas.

**Arquivos (só estes):** `index.html`, `grimorio.html`, `src/ui/app.js` (novo), `src/ui/previa.js` (novo), `e2e/smoke.spec.js`, `e2e/visual.spec.js` (novo).

**Contrato que você consome (ciclo 12 aceito + decisões do ciclo 13; 13-B e 13-C implementam o lado deles):**
- `src/ui/controle.js`: `controle(def, estado, aoMudar) → { el, atualizar() }`; `ligar(alvo, chave, ctx) → estado` (`alvo` objeto ou `() => objeto`); `dica(texto)`. `estado` de controle = `{ ler(), gravar(v), ctx?() }`. O controle já leva `data-chave`/`data-nivel` na `div.controle`.
- `PARAMS` nos módulos `mao.js`, `layout.js`, `documento.js`, `perfis.js`, `otimizar.js`, `scroll.js`, `alfabeto.js`; indexe por chave: `const P = Object.fromEntries(PARAMS.map((p) => [p.chave, p]))`. `Param = { chave, grupo, nivel, tipo, min?, max?, passo?, padrao, unidade?, semEscala?, opcoes?, rotulo, ajuda, previa(valor, ctx) }`.
- `src/maquina/gcode.js`: `svgDocumento(pagina, papel, canetas, { camadas, trajeto })`. `src/materiais/documento.js`: `papel(nome, { paisagem, margem, largura, altura })`, `deTracos(paginas, papel, { avisos })`. `src/maquina/perfis.js`: `PERFIS`, `mesclarPerfil(salvo)`. `src/layout.js`: `compor`, `amostra`. `src/maquina/otimizar.js`: `otimizar(tracos, tol, { janela, ordem })`.
- **Painéis** (cada módulo de `src/ui/`): `montar(elemento, estado, aoMudar) → atualizar()`; o shell (você) cria o `<details><summary>` e passa o `div` do corpo. Módulos e exports:
  - `personagem.js`: `montar` (grupo **Personagem**), `restaurar(estado)` (já existe). `fontes.js`: `montar` (grupo **Fontes**).
  - `texto.js`: `montar` (grupo **Texto**) **e** `montarPapel` (grupo **Papel e aparência**).
  - `exportar.js`: `montar` (grupo **Máquina**, avançado) **e** `montarBarra(elemento, estado, aoMudar) → atualizar()` (conteúdo do `footer#exportar`: perfil, resumo, botões, erro de máquina).
  - `grimorio.js`: `criar() → instância` (abaixo).
- **Estado e instância.** Instância = `{ estado, grupos: [{ titulo, nivel?, montar }], entrar(oficina) /* pode devolver Promise */, compor() → { paginas: Traco[][], avisos: string[] }, barra: montarBarra }`. Estado da instância `escrita` (criado por você em `app.js`): `{ fontes, nomesFontes, personagem, variacao, comparar, variacaoB, texto, paginaNome, pagina /*Papel*/, opcoes:{tamanho,entrelinha,alinhamento,colunas}, colunasLivro, oficina, perfilNome /*'megaS'|'p2s'|'personalizado'*/, perfil, otimizar, trajeto, paginaAtual, doc }`. **A cada render, antes de chamar os `atualizar()`, você atribui `inst.estado.doc = deTracos(r.paginas, inst.estado.pagina, { avisos: r.avisos })`** (todas as páginas) e `inst.estado.oficina`. Quem exporta (13-C) lê `estado.doc`, `estado.paginaAtual`, `estado.perfil`, `estado.perfilNome`, `estado.otimizar`, `estado.trajeto`. `estado.pagina` é sempre um `Papel` `{ largura, altura, margens:{topo,dir,base,esq} }`.

### 1. `index.html` (reescreva inteiro; o `<style>` e o `<script>` inline saem)
`<head>`: `meta charset`, `meta viewport`, `<title>Scriptorium — caligrafia para plotter</title>`, `<link rel="preconnect" href="https://fonts.googleapis.com">`, `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`, `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap">`. Sem rede o app funciona com a pilha de reserva do tema. CSS entra por `import './tema.css'` em `app.js`. `<body data-nivel="basico">`:
```html
<header>
  <h1>Scriptorium</h1>
  <nav class="oficinas" aria-label="Oficinas">
    <a href="#carta">Carta</a><a href="#scroll">Scroll</a><a href="#grimorio">Grimório</a><a href="#livro">Livro</a><a href="#sigilos">Sigilos</a>
  </nav>
  <button id="tema" type="button" aria-pressed="false">Vela</button>
</header>
<main>
  <aside id="painel" aria-label="Parâmetros">
    <div id="nivel" role="radiogroup" aria-label="Nível">
      <label><input type="radio" name="nivel" value="basico" checked> Básico</label>
      <label><input type="radio" name="nivel" value="avancado"> Avançado</label>
    </div>
    <div id="grupos"></div>
  </aside>
  <section id="area-previa">
    <div class="barra-previa">
      <div class="paginas"><button type="button" id="pag-ant">‹ Anterior</button><span id="pag-info">Página 1 de 1</span><button type="button" id="pag-prox">Próxima ›</button></div>
      <label id="rotulo-comparar"><input type="checkbox" id="comparar"> comparar</label>
      <select id="variacao-b" aria-label="Variação B" hidden></select>
    </div>
    <div id="previas">
      <figure><p class="rotulo" id="rotulo-a"></p><div class="folha" id="previa"></div></figure>
      <figure id="previa-b-bloco" hidden><p class="rotulo" id="rotulo-b"></p><div class="folha" id="previa-b"></div></figure>
    </div>
    <p id="erro" class="erro" role="alert"></p>
    <ul id="avisos"></ul>
  </section>
  <footer id="exportar" class="barra-exportar"></footer>
</main>
<dialog id="editor"></dialog>
<script type="module" src="./src/ui/app.js"></script>
```
`main` tem exatamente três filhos diretos (`aside#painel`, `section#area-previa`, `footer#exportar`): a grade do `tema.css` depende disso. `dialog#editor` e `#erro` ficam, pois `grimorio.js` e `texto.js` os usam por id. Os grupos (`details`) entram em `#grupos`. Ao lado de `#comparar` você acrescenta `dica(AJUDA.comparar)` (de `src/ajuda.js`; **não** importe a função `ajuda()`, ela some na 13-B).

### 2. `grimorio.html` (reescreva inteiro)
```html
<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Scriptorium — Grimório</title>
<meta http-equiv="refresh" content="0; url=index.html#grimorio"><script>location.replace('index.html#grimorio')</script></head>
<body><p><a href="index.html#grimorio">Ir para o Grimório</a></p></body></html>
```
(`vite.config.js` continua com `input.grimorio`; não muda.)

### 3. `src/ui/previa.js`
```js
export function desenhar(el, doc, { pagina = 0, trajeto = false, otimizar: opt = true } = {})
//   el.innerHTML = svgDocumento(doc.paginas[pagina] ?? { camadas: [] }, doc.papel, doc.canetas, { trajeto });
//   com trajeto && opt: antes, cada camada da página passa por otimizar(c.tracos, 0.1, { ordem: c.ordem });
//   el.style.maxWidth = `${doc.papel.largura * 4}px`  (4 px por mm: A8 não vira cartaz); página inexistente → folha vazia (nunca lança).
export function listar(ul, itens)        // ul.replaceChildren(...um <li> por item, textContent)
```

### 4. `src/ui/app.js`
```js
import './tema.css';
const OFICINAS = { carta: 'escrita', livro: 'escrita', scroll: 'grimorio', grimorio: 'grimorio', sigilos: 'sigilos' };
const COMPARTILHADAS = ['fontes', 'nomesFontes', 'personagem', 'variacao', 'perfilNome', 'perfil', 'otimizar', 'trajeto'];
```
- **Fontes:** carregue as 43 uma vez (`FONTES` e `parseFonte` de `src/fonte.js`; `fetch('fontes/NOME.svg')` como o `index.html` atual faz; `baixar(url)` com erro claro). Falha → `#erro` = `Erro ao carregar: …`.
- **Estado inicial da `escrita`:** `texto` = o texto de exemplo do `index.html` atual (`'Caro viajante,\n\nA neblina cobre Barovia…'` — copie literal de lá), `pagina: papel('A5')`, `paginaNome: 'A5'`, `opcoes: { tamanho: 6, entrelinha: 1.6, alinhamento: 'esquerda', colunas: 1 }`, `variacao: 'normal'`, `perfil: structuredClone(PERFIS.megaS)`, `perfilNome: 'megaS'`, `otimizar: true`, `trajeto: false`, `personagem: novoPersonagem()` + `restaurar(estado)` (try/catch). Se `localStorage['writer.perfil']` existir e for JSON válido: `estado.perfil = mesclarPerfil(salvo)`, `perfilNome = 'personalizado'`.
- **Instância `escrita`:** `compor()` = `compor(estado.texto, estado.fontes, resolver(estado.personagem, estado.variacao || null), estado.pagina, estado.opcoes)` (de `layout.js`). `composB()` = o mesmo com `variacaoB`, só quando `estado.comparar` e a oficina é carta/livro. `entrar('carta')` → `estado.opcoes.colunas = 1`; `entrar('livro')` → `estado.opcoes.colunas = estado.colunasLivro ?? 2`. Grupos: **Personagem** (`pPersonagem.montar`), **Fontes**, **Texto** (`pTexto.montar`), **Papel e aparência** (`pTexto.montarPapel`), **Máquina** (`pExportar.montar`, `nivel: 'avancado'`). `barra: pExportar.montarBarra`.
- **Instância `grimorio`:** `criar()` de `ui/grimorio.js`; nada mais.
- **Instância `sigilos`** (dentro de `app.js`, ≤ 40 linhas): estado `{ papelNome: 'A6', paisagem: false, estilo: { seed: 1, curva: 0.4, complexidade: 0.5 }, … campos compartilhados }`; grupos **Folha** (controles `papel` e `paisagem` de `documento.js`) e **Tradição** (`seed`, `curva`, `complexidade` de `alfabeto.js`, ligados a `estado.estilo`); `compor` = `moldura(pagina)` + um `sigilo(magiaExemplo, estilo.seed)` centrado (raio 35% do menor lado útil), com `magiaExemplo = { ...magiaVazia(), id: 'exemplo', nivel: 3, escola: 'V', comp: 'V, S, M' }`; `avisos: ['Folha de sigilos completa chega no M19–M20.']`; `barra: montarBarra`. O `estado.pagina` dela = `papel(papelNome, { paisagem })`.
- **Roteamento:** `hashchange` + carga inicial. Hash vazio/desconhecido → `location.replace('#carta')`. Ao trocar: copia `COMPARTILHADAS` da instância que sai para a que entra (`// ponytail: cópia na troca; store único se duas oficinas ficarem visíveis juntas`), `await inst.entrar(id)`, **monta os grupos uma vez** (primeira visita à instância: cria `<details><summary>título</summary><div></div></details>` em `#grupos`, `data-nivel="avancado"` se `nivel: 'avancado'`, `open` nos dois primeiros, chama `montar(div, inst.estado, aoMudar)` e guarda o `atualizar`), alterna os grupos por `hidden` (um conjunto por instância), monta a barra em `#exportar` (uma vez por instância), marca `aria-current="page"` só no link atual, `document.title = 'Scriptorium — ' + nome`, `estado.paginaAtual = 0`, renderiza. Mostra `#rotulo-comparar` só em carta/livro.
- **Render** (um por quadro: `aoMudar` agenda com `requestAnimationFrame` uma vez, como o `aoMudar` atual do `index.html`): `r = inst.compor()` em `try` (erro → `#erro` = `Erro: mensagem`, mantém a prévia anterior, **não** lança) → `inst.estado.doc = deTracos(r.paginas, inst.estado.pagina, { avisos: r.avisos })` → paginação (`#pag-info` = `Página N de M`, `#pag-ant`/`#pag-prox` desabilitados nas pontas; `paginaAtual` preso a `[0, M−1]`; com B, M = máximo dos dois) → `desenhar(#previa, doc, { pagina, trajeto, otimizar })` (+ `#previa-b` com `composB` se comparar; `#rotulo-a`/`#rotulo-b` = `Variação: nome|mão base`, só em carta/livro) → `#avisos` (via `listar`; sem os que começam com `tolerancia de limites`; os de B com prefixo `B: `) → `atualizar()` de cada grupo e da barra. `#variacao-b` recebe as variações do personagem como hoje.
- **Nível e tema:** `input[name=nivel]` → `document.body.dataset.nivel`; `#tema` alterna `document.documentElement.dataset.tema` entre `claro` e `vela` partindo do tema efetivo (`matchMedia('(prefers-color-scheme: dark)')`) e atualiza `aria-pressed` e o texto (`Vela` quando o tema atual é claro, `Claro` quando é vela). Sem valor salvo, **nenhum** `data-tema` (segue o sistema: é o que os projetos `claro`/`vela` do Playwright exercitam). Persistência em `writer.ui` = `{ tema, nivel }`, lida no início em `try/catch`.
- Nada de `style=` com cor fixa; nenhum `innerHTML` com texto do usuário (só o SVG da prévia).

### 5. `e2e/smoke.spec.js` (reescreva) e `e2e/visual.spec.js` (novo)
`smoke` (projetos `claro` e `vela`):
- `index.html` abre sem erro de console/`pageerror` e com `#previa svg path`.
- `grimorio.html` termina em URL que contém `index.html#grimorio`.
- Hash inválido (`index.html#xyz`) cai em `#carta`.
- Com `writer.personagens = {"Teste": <novoPersonagem()>}` semeado por `page.addInitScript` (use o formato real: `{ nome:'Teste', mao:{...NEUTRA, base:[{fonte:'EMSDelight',peso:1}]}, variacoes:{normal:{}} }`), `Teste` aparece como `option` no select de salvos (`#painel option` com texto `Teste`).
- Alternar Avançado (`page.getByLabel('Avançado').check()`) torna visível `[data-chave="espacamento"]`; Básico a esconde.
- Só no `smoke`: `await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }))` (determinismo, roda sem rede).

`visual` (roda nos dois projetos; **não** compara com baseline, **grava** imagens para o usuário aprovar; a fonte web deve carregar, sem `route`):
- Para cada oficina (`carta, scroll, grimorio, livro, sigilos`): `goto('index.html#' + id)`, espera `#previa svg`, `await page.evaluate(() => document.fonts.ready)`, `page.screenshot({ fullPage: true, path: testInfo.outputPath(id + '.png') })` e `testInfo.attach(id, { path, contentType: 'image/png' })`.
- Mais um com Avançado ligado e o popover aberto (`focus()` no primeiro `input[type=range]` de `#carta`; espera `#previa-viva:popover-open`) e um a 375×812.
- **Contraste AA sem lib**, função de ~20 linhas dentro de `page.evaluate` (uma vez por tema em `#carta` com Avançado e em `#grimorio`):
  1. `lum(rgb)` e `razao(a, b)` pela fórmula WCAG 2.x; cor lida de `getComputedStyle` (`rgb()`/`rgba()`; `light-dark()` já chega resolvido).
  2. Fundo efetivo = primeiro ancestral com `background-color` de alfa 1.
  3. Texto ≥ **4,5**: `h1`, `nav.oficinas a`, `summary`, `.controle label`, `.controle output`, `button`, `select`, `#pag-info`, `#avisos li` e o texto de ajuda do popover aberto — todos os elementos visíveis de cada seletor (ignore `[hidden]` e `.so-leitor`).
  4. Não-texto ≥ **3**: `border-color` de `select`, `input[type=number]`, `textarea`, `button` contra o fundo do pai; `outline-color` do elemento focado (depois de `Tab`) contra o fundo.
  5. Falha lista `seletor: razão` de cada reprovado (`expect(falhas, falhas.join('\n')).toEqual([])`).
  Se o contraste real reprovar por causa do CSS (que é da 12-B), **não mexa no CSS**: registre as razões na resposta.

**Verificação:** `npm run build` (nenhum import quebrado, depois que 13-B e 13-C entrarem); `npm run e2e` (smoke + visual + controle) verde nos dois temas — rode no fim do ciclo. Antes disso, rode `npm test` (continua verde: você não toca testes de Node) e `npx playwright test e2e/smoke.spec.js` se os painéis já estiverem prontos.

**NÃO fazer:** tocar `vite.config.js`, `playwright.config.js`, `src/ui/tema.css`, `controle.js` ou os painéis; criar materiais novos (carta/livro/sigilos reais são M20); camadas/canetas na UI; mais de um `dialog#editor`; guardar o estado do app em módulo global (tudo no `estado` da instância); `innerHTML` com string do usuário; chamar `ajuda()`.

---

## Tarefa 13-B

modelo: haiku

**Regras comuns (valem para esta tarefa, além de `workflow/WORKER.md`)**
- Raiz: `C:\Users\augus\Desktop\augusto\projects\3dprinter_plotter`. Escreva **só** nos arquivos da linha "Arquivos". 13-A e 13-C rodam em paralelo nos outros arquivos: não os toque.
- **Goldens intactos:** `test/golden.test.mjs` e o `.snapshot` nunca mudam. **Nunca** rode `--test-update-snapshots` nem `npm run golden`.
- **Sem dependência nova:** `package.json` não muda; não rode `npm install`.
- **localStorage:** `writer.personagem`, `writer.personagens` (e `grimorio.estado`) mantêm nome e formato; `restaurar`, salvar/abrir/excluir salvos não mudam de comportamento.
- Sem commit. Resposta final: até 10 linhas.

**Arquivos (só estes):** `src/ui/personagem.js`, `src/ui/fontes.js`, `src/ui/catalogo.js`, `src/ajuda.js`, `test/ajuda.test.mjs`.

**Objetivo:** trocar os `slider()`/`deslizante()` feitos à mão e os `ajuda()` por `controle()` (prévia viva) e `dica()`. A assinatura `montar(elemento, estado, aoMudar) → atualizar` de cada painel **não muda**.

**API nova (ciclo 12, já existe; leia `src/ui/controle.js`):**
```js
import { controle, ligar, dica } from './controle.js';
// controle(def, estado, aoMudar) → { el, atualizar() }     estado = { ler(), gravar(v), ctx?() }
// ligar(alvo, chave, ctx) → estado    (alvo = objeto ou () => objeto; ler/gravar = alvo[chave])
// dica(texto) → <button class="dica">?</button>
import { PARAMS } from '../motor/mao.js';     // cada Param tem chave, tipo, min, max, passo, padrao, rotulo, ajuda, previa
import { amostra } from '../layout.js';
const P = Object.fromEntries(PARAMS.map((p) => [p.chave, p]));
```
O `ctx` que cada `previa` recebe: `{ fontes, mao, escrever, indice? }`. Dentro de `montar`:
```js
const ctx = () => ({ fontes: estado.fontes, mao: resolver(estado.personagem, estado.variacao || null),
                     escrever: (m, t, o) => amostra(estado.fontes, m, t, o) });
```

### `src/ui/personagem.js`
Antes (o que existe hoje, `slider()` + as listas `SLIDERS_*`):
```js
const SLIDERS_IDENTIDADE = [['inclinacao', -30, 30, 0.5], ['largura', 0.5, 1.5, 0.01], /* ... */];
function slider([chave, min, max, passo], get, set) { const input = document.createElement('input'); input.type = 'range'; /* ... */ t.append(rotulo(chave), ' ', ajuda(chave)); /* ... */ sincs.push(() => { /* ler get() e escrever input.value/out */ }); return l; }
const blocosIdentidade = SLIDERS_IDENTIDADE.map(spec => { const chave = spec[0];
  return slider(spec, () => estado.personagem.mao[chave], v => { estado.personagem.mao[chave] = v; }); });
const blocosExecucao = SLIDERS_EXECUCAO.map(spec => { const chave = spec[0];
  return slider(spec, () => resolver(estado.personagem, estado.variacao || null)[chave],
                      v => ajustarVariacao(estado.personagem, estado.variacao || null, chave, v)); });
```
Depois:
```js
const CHAVES_IDENTIDADE = ['inclinacao', 'largura', 'altura', 'espacamento', 'espacoPalavra', 'idio'];
const CHAVES_EXECUCAO = ['pressa', 'capricho', 'tremor', 'queda', 'compressao', 'variacao', 'desleixo'];
const ctrlIdentidade = CHAVES_IDENTIDADE.map((chave) =>
  controle(P[chave], ligar(() => estado.personagem.mao, chave, ctx), aoMudar));
const ctrlExecucao = CHAVES_EXECUCAO.map((chave) =>
  controle(P[chave], {
    ler: () => resolver(estado.personagem, estado.variacao || null)[chave],
    gravar: (v) => ajustarVariacao(estado.personagem, estado.variacao || null, chave, v),
    ctx,
  }, aoMudar));
// no elemento.append(...): titulo('Identidade'), ...ctrlIdentidade.map((c) => c.el), titulo('Execução'), ...ctrlExecucao.map((c) => c.el)
// em atualizar(): [...ctrlIdentidade, ...ctrlExecucao].forEach((c) => c.atualizar());   (no lugar de `for (const s of sincs) s();`)
```
Remova `SLIDERS_*`, `slider()` e `sincs`. Demais mudanças: o `titulo('Personagem ', ajuda('personagem'))` do topo sai (o `summary` do shell já se chama Personagem) e `dica(AJUDA.personagem)` passa para ao lado do campo Nome (`campo('Nome', inputNome)` vira `label` com `' '` + `dica(AJUDA.personagem)`); `labelVar.append(rotulo('variacaoSel'), ' ', dica(AJUDA.variacaoSel), ' ', selVar)`. Imports: `import { rotulo, AJUDA } from '../ajuda.js'` (a função `ajuda` deixa de existir) e `import { controle, ligar, dica } from './controle.js'`. `selSalvos`, `selVar`, botões, `restaurar`, `lerSalvos`/`gravarSalvos` e a gravação de `writer.personagem` em `atualizar()` ficam **idênticos**. Não restam `style=` com cor.

### `src/ui/fontes.js`
- `titulo(texto, chave)` e `campo(chave, controle)`: troque `ajuda(chave)` por `dica(AJUDA[chave])` (importe `AJUDA`, `rotulo`; remova `ajuda`).
- Apague `deslizante()`. `peso` por linha: dentro de `criarLinha(i)`
  ```js
  const peso = controle(P.peso, {
    ler: () => estado.personagem.mao.base[i].peso,
    gravar: (v) => { estado.personagem.mao.base[i].peso = Math.max(0.01, v); },
    ctx: () => ({ ...ctx(), indice: i }),
  }, aoMudar);
  // linha.append(campo('base', sel), peso.el, remover); retorne { linha, sel, peso, remover }
  ```
  e em `atualizar()` troque `sincronizar(l.peso.input, …)`/`l.peso.saida.textContent` por `l.peso.atualizar()`.
- `seed` da mão: `controle(P.seed, ligar(() => estado.personagem.mao, 'seed', ctx), aoMudar)` no lugar de `seedMao`/`campo('seed', seedMao)`.
- Mutar: `const m = { mutarSeed: 1, mutarForca: 0.3 };` `const cSeed = controle(P.mutarSeed, ligar(m, 'mutarSeed', () => ({ ...ctx(), mao: estado.personagem.mao })), aoMudar);` idem `cForca` com `P.mutarForca`. O botão faz `estado.personagem.mao = mutar(estado.personagem.mao, m.mutarSeed, m.mutarForca); m.mutarSeed += 1; aoMudar();`. `atualizar()` chama `cSeed.atualizar()`/`cForca.atualizar()`/`seed.atualizar()`.
- `P` e `ctx` como no bloco acima (`PARAMS` de `../motor/mao.js`; `amostra` de `../layout.js`; `resolver` de `../personagem.js`). Botões, `abrirCatalogo` e o select de fonte não mudam.

### `src/ui/catalogo.js`
- `import { dica } from './controle.js'` no lugar de `import { ajuda } from '../ajuda.js'`; `titulo(e.nome, ajuda(undefined, e.ajuda))` → `titulo(e.nome, dica(e.ajuda))` (2 linhas, `EIXOS` e `ARQUETIPOS`).
- No `<style id="estilo-catalogo">` troque cores fixas por tokens: `#999`→`var(--contorno)`, `#ddd`→`var(--regua)`, `#fff`→`var(--campo)`, `#e6f4ea`→`var(--pergaminho)`, `#111`→`var(--tinta)`, `#666`→`var(--tinta-2)`; qualquer outro hex que aparecer no bloco, escolha o token de mesmo papel (texto → `--tinta`, secundário → `--tinta-2`, linha → `--regua`, borda de controle → `--contorno`). Não reescreva o catálogo nem a tabela.

### `src/ajuda.js` e `test/ajuda.test.mjs`
- `src/ajuda.js`: apague a função `ajuda()` inteira e o comentário `// document só é usado dentro de ajuda()…`. `AJUDA`, `ROTULOS`, `rotulo()` ficam intactos.
- `test/ajuda.test.mjs`: tire `ajuda` do `import` e apague o último `test('ajuda sem texto lança erro antes de tocar document', …)`. Os outros 5 testes ficam.

**Verificação:** `npm test` (continua verde: o caso removido era o único que usava `ajuda()`), `npx vite build` (depois que 13-A e 13-C entrarem; se só falharem imports deles, relate).

**NÃO fazer:** mudar assinatura de `montar`/`restaurar`; renomear chaves `writer.*`; trocar `select`/`input[type=text]`/botões por `controle()` (só os sliders de parâmetro e `seed`/`mutar*`); mexer em `AJUDA`/`ROTULOS`; criar `PARAMS` novos; dependência nova; `style=` com cor.

---

## Tarefa 13-C

modelo: sonnet

**Regras comuns (valem para esta tarefa, além de `workflow/WORKER.md`)**
- Raiz: `C:\Users\augus\Desktop\augusto\projects\3dprinter_plotter`. Escreva **só** em `src/ui/texto.js`, `src/ui/exportar.js`, `src/ui/grimorio.js`. 13-A e 13-B rodam em paralelo nos outros arquivos: não os toque.
- **Goldens intactos:** `test/golden.test.mjs` e o `.snapshot` nunca mudam. **Nunca** rode `--test-update-snapshots` nem `npm run golden`. Não mude `compor`/`comporGrimorio`/`svg()`/`gcode()`.
- **Sem dependência nova:** `package.json` não muda; não rode `npm install`.
- **localStorage:** `writer.personagem`, `writer.personagens` e **`grimorio.estado`** (`CHAVE`, lista `SALVOS`, formato) intactos. Nova chave sua: `writer.perfil` (JSON do perfil personalizado). Toda leitura em `try/catch`.
- Sem commit. Textos em pt-BR. **Não importe a função `ajuda()` de `src/ajuda.js`** (a 13-B a remove): use `dica(texto)` de `./controle.js`, e `AJUDA`/`ROTULOS`/`rotulo` quando precisar. Sem `style=` com cor fixa (tokens CSS).
- Resposta final: até 10 linhas.

**Arquivos (só estes):** `src/ui/texto.js`, `src/ui/exportar.js`, `src/ui/grimorio.js`.

**Contrato que você consome / entrega:**
- Ciclo 12 (existe): `controle(def, estado, aoMudar) → { el, atualizar() }`, `ligar(alvo, chave, ctx)`, `dica(texto)` em `./controle.js`; `PARAMS` em `documento.js`, `layout.js`, `perfis.js`, `otimizar.js`, `scroll.js`, `alfabeto.js`, `mao.js`; `amostra` (`layout.js`); `mesclarPerfil`, `PERFIS` (`perfis.js`); `gcodeDocumento`, `svgDocumento` (`gcode.js`); `papel`, `PAPEIS` (`documento.js`). Indexe PARAMS por chave: `const P = Object.fromEntries(PARAMS.map((p) => [p.chave, p]))` (um `P` por módulo, com nome próprio).
- Painéis: `montar(elemento, estado, aoMudar) → atualizar()`; o shell (13-A) cria o `<details>` e passa o `div`.
- **Estado que `app.js` (13-A) mantém e você lê:** `estado.doc` (= `deTracos(todasAsPáginas, estado.pagina, { avisos })`, atribuído a cada render **antes** dos `atualizar()`), `estado.paginaAtual` (0-based), `estado.pagina` (Papel), `estado.perfil`, `estado.perfilNome` (`'megaS'|'p2s'|'personalizado'`), `estado.otimizar`, `estado.trajeto`, `estado.oficina` (`'carta'|'livro'|'scroll'|'grimorio'|'sigilos'`), `estado.fontes`, `estado.personagem`, `estado.variacao`, `estado.opcoes = { tamanho, entrelinha, alinhamento, colunas }`, `estado.colunasLivro`, `estado.paginaNome`.
- **Você entrega:** `texto.js`: `montar` (grupo Texto) e **`montarPapel`** (grupo Papel e aparência). `exportar.js`: `montar` (grupo Máquina) e **`montarBarra(el, estado, aoMudar) → atualizar()`**. `grimorio.js`: **`criar() → { estado, grupos:[{titulo, nivel?, montar}], entrar(oficina), compor() → { paginas, avisos }, barra: montarBarra }`**; `entrar` pode devolver Promise; `compor` devolve `{ paginas: Traco[][], avisos: string[] }`.

### `src/ui/texto.js`
- `montar`: textarea do texto + importar `.txt` (como hoje; o `#erro` é `document.getElementById('erro')`). Ajuda via `dica(AJUDA.texto)` / `dica(AJUDA.importarTxt)`.
- `montarPapel`: sai o select `PAGINAS`/`mesa`/`personalizada` e as 6 medidas à mão (e o import de `PAGINAS`). Entram controles dos PARAMS: de `documento.js` `papel`, `paisagem`, `largura`, `altura`, `margem`, `margemTopo`, `margemDir`, `margemBase`, `margemEsq`; de `layout.js` `tamanho`, `entrelinha`, `alinhamento`, `colunas`. Guarde a configuração do papel em `estado.papelCfg = { papel, paisagem, largura, altura, margem, margemTopo, margemDir, margemBase, margemEsq }` (crie a partir de `estado.pagina`/`estado.paginaNome` na primeira chamada: `papel` = `estado.paginaNome` se estiver em `PAPEIS`, senão `'personalizado'` com as medidas de `estado.pagina`) e, a cada alteração, recalcule `estado.pagina = construir(estado.papelCfg)` com `papel(cfg.papel, { paisagem, margem, largura, altura })` e depois sobrescreva as 4 margens individuais; ao mudar o nome do papel, copie as medidas e a margem padrão do novo papel para `largura`/`altura`/`margem*` (assim "personalizado" parte do papel anterior); ao mudar `margem`, copie para as 4. Atualize `estado.paginaNome = cfg.papel` e `estado.paginaAtual = 0` ao trocar de papel. `largura`/`altura` ficam `hidden` (no `el` do controle) fora de `personalizado`. Estado antigo `paginaNome` `'mesa'`/`'personalizada'` → trate como `personalizado` com as medidas atuais.
- `tamanho`/`entrelinha`/`alinhamento` ligam a `estado.opcoes`. `colunas`: `estado.opcoes.colunas` com `gravar: (v) => { estado.opcoes.colunas = v; if (estado.oficina === 'livro') estado.colunasLivro = v; }`; o `el` do controle fica `hidden` quando `estado.oficina === 'carta'` (o `atualizar()` reavalia).
- `ctx` dos controles: `() => ({ fontes: estado.fontes, mao: resolver(estado.personagem, estado.variacao || null), escrever: (m, t, o) => amostra(estado.fontes, m, t, o), papel: estado.pagina, perfil: estado.perfil })`.

### `src/ui/exportar.js`
- Remova `CAMPOS`, `linha()`, `botao()` e o uso de `svg`/`gcode` antigos. **Exportação nova (D8):** SVG por `svgDocumento(pag, doc.papel, doc.canetas)`, G-code por `gcodeDocumento(pag, doc.papel, estado.perfil, { canetas: doc.canetas })`, onde `pag` = a página `estado.doc.paginas[i]` com cada camada reordenada: `{ ...c, tracos: otimizar(c.tracos, 0.1, { ordem: estado.otimizar ? c.ordem : 'escrita' }) }`.
- **`montar(elemento, estado, aoMudar)`** (grupo Máquina, avançado): controles dos PARAMS de `perfis.js` — `zEscrita`, `zLevantada`, `fDesenho`, `fViagem`, `fZ`, `offsetX`, `offsetY`, `mesaX`, `mesaY` — com `estado` de controle `{ ler: () => estado.perfil[chave], gravar: (v) => editar(chave, v), ctx }`; `editar` faz `estado.perfil[chave] = v; estado.perfil.nome = 'personalizado'; estado.perfilNome = 'personalizado';` e grava `localStorage['writer.perfil'] = JSON.stringify(estado.perfil)` (try/catch). Mais os PARAMS de `otimizar.js` (`otimizar`, `trajeto`) via `ligar(estado, 'otimizar', ctx)`/`'trajeto'`; `header` e `footer` em `<textarea>` com fonte mono (`font-family: var(--fonte-mono)`), rótulo `rotulo('header')`, `dica(AJUDA.header)`, gravando como `editar('header', ta.value)`; botão **Restaurar perfil** = `estado.perfil = structuredClone(PERFIS[estado.perfilNome === 'personalizado' ? 'megaS' : estado.perfilNome]); estado.perfilNome = estado.perfil.nome === 'p2s' ? 'p2s' : 'megaS'; removeItem('writer.perfil')` (try/catch) + `aoMudar()`. `ctx` = `() => ({ fontes: estado.fontes, mao: resolver(estado.personagem, estado.variacao || null), escrever: (m, t, o) => amostra(estado.fontes, m, t, o), papel: estado.pagina, perfil: estado.perfil })`. `atualizar()` chama `atualizar()` de cada controle e sincroniza os textareas sem mexer no que está em foco.
- **`montarBarra(elemento, estado, aoMudar)`** (conteúdo do `footer#exportar`): select **perfil** (`controle(P.perfil, { ler: () => estado.perfilNome, gravar: trocar, ctx }, aoMudar)`); resumo `412 traços · 3,2 m` (`g.nTracos` e `g.comprimento/1000` com 1 casa e vírgula; `—` sem doc); um `<span class="erro">` com o motivo de bloqueio; botões **Baixar SVG**, **Baixar G-code** (`class="primario"`) e `<details><summary>Todas as páginas</summary>` com **Todos os SVG** / **Todos os G-code**. Nomes de arquivo `${estado.oficina ?? 'escrita'}-p${n}.svg|gcode` (`n` = página 1-based), `baixar()` como já existe (Blob + `<a download>`, `revokeObjectURL` em 1 s).
  - `trocar(nome)`: `megaS`/`p2s` → `estado.perfil = structuredClone(PERFIS[nome])`; `personalizado` → lê `writer.perfil` (try/catch) e `estado.perfil = mesclarPerfil(salvo)` (sem `salvo` vale `mesclarPerfil(undefined)`); `estado.perfilNome = nome`; `aoMudar()`.
  - **Bloqueio:** `atualizar()` roda `gcodeDocumento` da página atual em `try/catch`. Erro (papel maior que a janela, Z abaixo do piso…) → botões de G-code `disabled` e `.erro` = `Erro: mensagem`. Sem erro, mas `estado.perfil.experimental` **e** algum `g.avisos` contendo `fora da janela` → também `disabled`, `.erro` = `Perfil experimental: há traços fora da janela da máquina.`. Nos outros casos o resumo vem de `g`. Os botões de SVG só ficam `disabled` sem `estado.doc`. "Todos os G-code": gere todas as páginas primeiro; se qualquer uma lançar ou for bloqueada, mostre o erro e **não baixe nada**. (Mudança de comportamento vs. hoje: A4 na Mega S passa a bloquear o G-code; SVG continua liberado.)

### `src/ui/grimorio.js`
Mantenha `estado` (mesmos campos), `CHAVE = 'grimorio.estado'`, `SALVOS`, `salvar()`, `contexto()`, `garantirFontes()`, `painelMagias`, o editor de símbolos (`abrirEditor`, usa `dialog#editor` do `index.html`) e a lógica de composição; tudo isso passa a viver dentro de `export function criar()` (ou ser parametrizado por `estado`), sem `iniciar()`, sem `renderizar()`, sem `$('previa')`/`$('pag-*')`/`$('avisos')`/`$('painel-*')`.
- **`criar()`**: monta `estado` como hoje (incl. `perfil: structuredClone(PERFIS.megaS)`, `perfilNome: 'megaS'`, `oficina: 'scroll'`, `doc: null`), restaura `grimorio.estado` (try/catch, como o início de `iniciar()`), `restaurar(estado)` do `personagem.js` (try/catch) e devolve a instância.
- **`entrar(oficina)`** (async): `estado.oficina = oficina; estado.cfg.porPagina = oficina === 'scroll'`; na primeira vez, `fetch('dados/magias.json')` (try/catch; sem arquivo, o painel oferece importar) e `await garantirFontes()` (erro → `#erro`).
- **`compor()`**: `estado.pagina = folha(estado.folhaNome, estado.paisagem, estado.margem)`; `r = comporGrimorio(estado.selecionadas, contexto(), estado.cfg, estado.pagina)`; guarda `estado.resultado = r`; chama `salvar()`; devolve `{ paginas: r.paginas, avisos: [...linhas "nome: texto completo|resumo, letra de X mm" (uma por magia selecionada, como hoje), ...r.avisos.map((a) => 'Aviso: ' + a)] }`.
- **`grupos`**: **Magias** (`painelMagias`), **Editar magia** (`painelEditar`), **Folha** (`painelFolha`), **Escrita** (`painelEscrita`), **Máquina** (`nivel: 'avancado'`, `pExportar.montar`). Os painéis recebem o `aoMudar` que o shell passa em `montar(el, estado, aoMudar)` (troque o `aoMudar` de módulo por esse parâmetro). `barra: pExportar.montarBarra`.
- **Controles:** `painelFolha`: `papel` (de `documento.js`, com `opcoes` filtradas aos `FOLHAS` — `{ ...P.papel, opcoes: P.papel.opcoes.filter((o) => o.valor in FOLHAS), padrao: 'A6' }`; `ler/gravar` em `estado.folhaNome`, e ao gravar `estado.margem = FOLHAS[estado.folhaNome][2]`), `paisagem`, `margem` (`estado.margem`), e de `scroll.js` `completo`, `tamanho`, `minimo`, `entrelinha`, `sigilo`, `moldura` (ligados a `estado.cfg`). **Some o select "Montagem"** (o hash define `cfg.porPagina`). `painelEscrita`: `cifrarNome/cifrarFicha/cifrarEfeito` (de `scroll.js`, `ler/gravar` em `estado.cfg.cifrar.nome|ficha|efeito`), `chave`, e de `alfabeto.js` `seed`, `curva`, `complexidade` ligados a `estado.estilo`. `painelEditar`: `nivel`, `escola`, `conc`, `ritual` de `alfabeto.js` ligados a `() => estado.selecionadas[estado.atual]` (o `controle` só é mostrado quando há magia, como hoje). Os campos de texto da magia, os seletores de personagem/variação ("Quem escreve"), o select de salvos, busca e botões **não** viram `controle` (fora do contrato de prévia): ficam como estão, só trocando `ajuda('chave', 'texto')` por `dica('texto')`. `ctx` dos controles: `() => ({ ...contexto(), papel: estado.pagina, estilo: estado.estilo, magia: estado.selecionadas[estado.atual] ?? magiaVazia(), escrever: (m, t, o) => amostra({ ...estado.fontes, arcano: gerarAlfabeto(estado.estilo, estado.simbolos.letras) }, m, t, o), perfil: estado.perfil })`.
- O link "Criar ou editar personagens" aponta para `#carta`. O botão "Desenhar símbolos…" e o editor ficam como estão (só tokens no lugar de cor fixa, se houver `style` no JS).

**Verificação:** `npm test` (continua verde; nenhum teste importa `src/ui/`), `npx vite build` (depois que 13-A e 13-B entrarem; se só falharem imports deles, relate). Rode `node --check` equivalente: `node -e "import('./src/ui/texto.js')"` não funciona sem DOM — basta o build.

**NÃO fazer:** mudar `compor`/`comporGrimorio`/`gcode()`/`svg()`; renomear chaves `writer.*`/`grimorio.estado` ou o formato de `SALVOS`; mexer em `index.html`, `app.js`, `controle.js`, `tema.css`; criar materiais novos, camadas ou canetas na UI; reescrever o editor de símbolos; guardar estado em variável de módulo (a instância tem o seu); chamar `ajuda()`; dependência nova.
