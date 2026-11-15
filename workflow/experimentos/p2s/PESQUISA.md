# Bambu Lab P2S como plotter — pesquisa (2026-11-10)

**Status: melhoria futura. Nada foi implementado. Nada foi testado na máquina.**
Veredito da pesquisa: **viável**, com ajustes no exportador e um suporte de caneta físico.

## 1. O que muda no gerador (hoje feito para Marlin / Anycubic i3 Mega S)

Código atual: `src/exportar.js:4-5` (header e footer fixos, mesa 210×210, Z3 escreve, Z6 levanta).

1. Remover `M412 S0` (comando Marlin, sensor de filamento).
2. **Z offset novo.** Na P2S o bico toca a mesa no homing, então a caneta fica ~17 mm acima. Referências (strek e 3DPlotter): Z de desenho ≈ 17 (strek: 17,1), Z de levantar ≈ 20–25, piso de segurança 16 mm. Precisa de parâmetro "Z offset" no exportador.
3. **Homing sem a caneta.** O Z da série P faz o homing com o bico na mesa; caneta montada dá referência errada. Fluxo do strek: `G28` → estacionar na frente → `M400 U1` (pausa para montar a caneta) → plotar → estacionar atrás → `M400 U1` (pausa para tirar a caneta). O 3DPlotter fala numa janela de ~10 s no fundo/centro para encaixar o suporte. **Os dois fluxos diferem; confirmar na máquina.**
4. **Área útil menor que a mesa.** Mesa 256×256, mas o suporte/cabeça colide com paredes, porta e vidro. Limites legais do strek: X 48–255, Y 55–255 (≈207×200). O 3DPlotter anuncia 227×212. A mesa de 210×210 não cabe inteira: janela útil configurável (ex. 200×200 ou A5 paisagem 210×148).
5. Sem aquecimento nem extrusão: nada de `M104`/`M109` com valor, nada de movimento E, nunca desligar soft limits.
6. Footer: `G0 X0 Y200` precisa cair dentro da janela permitida; `M84` precisa ser verificado.
7. Ventoinhas em 0% (o ar move o papel e faz linha ondulada).
8. Velocidades de referência: strek usa 150 mm/s por padrão (Stabilo 300–400); MakerWorld sugere 30–60 mm/s para fluxo de tinta com marcador.

## 2. Envio do arquivo

- A P2S roda `.gcode` cru (confirmado pelo strek). Caminhos: microSD/USB, ou FTPS na rede local (precisa do access code da tela).
- Bambu Studio **não** serve para G-code cru segundo o strek; fallback dele é Orca Slicer em modo LAN-only. O 3DPlotter diz que dá para mandar `.3mf` por Studio/Handy. Fontes divergem.
- Para o start G-code não rodar nivelamento (`G29`) nem purga: cuidado se passar por slicer.

## 3. Suportes de caneta (adaptadores)

| Suporte | Para P2S? | Obs. |
|---|---|---|
| [P2S Pen Plotter Toolhead (CoquiMoran, MakerWorld 3127692)](https://makerworld.com/en/models/3127692-p2s-pen-plotter-toolhead) | Sim | Compatível com o sistema modular da Falu e com o tubo de caneta do Mister Anderson (baixar à parte). Página deu 403 na leitura: fotos, tempo de impressão e comentários NÃO verificados. |
| Sebas, P2S Pen Plotter Toolhead | Sim | Recomendado pelo 3DPlotter; encaixa por clipe. Alcance: não chega a 35 mm do fundo, 29 mm da direita, 9 mm da frente. Link direto não obtido. |
| Falu, Head Mount V1 (Séries X e P) | Sim | Suporte modular usado em P1S/X1. |
| [Edding 140S (MakerWorld 2593174)](https://makerworld.com/models/2593174) | Não | Para P1S/P1P; mola de caneta esferográfica 4 mm + 4 parafusos M3; X1C não confirmado. |
| Módulo com mola + jig do strek | Sim | Jig na borda direita/traseira da mesa; medir `edge_to_bed` e `lip_drop` na sua mesa antes de imprimir. |

Canetas citadas: Stabilo Point 88 (recomendada, 0,4 mm), Sakura Micron, Staedtler, Sharpie, gel; diâmetro 8–12 mm. A caneta deve sobrar ~4 cm acima do suporte (caneta longa reduz a área útil).
Mecânica: a mola é o "fusível" (pior caso = ponta de caneta estragada). Tirar o vidro de cima ou usar calço para dar curso à mola. Pressão: começar alto e descer em passos de 0,1 mm.

## 4. Imagens e vídeos

- **Não achei vídeo da P2S funcionando como plotter.** Nenhum link de vídeo da P2S foi obtido.
- Fotos do suporte na P2S: [3DPlotter, página da P2S](https://3dplotter.xyz/supported-printers/bambu-lab-p2s) (2 imagens; arquivos não abertos diretamente).
- Guia com passos e provável fotos: [Instructables P2S, 9 passos](https://www.instructables.com/Turn-Your-Bambu-Lab-P2S-Into-a-Pen-Plotter-in-45-M/) (veio vazio na leitura, abrir no navegador).
- Vídeos de outras impressoras: [A1 pen holder (YouTube)](https://www.youtube.com/watch?v=aGW6T6QSaKw), [Short genérico Bambu](https://www.youtube.com/shorts/rtXR4xc-AhU).

## 5. Fontes e confiança

- [strek (mhellevang)](https://github.com/mhellevang/strek) e [notes.md](https://github.com/mhellevang/strek/blob/main/docs/notes.md): projeto de comunidade, P2S, sem slicer. Não publica header/footer completo.
- `rebelthor/bambu-lab-pen-plotter` (citado pelo strek, **não lido**): provavelmente tem start/end G-code reais. Ler primeiro.
- [3DPlotter P2S](https://3dplotter.xyz/guides/bambu-lab-p2s): produto pago (€29,90); afirmações do vendedor.
- [BambuPlot (MakerWorld)](https://makerworld.com/en/models/2993044-bambuplot-free-pen-plotter-g-code-generator): gerador gratuito; autor diz que plotagem é experimental.
- [Specs da P2S](https://www.makerpoint.nl/en-gb/3d-printing/3d-printers/bambu-lab-all/bambu-lab-p2s-210000007716): 256³ mm, CoreXY.
- Não confirmado: comportamento exato de `M400 U1` na P2S; `M630`/`M1002` (só aparecem em projetos de A1).

## 6. Plano quando for retomar (~1–2 h de código + teste)

1. Ler `rebelthor/bambu-lab-pen-plotter` e copiar o header/footer reais.
2. Abrir o modelo do MakerWorld 3127692 no navegador: fotos, tempo de impressão, comentários.
3. Criar perfil "P2S" no exportador (header, footer, janela útil, Z offset, pausas `M400 U1`), mantendo Anycubic como padrão. Teste em `node --test` para o G-code gerado (sem `M104`, sem E, tudo dentro da janela).
4. Primeiro teste físico: cruz **sem caneta**, depois com caneta, ajustando `offsetX/Y` (item 3 do QUADRO, ainda não medido). Ficar ao lado da máquina.
