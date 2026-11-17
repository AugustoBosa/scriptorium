# Ciclos 22 e 24 — M20 Materiais (relatório do orquestrador)

- Spec: `projeto.md` (conselheiro Opus). Ondas: 1) 22-A grupos de palavra, ordem 'escrita' por grupo, CANETAS/escreverEm, camada.id sanitizado; 2) 22-B notas+carta, 22-C livro (cabeçalho, nº de página, reclamo), 22-D folha de sigilos, 22-E scroll/grimório → Documento (`paginasGrimorio` alias, golden intacto); 3) 22-F UI (ui/materiais.js, app.js com Documento), 22-G export por camada. Todas aceitas.
- Rulings: workers não gravam golden (só o orquestrador); onda 3 em paralelo às fichas/revisão; 'faixa' de carta × selo resolvida com PARAMS por módulo na UI; 10 frases → 2 páginas na folha de sigilos (spec contava errado).
- Revisor materiais (Opus): DEVOLVE (5) — conector descartado, laço descartado, livro encostado na vinha, rabisco sem mão, correção pequena. Revisor UI: DEVOLVE (1) — Tradição de Sigilos com controles mortos. Ciclo 24: 24-A notas, 24-B livro, 24-C UI. Re-revisão: 6/6 ADDRESSED, ACEITA.
- Limite de uso derrubou o ciclo 24 uma vez; retomado sem perda.
- Gates: `npm test` 794/0 (goldens antigos intactos; carta/livro/sigilos/scroll novos gravados pelo orquestrador), build ok, e2e 58/58 (via [::1]).
- Menores (QUADRO): viagem escrita÷otimizada 1,6–1,7× (passo seguinte: 2-opt de blocos); livro 2 colunas sem equilíbrio na última página; teste do reclamo não lê o traço desenhado; conector "chave" fica longe do texto quando a nota está na mesma altura; selects de caneta/personagem das notas fora da grade; Tradição de Sigilos não troca a mão (comporSigilos usa uma mão só).
