// Ajudantes de DOM e de armazenamento usados por várias telas.

import { novoPersonagem } from '../personagem.js';
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

// Abre o wizard "Criar personagem" com rascunho dado (ou limpo, se null).
export function novaFicha(rascunho = null) {
  try { if (rascunho) localStorage.setItem('writer.ficha.rascunho', JSON.stringify(rascunho)); else localStorage.removeItem('writer.ficha.rascunho'); } catch { /* sem storage: o wizard começa do zero */ }
  location.hash = '#ficha';
}

// Três jeitos de começar um personagem: da ficha de D&D, da letra do usuário (folhas de coleta) ou em branco.
export function comecarPersonagem(modo) {
  if (modo === 'ficha') return novaFicha();
  if (modo === 'letra') { location.hash = '#letra'; return; }
  try { localStorage.setItem('writer.personagem', JSON.stringify({ personagem: novoPersonagem(), variacao: 'normal' })); } catch { /* sem storage */ }
  if (location.hash === '#personagens') window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = '#personagens';
}
export const INICIOS = [
  ['ficha', 'Da ficha de D&D', 'Responda a ficha e a letra e os perfis saem dela.'],
  ['letra', 'Da minha letra', 'A máquina plota folhas-guia; você escreve à mão e vira fonte.'],
  ['branco', 'Em branco', 'Comece de uma mão neutra e ajuste tudo.'],
];

export const NOMES_OFICINA = { carta: 'Carta', livro: 'Livro', magias: 'Magias', sigilos: 'Sigilos', letra: 'Minha letra' };
