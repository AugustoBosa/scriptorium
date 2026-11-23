// Gera os G-codes de calibração da troca automática de caneta (perfil megaSTroca) a partir do próprio perfil.
// Uso: node scripts/gerar-teste-troca.mjs [pasta=workflow/experimentos/troca-automatica] ['{"base":38,"recuo":-12}'] [perfil=megaSTroca|megaSTrocaLado]
// 2º argumento: JSON com valores medidos que sobrescrevem `perfil.troca` (para regerar depois de medir). 3º: frente (padrão) ou lado.
// Saída (nomes 8.3 para o cartão SD da Mega S): TROCA1.GCO posições, TROCA2.GCO ciclo passo a passo, TROCA3.GCO ciclo com desenho.
import { mkdirSync, writeFileSync } from 'node:fs';
import { PERFIS } from '../src/maquina/perfis.js';
import { gcodeDocumento, trocaAuto } from '../src/maquina/gcode.js';

const [pasta = 'workflow/experimentos/troca-automatica', json = '{}', nomePerfil = 'megaSTroca'] = process.argv.slice(2);
const perfil = structuredClone(PERFIS[nomePerfil]);
Object.assign(perfil.troca, JSON.parse(json));
const t = perfil.troca, f = (v) => v.toFixed(3), zA = t.zAssento ?? perfil.zEscrita, zS = zA + t.subida, longe = t.base + t.afasta;
const E = t.eixo, N = E === 'X' ? 'Y' : 'X';
const cab = (titulo) => `; ${titulo}\n; Gerado por scripts/gerar-teste-troca.mjs. Valores: ${JSON.stringify(t)}\n; M0 = a Mega S para e espera um clique no botão.\n${perfil.header}G0 Z${zS} F${perfil.fZ}\n`;
const m0 = (msg) => `M0 ${msg.replace(/[\r\n;]/g, ' ').slice(0, 60)}\n`;

// 1) Posições a seco: sem caneta. Para em cada vaga, primeiro só no eixo das vagas (no ar), depois encosta na base, depois desce na vaga 1.
let a = cab('TROCA1: posições das vagas, a seco (sem caneta no porta-caneta, base de troca na mesa)');
t.vagas.forEach((e, i) => {
  a += `; vaga ${i + 1}\nG0 ${N}${f(longe)} F${perfil.fViagem}\nG0 ${E}${f(e)} F${perfil.fViagem}\n` + m0(`Vaga ${i + 1}: ${E} certo? bico sobre o centro`);
  a += `G0 ${N}${f(t.base)} F${perfil.fViagem}\n` + m0(`Vaga ${i + 1}: ${N} certo? na frente dos pinos`);
  a += `G0 ${N}${f(longe)} F${perfil.fViagem}\n`;
});
a += `; descida na vaga 1: confira a altura do assento\nG0 ${E}${f(t.vagas[0])} F${perfil.fViagem}\nG0 ${N}${f(t.base)} F${perfil.fViagem}\n`;
a += m0('Z: vai descer devagar. Mao no botao!') + `G1 Z${f(zA)} F${t.fLento}\n` + m0('Z de assento certo? ponta no nivel da mesa') + `G1 Z${f(zS)} F${t.fLento}\nG0 ${N}${f(longe)} F${perfil.fViagem}\n`;
a += `G0 Z15 F${perfil.fZ}\nG0 X0 Y200 F${perfil.fViagem}\nM84\n`;

// 2) Ciclo passo a passo: pega a vaga 1, larga, pega a 2, larga; M0 antes de cada movimento de encaixe e de cada ida entre vagas.
const passos = (s) => s.split('\n').filter(Boolean).map((l) => (/^G1 /.test(l) || l.startsWith(`G0 ${E}`) ? m0('Prox ' + l.replace(/^G\d /, '').replace(/ F\d+/, '')) + l + '\n' : l + '\n')).join('');
let b = cab('TROCA2: ciclo passo a passo (suportes nas vagas 1 e 2, canetas montadas)');
b += passos(trocaAuto(perfil, null, 0) + trocaAuto(perfil, 0, 1) + trocaAuto(perfil, 1, null));
b += `G0 Z15 F${perfil.fZ}\nG0 X0 Y200 F${perfil.fViagem}\nM84\n`;

// 3) Ciclo com desenho: preta (quadrado 30 mm) e vermelha (cruz) numa folha pequena, 2 ciclos de trocas.
const papel = { largura: 60, altura: 60 };
const quadrado = [[10, 10], [40, 10], [40, 40], [10, 40], [10, 10]], cruz = [[[25, 15], [25, 45]], [[10, 30], [40, 30]]];
const cam = (id, caneta, tracos) => ({ id, caneta, personagem: null, ordem: 'otimizada', tracos });
const doc = { camadas: [cam('quadrado', 'preta', [quadrado]), cam('cruz', 'vermelha', cruz), cam('quadrado2', 'preta', [quadrado])] };
const c = gcodeDocumento(doc, papel, perfil, { canetas: { preta: { nome: 'Preta' }, vermelha: { nome: 'Vermelha' } } });
const d = `; TROCA3: ciclo real, sem pausas: preta (quadrado), vermelha (cruz), preta de novo. Folha 60x60 mm no canto da janela (x0, y0).\n${c.texto}`;

mkdirSync(pasta, { recursive: true });
for (const [nome, texto] of [['TROCA1.GCO', a], ['TROCA2.GCO', b], ['TROCA3.GCO', d]]) writeFileSync(`${pasta}/${nome}`, texto);
console.log(`3 arquivos em ${pasta} (${a.split('\n').length} / ${b.split('\n').length} / ${d.split('\n').length} linhas); trocas no 3: ${c.trocas}; avisos: ${c.avisos.length}`);
