// Oficina Símbolos: monta o sistema de símbolos do personagem (como cada magia vira sigilo) e mostra a folha-chave.
// O sistema mora no personagem (personagem.simbolos); o Grimório desenha os sigilos com ele.
import { resolver, novoPersonagem } from '../personagem.js';
import { PERFIS } from '../maquina/perfis.js';
import { papel } from '../materiais/documento.js';
import { OPCOES } from '../magia-atributos.js';
import { completar, gravarEm, CAMPOS, MODOS, TIPOS_ANEL, PARAMS } from '../arcano/sistema.js';
import { PRESETS, dePreset } from '../arcano/presets.js';
import { sistemaDe, sugerirSistema } from '../ficha/simbolos.js';
import { comporChave, amostraVariada } from '../materiais/chave.js';
import * as pPersonagem from './personagem.js';
import * as pExportar from './exportar.js';
import { montarSoPapel } from './texto.js';
import * as armazem from './armazem.js';
import * as trabalho from './trabalho.js';
import { controle, dica } from './controle.js';
import { el, botao, baixarJson, lerPersonagens, gravarPersonagens } from './util.js';

const $ = (id) => document.getElementById(id);
const ROTULO_CAMPO = { nivel: 'nível', escola: 'escola', dano: 'tipo de dano', area: 'área', alcance: 'alcance', duracao: 'duração', salva: 'salvaguarda', conc: 'concentração', ritual: 'ritual', comp: 'componentes' };
const ROTULO_MODO = { colar: 'colar de cordas', glifo: 'glifo', anel: 'anéis', lados: 'lados / estrela', marca: 'marcas na borda' };
const AJUDA_MODO = {
  colar: 'O valor vira um número binário; cada 1 liga um ponto da base ao ponto k casas adiante (k = passo).',
  glifo: 'Um símbolo por valor. Escola usa os glifos das escolas; sim/não vira um círculo; os outros usam letras do alfabeto arcano.',
  anel: 'O valor vira a quantidade de anéis concêntricos (0 = nenhum).',
  lados: 'O valor vira o número de pontas de uma estrela (ou lados de um polígono).',
  marca: 'Uma marca na borda, na posição do valor; componentes marcam cada letra presente.',
};
const PP = Object.fromEntries(PARAMS.map((p) => [p.chave, p]));
const obter = (s, [a, b]) => s[a]?.[b];

function rotulado(texto, campo, ajuda) {
  const l = el('label', null, texto + ' ');
  l.append(campo);
  if (!ajuda) return l;
  const d = el('div', 'linha-botoes');
  d.append(l, dica(ajuda, texto));
  return d;
}
function selecao(pares, valor, aoTrocar) {
  const s = el('select');
  s.append(...pares.map(([v, r]) => new Option(r, v)));
  s.value = valor;
  s.addEventListener('change', () => aoTrocar(s.value));
  return s;
}
function numero(valor, min, max, passo, aoTrocar) {
  const i = el('input');
  Object.assign(i, { type: 'number', min, max, step: passo, value: valor });
  i.addEventListener('change', () => { const v = Number(i.value); if (Number.isFinite(v)) aoTrocar(Math.min(max, Math.max(min, v))); });
  return i;
}

export function criar() {
  const estado = {
    magias: [], amostra: { modo: 'variada', n: 9, colunas: 3 },
    paginaNome: 'A5', variacao: 'normal', personagem: novoPersonagem(), fontes: {},
    perfil: structuredClone(PERFIS.megaS), perfilNome: 'megaS', otimizar: true, trajeto: false, paginaAtual: 0,
  };
  try { pPersonagem.restaurar(estado); } catch { /* usa personagem novo */ }
  Object.assign(estado, pExportar.maquinaSalva());
  estado.pagina = papel('A5');
  trabalho.restaurar('simbolos', estado);

  const sistema = () => sistemaDe(estado.personagem);
  // Grava o sistema no personagem e no navegador (galeria + personagem atual), como a ficha faz.
  function editar(fn, aoMudar) {
    const p = estado.personagem;
    p.simbolos = fn(structuredClone(sistema()));
    try {
      const salvos = lerPersonagens();
      if (salvos[p.nome]) gravarPersonagens({ ...salvos, [p.nome]: p });
      localStorage.setItem('writer.personagem', JSON.stringify({ personagem: p, variacao: estado.variacao }));
    } catch (e) { $('erro').textContent = `Não foi possível salvar o sistema no navegador: ${e.message}`; }
    aoMudar();
  }
  const amostras = () => {
    if (estado.amostra.modo === 'grimorio') {
      try { const g = JSON.parse(localStorage.getItem('grimorio.estado'))?.selecionadas; if (g?.length) return g.slice(0, estado.amostra.n); } catch { /* cai na variada */ }
    }
    return amostraVariada(estado.magias, estado.amostra.n);
  };
  const ctx = () => ({ fontes: estado.fontes, mao: resolver(estado.personagem, estado.variacao || null), sistema: sistema(), magia: amostras()[0] });
  const avisoClassico = () => {
    const p = el('p', 'controle-nota', 'O modelo Clássico é fixo. Escolha outro modelo em Sistema para editar esta parte.');
    return { el: p, atualizar: () => { p.hidden = !sistema().classico; } };
  };
  const controles = (chaves, aoMudar) => chaves.map((k) => {
    const def = PP[k];
    return controle(def, {
      ler: () => (def.ler ?? ((v) => v))(obter(completar(sistema()), def.caminho)),
      gravar: (v) => editar((s) => gravarEm(completar(s), def.caminho, def.conv ? def.conv(v) : v), () => {}),
      ctx,
    }, aoMudar);
  });
  const grupoParams = (chaves) => (div, _e, aoMudar) => {
    const aviso = avisoClassico(), cs = controles(chaves, aoMudar);
    div.append(aviso.el, ...cs.map((c) => c.el));
    return () => { aviso.atualizar(); cs.forEach((c) => { c.el.hidden = !!sistema().classico; c.atualizar(); }); };
  };

  // ---------- Sistema: modelo, sugestão pela ficha, nome, exportar/importar ----------
  function painelSistema(div, _e, aoMudar) {
    const sel = selecao(Object.entries(PRESETS).map(([k, p]) => [k, p.nome]), 'classico', (k) => {
      if (estado.personagem.simbolos && !confirm(`Trocar o sistema atual pelo modelo ${PRESETS[k].nome}? As mudanças feitas à mão se perdem.`)) { sel.value = sistema().preset ?? ''; return; }
      editar(() => dePreset(k), aoMudar);
    });
    sel.prepend(new Option('(personalizado)', ''));
    const desc = el('p', 'controle-nota');
    const nome = el('input');
    nome.type = 'text';
    nome.addEventListener('change', () => editar((s) => ({ ...s, nome: nome.value.trim() || s.nome }), aoMudar));
    const sugerir = botao('Sugerir pela ficha', () => editar(() => sugerirSistema(estado.personagem.ficha), aoMudar));
    const exportar = botao('Exportar .json', () => baixarJson(`sistema-${(sistema().nome || 'simbolos').toLowerCase().replace(/\W+/g, '-')}.json`, sistema()));
    const arq = el('input');
    Object.assign(arq, { type: 'file', accept: '.json' });
    arq.setAttribute('aria-label', 'Importar sistema .json');
    arq.addEventListener('change', async () => {
      const f = arq.files[0]; arq.value = '';
      if (!f) return;
      try {
        const s = JSON.parse(await f.text());
        if (!s || typeof s !== 'object' || !(s.classico || Array.isArray(s.codigos))) throw new Error('não é um sistema de símbolos');
        editar(() => s, aoMudar);
      } catch (e) { $('erro').textContent = `Importação falhou: ${e.message}`; }
    });
    const nota = el('p', 'controle-nota');
    div.append(rotulado('Modelo', sel, 'Ponto de partida do sistema. Escolher um modelo substitui o sistema atual do personagem.'), desc, rotulado('Nome do sistema', nome), sugerir, nota, el('div', 'linha-botoes'));
    div.lastChild.append(exportar, rotulado('Importar', arq));
    return () => {
      const s = sistema(), p = estado.personagem;
      sel.value = s.preset && PRESETS[s.preset] ? s.preset : '';
      desc.textContent = PRESETS[s.preset]?.descricao ?? 'Sistema próprio, editado à mão ou importado.';
      if (document.activeElement !== nome) nome.value = s.nome ?? '';
      sugerir.disabled = !p.ficha;
      nota.textContent = p.simbolos ? `Sistema salvo no personagem ${p.nome || 'sem nome'}.`
        : p.ficha ? 'Ainda não editado: este é o sistema sugerido pela ficha.' : 'Personagem sem ficha: usando o Clássico.';
    };
  }

  // ---------- Códigos: um atributo da magia → um elemento do desenho ----------
  function painelCodigos(div, _e, aoMudar) {
    const aviso = avisoClassico(), lista = el('div', 'codigos');
    const add = botao('Adicionar código', () => editar((s) => ({ ...s, codigos: [...(s.codigos ?? []), { campo: 'nivel', modo: 'marca' }] }), aoMudar));
    div.append(aviso.el, lista, add);
    let assinatura = '';
    const muda = (i, f) => editar((s) => { s.codigos[i] = f({ ...s.codigos[i] }); return s; }, aoMudar);
    function linha(c, i) {
      const d = el('details'), sm = el('summary', null, `${ROTULO_CAMPO[c.campo] ?? c.campo} → ${ROTULO_MODO[c.modo] ?? c.modo}`);
      d.name = 'codigos';
      d.append(sm);
      d.append(
        rotulado('Atributo', selecao(CAMPOS.map((k) => [k, ROTULO_CAMPO[k]]), c.campo, (v) => muda(i, (x) => ({ ...x, campo: v, opcoes: undefined })))),
        rotulado('Desenho', selecao(MODOS.map((k) => [k, ROTULO_MODO[k]]), c.modo, (v) => muda(i, (x) => ({ ...x, modo: v }))), AJUDA_MODO[c.modo]),
      );
      if (c.modo !== 'colar') d.append(rotulado('Raio (0–1)', numero(c.raio ?? 0.9, 0, 1, 0.02, (v) => muda(i, (x) => ({ ...x, raio: v })))));
      if (c.modo === 'colar') d.append(rotulado('Passo da corda', numero(c.passo ?? i + 1, 1, 12, 1, (v) => muda(i, (x) => ({ ...x, passo: v }))), 'Quantas casas adiante cada corda pula. Atributos com passos diferentes não se confundem.'));
      if (c.modo === 'glifo') d.append(rotulado('Tamanho (0–1)', numero(c.tamanho ?? 0.25, 0.04, 0.6, 0.01, (v) => muda(i, (x) => ({ ...x, tamanho: v })))));
      if (c.modo === 'anel') d.append(rotulado('Tipo de anel', selecao(TIPOS_ANEL.map((t) => [t, t]), c.tipo ?? 'linha', (v) => muda(i, (x) => ({ ...x, tipo: v })))));
      if (c.modo === 'lados') d.append(rotulado('Pontas a mais', numero(c.minimo ?? 2, 0, 6, 1, (v) => muda(i, (x) => ({ ...x, minimo: v }))), 'Pontas = valor + este número. Com 2, nível 1 vira triângulo.'));
      if (c.modo === 'marca') d.append(rotulado('Início (volta)', numero(c.inicio ?? 0, 0, 1, 0.01, (v) => muda(i, (x) => ({ ...x, inicio: v })))));
      const ops = el('input');
      ops.type = 'text';
      ops.value = (c.opcoes ?? OPCOES[c.campo]).join(', ');
      ops.addEventListener('change', () => {
        const v = ops.value.split(',').map((x) => x.trim()).filter(Boolean), base = OPCOES[c.campo];
        if (v.length !== base.length || base.some((x) => !v.includes(x))) { ops.value = (c.opcoes ?? base).join(', '); $('erro').textContent = `Ordem das opções: use exatamente ${base.join(', ')}`; return; }
        muda(i, (x) => ({ ...x, opcoes: v }));
      });
      d.append(rotulado('Ordem dos valores', ops, 'A posição de cada valor nesta lista é o número que ele vira no desenho. Reordene para criar a sua cifra.'));
      d.append(botao('Remover código', () => editar((s) => { s.codigos.splice(i, 1); return s; }, aoMudar)));
      return d;
    }
    return () => {
      aviso.atualizar();
      const s = sistema();
      lista.hidden = add.hidden = !!s.classico;
      const a = JSON.stringify([estado.personagem.nome, s.codigos]);
      if (a === assinatura) return;
      const aberto = [...lista.children].findIndex((d) => d.open);
      assinatura = a;
      lista.replaceChildren(...(s.codigos ?? []).map(linha));
      if (lista.children[aberto]) lista.children[aberto].open = true;
    };
  }

  // ---------- Molduras: anéis fixos em volta de todo sigilo ----------
  function painelMolduras(div, _e, aoMudar) {
    const aviso = avisoClassico(), lista = el('div', 'molduras');
    const add = botao('Adicionar anel', () => editar((s) => { const c = completar(s); return { ...s, molduras: [...c.molduras, { raio: 0.9, tipo: 'linha' }] }; }, aoMudar));
    div.append(aviso.el, lista, add);
    let assinatura = '';
    const muda = (i, f) => editar((s) => { const m = completar(s).molduras.map((x) => ({ ...x })); m[i] = f(m[i]); return { ...s, molduras: m }; }, aoMudar);
    return () => {
      aviso.atualizar();
      const s = sistema();
      lista.hidden = add.hidden = !!s.classico;
      const ms = completar(s).molduras, a = JSON.stringify([estado.personagem.nome, ms]);
      if (a === assinatura) return;
      assinatura = a;
      lista.replaceChildren(...ms.map((m, i) => {
        const l = el('div', 'linha-botoes');
        l.append(
          rotulado('Anel', selecao(TIPOS_ANEL.map((t) => [t, t]), m.tipo, (v) => muda(i, (x) => ({ ...x, tipo: v })))),
          rotulado('raio', numero(m.raio, 0.3, 1, 0.01, (v) => muda(i, (x) => ({ ...x, raio: v })))),
          botao('×', () => editar((s2) => ({ ...s2, molduras: completar(s2).molduras.filter((_, j) => j !== i) }), aoMudar), 'Remover anel'),
        );
        return l;
      }));
    };
  }

  // ---------- Amostras da folha-chave ----------
  function painelAmostras(div, _e, aoMudar) {
    const a = estado.amostra;
    const modo = selecao([['variada', 'variada (duas por escola)'], ['grimorio', 'magias escolhidas no Grimório']], a.modo, (v) => { a.modo = v; aoMudar(); });
    const n = numero(a.n, 1, 24, 1, (v) => { a.n = v; aoMudar(); });
    const col = numero(a.colunas, 1, 5, 1, (v) => { a.colunas = v; aoMudar(); });
    div.append(rotulado('Magias', modo), rotulado('Quantas', n), rotulado('Colunas', col));
    return () => { modo.value = a.modo; n.value = a.n; col.value = a.colunas; };
  }

  let primeira = true;
  return {
    estado,
    grupos: [
      { titulo: 'Personagem', montar: pPersonagem.montar },
      { titulo: 'Sistema', aberto: true, montar: painelSistema },
      { titulo: 'Códigos', montar: painelCodigos },
      { titulo: 'Base e cordas', montar: grupoParams(['pontos', 'raioBase', 'inicio', 'marcador', 'formaLinha', 'curva', 'zero']) },
      { titulo: 'Nome da magia', montar: grupoParams(['modoNome', 'escalaNome']) },
      { titulo: 'Molduras', montar: painelMolduras },
      { titulo: 'Traço do personagem', montar: grupoParams(['complexidade', 'ornamento', 'firmeza']) },
      { titulo: 'Amostras', montar: painelAmostras },
      { titulo: 'Papel', montar: montarSoPapel },
      { titulo: 'Máquina', nivel: 'avancado', montar: pExportar.montar },
    ],
    async entrar() {
      if (!primeira) return;
      primeira = false;
      try { const r = await fetch('dados/magias.json'); if (r.ok) estado.magias = await r.json(); } catch { /* sem dados no servidor */ }
      if (!estado.magias.length) estado.magias = (await armazem.ler('magias')) ?? [];
    },
    compor: () => comporChave(amostras(), sistema(), ctx(), { papel: estado.pagina, colunas: estado.amostra.colunas, seed: 1 }),
    barra: pExportar.montarBarra,
  };
}
