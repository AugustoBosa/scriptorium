// Aba Biblioteca: materiais salvos neste navegador (trabalho para reabrir), com abrir, baixar, renomear e apagar,
// mais uma cópia de tudo (personagens + materiais) para levar a outro navegador.
import './biblioteca.css';
import * as armazem from './armazem.js';
import { slug } from './personagem.js';
import { validar } from '../personagem.js';

import { el, botao, baixarJson, lerPersonagens, gravarPersonagens, NOMES_OFICINA as NOMES } from './util.js';
const data = (t) => new Date(t).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

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
        // só entra o que abre: material com id e oficina conhecida, personagem válido
        for (const m of d.materiais ?? []) if (m?.id && NOMES[m.oficina] && m.estado) await gravarMaterial(m);
        const novos = Object.fromEntries(Object.entries(d.personagens ?? {}).filter(([, p]) => p && !validar(p).length));
        gravarPersonagens({ ...lerPersonagens(), ...novos });
      } else if (d.tipo === 'scriptorium-material' && NOMES[d.oficina] && d.estado) {
        await gravarMaterial({ ...d, id: novoId(), tipo: undefined });
      } else throw new Error('não é um material nem uma cópia do Scriptorium');
      erro.textContent = '';
      atualizar();
    } catch (e) { erro.textContent = `Importação falhou: ${e.message}`; }
  });

  const copia = async () => { try { await baixarCopia(); } catch (e) { erro.textContent = `Cópia falhou: ${e.message}`; } };
  const baixarCopia = async () => baixarJson(`scriptorium-copia-${new Date().toISOString().slice(0, 10)}.json`, {
    tipo: 'scriptorium-copia', versao: 1, personagens: lerPersonagens(), materiais: await materiais(),
  });

  raiz.append(
    el('h2', null, 'Biblioteca'),
    el('p', 'bib-intro', 'Materiais salvos neste navegador. Abra para continuar editando e baixe o SVG ou o G-code na própria oficina. Cada oficina também guarda sozinha o trabalho em andamento.'),
    (() => { const d = el('div', 'linha-botoes'); d.append(botao('Importar material ou cópia…', () => entrada.click()), botao('Baixar cópia de tudo', copia), entrada); return d; })(),
    erro, vazio, lista,
  );

  // Uma seção por oficina, só uma aberta por vez (acordeão nativo); abre a do material mais recente.
  let aberta = null;
  async function atualizar() {
    const ms = await materiais();
    vazio.hidden = ms.length > 0;
    const grupos = Map.groupBy(ms, (m) => m.oficina);
    if (!grupos.has(aberta)) aberta = ms[0]?.oficina;
    lista.replaceChildren(...[...grupos].map(([oficina, itens]) => {
      const d = el('details', 'bib-grupo'), grade = el('div', 'bib-grade');
      d.name = 'biblioteca';
      d.open = oficina === aberta;
      d.addEventListener('toggle', () => { if (d.open) aberta = oficina; });
      grade.append(...itens.map(cartao));
      d.append(el('summary', null, `${NOMES[oficina] ?? oficina} (${itens.length})`), grade);
      return d;
    }));
  }
  function cartao(m) {
    const c = el('article', 'bib-cartao');
    c.append(el('h3', 'nome', m.nome), el('p', 'bib-meta', `${data(m.quando)}${m.estado?.personagem?.nome ? ' · ' + m.estado.personagem.nome : ''}`)); // a oficina já é o título da seção
    const acoes = el('div', 'linha-botoes');
    acoes.append(
      botao('Abrir', () => abrir(m), `Abrir ${m.nome}`),
      botao('Baixar', () => baixarJson(`${slug(m.nome)}.json`, { tipo: 'scriptorium-material', versao: 1, ...m }), `Baixar ${m.nome}`),
      botao('Renomear', async () => {
        const nome = prompt('Novo nome do material', m.nome)?.trim();
        if (!nome) return;
        try { await gravarMaterial({ ...m, nome }); } catch (e) { erro.textContent = `Não foi possível renomear: ${e.message}`; return; }
        atualizar();
      }, `Renomear ${m.nome}`),
      botao('Apagar', async () => {
        if (!confirm(`Apagar "${m.nome}" da biblioteca? Não dá para desfazer (baixe antes se quiser guardar).`)) return;
        try { await armazem.apagar('material:' + m.id); } catch (e) { erro.textContent = `Não foi possível apagar: ${e.message}`; return; }
        atualizar();
      }, `Apagar ${m.nome}`),
    );
    c.append(acoes);
    return c;
  }
  return atualizar;
}
