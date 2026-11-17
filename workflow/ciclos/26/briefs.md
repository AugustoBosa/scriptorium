# Ciclo 26 — retoques finais do M21 (regressões menores apontadas pelo revisor)

## Tarefa 26-A
modelo: haiku
Arquivos permitidos: `src/ui/app.js`, `src/ui/tema.css`, `src/ui/controle.js`, `test/ui-smoke.md`.

1. `src/ui/app.js:115`: a frase de folha vazia está fixa em "Escolha uma magia na lista à esquerda." para todas as oficinas. Trocar por texto por oficina: grimorio/scroll → "Escolha uma magia na lista."; carta/livro → "Escreva o texto no painel Texto."; sigilos → "Escreva as frases no painel."; outra → "Nada para desenhar ainda.".
2. `src/ui/tema.css`: acrescentar `.linha-campo { display: flex; align-items: center; gap: var(--e2); }` (o "?" fica ao lado do rótulo em texto/exportar/grimório).
3. `src/ui/controle.js:74`: o título do popover (`.pv-cab span`) sai em minúscula; capitalizar a primeira letra (CSS `.pv-cab span::first-letter { text-transform: uppercase }` em tema.css, ou no texto) — escolha um, só um.
4. `test/ui-smoke.md`: atualizar a referência de desempenho para 8 ms (mão neutra) / 148 ms (tudo no máximo) e acrescentar o passo "a 375 px de largura, o cabeçalho cabe numa linha e o menu de oficinas rola na horizontal sem cortar 'Vela'".
Verificação: `npm test`, `npm run build`, e2e via config temporária `[::1]` (`sed 's#http://localhost:8765/#http://[::1]:8765/#g' playwright.config.js > pw.26.tmp.config.js && npx playwright test -c pw.26.tmp.config.js`; apagar depois). Não gravar snapshot.
