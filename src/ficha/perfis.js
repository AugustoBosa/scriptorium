// Perfis de escrita: cada um é um jeito de escrever (letra + execução) que o personagem pode usar. Puro: sem DOM.
import { IDIOMAS, ESCRITAS } from './dnd.js';
import { aplicarDeltas, maoDaFicha } from './sugerir.js';
import { ESCRITA_PADRAO } from '../personagem.js';

const tem = (...ids) => (f) => ids.includes(f.classe) || ids.includes(f.antecedente);
const todos = () => true;

// exec: deltas em fração da faixa de cada chave (formato de aplicarDeltas). folha: tamanho (mm) e entrelinha do perfil.
export const PERFIS_ESCRITA = [
  { id: 'diario', nome: 'Diário', descricao: 'Anotações do dia, escritas com algum cansaço.', letra: 'principal', exec: { pressa: 0.1, capricho: -0.05, fadiga: 0.1 }, folha: { tamanho: 5, entrelinha: 1.4 }, quando: todos },
  { id: 'nota', nome: 'Nota rápida', descricao: 'Recados e lembretes, rabiscados depressa.', letra: 'corrida', exec: { pressa: 0.3, capricho: -0.2, desleixo: 0.2 }, folha: { tamanho: 5, entrelinha: 1.4 }, quando: todos },
  { id: 'carta-informal', nome: 'Carta informal', descricao: 'Cartas para amigos, sem muita cerimônia.', letra: 'principal', exec: {}, quando: todos },
  { id: 'carta-formal', nome: 'Carta formal', descricao: 'Cartas de cerimônia, com capricho e calma.', letra: 'caprichada', exec: { capricho: 0.25, pressa: -0.15 }, folha: { tamanho: 6.5, entrelinha: 1.7 }, quando: todos },
  { id: 'lista', nome: 'Lista e inventário', descricao: 'Listas de itens, anotadas de forma corrida.', letra: 'corrida', exec: { pressa: 0.1 }, folha: { tamanho: 5, entrelinha: 1.4 }, quando: todos },
  { id: 'grimorio', nome: 'Grimório', descricao: 'Magias e fórmulas, com traço cuidadoso e firme.', letra: 'caprichada', exec: { capricho: 0.3, pressa: -0.2, tremor: -0.05 }, folha: { tamanho: 5, entrelinha: 1.5 }, quando: tem('mago', 'artifice') },
  { id: 'oracoes', nome: 'Livro de orações', descricao: 'Orações e hinos, copiados com devoção.', letra: 'caprichada', exec: { capricho: 0.2 }, quando: tem('clerigo', 'paladino', 'acolito') },
  { id: 'versos', nome: 'Canções e versos', descricao: 'Canções e poemas, com ritmo e variação na pena.', letra: 'principal', exec: { capricho: 0.1, variacao: 0.1 }, quando: tem('bardo', 'artista') },
  { id: 'campo', nome: 'Diário de campo e mapas', descricao: 'Observações de viagem, anotadas em movimento.', letra: 'corrida', exec: { pressa: 0.15, tremor: 0.05 }, quando: tem('patrulheiro', 'druida', 'forasteiro') },
  { id: 'ordens', nome: 'Relatório e ordens', descricao: 'Comunicados e ordens, claros e bem alinhados.', letra: 'principal', exec: { pressa: 0.1, capricho: 0.1 }, quando: tem('guerreiro', 'paladino', 'soldado') },
  { id: 'contratos', nome: 'Registros e contratos', descricao: 'Termos e registros oficiais, com capricho.', letra: 'caprichada', exec: { capricho: 0.2 }, quando: tem('artesao', 'nobre') },
  { id: 'cifrado', nome: 'Bilhete cifrado', descricao: 'Bilhetes apressados, com desleixo de propósito.', letra: 'corrida', exec: { pressa: 0.25, desleixo: 0.1 }, quando: tem('ladino', 'criminoso', 'charlatao') },
  { id: 'pesquisa', nome: 'Notas de pesquisa', descricao: 'Anotações de estudo, rápidas e densas.', letra: 'corrida', exec: { pressa: 0.15 }, folha: { tamanho: 4.5, entrelinha: 1.4 }, quando: tem('mago', 'sabio', 'eremita', 'artifice') },
  { id: 'pacto', nome: 'Pactos e juramentos', descricao: 'Juramentos e pactos, escritos com solenidade.', letra: 'caprichada', exec: { capricho: 0.15 }, quando: tem('bruxo') },
  { id: 'decreto', nome: 'Decreto com selo', descricao: 'Decretos com selo, firmes e bem feitos.', letra: 'caprichada', exec: { capricho: 0.3, pressa: -0.2 }, quando: tem('nobre') },
  { id: 'imitacao', nome: 'Imitação de letra', descricao: 'Cópia de letra alheia, com variação controlada.', letra: 'caprichada', exec: { capricho: 0.3, variacao: -0.1 }, quando: (f) => !!f.ferramentas?.falsificacao },
];

// Um perfil por escrita conhecida dos idiomas da ficha (sem repetir; 'comum' fica de fora).
export function perfisDeEscrita(ficha) {
  const ids = new Set();
  for (const idioma of ficha.idiomas ?? []) {
    const escrita = IDIOMAS.find((i) => i.id === idioma)?.escrita;
    if (escrita && escrita !== 'comum') ids.add(escrita);
  }
  return [...ids].map((id) => {
    const e = ESCRITAS.find((x) => x.id === id);
    return {
      id: 'escrita-' + e.id,
      nome: 'Escrita ' + e.nome,
      descricao: 'Textos em ' + e.nome.toLowerCase() + ', com letra própria.',
      letra: 'escrita:' + e.id,
      exec: {},
    };
  });
}

// letras = saída de letrasDerivadas(ficha, base). Sugeridos: os de quando(ficha) e todas as escritas.
export function montarPerfis(ficha, letras) {
  const mao = maoDaFicha(ficha, letras.principal);
  const todosPerfis = [
    ...PERFIS_ESCRITA.map((p) => ({ ...p, ligado: !!p.quando(ficha) })),
    ...perfisDeEscrita(ficha).map((p) => ({ ...p, ligado: true })),
  ];
  const resolvidos = todosPerfis.map(({ id, nome, descricao, letra, exec, folha, ligado }) => ({
    id,
    nome,
    descricao,
    letra,
    base: letra.startsWith('escrita:') ? letras.escrita[letra.split(':')[1]] : letras[letra],
    exec: { ...aplicarDeltas(mao, exec), ...folha },
    ligado,
  }));
  return {
    sugeridos: resolvidos.filter((p) => p.ligado),
    outros: resolvidos.filter((p) => !p.ligado),
  };
}

// Variações para salvar no personagem: só o que difere da mão. Perfil não ligado fica de fora.
export function variacoesDe(mao, perfis) {
  const variacoes = { normal: {} };
  for (const p of perfis) {
    if (!p.ligado) continue;
    const extra = {};
    for (const chave of Object.keys(p.exec)) {
      if (p.exec[chave] !== (mao[chave] ?? ESCRITA_PADRAO[chave])) extra[chave] = p.exec[chave];
    }
    if (JSON.stringify(p.base) !== JSON.stringify(mao.base)) extra.base = p.base;
    variacoes[p.nome] = extra;
  }
  return variacoes;
}
