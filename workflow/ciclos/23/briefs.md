# Ciclo 23 — correção do M19 (devolução 1 do revisor)

## Tarefa 23-A
modelo: sonnet
Arquivos permitidos: `src/arcano/circulo.js`, `src/arcano/alfabeto.js`, `test/circulo.test.mjs`, `test/alfabeto.test.mjs`.
Regras: não grave snapshot (nunca `--test-update-snapshots`/`npm run golden`); goldens de `circulo` e das formas novas do alfabeto VÃO mudar (relate quais); os goldens da `grade` do alfabeto e o de `sigilo(magia)` em `test/golden.test.mjs` NÃO podem mudar.

1. **Bloqueante** `circulo.js:66-70`, `:80`, `:42`, `:23` — anel 'texto' com letras ilegíveis (0,5 mm). Criar `ALT_MIN = 1.5` (mm). Linha ~68: só entrar no modo texto se `alt >= ALT_MIN` (senão cair nos dois círculos). Linha ~80 (runas): trocar `alt > 0.1` por `alt >= ALT_MIN`. Em `textoEmArco`: se a altura final (após encolher, linha ~42) ficar < ALT_MIN, devolver `[]`. Testes: Ø20 largura 0,15 e Ø40 largura 0,08 → anel 'texto' vira dois círculos (sem letras); com faixa larga continua com texto e altura ≥ 1,5 mm; prévias de `anel` e `faixa` do selo não ficam ilegíveis (prévia min ≠ max continua valendo).
2. **Bloqueante** `alfabeto.js:104` — pontilhado empasta. Trocar o passo do `reamostrar` de 100 para 200 u. Teste: pontilhado a 3,5 mm de altura (escala 3,5/700) → distância entre pontos ≥ 0,4 + 0,4 mm.
3. **Menor (fazer agora)** `circulo.js:162`: renomear a chave de PARAM `complexidade` para `complexidadeCirculo` (colide com a de `alfabeto.js:204` quando a UI juntar as listas no M20). Ajustar usos internos e testes.

Verificação: `node --test test/circulo.test.mjs test/alfabeto.test.mjs test/golden.test.mjs test/params.test.mjs` (só goldens de círculo/formas novas podem falhar) e `npm test`.
