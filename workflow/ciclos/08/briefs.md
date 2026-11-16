# Ciclo 08 — M13 Fundação — briefs

Estado: branch `expansao`, Node 25, `npm test` 100/100 (92 antigos + 8 goldens gravados em `test/golden.test.mjs.snapshot`). Uma tarefa só. Não faça commit, não instale pacotes, NUNCA use `--test-update-snapshots`.

## Tarefa 08-C — 2-opt adaptativo (modelo: haiku)

**Pode editar:** `src/exportar.js` (somente a função `otimizar` e o comentário `ponytail:` dela) e `test/exportar.test.mjs` (só acrescentar um teste). Mais nada. Não toque em `test/golden.test.mjs` nem no `.snapshot`.

**Contexto:** hoje `otimizar(tracos, tol = 0.1)` faz guloso + 2-opt, e o laço interno é limitado por `i + 50`. A decisão (já tomada, não reabrir; ver `workflow/experimentos/otimizar/RESULTADOS.md`): 2-opt COMPLETO até 2.000 traços, janela 50 acima disso (o completo é O(n²): 2.465 traços ~2,2 s, 7.600 ~30 s).

### Mudança em `src/exportar.js`
1. Nova assinatura: `export function otimizar(tracos, tol = 0.1, { janela } = {})`.
2. Depois de montar `seq` pelo guloso e antes dos laços 2-opt, calcule uma vez: `const J = janela ?? (seq.length <= 2000 ? Infinity : 50);`
3. No laço interno troque `Math.min(seq.length, i + 50)` por `Math.min(seq.length, i + J)` (com `J = Infinity`, `i + J` é `Infinity` e `Math.min` devolve `seq.length`; está correto).
4. Atualize o comentário `ponytail:` acima da função. Texto sugerido: `// ponytail: guloso + 2-opt; completo até 2000 traços, janela de 50 acima (custo O(n²): 2465 traços ~2 s, 7600 ~30 s, travaria a prévia); até 5 passadas; Or-opt se a viagem ainda pesar`.
5. Mais nada muda: `tol`, fusão final, não mutação da entrada, descarte de traços de 1 ponto ficam iguais.

### Teste novo em `test/exportar.test.mjs` (um `test`, junto dos de `otimizar`)
Nome: `'otimizar 2-opt completo (padrão ≤ 2000 traços) não é pior que janela 50'`. Gere ~300 traços aleatórios com o mesmo gerador congruencial já usado no teste "otimizar 2-opt: nunca pior..." (`let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;`), cada traço `[a, [a[0] + r() * 8, a[1] + r() * 8]]` com `a = [r() * 200, r() * 200]`. Então:
```js
const completo = otimizar(x, 0);                      // padrão: 300 traços → janela infinita
const janela50 = otimizar(x, 0, { janela: 50 });
assert.ok(viagem(completo) <= viagem(janela50) + 1e-9);
assert.ok(viagem(janela50) <= viagem(x));
assert.equal(completo.flat().length, 600);            // preserva os pontos (tol 0 não funde)
```
Se `viagem(completo) <= viagem(janela50)` falhar por pouco (2-opt é busca local, não garantia), NÃO afrouxe a asserção: troque a seed (11 → 12, 13...) e relate que trocou; se falhar em 3 seeds, pare e relate os números.

### Medição (NÃO vira teste; sem teste lento no suite)
Escreva um script descartável FORA do repo, em `C:\Users\augus\AppData\Local\Temp\claude\d1d77e7611eb9127\56f76b22-91bd-453f-bc05-e77027826f21\scratchpad\medir.mjs`, que importa `otimizar`/`viagem` de `src/exportar.js` por caminho `file:///` absoluto, gera ~2.465 traços aleatórios (traços curtos em 210×297) e imprime o tempo em ms de `otimizar(x)` com 2.465 traços (acima de 2.000, usa janela 50) e com 1.500 traços (completo). Relate os tempos. Esperado: ~300 ms para 2.465; ≲1 s para 1.500. Se 1.500 traços passar de ~3 s, relate (o limiar pode precisar descer).

### Goldens — ATENÇÃO
O golden `golden gcode: ordem otimizada` usa `otimizar` sobre poucos traços (bem abaixo de 50), então NÃO deve mudar. Rode `node --test` completo. Se algum golden falhar: NÃO atualize snapshot; relate qual falhou e, com um script descartável, a viagem antiga (`otimizar(x, 0.1, { janela: 50 })`) versus a nova (padrão) para a mesma entrada (deve ser nova ≤ antiga), e PARE.

### Verificação
`node --test test/exportar.test.mjs` verde; depois `node --test` na raiz: esperado 101 pass / 0 fail. Relatório: diff resumido de `otimizar`, resultado dos dois comandos, tempos medidos.

### NÃO fazer
Não mexer em `gcode`, `svg`, `viagem`, `PERFIL_PADRAO`; não renomear nem mover nada (a árvore nova é o ciclo 09); não editar `workflow/DOD.md`, `QUADRO.md`, `RESULTADOS.md`; não fazer push; o passo 5 de RESULTADOS.md não se aplica.

DESPACHAR: 08-C
