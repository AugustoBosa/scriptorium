# Quadro

Estado do projeto e o que falta. O histórico antigo (ciclos M1–M23) está no git, até o commit `156fdca`.

## Estado

- Repositório `AugustoBosa/scriptorium`; site em https://augustobosa.github.io/scriptorium/ (publicado pelo Actions a cada push no `main`).
- Gates: `npm test`, `npm run build`, `npx playwright test`.
- Se a porta 127.0.0.1:8765 estiver ocupada, o e2e roda com uma config temporária que troca `localhost` por `[::1]` (não versionar).
- Golden de ornamento/motor: regravar só com `node --test --test-update-snapshots test/<arquivo>`, nunca `npm run golden` inteiro.

## Em andamento

- Reorganização (branch `reorganizacao`): oficina Magias (pergaminho + grimório), padronização das oficinas, controles com 2 casas e destaque na prévia, menu ☰ e home animada.

## Pendências de hardware (usuário)

1. Na Mega S, `G0 X0 Y0` deve levar a caneta ao canto frente-esquerda. Se não levar, ajustar "origem" no painel Mesa e folha.
2. Imposição: Carta → A6 → Mesa e folha → folha A4 → baixar a passada 1 → rodar com a caneta levantada, depois com a caneta.
3. Conferir se o `M0` (troca de caneta) retoma na tela da Mega S.
4. Calibrar no papel: tamanho e legibilidade, `fluidez`, fadiga, ligações (EMSAllure, Swiss, Society), arremate.
5. P2S nunca testada: pesquisa em `workflow/experimentos/p2s/PESQUISA.md`.

## Pendências técnicas

- Mesa: faixas intermediárias; `M0` entre passadas.
- Motor: 2-opt de blocos (a ordem de escrita viaja 1,6 a 1,7× mais); `PARES` por fonte (z da EMSSwiss).
- Livro: 2 colunas sem equilíbrio na última página.
- Arcano: ogham e curvo empastam abaixo de 5 mm.
- CI: `actions/deploy-pages@v4` roda em Node 20; atualizar quando sair versão nova.
