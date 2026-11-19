// Aba Biblioteca: materiais salvos neste navegador (trabalho para reabrir), com abrir, baixar, renomear e apagar,
// mais uma cópia de tudo (personagens + materiais) para levar a outro navegador.
import './biblioteca.css';
import * as armazem from './armazem.js';
import { slug } from './personagem.js';

const NOMES = { carta: 'Carta', livro: 'Livro', magias: 'Magias', sigilos: 'Sigilos', letra: 'Minha letra' };
const el = (tag, classe, texto) => { const e = document.createElement(tag); if (classe) e.className = classe; if (texto != null) e.textContent = texto; return e; };
const botao = (texto, fn, rotulo) => { const b = el('button', null, texto); b.type = 'button'; if (rotulo) b.setAttribute('aria-label', rotulo); b.addEventListener('click', fn); return b; };
const data = (t) => new Date(t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function baixarJson(nome, dados) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }));
  const a = el('a'); a.href = url; a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Materiais mais recentes primeiro.
export const materiais = async () => (await armazem.listar('material:')).sort((a, b) => b.quando - a.quando);
export const gravarMaterial = (m) => armazem.gravar('material:' + m.id, m);
export const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Contrato de página: montar(el, { abrir }) → atualizar()
export function montar(raiz, { abrir }) {
  const erro = el('p', 'erro'), lista = el('div', 'bib-lista'), vazio = el('p', 'bib-vazio', 'Nenhum material salvo ainda. Nas oficinas, use "Salvar na biblioteca".');
  const entrada = el('input'); entrada.type = 'file'; entrada.accept = '.json,application/json'; entrada.hidden = true;
  entrada.addEventListener('change', async () => {
    const f = entrada.files[0]; entrada.value = '';
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.tipo === 'scriptorium-copia') {
        for (const m of d.materiais ?? []) await gravarMaterial(m);
        const atuais = JSON.parse(localStorage.getItem('writer.personagens') ?? '{}');
        localStorage.setItem('writer.personagens', JSON.stringify({ ...atuais, ...(d.personagens ?? {}) }));
      } else if (d.tipo === 'scriptorium-material' && NOMES[d.oficina] && d.estado) {
        await gravarMaterial({ ...d, id: novoId(), tipo: undefined });
      } else throw new Error('não é um material nem uma cópia do Scriptorium');
      erro.textContent = '';
      atualizar();
    } catch (e) { erro.textContent = `Importação falhou: ${e.message}`; }
  });

  const copia = async () => baixarJson(`scriptorium-copia-${new Date().toISOString().slice(0, 10)}.json`, {
    tipo: 'scriptorium-copia', versao: 1, personagens: JSON.parse(localStorage.getItem('writer.personagens') ?? '{}'), materiais: await materiais(),
  });

  raiz.append(
    el('h2', null, 'Biblioteca'),
    el('p', 'bib-intro', 'Materiais salvos neste navegador. Abra para continuar editando e baixe o SVG ou o G-code na própria oficina. Cada oficina também guarda sozinha o trabalho em andamento.'),
    (() => { const d = el('div', 'linha-botoes'); d.append(botao('Importar material ou cópia…', () => entrada.click()), botao('Baixar cópia de tudo', copia), entrada); return d; })(),
    erro, vazio, lista,
  );

  async function atualizar() {
    const ms = await materiais();
    vazio.hidden = ms.length > 0;
    lista.replaceChildren(...ms.map((m) => {
      const c = el('article', 'bib-cartao');
      c.append(el('h3', 'nome', m.nome), el('p', 'bib-meta', `${NOMES[m.oficina] ?? m.oficina} · ${data(m.quando)}${m.estado?.personagem?.nome ? ' · ' + m.estado.personagem.nome : ''}`));
      const acoes = el('div', 'linha-botoes');
      acoes.append(
        botao('Abrir', () => abrir(m), `Abrir ${m.nome}`),
        botao('Baixar', () => baixarJson(`${slug(m.nome)}.json`, { tipo: 'scriptorium-material', versao: 1, ...m }), `Baixar ${m.nome}`),
        botao('Renomear', async () => {
          const nome = prompt('Novo nome do material', m.nome)?.trim();
          if (!nome) return;
          await gravarMaterial({ ...m, nome });
          atualizar();
        }, `Renomear ${m.nome}`),
        botao('Apagar', async () => {
          if (!confirm(`Apagar "${m.nome}" da biblioteca? Não dá para desfazer (baixe antes se quiser guardar).`)) return;
          await armazem.apagar('material:' + m.id);
          atualizar();
        }, `Apagar ${m.nome}`),
      );
      c.append(acoes);
      return c;
    }));
  }
  return atualizar;
}
