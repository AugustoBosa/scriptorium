import { gcodeDocumento, svgDocumento } from '../maquina/gcode.js';
import { PERFIS, PARAMS as PARAMS_PERFIL, mesclarPerfil } from '../maquina/perfis.js';
import { otimizar, PARAMS as PARAMS_OTIM } from '../maquina/otimizar.js';
import { amostra } from '../layout.js';
import { resolver } from '../personagem.js';
import { AJUDA, rotulo } from '../ajuda.js';
import { controle, dica, ligar } from './controle.js';

const PP = Object.fromEntries(PARAMS_PERFIL.map((p) => [p.chave, p]));
const PO = Object.fromEntries(PARAMS_OTIM.map((p) => [p.chave, p]));
const CHAVE_PERFIL = 'writer.perfil';

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

// Página do documento com cada camada reordenada conforme a opção "otimizar".
function paginaOtimizada(estado, i) {
  const pag = estado.doc.paginas[i];
  return { ...pag, camadas: pag.camadas.map((c) => ({ ...c, tracos: otimizar(c.tracos, 0.1, { ordem: estado.otimizar ? c.ordem : 'escrita' }) })) };
}

// G-code da página i, ou { erro } quando a máquina não pode plotar.
function gerarGcode(estado, i) {
  try {
    const doc = estado.doc;
    const g = gcodeDocumento(paginaOtimizada(estado, i), doc.papel, estado.perfil, { canetas: doc.canetas });
    if (estado.perfil.experimental && g.avisos.some((a) => a.includes('fora da janela'))) {
      return { g, erro: 'Perfil experimental: há traços fora da janela da máquina.' };
    }
    return { g };
  } catch (e) {
    return { erro: `Erro: ${e.message}` };
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
    const l = document.createElement('label');
    l.append(rotulo(chave), ' ', dica(AJUDA[chave]), ' ', ta);
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
  const nome = (i, ext) => `${estado.oficina ?? 'escrita'}-p${i + 1}.${ext}`;
  const baixarSvg = (i) => baixar(svgDocumento(paginaOtimizada(estado, i), estado.doc.papel, estado.doc.canetas), nome(i, 'svg'), 'image/svg+xml');

  const bSvg = botao('Baixar SVG', () => baixarSvg(estado.paginaAtual));
  const bGcode = botao('Baixar G-code', () => {
    const r = gerarGcode(estado, estado.paginaAtual);
    if (r.erro) { erro.textContent = r.erro; return; }
    baixar(r.g.texto, nome(estado.paginaAtual, 'gcode'), 'text/plain');
  }, 'primario');
  const bTodosSvg = botao('Todos os SVG', () => estado.doc.paginas.forEach((_, i) => baixarSvg(i)));
  const bTodosGcode = botao('Todos os G-code', () => {
    const rs = estado.doc.paginas.map((_, i) => gerarGcode(estado, i));
    const falha = rs.findIndex((r) => r.erro);
    if (falha >= 0) { erro.textContent = `Página ${falha + 1}: ${rs[falha].erro}`; return; }
    rs.forEach((r, i) => baixar(r.g.texto, nome(i, 'gcode'), 'text/plain'));
  });
  const todas = document.createElement('details');
  const sumario = document.createElement('summary');
  sumario.textContent = 'Todas as páginas';
  todas.append(sumario, bTodosSvg, bTodosGcode);

  elemento.replaceChildren(seletor.el, resumo, erro, bSvg, bGcode, todas);

  return function atualizar() {
    seletor.atualizar();
    const doc = estado.doc;
    const vazio = !doc || !doc.paginas.some((p) => p.camadas.some((c) => c.tracos.length));
    bSvg.disabled = bTodosSvg.disabled = vazio;
    let bloqueado = vazio, texto = vazio && doc ? 'Nada para plotar ainda' : '—';
    erro.textContent = '';
    if (!vazio) {
      const r = gerarGcode(estado, estado.paginaAtual);
      if (r.g) texto = `${r.g.nTracos} traços · ${(r.g.comprimento / 1000).toFixed(1).replace('.', ',')} m`;
      if (r.erro) { erro.textContent = r.erro; bloqueado = true; }
    }
    resumo.textContent = texto;
    bGcode.disabled = bTodosGcode.disabled = bloqueado;
  };
}
