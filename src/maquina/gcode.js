import { PERFIS, cabeNaMaquina } from './perfis.js';

export const PERFIL_PADRAO = PERFIS.megaS;

// ponytail: duplicado de propósito; unificar em geo.js no M18
const valido = (t) => Array.isArray(t) && t.length >= 2;
// ponytail: duplicado de propósito; unificar em geo.js no M18
const dist = ([x1, y1], [x2, y2]) => Math.hypot(x2 - x1, y2 - y1);
const num = (v) => String(+v.toFixed(3));

// trajeto: desenha por cima a viagem no ar (tracejado), início (verde) e fim (vermelho) de cada traço, numerados.
export function svg(tracos, pagina, { trajeto = false } = {}) {
  const { largura, altura } = pagina;
  const validos = tracos.filter(valido);
  const paths = validos.map((t) =>
    `<path d="M ${t.map(([x, y]) => `${num(x)} ${num(y)}`).join(" L ")}" fill="none" stroke="black" stroke-width="0.3" stroke-linecap="round" stroke-linejoin="round"/>`);
  const extra = [];
  if (trajeto) {
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
  }
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
  let texto = p.header;
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

export function gcodeDocumento(pagina, papel, perfil = PERFIS.megaS, { camadas, canetas = {} } = {}) {
  const zMin = perfil.zMin ?? 0;
  for (const [campo, z] of [['zEscrita', perfil.zEscrita], ['zLevantada', perfil.zLevantada], ['estaciona.z', perfil.estaciona.z]]) {
    if (z < zMin) throw new Error(`Z de escrita ${z} abaixo do piso ${zMin} (zMin) do perfil ${perfil.nome} (${campo})`);
  }
  const c = cabeNaMaquina(papel, perfil);
  if (!c.ok) throw new Error(c.motivo);
  const j = perfil.janela ?? { x0: 0, y0: 0, x1: perfil.mesaX, y1: perfil.mesaY };
  const { estaciona: e, fZ, fViagem, fDesenho, zEscrita, zLevantada } = perfil;
  const avisos = [];
  let texto = perfil.header, nTracos = 0, comprimento = 0, trocas = 0, anterior = null;
  for (const camada of pagina.camadas.filter((k) => !camadas || camadas.includes(k.id))) {
    const validos = camada.tracos.filter(valido);
    if (!validos.length) continue;
    const nome = (canetas[camada.caneta]?.nome ?? camada.caneta).replace(/[\r\n]/g, ' ');
    if (anterior !== null && camada.caneta !== anterior) {
      texto += `G0 Z${e.z} F${fZ}\nG0 X${e.x.toFixed(3)} Y${e.y.toFixed(3)} F${fViagem}\n`;
      texto += perfil.trocaCaneta.replace('{nome}', () => nome) + '\n';
      trocas++;
    }
    anterior = camada.caneta;
    texto += `; camada ${camada.id} caneta ${nome}\n`;
    validos.forEach((t, i) => {
      const maq = t.map(([x, y]) => [j.x0 + perfil.offsetX + x, j.y0 + perfil.offsetY + (papel.altura - y)]);
      if (maq.some(([x, y]) => x < j.x0 || x > j.x1 || y < j.y0 || y > j.y1)) avisos.push(`camada ${camada.id}: traço ${i + 1} fora da janela`);
      const [ini, ...resto] = maq;
      texto += `G0 X${ini[0].toFixed(3)} Y${ini[1].toFixed(3)} F${fViagem}\nG1 Z${zEscrita} F${fZ}\n`;
      for (const [x, y] of resto) texto += `G1 X${x.toFixed(3)} Y${y.toFixed(3)} F${fDesenho}\n`;
      texto += `G0 Z${zLevantada} F${fZ}\n`;
      for (let k = 1; k < maq.length; k++) comprimento += dist(maq[k - 1], maq[k]);
    });
    nTracos += validos.length;
  }
  return { texto: texto + perfil.footer, avisos, nTracos, comprimento, trocas };
}
