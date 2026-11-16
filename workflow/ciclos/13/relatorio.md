# Relatório do ciclo 13 (M15, parte 2)

Verificação do gerente: `npm test` = tests 142, pass 142, fail 0 (143 do ciclo 12 menos o teste de `ajuda()` removido pela 13-B; único teste existente alterado). Goldens intactos. Gates do orquestrador: `npm run build` ok; `npm run e2e` 42/42 (smoke, controle, visual com contraste AA, nos temas claro e vela).

Conferido no código: chaves `writer.personagem`, `writer.personagens`, `grimorio.estado` mantidas (mesmos módulos e formato); novas `writer.ui` e `writer.perfil`; nenhuma chamada a `ajuda()` restante em `src/ui/`; nenhum `style=`/hex em `src/ui/*.js` fora do uso de token (`var(--fonte-mono)`); `main` com os três filhos diretos; `grimorio.html` é redirect.

| Tarefa | Status | Nota |
|---|---|---|
| 13-A shell | aceita | `app.js` (roteamento por hash, 3 instâncias, render por quadro, tema/nível persistidos), `previa.js`, `index.html`, redirect, `smoke` e `visual`. Desvio: "Sigilos" usa `papel(..., {largura:148, altura:210})`, ou seja o papel nomeado muda mas o `personalizado` fica 148×210. Aceito (oficina de painel mínimo, M19–M20 refaz). |
| 13-B painéis da mão | aceita | `controle()` nos sliders e seeds, `dica()` no resto, tokens no catálogo, `ajuda()` removida com o teste correspondente. |
| 13-C texto, exportação, grimório | aceita | `montarPapel`, `montarBarra`, `criar()`; G-code por `gcodeDocumento` com bloqueio (D8); SVG por `svgDocumento`. Desvio: `compor()` do grimório captura o erro de `comporGrimorio` e mostra em `#erro` (em vez de deixar subir ao shell). Aceito: o efeito visível é o mesmo e preserva a prévia anterior. |

## DoD do M15 (EXPANSAO §4.7)
- Um `index.html`; 5 oficinas navegáveis: smoke + visual (uma captura por oficina). Comprovado.
- Controles atuais migrados com prévia viva: `controle()` em personagem/fontes/texto/exportar/grimório; seletores de dado e campos de texto ficam fora (D10). Comprovado por e2e e leitura do código.
- Teste de `PARAMS` verde: `test/params.test.mjs`. Comprovado.
- Contraste AA nos dois temas: `e2e/visual.spec.js`, verde. Comprovado.
- `e2e/visual.spec.js` com screenshots por oficina e tema: grava em `test-results/`. Comprovado (existência); aprovação é do usuário.
- **PARADA para aprovação do usuário:** pendente. M15 NÃO fecha neste ciclo (falta revisor e a aprovação).

## Para mostrar ao usuário na parada
- A4 na Mega S (janela 210x210) agora bloqueia o G-code com erro claro; o SVG segue liberado (D8).
- Prévia viva só em parâmetros que mudam o desenho; seletores de personagem/variação/magia, busca, texto e botões ficam sem (D10).
- Ao trocar de oficina, personagem, variação, perfil, otimizar e trajeto são copiados entre instâncias; a variação salva em `grimorio.estado` é sobrescrita em memória pela da escrita.
- Fonte web (EB Garamond) só com rede; screenshots de aprovação devem ser tirados com rede.
- Aparência do tema/popover nunca vista por humano até a parada.

Próximo: revisor do M15, screenshots, parada. Marco NÃO fechado.
