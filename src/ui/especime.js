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
