# Impressão: variante parafuso, 4 canetas (Mega S)

Gerar: `python pen_holder.py parafuso`. Sai em `saida/parafuso/impressao/`, com cada peça já deitada na posição certa.

| Mesa | Peças | Quantas vezes | Cor |
|---|---|---|---|
| `1_caneta.3mf` | suporte, bloco, cunha, 2 varetas | 4 | uma de cada cor da caneta |
| `2_morsa.3mf` | morsa, mandíbula em C, M8 da mandíbula, 2 garras, 2 M8 das garras, 2 borboletas da mesa | 1 | qualquer uma |
| `3_base.3mf` | base de troca | 1 | qualquer uma |
| `4_teste_pinos.3mf` | placa com 4 furos (folga 0,1 a 0,4) e 2 pinos | 1 | qualquer uma (~20 min) |

## Validação na Bambu Lab P2S (antes do resto)

Versão atual: **v5.1** (garras ajustáveis), a última mandada para imprimir. O histórico está em `ESTADO.md`.

Abra `0_validacao.3mf` no Bambu Studio. Ele tem a morsa, a mandíbula em C, o M8 da mandíbula, as 2 garras com os 2 M8 delas e um porta-caneta completo (suporte, bloco, cunha e 2 varetas). As garras imprimem em pé. Se perguntar, carregue como **objetos separados**.

- Impressora P2S, bico de 0,4 mm, PLA genérico ou Bambu PLA Basic.
- Perfil base: **0.16mm Standard**. Ele dá mais camadas por fio de rosca.
- Paredes: 3. Preenchimento: 15%, gyroid.
- Suporte: **ligado, árvore (auto), só a partir da mesa**. O fatiador põe suporte sob as abas de cima do suporte e sob os ganchos. A borda (brim) fica no automático.
- Não gire as peças: elas já saem deitadas na posição certa.

Sem abrir a interface: `sh p2s/fatiar.sh saida/parafuso/impressao/0_validacao.3mf` gera `saida/parafuso/impressao/p2s/0_validacao_P2S.gcode.3mf` (v5.1: ~3h46, 63 g). O script confere se o início do G-code é o oficial da P2S.

- Precisa do Bambu Studio em `%LOCALAPPDATA%\Programs\BambuStudio`.
- Os perfis de `p2s/` vêm completos, com "inherits" e "include" já resolvidos.
- Se o início não for o oficial, a impressora faz barulho e se comporta errado. Isso já aconteceu uma vez.

Ao imprimir pela tela da impressora, não dá para escolher o slot: ela usa o slot 1 do AMS (o da esquerda). Pelo Bambu Studio dá para escolher.

Na Mega S, confira:
1. A morsa não gira: as garras prendem a caixa embaixo e o M8 da mandíbula aperta.
2. O suporte gruda na morsa pelos ímãs e as placas encostam (pinos com `FOLGA_CONE` 0,15).
3. As varetas rosqueiam nas 2 abas e o bloco corre solto no meio liso.
4. O elástico puxa o bloco de volta e não sai da farpa.
5. A cunha trava a caneta (BIC), com a ponta 5 mm abaixo do bico.

Montar a morsa: solte os M8 das garras (ganchos embaixo), abra a mandíbula, encaixe deslizando para a esquerda e aperte o M8 da mandíbula. Depois aperte os 2 M8 das garras até prenderem a caixa (aceita caixa de ~52 a ~57,5 mm).

## Fatiador (Cura)

- PLA, bico 0,4.
- Altura de camada: 0,16 mm nas mesas 1 e 2 (por causa das roscas) e 0,2 mm na mesa 3.
- 3 paredes e 20% de preenchimento: as peças são pequenas e quase tudo vira parede. Total maciço: ~86 cm³ (era 203); impresso, fica bem abaixo disso.
- Suporte **ligado só a partir da mesa**:
  - o suporte ② precisa: ligue suporte só a partir da mesa;
  - o rabo-de-andorinha é de 45°;
  - os pinos da base têm uma quilha embaixo.
- Borda (brim) ligada na mesa 1, porque as varetas são finas.
- Imprima primeiro uma mesa 1 e teste os encaixes. Se ficarem apertados ou soltos, mude `FOLGA` no script e gere de novo.

## Depois de imprimir

1. Tire os suportes do fatiador (abas de cima do suporte ② e ganchos).
2. Cole os ímãs, 1 por cava: 4 cavas em cada suporte (16) e 4 na morsa (20 no total), e teste antes de colar: cada suporte tem que grudar na morsa.
3. Ponha o bloco entre as abas e rosqueie cada vareta por cima, com a ponta fina (M4) primeiro: ela atravessa a aba de cima, passa pelo bloco e rosqueia nas duas abas. Aperte pela cabeça (fenda para chave de fenda) até ela encostar na aba. Coloque o elástico nos ganchos laterais: do topo da orelha do bloco ao gancho da aba de baixo, em linha reta.
   Prenda a caneta com a cunha, com a ponta 5 mm abaixo do bico. Isso compensa qualquer diferença na altura do cabeçote (no modelo: 55 mm, medida).
4. Se o bloco agarrar nas varetas, passe uma broca de 4,5 mm nos furos do bloco. Se a morsa correr dura no rabo, aumente `FOLGA_RABO`.

## Comprar

- 20 ímãs de disco 3 × 1 mm (1 por cava; a cava tem Ø3,4 × 1,4 mm, com folga para a cola CA).- 4 elásticos pequenos.
