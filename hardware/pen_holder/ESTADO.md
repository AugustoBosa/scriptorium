# Estado do trabalho (2026-11-23)

Nota de passagem entre sessões. Apague quando não servir mais.

## Feito
- Variante **parafuso** escolhida para imprimir.
- Mesa `0_validacao` v1 impressa na P2S. O usuário mandou a lista de problemas, e a v2 já está gerada e fatiada (`p2s/0_validacao_P2S.gcode.3mf`, ~2h19, 39 g).

## Teste de encaixe dos pinos (2026-11-25)
- Mesa `4_teste_pinos`, fatiada em ~20 min (3,7 g):
  - uma placa de 5 mm com 4 furos de folga 0,1, 0,2, 0,3 e 0,4, marcados com 1 a 4 pontinhos;
  - 2 plaquinhas com 1 pino cada.
- Imprime igual às peças reais: a placa com a entrada dos furos na mesa, e o pino deitado.
- Resultado (usuário): 0,1 ficou muito justa e 0,2 um pouco folgada. Adotado `FOLGA_CONE` = **0,15**; a `0_validacao` foi refatiada (3h46, 63 g).

## v5.1 (2026-11-25): garras ajustáveis
- O usuário escolheu a variante **parafuso**, que agora é a padrão do script. A cunha continua disponível com `python pen_holder.py cunha`.
- O gancho de baixo saiu da mandíbula e virou uma **garra** separada, uma de cada lado (`garra()`):
  - tira de 4 × 10 atrás dos 20 mm da mandíbula, gancho de 3 mm sob a borda da caixa e aba com rosca M8 sobre o topo;
  - o M8 (`parafuso_garra`, 16 mm) empurra um calço da mandíbula, com rebaixo de Ø9 que centra a ponta;
  - apertar sobe a garra e prende a caixa. Ajuste: sobe 3 e desce 2,5, ou seja, caixa de ~52 a ~57,5.
- Assert novo: as peças da cabeça não se invadem.
- `0_validacao` v5.1: morsa, mandíbula, M8, 2 garras, 2 M8 de garra, suporte, bloco, cunha e 2 varetas. As garras imprimem em pé. Fatiada: 3h46, 63 g.
- Montar: solte os M8 das garras (ganchos embaixo), abra a mandíbula, encaixe deslizando para a esquerda e aperte o M8 da mandíbula. Depois aperte os 2 M8 das garras até prenderem a caixa.

## v5 (2026-11-25), depois da v4 impressa
Problemas apontados pelo usuário e correções:
- Pinos grossos (placas ~3 mm afastadas): o cone de 10° multiplica por 5,7 o erro de impressão. Agora o pino é um losango (lado 3,5, imprime deitado sem suporte), `FOLGA_CONE` 0,2 por face, chanfro de 0,8 na entrada do furo (pé de elefante). Quem dá a referência é placa contra placa. `PINO_X` 3.
- Ganchos: o V virava rampa para fora. Agora há uma farpa na ponta: 3 mm além do assento, face de dentro a 20° para dentro (`FARPA*`). `GANCHO` = 8. `DIST_ELASTICO` é medida entre os assentos.
- Varetas apertadas: `FOLGA_TRILHO` voltou a 0,4 (Ø4,4); `BH` 25 ficou.
- Morsa girava no eixo do aperto: as 2 mandíbulas (parafuso) viraram um C. A barra fica no topo, e um gancho em cunha (25°) entra 3 mm sob a borda de baixo da caixa, só nos 20 mm da frente. O M8 aperta em X e puxa para baixo. `JT` = 4. A mandíbula e o M8 da v2 não servem mais.
  - Montar: abra a mandíbula esquerda, encaixe com a morsa deslocada para a direita, deslize para a esquerda até o gancho direito entrar sob a caixa e aperte o M8.
- Barra do topo: rebaixo sobre os parafusos da tampa. O da frente direita ficava embaixo da barra e entortava a morsa.
- Cunha da caneta frouxa: cravada, ela agora trava até `CANETA_MIN` = 6,8 (MEDIR). O canal foi para 6,8° (`CUNHA_T` 4,2). Com a caneta de 8, ela para 10 mm acima do fundo.
- Cabeçote: altura 55 (medida), largura 65, profundidade ~72 (MEDIR), `RECUO` 0,5.
- Modelo da Mega S (`impressora()`): tampa com grade, peça de baixo, bico, parafusos, bowden, conector, carro com 4 LM8UU, varetas X, correia e pontas do X. Os asserts conferem que a morsa e o porta-caneta não tocam o carro, as varetas, a correia nem as pontas do X (cabeça em x = −105, 0 e +105). Aviso que sobra: o conector verde encosta 0,5 mm no carro da mandíbula (posição MEDIR).
- **App**: `BICO_Y` = 50 (foto: o bico fica sob a peça de trás). Antes era 25. A caneta fica a 64,8 mm do bico em Y; o perfil do app usava 41,5. Medir e recalibrar `PORTA`.
- Visor: aba **Desenhos**, com frente, lado, topo e 3D de cada peça e do cabeçote, cotas totais, Ø dos furos, tabela de cotas de projeto e 3D girável. O cabeçote e o pórtico vêm do modelo do script.
- `0_validacao` v5: morsa, mandíbula, M8, suporte, bloco, cunha e 2 varetas. Fatiada: 2h45, 48,4 g.
- Conferir na impressão:
  - as placas encostam;
  - o elástico não sai;
  - o bloco corre solto;
  - a morsa não gira;
  - a cunha trava a BIC;
  - o gancho da morsa passa sob a caixa.

## Correções da v2 (depois da validação v1)
(O M6 da caneta e as varetas de 12 mm abaixo foram substituídos na v3.)
- Morsa frouxa no cabeçote. Havia 2 causas:
  - a mandíbula batia na barra e no rabo depois de 2 mm;
  - o M8 batia no fundo da rosca do carro.
  Correção: barra e rabo começam em `X_RABO0`, `CURSO_M` passou de 6 para 16, `CARRO_W` passou de 18 para 28 e o M8 ficou mais curto. O rabo agora usa `FOLGA_RABO` = 0,5 (antes 0,3).
- Suporte: tirei o apoio embutido. O fatiador põe suporte em árvore, só a partir da mesa (`p2s/processo.json`).
- Ganchos do elástico: maiores (7 mm, cabeça 6 × 1,5) e nas laterais. O do bloco fica no topo de uma orelha alta, a `DIST_ELASTICO` = 25 mm acima do gancho da aba de baixo, no mesmo X e Y, para o elástico trabalhar em linha. Ajuste `DIST_ELASTICO` ao tamanho do elástico. `PASSO` da base: 43,6 (base com 158 mm).
- Bloco: o furo do M6 agora chega no furo da caneta. Antes parava num plano tangente e ficava tapado.
- Botão M6: +5 mm de haste.
- Vareta: rosca × 0,75, M4 embaixo e Ø4,7 em cima; meio liso Ø4, então a folga no bloco é a mesma da v1 (pedido do usuário). As abas do suporte têm rosca fêmea na mesma hélice, e um teste no script confere o encaixe. As varetas foram para x = ±8,6, e o suporte e o bloco agora têm 25,6 de largura. A vareta tem cabeça Ø7,6 com fenda para chave; ela encosta na aba de cima e imprime de cabeça para baixo.
- Ímãs: 1 por cava (fundo de 1,2 mm). 20 ímãs no total.

## v4 (2026-11-23): bloco fino, doca D2 e pinos cônicos
O usuário escolheu, depois das propostas (`saida/parafuso/propostas_v4.html`):
- Bloco:
  - furo da vareta Ø4,1 e bloco de 25 mm (a ponta anda ±0,1 mm); curso ≥ 6;
  - furo da caneta +1 mm, 0,5 à frente: a cunha (em Y, a escolhida pela conta) encosta a caneta atrás, na linha das varetas;
  - paredes de 1,2 (`PAREDE_BLOCO`); bloco de 23,7 × 13,3.
- Ganchos nas laterais: o usuário exige, porque evitam a torção. `ELASTICO_L` = 70 (MEDIR) → ganchos a 35 mm.
- Placa do suporte de 3 mm, com 6 pinos cônicos e 8 cavas de ímã.
  - Pinos cônicos: laterais e topo a 10°, base reta. A morsa tem furo cônico passante; calibrar com `FOLGA_CONE`.
- Doca D2: munhões Ø3,5 nas laterais da aba de baixo descem num "U" aberto em cima, em postes da base.
  - O "U" tem entrada chanfrada e folga de 0,5 por lado (`FOLGA_MUNHAO`), a pedido: desliza, não trava.
  - O suporte apoia na barra; o munhão nunca toca o fundo.
  - O script confere que o suporte pousado não bate na base e que o munhão corre ±0,45 no "U".
- Flexão de lâminas: rejeitada pelo usuário (desgasta e quebra). Não propor de novo.
- `0_validacao` v4: morsa, suporte, bloco, cunha, 2 varetas e base. Fatiada: ~3h03, 51,4 g.
- Ganchos (pedido do usuário, 2ª versão):
  - entalhe em V onde o elástico apoia (`ENTALHE` = 1,5), no meio da barra: em cima no bloco, embaixo no suporte. O elástico não escapa para nenhum lado;
  - `GANCHO` voltou a 7; a cunha na ponta foi descartada (não era o pedido);
  - `DIST_ELASTICO` é medida entre os fundos dos 2 V.
- Doca com 2 munhões por lado (z ≈ 2 e 36), num trilho vertical aberto em cima, em postes de 40 mm.
  - Motivo (usuário): com 1 munhão só embaixo, ao soltar, o ímã puxa na meia altura e o suporte gira na borda de trás.
  - Giro máximo de 1,7° pela folga de 0,5. Para reduzir, diminuir `FOLGA_MUNHAO`.
  - A frente da barra ficou rente aos postes (imprime deitada), com rasgo para a caneta pousada.
  - A morsa cunha perdeu a placa larga embaixo; o script confere que a morsa não bate nos postes (y +0, +6, +12).
  - **App**: a cabeça precisa passar sobre a base a ≥ 46 mm acima do topo da base (antes ~12).
- Vagas: passo 43,6, no máximo 4.
- `0_validacao` (pedido do usuário: validar 1 porta-caneta antes da doca): morsa, suporte, bloco, cunha e 2 varetas, sem base. Mandíbula e M8 da v2 reaproveitados. Fatiada: ~1h58, 31 g.

## App alinhado com a v4 (2026-11-24)
- Branch `porta-v4` (worktree, saída do main): `PORTA` em `src/maquina/perfis.js` com bico 41,5, pousada 8,5, livre 16, lateral 26,4, `assento` 6 (bico assentado = Z de escrita + 6) e `subida` 46,5. Área útil: 210 × 152,5 (frente) e 152,5 × 210 (lado); A5 passa a caber. TROCA*.GCO e CALIBRACAO.md regerados.

## Próximo
1. Imprimir a v4. Conferir:
   - os cones assentam e as placas encostam;
   - o munhão desliza no "U";
   - a cunha trava a caneta no furo de 9,3;
   - a guia de 4,1 corre sem travar;
   - o elástico (medir `ELASTICO_L`).
3. Medir na Mega S o vão no fim do X (`FOLGA_X_FIM`).

## v3 (2026-11-23), depois da validação da v2
O usuário apontou estes problemas na v2:
- cavas dos ímãs rasas;
- pinos curtos;
- bloco balançando nas varetas;
- M6 da caneta espanando;
- momento grande entre a ponta e a placa.

Correções:
- Ímãs: a cava passou para Ø3,4 × 1,4 (`FOLGA_IMA_D/H` = 0,4), no suporte e na morsa. Colar com CA.
- Pinos: `PINO_L = PLACA_T` (5); o furo da morsa ficou passante. Pinos e ímãs foram para as bordas (z = 4 e SH − 4).
- Caneta: cunha nas duas variantes. O M6 (`parafuso_caneta`) saiu, e a variante agora só escolhe a morsa.
- Momento:
  - o bloco ficou assimétrico (`BY_TRAS` = só a parede atrás da caneta), e o eixo da caneta até as costas caiu de 18 para 14,8 mm;
  - `CANETA_SAI` passou de 18 para 12, e a ponta fica 8 mm abaixo do suporte;
  - consequência: o suporte fica 6 mm mais baixo no cabeçote, e a placa da morsa ficou 6 mm mais longa.
- Balanço do bloco: duas opções na mesma mesa, para comparar.
  - Opção 1, varetas: `BH` passou de 12 para 20 (guia longa) e `FOLGA_TRILHO` de 0,4 para 0,2. O suporte tem SH = 34.
  - Opção 2, `flex()`: suporte + 4 lâminas (0,8 × 4 × 25) + bloco numa peça. Sem folga, sem vareta e sem elástico; curso de 3 mm. Calibração: `LAMINA_T`. Imprime de lado.
- `0_validacao` v3: morsa + opção 1 + opção 2 + 2 cunhas. Fatiada: `p2s/0_validacao_P2S.gcode.3mf`, ~2h36, 47,7 g. Mandíbula e M8 não mudaram e não estão nessa mesa.

## Montagem: frente ou lado (2026-11-22, o usuário escolhe no app)
- Perfis `megaSTroca` (frente) e `megaSTrocaLado` (lado direito), publicados no main em `39f538c` (2026-11-22). Todos os números saem de `PORTA` em `src/maquina/perfis.js`.
- A caneta fica a 50 mm do bico. Área útil, em coordenadas da mesa (onde o papel fica):
  - frente: X 0–210, Y 15–160, ou seja 210 × 145 (A5 deitado não cabe por 3 mm);
  - lado: X 50–195, Y 0–210, ou seja 145 × 210 (A5 em pé não cabe por 3 mm).
- Limites: o fundo (ou a direita) é o curso do bico menos 50; a borda da base vem das canetas pousadas fora da mesa (3 mm na mesa + 9 do bloco + 3 de folga).
- Vagas: 39,6, 83,2, 126,8 e 170,4 (X na frente, Y no lado). Base: Y 36 na frente, X 174 no lado.
- O modelo 3D do lado ainda não existe: a morsa e a base são as da frente. Antes de imprimir para o lado, medir o que há na lateral direita do cabeçote e a borda direita da mesa.
- Para ganhar os 3 mm do A5: base totalmente fora da mesa, ou a mesa andar além de 210 (medir).

## Git (branch `hardware-pen-holder`)
- A v5.1 (última mandada para imprimir) está commitada na branch em 2026-11-26. `a042d6f` e esse commit ainda não foram enviados (push).
- Commit e push só quando o usuário pedir.

## Não fazer
- Não implementar a troca automática no app (`src/`). Ela será feita no próprio scriptorium; o README traz as medidas para ela.
