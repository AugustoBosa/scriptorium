# Relatório do ciclo 11 — M14 (revisão)

`npm test`: `ℹ tests 126 / pass 126 / fail 0 / skipped 0`. `git status --short test/golden.test.mjs.snapshot` vazio (goldens intactos). Build e e2e não rodados (gate do orquestrador).

## Tarefas
- **11-A aceita.** `perfis.js` (megaS com header/footer idênticos aos antigos, p2s, personalizado, `papelMaximo`, `cabeNaMaquina`), `gcodeDocumento`, `otimizar(..., { ordem: 'escrita' })`. 10 casos da spec cobertos em `test/perfis.test.mjs` (3) e `test/gcode-camadas.test.mjs` (7). Correção minha (1 linha): tirei de `gcode.js` o import não usado de `papelMaximo`.
- **11-B aceita.** `compor` reescrito com cursor, colunas, obstáculos e âncoras; 8 casos em `test/layout-caixas.test.mjs`; golden, layout, espacamento e grimorio intactos.
- **11-C aceita.** `documento.js` (`PAPEIS`, `papel`, `deTracos`, `validarDocumento`), `FOLHAS`/`folha` derivados em `scroll.js`; 7 testes.

## Notas
- Glifos podem invadir a caixa do obstáculo à esquerda em até ~0,3 mm (inclinação do glifo, dentro da tolerância `tamanho*0.3` já documentada). Quem chama deve inflar a caixa (spec: "sem folga"). Não bloqueia.
- `gcodeDocumento` só exige `estaciona` nos perfis novos; perfil salvo antigo sem `estaciona` daria TypeError. A UI do M15 deve mesclar com `PERFIS.megaS` ao carregar.
- Proposta para o contrato: A5 não cabe na janela da P2S (207×200) em nenhuma orientação; o maior papel de tabela que cabe é A6. A PESQUISA cita "A5 paisagem" (contradição). Levar ao usuário.
- P2S nunca testada em hardware; `experimental: true`.

## DoD M14 comprovado por teste
G-code P2S sem `M412`/`M104`/`M109`/E, dentro da janela, Z >= zMin; pausa na troca de caneta; erro claro papel > janela e Z < zMin; papéis A3–A8, carta, ofício, personalizado; `compor` devolve `ancoras` e aceita `obstaculos` e `colunas`; saída antiga idêntica ao golden.

## Próximo passo
Gates do orquestrador (build, e2e, revisor) e fechar M14; depois M15 (PARADA para aprovação do usuário).
