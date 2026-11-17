# Ciclo 24 — correção do M20 materiais (devolução 1 do revisor)

Regras comuns: não grave snapshot (nunca `--test-update-snapshots`/`npm run golden`); goldens de `carta` e `livro` VÃO mudar (relate); os demais snapshots NÃO podem mudar. Caneta 0,4 mm; `VAO` como já definido em `notas.js`. Scripts de medição do revisor (consulta): C:\Users\augus\AppData\Local\Temp\claude\d1d77e7611eb9127\56f76b22-91bd-453f-bc05-e77027826f21\scratchpad\probe*.mjs.

## Tarefa 24-A
modelo: sonnet
Arquivos permitidos: `src/materiais/notas.js`, `test/notas.test.mjs`, `test/carta.test.mjs`.

1. **Conector descartado** (`notas.js:87` + `:205`; anotação 27 e diário 42 descartes em 27 composições cada):
   (a) O conector nasce em `xTexto ± VAO`, colado na caixa inflada; o tremor de `mao()` (0,12–0,42 mm) invade a folga e a seta falha quase sempre. Correção: nascer em `VAO + amp + 0.1` (amp = desvio máximo da mão).
   (b) Todos os conectores usam a mesma via vertical `xc` e o mesmo `yM` — duas notas na mesma linha (ou uma empurrada por `fimNota`) sobrepõem o anterior (falha até sem tremor; caso "desce" da folha 1). Correção: alternar o x da via vertical por nota (deslocar ≥ VAO + 0,4 mm por nota já desenhada naquela calha) ou reaproveitar o tronco e desenhar só o ramo novo — escolha o mais simples que zere o descarte.
2. **Laço descartado** 18/18 no preset carta (`notas.js:171`): passa +1,0 mm na horizontal e abre 6% de `a`; precisa ~2,2 mm, mas o vão entre palavras (letra 6 mm) é ~1,6 mm. Correção: limitar `a` e `b` ao vão real até as palavras vizinhas da linha (menos VAO e amp) e trocar `g = 1 + 0.06u` relativo por folga absoluta pequena.
3. **Rabiscos/asterisco sem mão** (`notas.js:237`, `:240`): em `colocar`, aplicar `mao(t, ...)` a cada traço (como as outras marcas).
4. **Correção pequena demais** (`notas.js:150-155`, "hoje" saiu 1,62 mm): na linha 1 usar o espaço livre acima (margem), não `papel.margens.topo`; piso de altura ≈ 0,6·tn — abaixo disso a correção vai para a margem (`fila`).
5. **Teste** (`test/carta.test.mjs:41-62`): a matriz (3 presets × 3 conectores × espontaneo × seeds) passa a exigir ZERO avisos de `descartado` nos presets anotação e diário com os 3 conectores, e laço não descartado no preset carta. Confirme que falha antes da correção.

## Tarefa 24-B
modelo: sonnet
Arquivos permitidos: `src/materiais/livro.js`, `test/livro.test.mjs`.

1. **Texto encosta na borda** (`livro.js:27`): a área de texto = miolo, sem vão; texto x 14,76–90,14 contra vinha 14,31–90,58 (0,45 mm). Correção: com borda ligada, recuar a área de texto em `max(VAO, 0.4·tamanho)` de cada lado com borda. Teste novo: nenhum ponto do texto a menos de 0,8 mm de qualquer ponto da camada iluminura (amostragem).
2. **Teste do reclamo** (`test/livro.test.mjs:37`): conferir o reclamo contra a primeira palavra da página seguinte do PRÓPRIO documento composto (mesma entrelinha/margens), não contra outro `compor`.
3. **Menor**: export por camada do livro — teste que `svgDocumento`/`gcodeDocumento` por camada funciona no livro (1 caso).

## Tarefa 24-C (revisão da UI do M20)
modelo: haiku
Arquivos permitidos: `src/ui/materiais.js`, `src/ui/app.js`, `src/ui/exportar.js`, `e2e/materiais.spec.js`.

1. **Bloqueante** `materiais.js:138` e `:77`: o grupo "Tradição" de Sigilos mostra seed, curva, complexidade e forma, mas só a seed muda a folha. Em `:77`, passar `complexidade: estado.estilo.complexidade` para `comporSigilos`; em `:138`, deixar só `['seed', 'complexidade']`. Teste e2e: mudar complexidade na oficina #sigilos muda o SVG da prévia.
2. `app.js:35`: o texto padrão da carta ganha uma marcação de nota visível, ex.: acrescentar ` {nota: chegar antes do anoitecer}` depois da primeira frase, e um `{_sublinhar_}` numa palavra.
3. `app.js` ordem dos grupos: na oficina #carta, o grupo "Notas" vem logo depois de "Texto" e antes de "Fontes" (ou na posição mais alta possível sem mexer em Personagem).
4. `exportar.js`: rótulos legíveis no select de camada: texto → "texto", notas → "notas", paginacao → "paginação", iluminura → "iluminura", rubrica → "rubrica (vermelha)", moldura → "moldura", sigilo → "sigilo"; id desconhecido mostra o id. E só recriar as opções quando a lista de ids mudar.
Verificação: `npm test`, `npm run build`, e2e completo via config IPv6 temporária (`sed 's#http://localhost:8765/#http://[::1]:8765/#g' playwright.config.js > pw.24c.tmp.config.js && npx playwright test -c pw.24c.tmp.config.js`; apagar depois). Não gravar snapshot.
