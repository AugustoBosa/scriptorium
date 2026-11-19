// Ajudantes de DOM e de armazenamento usados por várias telas.

export const el = (tag, classe, texto) => { const e = document.createElement(tag); if (classe) e.className = classe; if (texto != null) e.textContent = texto; return e; };
export const botao = (texto, fn, rotulo) => { const b = el('button', null, texto); b.type = 'button'; if (rotulo) b.setAttribute('aria-label', rotulo); b.addEventListener('click', fn); return b; };

export function baixar(conteudo, nome, tipo = 'text/plain') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  Object.assign(document.createElement('a'), { href: url, download: nome }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const baixarJson = (nome, dados) => baixar(JSON.stringify(dados, null, 2), nome, 'application/json');

// Personagens salvos no navegador. Leitura tolerante (corrompido ou bloqueado = vazio); gravação lança erro para o chamador avisar.
export const lerPersonagens = () => { try { return JSON.parse(localStorage.getItem('writer.personagens')) ?? {}; } catch { return {}; } };
export const gravarPersonagens = (salvos) => localStorage.setItem('writer.personagens', JSON.stringify(salvos));

export const NOMES_OFICINA = { carta: 'Carta', livro: 'Livro', magias: 'Magias', sigilos: 'Sigilos', letra: 'Minha letra' };
