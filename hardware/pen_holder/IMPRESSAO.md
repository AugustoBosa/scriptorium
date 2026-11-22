# Impressão: variante parafuso, 4 canetas (Mega S)

Gerar: `python pen_holder.py parafuso`. Sai em `saida/parafuso/impressao/`, com cada peça já deitada na posição certa.

| Mesa | Peças | Quantas vezes | Cor |
|---|---|---|---|
| `1_caneta.3mf` | suporte (com apoio), bloco, botão M6, 2 varetas | 4 | uma de cada cor da caneta |
| `2_morsa.3mf` | morsa, mandíbula, botão M8, 2 borboletas M8 | 1 | qualquer uma |
| `3_base.3mf` | base de troca | 1 | qualquer uma |

## Fatiador (Cura)

- PLA, bico 0,4.
- Altura de camada: 0,16 mm nas mesas 1 e 2 (por causa das roscas) e 0,2 mm na mesa 3.
- 3 paredes e 20% de preenchimento: as peças são pequenas e quase tudo vira parede. Total maciço: ~86 cm³ (era 203); impresso, fica bem abaixo disso.
- Suporte **desligado**. Nenhuma peça precisa de suporte:
  - o suporte ② já sai com o apoio embutido;
  - o rabo-de-andorinha é de 45°;
  - os pinos da base têm uma quilha embaixo.
- Borda (brim) ligada na mesa 1, porque as varetas são finas.
- Imprima primeiro uma mesa 1 e teste os encaixes. Se ficarem apertados ou soltos, mude `FOLGA` no script e gere de novo.

## Depois de imprimir

1. Tire os 2 apoios do suporte ②: são 2 tubos soltos, presos por 1 camada embaixo das abas de cima.
2. Cole os ímãs, 3 empilhados por cava: 4 cavas em cada suporte (16) e 4 na morsa, e teste antes de colar: cada suporte tem que grudar na morsa.
3. Passe as varetas pelas abas do suporte e pelo bloco, e coloque o elástico nos ganchos.
4. Se o bloco agarrar nas varetas, passe uma broca de 4,5 mm nos furos do bloco.

## Comprar

- 60 ímãs de disco 3 × 1 mm (3 por cava; a cava tem Ø3,2 × 3,2 mm, com folga para a cola).
- 4 elásticos pequenos.
