# Produto: Scriptorium

## O que é
Um app de navegador que escreve à mão com uma plotter de caneta. O app gera letra de traço único com uma mão procedural e determinística (mesma seed, mesmo resultado), monta a página e exporta SVG e G-code. O usuário prende papel de verdade na mesa da máquina e ela escreve com caneta de verdade.

## Quem usa e onde
O dono do projeto, em casa, ao lado de uma Anycubic i3 Mega S adaptada como plotter (mesa 210 × 210 mm). Ele usa no desktop para compor e no celular para baixar o G-code perto da máquina. Faz cartas, páginas de livro, magias de D&D, sigilos e folhas de coleta da própria letra.

## Tarefas principais
1. Escolher uma oficina (Carta, Livro, Magias, Sigilos, Minha letra).
2. Escrever ou importar o conteúdo e ajustar a mão do personagem e o papel.
3. Conferir na prévia (Página) e na cena da máquina (Mesa).
4. Baixar o G-code da página ou da passada e plotar.

## Restrições
- **Traço único**: tudo que sai na folha é linha de caneta, sem preenchimento nem rasterização.
- **Papel real**: medidas em mm; a Mesa mostra onde o papel e a caneta ficam de fato.
- **Sem servidor**: tudo fica no navegador (localStorage e IndexedDB) e o site é estático no GitHub Pages.
- **Interface em pt-BR simples.** Básico mostra o essencial e Avançado mostra os ajustes finos e a máquina.

## Modo de cada superfície (impeccable)
- Oficinas, Personagens, Biblioteca: **Operate** (tarefa e escaneabilidade antes de expressão).
- Home (`#inicio`): **Operate** com vitrine. Os cartões mostram a miniatura real de cada oficina, desenhada traço a traço.

## Compromissos de marca
- O mundo é o de um scriptorium: pergaminho, tinta ferro-gálica, rubrica e pauta dupla de escriba. Ver `DESIGN.md`.
- A folha da prévia é sempre papel claro, nos dois temas, porque é o objeto físico que sai da máquina.
