# Scriptorium

Caligrafia de traço único para plotter de caneta. O app gera a letra com uma mão procedural e determinística (mesma seed, mesmo resultado), monta a página e exporta SVG e G-code.

- **Mão própria por personagem**: fontes de traço único misturadas e mutadas, com variação por ocorrência, encaixe, ligaduras, deriva lenta e cinemática da caneta.
- **Variações** (normal, apressado, raiva, cansaço...) mudam só a execução; a letra continua reconhecível.
- **Ornamento e arcano**: bordas, vinhas, capitulares, filigranas, sigilos e alfabeto arcano.

## Oficinas

Cada oficina é uma rota do `index.html`: `#carta`, `#scroll`, `#grimorio`, `#livro`, `#sigilos`.

- **Carta** (`#carta`): carta, anotação ou diário. Marcações no texto: `{nota: ...}`, `{~errado~>certo}`, `{_sublinhar_}`, `{o:circular}`. As notas vão para uma camada própria (margem, risco, sublinhado, laço), com caneta e personagem próprios.
- **Scroll** (`#scroll`): uma magia de D&D por folha, em A5, A6, A7 ou A8.
- **Grimório** (`#grimorio`): magias em sequência, na mesma folha. Quem escreve é um personagem salvo na Carta. O bloco marcado sai em alfabeto arcano, com chave opcional. O sigilo de cada magia codifica nível, escola, concentração, ritual e componentes.
- **Livro** (`#livro`): colunas, título corrente, numeração, reclamo, rubrica, capitular e borda. Usa o mesmo texto da Carta.
- **Sigilos** (`#sigilos`): cada frase vira um selo, um sigilo (método kamea, roda ou fusão) ou um círculo, com legenda. Os sigilos ficam em grade numa folha.

`grimorio.html` só redireciona para `index.html#grimorio`.

## Interface

- **Básico / Avançado**: o básico mostra o essencial; o avançado mostra os ajustes finos e a máquina.
- **Prévia viva**: cada controle mostra uma amostra ao passar o mouse ou focar. Os controles de valor têm régua e escala de 10 mm.
- **Temas**: claro e vela (escuro).
- **Salvos no navegador** (localStorage): personagens (`writer.personagens`), perfil de máquina (`writer.perfil`) e preferências de tema e nível (`writer.ui`). Nada vai para servidor.
- **Trajeto**: "mostrar trajeto" na prévia mostra a viagem no ar, início, fim e ordem de cada traço.
- **Texto**: pode ser digitado ou importado de um `.txt` de até 200 KB.

## Máquinas (`src/maquina/perfis.js`)

- **megaS**: Anycubic i3 Mega S como plotter, mesa 210 × 210 mm. É o único perfil testado no equipamento.
- **p2s**: Bambu P2S, experimental. Janela útil de cerca de 207 × 200 mm. Nunca testada no equipamento.
- **personalizado**: perfil editável, a partir do megaS.

O papel máximo é a janela útil do perfil. Papel maior que a janela é bloqueado na exportação, com mensagem. A troca de caneta gera `M0` com aviso. A exportação é por página e por camada (SVG e G-code), ou por "Todas as páginas".

## Papéis (`src/materiais/documento.js`)

A3, A4, A5, A6, A7, A8, carta, ofício e personalizado, em retrato ou paisagem, com margens por lado. O scroll e o grimório usam só A5 a A8.

## Estrutura

- `src/motor/`: mão, ductus, escrita, cinemática.
- `src/ornamento/`: bordas, vinhas, capitulares, filigranas.
- `src/arcano/`: alfabeto, círculo, sigilo.
- `src/materiais/`: carta, livro, scroll, sigilos, notas, documento.
- `src/maquina/`: perfis, G-code, otimização do trajeto.
- `src/ui/`: interface (DOM e CSS). Fora de `src/ui/` o código não usa DOM.
- `fontes/`: 43 fontes de traço único (EMS, Hershey, Relief, Mistral, TwinSans). Licenças em `fontes/LICENCAS.md`.
- `dados/`: dados das magias. Fica fora do git.
- `scripts/gerar-magias.mjs`: gera `dados/magias.json` a partir de 5etools (padrão: `../../dnd/data/spells`). A tradução é `dados/traducao-ptbr.txt` (uma linha `id|Nome|Resumo` por magia).
- `test/`: testes de unidade. `e2e/`: testes Playwright.
- `workflow/`: quadro de tarefas e definição de pronto.

## Rodar

Requisito: Node 25, a mesma versão do CI. Depois de `npm ci`:

- `npm run dev`: servidor em `http://localhost:8765/`. A porta é fixa (`--strictPort`): se estiver ocupada, o comando falha.
- `npm test`: testes de unidade (`node --test`), com snapshots em `test/*.snapshot`.
- `npm run e2e`: Playwright (Chromium), nos projetos `claro` e `vela`. Sobe o `npm run dev` sozinho se ele não estiver rodando.
- `npm run build`: gera `dist/` e copia `fontes/` e `dados/` (se existirem).
- `npm run golden`: regrava os snapshots. Use só de propósito e revise o diff.

Roteiro manual da interface: `test/ui-smoke.md`.

## Publicação

`.github/workflows/pages.yml` publica no GitHub Pages a cada push em `main`: `npm ci`, `npm test`, `npm run build` e envio de `dist/`. Pré-requisito único no GitHub: Settings › Pages › Source = "GitHub Actions". `dados/` não vai para o Pages (está no `.gitignore`); sem `dados/magias.json`, o grimório oferece importar o JSON ou criar magias em branco.
