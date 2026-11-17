# Ciclo 20 — correção do M18 (devolução 1 do revisor)

Regras comuns: não grave snapshot (nunca `--test-update-snapshots`/`npm run golden`). Os goldens de ornamento VÃO mudar (vinha, borda com vinha, capitular, no): deixe falharem e relate quais — o orquestrador regrava depois da revisão, com motivo. Goldens do motor (`test/golden*.snapshot`) NÃO podem mudar. Invariantes do DoD continuam: determinístico, dentro da caixa, sem NaN, sem traço < 2 pontos, `geo.problemas()` limpo, `test/params.test.mjs` verde. Caneta de referência: 0,4 mm.

## Tarefa 20-A
modelo: sonnet
Arquivos permitidos: `src/ornamento/vinha.js`, `test/vinha.test.mjs`.

1. **Bloqueante** `vinha.js:36-45,84` — a vinha morre cedo em tira estreita. Causa: atratores sorteados ao acaso deixam vãos > ALCANCE (10·D); o `break` global da linha 84 encerra a vinha inteira no primeiro vão sem atrator; o teto de 1500 (linha 40) conta pontos antes de `dentro()` (só ~14% caem nas tiras).
   Correção: atratores em grade com jitter (célula = 2,5·D/√densidade, jitter ≤ 0,4·célula, sem vãos); aplicar o teto DEPOIS do filtro `dentro()`; quando um nó trava (posição repetida), descartar os atratores dele em vez de parar tudo.
   Meta medível (teste novo): tira 130×6,7 mm com densidade 0,5 → comprimento total de ramo ≥ 300 mm (hoje 28 mm); a vinha alcança as duas pontas da tira (algum ponto a ≤ 10 mm de cada extremidade).
2. **Menor** `vinha.js:89-101`: descartar ramo com comprimento < 3·D (vira "tiquinho" reto sem enfeite).

## Tarefa 20-B
modelo: sonnet
Arquivos permitidos: `src/ornamento/no.js`, `src/ornamento/capitular.js`, `test/no.test.mjs`, `test/capitular.test.mjs`, `workflow/ciclos/19/especimes.mjs`.

1. **Bloqueante** `capitular.js:75` — a habitada usa a raiz padrão `[x+E/2, y+a−E/2]`, que cai no halo da letra ("A", "M" → `vinha` devolve `[]`). Correção: raiz = ponto do contorno/traços da letra (`O`) mais próximo do canto inferior esquerdo, deslocado para fora por uma folga (a vinha nasce da letra). Teste: habitada com "A", "M", "Q", "É" sempre tem ramos de vinha (traços além da letra e da moldura) com comprimento total ≥ 0,5 × perímetro da caixa interna. (A vinha mais densa vem da 20-A em paralelo; seu teste deve passar com a vinha atual também — se não, relate o valor medido.)
2. **Bloqueante** `no.js:73-74` — fita e vão são frações da célula, sem piso pela caneta. Correção: fita < 0,8 mm vira linha simples (fio único); vão ≥ 0,4 mm sempre. No estilo `no` da capitular (`capitular.js:80-82`, `celulas: 6` fixo): número de células = max(2, floor(lado / 4 mm)) (célula ≥ ~4 mm). Teste: faixa 60×8 com `celulas: 4` → nenhum par de fios paralelos com distância < 0,4 mm (amostre pontos); capitular `no` 15 mm usa células ≥ 4 mm.
3. **Bloqueante** `capitular.js:23` — `contornar` usa d = 0,03·a sem piso. Correção: d ≥ 0,4 mm; se a letra for pequena demais para isso (d > 0,06·a), desenhar sem contorno (como lombarda). Teste: filigranada/contornada a 15 mm tem d ≥ 0,4.
4. Menores: `no.js:17` — explicar na ajuda de `aro` que aro 2 com poucas células deixa o miolo pequeno. `especimes.mjs`: tirar HersheyScript1 e EMSDelight da linha de fontes da capitular.
