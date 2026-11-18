# Ciclos 28–29 — M23 imposição e mesa (relatório do orquestrador)

- Plano aprovado pelo usuário: `plano-m22-m23.md` (decisões: 2ª passada para o resto da folha; referência canto OU medida escolhida na hora; qualquer folha × página; um-por-página = mesma folha; simulação na área da prévia). `gcode.js` não mudou: cada passada vira página sintética em coordenadas da janela.
- T1 (sonnet) `src/maquina/imposicao.js` (girar, impor, paraMesa, aPassada, instrucao) + testes; `janelaDe` exportado em perfis.js. T2 (sonnet) `src/ui/mesa.js`/`mesa.css` (painel "Mesa e folha", `writer.mesa`, simulação SVG, downloads por passada/página). T3 (sonnet) ligações em app.js/index.html (seletor Página | Mesa) e exportar.js (aviso "fora da janela" da Mega S agora visível).
- Orquestrador devolveu a vista Mesa 2× pelas capturas (SVG cortado; folha fora da mesa invisível; "topo" invertido; slots sem número).
- Revisor Opus: geometria correta em 9 casos (script `geo.mjs`); DEVOLVE (1) — "gire N°" ambíguo com 4 passadas; downloads da mesa sem avisos/trava experimental. Ciclo 29 (29-A): instrução descreve a posição final do topo; avisos e trava P2S na mesa; sobra medida contra a mesa com eixo; "Folha F, passada K"; "G0 X0 Y0"; aviso de estrutura.
- Re-revisão: orquestrador rodou o `geo.mjs` do revisor — 0 pontos fora, direção do topo de cada passada coerente com o texto (A3 4 passadas, P2S).
- Gates: `npm test` 813/0; build ok; e2e 136/136 (via [::1]).
- Menores (QUADRO): downloads da mesa ignoram o seletor "Camada"; botão "Mesa" visível no Básico enquanto o painel é Avançado (a mensagem orienta); escolher manualmente a borda que encosta; deslizar a folha em faixas; `M0` entre passadas.
