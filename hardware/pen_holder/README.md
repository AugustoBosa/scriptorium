# Porta-caneta com troca automática (Mega S)

Referência para quem for implementar a troca automática no app (perfil e G-code). Aqui ficam só o modelo, as medidas e a sequência de movimentos; o app ainda não usa nada disso.

## Onde está

- Pasta: `hardware/pen_holder/`, no repo [AugustoBosa/scriptorium](https://github.com/AugustoBosa/scriptorium), branch `hardware-pen-holder`.
- Modelo: `pen_holder.py` (build123d). Todas as medidas ficam no topo do arquivo; as provisórias estão marcadas `MEDIR`.
- Visor 3D com a troca animada: `visor.html`, com as abas cunha e parafuso.
- Impressão: `IMPRESSAO.md`.
- Gerar os arquivos: `python pen_holder.py parafuso`. Precisa de `pip install build123d bd_warehouse`.

## Medidas para o G-code (em mm)

Medidas do modelo, relativas ao eixo da caneta. Valores **MEDIR** são provisórios.

| O quê | Valor | Origem no script |
|---|---|---|
| Vagas na base | 4 | `VAGAS` |
| Distância entre vagas (X) | 28 | `PASSO = max(SW, BW) + 4` |
| X das vagas, a partir do centro da base | −42, −14, 14, 42 | `XS` |
| Comprimento da base | 110 | `BX1 − BX0` |
| Altura da base acima da mesa | 14 | `BASE_H` |
| Altura dos pinos da base | 6 | `PINO_BASE_H` |
| Pinos atrás do eixo da caneta (Y), a ±3,5 mm do centro da vaga em X | 14 | `FURO2_Y`, `FURO2_X` |
| Ponta da caneta abaixo da base do suporte (bloco em repouso; a caneta sai 18 mm abaixo do bloco) | 14 | `Z_PONTA`, `CANETA_SAI` |
| Curso da caneta (elástico) | 6 | `CURSO` |
| Bico acima da ponta da caneta | 5 | `MARGEM_BICO` |
| Frente do cabeçote atrás do eixo da caneta | 25 | `Y_CAB` |
| Caneta à frente do bico | ~50 (MEDIR) | `Y_CAB + CABECA_D/2` |
| Recuo para soltar os ímãs | 12 | visor |
| Largura do cabeçote | 64,3 (MEDIR) | `CABECA_W` |
| Folga lateral da morsa até a estrutura no fim do X | 3,5 / 2,5 (limite 6, MEDIR) | `FOLGA_X_FIM` |

Pelo modelo, as posições da máquina com a base centrada na mesa seriam: bico em X = 63, 91, 119 e 147 sobre as vagas; Y ≈ 36 com o suporte nos pinos. São estimativas. Meça na máquina, movendo a cabeça à mão.

## Sequência de troca

Esta é a sequência do visor. A cabeça anda em X e Z; a mesa anda em Y.

**Largar a caneta** na vaga livre:
1. Sobe até a ponta da caneta passar acima dos pinos da base (+10 mm).
2. Afasta a base em Y, anda em X até a vaga e volta em Y.
3. `G1 Z` lento (F300): os pinos entram nos furos do suporte.
4. `G1 Y` lento: a cabeça recua 12 mm e os ímãs soltam.

**Pegar a próxima** caneta:
1. Ainda embaixo, anda em X por trás das canetas pousadas até a vaga dela.
2. `G1 Y` lento, avançando 12 mm: os ímãs pegam o suporte.
3. Sobe: o suporte sai dos pinos.
4. Afasta a base em Y antes de andar em X: com a cabeça carregada, andar em X perto da base bate nas canetas pousadas.
