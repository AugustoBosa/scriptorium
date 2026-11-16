# Relatório do ciclo 12 (M15, parte 1)

Verificação do gerente: `npm test` = tests 143, pass 143, fail 0 (126 anteriores + params 9 + svg-documento 8). `test/` sem modificação em arquivo existente (goldens intactos). `npx playwright test e2e/controle.spec.js`: 14 passed (7 casos x claro/vela). `npx vite build`: ok. `tema.css`: nenhum hex fora do `:root` (o único `#000` é comentário); diff do bloco base contra `tema-proposto.css` vazio.

| Tarefa | Status | Nota |
|---|---|---|
| 12-A PARAMS + contrato | aceita | 7 módulos exportam `PARAMS`; `amostra`; `mesclarPerfil`; `PERFIS.personalizado` com `structuredClone` (menores do M14 absorvidos). Teste de contrato com descoberta automática. |
| 12-B controle + tema | aceita | `controle`, `ligar`, `dica`; popover único; `tema.css` com shell em `grid-template-areas`; bancada e 7 casos e2e. |
| 12-C `svgDocumento` | aceita | `viagemSvg` privada extraída sem mudar `svg()`; 8 testes. |

## Desvios julgados
- `completo` do scroll: nao=3, auto=6, sim=10 pautas. Aceito (o brief não amarrava valor a pauta; a ordem faz sentido: resumo < auto < completo).
- `moldura` só desenha com v=true; `chave` ganhou prévia (a spec não detalhava). Aceito.
- `trajeto` com texto literal; `alinhamento`/`colunas` usam um parágrafo de 44 caracteres em vez de "3 linhas curtas" (as linhas curtas não quebravam, previa(1) = previa(2)). Aceito; o teste (5) continua sem afrouxar.
- `documento.js` importa `perfis.js` (para `papelMaximo`); sem ciclo (`perfis.js` só importa `ajuda.js`). Aceito.
- `controle.js`: `data-tipo` na linha e escala própria por miniatura nas grades de `opcao`/`marca` (cada miniatura se enquadra sozinha; no atual/fantasmas a escala é única, como pedido). Aceito.
- Rótulo de `perfil` = "máquina" (literal). Sem efeito nos briefs do 13.

## Pontos que o ciclo 13 deve saber
- Nenhuma mudança necessária em `ciclos/13/briefs.md`: as interfaces (`controle`/`ligar`/`dica`, `PARAMS`, `amostra`, `mesclarPerfil`, `svgDocumento`) batem com os nomes usados lá. `entrelinha` de `layout.js` tem passo 0,01 (spec dizia 0,05): irrelevante para a migração.
- `src/maquina/perfis.js` agora importa `src/ajuda.js` (só `ROTULOS`/`AJUDA`, não `ajuda()`); a 13-B pode remover `ajuda()` sem quebrar nada.
- Não verificado por olho humano: aparência de `tema.css` e do popover (só e2e); entra no screenshot de aprovação do M15.

M15 segue ABERTO. Próximo: despachar 13-A, 13-B, 13-C.
