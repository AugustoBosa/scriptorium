# Ciclo 15 — golden extra antes do motor (M16)

## Tarefa 15-A
modelo: haiku
Arquivo permitido: `test/golden-layout.test.mjs` (novo; só ele).

Objetivo: proteger `compor` (src/layout.js) antes de o M16 trocar a escrita por palavra. Copie de `test/golden.test.mjs` o carregamento de fontes (`carregar`, EMSBird e EMSAllure), o `r3` e o `linhas` (copie literalmente, não importe). Use `t.assert.snapshot({ paginas: linhas(r.paginas), avisos: r.avisos, fim: r3(r.fim), ancoras: r3(r.ancoras) })`. Confira em src/layout.js o nome exato do campo de âncoras devolvido por `compor` e use-o.

Casos (4 testes, cada um com seed fixa):
1. Multipágina: texto de ~250 palavras pt-BR com acentos (gere com uma frase fixa repetida, ex. `'A neblina cobre Barovia e o castelo espera por você, viajante. '.repeat(25)`), `PAGINAS.A6`, `{ tamanho: 6 }`, mão neutra seed 7 EMSBird → deve dar ≥ 3 páginas (asserte `r.paginas.length >= 3` antes do snapshot).
2. Justificado: mesmo texto curto de 3 parágrafos separados por `\n\n`, `PAGINAS.A5`, `{ tamanho: 5, alinhamento: 'justificado' }` (confira o nome exato da opção de alinhamento em src/layout.js e os valores aceitos).
3. Palavra longa: `'Anticonstitucionalissimamente inconstitucionalíssimo ' + 'paralelepípedo '.repeat(5)`, `PAGINAS.A8`, `{ tamanho: 6 }` → força quebra de palavra.
4. Mão com variação (copie `maoVar` de golden.test.mjs), texto do caso 2, `PAGINAS.A5`, `{ tamanho: 5, alinhamento: 'centro' }` (nome exato conforme layout.js).

NÃO grave snapshot: nunca rode `--test-update-snapshots`/`npm run golden`. Esperado: `node --test test/golden-layout.test.mjs` falha só por "Missing snapshots". Confira com um script descartável no scratchpad (C:\Users\augus\AppData\Local\Temp\claude\d1d77e7611eb9127\56f76b22-91bd-453f-bc05-e77027826f21\scratchpad) que a saída é estável entre 2 execuções e que o total serializado fica < 250 KB (se passar, reduza o texto do caso 1, mantendo ≥ 3 páginas).
