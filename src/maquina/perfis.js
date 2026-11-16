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

export const PERFIS = { megaS, p2s, personalizado: { ...megaS, nome: 'personalizado' } };

const janelaDe = (perfil) => perfil.janela ?? { x0: 0, y0: 0, x1: perfil.mesaX, y1: perfil.mesaY };

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
