# SDD ledger — plan: workflow/EXPANSAO.md
Nota: spec = EXPANSAO.md seções 1–4; laço = seção 5 (gerente/workers/revisor). Ciclos em workflow/ciclos/NN.
M13 início: base 47f5d88, npm test 92/92.
Ruling: M13 em 2 ciclos — 07: A goldens + D pages.yml (paralelos); orquestrador grava goldens; 08: C 2-opt e depois B git mv (C e B tocam exportar.js) — custo se errado: um ciclo a mais.
Ciclo 07: complete (07-A goldens, 07-D pages.yml aceitas; goldens gravados pelo orquestrador, 100/100, snapshot 173 KB; sem commit ainda — commit por marco)
Ciclo 08: complete (08-C 2-opt adaptativo; orquestrador conferiu diff; 101/101; A4 2465 traços 254 ms; golden gcode otimizado inalterado). Ruling: revisão do gerente de 08 junto com 09 — diff de 5 linhas, conferido pelo orquestrador — custo se errado: achado tardio em REVISAR 09.
Ciclo 09: complete (09-B árvore nova; gerente aceitou 08+09). Gates M13: test 101/0, build ok, e2e 4/4, navegador ok. Revisor Fable M13 despachado (pacote m13-review.diff).
M13 Revisor: DEVOLVE (1) — bloqueante test/exportar.test.mjs:8 lê arquivo/vpype.toml (fora do git) → CI falha. Ruling: opção (a) skip quando ausente — não versiona arquivo/ (pasta pessoal) — custo se errado: teste do header não roda no CI. Menores → QUADRO.
Ruling: re-revisão do ciclo 10 feita pelo orquestrador (diff 8 linhas = correção (a) do revisor + simulação CI em cópia limpa: 100 pass/1 skip) — custo se errado: falha só aparece no 1º run do Actions. M13: complete.
M14 início: base 92c9b1a. Ruling: Conselheiro como general-purpose fable que só escreve ciclos/11/projeto.md (Plan é só leitura; evita colar a spec no contexto do orquestrador) — custo se errado: nenhum.
Ruling: aceitos os 5 desvios do conselheiro M14 (gcodeDocumento nome novo; papelMaximo/cabeNaMaquina na tarefa A; perfil.estaciona; ordem 'escrita' = identidade no M14; PAGINAS legado em layout, papéis em documento.js) — preservam goldens e paralelismo — custo se errado: renomear gcodeDocumento depois. Nota p/ usuário: A5 não cabe na janela P2S 207×200; header/footer P2S montado da PESQUISA, não de fonte real.
Ciclo 11: workers 11-A/B/C entregues; gates test 126/0, build ok, e2e 4/4, navegador igual (88/679), compor A4 9 ms (antes 15). Chip de tarefa aberto pelo worker 11-C retirado (falso alarme durante edição paralela).
M14: complete (revisor ACEITA, 10 menores no QUADRO). Ruling: menor 'golden multipágina antes do M16' vira tarefa do orquestrador no início do M16 — custo se errado: DoD do M16 sem proteção.
M15 início: base de2b12a. Ruling: aceitos desvios do conselheiro M15 (migração em 2 tarefas multi-arquivo; painéis mantêm nomes; PARAM ganha tipo/opcoes/semEscala e controle recebe {ler,gravar,ctx}; EB Garamond via Google Fonts <link>, sem dep npm) — custo se errado: renome/refatoração de UI depois. App quebrado no meio do ciclo 13: gate só no fim.
Ciclo 12: 12-A/B/C entregues, npm test 143/0; gerente revisando.
Ciclo 13: workers entregues; gates test 142/0, build ok, e2e 42/42. Achados do orquestrador nas capturas: grimório vazio dá erro 'camadas'; resumo de traços cortado pelo botão; captura de popover sem popover.
M15 Revisor: DEVOLVE (1) — 3 bloqueantes (grimório vazio erro 'camadas'; barra exportar sem layout; captura popover fullPage fecha popover). Ruling: ciclo 14 com briefs escritos pelo orquestrador (correções já especificadas pelo revisor com arquivo:linha; gerente seria só repasse) + menores visíveis baratos (jargão M19, aria-pressed, rótulos com unidade, nav 375px, desabilitado) — custo se errado: menos revisão do brief.
Ciclo 14: complete. Ruling: re-revisão dos 3 bloqueantes feita pelo orquestrador por capturas (todas visivelmente corrigidas) sem novo Fable — custo se errado: defeito visto pelo usuário na parada. M15 commitado como AGUARDANDO APROVAÇÃO. PARADA §5.4.1.
M15: complete — usuário respondeu 'continue' (tomado como aprovação). M16 início: base eb41202. Ruling: ciclo 15 = golden extra de compor (multipágina+justificado+palavra longa) em paralelo com conselheiro M16; orquestrador grava golden antes de qualquer worker do motor — custo se errado: nenhum.
Ciclo 15: 15-A golden-layout (4 casos; brief corrigido: papel() de documento.js) gravado pelo orquestrador.
M16: conselheiro bateu limite de uso, mas projeto.md (248 linhas) estava completo. Ruling: §5 do projeto.md vira o brief direto (arquivos/casos/verificação explícitos), sem gerente PLANEJAR — poupa cota após o limite — custo se errado: brief menos mastigado para haiku em 16-B/C.
Registro: usuário pediu registro contínuo; QUADRO Retomada (15:30) + memória atualizados.
16-A: complete (153/0, goldens intactos por mtime, A4 10 ms). 16-B ∥ 16-C despachados.
16-B: entregue (PARAMS 7 chaves, ui/personagem; 153/0, build ok). Aguardando 16-C.
16-C: entregue (motor-dod 9 testes + personagem 2; 164/0; A4 CHEIA 23 ms). Gates M16 iniciados.
Gates M16: test 164/0, goldens intactos (mtime), build ok, e2e 42/42; ficha workflow/ciclos/16/especime.png gerada. Revisor Fable M16 despachado.
M16 Revisor: DEVOLVE (1) — bloqueante layout.js:138 recuo+deriva pula linhas (2→40 páginas). Ruling: ciclo 17 brief do orquestrador com a correção testada do revisor + menores recomendados (ARREMATE 0.18, TREMOR_FADIGA 0.02, rename, teste de tinta CHEIA) — custo se errado: ajuste visual a recalibrar no papel.
Ciclo 17: complete (166/0, goldens intactos, build, e2e 42/42). Ruling: re-revisão do 17 pelo orquestrador (correção idêntica à testada pelo revisor + ficha regenerada) — custo se errado: defeito no M17. M16: complete.
M17 e M18: conselheiros despachados em paralelo (ciclos 18 e 19). Ruling: trilhas motor/ornamento em paralelo conforme §4.7/§5.3 — custo se errado: conflito em arquivo compartilhado (mitigado: specs proíbem tocar a pasta da outra trilha).
M18 spec pronta (ciclos/19/projeto.md, 3 ondas: A geo | B no, C vinha, D filigrana | E borda, F capitular). Ruling: aceitos desvios (capitular(caixa,params,seed,fontes); vinha.js novo; rubrica/reclamo/cabeçalho/nº página → M20; ajuda no módulo; golden só por arquivo, nunca npm run golden durante M17) — custo se errado: reorganizar API de capitular no M20. 19-A despachado.
M17 spec pronta (ciclos/18/projeto.md; cinemática (b) filtro por arco; 8 CURSIVAS; 18-A∥18-B → 18-C∥18-D). Ruling: aceitos desvios (ordem escrita→M20; ductus.js novo; maiúsculas não ligam; retoque estratificado; PARES vazio) — custo se errado: viagem maior até M20. 18-A e 18-B despachados (paralelos ao 19-A).
19-A: complete (geo.js, 12 testes, 178/0). Onda 2 M18 despachada: 19-B no, 19-C vinha, 19-D filigrana (snapshots gravados pelo orquestrador por arquivo).
18-B: complete (cinematica.js suavizar; guard t.length<3; 5 testes; 1000×120 pts 60 ms).
19-C: complete (vinha.js; golden gravado pelo orquestrador).
18-A: complete (ductus.js, 11 testes, 203/0, goldens intactos). Ruling: segmento da ponte ≤ 0,05 em (Hermite literal passa de PASSO 0,03); 18-D usa o mesmo teto; reamostrar por arco fica opcional p/ revisor — custo se errado: ponte com pontos um pouco mais espaçados. 18-C ∥ 18-D despachados.
19-B: complete (no.js + lacos; golden gravado). Ruling: teste de simetria compara vértices com o espelho (spec errava: espelho inverte cima/baixo, quiralidade do nó) — custo se errado: nenhum.
19-D: complete (filigrana.js; golden gravado; desvios: traço de fecho até a borda, teste do fim com irregular 0, espaco mínimo 0,1). Onda 3: 19-E borda ∥ 19-F capitular despachados.
18-C: complete (cinemática ligada em escrita.js, 5 PARAMS, ui/personagem; 267/0). 18-D: complete (ductus-dod 13 + personagem 1; 281/0). 19-E e 19-F: caíram por limite de uso (reset 20:20); retomando em 2026-11-17.
19-E, 19-F: complete (goldens gravados). M18: todos os workers entregues.
Gate e2e: porta 127.0.0.1:8765 ocupada por node recv.mjs de OUTRA sessão Claude (pid 10696) — não encerrado; e2e rodado com config temporária em [::1]:8765.
Gates M17+M18: test 554/0 (goldens motor intactos), build ok, e2e 42/42. Ficha M17 workflow/ciclos/18/especime.png. Revisor M17 e gerador de fichas M18 despachados.
Revisor M17 caiu: Fable 5.2 exige créditos de uso (429). Ruling: papéis Fable (conselheiro/revisor) passam a Opus até o usuário liberar créditos — custo se errado: revisão/spec um pouco menos profunda.
Fichas M18 geradas (workflow/ciclos/19/folha-1..7.png; gerador viu: Q lombarda/habitada deformado, ramo solto; nó faixa densa; vinha da borda rala; EMSDelight/HersheyScript1 com traços soltos). Revisor Opus M18 despachado.
M17: complete (PARES aplicado pelo orquestrador; commit separado só com arquivos do M17). Ruling: linha de dado do revisor aplicada sem worker — custo se errado: nenhum (valor exato, testes verdes).
M18 Revisor: DEVOLVE (1) — 4 bloqueantes (vinha morre em tira; raiz da habitada no halo; nó sem piso de caneta; contorno sem piso). Ruling: ciclo 20 com 20-A vinha ∥ 20-B no+capitular; goldens de ornamento serão regravados pelo orquestrador com motivo (mudança visual pedida pelo revisor) — custo se errado: golden novo esconde regressão (mitigado por re-revisão das fichas).
M19: conselheiro Opus despachado (spec em ciclos/21/projeto.md), em paralelo ao ciclo 20 (correção M18).
20-A: entregue (vinha em grade com jitter; tira 130×6,7: 332–352 mm em 6 seeds, pontas alcançadas). Aguardando 20-B.
Ciclo 20: 20-A/20-B entregues; goldens vinha+capitular regravados pelo orquestrador (motivo: correção visual do revisor M18: vinha densa, raiz da habitada, piso de caneta); fichas regeneradas.
Re-revisão Opus M18 (escopada aos 4 bloqueantes) despachada.
M18: complete (re-revisão ACEITA; commit).
M19 spec pronta (ciclos/21/projeto.md; 21-A circulo+selo, 21-B sigilo kamea/roda/fusão, 21-C alfabeto formas). Ruling: aceitos desvios (sigiloPalavra no contrato de gerador; selo em circulo.js; ctx opcional; estilo.forma 'grade' padrão). Ruling: 21-C em 2 etapas — worker escreve teste do alfabeto atual, orquestrador grava golden, worker edita — regra §5.2.8 só o orquestrador grava golden. 21-A, 21-B, 21-C(etapa 1) despachados.
21-C etapa 1: teste do alfabeto atual; golden gravado pelo orquestrador. Ruling: grade atual (já passa da caixa 500×700 até ~10%) NÃO muda (golden); formas novas devem caber na caixa por construção, sem clamp — custo se errado: grade continua levemente fora da caixa (consumidores já escalam).
21-B: complete (sigilo.js kamea/roda/fusão; golden gravado).
21-C: complete (formas angular/curvo/ogham/pontilhado; goldens novos gravados; goldens da grade conferidos iguais).
21-A: complete (circulo.js+selo; golden gravado). Gates M19: ver saída.
Gates M19: test 654/0, goldens antigos intactos, build ok, e2e 42/42. Gerador de fichas M19 despachado.
M20: conselheiro Opus despachado (spec em ciclos/22/projeto.md), em paralelo às fichas/revisão do M19.
Fichas M19 geradas (workflow/ciclos/21/folha-1..7.png). Revisor Opus M19 despachado.
M19 Revisor: DEVOLVE (1) — anel texto ilegível (sem altura mínima), pontilhado empasta. Ruling: ciclo 23 (23-A sonnet) + rename complexidade→complexidadeCirculo agora (M20 junta PARAMS na UI) — custo se errado: nenhum.
M19: complete (commit). Ruling: re-revisão do ciclo 23 pelo orquestrador (testes numéricos + só golden do pontilhado mudou) — custo se errado: defeito visual residual no M21. M20 spec pronta (ciclos/22/projeto.md, 3 ondas).
M20: spec aceita (desvios: grupos no compor e ordem escrita no M20; paginasGrimorio alias p/ goldens; rubrica = caneta vermelha; cabeçalho/nº/reclamo em livro.js; nota que não cabe é descartada com aviso). Onda 1: 22-A despachada.
22-A: complete (grupos, otimizar por grupos, CANETAS/escreverEm, camada.id sanitizado; 663/0). Onda 2 despachada: 22-B, 22-C, 22-D, 22-E.
Ruling: workers do M20 NÃO gravam golden (spec dizia que sim) — protocolo §5.2.8 manda só o orquestrador; custo: 1 passo a mais por tarefa.
22-E: complete (paginasGrimorio + comporGrimorio/comporScroll → Documento; golden intacto).
22-C: complete (livro.js; golden gravado).
22-D: complete (sigilos.js; golden gravado). Ruling: 7 frases A6 3 colunas = 1 página pela geometria (spec contava 2); teste usa 10 frases → 2 páginas — custo: nenhum.
22-B: complete (notas+carta; golden gravado; conector descartado em ~1/3 das composições anotacao/diario — p/ revisor). Gate onda 2: 792/0, snapshots antigos intactos, pastas protegidas intactas, build, e2e 42/42. Ruling: onda 3 em paralelo às fichas 1–5 + revisor (spec mandava revisor antes) — UI depende só das assinaturas, estáveis — custo se errado: 22-F adaptar a mudança de API. Ruling: colisão 'faixa' (carta) × 'faixa' (selo) resolvida na UI: painéis por material, sem mesclar PARAMS de módulos diferentes num objeto.
Fichas M20 1–5 prontas (viagem escrita/otimizada 1,6–1,73 > 1,5 do risco 8.2; nota 'desce' com conector descartado; correção 'hoje' pequena; livro 1 col texto encosta na vinha?). Revisor Opus M20 (materiais) despachado.
22-G: complete (export por camada, e2e/exportar 6 passed). 'Todas as páginas' exporta todas as camadas.
22-F: complete (ui/materiais.js, app.js com Documento; smoke.spec .first() aceito). Gate onda 3: ver saída.
Gate onda 3: 792/0, build, e2e 56/56. Capturas UI em test-results/visual-captura-{carta,livro,sigilos}-{claro,vela}.
M20 Revisor materiais: DEVOLVE (1) — 5 bloqueantes (conector descartado, laço, livro encostado na borda, rabisco sem mão, correção pequena). Ciclo 24: 24-A notas (sonnet) ∥ 24-B livro (sonnet). Junção cp/node_modules do revisor no scratchpad removida com rmdir.
Revisor Opus M20 UI (onda 3) despachado em paralelo ao ciclo 24.
2026-11-17 16:38 Ciclo 24 (24-A, 24-B) e revisor UI caíram por limite de uso (reset 13h); retomando via SendMessage.
Revisor UI M20: DEVOLVE (1) — Tradição em Sigilos com controles mortos. 24-C (haiku) despachada com 3 menores visíveis (exemplo com nota, ordem do grupo Notas, rótulos de camada). Menores restantes: selects de caneta/personagem das notas fora da grade; captura do livro com 3+ páginas e carta com nota vermelha (fichas 6).
24-B: complete (livro recua área com borda; texto↔vinha 0,69→2,17 mm; reclamo no mesmo plano; export por camada no livro; 794/0; golden livro inalterado).
24-A: complete (descartes 27/42/18 → 0; rabiscos com mão; correção com piso; golden carta regravado — motivo: correção do revisor).
Fichas M20 1–5 regeneradas pós-24-A/B (folha 1: hoje legível, laço em branca, todos conectores; menor: chave longe do texto).
24-C: complete. Gates ciclo 24: ver saída. Re-revisão Opus M20 (materiais+UI, escopada) despachada.
M20: complete (commit).
M21 início (base 0df1af5): medição de desempenho feita.
M21: desempenho A4 6 mm 11 ms neutra / 153 ms cheia (< 400 ms, DoD ok). Auditor Opus despachado (workflow/ciclos/25/auditoria.md).
Auditoria M21 pronta (20 achados: 1 P0 livro imprime marcação; 10 P1; 9 P2). Ciclo 25: 25-A tema/shell, 25-B controles/painéis mão, 25-C materiais/export/grimório, 25-D README+ui-smoke — despachados.
25-D: complete (README + ui-smoke reescritos). grimorio.html no vite.config é intencional (redirect p/ links antigos).
25-C: complete (P0 livro parseia notas; carta0 anotação; barra sem 2-opt; rótulos de máquina; selects com prévia; aria nos filtros; confirmação em Limpar lista). e2e controle.spec:71 falhando — 25-B em andamento.
25-A: complete (cabeçalho estreito, desabilitado, caixa, alvo do ?, aria, estados vazios, contraste 5 oficinas). Aguardando 25-B (controle.spec:71 falhando).
25-B: complete. Gates M21: ver saída.
Gates M21: 794/0, build, e2e 68/68 (dois temas), A4 8/148 ms. Revisor Opus M21 despachado.
Revisor M21: ACEITA (17/20 resolvidos, 3 parciais, 2 regressões menores). Ciclo 26 (26-A haiku): regressões menores + ui-smoke.
M22 início (base 68d5f01): home + aba personagens + rename scriptorium. Ruling do usuário: GitHub 'scriptorium' minúsculo; nomes internos, pasta não muda.
Plano M22+M23 aprovado (usuário: 'continue'); copiado em workflow/ciclos/28/plano-m22-m23.md. Decisões do usuário M23: 2ª passada; referência canto OU medida escolhida na hora; qualquer folha×página; um-por-página = mesma folha; simulação na área da prévia. Despachados: conselheiro M22, T1 imposicao.
M22 spec gravada (ciclos/27/projeto.md, copiada do plano do conselheiro). T0 especime.js gravado pelo orquestrador (código da spec §5). Despachando T1–T4 do M22.
M23-T1: complete (imposicao.js: girar/impor/paraMesa/aPassada/instrucao; 11 testes; 805/0; janelaDe exportado em perfis.js). A6 em A4 Mega S: 2 passadas [2,3]@0° e [0,1]@180°. M23-T2 despachado.
M22-T4: complete (package.json/lock name scriptorium, URLs; README; ui-smoke).
M22-T2: entregue (inicio.js/css, e2e/inicio.spec.js); build/e2e aguardam T1 (personagens.js) e T3.
2026-11-18 09:33 M22-T1 e T3 caíram por limite (reset 21:20 de 17/11); M23-T2 entregue (mesa.js/css, e2e/mesa.spec.js; 807/0; build ok). Retomando T1/T3.
Retomados M22-T1 e T3 (2026-11-18 09:33). ATENÇÃO: src/magia.js, grimorios/, src/ornamento/tempo.js são de OUTRA sessão (Grimório Non Presto) — não entram nos commits M22/M23 (stage por caminho).
M22-T1: complete (personagens.js/css, nomeLivre/renomearSalvo, galeria em personagem.js; 807/0; e2e próprio 12/12).
M22-T3: complete (rotas #inicio/#personagens, nav, restaurar, gancho M23; 810/0, build ok; e2e 112/124 — 8 mesa.spec (M23 não ligado, esperado) + 4 contraste borda do botão novo em inicio.css → devolvido ao T2).
Gate M22: 810/0, build ok, e2e 116/116 (sem mesa), contraste ok. Links da home em azul padrão (sem tema) → p/ revisor. Revisor Opus M22 despachado.
M22: complete (commit; checagem em cópia limpa).
Checagem em cópia limpa do M22: 20 falhas só por falta de node_modules (hachure-fill) — ambiente, não código; CI faz npm ci. M23-T3 despachado (sonnet: integração).
M23-T3: código pronto (app.js, index.html, exportar.js, mesa.*, e2e); 810/0, build ok; aguardando e2e do worker. test/tempo.test.mjs é da OUTRA sessão — fora do commit M23.
M23-T3 entregue (e2e 132/132), mas captura da vista Mesa: SVG enorme/cortado, instrução coberta, botão azul → devolvido ao worker com correção exata.
M23 vista Mesa round 2: folha fora da mesa cortada, 'topo' invertido vs instrução, slots sem número/sem páginas → devolvido.
M23 vista Mesa round 2 OK (balanço visível, topo coerente, slots numerados). Revisor Opus M23 despachado.
M23 Revisor: DEVOLVE (1) — giro absoluto ambíguo em 4 passadas; download da mesa sem avisos/trava experimental. Ciclo 29 (29-A sonnet) + menores de texto (sobra vs mesa, borda na frente, G0 X0 Y0, folha N, aviso de estrutura).
M23: complete (06ea312). Repo renomeado p/ AugustoBosa/scriptorium; Pages https://augustobosa.github.io/scriptorium/ verificado (200).
Ciclo 30 (pendências menores da mesa) despachado: 30-A sonnet.
Ciclo 30: complete (815/0, e2e 140, geo 0 fora).
2026-11-18 fim de sessão: registros finais; protocolos com raiz nova (scriptorium); geo-check.mjs versionado; memória copiada p/ ~/.claude/projects/C--Users-augus-Desktop-augusto-projects-scriptorium. Usuário vai renomear a pasta.
