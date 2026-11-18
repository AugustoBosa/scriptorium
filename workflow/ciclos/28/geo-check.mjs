const R = new URL('../../../src/', import.meta.url).href; // relativo: sobrevive ao rename da pasta
const { PERFIS } = await import(R+'maquina/perfis.js');
const { papel } = await import(R+'materiais/documento.js');
const { gcodeDocumento } = await import(R+'maquina/gcode.js');
const { impor, aPassada, instrucao, paraMesa } = await import(R+'maquina/imposicao.js');
const pag=(w,h)=>({camadas:[{id:'t',caneta:'preta',tracos:[[[0,0],[w,0],[w,h],[0,h],[0,0]],[[0,0],[w,h]],[[2,3],[2.5,3]]]}]});
function run(perfil, folha, pg, ref={}, esp=0){
  const i=impor({perfil,folha,pagina:pg,referencia:ref,espaco:esp}); const j=i.janela;
  console.log(`\n== ${perfil.nome} folha ${folha.largura}x${folha.altura} pag ${pg.largura}x${pg.altura} ref ${JSON.stringify(ref)} canto=${i.canto} porFolha=${i.porFolha} perdidos=${i.perdidos.length}`);
  const vistos=new Set();
  i.passadas.forEach((p,k)=>{
    const {pagina,papel:pp}=aPassada(i.slots.map(()=>pag(pg.largura,pg.altura)),i,k,perfil,pg);
    const g=gcodeDocumento(pagina,pp,perfil);
    const xs=[...g.texto.matchAll(/^G[01] X(\S+) Y(\S+)/gm)].map(m=>[+m[1],+m[2]]).filter(([x,y])=>!(x===perfil.estaciona.x&&y===perfil.estaciona.y));
    const bad=xs.filter(([x,y])=>x<j.x0-1e-3||x>j.x1+1e-3||y<j.y0-1e-3||y>j.y1+1e-3);
    // physical: top-of-sheet midpoint and sheet corner positions
    const f=paraMesa(i,k,{x:0,y:0,giro:0},i.folha);
    const top=f([folha.largura/2,0]), bl=f([0,folha.altura]), tl=f([0,0]);
    p.slots.forEach(s=>vistos.add(s));
    console.log(`pa${k+1} rot${p.rot} caixa ${JSON.stringify(p.caixa)} slots ${p.slots} pts=${xs.length} fora=${bad.length} avisos=${g.avisos.length} topoMeio=${top} folhaTL=${tl} folhaBL=${bl}`);
    console.log('  ', instrucao(i,k,{nomeFolha:'X'}));
  });
  console.log('slots cobertos', vistos.size, '/', i.slots.length);
}
const m=PERFIS.megaS, P=PERFIS.p2s;
run(m,papel('A4'),papel('A6'));
run(m,papel('A4'),papel('A6'),{canto:'x0y0',dx:5,dy:5},4);
run(m,papel('A4'),papel('A5'));
run(m,papel('A4'),papel('A7'));
run(m,papel('A5'),papel('A6'));
run(m,papel('A4',{paisagem:true}),papel('A6'));
run(m,papel('A4'),papel('A6'),{canto:'x1y1'});
run(P,papel('A5'),papel('A6'));
run(P,papel('A4'),papel('A6'));
run(P,papel('A6'),papel('A7'));
run(m,{largura:300,altura:300},papel('A6'));
