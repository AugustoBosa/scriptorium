# Ciclos 25–26 — M21 Polimento (relatório do orquestrador)

- Desempenho (DoD): A4 com letra de 6 mm — 8 ms mão neutra, 148 ms com todos os params de motor/ductus no máximo (limite 400 ms).
- Auditoria (Opus, `auditoria.md`): 20 achados (1 P0, 10 P1, 9 P2). Ciclo 25: 25-A tema/shell, 25-B controles+painéis da mão, 25-C materiais/export/grimório (P0: livro imprimia a marcação crua), 25-D README + ui-smoke. Todas aceitas.
- Revisor Opus: ACEITA (17 resolvidos, 3 parciais, 2 regressões menores). Ciclo 26 (26-A): texto de folha vazia por oficina, `.linha-campo`, título do popover em maiúscula, ui-smoke atualizado.
- Gates: `npm test` 794/0; build ok; e2e 68/68 (claro e vela, via [::1]).
- Parciais (QUADRO): "Quem escreve"/"Variação" do grimório sem prévia viva; prévia com "mostrar trajeto" ainda otimiza a cada render; select "Camada" largo empurra "Baixar G-code" para a 2ª linha no Livro/Sigilos.
