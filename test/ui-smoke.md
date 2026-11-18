# Roteiro de verificação da interface (manual, no navegador)

Roda sob demanda. Não entra no `npm test`. Rode depois de mexer em `src/ui/*.js`, `index.html` ou `src/ui/tema.css`. Para os testes automáticos de interface, use `npm run e2e`.

## Preparar

1. Na raiz do projeto: `npm run dev`.
2. Abra `http://localhost:8765/`. No DevTools, marque "Desabilitar cache" (aba Network), para não testar código antigo.
3. Teste nos dois temas: claro e vela. Use o botão do cabeçalho ou emule `prefers-color-scheme` no DevTools.

## Carta (`#carta`)

1. Console sem erro e campo `#erro` vazio.
2. O texto padrão mostra a nota `{nota: ...}` na margem, sem aviso de "nota descartada".
3. Mude "tipo de folha" para diário: a nota muda de lado.
4. Mexa na inclinação: a prévia muda.

## Scroll (`#scroll`)

1. Console sem erro. Escolha uma magia na lista: a folha mostra nome, ficha e efeito.
2. Troque o papel entre A5 e A8: a magia se ajusta à folha.

## Grimório (`#grimorio`)

1. Busque uma magia por nome em inglês e em português. Os filtros de nível e classe mudam a lista.
2. Adicione duas magias. "Limpar lista" pede confirmação.
3. Em "Desenhar símbolos…", desenhe com o mouse e feche o editor. Repita com toque (ou emulação de toque no DevTools).

## Livro (`#livro`)

1. Com o texto padrão, a folha não mostra `{` nem `}`.
2. Cole um texto longo (várias centenas de palavras): aparecem 3 páginas ou mais, com numeração e reclamo.
3. Ative capitular e borda: a folha muda sem erro.

## Sigilos (`#sigilos`)

1. Com 4 frases, a folha mostra 4 sigilos, cada um com legenda.
2. Troque o tipo entre selo, sigilo e círculo: a folha muda.
3. Troque o método do sigilo (kamea, roda, fusão): a folha muda.

## Básico e Avançado

1. No Básico, aparecem só os grupos e controles essenciais. Em Avançado, aparecem os ajustes finos e o grupo Máquina.
2. O nível escolhido fica salvo ao recarregar a página.

## Prévia e popover

1. Passe o mouse ou foque um slider: aparecem a amostra, a régua e a escala de 10 mm.
2. Em um select (fonte, personagem, caneta), a opção atual mostra a amostra.
3. Escape fecha o popover.
4. Clique no "?" de um controle: a ajuda abre e fecha.

## Exportar (barra inferior)

1. Em Carta, escolha a camada "notas" e clique em "Baixar SVG": o arquivo é `carta-p1-notas.svg`.
2. Com o perfil p2s e papel maior que a janela, "Baixar G-code" mostra a mensagem de papel que não cabe.
3. Com o perfil megaS e papel A5, "Baixar G-code" gera o arquivo.
4. Com "mostrar trajeto" ligado, a prévia mostra tracejado, bolinha verde (início), bolinha vermelha (fim) e números.
5. "Todas as páginas" baixa um arquivo por página. O navegador pode pedir permissão para vários downloads.

## Fontes e tabela

1. "Tabela de fontes" abre o diálogo com 43 linhas. Cada linha tem a amostra da fonte.
2. "Usar" troca a mão da escrita e a prévia muda.

## Texto

1. Importe um `.txt` pequeno: o texto troca.
2. Importe um arquivo acima de 200 KB: aparece "Arquivo grande demais" e o texto anterior fica.

## Teclado e acessibilidade

1. Tab percorre os controles na ordem visual, com anel de foco visível.
2. O botão de tema alterna entre "Vela" e "Claro".
3. Na árvore de acessibilidade do DevTools, os campos têm nome.

## Largura de 375 px

1. A 375 px de largura, o cabeçalho cabe numa linha e o menu de oficinas rola na horizontal sem cortar "Vela".

## Início (`#inicio`)

1. Abra `http://localhost:8765/` sem hash: a URL vira `#inicio` e aparecem as 5 oficinas, cada uma com miniatura de folha.
2. Clique em cada cartão de oficina: a rota certa abre e a prévia mostra a folha.
3. Com um personagem salvo, "Usar" muda a linha "Mão atual" e as miniaturas são reescritas com a mão nova.
4. Sem personagens salvos, aparece "Nenhum personagem salvo ainda." e o cartão "+ Novo personagem".

## Personagens (`#personagens`)

1. Clique em "+ Novo personagem", dê um nome e "Salvar na galeria": o cartão aparece na galeria.
2. Em um cartão, "Duplicar" cria "X (cópia)"; "Renomear" com nome repetido mostra o erro; "Excluir" pede confirmação.
3. "Importar JSON" aceita um personagem válido e mostra a lista de erros de um inválido.
4. Em "Usar", vá para `#carta`: o campo Nome do painel mostra o personagem escolhido.

## Referência de desempenho (ciclo 25, auditoria)

A4 com margem de 6 mm: composição neutra (mão neutra) 8 ms, composição cheia (tudo no máximo) 148 ms. Meta: abaixo de 400 ms. Meça de novo se mexer em `compor` ou no layout.
