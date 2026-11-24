# Scriptorium

Publicado em https://augustobosa.github.io/scriptorium/

Caligrafia de traço único para plotter de caneta. O app gera a letra com uma mão procedural e determinística (mesma seed, mesmo resultado), monta a página e exporta SVG e G-code.

- **Mão própria por personagem**: fontes de traço único misturadas e mutadas, com variação por ocorrência, encaixe, ligaduras, deriva lenta e cinemática da caneta.
- **Variações** (normal, apressado, raiva, cansaço...) mudam só a execução; a letra continua reconhecível.
- **Ornamento e arcano**: bordas, vinhas, capitulares, filigranas, sigilos e alfabeto arcano.

## Oficinas

Cada oficina é uma rota do `index.html`: `#carta`, `#livro`, `#magias`, `#sigilos`, `#letra`. A rota padrão é `#inicio`: a home tem um cartão por oficina, com a miniatura real desenhada traço a traço. `#personagens` cria, edita e escolhe a mão em uso. Dentro de uma oficina, o menu ☰ do cabeçalho leva às outras. As rotas antigas `#scroll` e `#grimorio` levam a `#magias`.

Todas as oficinas têm a mesma ordem de painéis: Personagem, conteúdo, Papel, painel próprio, Mesa e folha, Máquina. Cada tipo abre com um texto de exemplo e um visual padrão próprios.

- **Carta** (`#carta`): carta, anotação ou diário. Marcações no texto: `{nota: ...}`, `{~errado~>certo}`, `{_sublinhar_}`, `{o:circular}`. As notas vão para uma camada própria (margem, risco, sublinhado, laço), com caneta e personagem próprios. Sem posição, a nota vai para a margem de notas (anotação e diário) ou para o lugar livre mais perto da palavra, ligada por seta. `{nota@direita: ...}` fixa o lado (esquerda, direita, acima, abaixo) e `{nota@x,y: ...}` fixa a posição em mm; o painel Notas lista as notas (lado e ângulo de cada uma), e arrastar a nota na prévia grava a posição. `{nota@direita/30: ...}` ou `{nota@/30: ...}` fixam o ângulo. Por padrão a mão das notas é natural: seta curva e um pouco torta, ponta de farpas desiguais, notas levemente inclinadas que giram (diagonal, até 90°) quando assim cabem mais perto, como na margem estreita de um livro. Controles no painel Notas: curva da seta, irregularidade do traço, ponta (aberta, gancho, fechada), inclinação e girar para caber.
- **Magias** (`#magias`): magias de D&D. Ligado "uma magia por página", cada magia vira um pergaminho avulso; desligado, as magias seguem como num grimório, com ou sem separador decorado entre elas (losango, asteriscos ou onda). O bloco marcado sai em alfabeto arcano, com chave opcional. O sigilo de cada magia codifica nível, escola, concentração, ritual e componentes.
- **Livro** (`#livro`): colunas, título corrente, numeração, reclamo, rubrica, capitular e borda. Usa o mesmo texto da Carta e aceita as mesmas marcações: notas soltas com seta, correções, sublinhados, laços e rabiscos nas margens, sem tocar a paginação, a borda nem a capitular.
- **Sigilos** (`#sigilos`): cada frase vira um selo, um sigilo (método kamea, roda ou fusão) ou um círculo, com legenda. Os sigilos ficam em grade numa folha.
- **Minha letra** (`#letra`): a máquina plota as folhas de coleta (texto modelo por língua e letras soltas, com marcas de canto e código da folha) para você escrever à mão. A leitura da foto e a geração da fonte são as próximas etapas (`workflow/experimentos/fonte-propria/PESQUISA.md`).

## Interface

- **Básico / Avançado**: o básico mostra o essencial; o avançado mostra os ajustes finos e a máquina.
- **Prévia viva**: cada controle mostra uma amostra ao passar o mouse ou focar. O que o controle altera aparece em vermelho; o resto, em tinta. Os controles de valor têm régua e escala de 10 mm, e os valores têm no máximo 2 casas depois da vírgula.
- **Personagens**: galeria com espécime; a mão em uso vale para todas as oficinas.
- **Temas**: claro e vela (escuro).
- **Salvos no navegador**: personagens (`writer.personagens`), perfil de máquina (`writer.perfil`), preferências (`writer.ui`) e o trabalho em andamento de cada oficina (`trabalho.escrita`, `trabalho.sigilos`, `grimorio.estado`), no localStorage. No IndexedDB (`scriptorium`): os materiais da biblioteca e o `magias.json` importado. Nada vai para servidor.
- **Biblioteca** (`#biblioteca`): "Salvar na biblioteca" guarda o trabalho com nome (oficina, texto ou magias, ajustes e personagem). A aba abre, baixa (.json), renomeia e apaga; "Baixar cópia de tudo" leva personagens e materiais para outro navegador. A home mostra os mais recentes.
- **Mesa** (botão Mesa acima da prévia): a mesa da máquina vista de cima, com a frente embaixo, a origem X0 Y0, até onde a caneta alcança, a folha e o texto projetado no lugar onde a caneta vai escrever. Sem imposição, mostra a página atual; com imposição, a folha inteira, com o texto da passada em tinta e o das outras em cinza (passadas vazias ficam marcadas e não geram arquivo). "Ampliar" abre a cena em tela cheia.
- **Trajeto**: "mostrar trajeto" na prévia mostra a viagem no ar, início, fim e ordem de cada traço.
- **Texto**: pode ser digitado ou importado de um `.txt` de até 200 KB.

## Máquinas (`src/maquina/perfis.js`)

- **megaS**: Anycubic i3 Mega S como plotter, mesa 210 × 210 mm. É o único perfil testado no equipamento.
- **megaSTroca** e **megaSTrocaLado**: Mega S com o porta-caneta de troca automática (4 vagas, ímãs; modelo em `hardware/pen_holder`, branch `hardware-pen-holder`), preso na frente ou no lado direito do cabeçote. A caneta fica a 41,5 mm do bico (porta-caneta v4), então a área útil cai para 210 × 152,5 mm na frente (A5 deitado cabe) e 152,5 × 210 mm no lado (A5 em pé cabe); o G-code já desconta essa distância. Experimental: as posições (`troca` em `src/maquina/perfis.js`) são estimativas do modelo 3D, nada medido. A caneta de cada camada vai para a vaga da sua posição em `canetas` (preta = vaga 1, vermelha = vaga 2…). No lugar do `M0`, o G-code pega a primeira caneta, troca entre camadas e devolve a última.
- **p2s**: Bambu P2S, experimental. Janela útil de cerca de 207 × 200 mm. Nunca testada no equipamento.
- **personalizado**: perfil editável, a partir do megaS.

O papel máximo é a janela útil do perfil. Papel maior que a janela é bloqueado na exportação, com mensagem. Depois do header, a caneta sobe para `zLevantada` antes da 1ª viagem; `zLevantada` tem que ficar acima de `zEscrita`, senão a exportação recusa. A troca de caneta gera `M0` com aviso. A exportação é por página e por camada (SVG e G-code), ou por "Todas as páginas".

## Papéis (`src/materiais/documento.js`)

A3, A4, A5, A6, A7, A8, carta, ofício e personalizado, em retrato ou paisagem, com margens por lado. Todas as oficinas usam a mesma lista; o limite é a janela da máquina.

## Estrutura

- `src/motor/`: mão, ductus, escrita, cinemática.
- `src/ornamento/`: bordas, vinhas, capitulares, filigranas.
- `src/arcano/`: alfabeto, círculo, sigilo.
- `src/materiais/`: carta, livro, scroll (magias), sigilos, notas, documento, exemplos (texto e visual padrão de cada tipo).
- `src/maquina/`: perfis, G-code, otimização do trajeto, imposição na mesa.
- `src/letra/`: folhas de coleta da Minha letra e textos modelo por língua (`linguas/`).
- `src/geo.js`: geometria comum (`dist`, `comprimento`, `clamp`, `ret`, `VAO`, `valido`, recortes, hachura). Não copiar esses helpers em outro arquivo.
- `src/ui/`: interface (DOM e CSS). Fora de `src/ui/` o código não usa DOM. Ajudantes de DOM e armazenamento em `src/ui/util.js`.
- `fontes/`: 43 fontes de traço único (EMS, Hershey, Relief, Mistral, TwinSans). Licenças em `fontes/LICENCAS.md`.
- `dados/`: dados das magias. Fica fora do git.
- `scripts/gerar-magias.mjs`: gera `dados/magias.json` a partir de 5etools (padrão: `../../dnd/data/spells`). A tradução é `dados/traducao-ptbr.txt` (uma linha `id|Nome|Resumo` por magia).
- `test/`: testes de unidade. `e2e/`: testes Playwright.
- `workflow/`: quadro do projeto (`QUADRO.md`) e experimentos (P2S, fonte própria).
- `PRODUCT.md` e `DESIGN.md`: regras do produto e do design; ler antes de mexer na interface.

## Rodar

Requisito: Node 24 ou mais novo (o CI usa o 24 LTS). Depois de `npm ci`:

- `npm run dev`: servidor em `http://localhost:8765/`. A porta é fixa (`--strictPort`): se estiver ocupada, o comando falha.
- `npm test`: testes de unidade (`node --test`), com snapshots em `test/*.snapshot`.
- `npm run e2e`: Playwright (Chromium). O projeto `claro` roda tudo; o `vela` (tema escuro) roda só `visual.spec.js`. Sobe o `npm run dev` sozinho se ele não estiver rodando.
- `npm run build`: gera `dist/` e copia `fontes/` e `dados/` (se existirem).
- `npm run golden`: regrava os snapshots. Use só de propósito e revise o diff.

Roteiro manual da interface: `test/ui-smoke.md`.

## Publicação

`.github/workflows/pages.yml` publica no GitHub Pages a cada push em `main`: `npm ci`, `npm test`, `npm run build` e envio de `dist/`. Em pull request roda os mesmos testes e o build, sem publicar. Pré-requisito único no GitHub: Settings › Pages › Source = "GitHub Actions". `dados/` não vai para o Pages (está no `.gitignore`); sem `dados/magias.json`, a oficina Magias oferece importar o JSON ou criar magias em branco.
