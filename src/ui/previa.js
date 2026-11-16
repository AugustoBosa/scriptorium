import { svgDocumento } from '../maquina/gcode.js';
import { otimizar } from '../maquina/otimizar.js';

export function desenhar(el, doc, { pagina = 0, trajeto = false, otimizar: opt = true } = {}) {
  let pg = doc.paginas[pagina] ?? { camadas: [] };
  if (trajeto && opt) pg = { ...pg, camadas: pg.camadas.map((c) => ({ ...c, tracos: otimizar(c.tracos, 0.1, { ordem: c.ordem }) })) };
  el.innerHTML = svgDocumento(pg, doc.papel, doc.canetas, { trajeto });
  el.style.maxWidth = `${doc.papel.largura * 4}px`; // 4 px por mm: A8 não vira cartaz
}

export function listar(ul, itens) {
  ul.replaceChildren(...itens.map((t) => { const li = document.createElement('li'); li.textContent = t; return li; }));
}
