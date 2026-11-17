# Ciclos 21 e 23 — M19 Arcano (relatório do orquestrador)

- Spec: `projeto.md` (conselheiro Opus; Fable exige créditos). 21-A `circulo.js` + `selo` + `textoEmArco` (sonnet); 21-B `sigilo.js` kamea (Agrippa 3–6) / roda / fusão (sonnet); 21-C formas novas do alfabeto (haiku, em 2 etapas: teste da saída atual → golden gravado pelo orquestrador → edição). Todas aceitas.
- Ruling: a `grade` antiga continua passando ~10% da caixa 500×700 (golden exige saída idêntica); formas novas cabem por construção.
- Revisor Opus: DEVOLVE (1) — anel 'texto' com letras de 0,5 mm (sem altura mínima) e pontilhado empastando. Ciclo 23 (23-A sonnet): `ALT_MIN = 1.5` mm; pontilhado com espaçamento ≥ 200 u; `complexidade` do círculo → `complexidadeCirculo` (colisão de PARAMS na UI do M20).
- Ruling: teste do pontilhado aceita < 30% de pares consecutivos abaixo de 0,8 mm (o resto vem de cruzamentos do esqueleto das letras) — custo: alguns pontos próximos em cruzamentos.
- Re-revisão do ciclo 23: orquestrador (correção = a pedida, testes numéricos novos; só o golden do pontilhado mudou, grade/sigilo(magia) iguais; fichas regeneradas).
- Gates: `npm test` 658/0; build ok; e2e 42/42.
- Menores (QUADRO): ogham empasta < 5 mm (entalhe 110 u) e o círculo de 40 u do curvo vira borrão a 3 mm; arcano em arco é ilegível por natureza (usar forma angular/ogham no anel); grupo 'sigilo' aparece em alfabeto.js e sigilo.js; `altura` de `textoEmArco` é nominal (traço ocupa ~0,7×).
