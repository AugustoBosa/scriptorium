// Atributos categóricos de uma magia, extraídos dos textos pt-BR já normalizados (mec, alcance, duracao, resumo, texto).
// Cada atributo devolve um valor de OPCOES[campo]; o que não casa vira o primeiro valor ('nenhum').
import { ESCOLAS } from './magia.js';

export const OPCOES = {
  nivel: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  escola: Object.keys(ESCOLAS),
  dano: ['nenhum', 'ácido', 'concussão', 'cortante', 'elétrico', 'energia', 'fogo', 'frio', 'necrótico', 'perfurante', 'psíquico', 'radiante', 'trovão', 'veneno'],
  area: ['nenhum', 'esfera', 'cone', 'cubo', 'cilindro', 'linha', 'parede', 'quadrado', 'hemisfério'],
  alcance: ['pessoal', 'toque', 'curto', 'médio', 'longo', 'visão', 'especial'],
  duracao: ['instantânea', 'rodada', 'minutos', 'horas', 'dias', 'permanente', 'especial'],
  salva: ['nenhum', 'FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'],
  conc: ['não', 'sim'],
  ritual: ['não', 'sim'],
  comp: ['V', 'S', 'M'],
};

const AREA = /\b(esfera|cone|cubo|cilindro|linha|parede|muralha|quadrado|hemisf[eé]rio)\b/i;
const sem = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

function dano(mec = '') {
  for (const [, tipos] of mec.matchAll(/\d+d\d+(?: \+ \d+)? ([a-zà-ú/]+)/gi)) {
    const t = tipos.split('/')[0].toLowerCase();
    if (OPCOES.dano.includes(t)) return t;
  }
  return 'nenhum';
}

function area(m) {
  for (const s of [m.alcance, m.resumo, m.texto]) {
    const k = (s ?? '').match(AREA)?.[1]?.toLowerCase();
    if (k) return k === 'muralha' ? 'parede' : k.startsWith('hemisf') ? 'hemisfério' : k;
  }
  return 'nenhum';
}

function alcance(s = '') {
  const t = sem(s).toLowerCase();
  if (t.startsWith('pessoal')) return 'pessoal';
  if (t.startsWith('toque')) return 'toque';
  if (t.startsWith('visao')) return 'visão';
  const n = t.match(/^([\d.,]+)\s*(km|m)\b/);
  if (!n) return 'especial';
  const metros = parseFloat(n[1].replace('.', '').replace(',', '.')) * (n[2] === 'km' ? 1000 : 1);
  return metros <= 9 ? 'curto' : metros <= 36 ? 'médio' : 'longo';
}

function duracao(s = '') {
  const t = sem(s).toLowerCase();
  if (t.startsWith('instantanea')) return 'instantânea';
  if (/dissipada|permanente/.test(t)) return 'permanente';
  if (/rodada/.test(t)) return 'rodada';
  if (/minuto/.test(t)) return 'minutos';
  if (/hora/.test(t)) return 'horas';
  if (/dia/.test(t)) return 'dias';
  return 'especial';
}

// Valor de cada campo como string de OPCOES[campo] (comp é a lista de letras presentes).
export function atributos(m) {
  return {
    nivel: String(m.nivel ?? 0),
    escola: m.escola ?? 'V',
    dano: dano(m.mec),
    area: area(m),
    alcance: alcance(m.alcance),
    duracao: duracao(m.duracao),
    salva: (m.mec ?? '').match(/Res\. (FOR|DES|CON|INT|SAB|CAR)/)?.[1] ?? 'nenhum',
    conc: m.conc ? 'sim' : 'não',
    ritual: m.ritual ? 'sim' : 'não',
    comp: OPCOES.comp.filter((c) => new RegExp(`\\b${c}\\b`).test(m.comp ?? '')),
  };
}

// Índice do valor na lista de opções (0 quando não está).
export function indice(campo, valor) {
  return Math.max(0, OPCOES[campo].indexOf(valor));
}
