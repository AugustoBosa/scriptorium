# Calibração da troca automática de caneta (Mega S + porta-caneta)

Três arquivos de teste, do mais seguro para o mais real. Eles saem do próprio perfil `megaSTroca`: se mudar um número, gere de novo.

```bash
node scripts/gerar-teste-troca.mjs workflow/experimentos/troca-automatica '{"base":38}'   # lado: acrescente megaSTrocaLado no fim
```

O JSON é opcional e troca só os valores que você colocar. Copie `TROCA1.GCO`, `TROCA2.GCO` e `TROCA3.GCO` para o cartão SD.

## Antes de começar

1. A base de troca está presa na frente da mesa, com a base centrada em X (os grampos).
2. Mão perto do botão de parar ou do cabo de força. Todo teste roda **sem papel**.
3. Confirme antes que `G0 X0 Y0` leva a caneta ao canto frente-esquerda (pendência A1 do QUADRO).
4. Cada `M0` pára a máquina e mostra uma mensagem na tela. Clique no botão para seguir.

## Medidas propostas

São as estimativas do modelo 3D (porta-caneta v4: doca com munhões em postes de 40 mm). Os valores `MEDIR` em `hardware/pen_holder/pen_holder.py` ainda não foram medidos. Todos saem de `PORTA` em `src/maquina/perfis.js`.

Na **frente** (`megaSTroca`), as vagas ficam em X e a base na borda da frente; no **lado** (`megaSTrocaLado`), as vagas ficam em Y e a base na borda direita. A coluna "Lado" vale para o lado.

| Nome (`perfil.troca`) | Frente | Lado | O que é | Como medir |
|---|---|---|---|---|
| `vagas` | X 39,6, 83,2, 126,8, 170,4 | Y 39,6, 83,2, 126,8, 170,4 | posição do bico sobre o centro de cada vaga | Teste 1, parada "certo? bico sobre o centro". Mova a cabeça à mão e anote a posição da tela quando a caneta estiver no meio dos 2 postes. |
| `base` | Y 33 | X 177 | posição em que os munhões do suporte ficam no meio do "U" dos postes | Teste 1, segunda parada. O munhão tem 0,5 mm de folga para cada lado no "U": deve ficar centrado. |
| `afasta` | +40 | −40 | folga para andar entre as vagas sem bater nas canetas pousadas | Teste 2: a cabeça carregada passa pelas canetas pousadas com pelo menos 5 mm de folga. |
| `recuo` | +12 | −12 | curso lento que solta ou pega pelos ímãs. O **sinal** é um palpite. | Teste 2: a morsa tem que se afastar do suporte ao soltar. Se encostar mais, troque o sinal. |
| `subida` | 46,5 mm | Altura acima do assento para tirar os munhões do trilho (postes de 40,45 + 6) | Teste 2: os munhões e os ganchos passam por cima dos postes sem arrastar. |
| `zAssento` | = `zEscrita` + `assento` (3 + 6 = 9 mm) | Z do bico com o suporte apoiado na barra da base (a ponta fica 8 mm abaixo do suporte; a base tem 14) | Teste 1, parada "Z de assento". O suporte deve apoiar na base sem forçar. |
| `fLento` | 300 mm/min | Velocidade dos encaixes | Aumente só depois de dar certo 10 vezes seguidas. |

## Ordem dos testes

### Teste 1: `TROCA1.GCO`, posições a seco
Sem caneta e sem suporte no porta-caneta. Só o bico anda.

1. Para cada vaga, o bico chega por trás (Y afastado), vai ao X da vaga e pára.
2. Confira se o bico está sobre o centro da vaga. Anote a diferença em mm (+ para a direita).
3. Segunda parada: o bico encosta na base (`base`). Anote a diferença nesse eixo (Y na frente, X no lado).
4. No fim, desce devagar na vaga 1 e pára no Z de assento. Anote a diferença em Z.

Resultado: `vagas`, `base` e `zAssento` corrigidos.

### Teste 2: `TROCA2.GCO`, ciclo passo a passo
Monte os suportes com caneta nas vagas **1 e 2** e o porta-caneta na cabeça. A máquina pega a vaga 1, larga, pega a vaga 2 e larga. Pára antes de cada movimento de encaixe, com a mensagem "Prox …".

1. Antes de cada parada, olhe o movimento que vem: ele aproxima algo que pode bater?
2. Ímãs pegaram o suporte? A cabeça levantou o suporte sem arrastar nos postes?
3. O X entre as vagas passou livre pelas outras canetas?

Resultado: `afasta`, `recuo` (sinal), `subida`.

### Teste 3: `TROCA3.GCO`, ciclo real
Sem pausas, com papel preso no canto (x0, y0) da janela útil do perfil. Preta desenha um quadrado de 30 mm, vermelha uma cruz, preta o quadrado de novo (2 trocas).

1. O quadrado fecha? O segundo quadrado cobre o primeiro? A diferença é o erro de reposição da caneta (alvo: menos de 0,5 mm).
2. A cruz fica centrada no quadrado? A diferença é o deslocamento entre as duas canetas. Corrija no papel pelo `offsetX`/`offsetY` ou pelo modelo.

## O que me passar depois

Mande os números medidos (diferenças por vaga, sinal do `recuo`, folgas). Eu atualizo `perfil.troca` em `src/maquina/perfis.js`, regero os arquivos e publico.
