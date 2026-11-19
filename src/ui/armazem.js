// Armazém do navegador (IndexedDB): dados grandes que não cabem bem no localStorage — magias importadas e a biblioteca.
// Tudo fica só neste navegador. Sem IndexedDB (aba privada, bloqueio): ler devolve undefined e gravar avisa por exceção.
const BANCO = 'scriptorium', LOJA = 'dados';
let aberto = null;

function abrir() {
  aberto ??= new Promise((ok, erro) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { aberto = null; erro(r.error); };
  });
  return aberto;
}

async function pedir(modo, fazer) {
  const db = await abrir();
  return new Promise((ok, erro) => {
    const t = db.transaction(LOJA, modo), r = fazer(t.objectStore(LOJA));
    t.oncomplete = () => ok(r?.result);
    t.onerror = t.onabort = () => erro(t.error);
  });
}

export const ler = (chave) => pedir('readonly', (s) => s.get(chave)).catch(() => undefined);
export const gravar = (chave, valor) => pedir('readwrite', (s) => s.put(valor, chave));
export const apagar = (chave) => pedir('readwrite', (s) => s.delete(chave));
// Todos os valores cujas chaves começam com `prefixo`.
export async function listar(prefixo) {
  const faixa = IDBKeyRange.bound(prefixo, prefixo + String.fromCharCode(0xffff)); // até o fim do prefixo
  return pedir('readonly', (s) => s.getAll(faixa)).catch(() => []);
}
