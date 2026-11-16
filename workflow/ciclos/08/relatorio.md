# Ciclo 08 — relatório (M13: 2-opt adaptativo)

`npm test` (rodado na revisão, depois dos ciclos 08 e 09): tests 101 / pass 101 / fail 0.

## 08-C: ACEITA
- `otimizar(tracos, tol = 0.1, { janela } = {})` com `const J = janela ?? (seq.length <= 2000 ? Infinity : 50)` e laço interno `i + J` (hoje em `src/maquina/otimizar.js`, depois do ciclo 09). Comentário `ponytail:` atualizado (limiar 2000, custo O(n²), motivo).
- Teste novo em `test/exportar.test.mjs`: 300 traços com seed fixa; `viagem(completo) <= viagem({janela:50})`, `viagem(janela50) <= viagem(x)`, 600 pontos preservados. Verde.
- Goldens intactos (o `gcode otimizado` usa poucos traços).
- Tempos de A4 (2.465 traços): não conferi na revisão; fica como medição opcional do orquestrador.

## DoD do M13 comprovado
- 2-opt adaptativo e "viagem nova ≤ antiga": teste acima.
- Goldens gravados e verdes (`test/golden.test.mjs`, 8 testes).

Pendentes (orquestrador): `npm run build`, `npm run e2e`, push do `pages.yml`.
