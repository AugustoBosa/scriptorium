# Ciclo 27 — M22 home + aba Personagens + nome Scriptorium (relatório do orquestrador)

- Spec: `projeto.md` (conselheiro Opus; o 1º despacho foi bloqueado pelo modo de plano). T0 `src/ui/especime.js` gravado pelo orquestrador (código da spec).
- T1 (sonnet) aba `#personagens`: galeria com espécime, criar/duplicar/renomear/excluir/importar/exportar/usar; editor = painel existente com `{galeria:true}`; `nomeLivre`/`renomearSalvo` puros com teste. T2 (sonnet) home `#inicio` com cartões das 5 oficinas e faixa de personagens. T3 (sonnet) rotas (padrão `#inicio`, links antigos valem), nav com Início/Personagens, `restaurar` ao voltar, gancho do M23. T4 (haiku) nome `scriptorium` em package.json/lock, README, ui-smoke.
- Limite de uso derrubou T1/T3 uma vez; retomados sem perda.
- Revisor Opus: DEVOLVE (1) — links sem cor do tema. Corrigido pelo orquestrador (`a { color: var(--rubrica) }`) + nav quebra linha a 375 px (aba Personagens visível).
- Gates: `npm test` 810/0; build ok; e2e 116/116 (sem `mesa.spec`, que é do M23 e ainda não está ligado).
- Menores (QUADRO): ordem de Tab ≠ visual na aba Personagens (editor com `order:-1`); botão "Novo personagem" do editor repete o "Novo" da aba; "+ Novo" da home sobrescreve a mão atual sem confirmar.
