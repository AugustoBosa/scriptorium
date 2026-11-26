import './ficha.css';
import { el, botao } from './util.js';
import { especime } from './especime.js';
import { NEUTRA } from '../motor/mao.js';
import { novoPersonagem } from '../personagem.js';
import { RACAS, CLASSES, ANTECEDENTES, IDIOMAS, ALINHAMENTOS, IDADES } from '../ficha/dnd.js';

// Wizard "Criar personagem": ficha D&D em passos, um aberto por vez. Rascunho em localStorage.
const CHAVE = 'writer.ficha.rascunho';
const FOLHA = { largura: 120, altura: 40, margens: { topo: 4, dir: 4, base: 4, esq: 4 } };
const ATRIBUTOS = [['for', 'FOR'], ['des', 'DES'], ['con', 'CON'], ['int', 'INT'], ['sab', 'SAB'], ['car', 'CAR']];
const ARRAY_PADRAO = [15, 14, 13, 12, 10, 8];
const AUTO = { druida: 'druidico', ladino: 'giria' }; // idioma secreto que a classe ensina sozinha
const TIPOS = [['padrão', 'Padrão'], ['exótico', 'Exótico'], ['secreto', 'Secreto']];

const FICHA0 = () => ({ v: 1, raca: 'humano', classe: 'guerreiro', antecedente: 'soldado', idade: 'adulto', destro: true, atributos: { for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 }, alinhamento: 'N', idiomas: ['comum'], ferramentas: { caligrafo: false, falsificacao: false } });

const nomeDe = (lista, id) => lista.find((x) => x.id === id)?.nome ?? '';
const valido = (lista, id, padrao) => (lista.some((x) => x.id === id) ? id : padrao);

function lerRascunho() {
  let g = null;
  try { g = JSON.parse(localStorage.getItem(CHAVE)); } catch { /* corrompido: começa do zero */ }
  const f = FICHA0();
  if (g?.ficha && typeof g.ficha === 'object') {
    Object.assign(f, g.ficha, { atributos: { ...f.atributos, ...g.ficha.atributos }, ferramentas: { ...f.ferramentas, ...g.ficha.ferramentas } });
  }
  f.raca = valido(RACAS, f.raca, 'humano');
  f.classe = valido(CLASSES, f.classe, 'guerreiro');
  f.antecedente = valido(ANTECEDENTES, f.antecedente, 'soldado');
  f.idade = valido(IDADES, f.idade, 'adulto');
  f.alinhamento = valido(ALINHAMENTOS, f.alinhamento, 'N');
  if (!Array.isArray(f.idiomas)) f.idiomas = ['comum'];
  return { nome: typeof g?.nome === 'string' ? g.nome : '', ficha: f, base: g?.base ?? null, perfis: g?.perfis ?? null };
}
const gravar = (r) => { try { localStorage.setItem(CHAVE, JSON.stringify(r)); } catch { /* sem storage: o rascunho vale só nesta aba */ } };

// Idiomas: fixos da raça e os secretos da classe entram sozinhos; o resto é escolha livre, até o limite da raça + antecedente.
function infoIdiomas(f) {
  const raca = RACAS.find((r) => r.id === f.raca), antecedente = ANTECEDENTES.find((a) => a.id === f.antecedente);
  const fixos = raca.idiomas, auto = AUTO[f.classe] ? [AUTO[f.classe]] : [];
  const livre = (id) => !fixos.includes(id) && IDIOMAS.some((i) => i.id === id && i.tipo !== 'secreto');
  return { fixos, auto, livre, livres: raca.idiomasLivres + antecedente.idiomasLivres };
}
function normalizarIdiomas(f) {
  const info = infoIdiomas(f);
  f.idiomas = [...new Set([...info.fixos, ...info.auto, ...f.idiomas.filter(info.livre).slice(0, info.livres)])];
}

// Controles
let uid = 0;
const campo = (texto, controle) => { controle.id = 'ficha-c' + ++uid; const l = el('label', null, texto); l.htmlFor = controle.id; return [l, controle]; };
const opcao = (texto, controle) => { const l = el('label', 'ficha-opcao'); l.append(controle, el('span', null, texto)); return l; };
const selecao = (lista, valor, aoMudar) => { const sel = el('select'); sel.append(...lista.map((o) => new Option(o.nome, o.id))); sel.value = valor; sel.addEventListener('change', () => aoMudar(sel.value)); return sel; };
const caixa = (marcado, aoMudar) => { const c = el('input'); c.type = 'checkbox'; c.checked = marcado; c.addEventListener('change', () => aoMudar(c.checked)); return c; };
const maoPrevia = (r) => ({ ...NEUTRA, base: r.base ?? [{ fonte: 'EMSDelight', peso: 1 }] });

// ---- passos: montar(corpo, s) e resumo(s); s = { r, ganchos, mudou() } ----
function passoQuem(corpo, s) {
  const f = s.r.ficha;
  const nome = el('input');
  nome.type = 'text'; nome.value = s.r.nome; nome.autocomplete = 'off';
  nome.addEventListener('input', () => { s.r.nome = nome.value; s.mudou(); });
  const mao = el('fieldset', 'ficha-grupo');
  mao.append(el('legend', null, 'Mão'));
  for (const [valor, texto] of [['destra', 'Destra'], ['canhota', 'Canhota']]) {
    const rd = el('input');
    rd.type = 'radio'; rd.name = 'ficha-mao'; rd.value = valor; rd.checked = (valor === 'destra') === f.destro;
    rd.addEventListener('change', () => { f.destro = valor === 'destra'; s.mudou(); });
    mao.append(opcao(texto, rd));
  }
  const erroBranco = el('p', 'erro');
  const branco = botao('Começar em branco', () => {
    try {
      localStorage.setItem('writer.personagem', JSON.stringify({ personagem: novoPersonagem(s.r.nome || undefined), variacao: 'normal' }));
    } catch (e) { erroBranco.textContent = 'Erro: não foi possível gravar neste navegador (' + e.message + ').'; return; }
    location.hash = '#personagens';
  });
  branco.className = 'ficha-branco';
  corpo.append(
    ...campo('Nome', nome),
    ...campo('Raça', selecao(RACAS, f.raca, (v) => { f.raca = v; s.mudou(); })),
    ...campo('Idade', selecao(IDADES, f.idade, (v) => { f.idade = v; s.mudou(); })),
    mao, branco, erroBranco,
  );
}

function passoClasse(corpo, s) {
  const f = s.r.ficha;
  const ferramenta = (chave, texto) => opcao(texto, caixa(f.ferramentas[chave], (v) => { f.ferramentas[chave] = v; s.mudou(); }));
  corpo.append(
    ...campo('Classe', selecao(CLASSES, f.classe, (v) => { f.classe = v; s.mudou(); })),
    ...campo('Antecedente', selecao(ANTECEDENTES, f.antecedente, (v) => { f.antecedente = v; s.mudou(); })),
    ferramenta('caligrafo', 'Ferramentas de calígrafo'),
    ferramenta('falsificacao', 'Kit de falsificação'),
  );
}

function passoAtributos(corpo, s) {
  const f = s.r.ficha, grade = el('div', 'ficha-atributos'), campos = {};
  const aplicar = (valores) => {
    ATRIBUTOS.forEach(([k], i) => { f.atributos[k] = valores[i]; campos[k].value = valores[i]; });
    s.mudou();
  };
  for (const [k, rotulo] of ATRIBUTOS) {
    const n = el('input');
    n.type = 'number'; n.min = '3'; n.max = '20'; n.step = '1'; n.value = f.atributos[k];
    campos[k] = n;
    n.addEventListener('change', () => {
      const v = parseInt(n.value, 10);
      f.atributos[k] = Number.isNaN(v) ? f.atributos[k] : Math.min(20, Math.max(3, v));
      n.value = f.atributos[k];
      s.mudou();
    });
    const celula = el('div');
    celula.append(...campo(rotulo, n));
    grade.append(celula);
  }
  const predefinidos = el('div', 'linha-botoes');
  predefinidos.append(botao('Array padrão (15, 14, 13, 12, 10, 8)', () => aplicar(ARRAY_PADRAO)), botao('Tudo 10', () => aplicar(ATRIBUTOS.map(() => 10))));
  corpo.append(grade, predefinidos);
}

function passoAlinhamento(corpo, s) {
  const grade = el('div', 'ficha-alinhamento');
  const botoes = ALINHAMENTOS.map((a) => botao(a.nome, () => { s.r.ficha.alinhamento = a.id; s.mudou(); }));
  grade.append(...botoes);
  s.ganchos.push(() => botoes.forEach((b, i) => b.setAttribute('aria-pressed', String(ALINHAMENTOS[i].id === s.r.ficha.alinhamento))));
  corpo.append(grade, el('p', 'ficha-nota', 'Bem e Mal não mudam a letra; Leal e Caótico sim.'));
}

function passoIdiomas(corpo, s) {
  const caixas = new Map(), faltam = el('p', 'ficha-nota');
  faltam.setAttribute('aria-live', 'polite');
  for (const [tipo, titulo] of TIPOS) {
    const grupo = el('fieldset', 'ficha-grupo');
    grupo.append(el('legend', null, titulo));
    for (const idioma of IDIOMAS.filter((i) => i.tipo === tipo)) {
      const c = caixa(false, (marcado) => {
        const f = s.r.ficha;
        f.idiomas = marcado ? [...f.idiomas, idioma.id] : f.idiomas.filter((x) => x !== idioma.id);
        s.mudou();
      });
      caixas.set(idioma.id, c);
      grupo.append(opcao(idioma.nome, c));
    }
    corpo.append(grupo);
  }
  corpo.append(faltam);
  s.ganchos.push(() => {
    const f = s.r.ficha, info = infoIdiomas(f), livres = info.livres - f.idiomas.filter(info.livre).length;
    for (const [id, c] of caixas) {
      const secreto = IDIOMAS.find((i) => i.id === id).tipo === 'secreto';
      if (info.fixos.includes(id)) { c.checked = true; c.disabled = true; }
      else if (secreto) { c.checked = info.auto.includes(id); c.disabled = true; }
      else { c.checked = f.idiomas.includes(id); c.disabled = !c.checked && livres === 0; }
    }
    faltam.textContent = livres ? `Faltam ${livres} ${livres === 1 ? 'idioma' : 'idiomas'}` : 'Nenhum idioma livre restante';
  });
}

// Para acrescentar um passo, basta incluir um item aqui.
const PASSOS = [
  { titulo: 'Quem é', resumo: (s) => [s.r.nome.trim(), nomeDe(RACAS, s.r.ficha.raca), nomeDe(IDADES, s.r.ficha.idade)].filter(Boolean).join(', '), montar: passoQuem },
  { titulo: 'Classe e origem', resumo: (s) => [nomeDe(CLASSES, s.r.ficha.classe), nomeDe(ANTECEDENTES, s.r.ficha.antecedente)].filter(Boolean).join(', '), montar: passoClasse },
  { titulo: 'Atributos', resumo: (s) => ATRIBUTOS.map(([k, r]) => `${r} ${s.r.ficha.atributos[k]}`).join(' · '), montar: passoAtributos },
  { titulo: 'Alinhamento', resumo: (s) => nomeDe(ALINHAMENTOS, s.r.ficha.alinhamento), montar: passoAlinhamento },
  { titulo: 'Idiomas', resumo: (s) => s.r.ficha.idiomas.map((id) => nomeDe(IDIOMAS, id)).join(', '), montar: passoIdiomas },
];

// Contrato de página: montar(raiz, { fontes }) → atualizar()
export function montar(raiz, { fontes }) {
  const r = lerRascunho();
  normalizarIdiomas(r.ficha);
  const s = {
    r,
    ganchos: [],
    mudou() { normalizarIdiomas(r.ficha); gravar(r); reflete(); },
  };
  const previa = el('div', 'folha ficha-previa');
  const passos = el('div', 'ficha-passos');

  function atualizarPrevia() {
    const nome = s.r.nome.trim();
    const p = { nome, mao: maoPrevia(s.r), variacoes: { normal: {} } };
    especime(previa, fontes, p, null, `${nome || 'Seu personagem'} escreve: o vento cheira a trigo.`, FOLHA);
  }

  function reflete() {
    detalhes.forEach((d, i) => {
      const passo = PASSOS[i], resumo = passo.resumo(s);
      d.querySelector('summary').textContent = `${i + 1}. ${passo.titulo}${resumo ? ' — ' + resumo : ''}`;
    });
    s.ganchos.forEach((f) => f());
    atualizarPrevia();
  }

  function irPara(i) {
    detalhes.forEach((d, j) => { d.open = j === i; });
    detalhes[i].querySelector('summary').focus();
  }
  const navegacao = (i) => {
    const barra = el('div', 'linha-botoes');
    if (i > 0) barra.append(botao('Voltar', () => irPara(i - 1)));
    if (i < PASSOS.length - 1) barra.append(botao('Próximo', () => irPara(i + 1)));
    return barra;
  };

  const detalhes = PASSOS.map((passo, i) => {
    const d = el('details', 'ficha-passo');
    d.name = 'ficha';
    const corpo = el('div');
    d.append(el('summary'), corpo);
    passo.montar(corpo, s);
    corpo.append(navegacao(i));
    passos.append(d);
    return d;
  });
  detalhes[0].open = true;

  const topo = el('div', 'ficha-topo');
  topo.append(previa);
  const pagina = el('div', 'ficha');
  pagina.append(
    el('h2', null, 'Criar personagem'),
    el('p', 'ficha-intro', 'Responda à ficha de D&D. A letra e os perfis de escrita saem dela; tudo pode ser mudado depois.'),
    topo, passos,
  );
  raiz.replaceChildren(pagina);
  reflete();
  return reflete;
}
