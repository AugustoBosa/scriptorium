# Ciclo 14 — correção do M15 (devolução 1 do revisor Fable)

Regras comuns: goldens intactos (nunca `--test-update-snapshots`/`npm run golden`), sem dependência nova, chaves `writer.*`/`grimorio.estado` intactas, sem commit. Verificação final de cada tarefa: `npm test` verde e `npx playwright test` verde.

## Tarefa 14-A
modelo: sonnet
Arquivos permitidos: `src/ui/app.js`, `src/ui/exportar.js`, `src/ui/tema.css`, `index.html`.

1. **Grimório/Scroll sem magia dá "Erro: Cannot read properties of undefined (reading 'camadas')".** Causa: `comporGrimorio` devolve `paginas: []` (`src/materiais/scroll.js:97`); `src/ui/app.js:116` gera doc sem páginas via `deTracos`; `src/ui/exportar.js:29-30` (`paginaOtimizada`) lê `pag.camadas` de `undefined`. Corrigir na raiz em `app.js:116`: usar `r.paginas.length ? r.paginas : [[]]`. Em `exportar.js` (~150-156): com 0 traços, desabilitar "Baixar SVG" e "Baixar G-code" e mostrar no resumo "Nada para plotar ainda" (sem erro). "Baixar SVG" nunca pode lançar ao clicar.
2. **Barra de exportação sem layout** (`exportar.js:144` põe seletor, resumo, erro e botões inline sem espaço; "0,6 m" encosta no botão). Em `src/ui/tema.css` (perto da linha 118):
   - `#exportar > div { display:flex; flex-wrap:wrap; align-items:center; gap:var(--e3) }`
   - `#exportar .controle { margin:0; grid-template-columns:auto 12em 20px }` (o select da máquina não estica 480 px)
   - resumo com `white-space:nowrap; margin-right:auto` (dê uma classe ao resumo em exportar.js se não tiver)
   - `#exportar details { border:0; padding:0 }` ("Todas as páginas" não herda pauta dupla/estilo de título de grupo)
   - no `@media (max-width:800px)` (~linha 175): `footer#exportar { position:static }`.
   - Em 375 px a navegação das oficinas (~linha 178) corta em "Grin" sem indicar rolagem: permitir quebra (`flex-wrap:wrap`) em vez de cortar.
   - Botão primário desabilitado (`tema.css:75`, `opacity:.5`) fica turvo: trocar por cores de token de desabilitado com contraste legível (≥ 3:1 do texto sobre o fundo do botão), sem opacity.
3. **Menores visíveis ao usuário:**
   - `app.js:91`: o aviso "chega no M19–M20" é jargão interno; trocar por "Em breve: esta oficina ainda está em construção."
   - `index.html:17` + `app.js:207-208`: o botão de tema troca o texto E o `aria-pressed`; manter só o texto que diz o tema de destino ("Vela"/"Claro") e remover `aria-pressed`.

## Tarefa 14-B
modelo: haiku
Arquivos permitidos: `e2e/visual.spec.js`, `src/ajuda.js`, `test/ajuda.test.mjs` (só se um teste citar rótulo alterado).

1. **A captura do popover não prova nada**: `page.screenshot({ fullPage: true })` (`e2e/visual.spec.js:13`) dispara `resize`, e `src/ui/controle.js:153` fecha o popover no `resize`. No teste "avançado com popover aberto" (~linhas 24-30): capturar SEM `fullPage` e, depois da foto, assertar: `await expect(page.locator(':popover-open')).toHaveCount(1)`, `#previa-viva path` com contagem ≥ 3 (confira o seletor real em `src/ui/controle.js`; use o id/classe que o popover usa para a amostra) e o texto "padrão" visível no popover.
2. Nas capturas das oficinas, trocar `fullPage: true` por captura de viewport, com o viewport do teste em 1280×900 (`page.setViewportSize`), para a barra sticky não aparecer atravessando a folha. Mantenha os nomes de arquivo das capturas.
3. Em `src/ajuda.js` `ROTULOS`: tirar a unidade entre parênteses dos rótulos que já mostram a unidade no valor (ex.: "inclinação (graus)" → "inclinação", "espaçamento (em)" → "espaçamento", "tremor (mm)" → "tremor"; faça para todos os que tiverem unidade entre parênteses). Não mude chaves nem AJUDA.

Verificação: `npm test` verde; `npx playwright test e2e/visual.spec.js` verde (14-A roda em paralelo em src/ui; se falhar por arquivo dela, relate).
