# Experimento: ordem dos traços (guloso, 2-opt, algoritmo genético)

Data: 2026-11-08. Objetivo: escolher como `otimizar` (`src/exportar.js`) ordena os traços para a caneta andar menos no ar.
Métrica: **viagem no ar** em mm (soma das distâncias fim de um traço → início do próximo, partindo de (0,0)). A 6000 mm/min, 10.000 mm = 100 s.

## DECISÃO (a aplicar na próxima sessão)

**Adotar a regra adaptativa em `otimizar`:**
- até **2.000 traços**: 2-opt **completo** (sem janela);
- acima de 2.000 traços: 2-opt com **janela de 50** (como está hoje).

Motivo: o completo ganha 2% a 10% de viagem a mais e leva no máximo ~1 s até 2.000 traços; acima disso ele passa de 6 s (17 s com 5.700 traços, 30 s com 7.600) e trava a prévia/exportação.
Algoritmo genético **descartado** (pior que o guloso em todos os testes; o semeado empata com o guloso e gasta 15–30 s).

### Como aplicar (passo a passo)
1. Em `src/exportar.js`, função `otimizar`, o laço interno hoje é `for (let j = i; j < Math.min(seq.length, i + 50); j++)`. Trocar o `50` por uma variável `janela = seq.length <= 2000 ? Infinity : 50` calculada uma vez antes dos laços. Atualizar o comentário `ponytail:` (diz "janela de 50 traços e até 5 passadas"): citar o limiar 2000 e o motivo.
2. Teste novo em `test/exportar.test.mjs`: com ~300 traços aleatórios (rng com seed, como o teste existente), `viagem(otimizar(x))` com janela completa ≤ viagem com janela 50. Isso exige expor a janela: opção `otimizar(tracos, tol = 0.1, { janela })` com padrão adaptativo; o teste chama com `{ janela: 50 }` e com o padrão.
3. `node --test` verde (hoje 81 pass).
4. Medir de novo com `comparar.mjs` (ver abaixo): A4 6 mm cheia (2.465 traços) deve ficar na faixa de janela 50 (acima do limiar) → ~300 ms; confirmar que o limiar 2.000 não cria salto estranho. Se 2.465 traços com janela completa levar ~2 s e o usuário aceitar, subir o limiar para 2.500.
5. Atualizar `workflow/QUADRO.md` (ciclo 07), `workflow/DOD.md` (linha do M10 sobre 2-opt) e commit + push.

## Resultados

Cada linha: viagem em mm (tempo de cálculo). "Volume" = fração dos traços do desenho (fatia seguida na ordem original). Algoritmos genéticos com 15 s (mapas) ou 30 s / 20 s (texto / Tarokka) de orçamento, população 60, torneio 3, cruzamento OX, mutação por troca/inversão/virar traço, elitismo 2.

### A4 cheia de texto (EMSBird, 6 mm, entrelinha 1,5; 2.465 traços no total)

| Volume | Traços | Original | Guloso | Guloso+2-opt janela 50 | Guloso+2-opt completo | AG aleatório | AG semeado c/ guloso |
|---|---|---|---|---|---|---|---|
| 25% | 616 | 2.419 | 1.531 (9 ms) | 1.380 (24 ms) | **1.248 (81 ms)** | 11.627 | 1.524 |
| 50% | 1.233 | 5.120 | 2.886 (59 ms) | 2.728 (97 ms) | **2.420 (511 ms)** | 42.714 | 2.880 |
| 75% | 1.849 | 7.665 | 4.192 (123 ms) | 3.938 (174 ms) | **3.567 (1,2 s)** | 88.326 | 4.190 |
| 100% | 2.465 | 10.055 | 5.561 (234 ms) | 5.272 (303 ms) | **4.772 (2,2 s)** | 148.189 | 5.560 |

Extremo: A4 com letra de 3 mm (9.600 traços): janela 50 leva ~3,9 s; sem janela levou 87 s (5 passadas). `otimizar` completo (guloso+2-opt janela 50) em A5/6 mm (1.280 traços) leva 87 ms.

### Carta Tarokka (63×88 mm, 1.083 traços; linhas, polígonos e curvas misturados; **ordem embaralhada**, então "Original" é pior caso artificial)

| Volume | Traços | Original | Guloso | Janela 50 | Completo | AG aleatório | AG semeado |
|---|---|---|---|---|---|---|---|
| 25% | 271 | 8.561 | 800 (3 ms) | 703 (10 ms) | **681 (21 ms)** | 1.821 | 779 |
| 50% | 542 | 17.431 | 1.089 (12 ms) | 1.011 (27 ms) | **925 (101 ms)** | 6.432 | 1.081 |
| 75% | 812 | 25.879 | 1.313 (23 ms) | 1.191 (45 ms) | **1.117 (236 ms)** | 11.334 | 1.310 |
| 100% | 1.083 | 30.820 | 1.373 (41 ms) | 1.294 (69 ms) | **1.165 (379 ms)** | 17.356 | 1.371 |

### Mapa Ravenloft, térreo (CoS, `map-4.03-main-floor.webp`), versão A: paredes, escadas e texto (1.131 traços)

| Volume | Traços | Original | Guloso | Janela 50 | Completo | AG aleatório | AG semeado |
|---|---|---|---|---|---|---|---|
| 25% | 283 | 6.895 | 1.079 (3 ms) | 972 (10 ms) | **898 (21 ms)** | 3.080 | 1.072 |
| 50% | 566 | 15.958 | 1.790 (12 ms) | 1.671 (26 ms) | **1.598 (121 ms)** | 12.632 | 1.787 |
| 75% | 848 | 27.142 | 2.435 (34 ms) | 2.318 (69 ms) | **2.224 (284 ms)** | 27.459 | 2.435 |
| 100% | 1.131 | 36.267 | 3.307 (61 ms) | 3.149 (95 ms) | **2.931 (561 ms)** | 46.384 | 3.307 |

### Mapa Ravenloft, versão B: A + rachaduras do piso (7.598 traços, estresse)

| Volume | Traços | Original | Guloso | Janela 50 | Completo | AG aleatório | AG semeado |
|---|---|---|---|---|---|---|---|
| 25% | 1.900 | 51.957 | 4.179 (81 ms) | 3.973 (121 ms) | **3.712 (775 ms)** | 83.026 | 4.179 |
| 50% | 3.799 | 112.328 | 6.134 (533 ms) | 5.909 (687 ms) | **5.296 (6,6 s)** | 189.596 | 6.134 |
| 75% | 5.699 | 173.018 | 7.928 (1,4 s) | 7.592 (1,6 s) | **6.944 (17,4 s)** | 344.368 | 7.928 |
| 100% | 7.598 | 226.865 | 9.724 (2,5 s) | 9.306 (2,8 s) | **8.523 (30,4 s)** | 510.158 | 9.724 |

### Leituras
- Corte sobre a ordem original: 48–53% (texto), 95%+ (Tarokka, embaralhada), 87–96% (mapas).
- Ganho do completo sobre a janela 50: texto 6–10%; Tarokka 3–8%; mapa A 2–7%; mapa B 6–10%. Ganho em tempo de máquina na A4 de texto: ~5 s.
- Algoritmo genético aleatório: 4 a 50 vezes pior que o guloso. Semeado: empata ou melhora ≤0,5% e perde para o 2-opt em tudo. Cada geração custa O(n) por indivíduo; em 7.600 traços só 229–264 gerações em 15 s.
- Custo do completo cresce ~O(n²): 2.465 traços ≈ 2,2 s; 3.800 ≈ 6,6 s; 5.700 ≈ 17 s; 7.600 ≈ 30 s.
- Mapas não existiam como traços no projeto (a limpeza de `arquivo/` apagou os antigos; nunca estiveram no git). Os usados aqui vieram de `dnd/tools/5etools/5etools-2014-src/img/adventure/CoS/` e foram vetorizados com `gerar-mapa.py`. A carta Tarokka veio do histórico do git (`plotter/tarokka/artifact.svg`, commit 8b6f1da).

## Reproduzir
Da raiz do projeto (Node 20+):
```bash
node workflow/experimentos/otimizar/comparar.mjs 30                 # A4 de texto, 30 s por AG
SVG=workflow/experimentos/otimizar/mapa-A.svg node workflow/experimentos/otimizar/comparar-svg.mjs 15
SVG=workflow/experimentos/otimizar/artifact.svg node workflow/experimentos/otimizar/comparar-svg.mjs 20
```
Mapa B: `python gerar-mapa.py <webp do CoS>` na pasta do experimento (precisa opencv-python). `comparar-svg.mjs` lê `<line>`, `<polygon>`, `<polyline>` e `<path>`; o argumento é o orçamento do AG em segundos. Duração: texto ~4 min, mapa B ~4 min.
Observação: `comparar.mjs`/`comparar-svg.mjs` reimplementam guloso e 2-opt no próprio arquivo (para variar a janela); a versão do app é `otimizar` em `src/exportar.js`.
