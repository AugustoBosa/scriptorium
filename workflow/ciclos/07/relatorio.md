# Ciclo 07 — relatório (M13 parcial)

## npm test
`ℹ tests 100 / ℹ pass 92 / ℹ fail 8`. As 8 falhas são os 8 testes de `test/golden.test.mjs`, todas por "Missing snapshots" (esperado: o orquestrador grava com `npm run golden`). Os 92 anteriores seguem verdes.

## Tarefas
- **07-A (goldens): aceita.** `test/golden.test.mjs`, 8 testes, cada um com `t.assert.snapshot` de conteúdo real: compor (mão neutra A5; mão com variação e 2 fontes, mesa), comporGrimorio (simples; cifrado com chave, A6), sigilo (2 magias), gcode (ordem original; otimizada). Entradas determinísticas (seeds fixas, sem Date/Random), textos pt-BR com acentos, fontes EMSBird e EMSAllure lidas de `fontes/`. `r3` arredonda a 3 casas com `+ 0` (sem -0); `comprimento` do gcode também é arredondado; traços em uma linha cada. Só o arquivo permitido foi criado. Ressalva: o gcode usa só a 1ª página da mão neutra; tamanho total do `.snapshot` a conferir após gravar (alvo < ~200 KB).
- **07-D (pages.yml): aceita.** Idêntico ao brief: push em main + workflow_dispatch, permissions pages/id-token, concurrency pages, npm ci → npm test → npm run build → upload-pages-artifact (dist) → deploy-pages, Node 25. Risco registrado: se o setup-node não achar Node 25, trocar por `lts/*`. Atenção: `npm test` no CI só passa depois que o snapshot for gravado e commitado.

## DoD do M13 comprovado neste ciclo
- Goldens (`compor`, `comporGrimorio`, `sigilo`, `gcode`): testes escritos; só contam como comprovados após gravar e commitar o `.snapshot` (orquestrador).
- `pages.yml` existe com a sequência exigida (verificação final só com push em main).
Faltam: árvore nova (`git mv` + imports), 2-opt adaptativo, `npm run build`/`npm run e2e` verdes após a mudança.

## Próximo passo
Orquestrador: `npm run golden`, conferir tamanho do `.snapshot`, `npm test` verde, commit. Ciclo 08: M13-B (árvore nova, sonnet) e M13-C (2-opt adaptativo, haiku, brief em `workflow/experimentos/otimizar/RESULTADOS.md`).
