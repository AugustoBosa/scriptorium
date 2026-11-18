import { gcodeDocumento, svgDocumento } from '../maquina/gcode.js';
import { PERFIS, PARAMS as PARAMS_PERFIL, mesclarPerfil } from '../maquina/perfis.js';
import { otimizar, PARAMS as PARAMS_OTIM } from '../maquina/otimizar.js';
import { amostra } from '../layout.js';
import { resolver } from '../personagem.js';
import { AJUDA, rotulo } from '../ajuda.js';
import { controle, dica, ligar } from './controle.js';
import { resumoMesa } from './mesa.js';

const PP = Object.fromEntries(PARAMS_PERFIL.map((p) => [p.chave, p]));
const PO = Object.fromEntries(PARAMS_OTIM.map((p) => [p.chave, p]));
const CHAVE_PERFIL = 'writer.perfil';
const ROTULO_CAMADA = { texto: 'texto', notas: 'notas', paginacao: 'paginação', iluminura: 'iluminura', rubrica: 'rubrica (vermelha)', moldura: 'moldura', sigilo: 'sigilo' };

const ctxDe = (estado) => () => ({
  fontes: estado.fontes,
  mao: resolver(estado.personagem, estado.variacao || null),
  escrever: (m, t, o) => amostra(estado.fontes, m, t, o),
  papel: estado.pagina,
  perfil: estado.perfil,
});

function baixar(conteudo, nome, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  Object.assign(document.createElement('a'), { href: url, download: nome }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Página do documento com cada camada reordenada conforme a opção "otimizar" (sem otimizar: ordem crua, sem grupos).
function paginaOtimizada(estado, i) {
  const pag = estado.doc.paginas[i];
  return { ...pag, camadas: pag.camadas.map((c) => ({ ...c, tracos: otimizar(c.tracos, 0.1, { ordem: estado.otimizar ? c.ordem : 'escrita', grupos: estado.otimizar ? c.grupos : undefined }) })) };
}

// Camada escolhida na barra, se a página i tem essa camada; senão, todas (undefined).
function escolhida(estado, i) {
  const ids = estado.doc.paginas[i]?.camadas.map((c) => c.id) ?? [];
  return ids.includes(estado.camada) ? [estado.camada] : undefined;
}

// G-code da página i (só `camadas`, se dadas); { erro } é aviso, e com `bloqueia` a máquina não pode plotar.
// rapido: página crua, sem 2-opt (a barra só precisa de contagem, comprimento aproximado e avisos).
function gerarGcode(estado, i, camadas, rapido = false) {
  try {
    const doc = estado.doc;
    const g = gcodeDocumento(rapido ? doc.paginas[i] : paginaOtimizada(estado, i), doc.papel, estado.perfil, { canetas: doc.canetas, camadas });
    const fora = g.avisos.find((a) => a.includes('fora da janela'));
    if (fora) return estado.perfil.experimental ? { g, bloqueia: true, erro: 'Perfil experimental: há traços fora da janela da máquina.' } : { g, erro: fora };
    return { g };
  } catch (e) {
    return { bloqueia: true, erro: `Erro: ${e.message}` };
  }
}

const gravarPerfil = (perfil) => {
  try { localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil)); } catch { /* sem armazenamento: vale só nesta sessão */ }
};

export function montar(elemento, estado, aoMudar) {
  const ctx = ctxDe(estado);

  const editar = (chave, v) => {
    estado.perfil[chave] = v;
    estado.perfil.nome = 'personalizado';
    estado.perfilNome = 'personalizado';
    gravarPerfil(estado.perfil);
  };

  const controles = ['zEscrita', 'zLevantada', 'fDesenho', 'fViagem', 'fZ', 'offsetX', 'offsetY', 'mesaX', 'mesaY']
    .map((c) => controle(PP[c], { ler: () => estado.perfil[c], gravar: (v) => editar(c, v), ctx }, aoMudar));
  controles.push(controle(PO.otimizar, ligar(estado, 'otimizar', ctx), aoMudar), controle(PO.trajeto, ligar(estado, 'trajeto', ctx), aoMudar));

  const areas = ['header', 'footer'].map((chave) => {
    const ta = document.createElement('textarea');
    ta.rows = 5;
    ta.style.fontFamily = 'var(--fonte-mono)';
    ta.addEventListener('input', () => { editar(chave, ta.value); aoMudar(); });
    ta.id = `perfil-${chave}`;
    const lab = document.createElement('label');
    lab.htmlFor = ta.id;
    lab.append(rotulo(chave));
    const cab = document.createElement('div');
    cab.className = 'linha-campo';
    cab.append(lab, ' ', dica(AJUDA[chave], chave));
    const l = document.createElement('div');
    l.append(cab, ta);
    return { ta, chave, l };
  });

  const restaurar = document.createElement('button');
  restaurar.type = 'button';
  restaurar.textContent = 'Restaurar perfil';
  restaurar.addEventListener('click', () => {
    estado.perfil = structuredClone(PERFIS[estado.perfilNome === 'personalizado' ? 'megaS' : estado.perfilNome]);
    estado.perfilNome = estado.perfil.nome === 'p2s' ? 'p2s' : 'megaS';
    try { localStorage.removeItem(CHAVE_PERFIL); } catch { /* ignora */ }
    aoMudar();
  });

  elemento.replaceChildren(...controles.map((c) => c.el), ...areas.map((a) => a.l), restaurar);

  return function atualizar() {
    for (const c of controles) c.atualizar();
    for (const { ta, chave } of areas) {
      if (ta !== document.activeElement && ta.value !== estado.perfil[chave]) ta.value = estado.perfil[chave];
    }
  };
}

export function montarBarra(elemento, estado, aoMudar) {
  const ctx = ctxDe(estado);

  const trocar = (nome) => {
    if (nome === 'personalizado') {
      let salvo;
      try { salvo = JSON.parse(localStorage.getItem(CHAVE_PERFIL)) ?? undefined; } catch { /* perfil salvo ilegível */ }
      estado.perfil = mesclarPerfil(salvo);
    } else {
      estado.perfil = structuredClone(PERFIS[nome]);
    }
    estado.perfilNome = nome;
    aoMudar();
  };
  const seletor = controle(PP.perfil, { ler: () => estado.perfilNome, gravar: trocar, ctx }, aoMudar);

  const resumo = document.createElement('span');
  resumo.className = 'resumo';
  const erro = document.createElement('span');
  erro.className = 'erro';

  const botao = (texto, aoClicar, classe) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = texto;
    if (classe) b.className = classe;
    b.addEventListener('click', aoClicar);
    return b;
  };
  // Nome com a camada só quando a exportação é de uma camada (ex.: carta-p1-notas.svg).
  const nome = (i, ext, camadas) => `${estado.oficina ?? 'escrita'}-p${i + 1}${camadas ? `-${camadas[0]}` : ''}.${ext}`;
  const baixarSvg = (i, camadas) => baixar(svgDocumento(paginaOtimizada(estado, i), estado.doc.papel, estado.doc.canetas, { camadas }), nome(i, 'svg', camadas), 'image/svg+xml');

  // Camada: select com as camadas da página atual; "todas" = sem filtro. Os botões "Todas as páginas" exportam todas as camadas.
  const camada = document.createElement('select');
  camada.addEventListener('change', () => { estado.camada = camada.value; aoMudar(); });
  const rotuloCamada = document.createElement('label');
  rotuloCamada.append('Camada ', camada);

  const bSvg = botao('Baixar SVG', () => baixarSvg(estado.paginaAtual, escolhida(estado, estado.paginaAtual)));
  const bGcode = botao('Baixar G-code', () => {
    const cam = escolhida(estado, estado.paginaAtual);
    const r = gerarGcode(estado, estado.paginaAtual, cam);
    erro.textContent = r.erro ?? '';
    if (r.bloqueia) return;
    baixar(r.g.texto, nome(estado.paginaAtual, 'gcode', cam), 'text/plain');
  }, 'primario');
  const bTodosSvg = botao('Todos os SVG', () => estado.doc.paginas.forEach((_, i) => baixarSvg(i)));
  const bTodosGcode = botao('Todos os G-code', () => {
    const rs = estado.doc.paginas.map((_, i) => gerarGcode(estado, i));
    const falha = rs.findIndex((r) => r.bloqueia);
    if (falha >= 0) { erro.textContent = `Página ${falha + 1}: ${rs[falha].erro}`; return; }
    erro.textContent = rs.map((r, i) => r.erro && `Página ${i + 1}: ${r.erro}`).filter(Boolean)[0] ?? '';
    rs.forEach((r, i) => baixar(r.g.texto, nome(i, 'gcode'), 'text/plain'));
  });
  const todas = document.createElement('details');
  const sumario = document.createElement('summary');
  sumario.textContent = 'Todas as páginas';
  todas.append(sumario, bTodosSvg, bTodosGcode);

  elemento.replaceChildren(seletor.el, rotuloCamada, resumo, erro, bSvg, bGcode, todas);

  return function atualizar() {
    seletor.atualizar();
    const doc = estado.doc;
    const ids = doc?.paginas[estado.paginaAtual]?.camadas.map((c) => c.id) ?? [];
    if (camada.dataset.ids !== ids.join('|')) {
      camada.replaceChildren(new Option('Todas', 'todas'), ...ids.map((v) => new Option(ROTULO_CAMADA[v] ?? v, v)));
      camada.dataset.ids = ids.join('|');
    }
    camada.value = ids.includes(estado.camada) ? estado.camada : 'todas';
    const vazio = !doc || !doc.paginas.some((p) => p.camadas.some((c) => c.tracos.length));
    bSvg.disabled = bTodosSvg.disabled = vazio;
    let bloqueado = vazio, texto = vazio && doc ? 'Nada para plotar ainda' : '—';
    erro.textContent = '';
    if (!vazio) {
      const r = gerarGcode(estado, estado.paginaAtual, escolhida(estado, estado.paginaAtual), true);
      if (r.g) texto = `${r.g.nTracos} traços · ≈ ${(r.g.comprimento / 1000).toFixed(1).replace('.', ',')} m`;
      if (r.erro) erro.textContent = r.erro;
      if (r.bloqueia) bloqueado = true;
      const mesa = resumoMesa(estado);
      if (mesa) texto += ` · ${mesa}`;
    }
    resumo.textContent = texto;
    bGcode.disabled = bTodosGcode.disabled = bloqueado;
  };
}
