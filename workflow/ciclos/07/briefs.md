# Ciclo 07 — M13 Fundação — briefs

Estado do repo: branch `expansao`, Node v25.8.1, `npm test` = `node --test`. Duas tarefas em paralelo, arquivos disjuntos.
Regra geral: não faça commit, não instale pacotes, não toque em nada além dos arquivos listados, não grave snapshots.

## Tarefa 07-A — goldens (modelo: haiku)

**Pode criar:** `test/golden.test.mjs` (somente ele). Não edite `src/`, nem outros testes, nem `package.json`.

**Objetivo:** snapshots de caracterização (`t.assert.snapshot`, Node 25) das saídas atuais de `compor`, `comporGrimorio`, `sigilo` e `gcode`, para detectar qualquer mudança de saída quando o código for movido ou alterado nos marcos seguintes.

**REGRA CRÍTICA sobre snapshots:** quem grava o arquivo de snapshot é o orquestrador, não você. NUNCA rode com `--test-update-snapshots` e NUNCA crie ou edite arquivos `.snapshot`. Ao rodar `node --test test/golden.test.mjs` é ESPERADO falhar por snapshot ausente (isso é sucesso para você, desde que o erro seja só esse). Para conferir que o teste funciona de verdade, use um script descartável FORA do repo, em `C:\Users\augus\AppData\Local\Temp\claude\d1d77e7611eb9127\56f76b22-91bd-453f-bc05-e77027826f21\scratchpad\conferir.mjs` (importe de caminhos absolutos do repo ou use `file:///` URLs). O script monta as mesmas entradas e imprime: tamanho em KB de cada saída serializada, nº de traços, e se duas execuções seguidas (e dois processos `node` distintos) dão string idêntica. Nada dele entra no repo.

### Esqueleto do arquivo

```js
import fs from 'node:fs';
import { test } from 'node:test';
import { parseFonte } from '../src/fonte.js';
import { NEUTRA } from '../src/mao.js';
import { compor, PAGINAS } from '../src/layout.js';
import { normalizar } from '../src/magia.js';
import { gerarAlfabeto, sigilo } from '../src/arcano.js';
import { comporGrimorio, folha } from '../src/scroll.js';
import { gcode, otimizar } from '../src/exportar.js';

const raiz = new URL('../', import.meta.url);
const carregar = (nome) => parseFonte(fs.readFileSync(new URL(`fontes/${nome}.svg`, raiz), 'utf8'), nome);
const fontes = { EMSBird: carregar('EMSBird'), EMSAllure: carregar('EMSAllure') }; // 2 fontes reais

// Arredonda todo número a 3 casas, recursivamente. "+ 0" troca -0 por 0.
const r3 = (v) => Array.isArray(v) ? v.map(r3)
  : typeof v === 'number' ? Math.round(v * 1000) / 1000 + 0
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, r3(v[k])]))
  : v;
// Uma linha por traço: legível no .snapshot e estável.
const linhas = (pags) => pags.map((p, i) => `pagina ${i}\n` + r3(p).map((t) => JSON.stringify(t)).join('\n')).join('\n');
```

Formas de dados: `compor` devolve `{ paginas, avisos, fim }`; `paginas` = array de páginas, cada página = array de traços, traço = array de `[x, y]` em mm. `comporGrimorio` devolve `{ paginas, avisos, modos }` com a mesma forma de `paginas`. `sigilo(m, seed)` devolve um array de traços em `[-1, 1]`. Use `linhas(...)` para `paginas` (ou `linhas([sigiloTracos])` para o sigilo) e `JSON.stringify(r3(...))` para `avisos`/`modos`/`fim`. Cada snapshot é uma string (ou um objeto simples de strings); evite passar arrays enormes de números para o serializador.

### Casos (um `test(nome, (t) => { t.assert.snapshot(...) })` cada)

1. **compor, mão neutra** (como em `test/layout.test.mjs`):
   ```js
   const mao = { ...NEUTRA, seed: 7, base: [{ fonte: 'EMSBird', peso: 1 }] };
   const r = compor('Coração de pão\nação, não é São João', fontes, mao, PAGINAS.A5, { tamanho: 6 });
   ```
   Snapshot: `{ paginas: linhas(r.paginas), avisos: r.avisos, fim: r3(r.fim) }`.
2. **compor, mão com variação e duas fontes**:
   `{ ...NEUTRA, seed: 3, base: [{ fonte: 'EMSBird', peso: 1 }, { fonte: 'EMSAllure', peso: 1 }], pressa: 0.5, tremor: 0.3, variacao: 0.5, desleixo: 0.3, inclinacao: 5 }`, texto `'Aqui está o óleo.\n\nÀ noite, vovó ouviu.'`, `PAGINAS.mesa`, `{ tamanho: 5 }`. Mesmo formato de snapshot.
3. **comporGrimorio** — copie a montagem de `test/grimorio.test.mjs`: o objeto `bruta` (Fireball, linhas 10–20 daquele arquivo) com `entries` reduzido para `['Each creature takes {@damage 8d6} fire damage. '.repeat(2), { type: 'list', items: ['um {@condition prone|PHB|caído}'] }]`, e `const bola = normalizar(bruta, 'fireball-phb', { nome: 'Bola de Fogo', resumo: 'Explosão de chamas.' })` (`normalizar` vem de `../src/magia.js`). Contexto:
   ```js
   const ctx = { fontes: { EMSBird: fontes.EMSBird, arcano: gerarAlfabeto({ seed: 3 }) },
     mao: { ...NEUTRA, base: [{ fonte: 'EMSBird', peso: 1 }] },
     maoArcana: { ...NEUTRA, base: [{ fonte: 'arcano', peso: 1 }] }, seed: 1 };
   comporGrimorio([bola], ctx, { tamanho: 3 }, folha('A6'))
   ```
   Snapshot: `{ paginas: linhas(r.paginas), avisos: r.avisos, modos: JSON.stringify(r3(r.modos)) }`.
4. **comporGrimorio cifrado com chave**: mesma `ctx`, cfg `{ cifrar: { nome: true, ficha: true, efeito: true }, chave: true, completo: 'nao' }`, `folha('A6')`. Mesmo formato.
5. **sigilo**: `sigilo(bola, 1)` e `sigilo({ ...bola, id: 'outra', nivel: 0, conc: false, ritual: false }, 2)` (dois testes ou um com dois campos). Snapshot: `linhas([sigilo(...)])`.
6. **gcode, ordem original**: `const tracos = compor('Olá, mundo', fontes, mao, PAGINAS.mesa, { tamanho: 6 }).paginas[0]` (`mao` do caso 1); `const g = gcode(tracos, PAGINAS.mesa)`. Assinatura: `gcode(tracos, pagina, perfil = PERFIL_PADRAO)` → `{ texto, nTracos, comprimento, avisos }`. Snapshot: `{ texto: g.texto, nTracos: g.nTracos, comprimento: Math.round(g.comprimento * 1000) / 1000, avisos: g.avisos }`.
7. **gcode otimizado**: o mesmo, com `gcode(otimizar(tracos), PAGINAS.mesa)`.

Não passe um perfil: o `PERFIL_PADRAO` é o que queremos congelar. Nomes dos `test(...)` descritivos e únicos (o nome vira a chave do snapshot).

### Estabilidade e tamanho
- Nada de `Date`, `Math.random`, nem iteração sobre `Map`/`Set` sem ordem fixa. `mao.seed` e `ctx.seed` já tornam tudo determinístico; confirme no script descartável.
- Alvo: soma de todos os snapshots < ~200 KB. Meça somando `.length` das strings. Se passar, REDUZA A ENTRADA (menos texto, `folha('A7')`, `tamanho` maior), não resuma a saída: queremos o conteúdo inteiro arredondado.
- Se a chave de mão tiver nome errado, confira `NEUTRA` no topo de `src/mao.js` (`base seed inclinacao largura altura espacamento espacoPalavra idio pressa capricho tremor queda compressao variacao desleixo`).

### Verificação
`node --test test/golden.test.mjs` — esperado: falha só por snapshot ausente (cole a mensagem exata no relatório). Não use `--test-update-snapshots`. `node --test test/layout.test.mjs test/grimorio.test.mjs test/exportar.test.mjs` continua verde. No relatório final: tamanho total estimado, confirmação de estabilidade (execuções iguais), lista dos testes criados.

### NÃO fazer
Não gravar snapshots; não alterar `src/`, `package.json` ou outros testes; não usar `deepEqual` contra literais gigantes; não tirar acentos das entradas; não importar nada de `src/ui/` ou DOM.

---

## Tarefa 07-D — workflow do GitHub Pages (modelo: haiku)

**Pode criar:** `.github/workflows/pages.yml` (somente ele; a pasta não existe, crie). Não toque em mais nada.

**Fatos:** projeto `type: module`; scripts `npm test` (`node --test`) e `npm run build` (`vite build` → `dist/`, com `base: './'`, inclui `dist/fontes/`). Existe `package-lock.json` (use `npm ci`). Playwright/e2e NÃO entra neste workflow. Branch principal: `main`.

**Decisão de Node:** `node-version: 25`. Justificativa: os goldens (`t.assert.snapshot`) dependem do formato do Node; o desenvolvimento local é v25.8.1, então o CI usa a mesma major para não dar falso negativo. `actions/setup-node@v4` aceita `25`. Se o orquestrador constatar "Node 25 not found" no primeiro run, trocar por `lts/*` e registrar o risco de divergência nos goldens.

**Conteúdo exigido (escreva exatamente esta estrutura):**

```yaml
name: Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 25
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Verificação:** o Actions não roda localmente. Confirme que o arquivo existe, usa 2 espaços e não tem tabs (`grep -nP '\t' .github/workflows/pages.yml` não acha nada). Se houver `python` com `yaml`, valide com `yaml.safe_load`; senão pule.

**NÃO fazer:** não adicionar e2e/Playwright; não mexer em `vite.config.js`; não criar outros arquivos; não commitar.

DESPACHAR: 07-A, 07-D
