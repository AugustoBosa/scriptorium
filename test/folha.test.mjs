import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { celulas, svgFolha, caracteres, GRADE } from '../src/letra/folha.js';

const CARACTERES = caracteres(JSON.parse(readFileSync(new URL('../src/letra/linguas/pt-BR.json', import.meta.url), 'utf8')).letras);

test('cada caractere tem uma célula única, dentro das margens e sem sobrepor outra', () => {
  const cs = celulas(CARACTERES);
  assert.equal(new Set(CARACTERES).size, CARACTERES.length);
  assert.equal(cs.length, CARACTERES.length);
  const { colunas, linhas, margem } = GRADE;
  for (const c of cs) {
    assert.ok(c.x >= margem.esq && c.x + c.largura <= colunas - margem.dir, `x de ${c.ch}`);
    assert.ok(c.y >= margem.topo && c.y + c.altura <= linhas - margem.base, `y de ${c.ch}`);
    assert.ok(c.y < c.xAltura && c.xAltura < c.base && c.base < c.y + c.altura, `linhas de ${c.ch}`);
  }
  assert.equal(new Set(cs.map((c) => `${c.x},${c.y}`)).size, cs.length);
});

test('caracteres demais para uma página dão erro claro', () => {
  assert.throws(() => celulas(Array.from({ length: 500 }, (_, i) => String(i))), /cabem \d+ caracteres/);
});

test('svg da folha escapa caracteres especiais do XML', () => {
  const s = svgFolha(CARACTERES);
  assert.match(s, /&#38;/);
  assert.match(s, /&#60;|&#34;/);
  assert.doesNotMatch(s, />&</);
});

test('coleta: texto em 3 modos com as folhas necessárias, códigos únicos', async () => {
  const { coleta, LINHAS_POR_FOLHA } = await import('../src/letra/folha.js');
  const c = coleta(LINHAS_POR_FOLHA * 2 + 1);
  assert.deepEqual(c.filter((f) => f.tipo === 'texto').map((f) => f.codigo), ['N1', 'N2', 'N3', 'C1', 'C2', 'C3', 'F1', 'F2', 'F3']);
  assert.equal(new Set(c.map((f) => f.codigo)).size, c.length);
  assert.deepEqual([...new Set(c.map((f) => f.modo))], ['natural', 'cursiva', 'forma']);
});
