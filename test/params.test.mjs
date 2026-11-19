import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseFonte } from '../src/fonte.js';
import { resolver, novoPersonagem } from '../src/personagem.js';
import { NEUTRA } from '../src/motor/mao.js';
import { amostra } from '../src/layout.js';
import { papel as fabricaPapel } from '../src/materiais/documento.js';
import { PERFIS, mesclarPerfil } from '../src/maquina/perfis.js';
import { gerarAlfabeto } from '../src/arcano/alfabeto.js';
import { magiaVazia } from '../src/magia.js';

const lerFonte = (n) => parseFonte(readFileSync(new URL(`../fontes/${n}.svg`, import.meta.url), 'utf8'), n);
const p = novoPersonagem();
p.mao.base = [{ fonte: 'EMSDelight', peso: 0.5 }, { fonte: 'EMSAllure', peso: 0.5 }];
const estilo = { seed: 1, curva: 0.4, complexidade: 0.5 };
const fontes = { EMSDelight: lerFonte('EMSDelight'), EMSAllure: lerFonte('EMSAllure'), arcano: gerarAlfabeto(estilo) };
const ctx = {
  fontes, mao: resolver(p, null), escrever: (m, t, o) => amostra(fontes, m, t, o), papel: fabricaPapel('A5'), perfil: PERFIS.megaS, estilo,
  magia: { ...magiaVazia(), id: 'm-teste', nome: 'Teste', nivel: 3, comp: 'V, S, M' },
  maoArcana: { ...NEUTRA, base: [{ fonte: 'arcano', peso: 1 }], seed: estilo.seed },
};

const raiz = new URL('../src/', import.meta.url);
const modulos = [];
for (const rel of readdirSync(raiz, { recursive: true })) {
  const caminho = rel.replaceAll('\\', '/');
  if (!caminho.endsWith('.js') || caminho.startsWith('ui/')) continue;
  const m = await import(new URL(caminho, raiz));
  if (m.PARAMS) modulos.push([caminho, m.PARAMS]);
}

test('descoberta: pelo menos 7 módulos exportam PARAMS', () => {
  assert.ok(modulos.length >= 7, `só ${modulos.length}: ${modulos.map(([c]) => c)}`);
});

const valoresDe = (x) => x.tipo === 'marca' ? [false, true] : x.tipo === 'opcao' ? x.opcoes.map((o) => o.valor) : [x.min, x.padrao, x.max];
// previa devolve traços ou { fundo, foco } (foco = o que o controle muda, em destaque na prévia).
const traçosOk = (bruto, onde) => {
  const obj = !Array.isArray(bruto);
  if (obj) assert.ok(Array.isArray(bruto?.fundo) && Array.isArray(bruto?.foco), `${onde}: { fundo, foco } sem arrays`);
  const t = obj ? [...bruto.fundo, ...bruto.foco] : bruto;
  assert.ok(t.length >= 1, `${onde}: sem traços`);
  for (const tr of t) {
    assert.ok(tr.length >= 2, `${onde}: traço com menos de 2 pontos`);
    assert.ok(tr.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), `${onde}: ponto não finito`);
  }
};

for (const [caminho, params] of modulos) {
  test(`contrato de ${caminho}`, () => {
    const chaves = new Set();
    for (const x of params) {
      const id = `${caminho}:${x.chave}`;
      assert.ok(!chaves.has(x.chave), `${id}: chave repetida`);
      chaves.add(x.chave);
      assert.ok(x.chave && x.grupo, `${id}: chave/grupo`);
      assert.ok(['basico', 'avancado'].includes(x.nivel), `${id}: nivel`);
      assert.ok(['faixa', 'numero', 'opcao', 'marca'].includes(x.tipo), `${id}: tipo`);
      assert.ok(x.rotulo && x.ajuda && x.ajuda.length <= 220, `${id}: rotulo/ajuda (${x.ajuda?.length})`);
      assert.equal(typeof x.previa, 'function', `${id}: previa`);
      for (const k of ['min', 'max', 'passo', 'padrao']) {
        if (typeof x[k] === 'number') assert.ok((String(x[k]).split('.')[1] ?? '').length <= 2, `${id}: ${k}=${x[k]} com mais de 2 casas`);
      }
      if (x.tipo === 'faixa' || x.tipo === 'numero') {
        assert.ok(x.min < x.max && x.passo > 0 && x.min <= x.padrao && x.padrao <= x.max, `${id}: faixa inválida`);
      } else if (x.tipo === 'marca') assert.equal(typeof x.padrao, 'boolean', `${id}: padrao`);
      else assert.ok(x.opcoes.length >= 2 && x.opcoes.some((o) => o.valor === x.padrao), `${id}: opcoes`);
      for (const v of valoresDe(x)) {
        const t = x.previa(v, ctx);
        traçosOk(t, `${id} (${v})`);
        assert.deepEqual(x.previa(v, ctx), t, `${id}: não determinística`);
      }
      if (x.tipo === 'faixa') assert.notDeepEqual(x.previa(x.min, ctx), x.previa(x.max, ctx), `${id}: min = max`);
    }
  });
}

test('mesclarPerfil e PERFIS.personalizado não compartilham objetos com megaS', () => {
  const a = mesclarPerfil({}), b = mesclarPerfil({ zEscrita: 5 });
  for (const x of [a, b]) {
    assert.ok(x.estaciona && x.trocaCaneta);
    for (const k of Object.keys(PERFIS.megaS)) if (typeof PERFIS.megaS[k] === 'object' && x[k]) assert.notEqual(x[k], PERFIS.megaS[k], k);
  }
  assert.equal(b.zEscrita, 5);
  assert.notEqual(PERFIS.personalizado.estaciona, PERFIS.megaS.estaciona);
});
