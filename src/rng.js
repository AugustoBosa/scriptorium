// Gerador pseudoaleatório determinístico (mulberry32) e hash FNV-1a 32 bits.

export function hash(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) {
    x ^= str.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

export function rng(seed) {
  let a = typeof seed === 'string' ? hash(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ruído de valor suavizado em [-1, 1). Determinístico; seed é string.
export function ruido1d(seed, t) {
  const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f);
  const v = (k) => rng(seed + '|' + k)() * 2 - 1;
  return v(i) * (1 - u) + v(i + 1) * u;
}
