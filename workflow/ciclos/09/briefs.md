# Ciclo 09 — M13 Fundação — briefs

Pré-requisito: ciclo 08 aceito e commitado (08-C mexe em `src/exportar.js`). Uma tarefa. Não faça commit.

## Tarefa 09-B — mover para a árvore nova (modelo: sonnet)

**Pode:** `git mv`, criar `src/maquina/otimizar.js`, e editar linhas de `import` nos arquivos listados abaixo. **Mudança de comportamento: NENHUMA.** Não commite, não instale pacotes, NUNCA use `--test-update-snapshots`; `test/golden.test.mjs.snapshot` deve passar intacto. Os arquivos de teste mantêm os nomes.

### Mapa de movimentos (decisão do orquestrador, usar literalmente)
| De | Para |
|---|---|
| `src/mao.js` | `src/motor/mao.js` |
| `src/arcano.js` | `src/arcano/alfabeto.js` (arquivo inteiro; `sigilo`, `moldura`, `cifrar`, `gerarAlfabeto`, `LETRAS`, `CAIXA` ficam nele) |
| `src/scroll.js` | `src/materiais/scroll.js` |
| `src/exportar.js` | DIVIDIR: `git mv src/exportar.js src/maquina/gcode.js` e extrair `viagem` e `otimizar` para novo `src/maquina/otimizar.js` |
| `src/ui-X.js` (catalogo, exportar, fontes, grimorio, personagem, texto) | `src/ui/X.js` (ex.: `ui-grimorio.js` → `ui/grimorio.js`) |

Ficam onde estão: `rng, svgpath, fonte, personagem, catalogo, magia, ajuda, layout` (todos em `src/`).

### Divisão de `exportar.js`
- `src/maquina/gcode.js` mantém: `PERFIL_PADRAO`, `gcode`, `svg` e os helpers que eles usam.
- `src/maquina/otimizar.js` recebe: `viagem`, `otimizar` (com a assinatura `otimizar(tracos, tol = 0.1, { janela } = {})` e o comentário `ponytail:` do ciclo 08, exatamente como estão) e os helpers `valido`, `dist` de que precisam.
- Helpers usados pelos dois (`valido`, `dist`): NÃO crie terceiro arquivo; deixe cópia de uma linha em cada um, idêntica, com o comentário `// ponytail: duplicado de propósito; unificar em geo.js no M18`. Remova de `gcode.js` apenas o que ficar sem uso.
- NENHUM reexport: `src/exportar.js` deixa de existir. Quem usava `{ PERFIL_PADRAO, svg, otimizar, gcode, viagem }` passa a importar de dois módulos: `PERFIL_PADRAO, svg, gcode` de `maquina/gcode.js`; `otimizar, viagem` de `maquina/otimizar.js`.

### Imports a corrigir (confira com grep ao final: zero restos)
- `src/layout.js` e `src/personagem.js`: `./mao.js` → `./motor/mao.js`.
- `src/arcano/alfabeto.js` e `src/motor/mao.js`: `./rng.js` → `../rng.js`.
- `src/materiais/scroll.js`: `./layout.js`, `./magia.js` → `../layout.js`, `../magia.js`; `./mao.js` → `../motor/mao.js`; `./arcano.js` → `../arcano/alfabeto.js`.
- `src/ui/*.js` (6 arquivos): módulos que ficaram em `src/` ganham `../` (`../ajuda.js`, `../catalogo.js`, `../fonte.js`, `../layout.js`, `../personagem.js`, `../magia.js`); os movidos usam o caminho novo (`../motor/mao.js`, `../arcano/alfabeto.js`, `../materiais/scroll.js`, `../maquina/gcode.js`, `../maquina/otimizar.js`); entre si viram `./catalogo.js`, `./personagem.js`, `./exportar.js`. Cuidado: dentro de `src/ui/`, `./personagem.js` é o da UI e o do domínio é `../personagem.js`; `ui/grimorio.js` importa os dois, confira cada linha.
- `index.html` (linhas ~98–104) e `grimorio.html` (linha ~100): `./src/exportar.js` (dividir em dois imports), `./src/ui-X.js` → `./src/ui/X.js`.
- `test/*.test.mjs` (incluindo `golden.test.mjs`): ajuste só as strings de import. `exportar.test.mjs` importa `{ PERFIL_PADRAO, svg, otimizar, gcode, viagem }`: divida em dois imports. Leituras de `fontes/` e `arquivo/vpype.toml` por `new URL('../', import.meta.url)` continuam como estão.
- `scripts/gerar-magias.mjs`, `ilustracoes/nivel-bandeja/build.mjs`, `workflow/experimentos/otimizar/comparar.mjs` e `comparar-svg.mjs`: corrigir imports de `mao`/`exportar`/`arcano`/`scroll` (o `build.mjs` e os `comparar*.mjs` importam `exportar.js` e `mao.js`; os `comparar*.mjs` usam `await import(P + 'src/...')`).
- `e2e/`, `vite.config.js`, `playwright.config.js`, `package.json`: não deveriam citar esses caminhos; confirme com grep e só mexa se citarem.
- `README.md` e `test/ui-smoke.md`: troque caminhos antigos apenas se for substituição direta de nome de arquivo; sem reescrever prosa.

### Como proceder
1. `mkdir -p src/motor src/arcano src/materiais src/maquina src/ui`; `git mv` na ordem da tabela; extrair `otimizar.js`.
2. Corrigir imports. Ao final, este grep deve voltar vazio:
   `grep -rnE "(from|import\()\s*['\"].*/(mao|arcano|scroll|exportar|ui-[a-z]+)\.js" index.html grimorio.html src test scripts e2e ilustracoes workflow/experimentos --include=*.js --include=*.mjs --include=*.html` (confira à mão que os resultados restantes, se houver, apontam para os caminhos novos `motor/mao.js`, `arcano/alfabeto.js`, `materiais/scroll.js`, `maquina/...`, `ui/...`).
3. Regra dura da arquitetura: fora de `src/ui/`, nada de DOM, `import.meta.glob`, `?raw` ou import de CSS (já é verdade; não introduza).

### Verificação (todos verdes)
- `npm test`: mesma contagem do ciclo 08 (101 pass / 0 fail), goldens intactos.
- `npm run build`: gera `dist/` com `index.html`, `grimorio.html` e `dist/fontes/`.
- `npm run e2e`: verde (4/4).
- `git status --short` mostra renames (R) e só os arquivos esperados; nenhum `.snapshot` alterado.
Relate: saída resumida dos três comandos, lista dos arquivos movidos e o resultado do grep final.

### NÃO fazer
Não renomear funções nem exports; não reorganizar `rng/svgpath/fonte/personagem/catalogo/magia/ajuda/layout`; não criar `documento.js`, `perfis.js` nem outros arquivos da arquitetura-alvo (são do M14+); não editar goldens; não commitar; não apagar `grimorio.html` (vira redirect só no M15).
