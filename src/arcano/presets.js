// Sistemas prontos. Só dados: cada um é um ponto de partida que o usuário edita na oficina Símbolos.
export const PRESETS = {
  classico: {
    nome: 'Clássico', classico: true,
    descricao: 'O sigilo de sempre: estrela de nível + 2 pontas, miolo por escola, anel duplo de concentração, dentes de ritual.',
  },
  colar: {
    nome: 'Colar de cordas',
    descricao: 'Pontos num círculo; cada atributo liga pontos com cordas de passo próprio, codificado em binário (método do Gorilla of Destiny).',
    base: { pontos: 'auto', raio: 0.72, inicio: 0, marcador: true },
    codigos: ['nivel', 'escola', 'dano', 'area', 'alcance', 'duracao'].map((campo) => ({ campo, modo: 'colar' })).concat([
      { campo: 'conc', modo: 'glifo', tamanho: 0.06 },
      { campo: 'ritual', modo: 'anel', raio: 0.12, tipo: 'linha' },
    ]),
    nomeMagia: { modo: 'nenhum', escala: 0.3 },
    linha: { forma: 'arco', curva: 0.35, zero: 'omitir' },
    molduras: [{ raio: 1, tipo: 'linha' }],
  },
  transmutacao: {
    nome: 'Transmutação',
    descricao: 'Círculo alquímico: nome da magia na faixa, estrela pelo nível, escola no centro, anéis de concentração e ritual.',
    codigos: [
      { campo: 'nivel', modo: 'lados', raio: 0.68, minimo: 2 },
      { campo: 'escola', modo: 'glifo', tamanho: 0.2 },
      { campo: 'conc', modo: 'anel', raio: 0.72, tipo: 'linha' },
      { campo: 'ritual', modo: 'anel', raio: 0.3, tipo: 'dentes' },
      { campo: 'comp', modo: 'marca', raio: 0.68, inicio: 0 },
      { campo: 'dano', modo: 'marca', raio: 0.45, inicio: 0.5 },
    ],
    nomeMagia: { modo: 'anel', escala: 0.16 },
    linha: { forma: 'reta', curva: 0, zero: 'omitir' },
    molduras: [{ raio: 1, tipo: 'linha' }, { raio: 0.8, tipo: 'linha' }],
  },
  kamea: {
    nome: 'Quadrado mágico',
    descricao: 'O nome da magia traçado num quadrado de Júpiter; nível em marcas na borda, escola acima.',
    codigos: [
      { campo: 'nivel', modo: 'marca', raio: 0.92, inicio: 0.5 },
      { campo: 'escola', modo: 'glifo', tamanho: 0.12, lugar: { r: 0.72, a: 0 } },
      { campo: 'salva', modo: 'marca', raio: 0.62, inicio: 0.5 },
    ],
    nomeMagia: { modo: 'kamea', escala: 0.5, ordem: 4 },
    linha: { forma: 'reta', curva: 0, zero: 'omitir' },
    molduras: [{ raio: 1, tipo: 'linha' }],
  },
  selo: {
    nome: 'Selo',
    descricao: 'Selo de cera: faixa com o nome, escola grande ao centro e pontas pelo nível.',
    codigos: [
      { campo: 'escola', modo: 'glifo', tamanho: 0.3 },
      { campo: 'nivel', modo: 'marca', raio: 0.62, inicio: 0 },
      { campo: 'conc', modo: 'anel', raio: 0.5, tipo: 'pontos' },
    ],
    nomeMagia: { modo: 'anel', escala: 0.2 },
    linha: { forma: 'reta', curva: 0, zero: 'omitir' },
    molduras: [{ raio: 1, tipo: 'dupla', largura: 0.04 }, { raio: 0.76, tipo: 'linha' }],
  },
  spare: {
    nome: 'Monograma',
    descricao: 'Letras do nome sem vogais nem repetidas, fundidas num monograma (método de Austin Spare), com a escola em lados.',
    codigos: [
      { campo: 'escola', modo: 'lados', raio: 0.9, minimo: 3, estrela: false },
      { campo: 'nivel', modo: 'marca', raio: 0.9, inicio: 0 },
    ],
    nomeMagia: { modo: 'spare', escala: 0.55 },
    linha: { forma: 'reta', curva: 0, zero: 'omitir' },
    molduras: [],
  },
};

// Cópia editável de um preset (o objeto de PRESETS nunca é alterado).
export const dePreset = (id) => ({ ...structuredClone(PRESETS[id] ?? PRESETS.classico), preset: id });
