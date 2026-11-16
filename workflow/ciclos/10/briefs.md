# Ciclo 10 — correção do M13 (devolução 1 do revisor)

## Tarefa 10-A
modelo: haiku
Arquivos permitidos: `test/exportar.test.mjs`, `src/ui/grimorio.js`.

Problema: `test/exportar.test.mjs:8` lê `arquivo/vpype.toml` no topo do módulo. `arquivo/` está no `.gitignore`; no CI (GitHub Actions) o arquivo não existe → ENOENT derruba o módulo inteiro e `npm test` falha.

Fazer:
1. Em `test/exportar.test.mjs`: importar `existsSync` de `node:fs`. Trocar as linhas 8–9 por:
   - `const arqToml = new URL('arquivo/vpype.toml', raiz);`
   - mover a leitura (`readFileSync`) e `lerToml` para DENTRO do teste 'PERFIL_PADRAO bate com vpype.toml e valores fixos'.
   - nesse teste, passar a opção `{ skip: !existsSync(arqToml) && 'arquivo/vpype.toml fora do git' }` (assinatura `test(nome, opcoes, fn)`).
   Não tirar nenhuma asserção; os valores fixos (2400, 6000, 3, 6, 500) continuam lá. Nenhum outro teste muda.
2. Em `src/ui/grimorio.js:34`, no comentário, trocar `ui-exportar.js` por `ui/exportar.js`. Só o comentário.

Verificação: `npm test` → 101 pass / 0 fail localmente (a pasta existe aqui). Depois simule o CI: renomeie temporariamente `arquivo/vpype.toml` para `arquivo/vpype.toml.bak`, rode `node --test test/exportar.test.mjs` (esperado: 0 fail, 1 skipped) e DESFAÇA o renome. Confirme que o arquivo voltou.

NÃO: atualizar goldens, tocar `.gitignore`, outros arquivos, commit.
