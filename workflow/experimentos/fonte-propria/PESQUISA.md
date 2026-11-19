# Letra do usuário → fonte de traço único (pesquisa + proposta)

## Contexto

O Scriptorium desenha com fontes de **traço único** em formato SVG font (`fontes/*.svg`, lidas por `src/fonte.js`: `<font horiz-adv-x>`, `<glyph unicode d>`).
A meta é uma ferramenta que transforma a letra do próprio usuário numa fonte desse tipo.
Isto muda a escolha de ferramenta: quase todo gerador de fonte de letra (Calligraphr, handwrite, draw-your-font) produz **contorno** (TTF). A plotter desenha o contorno duas vezes, e a letra fica "oca". Precisamos do **eixo do traço** (linha central).

## O papel das fotos

- Tilibra, refil argolado, **pontilhado cinza**, 200 × 275 mm, 63 g/m², 80 folhas.
- O espaçamento dos pontos não está publicado. Provável: 5 mm. **Medir com régua** (contar pontos em 10 cm).
- Papel fino: o verso aparece na foto 3 (marcas das notas do outro lado). Escrever só de um lado.
- A folha curva na foto. Os pontos resolvem isto (ver item 3 da tabela de técnicas).

### O que os pontos dão de graça

| Ganho | Como |
|---|---|
| Tamanho real em mm | cada ponto tem posição conhecida (ex.: a cada 5 mm) |
| Corrigir perspectiva e curva | cada quadrado de 4 pontos vira um quadrado perfeito (correção por pedaço, não só uma vez na folha toda) |
| Linha de base e altura do "x" | combinar: base numa fileira de pontos, "x" com 1 casa, maiúscula/haste com 2 casas, perna (g, p) 1 casa abaixo |
| Saber qual letra é qual | cada letra numa "caixa" fixa de N × N pontos, numa ordem combinada (folha-guia) |
| Apagar os pontos depois | pontos são cinza e pequenos; a caneta é azul/preta e contínua → filtro por cor e tamanho |

## Tabela 1 — Ferramentas prontas

| Ferramenta | O que faz | Saída | Serve para a plotter? | Custo |
|---|---|---|---|---|
| Calligraphr (site) | folha-modelo → foto → fonte; variantes por letra; ligaduras no Pro | TTF/OTF (contorno) | **Não direto** (contorno) | grátis 75 letras/2 variantes; Pro ~US$ 6–10/mês (conferir) |
| builtree/handwrite (Python) | folha-modelo → fonte com potrace + FontForge | TTF (contorno) | Não direto | grátis, MIT; instalar FontForge e potrace |
| draw-your-font (Node) | foto da letra → fonte, sem instalar nada | TTF (contorno) | Não direto | grátis, MIT |
| Fontify / Handwright | igual aos acima, página web | TTF (contorno) | Não direto | grátis |
| Inkscape + "Custom Stroke Font" (Shriinivas) | você **redesenha à mão** o eixo de cada letra sobre a foto; gera fonte de traço único | SVG de traço único (usado pela extensão Hershey Text) | **Sim** | grátis; trabalho manual alto; relatos de menu desativado em versões novas |
| Single Line Font Maker (pirillo) | converte uma fonte de contorno em traço único no navegador | SVG/DXF | Sim, mas resultado ruim em letra grossa | grátis |

## Tabela 2 — Técnicas (blocos para montar a nossa)

| # | Técnica | Para que serve | Biblioteca | Dificuldade |
|---|---|---|---|---|
| 1 | Separar tinta de pontos e fundo | tirar sombra, verso aparecendo e pontos cinza | OpenCV (limiar adaptativo, cor) | baixa |
| 2 | Achar os pontos da grade | ter régua e referência | OpenCV (blob/círculo + centro) | média |
| 3 | Corrigir perspectiva e curva | foto torta → folha plana em mm | OpenCV `findHomography` por pedaço, ou malha de pontos | média |
| 4 | Esqueleto (afinar o traço até 1 pixel) | achar o eixo do traço | scikit-image `skeletonize` ou OpenCV thinning | baixa |
| 5 | Esqueleto → linhas (grafo) | unir pixels em traços, cortar nos cruzamentos | código próprio pequeno, ou AutoTrace `-centerline` | média-alta |
| 6 | Suavizar e simplificar | tirar o "tremido" do pixel; menos pontos | Ramer-Douglas-Peucker + curva | baixa |
| 7 | Ordem e sentido do traço | a plotter desenhar como a mão (de cima para baixo, esquerda para direita) | regra simples; pesquisa avançada (PEN-Net, TRACE) é exagero | média |
| 8 | Montar o SVG font | mesmo formato de `fontes/*.svg` | texto puro | baixa |
| 9 | Variantes por letra | o mesmo "a" 3–5 vezes → o motor sorteia | o Scriptorium já tem variação por ocorrência | baixa |

Alternativa ao 4–6: **traçar à mão no navegador** sobre a foto corrigida (clicar o caminho de cada letra). Mais lento, resultado mais limpo.

## Tabela 3 — Caminhos possíveis

| Caminho | Como funciona | A favor | Contra | Tempo estimado |
|---|---|---|---|---|
| A. Calligraphr + conversor | fazer TTF no site, converter para traço único | rápido para começar | contorno → eixo fica ruim; depende de site pago | 1–2 h, qualidade baixa |
| B. Inkscape à mão | foto de fundo, redesenhar cada letra, extensão gera a fonte | qualidade alta; nada para programar | 70+ letras × variantes à mão; fora do Scriptorium | 1–2 dias de desenho |
| **C. Oficina nova no Scriptorium (recomendado)** | folha-guia impressa/combinada → foto → pontos corrigem → esqueleto → traços → SVG font na pasta `fontes/` ou na Biblioteca | usa os pontos do seu papel; sai no formato que o app já lê; variantes da sua mão; ajuste fino na tela | é código novo (técnicas 1–8) | 2–4 sessões |
| D. Pesquisa de IA (recuperar ordem do traço) | modelo treinado adivinha o movimento da caneta | ordem mais humana | sem código pronto confiável; pesado | não vale agora |

## Decisão (2026-11-19)

Usuário escolheu: **Caminho C** (oficina no app) + **extração automática com ajuste manual na tela**.
Pontos medidos: 5 mm. Etapa 1 (folha-guia, aba #letra) feita em 2026-11-19. Próxima: etapa 2, ler a foto.

## Recomendação

Caminho C, em 3 etapas pequenas:

1. **Folha-guia**: definir a caixa de cada letra em pontos do caderno e a ordem dos caracteres (a–z, A–Z, 0–9, acentos pt-BR, pontuação), com 3 variantes por letra. Gerar uma folha-modelo para consultar ao escrever.
2. **Leitura da foto**: técnicas 1–6 rodando no navegador (OpenCV.js) dentro de uma aba nova; prévia de cada letra com ajuste manual (mover, apagar pedaço, juntar traço).
3. **Saída**: SVG font no mesmo formato de `fontes/*.svg`, salvo pela Biblioteca (IndexedDB, `src/ui/armazem.js`) e escolhível como fonte/personagem.

Arquivos que a etapa 2–3 vai tocar (a confirmar na implementação): `src/fonte.js` (leitura), `src/ui/armazem.js` e `src/ui/biblioteca.js` (guardar), uma oficina nova em `src/`.

## Verificação

- Teste com 1 foto real: as letras extraídas sobrepostas na foto corrigida batem com a tinta.
- A fonte gerada abre na "Tabela de fontes" e escreve uma frase na Carta.
- Plotar uma linha em papel e comparar com a mão original.

## Fontes da pesquisa

- [V1E: traçar a própria letra para plotter](https://forum.v1e.com/t/how-to-trace-your-own-handwriting-for-plotting-and-engraving/40956)
- [Single Line Font Maker](https://www.pirillo.com/arcade/single-line-font-maker.html)
- [jvolker/single-line-font-renderer](https://awesome.ecosyste.ms/projects/github.com%2Fjvolker%2Fsingle-line-font-renderer)
- [builtree/handwrite](https://github.com/cod-ed/handwrite) · [draw-your-font](https://dev.to/danilo_z_j/i-turned-a-photo-of-my-handwriting-into-a-real-font-then-open-sourced-the-whole-pipeline-m7m) · [Fontify](https://naereen.github.io/fontify) · [Handwright](https://williamzujkowski.github.io/posts/2026-03-09-handwright-paper-to-font)
- [Inkscape stroke fonts (Fedora Magazine)](https://fedoramagazine.org/make-more-with-inkscape-stroke-fonts/) · [extensões de Khemadeva](https://inkscape.org/~khemadeva/%E2%98%85inkscape-stroke-font-extensions)
- [Potrace FAQ (eixo central → AutoTrace)](https://potrace.sourceforge.net/faq.html) · [AutoTrace](https://github.com/autotrace/autotrace)
- [Calligraphr recursos](https://www.calligraphr.com/en/features/) · [preços](https://www.calligraphr.com/en/pricing/)
- [OpenCV homografia](https://docs.opencv.org/4.2.0/d9/dab/tutorial_homography.html) · [grade de pontos como referência](https://arxiv.org/pdf/2310.11535)
- [Recuperar ordem do traço (ICDAR 2023)](https://link.springer.com/chapter/10.1007/978-3-031-41676-7_5)

## Análise: conexões entre letras (2026-11-19)

- O motor já liga letras: `src/motor/ductus.js` classifica a saída (base/alta/nenhuma) e a entrada (subida/oval/nenhuma) de cada letra e cria uma ponte sintética (curva Hermite) entre elas, com `COMPAT` e `PARES`. A forma da letra não muda com a vizinha; só a ponte.
- Pares de letras no texto pt-BR das magias (`dados/traducao-ptbr.txt`, 10 245 palavras, 564 pares distintos): top 50 = 54%, top 100 = 76%, top 150 = 87%, top 200 = 93%, top 300 = 98%.
- Proposta: folha de palavras com texto conhecido cobrindo os ~150 pares mais comuns; extrair de cada letra a forma real por contexto (vizinha à esquerda/direita) e a ligação real; o motor escolhe a variante cujo contexto bate e cai na ponte sintética quando não há dado.
- Pendente: o usuário escreve ligado (cursiva) ou separado (forma)? Na foto 1 a letra parece mais separada.

## Texto modelo por língua (2026-11-19, feito)

- Direção do usuário: começar só em pt-BR, mas o processo tem que crescer para outras línguas; textos modelo sem sentido que forcem os padrões de letra e conexão.
- `src/letra/textos.js`: vocabulário do corpus (sem nome próprio) → padrões-alvo (pares, início e fim de palavra até 90% de cobertura) → escolha gulosa de palavras (cada padrão 3 vezes, menos letras possível) → embaralha, uma maiúscula por letra inicial, quebra em linhas de 32 caracteres.
- `scripts/gerar-texto-modelo.mjs <corpus.txt> <lingua>` grava `src/letra/linguas/<lingua>.json` (letras da língua + linhas). A folha de letras soltas usa as letras desse JSON.
- pt-BR atual: corpus = `dados/traducao-ptbr.txt` (magias, só 1 248 palavras distintas) → 170 padrões, 141 palavras, 34 linhas; 3 padrões sem cobertura completa (té, cê, nã). Vocabulário com cara de D&D; trocar por um corpus maior e mais comum (ex.: texto de domínio público) melhora.
- Ainda pendente: o usuário escreve ligado ou separado?

## Modos de escrita (2026-11-19, feito)

- O usuário escreve cursiva, de forma e misturando. A fonte guarda o **modo** como dimensão.
- Plano de coleta (`coleta()` em `src/letra/folha.js`, tabela na aba): N1–N3 texto natural, C1–C3 texto cursivo, F1–F3 texto de forma, LC1–LC2 letras soltas cursivas, LF1–LF2 de forma. 13 folhas; 13 linhas de texto por folha. Código da folha escrito na margem de cima e escolhido de novo ao enviar a foto.
- Para a etapa 3: das folhas N sai a probabilidade real de ligar cada par (substitui `COMPAT`/`PARES` sintéticos de `src/motor/ductus.js` quando houver dado); C dá as ligações reais; F dá as formas separadas.
