import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFonte } from '../src/fonte.js';
import { papel, CANETAS, validarDocumento } from '../src/materiais/documento.js';
import { comporColeta, codificar, decodificar, caracteres, TIPOS, VARIANTES } from '../src/letra/folha.js';

const lingua = JSON.parse(readFileSync(new URL('../src/letra/linguas/pt-BR.json', import.meta.url), 'utf8'));
const ctx = { fontes: { HersheySans1: parseFonte(readFileSync(new URL('../fontes/HersheySans1.svg', import.meta.url), 'utf8'), 'HersheySans1') } };
const A4 = papel('A4'), A5 = papel('A5');
const dentro = (doc) => doc.paginas.every((p) => p.camadas.every((c) => c.tracos.flat().every(([x, y]) => x >= 0 && y >= 0 && x <= doc.papel.largura && y <= doc.papel.altura)));

test('código da folha: ida e volta, e papel fora da lista vira "outro"', () => {
  const c = { tipo: 'LC', parte: 3, x: 4.5, papelNome: 'A5' };
  assert.equal(codificar(c).length, 16);
  assert.deepEqual(decodificar(codificar(c)), c);
  assert.equal(decodificar(codificar({ ...c, papelNome: 'personalizado' })).papelNome, 'outro');
  assert.equal(decodificar(codificar({ ...c, papelNome: 'oficio' })).papelNome, 'outro'); // 3 bits: só 7 papéis
  assert.equal(decodificar(codificar({ ...c, papelNome: 'carta' })).papelNome, 'carta');
  assert.throws(() => codificar({ ...c, parte: 40 }), /parte fora da faixa/);
});

test('folhas de texto: todas as palavras aparecem, em ordem, dentro do papel e com documento válido', () => {
  for (const tipo of ['N', 'C', 'F']) {
    const doc = comporColeta(lingua, ctx, { papel: A4, papelNome: 'A4', tipo, x: 4, canetas: CANETAS });
    assert.deepEqual(validarDocumento(doc), []);
    assert.ok(dentro(doc));
    const linhas = doc.paginas.flatMap((p) => p.coleta.linhas);
    assert.deepEqual(linhas.map((l) => l.texto).join(' ').split(' '), lingua.palavras);
    assert.deepEqual(doc.paginas.map((p) => p.coleta.codigo), doc.paginas.map((_, i) => `${tipo}${i + 1}`));
    assert.deepEqual(decodificar(doc.paginas[0].coleta.bits), { tipo, parte: 1, x: 4, papelNome: 'A4' });
  }
});

test('folhas de letras: cada caractere uma vez por variante, caixas sem sobrepor', () => {
  const doc = comporColeta(lingua, ctx, { papel: A5, papelNome: 'A5', tipo: 'LF', x: 4, canetas: CANETAS });
  assert.deepEqual(validarDocumento(doc), []);
  assert.ok(dentro(doc));
  const cs = doc.paginas.flatMap((p) => p.coleta.celulas);
  assert.equal(cs.length, caracteres(lingua.letras).length * VARIANTES);
  for (const p of doc.paginas) assert.equal(new Set(p.coleta.celulas.map((c) => `${c.x},${c.y}`)).size, p.coleta.celulas.length);
});

test('papel pequeno demais dá erro claro; tipo desconhecido também', () => {
  assert.throws(() => comporColeta(lingua, ctx, { papel: papel('A8'), papelNome: 'A8', tipo: 'N', x: 15, canetas: CANETAS }), /pequeno demais/);
  assert.throws(() => comporColeta(lingua, ctx, { papel: papel('A8'), papelNome: 'A8', tipo: 'N', x: 8, canetas: CANETAS }), /máximo 31/);
  assert.throws(() => comporColeta(lingua, ctx, { papel: A4, papelNome: 'A4', tipo: 'Z', canetas: CANETAS }), /desconhecido/);
  assert.equal(TIPOS.length, 5);
});
