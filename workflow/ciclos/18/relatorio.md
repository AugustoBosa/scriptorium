# Ciclo 18 — M17 Motor II: ductus (relatório do orquestrador)

- Spec: `projeto.md` (conselheiro Fable). Cinemática: filtro por comprimento de arco com janela ∝ velocidade (ΣΛ ficava facetado e encolhia 13–14%). `CURSIVAS` = 8 fontes.
- 18-A (sonnet) `ductus.js` (junções Hermite, adiamento, retoque) + escrita/layout/validar; 18-B (sonnet) `cinematica.js`; 18-C (haiku) cinemática no motor + 5 PARAMS + UI; 18-D (haiku) `test/ductus-dod.test.mjs`. Todas aceitas.
- Rulings: segmento da ponte ≤ 0,05 em (Hermite literal passa de PASSO); ordem 'escrita' com viagem entre palavras → M20.
- Revisor (Opus — Fable passou a exigir créditos): ACEITA com condição: `PARES` desliga v/w → letras de subida (laço da Hermite no gancho do v/w). Aplicado pelo orquestrador (linha de dado com valor exato do revisor).
- Gates: `npm test` 554/0 (inclui ornamento do M18, ainda sem commit), goldens do motor intactos; build ok; e2e 42/42 (via [::1], porta 127.0.0.1:8765 ocupada por processo de outra sessão).
- Ficha: `especime.svg/png`. Menores no QUADRO.
