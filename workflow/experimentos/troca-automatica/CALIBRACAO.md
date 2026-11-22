# Calibração da troca automática de caneta (Mega S + porta-caneta)

Três arquivos de teste, do mais seguro para o mais real. Eles saem do próprio perfil `megaSTroca`: se mudar um número, gere de novo.

```bash
node scripts/gerar-teste-troca.mjs workflow/experimentos/troca-automatica '{"yBase":38}'
```

O JSON é opcional e troca só os valores que você colocar. Copie `TROCA1.GCO`, `TROCA2.GCO` e `TROCA3.GCO` para o cartão SD.

## Antes de começar

1. A base de troca está presa na frente da mesa, com a base centrada em X (os grampos).
2. Mão perto do botão de parar ou do cabo de força. Todo teste roda **sem papel**.
3. Confirme antes que `G0 X0 Y0` leva a caneta ao canto frente-esquerda (pendência A1 do QUADRO).
4. Cada `M0` pára a máquina e mostra uma mensagem na tela. Clique no botão para seguir.

## Medidas propostas

São as estimativas do modelo 3D. Os valores `MEDIR` em `hardware/pen_holder/pen_holder.py` ainda não foram medidos.

| Nome (`perfil.troca`) | Proposta | O que é | Como medir |
|---|---|---|---|
| `vagasX` | 60, 90, 120, 150 mm | X do bico sobre o centro de cada vaga | Teste 1, parada "X certo?". Mova a cabeça à mão e anote o X da tela quando o bico estiver no centro dos pinos. |
| `yBase` | 36 mm | Y em que o suporte fica contra os pinos | Teste 1, parada "Y certo?". Régua entre os pinos e a placa da morsa: deve haver 0 mm. |
| `afastaY` | 40 mm | Folga em Y para andar em X sem bater nas canetas pousadas | Teste 2: a cabeça carregada passa por cima das canetas pousadas com pelo menos 5 mm de folga. |
| `recuoY` | +12 mm | Quanto a mesa anda para soltar ou pegar pelos ímãs. O **sinal** é um palpite. | Teste 2: a morsa tem que se afastar do suporte ao soltar. Se encostar mais, troque o sinal. |
| `subida` | 10 mm | Altura acima do assento para tirar o suporte dos pinos | Teste 2: os furos do suporte saem dos pinos (6 mm) sem arrastar. |
| `zAssento` | = `zEscrita` (3 mm) | Z do bico com o suporte assentado nos pinos | Teste 1, parada "Z de assento". O suporte deve apoiar na base sem forçar. |
| `fLento` | 300 mm/min | Velocidade dos encaixes | Aumente só depois de dar certo 10 vezes seguidas. |

## Ordem dos testes

### Teste 1: `TROCA1.GCO`, posições a seco
Sem caneta e sem suporte no porta-caneta. Só o bico anda.

1. Para cada vaga, o bico chega por trás (Y afastado), vai ao X da vaga e pára.
2. Confira se o bico está sobre o centro da vaga. Anote a diferença em mm (+ para a direita).
3. Segunda parada: o bico vai ao `yBase`. Anote a diferença em Y.
4. No fim, desce devagar na vaga 1 e pára no Z de assento. Anote a diferença em Z.

Resultado: `vagasX`, `yBase` e `zAssento` corrigidos.

### Teste 2: `TROCA2.GCO`, ciclo passo a passo
Monte os suportes com caneta nas vagas **1 e 2** e o porta-caneta na cabeça. A máquina pega a vaga 1, larga, pega a vaga 2 e larga. Pára antes de cada movimento de encaixe, com a mensagem "Prox …".

1. Antes de cada parada, olhe o movimento que vem: ele aproxima algo que pode bater?
2. Ímãs pegaram o suporte? A cabeça levantou o suporte sem arrastar nos pinos?
3. O X entre as vagas passou livre pelas outras canetas?

Resultado: `afastaY`, `recuoY` (sinal), `subida`.

### Teste 3: `TROCA3.GCO`, ciclo real
Sem pausas, com papel preso no canto frente-esquerda. Preta desenha um quadrado de 30 mm, vermelha uma cruz, preta o quadrado de novo (2 trocas).

1. O quadrado fecha? O segundo quadrado cobre o primeiro? A diferença é o erro de reposição da caneta (alvo: menos de 0,5 mm).
2. A cruz fica centrada no quadrado? A diferença é o deslocamento entre as duas canetas. Corrija no papel pelo `offsetX`/`offsetY` ou pelo modelo.

## O que me passar depois

Mande os números medidos (diferenças por vaga, sinal do `recuoY`, folgas). Eu atualizo `perfil.troca` em `src/maquina/perfis.js`, regero os arquivos e publico.
