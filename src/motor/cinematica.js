// Cinemática: filtro por comprimento de arco com janela proporcional à velocidade (lei 2/3).
// Unidades em em. Pura, sem dependências.
const DS = 0.01, H = 0.10, K0 = 4, JK = 0.04, GANHO = 1.2;

function reamostrar(t) {
  const p = [t[0]];
  let resto = DS;
  for (let i = 1; i < t.length; i++) {
    let a = t[i - 1], L = Math.hypot(t[i][0] - a[0], t[i][1] - a[1]);
    while (L > 0 && L >= resto) {
      const u = resto / L;
      a = [a[0] + (t[i][0] - a[0]) * u, a[1] + (t[i][1] - a[1]) * u];
      p.push(a); L -= resto; resto = DS;
    }
    resto -= L;
  }
  const u = t[t.length - 1], l = p[p.length - 1];
  if (Math.hypot(u[0] - l[0], u[1] - l[1]) > 1e-9) p.push(u);
  return p;
}

export function suavizar(t, fl, ul) {
  if (t.length < 3) return t; // 2 pontos = reta
  const p = reamostrar(t), n = p.length;
  if (n < 5) return t;
  const ang = [];
  for (let i = 1; i < n; i++) ang.push(Math.atan2(p[i][1] - p[i - 1][1], p[i][0] - p[i - 1][0]));
  const kap = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const d = ang[i] - ang[i - 1];
    kap[i] = Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) / DS;
  }
  const w = Math.round(JK / DS);
  const v = kap.map((_, i) => {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - w); j <= Math.min(n - 1, i + w); j++) { s += kap[j]; c++; }
    return Math.cbrt(K0 / (s / c + K0));
  });
  const media = (i, h) => {
    const m = Math.min(Math.round(h / DS), i, n - 1 - i);
    if (m < 1) return p[i];
    let x = 0, y = 0, c = 0;
    for (let j = i - m; j <= i + m; j++) {
      const g = 1 - Math.abs(j - i) / (m + 1);
      x += p[j][0] * g; y += p[j][1] * g; c += g;
    }
    return [x / c, y / c];
  };
  const out = [p[0]];
  let cont = 0;
  for (let i = 1; i < n - 1; i++) {
    let a = media(i, fl * H * v[i]);
    if (ul > 0) {
      const hu = H * (0.4 + 0.6 * fl) * v[i], b = media(i, hu), c = media(i, 2 * hu);
      a = [a[0] + ul * GANHO * (b[0] - c[0]), a[1] + ul * GANHO * (b[1] - c[1])];
    }
    if (++cont >= 1 + 6 * Math.max(0, v[i] - 0.5)) { out.push(a); cont = 0; }
  }
  out.push(p[n - 1]);
  return out;
}
