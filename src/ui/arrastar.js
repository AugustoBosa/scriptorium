// Alças para arrastar as notas soltas na prévia. O SVG da página está em mm (viewBox), então a conta é direta.
const NS = 'http://www.w3.org/2000/svg';

// notas = [{ ordem, caixa: { x, y, l, a }, ang }] da página; aoSoltar(ordem, { x, y, ang }) grava a posição nova (canto superior esquerdo, mm) mantendo o ângulo.
export function ligarArrasto(el, notas, aoSoltar) {
  const svg = el.querySelector('svg');
  if (!svg || !notas?.length) return;
  const emMm = (ev) => new DOMPoint(ev.clientX, ev.clientY).matrixTransform(svg.getScreenCTM().inverse());
  for (const { ordem, caixa: c, ang } of notas) {
    const r = document.createElementNS(NS, 'rect');
    Object.entries({ x: c.x - 0.5, y: c.y - 0.5, width: c.l + 1, height: c.a + 1, class: 'alca-nota' }).forEach(([k, v]) => r.setAttribute(k, v));
    const titulo = document.createElementNS(NS, 'title');
    titulo.textContent = 'Arraste para mudar a posição da nota';
    r.append(titulo);
    let ini = null;
    r.addEventListener('pointerdown', (ev) => { ini = emMm(ev); r.setPointerCapture(ev.pointerId); r.classList.add('arrastando'); ev.preventDefault(); });
    r.addEventListener('pointermove', (ev) => {
      if (!ini) return;
      const p = emMm(ev);
      r.setAttribute('transform', `translate(${p.x - ini.x} ${p.y - ini.y})`);
    });
    r.addEventListener('pointercancel', () => { ini = null; r.classList.remove('arrastando'); r.removeAttribute('transform'); });
    r.addEventListener('pointerup', (ev) => {
      if (!ini) return;
      const p = emMm(ev), dx = p.x - ini.x, dy = p.y - ini.y;
      ini = null;
      r.classList.remove('arrastando');
      if (Math.hypot(dx, dy) < 0.5) { r.removeAttribute('transform'); return; } // clique sem arrastar
      aoSoltar(ordem, { x: Math.max(0, c.x + dx), y: Math.max(0, c.y + dy), ...(ang != null && { ang }) });
    });
    svg.append(r);
  }
}
