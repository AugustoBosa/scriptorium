# Quadro

Estado do projeto e o que falta. O histórico antigo (ciclos M1–M23) está no git, até o commit `156fdca`.

## Estado

- Repositório `AugustoBosa/scriptorium`; site em https://augustobosa.github.io/scriptorium/ (publicado pelo Actions a cada push no `main`).
- Pages: Settings › Pages › Source = **GitHub Actions** (`build_type: workflow`). Em "Deploy from branch" o GitHub publica o `index.html` cru por cima do build e o site quebra (aconteceu em 2026-11-19; conferir com `gh api repos/AugustoBosa/scriptorium/pages --jq .build_type`).
- Gates: `npm test`, `npm run build`, `npx playwright test`.
- Se a porta 127.0.0.1:8765 estiver ocupada, o e2e roda com uma config temporária que troca `localhost` por `[::1]` (não versionar).
- Golden de ornamento/motor: regravar só com `node --test --test-update-snapshots test/<arquivo>`, nunca `npm run golden` inteiro.

## Última entrega (2026-11-18)

- Reorganização: oficina Magias (pergaminho + grimório, separador entre magias), oficinas com a mesma ordem de painéis e a mesma lista de papéis, texto de exemplo e visual padrão por tipo, valores com 2 casas, destaque em vermelho na prévia dos controles, menu ☰ nas oficinas e home com cartões animados. Os textos do teste inicial e o histórico antigo saíram.

- Notas livres e biblioteca: notas com posição automática, por lado ou livre (arrastar) na Carta e no Livro; Livro com notas e rabiscos; trabalho salvo sozinho; aba Biblioteca com materiais (.json) e cópia de tudo; magias importadas guardadas no navegador.
- Mão natural nas notas: setas curvas e irregulares (tracoMao, curvaMao, pontaMao), notas inclinadas e giradas para caber, ângulo por nota (@lado/graus), controles com prévia; a nota só fica onde a seta tem caminho livre.

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
