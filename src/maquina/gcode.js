import { PERFIS, cabeNaMaquina, janelaDe } from './perfis.js';
import { valido, dist } from '../geo.js';

export const PERFIL_PADRAO = PERFIS.megaS;

const num = (v) => String(+v.toFixed(3));

// trajeto: viagem no ar (tracejado), início (verde) e fim (vermelho) de cada traço, numerados.
function viagemSvg(validos) {
  const extra = [];
  let pos = [0, 0];
  validos.forEach((t, i) => {
    const [ix, iy] = t[0], [fx, fy] = t[t.length - 1];
    extra.push(
      `<path d="M ${num(pos[0])} ${num(pos[1])} L ${num(ix)} ${num(iy)}" fill="none" stroke="#888" stroke-width="0.2" stroke-dasharray="1 1"/>`,
      `<circle cx="${num(ix)}" cy="${num(iy)}" r="0.6" fill="green"/>`,
      `<circle cx="${num(fx)}" cy="${num(fy)}" r="0.6" fill="red"/>`,
      `<text x="${num(ix + 0.8)}" y="${num(iy - 0.8)}" font-size="2" fill="#06c">${i + 1}</text>`,
    );
    pos = [fx, fy];
  });
  return extra;
}

// desenha por cima a viagem no ar quando trajeto é true
export function svg(tracos, pagina, { trajeto = false } = {}) {
  const { largura, altura } = pagina;
  const validos = tracos.filter(valido);
  const paths = validos.map((t) =>
    `<path d="M ${t.map(([x, y]) => `${num(x)} ${num(y)}`).join(" L ")}" fill="none" stroke="black" stroke-width="0.3" stroke-linecap="round" stroke-linejoin="round"/>`);
  const extra = trajeto ? viagemSvg(validos) : [];
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}mm" height="${altura}mm" viewBox="0 0 ${largura} ${altura}">`,
    ...paths,
    ...extra,
    "</svg>",
  ].join("\n");
}

export function gcode(tracos, pagina, perfil = PERFIL_PADRAO) {
  const p = { ...PERFIL_PADRAO, ...perfil };
  const validos = tracos.filter(valido);
  const avisos = [];
  let texto = `${p.header}G0 Z${p.zLevantada} F${p.fZ}
`;
  let comprimento = 0;
  validos.forEach((t, i) => {
    const maq = t.map(([x, y]) => [x + p.offsetX, pagina.altura - y + p.offsetY]);
    if (maq.some(([x, y]) => x < 0 || x > p.mesaX || y < 0 || y > p.mesaY)) {
      avisos.push(`traço ${i + 1} fora da mesa`);
    }
    const [ini, ...resto] = maq;
    texto += `G0 X${ini[0].toFixed(3)} Y${ini[1].toFixed(3)} F${p.fViagem}\n`;
    texto += `G1 Z${p.zEscrita} F${p.fZ}\n`;
    for (const [x, y] of resto) texto += `G1 X${x.toFixed(3)} Y${y.toFixed(3)} F${p.fDesenho}\n`;
    texto += `G0 Z${p.zLevantada} F${p.fZ}\n`;
    for (let k = 1; k < t.length; k++) comprimento += dist(t[k - 1], t[k]);
  });
  texto += p.footer;
  return { texto, avisos, nTracos: validos.length, comprimento };
}

// Troca automática no porta-caneta (perfil.troca): solta a caneta da vaga `de` e pega a da vaga `para` (null = cabeça vazia / não pega).
// Sequência de hardware/pen_holder/README.md: afasta a base em Y antes de andar em X; Z e Y de encaixe em F lento.
export function trocaAuto(p, de, para) {
  const t = p.troca, f = (v) => v.toFixed(3), zA = t.zAssento ?? p.zEscrita, zS = zA + t.subida, yL = t.yBase + t.afastaY;
  const v = (y) => `G0 Y${f(y)} F${p.fViagem}`, lento = (eixo, valor) => `G1 ${eixo}${f(valor)} F${t.fLento}`;
  const ir = (x, y) => [`G0 Z${f(zS)} F${p.fZ}`, v(yL), `G0 X${f(x)} F${p.fViagem}`, v(y)]; // afasta a base antes de andar em X
  const L = [];
  if (de != null) { // larga: pinos entram nos furos, a cabeça recua e os ímãs soltam
    L.push(`; largar caneta na vaga ${de + 1}`, ...ir(t.vagasX[de], t.yBase), lento('Z', zA), lento('Y', t.yBase + t.recuoY));
    if (para == null) L.push(lento('Z', zS), v(yL)); // fim do trabalho: cabeça vazia sobe e se afasta
  }
  if (para != null) { // pega: por trás das canetas pousadas, avança até os ímãs, sobe e afasta
    L.push(`; pegar caneta da vaga ${para + 1}`);
    if (de != null) L.push(`G1 X${f(t.vagasX[para])} F${p.fViagem}`); else L.push(...ir(t.vagasX[para], t.yBase + t.recuoY), lento('Z', zA));
    L.push(lento('Y', t.yBase), lento('Z', zS), v(yL));
  }
  return L.map((l) => `${l}\n`).join('');
}

export function gcodeDocumento(pagina, papel, perfil = PERFIS.megaS, { camadas, canetas = {} } = {}) {
  const zMin = perfil.zMin ?? 0;
  for (const [campo, z] of [['zEscrita', perfil.zEscrita], ['zLevantada', perfil.zLevantada], ['estaciona.z', perfil.estaciona.z]]) {
    if (z < zMin) throw new Error(`Z de escrita ${z} abaixo do piso ${zMin} (zMin) do perfil ${perfil.nome} (${campo})`);
  }
  if (!(perfil.zLevantada > perfil.zEscrita)) throw new Error(`Z levantada (${perfil.zLevantada}) tem que ficar acima do Z de escrita (${perfil.zEscrita}): a caneta arrastaria nas viagens`);
  const c = cabeNaMaquina(papel, perfil);
  if (!c.ok) throw new Error(c.motivo);
  const j = janelaDe(perfil);
  const { estaciona: e, fZ, fViagem, fDesenho, zEscrita, zLevantada } = perfil;
  const avisos = [];
  // troca automática: cada caneta de `canetas` tem a vaga da sua posição na lista
  const nomesCanetas = Object.keys(canetas), vaga = (c) => nomesCanetas.indexOf(c);
  if (perfil.troca) {
    const usadas = pagina.camadas.filter((k) => (!camadas || camadas.includes(k.id)) && k.tracos.some(valido)).map((k) => k.caneta);
    for (const c of new Set(usadas)) if (vaga(c) < 0 || vaga(c) >= perfil.troca.vagasX.length) throw new Error(`caneta ${c} sem vaga no porta-caneta (${perfil.troca.vagasX.length} vagas)`);
  }
  // o header termina numa altura fixa; sobe para zLevantada antes da 1ª viagem
  let texto = `${perfil.header}G0 Z${zLevantada} F${fZ}
`, nTracos = 0, comprimento = 0, trocas = 0, anterior = null;
  for (const camada of pagina.camadas.filter((k) => !camadas || camadas.includes(k.id))) {
    const validos = camada.tracos.filter(valido);
    if (!validos.length) continue;
    const id = String(camada.id).replace(/[\r\n]/g, ' ');
    const nome = (canetas[camada.caneta]?.nome ?? camada.caneta).replace(/[\r\n]/g, ' ');
    if (perfil.troca && camada.caneta !== anterior) {
      texto += trocaAuto({ ...perfil, fZ, fViagem }, anterior === null ? null : vaga(anterior), vaga(camada.caneta));
      if (anterior !== null) trocas++;
    } else if (anterior !== null && camada.caneta !== anterior) {
      texto += `G0 Z${e.z} F${fZ}\nG0 X${e.x.toFixed(3)} Y${e.y.toFixed(3)} F${fViagem}\n`;
      texto += perfil.trocaCaneta.replace('{nome}', () => nome) + '\n';
      trocas++;
    }
    anterior = camada.caneta;
    texto += `; camada ${id} caneta ${nome}\n`;
    validos.forEach((t, i) => {
      const maq = t.map(([x, y]) => [j.x0 + perfil.offsetX + x, j.y0 + perfil.offsetY + (papel.altura - y)]);
      if (maq.some(([x, y]) => x < j.x0 || x > j.x1 || y < j.y0 || y > j.y1)) avisos.push(`camada ${id}: traço ${i + 1} fora da janela`);
      const [ini, ...resto] = maq;
      texto += `G0 X${ini[0].toFixed(3)} Y${ini[1].toFixed(3)} F${fViagem}\nG1 Z${zEscrita} F${fZ}\n`;
      for (const [x, y] of resto) texto += `G1 X${x.toFixed(3)} Y${y.toFixed(3)} F${fDesenho}\n`;
      texto += `G0 Z${zLevantada} F${fZ}\n`;
      for (let k = 1; k < maq.length; k++) comprimento += dist(maq[k - 1], maq[k]);
    });
    nTracos += validos.length;
  }
  if (perfil.troca && anterior !== null) texto += trocaAuto(perfil, vaga(anterior), null) + `G0 Z${zLevantada} F${fZ}
`; // devolve a última caneta
  return { texto: texto + perfil.footer, avisos, nTracos, comprimento, trocas };
}

export function svgDocumento(pagina, papel, canetas = {}, { camadas, trajeto = false } = {}) {
  const { largura, altura } = papel;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const grupos = [], todos = [];
  for (const c of pagina.camadas.filter((k) => !camadas || camadas.includes(k.id))) {
    const validos = c.tracos.filter(valido);
    if (!validos.length) continue;
    const cor = canetas[c.caneta]?.cor ?? '#000';
    const esp = canetas[c.caneta]?.espessura ?? 0.3;
    grupos.push(
      `<g data-camada="${esc(c.id)}" fill="none" stroke="${esc(cor)}" stroke-width="${num(esp)}" stroke-linecap="round" stroke-linejoin="round">`,
      ...validos.map((t) => `<path d="M ${t.map(([x, y]) => `${num(x)} ${num(y)}`).join(" L ")}"/>`),
      "</g>",
    );
    todos.push(...validos);
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}mm" height="${altura}mm" viewBox="0 0 ${largura} ${altura}">`,
    ...grupos,
    ...(trajeto ? viagemSvg(todos) : []),
    "</svg>",
  ].join("\n");
}
