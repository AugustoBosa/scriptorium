# Plano: M22 (home, Personagens, nome Scriptorium) + M23 (imposição na mesa)

## Contexto

A expansão M13–M21 está publicada. O usuário pediu duas frentes novas:

- **M22:**
  - home page com acesso a todas as oficinas e aos personagens;
  - aba dedicada aos personagens (criar, editar, controlar);
  - renomear o projeto para **Scriptorium**. No GitHub, o repositório vira `scriptorium` (minúsculo), e o link do Pages passa a ser `https://augustobosa.github.io/scriptorium/`. Dentro do projeto, mudam package.json, títulos, README e remote. **A pasta local não muda.**
- **M23:** dizer **onde e em que direção** colocar a folha física na mesa da máquina e imprimir várias páginas pequenas numa folha maior (ex.: A6 em A4). Na Mega S a janela é 210×210 e a A4 sobra 87 mm para fora, então a folha é aproveitada inteira com **segunda passada**. A referência de posição é **escolhida na hora** (encostada num canto ou medida das bordas). Vale **qualquer folha × qualquer página**. Modo **agrupar** (um arquivo por passada) ou **um arquivo por página, com a mesma folha parada**. A **simulação** (mesa + folha + páginas + passadas) aparece **na área da prévia**, com um seletor "Página | Mesa".

O M22 já tinha conselheiro despachado, mas o modo de plano bloqueou a escrita: `workflow/ciclos/27/projeto.md` não existe. O despacho será refeito.

## Ordem

1. **M22** (ciclo 27): conselheiro Opus (impeccable + frontend-design) → `workflow/ciclos/27/projeto.md` → workers → gates → revisor com capturas → commit.
2. **M23** (ciclo 28): T1 e T2 podem começar durante o M22 (arquivos novos). T3, que liga a prévia em `app.js`, só depois do commit do M22.
3. **Rename no GitHub e publicação** por último: `gh repo rename scriptorium`, `git remote set-url`, push, conferir o Pages no link novo.

Registro contínuo de cada passo: Retomada no `workflow/QUADRO.md`, ledger e memória. O laço de sempre: worker não grava golden, só o orquestrador; e2e com config temporária `[::1]`.

## M22: home + Personagens + Scriptorium

- **Rotas:**
  - `#inicio` (home) é o padrão sem hash;
  - `#personagens` é a aba nova;
  - links antigos `#carta` etc. continuam valendo;
  - o nav do cabeçalho ganha Início e Personagens.
- **Home:**
  - nome, uma frase sobre o projeto;
  - cartões das 5 oficinas, com miniatura gerada pelo próprio motor (barata);
  - faixa de personagens salvos, com espécime, "usar" e "editar", e "novo personagem".
  - Tokens de `src/ui/tema.css`; sem marketing genérico.
- **Aba Personagens:**
  - galeria com espécime de cada personagem;
  - ações: criar, duplicar, renomear, excluir com confirmação, importar e exportar JSON, definir o atual;
  - editor da mão reaproveitando o painel de `src/ui/personagem.js` e `controle()` de `src/ui/controle.js`;
  - o atual escolhido aqui é o que as oficinas usam;
  - as chaves `writer.personagem` e `writer.personagens` **não mudam de formato**.
- **Nome:**
  - `package.json` `name: "scriptorium"`;
  - `<title>` e cabeçalho;
  - README (título e link do Pages);
  - links no `QUADRO.md`.
- **Arquivos prováveis** (a spec define): `src/ui/app.js` (só uma tarefa mexe nele), `src/ui/inicio.js` (novo), `src/ui/personagens.js` (novo), `index.html`, `src/ui/tema.css`, `README.md`, `package.json`, e2e novo `e2e/inicio.spec.js` e `e2e/personagens.spec.js`, `e2e/visual.spec.js` (capturas novas).

## M23: imposição e mesa

**Decisão central: `src/maquina/gcode.js` não muda.** Cada passada vira uma página sintética em coordenadas da janela, com `papel = {largura: jw, altura: jh}`, e passa pelo `gcodeDocumento` existente. A transformação da linha 89 (`X = j.x0+offX+x'`, `Y = j.y0+offY+(jh−y')`) já leva para coordenadas da máquina. Testes legados, goldens, `cabeNaMaquina` e o aviso "fora da janela" continuam como estão.

### T1: `src/maquina/imposicao.js` (novo, puro) + `test/imposicao.test.mjs` (sonnet)

- `girar([u,v], rot, w, h)`: rotação 0/90/180/270 dentro de uma caixa.
- `impor({perfil, folha, pagina, referencia:{canto:'auto'|'x0y0'|'x1y0'|'x0y1'|'x1y1', dx, dy}, espaco})` → `{slots, passadas:[{rot, caixa, slots}], porFolha, canto, perdidos}`.
  - **Grade:** tenta a página em 0 e em 90; `nx = floor((W+g)/(w+g))`, `ny` do mesmo jeito; grade centrada na folha (simétrica a 180°).
  - **Referência:** "encostada" = canto com `dx = dy = 0`; "medida" = o mesmo canto com dx/dy. As duas dão a mesma transformação.
  - **Passadas:** gulosa sobre as 4 rotações da folha encostada na referência. Um slot conta como coberto quando os 4 cantos caem na janela.
  - **Desempate da grade:** mais slots cobertos, depois menos passadas, depois página em 0.
  - **`canto:'auto'`:** canto da mesa mais próximo de um canto da janela (Mega S `x0y0`; P2S `x1y1`, porque a janela vai até 255 numa mesa de 256).
  - **Erros claros:** página maior que a janela nas duas orientações; página maior que a folha; nenhum slot alcançável. Slots que nenhuma passada alcança entram em `perdidos` como aviso.
- `paraMesa(imp, k, slot, papelPagina)` → `(u,v) ⇒ [X,Y]`: página → slot (girar + deslocar) → folha → rotação da passada → `X = bx+s'`, `Y = by+(Hr−t')`.
- `aPassada(paginasOtimizadas, imp, k, perfil, papelPagina)` → `{pagina, papel}`:
  - junta as camadas de mesmo `id` (uma troca de caneta por passada) e descarta `grupos`, que já foram usados na otimização;
  - converte para `(X−j.x0, jh−(Y−j.y0))`.
- `instrucao(imp, k, {nomeFolha, origem})` → texto em pt-BR. Exemplo: "Passada 2 de 2: gire a folha 180° e encoste de novo a borda curta no canto frente-esquerda; prenda a folha (sobra 87 mm para fora)."
  - `origem` (qual canto físico é X0Y0, padrão `'frente-esquerda'`) só muda as palavras.
  - O usuário calibra mandando `G0 X0 Y0`.

### T2: `src/ui/mesa.js` (novo) + `e2e/mesa.spec.js` (sonnet)

- **Painel "Mesa e folha"**, com `controle()`:
  - imposição ligada/desligada (desligada = fluxo legado intacto);
  - folha (`PAPEIS` + personalizado);
  - referência (canto ou medida; qual canto; dx/dy em mm);
  - modo (agrupar ou um por página);
  - espaço entre páginas;
  - origem.
- **Persistência:** `localStorage['writer.mesa']`, com try/catch e compartilhada entre as oficinas.
- **`desenharMesa(el, estado)`:**
  - contorno da mesa e janela tracejada;
  - folha posicionada (polígono de `paraMesa`), com seta "topo" e a borda de referência engrossada;
  - slots numerados com a página desenhada; cor por passada;
  - seletor "Folha f · Passada k de n";
  - instrução em texto.
- **Downloads:**
  - agrupar: `${oficina}-f${f}-pa${k}.gcode`, um arquivo por passada;
  - um por página: `${oficina}-p${i}-f${f}-pa${k}.gcode`, um por slot, com a mesma folha;
  - "Baixar todas as passadas";
  - a instrução da passada vai como comentário no topo do G-code. Sem `M0` entre passadas, porque cada passada é um arquivo.

### T3: ligações (haiku, **depois do commit do M22**)

- `src/ui/app.js`:
  - registrar o painel "Mesa e folha" nas oficinas;
  - seletor **"Página | Mesa"** acima da prévia; em "Mesa", `renderizar()` chama `desenharMesa` em vez de `desenhar`.
- `src/ui/exportar.js`:
  - exportar `baixar` e `paginaOtimizada`;
  - corrigir o bug achado: na Mega S, o aviso "fora da janela" era descartado e agora aparece em `.erro`, sem bloquear;
  - com a imposição ligada, a barra mostra "N folhas · M passadas" e os downloads por passada.

### Reuso

- `gcodeDocumento`/`svgDocumento` (`src/maquina/gcode.js`);
- `janelaDe`, `cabeNaMaquina`, `PERFIS` (`src/maquina/perfis.js`);
- `PAPEIS`, `papel()` (`src/materiais/documento.js`);
- `otimizar`/`paginaOtimizada` (`src/maquina/otimizar.js`, `src/ui/exportar.js`);
- `controle()`/`dica()` (`src/ui/controle.js`);
- tokens de `src/ui/tema.css`.

## Verificação

- **`test/imposicao.test.mjs`:**
  - A6 em A4 na Mega S → 2 passadas `[2,2]`, `porFolha` 4, rotações `[0,180]`;
  - A5 em A4 → 2 × 1;
  - A7 em A4 → página a 90°, 2 × 4;
  - A6 em A6 → 1 passada;
  - P2S → canto `x1y1`, coordenadas em 48..255 × 55..255;
  - página grande demais → erro com mensagem;
  - canto com dx/dy = medida;
  - `girar` ida e volta;
  - `aPassada` + `gcodeDocumento`: todo X/Y dentro da janela, 1 troca de caneta por passada.
- **Suíte e build:** `npm test` (goldens intactos), `npm run build`.
- **e2e via `[::1]`:**
  - home navega para as 5 oficinas;
  - Personagens: criar, duplicar, renomear, excluir, definir atual, e a oficina usa o atual;
  - mesa: A6 em A4 mostra 4 slots e "Passada 1 de 2"; trocar a passada muda a instrução; "todas as passadas" baixa `carta-f1-pa1.gcode` e `carta-f1-pa2.gcode`;
  - contraste AA e capturas claro/vela/375 px.
- **Revisor Opus** com as capturas da home, da aba Personagens e da vista Mesa.
- **Teste físico (usuário):** antes de plotar, rodar a passada 1 com a caneta levantada (Z alto) para conferir a posição.
- **Publicação:** depois de `gh repo rename scriptorium` e push, abrir `https://augustobosa.github.io/scriptorium/#inicio` e conferir 200 e o título.

## Fora do escopo (vai para o QUADRO)

- Escolher manualmente a borda que encosta (a gulosa escolhe).
- Deslizar a folha em faixas intermediárias.
- `M0` entre passadas.
- Renomear a pasta local.
