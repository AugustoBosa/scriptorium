// Tabelas de D&D 5e (PHB 2014) em pt-BR: só o que mexe na letra do personagem. arq = pesos de arquétipo na ordem de ARQ.

export const ARQ = ['nobre', 'erudito', 'escriba', 'pratico', 'popular', 'teatral'];

export const CLASSES = [
  { id: 'barbaro', nome: 'Bárbaro', arq: [0, 0, 0, 2, 3, 0], conjurador: false },
  { id: 'bardo', nome: 'Bardo', arq: [1, 1, 0, 0, 0, 3], conjurador: true },
  { id: 'bruxo', nome: 'Bruxo', arq: [0, 2, 0, 0, 0, 2], conjurador: true },
  { id: 'clerigo', nome: 'Clérigo', arq: [0, 2, 2, 0, 0, 0], conjurador: true },
  { id: 'druida', nome: 'Druida', arq: [0, 2, 0, 0, 2, 0], conjurador: true },
  { id: 'feiticeiro', nome: 'Feiticeiro', arq: [2, 0, 0, 0, 0, 2], conjurador: true },
  { id: 'guerreiro', nome: 'Guerreiro', arq: [0, 0, 1, 3, 0, 0], conjurador: false },
  { id: 'ladino', nome: 'Ladino', arq: [0, 0, 0, 2, 2, 0], conjurador: false },
  { id: 'mago', nome: 'Mago', arq: [0, 3, 1, 0, 0, 0], conjurador: true },
  { id: 'monge', nome: 'Monge', arq: [0, 2, 2, 0, 0, 0], conjurador: false },
  { id: 'paladino', nome: 'Paladino', arq: [2, 0, 2, 0, 0, 0], conjurador: true },
  { id: 'patrulheiro', nome: 'Patrulheiro', arq: [0, 0, 0, 3, 1, 0], conjurador: true },
  { id: 'artifice', nome: 'Artífice (TCE)', arq: [0, 1, 2, 2, 0, 0], conjurador: true },
];

export const ANTECEDENTES = [
  { id: 'acolito', nome: 'Acólito', arq: [0, 2, 2, 0, 0, 0], idiomasLivres: 2 },
  { id: 'artesao', nome: 'Artesão de Guilda', arq: [0, 0, 2, 2, 0, 0], idiomasLivres: 1 },
  { id: 'artista', nome: 'Artista', arq: [0, 0, 0, 0, 0, 3], idiomasLivres: 0 },
  { id: 'charlatao', nome: 'Charlatão', arq: [0, 0, 1, 0, 0, 2], idiomasLivres: 0 },
  { id: 'criminoso', nome: 'Criminoso', arq: [0, 0, 0, 2, 2, 0], idiomasLivres: 0 },
  { id: 'eremita', nome: 'Eremita', arq: [0, 2, 0, 0, 1, 0], idiomasLivres: 1 },
  { id: 'forasteiro', nome: 'Forasteiro', arq: [0, 0, 0, 1, 3, 0], idiomasLivres: 1 },
  { id: 'heroi', nome: 'Herói do Povo', arq: [0, 0, 0, 0, 3, 0], idiomasLivres: 0 },
  { id: 'marinheiro', nome: 'Marinheiro', arq: [0, 0, 0, 2, 2, 0], idiomasLivres: 0 },
  { id: 'nobre', nome: 'Nobre', arq: [3, 0, 0, 0, 0, 0], idiomasLivres: 1 },
  { id: 'orfao', nome: 'Órfão', arq: [0, 0, 0, 0, 3, 0], idiomasLivres: 0 },
  { id: 'sabio', nome: 'Sábio', arq: [0, 3, 0, 0, 0, 0], idiomasLivres: 2 },
  { id: 'soldado', nome: 'Soldado', arq: [0, 0, 0, 3, 0, 0], idiomasLivres: 0 },
];

export const RACAS = [
  { id: 'anao', nome: 'Anão', idiomas: ['comum', 'anao'], idiomasLivres: 0, ligacao: ['gotica', 'forma', 'impressa'] },
  { id: 'elfo', nome: 'Elfo', idiomas: ['comum', 'elfico'], idiomasLivres: 0, ligacao: ['cursiva', 'semi'] },
  { id: 'halfling', nome: 'Halfling', idiomas: ['comum', 'halfling'], idiomasLivres: 0, ligacao: ['semi', 'forma'] },
  { id: 'humano', nome: 'Humano', idiomas: ['comum'], idiomasLivres: 1, ligacao: [] },
  { id: 'draconato', nome: 'Draconato', idiomas: ['comum', 'draconico'], idiomasLivres: 0, ligacao: ['forma', 'gotica'] },
  { id: 'gnomo', nome: 'Gnomo', idiomas: ['comum', 'gnomico'], idiomasLivres: 0, ligacao: ['forma', 'impressa'] },
  { id: 'meio-elfo', nome: 'Meio-Elfo', idiomas: ['comum', 'elfico'], idiomasLivres: 1, ligacao: ['cursiva', 'semi'] },
  { id: 'meio-orc', nome: 'Meio-Orc', idiomas: ['comum', 'orc'], idiomasLivres: 0, ligacao: ['semi', 'forma'] },
  { id: 'tiefling', nome: 'Tiefling', idiomas: ['comum', 'infernal'], idiomasLivres: 0, ligacao: ['gotica', 'cursiva'] },
];

// Druídico só para druida; Gíria de Ladrão só para ladino (o wizard marca sozinho).
export const IDIOMAS = [
  { id: 'comum', nome: 'Comum', tipo: 'padrão', escrita: 'comum' },
  { id: 'anao', nome: 'Anão', tipo: 'padrão', escrita: 'anao' },
  { id: 'elfico', nome: 'Élfico', tipo: 'padrão', escrita: 'elfico' },
  { id: 'gigante', nome: 'Gigante', tipo: 'padrão', escrita: 'anao' },
  { id: 'gnomico', nome: 'Gnômico', tipo: 'padrão', escrita: 'anao' },
  { id: 'goblin', nome: 'Goblin', tipo: 'padrão', escrita: 'anao' },
  { id: 'halfling', nome: 'Halfling', tipo: 'padrão', escrita: 'comum' },
  { id: 'orc', nome: 'Orc', tipo: 'padrão', escrita: 'anao' },
  { id: 'abissal', nome: 'Abissal', tipo: 'exótico', escrita: 'infernal' },
  { id: 'celestial', nome: 'Celestial', tipo: 'exótico', escrita: 'celestial' },
  { id: 'draconico', nome: 'Dracônico', tipo: 'exótico', escrita: 'draconico' },
  { id: 'dialeto', nome: 'Dialeto Subterrâneo', tipo: 'exótico', escrita: null },
  { id: 'infernal', nome: 'Infernal', tipo: 'exótico', escrita: 'infernal' },
  { id: 'primordial', nome: 'Primordial', tipo: 'exótico', escrita: 'anao' },
  { id: 'silvestre', nome: 'Silvestre', tipo: 'exótico', escrita: 'elfico' },
  { id: 'subcomum', nome: 'Subcomum', tipo: 'exótico', escrita: 'elfico' },
  { id: 'druidico', nome: 'Druídico', tipo: 'secreto', escrita: null },
  { id: 'giria', nome: 'Gíria de Ladrão', tipo: 'secreto', escrita: null },
];

export const ESCRITAS = [
  { id: 'comum', nome: 'Comum', ligacao: null, alvo: null }, // usa a letra principal
  { id: 'elfico', nome: 'Élfica', ligacao: ['cursiva', 'semi'], alvo: { ornamento: 4, velocidade: 4, legibilidade: 3 } },
  { id: 'anao', nome: 'Anã (runas)', ligacao: ['gotica', 'forma', 'impressa'], alvo: { ornamento: 1, velocidade: 1, capricho: 4 } },
  { id: 'infernal', nome: 'Infernal', ligacao: ['gotica'], alvo: { ornamento: 3, registro: 4 } },
  { id: 'celestial', nome: 'Celestial', ligacao: ['cursiva', 'semi'], alvo: { ornamento: 5, registro: 5, capricho: 5 } },
  { id: 'draconico', nome: 'Dracônica', ligacao: ['forma', 'gotica'], alvo: { velocidade: 1, ornamento: 2 } },
];

// Grade 3x3: linha = Bom/Neutro/Mau; ordem fixa.
export const ALINHAMENTOS = [
  { id: 'LB', nome: 'Leal e Bom' },
  { id: 'NB', nome: 'Neutro e Bom' },
  { id: 'CB', nome: 'Caótico e Bom' },
  { id: 'LN', nome: 'Leal e Neutro' },
  { id: 'N', nome: 'Neutro' },
  { id: 'CN', nome: 'Caótico e Neutro' },
  { id: 'LM', nome: 'Leal e Mau' },
  { id: 'NM', nome: 'Neutro e Mau' },
  { id: 'CM', nome: 'Caótico e Mau' },
];

export const IDADES = [
  { id: 'jovem', nome: 'Jovem' },
  { id: 'adulto', nome: 'Adulto' },
  { id: 'maduro', nome: 'Maduro' },
  { id: 'idoso', nome: 'Idoso' },
];
