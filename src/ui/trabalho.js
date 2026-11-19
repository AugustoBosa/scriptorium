// Trabalho de cada oficina: o que fica salvo sozinho no navegador e o que vai para um material da biblioteca.
import { construir } from './texto.js';

// Chaves do estado que formam o trabalho de cada instância (o resto é derivado: fontes, doc, página atual…).
export const CHAVES = {
  escrita: ['texto', 'exemplo', 'vistos', 'opcoes', 'carta', 'livro', 'colunasLivro', 'papelCfg', 'paginaNome'],
  grimorio: ['selecionadas', 'atual', 'papelCfg', 'cfg', 'estilo', 'simbolos'],
  sigilos: ['sig', 'estilo', 'papelCfg', 'paginaNome'],
  coleta: ['col', 'papelCfg', 'paginaNome'],
};

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Cópia só das chaves do trabalho (+ personagem e variação, para um material reabrir com a mesma mão).
export function instantaneo(nome, estado, { comPersonagem = false } = {}) {
  const o = Object.fromEntries(CHAVES[nome].filter((k) => estado[k] !== undefined).map((k) => [k, structuredClone(estado[k])]));
  if (comPersonagem) Object.assign(o, { personagem: structuredClone(estado.personagem), variacao: estado.variacao });
  return o;
}

// Põe `dados` no estado. Objetos são trocados por dentro: os painéis guardam referência a eles (estado.carta, estado.opcoes…).
export function aplicar(nome, estado, dados) {
  if (!objeto(dados)) return;
  for (const k of [...CHAVES[nome], 'personagem', 'variacao']) {
    if (!(k in dados)) continue;
    const v = structuredClone(dados[k]);
    if (objeto(estado[k]) && objeto(v) && k !== 'personagem') { for (const x of Object.keys(estado[k])) delete estado[k][x]; Object.assign(estado[k], v); }
    else estado[k] = v;
  }
  if (estado.papelCfg) { estado.pagina = construir(estado.papelCfg); estado.paginaNome = estado.papelCfg.papel; }
}

// Trabalho salvo sozinho (localStorage; o grimório já salva o dele em 'grimorio.estado').
const chave = (nome) => `trabalho.${nome}`;
export function restaurar(nome, estado) {
  try { aplicar(nome, estado, JSON.parse(localStorage.getItem(chave(nome)))); } catch { /* ilegível: começa do zero */ }
}
export function salvar(nome, estado) {
  try { localStorage.setItem(chave(nome), JSON.stringify(instantaneo(nome, estado))); } catch { /* sem espaço ou bloqueado: vale só nesta sessão */ }
}
