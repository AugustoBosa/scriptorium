// Imposição: várias páginas numa folha; a folha é empurrada em passadas pela janela da máquina. Puro, sem DOM.
import { janelaDe } from './perfis.js';

const EPS = 1e-6;
const ROTS = [0, 180, 90, 270]; // ordem de preferência nos empates
const CANTOS = ['x0y0', 'x1y0', 'x0y1', 'x1y1'];
const cabe = (w, h, W, H) => w <= W + EPS && h <= H + EPS;
const r1 = (n) => Math.round(n * 10) / 10;

// gira o ponto [u,v] (y para baixo) dentro de uma caixa w×h; sentido horário
export function girar([u, v], rot, w, h) {
  return rot === 90 ? [h - v, u] : rot === 180 ? [w - u, h - v] : rot === 270 ? [v, w - u] : [u, v];
}

// ponto da folha -> mesa, para a passada p
const daFolha = (folha, p, pt) => {
  const [s, t] = girar(pt, p.rot, folha.largura, folha.altura);
  return [p.caixa.x + s, p.caixa.y + p.caixa.h - t];
};

export function impor({ perfil, folha, pagina, referencia = {}, espaco = 0 }) {
  const j = janelaDe(perfil), jw = j.x1 - j.x0, jh = j.y1 - j.y0;
  const { largura: W, altura: H } = folha, { largura: pw, altura: ph } = pagina, g = espaco;
  const { dx = 0, dy = 0, encosto = 'auto' } = referencia;
  if (!cabe(pw, ph, jw, jh) && !cabe(ph, pw, jw, jh)) throw new Error(`página ${pw}×${ph} mm maior que a janela útil ${jw}×${jh} mm do perfil ${perfil.nome}`);
  if (!cabe(pw, ph, W, H) && !cabe(ph, pw, W, H)) throw new Error(`página ${pw}×${ph} mm maior que a folha ${W}×${H} mm`);

  let canto = referencia.canto ?? 'auto';
  if (canto === 'auto') { // canto da mesa mais próximo do canto correspondente da janela (empate: o primeiro)
    const dist = (c) => Math.hypot(c[1] === '1' ? perfil.mesaX - j.x1 : j.x0, c[3] === '1' ? perfil.mesaY - j.y1 : j.y0);
    canto = CANTOS.reduce((a, c) => (dist(c) < dist(a) - EPS ? c : a));
  }
  const posicao = (rot) => {
    const [w, h] = rot % 180 ? [H, W] : [W, H];
    return { rot, caixa: { x: canto[1] === '1' ? j.x1 - dx - w : j.x0 + dx, y: canto[3] === '1' ? j.y1 - dy - h : j.y0 + dy, w, h } };
  };
  // encosto 'curta'|'longa': só as rotações em que essa borda da folha cai na "frente" (mesma regra de `instrucao`)
  const rots = ROTS.filter((rot) => { const { w, h } = posicao(rot).caixa; return encosto === 'auto' || (w < h ? 'curta' : 'longa') === encosto; });
  const cobre = (p, c) => [[c.x, c.y], [c.x + c.w, c.y], [c.x, c.y + c.h], [c.x + c.w, c.y + c.h]]
    .every((q) => { const [X, Y] = daFolha(folha, p, q); return X >= j.x0 - EPS && X <= j.x1 + EPS && Y >= j.y0 - EPS && Y <= j.y1 + EPS; });

  const plano = (giro) => {
    const [w, h] = giro ? [ph, pw] : [pw, ph];
    const nx = Math.floor((W + g + EPS) / (w + g)), ny = Math.floor((H + g + EPS) / (h + g));
    if (!nx || !ny) return null;
    const ox = (W - (nx * w + (nx - 1) * g)) / 2, oy = (H - (ny * h + (ny - 1) * g)) / 2; // centrada: simétrica a 180°
    const cel = [];
    for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) cel.push({ x: ox + c * (w + g), y: oy + r * (h + g), w, h, giro });
    // ponytail: gulosa (cobertura de conjuntos), não ótima; trocar por busca exaustiva se sobrar passada em folha estranha
    const falta = new Set(cel.keys()), passadas = [];
    for (;;) {
      let melhor = null;
      for (const rot of rots) {
        const p = posicao(rot), ids = [...falta].filter((i) => cobre(p, cel[i]));
        if (ids.length > (melhor?.ids.length ?? 0)) melhor = { ...p, ids };
      }
      if (!melhor) break;
      melhor.ids.forEach((i) => falta.delete(i));
      passadas.push(melhor);
    }
    return { cel, falta, passadas, cobertos: cel.length - falta.size };
  };
  // ponytail: grade uniforme com a página toda em 0 ou toda em 90; sem mistura de orientações na mesma folha
  const melhor = [0, 90].map(plano).filter(Boolean)
    .reduce((a, b) => (!a || b.cobertos > a.cobertos || (b.cobertos === a.cobertos && b.passadas.length < a.passadas.length) ? b : a), null);
  if (!melhor?.cobertos && encosto !== 'auto') throw new Error(`com a borda ${encosto} encostada, nenhuma página cabe na janela; use 'auto' ou '${encosto === 'longa' ? 'curta' : 'longa'}'`);
  if (!melhor?.cobertos) throw new Error(`nenhum slot da página ${pw}×${ph} mm é alcançável na janela ${jw}×${jh} mm com a folha ${W}×${H} mm`);

  const vivos = [...melhor.cel.keys()].filter((i) => !melhor.falta.has(i));
  const novo = new Map(vivos.map((i, n) => [i, n]));
  const slots = vivos.map((i) => melhor.cel[i]);
  return {
    slots, folha, janela: j, canto, mesaX: perfil.mesaX, mesaY: perfil.mesaY,
    passadas: melhor.passadas.map(({ rot, caixa, ids }) => ({ rot, caixa, slots: ids.map((i) => novo.get(i)) })),
    porFolha: slots.length,
    perdidos: [...melhor.falta].map((i) => melhor.cel[i]),
  };
}

// (u,v) da página -> [X,Y] da mesa: página -> slot (girar + deslocar) -> folha -> rotação da passada
export function paraMesa(imp, k, slot, papelPagina) {
  return ([u, v]) => {
    const [a, b] = girar([u, v], slot.giro, papelPagina.largura, papelPagina.altura);
    return daFolha(imp.folha, imp.passadas[k], [slot.x + a, slot.y + b]);
  };
}

// páginas otimizadas (paginas[i] = página do slot i; faltando = pula) -> uma página sintética em coordenadas da janela.
// Junta camadas de mesmo id (1 troca de caneta por passada); descarta `grupos`, já usados na otimização.
export function aPassada(paginas, imp, k, perfil, papelPagina) {
  const j = janelaDe(perfil), jh = j.y1 - j.y0, porId = new Map();
  for (const i of imp.passadas[k].slots) {
    if (!paginas[i]) continue;
    const f = paraMesa(imp, k, imp.slots[i], papelPagina);
    for (const c of paginas[i].camadas) {
      const { grupos, ...meta } = c;
      if (!porId.has(c.id)) porId.set(c.id, { ...meta, tracos: [] });
      porId.get(c.id).tracos.push(...c.tracos.map((t) => t.map((p) => { const [X, Y] = f(p); return [X - j.x0, jh - (Y - j.y0)]; })));
    }
  }
  return { pagina: { camadas: [...porId.values()] }, papel: { largura: j.x1 - j.x0, altura: jh } };
}

// origem = canto físico que é X0Y0 ('frente-esquerda' | 'frente-direita' | 'tras-esquerda' | 'tras-direita'); só muda as palavras.
// folha/nFolhas/pagina (opcionais): "Folha F, passada K de N" quando há várias folhas; ", página P" no modo um-por-página.
const PARA = { frente: 'para a frente', tras: 'para trás', esquerda: 'para a esquerda', direita: 'para a direita' };
export function instrucao(imp, k, { nomeFolha, origem = 'frente-esquerda', folha, nFolhas = 1, pagina } = {}) {
  const p = imp.passadas[k], c = p.caixa;
  const [fb, lr] = origem.split('-');
  const inv = { frente: 'tras', tras: 'frente', esquerda: 'direita', direita: 'esquerda' };
  const yAlto = inv[fb], xAlto = inv[lr]; // lado físico de Y/X crescentes
  const fb2 = imp.canto[3] === '1' ? yAlto : fb, lr2 = imp.canto[1] === '1' ? xAlto : lr;
  // sobra da folha além da MESA física, por eixo (a caixa é a folha inteira)
  const sobras = [[c.y + c.h - imp.mesaY, yAlto], [-c.y, fb], [c.x + c.w - imp.mesaX, xAlto], [-c.x, lr]]
    .map(([v, lado]) => [r1(v), lado]).filter(([v]) => v > 0);
  const sobra = sobras.length ? ` (sobra ${sobras.map(([v, lado]) => `${v} mm ${PARA[lado]}`).join(' e ')})` : '';
  const topo = { 0: yAlto, 180: fb, 90: xAlto, 270: lr }[p.rot]; // onde cai o topo da folha (t=0) na mesa
  const gira = `${k ? 'reposicione' : 'ponha'} a folha com o topo ${PARA[topo]}${p.rot ? ' (gire a partir da posição normal)' : ' (posição normal)'}`;
  const ref = imp.canto === 'x0y0' ? ' (X0 Y0 da caneta — confira com G0 X0 Y0)' : '';
  const trasSobra = sobras.some(([, lado]) => lado === 'tras') ? ' Confira se a folha não bate na estrutura quando a mesa vai para a frente.' : '';
  const cab = `${nFolhas > 1 ? `Folha ${folha}, p` : 'P'}assada ${k + 1} de ${imp.passadas.length}${pagina ? `, página ${pagina}` : ''}${nomeFolha ? ` (${nomeFolha})` : ''}`;
  return `${cab}: ${gira} e encoste ${k ? 'de novo ' : ''}a borda ${c.w < c.h ? 'curta' : 'longa'} ${fb2 === 'tras' ? 'atrás' : 'na frente'}, no canto ${fb2 === 'tras' ? 'trás' : 'frente'}-${lr2}${ref}; prenda a folha${sobra}.${trasSobra}`;
}
