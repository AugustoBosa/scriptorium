import { ROTULOS, AJUDA } from '../ajuda.js';
import { ret } from '../geo.js';

const megaS = {
  nome: 'megaS', mesaX: 210, mesaY: 210,
  janela: { x0: 0, y0: 0, x1: 210, y1: 210 },
  zEscrita: 3, zLevantada: 6, zMin: 0,
  fDesenho: 2400, fViagem: 6000, fZ: 500,
  offsetX: 0, offsetY: 0,
  estaciona: { x: 0, y: 200, z: 15 },
  trocaCaneta: 'M0 Trocar caneta: {nome}',
  experimental: false,
  header: "G21\nG91\nG0 Z10 F500\nG90\nM412 S0\nG28 X Y\nG28 Z\nG0 Z6 F500\n",
  footer: "G0 Z15 F500\nG0 X0 Y200 F6000\nM84\n",
};

// ponytail: P2S nunca testada; header/footer montados pela descrição do fluxo (PESQUISA §1), sem M84
const p2s = {
  nome: 'p2s', mesaX: 256, mesaY: 256,
  janela: { x0: 48, y0: 55, x1: 255, y1: 255 },
  zEscrita: 17, zLevantada: 21, zMin: 16,
  fDesenho: 2400, fViagem: 6000, fZ: 500,
  offsetX: 0, offsetY: 0,
  estaciona: { x: 150, y: 60, z: 30 },
  trocaCaneta: '; Trocar caneta: {nome}\nM400 U1',
  experimental: true,
  header: "G21\nG90\nM106 S0\nG28\nG0 Z30 F500\nG0 X150 Y60 F6000\nM400 U1\n",
  footer: "G0 Z30 F500\nG0 X150 Y250 F6000\nM400 U1\n",
};

// Mega S com o porta-caneta de troca automática (hardware/pen_holder, branch hardware-pen-holder): 4 vagas na base, ímãs.
// ponytail: tudo ESTIMATIVA do modelo 3D, nada medido nem impresso. Medir na máquina (cabeça à mão) antes do 1º uso e testar sem papel.
// Sinais: Y cresce para o fundo da mesa; recuoY > 0 afasta a mesa da cabeça ao soltar. Mudou o sentido? Troque o sinal de recuoY.
const megaSTroca = {
  ...structuredClone(megaS), nome: 'megaSTroca', experimental: true,
  troca: {
    vagasX: [60, 90, 120, 150], // X do bico sobre cada vaga (base de 118 mm centrada na mesa)
    yBase: 36,                  // Y com o suporte nos pinos
    afastaY: 40,                // quanto a base se afasta da cabeça para andar em X sem bater nas canetas pousadas
    recuoY: 12,                 // curso lento para soltar/pegar pelos ímãs
    subida: 10,                 // altura acima do assento para tirar o suporte dos pinos
    fLento: 300,                // mm/min nos movimentos de encaixe
  },
};

export const PERFIS = { megaS, megaSTroca, p2s, personalizado: { ...structuredClone(megaS), nome: 'personalizado' } };

// Perfil salvo (parcial, do localStorage) sobre os padrões do megaS; nunca compartilha objetos com PERFIS.
export function mesclarPerfil(salvo) {
  return { ...structuredClone(megaS), ...salvo, estaciona: { ...megaS.estaciona, ...salvo?.estaciona }, janela: salvo?.janela ?? null, nome: 'personalizado' };
}

export const janelaDe = (perfil) => perfil.janela ?? { x0: 0, y0: 0, x1: perfil.mesaX, y1: perfil.mesaY };

export function papelMaximo(perfil) {
  const j = janelaDe(perfil);
  return { largura: j.x1 - j.x0, altura: j.y1 - j.y0 };
}

export function cabeNaMaquina(papel, perfil) {
  const max = papelMaximo(perfil);
  if (papel.largura <= max.largura + 1e-6 && papel.altura <= max.altura + 1e-6) return { ok: true, motivo: '' };
  return {
    ok: false,
    motivo: `papel ${papel.largura}×${papel.altura} mm não cabe na janela útil ${max.largura}×${max.altura} mm do perfil ${perfil.nome}`,
  };
}

// Parâmetros editáveis. Prévia: desenhos esquemáticos em mm (semEscala nos que não são medidas reais).
const mesaEJanela = (p) => { const j = janelaDe(p); return { fundo: [ret(j.x0, j.y0, j.x1, j.y1)], foco: [ret(0, 0, p.mesaX, p.mesaY)] }; };
const cruz = (x, y) => [[[x - 3, y], [x + 3, y]], [[x, y - 3], [x, y + 3]]];
const haste = (v) => ({ fundo: [[[-15, 0], [15, 0]]], foco: [[[0, -v], [0, -v - 20]]] }); // linha do papel + caneta com a ponta a v mm acima
const vel = (v) => [[[0, 0], [v / 60 / 4, 0]]]; // percurso em 0,25 s
const num = (chave, min, max, passo, unidade, previa, extra = {}) => ({ chave, grupo: 'maquina', nivel: 'avancado', tipo: 'faixa', min, max, passo, padrao: megaS[chave], unidade, rotulo: ROTULOS[chave], ajuda: AJUDA[chave], previa, ...extra });
export const PARAMS = [
  { chave: 'perfil', grupo: 'maquina', nivel: 'basico', tipo: 'opcao', padrao: 'megaS', rotulo: 'máquina',
    ajuda: 'Escolhe a impressora que vai desenhar. Muda o tamanho da mesa, a janela útil para o papel e as alturas Z. A P2S ainda não foi testada.',
    opcoes: [{ valor: 'megaS', rotulo: 'Anycubic Mega S' }, { valor: 'megaSTroca', rotulo: 'Mega S + porta-caneta (experimental)' }, { valor: 'p2s', rotulo: 'Bambu P2S (experimental)' }, { valor: 'personalizado', rotulo: 'Personalizado' }],
    previa: (v) => { const m = mesaEJanela(PERFIS[v]); return [...m.fundo, ...m.foco]; } },
  num('zEscrita', 0, 30, 0.1, 'mm', haste, { semEscala: true }),
  num('zLevantada', 0, 30, 0.1, 'mm', haste, { semEscala: true }),
  num('fDesenho', 300, 6000, 100, 'mm/min', vel),
  num('fViagem', 600, 12000, 100, 'mm/min', vel),
  num('fZ', 100, 1500, 50, 'mm/min', vel),
  num('offsetX', -20, 20, 0.1, 'mm', (v) => ({ fundo: cruz(0, 0), foco: cruz(v, 0) })),
  num('offsetY', -20, 20, 0.1, 'mm', (v) => ({ fundo: cruz(0, 0), foco: cruz(0, v) })),
  num('mesaX', 100, 400, 1, 'mm', (v, ctx) => mesaEJanela({ ...ctx.perfil, mesaX: v })),
  num('mesaY', 100, 400, 1, 'mm', (v, ctx) => mesaEJanela({ ...ctx.perfil, mesaY: v })),
];
