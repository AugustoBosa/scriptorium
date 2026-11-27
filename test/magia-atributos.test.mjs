import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atributos, OPCOES } from '../src/magia-atributos.js';

const bola = {
  id: 'fireball-phb', nivel: 3, escola: 'V', alcance: '45 m', comp: 'V, S, M', duracao: 'Instantânea', conc: false, ritual: false,
  mec: 'Res. DES · 8d6 fogo · +1d6 por nível acima', resumo: 'Explosão em esfera de 6 m de raio que contorna cantos.',
};

test('bola de fogo: fogo, esfera, DES, longo, instantânea', () => {
  assert.deepEqual(atributos(bola), {
    nivel: '3', escola: 'V', dano: 'fogo', area: 'esfera', alcance: 'longo', duracao: 'instantânea',
    salva: 'DES', conc: 'não', ritual: 'não', comp: ['V', 'S', 'M'],
  });
});

test('cone no alcance, dano com bônus fixo, duração com concentração', () => {
  const a = atributos({ alcance: 'Pessoal (cone de 4,5 m)', mec: '1d4 + 4 concussão/perfurante/cortante', duracao: 'Concentração, até 1 minuto', comp: 'S' });
  assert.equal(a.area, 'cone');
  assert.equal(a.alcance, 'pessoal');
  assert.equal(a.dano, 'concussão');
  assert.equal(a.duracao, 'minutos');
  assert.deepEqual(a.comp, ['S']);
});

test('sem dados vira o primeiro valor de cada lista', () => {
  const a = atributos({});
  assert.equal(a.dano, 'nenhum');
  assert.equal(a.area, 'nenhum');
  assert.equal(a.salva, 'nenhum');
  assert.equal(a.alcance, 'especial');
  assert.equal(a.duracao, 'especial');
});

test('alcance: 9 m é curto, 18 m médio, 1,5 km longo; até ser dissipada é permanente', () => {
  assert.equal(atributos({ alcance: '9 m' }).alcance, 'curto');
  assert.equal(atributos({ alcance: '18 m' }).alcance, 'médio');
  assert.equal(atributos({ alcance: '1,5 km' }).alcance, 'longo');
  assert.equal(atributos({ duracao: 'Até ser dissipada' }).duracao, 'permanente');
});

// dados/ fica fora do git: só roda quando o arquivo existe (pasta principal).
const arq = new URL('../../../../dados/magias.json', import.meta.url);
test('todas as magias reais dão valores das listas', { skip: !fs.existsSync(arq) }, () => {
  const magias = JSON.parse(fs.readFileSync(arq, 'utf8'));
  for (const m of magias) {
    const a = atributos(m);
    for (const campo of ['nivel', 'escola', 'dano', 'area', 'alcance', 'duracao', 'salva']) assert.ok(OPCOES[campo].includes(a[campo]), `${m.id} ${campo}=${a[campo]}`);
  }
});
