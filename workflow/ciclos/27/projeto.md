# M22 — Início, Personagens, nome Scriptorium (spec do conselheiro)

> Destino: `workflow/ciclos/27/projeto.md`. O modo de plano bloqueou a gravação lá; o orquestrador copia este texto sem mudança.
> Fonte do pedido: `workflow/ciclos/28/plano-m22-m23.md` §M22. Identidade: `EXPANSAO.md` §2 ("Scriptorium sóbrio").

## 0. Decisões do conselheiro

| # | Decisão | Por quê |
|---|---|---|
| D1 | Duas `<section class="pagina">` irmãs de `<main>` em `index.html`: `#vista-inicio` e `#vista-personagens`. Nas páginas, `main.hidden = true`; nas oficinas, as seções ficam `hidden`. | O shell das oficinas (painel/prévia/exportar) não muda. M23 mexe só em `main`. |
| D2 | Contrato de página: `montar(el, { fontes }) → atualizar()`. Montada uma vez (preguiçosa); `atualizar()` roda a cada entrada na rota. A página lê e grava o localStorage direto, sempre em try/catch. | Mesmo padrão de `montar(el, estado, aoMudar)`; sem store novo. |
| D3 | A fonte da verdade do "atual" é `writer.personagem` (`{personagem, variacao}`). "Usar" grava essa chave. Ao sair de `#inicio`/`#personagens` para uma oficina, `app.js` chama `pPersonagem.restaurar(inst.estado)` depois da cópia de `COMPARTILHADAS`. | Formato intacto; uma linha de sincronização. |
| D4 | Galeria = `writer.personagens` (`{nome: personagem}`), formato intacto. O editor edita a cópia de trabalho (o atual). "Salvar na galeria" grava `salvos[nome]`. O cartão do atual mostra "em uso" e, se diferir do salvo, "· alterações não salvas". | É o modelo que já existe em `personagem.js`. |
| D5 | Na aba Personagens o editor mostra todos os controles (sem Básico/Avançado). A regra de `tema.css` passa a ser `body[data-nivel="basico"] main [data-nivel="avancado"]`. | O `#nivel` mora em `main`. Um segundo radiogroup "Avançado" quebraria `getByLabel('Avançado')` (modo estrito) nos e2e. |
| D6 | Miniaturas = `amostra()` com a mão atual, desenhadas por `desenhar()` + `deTracos()` (já existem). A home é "a mão atual escrevendo o índice". | É barato (frase curta, folha 60×20) e é a assinatura da página. |
| D7 | CSS novo em `src/ui/inicio.css` e `src/ui/personagens.css`, importados pelos próprios módulos (Vite). Só tokens de `tema.css`; nenhum hex. | Tarefas paralelas sem arquivo em comum. |

## 1. Rotas e nav

- Padrão: hash vazio **ou desconhecido** → `location.replace('#inicio')`. Antes caía em `#carta`; o teste smoke muda junto.
- Rotas: `#inicio`, `#carta`, `#scroll`, `#grimorio`, `#livro`, `#sigilos`, `#personagens`. Links antigos continuam iguais. `grimorio.html` continua redirecionando para `#grimorio`.
- Nav (classe `nav.oficinas` mantida; `aria-label="Seções"`):
  `<a href="#inicio">Início</a> Carta Scroll Grimório Livro Sigilos <a href="#personagens" class="sep">Personagens</a>`.
  `.sep` tem `margin-left: var(--e3)` e um filete `border-left: 1px solid var(--regua)` com `padding-left: var(--e4)`. O filete é ornamento; o texto continua `--tinta`.
- `document.title`: `Scriptorium — Início`, `Scriptorium — Personagens`, `Scriptorium — Carta` etc. `aria-current="page"` igual às oficinas.
- `grimorio.js:234`: o link "Criar ou editar personagens" passa de `#carta` para `#personagens`. O texto da dica na linha 232 vira "Personagens salvos na aba Personagens."

## 2. Home (`#inicio`, `src/ui/inicio.js`)

Modo **Operate**: ferramenta pessoal. Sem hero, sem slogan, sem números de vitrine. A personalidade vem de tudo estar escrito na mão do usuário.

```
DESKTOP 1280 (conteúdo max-width 1120px, centrado, padding var(--e5))
header: Scriptorium  Início Carta Scroll Grimório Livro Sigilos │ Personagens        [Vela]
═══════════════════════════════════════════════════════════════════════════════════════════
 Caligrafia de traço único para plotter de caneta.          Mão atual: Elara · normal  Trocar ›
 OFICINAS ──────────────────────────────────────────────────────────────────────────────
 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
 │ ░folha░     │ │ ░folha░     │ │ ░folha░     │ │ ░folha░     │ │ ░folha░     │
 │ Caro viaj., │ │ Bola de Fogo│ │ Livro de m. │ │ Capítulo I  │ │ Selo e sig. │
 │ CARTA       │ │ SCROLL      │ │ GRIMÓRIO    │ │ LIVRO       │ │ SIGILOS     │
 │ carta, nota │ │ uma magia   │ │ magias em   │ │ colunas e   │ │ frases em   │
 │ ou diário   │ │ por folha   │ │ sequência   │ │ capitular   │ │ selos       │
 └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
 PERSONAGENS ─────────────────────────────────────────────── Todos os personagens ›
 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌ ─ ─ ─ ─ ─ ─ ┐
 │ ░espécime░  │ │ ░espécime░  │ │ ░espécime░  │   + Novo
 │ Elara       │ │ Bram        │ │ Corvo       │ │ personagem  │
 │ em uso      │ │ [Usar][Edit]│ │ [Usar][Edit]│
 └─────────────┘ └─────────────┘ └─────────────┘ └ ─ ─ ─ ─ ─ ─ ┘

375 px (padding var(--e4); grades em 2 colunas; a linha "Mão atual" desce para baixo da frase)
 Caligrafia de traço único para plotter de caneta.
 Mão atual: Elara · normal  Trocar ›
 OFICINAS ───────────────
 ┌ Carta ───┐ ┌ Scroll ──┐
 ┌ Grimório ┐ ┌ Livro ───┐
 ┌ Sigilos ─┐
 PERSONAGENS ── Todos ›
 [card][card][card][+ Novo]   ← uma linha com overflow-x:auto e scroll-snap
```

- **Conteúdo**:
  - `<p class="lema">` com a frase do README.
  - "Mão atual: {nome} · {variacao}" com o link "Trocar ›" para `#personagens`.
  - `<h2>Oficinas</h2>`: 5 cartões. Cada cartão é **um único `<a href="#id">`** com a folha-miniatura, o nome e uma linha de descrição (texto do README, encurtado).
  - `<h2>Personagens</h2>`: até 7 cartões da galeria (ordem do objeto), mais um cartão "+ Novo personagem", mais o link "Todos os personagens ›".
- **Frases das miniaturas** (constante no módulo): carta "Caro viajante,", scroll "Bola de Fogo", grimorio "Livro de magias", livro "Capítulo I", sigilos "Selo e sigilo".
- **Ações da faixa de personagens**:
  - **Usar**: grava `writer.personagem = {personagem: salvo, variacao: primeira chave ?? ''}` e chama `atualizar()`. As miniaturas reescrevem na mão nova.
  - **Editar**: faz o mesmo que Usar e depois `location.hash = '#personagens'`.
  - **+ Novo**: grava `writer.personagem` com `novoPersonagem()` e vai para `#personagens`.
  - Os botões têm `aria-label="Usar Bram"` / `"Editar Bram"`.
- **Galeria vazia**: só o cartão "+ Novo personagem" e a frase "Nenhum personagem salvo ainda." em `--tinta-2`.
- **Hierarquia e tokens**:
  - `h2`: `--fonte-titulo`, `--t-grupo`, small-caps, `--rubrica`, filete `3px double var(--regua)` à direita (flex com `::after`). É a mesma assinatura das `summary` do painel.
  - Cartão: `background: var(--pergaminho)`, `border: 1px solid var(--regua)`, `border-radius: var(--raio)`, padding `var(--e3)`. A miniatura fica em `.folha` (`--folha` + `--sombra-folha`). O nome vai em `--fonte-titulo` `--t-grupo` `--tinta`; a descrição em `--t-pequeno` `--tinta-2`.
  - Hover: `border-color: var(--contorno)`. Foco: o `:focus-visible` global no `<a>`.
  - Grade: `grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))`; abaixo de 800px, `repeat(2, minmax(0,1fr))`.
  - Gaps `var(--e4)`; seções separadas por `var(--e6)`.
  - Sem animação.
- **Miniatura**: `especime(el, fontes, personagem, variacao, texto)` (§5, T0). Se `amostra` lançar erro, o cartão fica sem miniatura e mostra o texto puro. A home nunca quebra.

## 3. Aba Personagens (`#personagens`, `src/ui/personagens.js`)

```
DESKTOP: grid  var(--painel) | minmax(0,1fr), gap var(--e4), padding var(--e4) (igual ao main)
┌ aside.painel (pergaminho, sticky, scroll) ┐ ┌ mesa ──────────────────────────────────────┐
│ ▼ MÃO EM USO                              │ │ ┌ folha (espécime grande, 120×40 mm) ─────┐ │
│   Nome [Elara            ] ?              │ │ │ Caro viajante, a neblina cobre Barovia.  │ │
│   Variação [normal ▾] ?                   │ │ └──────────────────────────────────────────┘ │
│   [Adicionar][Renomear][Remover]          │ │ Elara · normal — alterações não salvas      │
│   Identidade  ── sliders (controle())     │ │ [Salvar na galeria] [Novo] [Importar JSON]  │
│   Execução    ── sliders                  │ │ GALERIA (3) ─────────────────────────────── │
│                                           │ │ ┌card┐ ┌card┐ ┌card┐  (grid minmax 200px)   │
│                                           │ │  Elara  em uso                              │
│                                           │ │  [Usar] [Duplicar] [Renomear] [Exportar] [Excluir] │
└───────────────────────────────────────────┘ └─────────────────────────────────────────────┘
375: uma coluna. Ordem: espécime → ações → galeria → editor (como as oficinas: a folha primeiro).
```

- **Editor**: `pPersonagem.montar(corpo, estado, aoMudar, { galeria: true })` dentro de um `<details open>` com a `summary` "Mão em uso".
  - `estado = { personagem, variacao, fontes }`, iniciado por `pPersonagem.restaurar(estado)` sobre `novoPersonagem()`.
  - A opção `galeria: true` (T1, em `src/ui/personagem.js`) **omite** a linha "Salvar JSON / Abrir JSON" e o bloco "Meus personagens". A página oferece essas ações. Sem a opção, o comportamento nas oficinas fica idêntico.
  - Os controles continuam vindo de `controle()`, com a prévia viva.
- **`aoMudar`**: `requestAnimationFrame` para redesenhar o espécime grande, o texto de estado e as marcas da galeria. O `atualizar()` do `montar` já grava `writer.personagem`.
- **`atualizar()` (entrada na rota)**: chama `restaurar(estado)` de novo, porque a home ou uma oficina pode ter trocado o atual. Depois chama o atualizar do editor e redesenha.
- **Ações de cartão** (cada botão com `aria-label` "<Ação> <nome>"):
  - **Usar**: `estado.personagem = structuredClone(salvo)`; variação = primeira chave; `aoMudar()`.
  - **Duplicar**: `salvos[nomeLivre(nomes, nome + ' (cópia)')] = clone` com `nome` ajustado.
  - **Renomear**: `prompt`, depois `renomearSalvo(salvos, de, para)`. Nome vazio ou já existente → `.erro` "Erro: já existe um personagem com esse nome." Se o renomeado for o atual, `estado.personagem.nome = para`.
  - **Exportar**: baixa `slug(nome).json` (mesma lógica de `personagem.js`; exportar `slug` de lá).
  - **Excluir**: `confirm('Excluir "X" da galeria? O arquivo não pode ser recuperado.')`. Não mexe no atual.
- **Ações de topo**:
  - **Salvar na galeria**: exige nome; sobrescreve `salvos[nome]`.
  - **Novo**: `novoPersonagem()` como atual.
  - **Importar JSON**: `validar`; se houver erros, `.erro` com a lista. Entra na galeria com `nomeLivre` e **não** vira atual.
- **Marcas do cartão**: "em uso" (`--rubrica`, small-caps) quando `chave === estado.personagem.nome`. Junto, "· alterações não salvas" se `JSON.stringify` diferir.
- **Gravação**: toda escrita em try/catch. Se falhar, `.erro` "Erro: não foi possível salvar neste navegador: …".
- **Sincronização**: as oficinas leem `writer.personagem` via `restaurar` quando a rota sai de uma página (D3). O seletor "Quem escreve" do grimório e o "Personagem das notas" leem `writer.personagens` a cada uso, então já veem a galeria nova.

## 4. Rename (lista exata)

| Arquivo | Mudança |
|---|---|
| `package.json` | `"name": "scriptorium"`. `repository.url` → `git+https://github.com/AugustoBosa/scriptorium.git`. `bugs.url` → `https://github.com/AugustoBosa/scriptorium/issues`. `homepage` → `https://augustobosa.github.io/scriptorium/`. `description` → "Scriptorium: caligrafia de traço único para plotter de caneta (Anycubic i3 Mega S adaptada)." |
| `package-lock.json` | Os dois `"name": "caligrafia-plotter"` (linhas 2 e 8) → `"scriptorium"`. Edição manual, sem `npm install`. |
| `README.md` | Abaixo do título: "Publicado em https://augustobosa.github.io/scriptorium/". §Oficinas: "A rota padrão é `#inicio` (home: oficinas e personagens); `#personagens` cria, edita e escolhe a mão em uso." Linha 15: "salvo na Carta" → "salvo na aba Personagens". §Interface: + "**Personagens**: galeria com espécime; a mão em uso vale para todas as oficinas." |
| `index.html` | `<title>Scriptorium</title>` (o app reescreve por rota). `h1` já é Scriptorium. |
| `test/ui-smoke.md` | + seções "Início (`#inicio`)" e "Personagens (`#personagens`)", com 3 ou 4 passos cada. |
| `workflow/QUADRO.md` | **Só o orquestrador** (arquivo sujo no git): link novo do Pages em Retomada. O histórico (linhas 120, 205) não muda. |
| Não muda | Pasta local; `vite.config.js` (`base: './'` já serve em qualquer subcaminho); `pages.yml`; `EXPANSAO.md`, `GERENTE.md` e `WORKER.md` (histórico); chaves `writer.*`. O remote vai no passo de publicação (`gh repo rename`, `git remote set-url`), fora dos workers. |

## 5. Código compartilhado (T0, o orquestrador grava antes dos workers)

`src/ui/especime.js`:
```js
import { amostra } from '../layout.js';
import { resolver } from '../personagem.js';
import { deTracos } from '../materiais/documento.js';
import { desenhar } from './previa.js';
// Espécime: a mão escreve `texto` numa folha pequena. Devolve false se o motor falhar (o chamador mostra texto puro).
export function especime(el, fontes, p, variacao, texto, folha = { largura: 60, altura: 20, margens: { topo: 2, dir: 2, base: 2, esq: 2 } }) {
  try {
    const tracos = amostra(fontes, resolver(p, variacao || null), texto, { pagina: folha, tamanho: 5 });
    desenhar(el, deTracos([tracos], folha));
    el.style.maxWidth = ''; // a grade decide a largura
    return true;
  } catch { el.textContent = texto; return false; }
}
```

## 6. Testes

- **`node --test`** (T1, em `test/personagem.test.mjs`): funções puras novas em `src/personagem.js`:
  - `nomeLivre(nomes, base)`: devolve `base`, ou `base 2`, `base 3`… se já existir.
  - `renomearSalvo(salvos, de, para)`: devolve um objeto novo com a ordem preservada e `p.nome = para`. Lança erro se `para` estiver vazio ou já existir, ou se `de` não existir.
  - Casos: livre, colisão dupla, ordem mantida, os três erros.
- **`e2e/inicio.spec.js`** (T2):
  - `index.html` sem hash → URL `#inicio`, 5 cartões de oficina, cada um com `svg path`;
  - clicar em cada cartão leva ao hash certo e mostra `#previa svg`;
  - com 2 salvos (addInitScript), "Usar Bram" muda "Mão atual: Bram";
  - "Editar Bram" vai para `#personagens`;
  - sem salvos, mostra "Nenhum personagem salvo ainda.";
  - sem erro de console.
- **`e2e/personagens.spec.js`** (T1):
  - criar (Novo + nome + Salvar na galeria);
  - duplicar → "X (cópia)";
  - renomear (`page.on('dialog')`);
  - excluir com confirm;
  - importar JSON válido e inválido (`setInputFiles` com buffer);
  - exportar (`waitForEvent('download')`, nome `.json`);
  - Usar → ir a `#carta` → o input Nome do painel mostra o nome escolhido;
  - um slider muda `writer.personagem`;
  - "Salvar JSON" não aparece na aba.
- **`e2e/smoke.spec.js` / `e2e/controle.spec.js`** (T3):
  - smoke: hash inválido → `#inicio`;
  - `goto('index.html')` que espera prévia ou painel → `index.html#carta` (smoke linhas 12, 33, 38; controle linha 72);
  - novo: nav tem Início e Personagens e `aria-current` acompanha a rota;
  - novo: Básico na aba Personagens ainda mostra `[data-chave="espacamento"]`.
- **`e2e/visual.spec.js`** (T3):
  - capturas `inicio` (1280×900, com 2 salvos), `inicio-mobile` (375×812, fullPage), `personagens` (1280×900);
  - contraste AA em `#inicio` e `#personagens` (claro e vela);
  - o seletor `texto` de `medir()` ganha `'.pagina h2', '.pagina p', '.pagina a', '.pagina .marca'`;
  - a função `abrir` aceita uma página sem `#previa`: espera `.pagina:not([hidden]) svg`.
- **Golden**: nenhum muda (o motor não é tocado). Worker não grava golden.

## 7. Tarefas (paralelas, sem arquivo em comum)

| T | Modelo | Arquivos (só estes) | Verificação |
|---|---|---|---|
| T0 | orquestrador | `src/ui/especime.js` | `npm run build` |
| T1 | sonnet | `src/ui/personagens.js` (novo), `src/ui/personagens.css` (novo), `src/ui/personagem.js` (opção `galeria`; `export slug`), `src/personagem.js` (`nomeLivre`, `renomearSalvo`), `test/personagem.test.mjs`, `e2e/personagens.spec.js` | `npm test`; e2e próprio depois de T3 |
| T2 | sonnet | `src/ui/inicio.js` (novo), `src/ui/inicio.css` (novo), `e2e/inicio.spec.js` | build; e2e próprio depois de T3 |
| T3 | sonnet | `src/ui/app.js` (**única tarefa nele**), `index.html`, `src/ui/tema.css` (nav `.sep`, regra D5, `.pagina{padding:var(--e4)}` base), `src/ui/grimorio.js` (link e dica), `e2e/smoke.spec.js`, `e2e/controle.spec.js`, `e2e/visual.spec.js` | `npm test`, build, e2e completo |
| T4 | haiku | `package.json`, `package-lock.json`, `README.md`, `test/ui-smoke.md` | `npm test` (lock válido: `npm ci --dry-run`) |

**T3 em `app.js` (exato):**
- importar `montar` de `./inicio.js` e de `./personagens.js`;
- `const PAGINAS = { inicio: …, personagens: … }`; `NOMES` ganha `inicio: 'Início'` e `personagens: 'Personagens'`;
- em `rotear()`:
  - `id = location.hash.slice(1) || 'inicio'`;
  - se `PAGINAS[id]`: `$('vista-'+id)` visível, a outra seção e `main` `hidden`, monta uma vez com `{ fontes: fontesCarregadas }`, chama o `atualizar` dela, marca nav e título, `vindoDePagina = true`, `return`;
  - se a rota não existir, `replace('#inicio')`;
  - nas oficinas: `main.hidden = false`, seções `hidden`, `if (vindoDePagina) { pPersonagem.restaurar(inst.estado); vindoDePagina = false; }` depois da cópia `COMPARTILHADAS`;
  - o seletor de `aria-current` não muda.
- **Gancho M23**: não tocar em `renderizar()` além do necessário. A chamada `desenhar($('previa'), e.doc, opc)` fica numa linha própria; é ali que o M23 põe o ramo "Mesa". A `.barra-previa` em `index.html` continua aceitando um novo controle à esquerda de `.paginas`.

**Ordem**: T0 → {T1, T2, T3, T4} em paralelo → gate do orquestrador:
1. `npm test`, `npm run build`;
2. e2e completo com a config temporária `[::1]`;
3. revisor Opus com as capturas `inicio` e `inicio-mobile` (claro/vela) e `personagens`;
4. commit "M22: …".

Rename no GitHub e push vêm depois (plano §Ordem 3).

## 8. Riscos e fora do escopo

- **Risco**: o atual pode ser editado e nunca salvo na galeria. A marca "alterações não salvas" deixa isso visível; não há salvamento automático (seria surpresa sobrescrever o salvo).
- **Risco**: a chave da galeria é o nome. Duplicados por nome não são possíveis; renomear o atual sem salvar cria um item novo ao salvar. Isso é intencional e consistente com o formato atual.
- **Risco**: custo das miniaturas: até 12 `amostra()` por entrada na home. Se passar de ~100 ms, guardar o SVG por `JSON.stringify(mão)+texto` (`ponytail:` no código).
- **Risco**: o grimório troca o personagem pelo próprio select e não grava `writer.personagem`. Ao voltar da home, o atual da home vence. É o comportamento pedido.
- **Risco**: e2e antigos que abrem `index.html` sem hash. Estão listados em T3; conferir também `materiais.spec`/`exportar.spec` (já usam hash).
- **Fora do escopo**: miniatura de sigilo real no cartão Sigilos (texto basta); reordenar a galeria; tags/busca; desfazer exclusão; renomear chaves `writer.*`; mexer em `QUADRO`/histórico; tudo do M23 (painel "Mesa e folha", seletor "Página | Mesa").
