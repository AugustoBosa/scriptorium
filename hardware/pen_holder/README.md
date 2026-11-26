# Porta-caneta com troca automática (Mega S)

Referência para quem for implementar a troca automática no app (perfil e G-code). Aqui ficam só o modelo, as medidas e a sequência de movimentos; o app usa estes números nos perfis `megaSTroca` e `megaSTrocaLado` (`PORTA` em `src/maquina/perfis.js`, no main).

## Onde está

- Pasta: `hardware/pen_holder/`, no repo [AugustoBosa/scriptorium](https://github.com/AugustoBosa/scriptorium), branch `hardware-pen-holder`.
- Modelo: `pen_holder.py` (build123d). Todas as medidas ficam no topo do arquivo; as provisórias estão marcadas `MEDIR`.
- Visor 3D com a troca animada: `visor.html`, com as abas cunha e parafuso.
- Impressão: `IMPRESSAO.md`.
- Gerar os arquivos: `../.venv/Scripts/python.exe pen_holder.py parafuso` (a venv `hardware/.venv` já tem `build123d` e `bd_warehouse`).
- Estado e histórico das versões: `ESTADO.md`.

## Medidas para o G-code (em mm)

Medidas do modelo, relativas ao eixo da caneta. Valores **MEDIR** são provisórios.

| O quê | Valor | Origem no script |
|---|---|---|
| Vagas na base | 4 | `VAGAS` |
| Distância entre vagas (X) | 43,6 | `PASSO = SW + 2 * (FOLGA_ORELHA + GANCHO) + FOLGA_VIZINHO` |
| X das vagas, a partir do centro da base | −65,4, −21,8, 21,8, 65,4 | `XS` |
| Comprimento da base | 167,4 | `BX1 − BX0` |
| Altura da base acima da mesa | 14 | `BASE_H` |
| Doca D2: altura dos postes (trilho em "U" dos munhões) | 40,45 | `POSTE_H` |
| Munhões atrás do eixo da caneta (Y); postes a 13,3–17,3 do centro da vaga em X | 7,35 | `MUNHAO_Y`, `POSTE_X0/1` |
| Frente da barra da base atrás do eixo da caneta; borda da mesa a +5 | 3,5 | `BY0` |
| Ponta da caneta abaixo da base do suporte (bloco em repouso; a caneta sai 12 mm abaixo do bloco) | 8 | `Z_PONTA`, `CANETA_SAI` |
| Bico assentado acima do Z de escrita (base 14 − ponta 8) | 6 | app: `PORTA.assento` |
| Subida do assento até o suporte passar sobre os postes | 46,5 | `POSTE_H + 6`; app: `PORTA.subida` |
| Cunha à frente do eixo da caneta (parte mais à frente) | 10 | `cunha()` |
| Curso da caneta (elástico) | 6 | `CURSO` |
| Bico acima da ponta da caneta | 5 | `MARGEM_BICO` |
| Frente do cabeçote atrás do eixo da caneta | 16,35 | `Y_CAB` |
| Caneta à frente do bico | ~64,8 (MEDIR; o app ainda usa 41,5 da v4) | `Y_CAB + BICO_Y` |
| Recuo para soltar os ímãs | 12 | visor |
| Largura do cabeçote | 65 (capa de reposição: 64,9); a morsa aceita 50,5 a 66,5 | `CABECA_W`, `JOGO`, `CURSO_M` |
| Altura da caixa do cabeçote | 55 (medida) | `CABECA_H` |
| Espessura da mesa (Ultrabase) | ~6 (foto + vendedores) | `MESA_T` |
| Folga lateral da morsa até a estrutura no fim do X | 4,0 / 2,5 (limite 6, MEDIR) | `FOLGA_X_FIM` |

Pelo modelo, as posições da máquina com a base centrada na mesa seriam: bico em X = 39,6, 83,2, 126,8 e 170,4 sobre as vagas; Y ≈ 33 com o suporte na doca, e Z do bico = Z de escrita + 6 com o suporte assentado. São estimativas. Meça na máquina, movendo a cabeça à mão.

## Sequência de troca

Esta é a sequência do visor. A cabeça anda em X e Z; a mesa anda em Y.

**Largar a caneta** na vaga livre:
1. Sobe até o suporte passar acima dos postes da doca (+46,5 mm acima do assento).
2. Afasta a base em Y, anda em X até a vaga e volta em Y.
3. `G1 Z` lento (F300): os munhões descem no "U" dos postes até o suporte apoiar na barra.
4. `G1 Y` lento: a cabeça recua 12 mm e os ímãs soltam.

**Pegar a próxima** caneta:
1. Ainda embaixo, anda em X por trás das canetas pousadas até a vaga dela.
2. `G1 Y` lento, avançando 12 mm: os ímãs pegam o suporte.
3. Sobe 46,5 mm: os munhões saem do trilho dos postes.
4. Afasta a base em Y antes de andar em X: com a cabeça carregada, andar em X perto da base bate nas canetas pousadas.
