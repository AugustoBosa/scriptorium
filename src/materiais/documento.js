// Documento: papel, canetas, camadas e traços. Ponto de entrada único para o modelo de dados (M14).
/** @typedef {[number, number][]} Traco  mm, origem no canto sup-esq do papel, y para baixo */
/** @typedef {{id:string, caneta:string, personagem:string|null, ordem:'escrita'|'otimizada', tracos:Traco[]}} Camada */
/** @typedef {{camadas:Camada[]}} Pagina */
/** @typedef {{largura:number, altura:number, margens:{topo:number,dir:number,base:number,esq:number}}} Papel */
/** @typedef {{nome:string, cor:string, espessura:number}} Caneta */
/** @typedef {{papel:Papel, canetas:Object<string,Caneta>, paginas:Pagina[], avisos:string[]}} Documento */

// [largura, altura, margem padrão] em mm, retrato.
export const PAPEIS = {
  A3: [297, 420, 25], A4: [210, 297, 20], A5: [148, 210, 12], A6: [105, 148, 9],
  A7: [74, 105, 6], A8: [52, 74, 4], carta: [215.9, 279.4, 20], oficio: [215.9, 355.6, 20],
};

const finito = (n) => Number.isFinite(n) && n > 0;

export function papel(nome, { paisagem = false, margem, largura, altura } = {}) {
  let l, a, m0;
  if (nome === 'personalizado') {
    if (!finito(largura) || !finito(altura)) throw new Error('papel personalizado exige largura e altura finitas > 0');
    [l, a] = [largura, altura];
    m0 = Math.round(Math.min(l, a) * 0.08);
  } else if (Object.hasOwn(PAPEIS, nome)) {
    [l, a, m0] = PAPEIS[nome];
  } else {
    throw new Error(`papel desconhecido: ${nome}`);
  }
  const m = margem ?? m0;
  return { largura: paisagem ? a : l, altura: paisagem ? l : a, margens: { topo: m, dir: m, base: m, esq: m } };
}

// Ponte até os materiais migrarem (M20): embrulha Traco[][] em uma camada por página.
export function deTracos(paginas, papelDoc, { id = 'texto', caneta = 'preta', personagem = null, ordem = 'otimizada', avisos = [] } = {}) {
  return {
    papel: papelDoc,
    canetas: { [caneta]: { nome: caneta, cor: '#1a1a1a', espessura: 0.4 } },
    paginas: paginas.map((tracos) => ({ camadas: [{ id, caneta, personagem, ordem, tracos }] })),
    avisos,
  };
}

// Devolve os problemas do documento; lista vazia = válido.
export function validarDocumento(doc) {
  const erros = [];
  if (!finito(doc.papel?.largura) || !finito(doc.papel?.altura)) erros.push('papel sem dimensões finitas > 0');
  for (const [i, pag] of doc.paginas.entries()) {
    for (const c of pag.camadas) {
      const onde = `página ${i + 1}, camada ${c.id}`;
      if (!doc.canetas?.[c.caneta]) erros.push(`${onde}: caneta inexistente "${c.caneta}"`);
      if (c.ordem !== 'escrita' && c.ordem !== 'otimizada') erros.push(`${onde}: ordem inválida "${c.ordem}"`);
      for (const [j, t] of c.tracos.entries()) {
        if (t.length < 2) erros.push(`${onde}: traço ${j + 1} com menos de 2 pontos`);
        if (!t.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))) erros.push(`${onde}: traço ${j + 1} com coordenada não finita`);
      }
    }
  }
  return erros;
}
