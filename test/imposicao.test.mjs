import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERFIS } from '../src/maquina/perfis.js';
import { papel } from '../src/materiais/documento.js';
import { gcodeDocumento } from '../src/maquina/gcode.js';
import { girar, impor, paraMesa, aPassada, instrucao } from '../src/maquina/imposicao.js';

const mega = PERFIS.megaS, A = (n) => papel(n);
const resumo = (i) => i.passadas.map((p) => p.slots.length);
const pag = (w, h) => ({ camadas: [
  { id: 'texto', caneta: 'preta', personagem: null, ordem: 'escrita', tracos: [[[0, 0], [w, 0]], [[0, h], [w, h]]] },
  { id: 'rubrica', caneta: 'vermelha', personagem: null, ordem: 'escrita', tracos: [[[w / 2, 0], [w / 2, h]]] },
] });
const xy = (txt) => [...txt.matchAll(/^G[01] X(\S+) Y(\S+)/gm)].map((m) => [+m[1], +m[2]]);

test('A6 em A4 na Mega S: 2 passadas [2,2], porFolha 4, rotações [0,180]', () => {
  const i = impor({ perfil: mega, folha: A('A4'), pagina: A('A6') });
  assert.deepEqual(resumo(i), [2, 2]);
  assert.equal(i.porFolha, 4);
  assert.deepEqual(i.passadas.map((p) => p.rot), [0, 180]);
  assert.equal(i.canto, 'x0y0');
  assert.deepEqual(i.perdidos, []);
});

test('A5 em A4: 2 passadas de 1 slot (página a 90°)', () => {
  const i = impor({ perfil: mega, folha: A('A4'), pagina: A('A5') });
  assert.deepEqual(resumo(i), [1, 1]);
  assert.equal(i.porFolha, 2);
});

test('A7 em A4: página a 90°, 2 passadas de 4 slots', () => {
  const i = impor({ perfil: mega, folha: A('A4'), pagina: A('A7') });
  assert.deepEqual(resumo(i), [4, 4]);
  assert.ok(i.slots.every((s) => s.giro === 90));
});

test('A6 em A6: 1 passada', () => {
  const i = impor({ perfil: mega, folha: A('A6'), pagina: A('A6') });
  assert.deepEqual(resumo(i), [1]);
  assert.equal(i.passadas[0].rot, 0);
});

test('P2S: canto auto x1y1 e tudo na janela 48..255 × 55..255', () => {
  const p2s = PERFIS.p2s, i = impor({ perfil: p2s, folha: A('A5'), pagina: A('A6') });
  assert.equal(i.canto, 'x1y1');
  assert.equal(i.passadas.length, 2);
  assert.ok(i.passadas.every(({ caixa: c }) => c.x + c.w === 255 && c.y + c.h === 255));
  i.passadas.forEach((_, k) => {
    const { pagina, papel: pp } = aPassada(i.slots.map(() => pag(105, 148)), i, k, p2s, { largura: 105, altura: 148 });
    const g = gcodeDocumento(pagina, pp, p2s);
    assert.deepEqual(g.avisos, []);
    for (const [x, y] of xy(g.texto)) assert.ok(x >= 48 - 1e-3 && x <= 255 + 1e-3 && y >= 55 - 1e-3 && y <= 255 + 1e-3, `${x},${y}`);
  });
});

test('página grande demais: erros claros', () => {
  assert.throws(() => impor({ perfil: mega, folha: A('A3'), pagina: A('A4') }), /maior que a janela/);
  assert.throws(() => impor({ perfil: mega, folha: A('A6'), pagina: A('A5') }), /maior que a folha/);
});

test('canto com dx/dy = medida; sem dx/dy = encostada', () => {
  const b = { perfil: mega, folha: A('A6'), pagina: A('A7') };
  assert.deepEqual(impor({ ...b, referencia: { canto: 'x0y0', dx: 0, dy: 0 } }), impor(b));
  const c0 = impor(b).passadas[0].caixa, c1 = impor({ ...b, referencia: { canto: 'x0y0', dx: 5, dy: 3 } }).passadas[0].caixa;
  assert.deepEqual([c1.x - c0.x, c1.y - c0.y], [5, 3]);
  const d0 = impor({ ...b, referencia: { canto: 'x1y1' } }).passadas[0].caixa, d1 = impor({ ...b, referencia: { canto: 'x1y1', dx: 5, dy: 3 } }).passadas[0].caixa;
  assert.deepEqual([d1.x - d0.x, d1.y - d0.y], [-5, -3]);
});

test('girar: ida e volta', () => {
  for (const rot of [0, 90, 180, 270]) {
    const [w, h] = [40, 25], q = girar([7, 11], rot, w, h), odd = rot % 180;
    assert.deepEqual(girar(q, (360 - rot) % 360, odd ? h : w, odd ? w : h), [7, 11]);
  }
});

test('paraMesa: cantos da página no slot', () => {
  const i = impor({ perfil: mega, folha: A('A4'), pagina: A('A6') }), a6 = { largura: 105, altura: 148 };
  assert.deepEqual(paraMesa(i, 0, i.slots[2], a6)([0, 0]), [0, 148.5]);
  assert.deepEqual(paraMesa(i, 0, i.slots[2], a6)([105, 148]), [105, 0.5]);
  assert.deepEqual(paraMesa(i, 1, i.slots[0], a6)([0, 0]), [210, 0.5]);
});

test('aPassada + gcodeDocumento: tudo na janela e 1 troca de caneta por passada', () => {
  const i = impor({ perfil: mega, folha: A('A4'), pagina: A('A6') }), a6 = { largura: 105, altura: 148 };
  i.passadas.forEach((_, k) => {
    const { pagina, papel: pp } = aPassada(i.slots.map(() => pag(105, 148)), i, k, mega, a6);
    assert.deepEqual(pp, { largura: 210, altura: 210 });
    const g = gcodeDocumento(pagina, pp, mega);
    assert.deepEqual(g.avisos, []);
    assert.equal(g.trocas, 1);
    assert.equal(g.nTracos, 6); // 2 slots × (2 + 1)
    for (const [x, y] of xy(g.texto)) assert.ok(x >= -1e-3 && x <= 210.001 && y >= -1e-3 && y <= 210.001);
  });
});

test('instrucao em pt-BR', () => {
  const i = impor({ perfil: mega, folha: A('A4'), pagina: A('A6') });
  assert.equal(instrucao(i, 1), 'Passada 2 de 2: reposicione a folha com o topo para a frente (gire a partir da posição normal) e encoste de novo a borda curta na frente, no canto frente-esquerda (X0 Y0 da caneta — confira com G0 X0 Y0); prenda a folha (sobra 87 mm para trás). Confira se a folha não bate na estrutura quando a mesa vai para a frente.');
  assert.match(instrucao(i, 0, { nomeFolha: 'folha 1', origem: 'tras-direita' }), /^Passada 1 de 2 \(folha 1\): ponha a folha com o topo para a frente \(posição normal\).*canto trás-direita/);
  assert.match(instrucao(i, 1, { folha: 2, nFolhas: 3, pagina: 7 }), /^Folha 2, passada 2 de 2, página 7:/);
  assert.doesNotMatch(instrucao(i, 1, { folha: 1, nFolhas: 1 }), /^Folha/);
});

test('sobra medida contra a mesa; sem sobra, sem a palavra', () => {
  const sobra = (f, p) => instrucao(impor({ perfil: mega, folha: A(f), pagina: A(p) }), 0);
  assert.doesNotMatch(sobra('A5', 'A6'), /sobra/);
  assert.match(sobra('A3', 'A5'), /sobra 210 mm para trás e 87 mm para a direita/);
});

test('A3 na Mega S: 4 passadas, a direção do topo na instrução bate com a geometria', () => {
  const folha = A('A3'), i = impor({ perfil: mega, folha, pagina: A('A5') });
  assert.equal(i.passadas.length, 4);
  const dir = { trás: [0, 1], frente: [0, -1], direita: [1, 0], esquerda: [-1, 0] };
  i.passadas.forEach((p, k) => {
    // topo da folha (W/2, 0) vs centro da caixa na mesa: o lado para onde ele aponta
    const [X, Y] = paraMesa(i, k, { x: 0, y: 0, giro: 0 }, folha)([folha.largura / 2, 0]);
    const v = [Math.sign(Math.round(X - (p.caixa.x + p.caixa.w / 2))), Math.sign(Math.round(Y - (p.caixa.y + p.caixa.h / 2)))];
    const nome = /com o topo para (?:a )?(\S+)/.exec(instrucao(i, k))[1];
    assert.deepEqual(dir[nome], v, `passada ${k + 1}: ${nome}`);
  });
});

test('origem tras-direita inverte as palavras do topo', () => {
  const i = impor({ perfil: mega, folha: A('A4'), pagina: A('A6') });
  assert.match(instrucao(i, 1, { origem: 'tras-direita' }), /topo para trás/);
});
