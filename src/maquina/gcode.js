export const PERFIL_PADRAO = {
  zEscrita: 3, zLevantada: 6, fDesenho: 2400, fViagem: 6000, fZ: 500,
  offsetX: 0, offsetY: 0, mesaX: 210, mesaY: 210,
  header: "G21\nG91\nG0 Z10 F500\nG90\nM412 S0\nG28 X Y\nG28 Z\nG0 Z6 F500\n",
  footer: "G0 Z15 F500\nG0 X0 Y200 F6000\nM84\n",
};

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
