# Ciclo 17 — correção do M16 (devolução 1 do revisor Fable)

## Tarefa 17-A
modelo: sonnet
Arquivos permitidos: `src/layout.js`, `src/motor/contexto.js`, `src/motor/escrita.js`, `src/personagem.js`, `test/motor-dod.test.mjs`.
Regras: goldens intactos (`test/golden.test.mjs.snapshot`, `test/golden-layout.test.mjs.snapshot`; nunca `--test-update-snapshots`/`npm run golden`); com params neutros nada muda.

1. **Bloqueante** — `src/layout.js:138` (com o recuo de `:68-70` e `:79`): com `deriva > 0`, palavra que cabe na coluna mas não em "coluna − recuo" entra no `while` (antes só para obstáculo) e pula linhas até sortear recuo pequeno. Medido (revisor): só `deriva: 1`, A5, `colunas: 3`, 6 mm, seeds 3 e 11 → 2 páginas viram 40 e 47, com linhas vazias.
   Correção (testada pelo revisor): `vaga()` devolve também `d` (o recuo aplicado) nos dois `return`; em `:138`, antes do `while` e a cada volta dele: `if (w.largura > v.W && w.largura <= v.W + v.d) { v.x0 -= v.d; v.W += v.d; }` (a linha abre mão do recuo).
2. Teste novo em `test/motor-dod.test.mjs`: `compor` com mão neutra + `deriva: 1`, `PAGINAS.A5`, `{ tamanho: 6, colunas: 3 }`, texto longo (~150 palavras), seeds 3 e 11: mesmo número de páginas que a mão neutra (sem deriva) e nenhuma linha vazia — entre âncoras consecutivas da mesma coluna/página, o salto de y nunca passa de 1,5 × a entrelinha usada (confira o nome da opção/valor da entrelinha em layout.js). Confirme que o teste FALHA antes da correção (rode antes de corrigir) e passa depois.
3. Teste de tinta com `CHEIA` (definida em `motor-dod.test.mjs`): `compor` de ~60 palavras, tremor 0: todo ponto de cada palavra com `x` em `[a.x − 0.3*tamanho − margemInclinação, a.x + a.l + 0.3*tamanho + margemInclinação]`, onde `margemInclinação = tamanho * tan(6°)` (deriva máx. ±6°). Se falhar por defeito do motor, relate em vez de afrouxar.
4. `src/motor/contexto.js:8`: `ARREMATE` 0.35 → 0.18. Se a saída do arremate ainda subir mais que a altura-x, achatar a saída íngreme em `:98-101` (usar metade do `dy`). A faixa do parâmetro (0–1) não muda.
5. `src/motor/escrita.js:6`: `TREMOR_FADIGA` 0.04 → 0.02.
6. `src/personagem.js:46`: `const [a, b]` sombreia `b` de fora; renomear para `[lo, hi]`.

Verificação: `npm test` verde, goldens intactos (`git diff --stat test/*.snapshot` vazio). Relate o nº de páginas dos seeds 3 e 11 antes/depois.
