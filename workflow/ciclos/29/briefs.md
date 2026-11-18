# Ciclo 29 — correção do M23 (devolução 1 do revisor)

## Tarefa 29-A
modelo: sonnet
Arquivos permitidos: `src/maquina/imposicao.js`, `test/imposicao.test.mjs`, `src/ui/mesa.js`, `e2e/mesa.spec.js`.
Regras: não grave snapshot; goldens e e2e antigos intactos; não toque `src/magia.js`, `grimorios/`, `src/ornamento/tempo.js`, `test/tempo.test.mjs` (outra sessão). Script de checagem do revisor (consulta): C:\Users\augus\AppData\Local\Temp\claude\d1d77e7611eb9127\56f76b22-91bd-453f-bc05-e77027826f21\scratchpad\geo.mjs.

**Bloqueantes**
1. `imposicao.js:~110` — "gire a folha 90°/270°" é rotação ABSOLUTA, mas quem segura a folha entende RELATIVA à posição atual. Com 4 passadas (A3 na Mega S; A4 na P2S) a passada 3 diz "gire 90°" logo após a de 180° → a folha termina errada. Correção: a instrução descreve a POSIÇÃO FINAL da folha, independente da anterior: "topo para trás" (0°), "topo para a direita" (90°), "topo para a frente" (180°), "topo para a esquerda" (270°) — confira o sentido de 90 vs 270 contra `paraMesa`/`girar` (topo da folha = t=0; trás = Y alto; direita = X alto). Pode manter "(gire a partir da posição normal)" como apoio, nunca "gire N°" sozinho. Teste novo com 4 passadas (A3 na Mega S): cada instrução nomeia a direção do topo coerente com a geometria (verifique numericamente onde o ponto (W/2, 0) da folha cai na mesa em cada passada).
2. `mesa.js:82-83` — `gcodePassada` descarta `g.avisos` e não trava perfil experimental. Aplicar a mesma regra de `src/ui/exportar.js:48`: avisos "fora da janela" aparecem na vista/erro (sem bloquear na Mega S); com `perfil.experimental` (P2S) e aviso, NÃO gerar o arquivo e mostrar o erro. Teste e2e ou unitário cobrindo offsetX ≠ 0 que empurra traço para fora → aviso visível.

**Menores (fazer agora)**
3. `imposicao.js:~107-108` — a "sobra" deve ser medida contra a MESA física (mesaX/mesaY), não a janela, e dizer o eixo: "sobra 87 mm para trás" / "… para a direita". Se não sobra nada da mesa, não falar em sobra.
4. Instrução: "encoste a borda curta na frente, no canto frente-esquerda (X0 Y0 da caneta — confira com G0 X0 Y0)". Quando a folha sobrar para trás na Mega S, acrescentar "confira se a folha não bate na estrutura quando a mesa vai para a frente".
5. Com várias folhas, a instrução e o comentário do G-code começam com "Folha F, passada K de N"; no modo um-por-página, o comentário diz também "página P".
6. `mesa.js`: o aviso "Imposição desligada…" diz para mudar para Avançado se o painel não estiver visível ("abra Avançado → Mesa e folha").
Verificação: `node --test test/imposicao.test.mjs`, `npm test`, `npm run build`, e2e `e2e/mesa.spec.js` com config temporária `[::1]` (apague depois); abra a captura `test-results/visual-captura-mesa-claro--claro/mesa-claro.png` depois de rodar `e2e/visual.spec.js` e confirme a instrução nova.
