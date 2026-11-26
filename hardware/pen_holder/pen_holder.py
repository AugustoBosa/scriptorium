"""Porta-caneta com troca automática para a Anycubic i3 Mega S (Scriptorium). v3, 2026-11-21.

Duas variantes (mesmas peças, muda só como a morsa aperta; a caneta trava com cunha nas duas, v3):
  python pen_holder.py            -> "parafuso" (padrão, a escolhida): mandíbula móvel com M8 + garras ajustáveis com M8
  python pen_holder.py cunha      -> cunha na morsa (alternativa antiga)
Saída: saida/<variante>/ (STLs, STEP, visor da variante) e visor.html (as duas variantes em abas, quando as duas já foram geradas)
Dependências: pip install build123d bd_warehouse
Eixos: X = largura (esquerda/direita), Y = profundidade (frente da caneta = -Y, cabeça da impressora = +Y), Z = para cima.
Origem: eixo da caneta (x=0, y=0, centro do cabeçote em X), base do suporte (z=0).
Valores com "MEDIR" são provisórios. Tudo impresso, menos ímãs e elástico.

Peças (quantidade por sistema):
  bloco (1/caneta)      segura a caneta, corre em 2 varetas, puxado para baixo por elástico
  cunha (1/caneta)      entra por cima do bloco e trava a caneta
  vareta (2/caneta)     trilho do bloco, entra justa nas abas do suporte
  suporte (1/caneta)    placa de 3 mm com 2 "C"; costas com 6 pinos cônicos e 8 ímãs; 2 munhões laterais para a doca
  morsa (1)             "U" pela frente do cabeçote: placa negativa (encaixes + ímãs) + 2 mandíbulas nas laterais
  cunha_morsa (1)       [cunha] entra por cima na mandíbula esquerda e aperta o cabeçote (nada sai para os lados)
  mandibula (1)         [parafuso] mandíbula esquerda móvel, corre num rabo-de-andorinha em cima da barra
  parafuso_morsa (1)    [parafuso] botão M8 por cima do cabeçote: puxa a mandíbula (nada sai para os lados)
  base (1)              base de troca: vagas com 2 postes em "U" (munhões), 2 grampos na frente da mesa
  parafuso_mesa (2)     borboleta M10 dos grampos (fica embaixo da mesa)
"""
import sys
from pathlib import Path
from bd_warehouse.thread import IsoThread
from build123d import (Axis, Box, Compound, Cylinder, Mesher, Plane, Polygon, Pos, Rectangle, Rot, chamfer, export_step, export_stl, extrude,
                       loft)

# ---------- medidas provisórias (MEDIR) ----------
IMA_D, IMA_H = 3.0, 1.0          # CONFIRMADO: ímã de disco 3x1 mm (±0,1), 1 por cava (validação: 3,2 mm de fundo gastou ímã demais)
FOLGA_IMA_D, FOLGA_IMA_H = 0.4, 0.4  # validação v2: com 0,2 o ímã ficou para fora e afastou as placas (calibrar aqui)
CANETA_D = 8.0                   # MEDIR: BIC Cristal 1,0 (corpo sextavado, medida entre cantos)
CANETA_MIN = 6.8                 # MEDIR: menor espessura que a cunha precisa travar (BIC entre faces ~7,2; v4: cunha no fundo e ainda frouxa)
CABECA_W, CABECA_D, CABECA_H = 65, 72, 55  # v5, fotos do usuário: largura 65, altura da caixa 55 (medida), profundidade da tampa ~72 (MEDIR)
BICO_Y = 50                      # MEDIR: bico atrás da frente da caixa (fotos v5: embaixo da peça de trás; a v4 supunha 25 = meio da caixa)
BICO_ABAIXO = 5                  # foto: a caixa fica ~5 mm acima da mesa com o bico nela
FOLGA_X_FIM = 6                  # MEDIR: menor vão entre a lateral do cabeçote e a estrutura no fim do curso X
MESA_T = 6                       # foto + vendedores: Ultrabase (vidro + alumínio) ~6 mm
FOLGA = 0.3                      # folga de encaixe (ajustar após imprimir um teste)
PAREDE = 1.6                     # parede mínima: 4 voltas do bico 0,4
GANCHO, ORELHA_T, FOLGA_ORELHA = 8, 2.4, 0.5       # quanto o gancho do elástico sai da lateral (orelha 2,4 + barra 5,6)
BARRA_G = 3                      # espessura da barra do gancho (abaixo do assento do elástico)
FARPA, FARPA_W, FARPA_ANG = 3, 1.6, 20  # v5: ponta do gancho sobe 3 mm além do assento, face de dentro 20° para dentro
                                 # (v4: o V virava rampa para fora e o elástico escapava; a tensão agora leva o elástico para o fundo)
ELASTICO_L = 70                  # MEDIR: elástico de dinheiro achatado (mm)
DIST_ELASTICO = ELASTICO_L / 2   # 2 voltas: distância entre os ganchos com o bloco em repouso = metade do elástico
CABECA_VARETA_D, CABECA_VARETA_H = 7.6, 3  # cabeça da vareta (com fenda p/ chave) que encosta na aba de cima
VARETA_P, VARETA_TOPO = 0.75, 4.7  # vareta: rosca x0,75 (0,7 dá erro de arredondamento no bd_warehouse); M4 embaixo, Ø4,7 em cima,
                                  # meio liso Ø4 (TRILHO_D): passa pela rosca da aba de cima e corre no bloco com a folga de sempre
ROSCA_D, ROSCA_P, FOLGA_ROSCA = 8, 1.25, 0.5  # borboletas dos grampos M8x1,25; a rosca fêmea fica 0,5 mm maior

# ---------- (1) bloco + cunha + varetas ----------
BH = 25                          # altura = guia nas varetas (v4: Ø4,1 × 25 → a ponta anda ~±0,1 mm; ver aba Folga do visor)
TRILHO_X, TRILHO_D = 8.6, 4      # varetas em x = ±8,6: parede de 1,6 em volta da rosca de cima sem a aba encostar na caneta
FOLGA_TRILHO = 0.4               # furo do bloco Ø4,4 (v5: Ø4,1 travou; volta à folga da v1/v2, com a guia longa de 25)
CURSO = 6                        # quanto o bloco pode subir quando a ponta toca o papel (mínimo 6)
CUNHA_W = 8                      # largura do canal da cunha (X)
CUNHA_B, CUNHA_T = 1.2, 4.2      # vão entre a caneta (Ø8) e a parede do canal, embaixo e em cima (~6,8°: trava sozinha;
                                 # v4 tinha 3°: 1 mm de aperto pedia 18 mm de curso)
PAREDE_BLOCO = 1.2               # paredes do bloco: 3 voltas do bico 0,4 (cálculo da cunha: ~5 MPa, ver propostas_v4.html)
FURO_CANETA_EXTRA = 1.0          # furo da caneta 1 mm maior; a cunha empurra a caneta contra a parede de trás
R_CANETA = (CANETA_D + FOLGA) / 2                  # caneta encostada atrás: eixo em y = 0 (linha das varetas)
R_FURO = R_CANETA + FURO_CANETA_EXTRA / 2
Y_FURO = R_CANETA - R_FURO                         # centro do furo, 0,5 mm à frente do eixo da caneta
BY_TRAS = R_CANETA + PAREDE_BLOCO                  # costas do bloco: só a parede atrás da caneta
BY_FRENTE = -(R_CANETA + CUNHA_T + PAREDE_BLOCO)   # frente do bloco: canal da cunha + parede
BW = 2 * (TRILHO_X + (TRILHO_D + FOLGA_TRILHO) / 2 + PAREDE_BLOCO)  # largura mínima: parede fina por fora das varetas

# ---------- (2) suporte ----------
SW, ST = 25.6, 3                  # largura e espessura da placa traseira (v4: 3 mm; os furos da base saíram da placa)
BRACO_W, BRACO_H = 8.4, 4        # abas do "C" (largura em X, altura em Z)
VAO = BH + CURSO                 # vão entre as abas
SH = 2 * BRACO_H + VAO           # altura do suporte
Y_PLACA = BY_TRAS + 1            # face da frente da placa traseira (1 mm de folga para o bloco)
Y_COSTAS = Y_PLACA + ST          # costas do suporte (encosta na placa da morsa)
PLACA_T = 5                      # placa negativa da morsa
PINO, PINO_L = 3.5, PLACA_T      # pinos em losango (quadrado 3,5 girado 45°): as 4 faces a 45° imprimem deitadas sem suporte
CONE_K = 0.176                   # as 4 faces do pino afinam tan(10°)
FOLGA_CONE = 0.15                # teste 2026-11-25: 0,1 ficou justa, 0,2 um pouco folgada → meio-termo
CHANFRO_FURO = 0.8               # entrada do furo da morsa: come o pé de elefante (a morsa imprime com a placa na mesa)
PINO_X = 3                      # v5: 3,5 → 3 para o chanfro do furo não encostar na cava do ímã
PINOS = [(x, z) for x in (-PINO_X, PINO_X) for z in (4, SH / 2, SH - 4)]  # 6 pinos; os das bordas dão braço contra o giro
IMA_X = 9
IMAS = [(x, 4 + i * (SH - 8) / 3) for x in (-IMA_X, IMA_X) for i in range(4)]  # 8 cavas: use 4 (cantos) ou 8
# doca D2: munhões laterais (pinos horizontais) que descem em garfos "U" abertos em cima, nos postes da base
MUNHAO_D, MUNHAO_L = 3.5, 4      # diâmetro e comprimento (sai da lateral da aba de baixo)
FOLGA_MUNHAO = 0.5               # folga por lado no "U" e entre o poste e o suporte: o munhão desliza livre, não trava
MUNHAO_Y = 2.5 + 1 + PAREDE + FOLGA_MUNHAO + MUNHAO_D / 2  # o poste fica 1 mm atrás da orelha do gancho (y ≤ 2,5)
MUNHOES_Z = (MUNHAO_D / 2 + 0.3, SH - MUNHAO_D / 2 - 0.75)  # 2 munhões por lado, embaixo e em cima, no mesmo trilho vertical:
                                 # ao soltar, o ímã puxa na meia altura; com 1 munhão só embaixo o suporte girava e saía do "U"
POSTE_X0, POSTE_X1 = SW / 2 + FOLGA_MUNHAO, SW / 2 + MUNHAO_L + FOLGA_MUNHAO  # poste da base (distância ao eixo da vaga)
POSTE_H = MUNHOES_Z[-1] + MUNHAO_D / 2 + 2.2  # poste alto: trilho vertical guia os 2 munhões (≥ 2 mm acima do de cima)
GIRO_MAX = 2 * FOLGA_MUNHAO / (MUNHOES_Z[-1] - MUNHOES_Z[0])  # giro máximo do suporte na doca (rad), pela folga


# ---------- morsa ----------
JT = 2.5 if sys.argv[1:2] == ["cunha"] else 4  # parede das mandíbulas (v5 parafuso: 4, a mandíbula em C desce até a borda de baixo)
JAW_D, JAW_H = 20, 20            # profundidade (só os 20 mm da frente: longe da grade, do carro e da correia) e altura (cunha)
GANCHO_M, GANCHO_M_T = 3, 2.5    # garra: o gancho entra 3 mm sob a borda de baixo da caixa, 2,5 de espessura
GARRA_D, GARRA_TAB_T = 10, 8     # v5.1: garra ajustável atrás de cada mandíbula: tira de JT × 10 e aba de 8 com rosca M8
GARRA_FOLGA = 3                  # vão entre a aba e o calço com a caixa de 55: a garra sobe 3 e desce 2,5 (caixa de ~52 a ~57,5)
L_PARAF_GARRA, REBAIXO_GARRA = 16, 1.5  # M8 de empurrar da garra; a ponta assenta num rebaixo do calço (centra a garra em X e Y)
RECUO = 0.5                      # vão até a frente do cabeçote (v5: a frente é lisa; a grade fica na lateral esquerda)
LIP, LIP_T = 5, 3                # abas que apoiam no topo do cabeçote (referência de altura)
CM_B, CM_T = 1.0, 2.5            # vão da cunha da morsa embaixo e em cima (~2,9°: trava sozinha)
MARGEM_BICO = 5                  # o bico fica 5 mm acima da ponta da caneta
# variante parafuso: barra por cima da borda da frente do cabeçote, mandíbula esquerda corre num rabo-de-andorinha
BARRA_T, BARRA_D = 4, 12         # barra apoiada no topo (espessura, profundidade a partir da frente)
RABO = (5, 11, 3)                # rabo-de-andorinha no topo da barra: base, topo, altura (45°: imprime deitado sem suporte)
CARRO_W, CARRO_H = 28, 17        # carro da mandíbula móvel (largo: rosca do M8 cobre o curso todo)
JOGO, CURSO_M = 1.5, 16          # folga nominal da mandíbula e curso do parafuso: aceita cabeçote de CABECA_W - 14,5 a CABECA_W + 1,5
FOLGA_RABO = 0.5                 # validação: com FOLGA (0,3) o rabo-de-andorinha ficou justo demais
X_RABO0 = -CABECA_W / 2 - JOGO + CURSO_M + 0.5  # barra e rabo começam depois do fim do curso: a mandíbula não bate neles
BATENTE_W = 6

# ---------- base de troca ----------
FOLGA_VIZINHO = 3                # entre as cabeças dos ganchos de canetas vizinhas na base
PASSO = 2 * (SW / 2 + FOLGA_ORELHA + GANCHO) + FOLGA_VIZINHO
BASE_MAX = 210                   # largura da mesa da Mega S
VAGAS_MAX = int((BASE_MAX - 2 * (POSTE_X1 + 1)) // PASSO) + 1   # quantas vagas cabem na base
VAGAS = 4
BASE_D, BASE_H = 8, 14           # altura: o bico não chega perto da mesa ao largar a caneta; 5 mm apoiados na mesa
BY0 = MUNHAO_Y - MUNHAO_D / 2 - FOLGA_MUNHAO - PAREDE  # frente da barra = frente dos postes (imprime deitada nessa face)
GRAMPO_W, GRAMPO_D = 16, 18      # grampos ficam embaixo das vagas das pontas (nada além do comprimento da base)
GRAMPO_ROSCA = 8                 # espessura da mandíbula de baixo (comprimento da rosca)

VAR = sys.argv[1] if len(sys.argv) > 1 else "parafuso"   # v5.1: o usuário escolheu a variante parafuso
assert VAR in ("cunha", "parafuso"), "variante: cunha ou parafuso"
AQUI = Path(__file__).parent
SAIDA = AQUI / "saida" / VAR


def caixa(x0, y0, z0, x1, y1, z1):
    return Pos((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2) * Box(x1 - x0, y1 - y0, z1 - z0)


def cil_z(x, y, z0, z1, d):
    return Pos(x, y, (z0 + z1) / 2) * Cylinder(d / 2, z1 - z0)


def cil_x(y, z, x0, x1, d):
    return Pos((x0 + x1) / 2, y, z) * Rot(0, 90, 0) * Cylinder(d / 2, x1 - x0)


def cil_y(x, z, y0, y1, d):
    return Pos(x, (y0 + y1) / 2, z) * Rot(90, 0, 0) * Cylinder(d / 2, y1 - y0)


def gancho(x, s, zs, z0, apoio_em_cima):
    """Gancho p/ elástico na lateral, saindo para s*X a partir da face x. zs = altura do assento do elástico. Partes:
    - orelha de 2,4 mm (parede de dentro): no bloco ela sobe e afasta os ganchos;
    - barra de BARRA_G mm em Y de 3 mm; o elástico assenta na face de cima (bloco: puxa para baixo) ou de baixo (suporte);
    - farpa na ponta: passa FARPA mm do assento, com a face de dentro FARPA_ANG° para dentro (contra-saída).
    O elástico fica preso entre a orelha e a farpa. Bloco e suporte usam o mesmo x: o elástico trabalha em linha reta."""
    import math
    xa, xo = x + s * (ORELHA_T - 0.01), x + s * GANCHO
    xb, u = xo - s * FARPA_W, FARPA * math.tan(math.radians(FARPA_ANG))
    k = 1 if apoio_em_cima else -1                                   # sentido da farpa em Z
    v = [(xa, zs - k * BARRA_G), (xo, zs - k * BARRA_G), (xo, zs + k * FARPA), (xb - s * u, zs + k * FARPA), (xb, zs), (xa, zs)]
    oa, ob = sorted((x - s * 0.01, x + s * ORELHA_T))
    za, zb = sorted((z0, zs + k * FARPA))
    return caixa(oa, -2.5, za, ob, 2.5, max(zb, zs + BARRA_G)) + prisma(Plane.XZ, v, -1.5, 1.5)


def prisma(plano, pts, a0, a1):
    """Extruda o perfil pts (no plano YZ ou XZ) de a0 a a1 no eixo normal, qualquer que seja o sentido do polígono."""
    s = extrude(plano * Polygon(*pts, align=None), amount=a1 - a0)
    bb = s.bounding_box()
    return Pos(a0 - bb.min.X, 0, 0) * s if abs(plano.z_dir.X) > 0.5 else Pos(0, a0 - bb.min.Y, 0) * s  # normal em X (YZ) ou em Y (XZ)


def com_rosca(p, loc, d, passo, comp, externa, centro=True):
    """Une à peça p uma rosca ao longo do eixo +Z de loc (de z=0 a comp).
    ponytail: o OpenCascade falha ao unir roscas longas (~>10 mm) e devolve um sólido vazio; por isso a rosca entra em
    trechos de até 6 passos (a hélice continua igual, cada trecho começa num múltiplo do passo) e a sobra < 1 passo fica lisa."""
    n = int(comp / passo + 1e-6)
    z0 = (comp - n * passo) / 2 if centro else 0
    p = p.moved(loc.inverse())                                 # une no sistema da rosca (eixo Z): girada, a união também falha
    for k in range(0, n, 6):
        m = min(6, n - k)
        v0 = p.volume
        p = p + Pos(0, 0, z0 + k * passo) * IsoThread(major_diameter=d, pitch=passo, length=m * passo, external=externa,
                                                       end_finishes=("square", "square"))
        assert p.volume > v0, f"rosca M{d:g} não uniu"
    return p.moved(loc)


def rosca_femea(p, loc, comp, d=ROSCA_D, passo=ROSCA_P):
    """Abre um furo roscado de comprimento comp; loc posiciona o eixo +Z local (começa em z=0)."""
    d += FOLGA_ROSCA
    p -= loc * Pos(0, 0, comp / 2) * Cylinder(d / 2, comp + 0.02)
    return com_rosca(p, loc, d, passo, comp, False)


def parafuso(comp, d=ROSCA_D, passo=ROSCA_P, botao=24, botao_h=8):
    """Parafuso impresso: botão com 8 recortes (z 0..botao_h) + haste roscada de comprimento comp. Imprimir em pé, botão embaixo."""
    r = botao / 2
    p = Pos(0, 0, botao_h / 2) * Cylinder(r, botao_h)
    for i in range(8):
        p -= Rot(0, 0, i * 45) * Pos(r + r / 8, 0, botao_h / 2) * Cylinder(r / 4, botao_h + 2)
    p = chamfer(p.edges().group_by(Axis.Z)[-1], 0.6)
    raiz = d / 2 - 0.6134 * passo                             # raio da raiz da rosca ISO
    p += Pos(0, 0, botao_h + comp / 2) * Cylinder(raiz + 0.05, comp)
    return com_rosca(p, Pos(0, 0, botao_h), d, passo, comp, True, centro=False)


# ---------- peças ----------
K_CUNHA = (CUNHA_T - CUNHA_B) / BH
DZ_CUNHA = (CANETA_D - CANETA_MIN) / K_CUNHA             # quanto a cunha fica acima do fundo com a caneta de Ø8


def y_canal(z):
    """Parede da frente do canal da cunha (y negativo), mais longe da caneta em cima."""
    return -(R_CANETA + CUNHA_B + K_CUNHA * z)


def corpo_bloco(w):
    """Bloco da caneta (z 0..BH) com furo e canal da cunha. A cunha vale nas duas variantes (v2: o M6 espanou)."""
    p = caixa(-w / 2, BY_FRENTE, 0, w / 2, BY_TRAS, BH)
    p -= cil_z(0, Y_FURO, -1, BH + 1, 2 * R_FURO)              # furo 1 mm maior; a cunha leva a caneta para y = 0
    return p - prisma(Plane.YZ, [(0, -1), (y_canal(-1), -1), (y_canal(BH + 1), BH + 1), (0, BH + 1)], -(CUNHA_W + FOLGA) / 2, (CUNHA_W + FOLGA) / 2)


def bloco():
    p = corpo_bloco(BW)
    for x in (-TRILHO_X, TRILHO_X):
        p -= cil_z(x, 0, -1, BH + 1, TRILHO_D + FOLGA_TRILHO)    # corre na vareta
    for s in (-1, 1):
        x = s * (SW / 2 + FOLGA_ORELHA)                           # ganchos nas laterais, no mesmo x do gancho do suporte (evita torção)
        p += caixa(min(s * BW / 2, x), -2.5, Z0_ORELHA, max(s * BW / 2, x), 2.5, BH)  # ressalto: liga a orelha ao bloco, acima do gancho do suporte
        p += gancho(x, s, ASSENTO_BLOCO, Z0_ORELHA, True)  # orelha alta: elástico assenta em cima da barra
    return p


def cunha():
    """Cravada até o fundo (coordenadas do bloco): trava a caneta mais fina (CANETA_MIN) contra a parede de trás.
    Caneta mais grossa: a cunha para mais alto (DZ_CUNHA para a de Ø8)."""
    yi, zt = R_CANETA - CANETA_MIN, BH + 5
    pts = [(yi, 1), (y_canal(1), 1), (y_canal(zt), zt), (y_canal(zt) - 3, zt), (y_canal(zt) - 3, zt + 2.5), (yi, zt + 2.5)]
    return prisma(Plane.YZ, pts, -(CUNHA_W - FOLGA) / 2, (CUNHA_W - FOLGA) / 2)


ZONAS_VARETA = [(0, BRACO_H, TRILHO_D), (SH - BRACO_H, SH, VARETA_TOPO)]  # trechos roscados = abas do suporte (z0, z1, Ø macho)


def rosca_zonas(p, x, externa):
    """Rosca da vareta (ou das abas) só nos trechos ZONAS_VARETA, todas na mesma hélice: cada trecho começa num múltiplo
    do passo a partir de z=0, então a vareta rosqueia nas duas abas ao mesmo tempo."""
    for a, b, d in ZONAS_VARETA:
        z0 = -(-a // VARETA_P) * VARETA_P                          # 1º múltiplo do passo >= a
        n = int((b - z0) / VARETA_P + 1e-6)
        giro = Rot(0, 0, 0 if externa else 180)                  # medido: a fêmea do bd_warehouse nasce meia volta defasada da macho
        p = com_rosca(p, Pos(x, 0, z0) * giro, d if externa else d + FOLGA_ROSCA, VARETA_P, n * VARETA_P, externa, centro=False)
    return p


ASSENTO_SUP = FARPA                                     # assento do elástico no suporte (embaixo da barra; a farpa desce até z=0)
ASSENTO_BLOCO = DIST_ELASTICO + ASSENTO_SUP - BRACO_H   # assento no bloco (coord. do bloco), a DIST_ELASTICO do assento do suporte
Z0_ORELHA = ASSENTO_SUP + BARRA_G + 0.5 - BRACO_H       # orelha do bloco começa 0,5 mm acima do gancho do suporte


def vareta():
    """Pontas roscadas (prendem nas abas do suporte), meio liso Ø4 onde o bloco corre. Rosqueia por cima; a cabeça encosta na aba."""
    v = cil_z(0, 0, BRACO_H - 0.01, SH - BRACO_H + 0.01, TRILHO_D)
    v += cil_z(0, 0, SH - 0.01, SH + CABECA_VARETA_H, CABECA_VARETA_D) - caixa(-5, -0.6, SH + CABECA_VARETA_H - 1.5, 5, 0.6, SH + 5)
    for a, b, d in ZONAS_VARETA:
        v += cil_z(0, 0, a, b, d - 2 * 0.6134 * VARETA_P + 0.1)   # núcleo na raiz da rosca
    return rosca_zonas(v, 0, True)


def losango(x, z, y, lado):
    """Quadrado de lado `lado` girado 45° (vértices em cima e embaixo), no plano y."""
    return Plane(origin=(x, y, z), x_dir=(1, 0, 1), z_dir=(0, 1, 0)) * Rectangle(lado, lado)


def pino_conico(x, z, f=0.0, comp=PINO_L):
    """Pino de encaixe para trás (+Y) em losango: as 4 faces a 45° imprimem deitadas sem suporte e afinam CONE_K.
    f = folga por face (furo da morsa). Quem dá a referência é placa contra placa; o pino só centra."""
    d = comp * CONE_K
    return loft([losango(x, z, Y_COSTAS - 0.01, PINO + 2 * f), losango(x, z, Y_COSTAS + comp, PINO - 2 * d + 2 * f)])


def placa_traseira():
    """Placa traseira (z 0..SH) com a interface da morsa: 6 pinos cônicos e 8 cavas de ímã."""
    p = caixa(-SW / 2, Y_PLACA, 0, SW / 2, Y_COSTAS, SH)
    for x, z in PINOS:
        p += pino_conico(x, z)
    for x, z in IMAS:
        p -= cil_y(x, z, Y_COSTAS - IMA_H - FOLGA_IMA_H, Y_COSTAS + 1, IMA_D + FOLGA_IMA_D)
    return p


def suporte():
    p = placa_traseira()
    for x in (-TRILHO_X, TRILHO_X):
        for z0 in (0, SH - BRACO_H):
            p += caixa(x - BRACO_W / 2, -5, z0, x + BRACO_W / 2, Y_PLACA + 0.01, z0 + BRACO_H)
        for a, b, d in ZONAS_VARETA:
            p -= cil_z(x, 0, a - 1, b + 1, d + FOLGA_ROSCA)
        p = rosca_zonas(p, x, False)                           # vareta rosqueia nas 2 abas
    for s in (-1, 1):
        x = s * (TRILHO_X + BRACO_W / 2)
        p += caixa(min(x, x + s * FOLGA_ORELHA), -2.5, 0, max(x, x + s * FOLGA_ORELHA), 2.5, ASSENTO_SUP + BARRA_G)  # calço: mesmo x do gancho do bloco
        p += gancho(x + s * FOLGA_ORELHA, s, ASSENTO_SUP, 0, False)  # na aba de baixo; elástico assenta embaixo da barra
        for z in MUNHOES_Z:                                        # munhões da doca: embaixo e em cima (não deixam girar)
            p += cil_x(MUNHAO_Y, z, *sorted((s * (SW / 2 - 0.01), s * (SW / 2 + MUNHAO_L))), MUNHAO_D)
    return p


# morsa: "U" pela frente do cabeçote; nada passa da lateral além da parede (JT) e da cunha
CANETA_SAI = 12                                          # quanto a ponta sai abaixo do bloco (ajusta ao prender a caneta; v2: 18 dava momento demais)
Z_PONTA = BRACO_H - CANETA_SAI                           # ponta da caneta, bloco em repouso
ZT = Z_PONTA + MARGEM_BICO + BICO_ABAIXO + CABECA_H      # topo do cabeçote
Z_BICO = ZT - CABECA_H - BICO_ABAIXO
Y_CAB = Y_COSTAS + PLACA_T + RECUO                       # frente do cabeçote
XL, XR = -CABECA_W / 2, CABECA_W / 2                     # laterais do cabeçote
Z_MANDIB = max(ZT - JAW_H, POSTE_H + 1)              # v5: caixa de 55 baixou o topo; a ligação com a placa fica acima dos postes da doca
Y_CANAL = (Y_CAB + LIP + 1, Y_CAB + JAW_D - 2)           # trecho da mandíbula esquerda com o canal da cunha


def x_canal_morsa(z):
    """Parede inclinada da mandíbula esquerda: mais longe do cabeçote em cima."""
    return XL - (CM_B + (CM_T - CM_B) * (z - Z_MANDIB) / JAW_H)


X_MORSA = (x_canal_morsa(ZT + LIP_T) - JT, XR + JT) if VAR == "cunha" else (XL - JOGO - JT, XR + JT)
# variante parafuso
Z_BARRA = ZT + BARRA_T                                   # topo da barra
Y_BARRA = (Y_CAB, Y_CAB + BARRA_D)                       # barra sobre o cabeçote (só a borda da frente: longe do tubo do filamento)
X_CARRO = (XL - JOGO - JT, XL - JOGO + CARRO_W)
X_BATENTE = X_CARRO[1] + CURSO_M
ZS, YS = Z_BARRA + RABO[2] + FOLGA + 1 + 4.5, Y_CAB + BARRA_D / 2  # eixo do M8: 1 mm acima do rabo
L_PARAF_MORSA = BATENTE_W + CARRO_W - JT - 1           # fechada: a ponta para 1 mm antes da mandíbula (antes batia no fundo da rosca)


def rabo(x0, x1, folga=0.0):
    """Rabo-de-andorinha ao longo de X sobre a barra."""
    b, t, h = RABO[0] / 2 + folga, RABO[1] / 2 + folga, RABO[2] + folga
    yc = sum(Y_BARRA) / 2
    return prisma(Plane.YZ, [(yc - b, Z_BARRA - 0.01), (yc + b, Z_BARRA - 0.01), (yc + t, Z_BARRA + h), (yc - t, Z_BARRA + h)], x0, x1)


def morsa():
    return morsa_cunha() if VAR == "cunha" else morsa_parafuso()


def furo_pino(p, x, z, f=FOLGA_CONE):
    """Furo cônico passante para o pino (folga f por face) com chanfro de 45° na entrada (pé de elefante e raiz do pino)."""
    p -= pino_conico(x, z, f, PINO_L + 0.5)
    c = PINO + 2 * f
    return p - loft([losango(x, z, Y_COSTAS - 0.01, c + 2 * CHANFRO_FURO), losango(x, z, Y_COSTAS + CHANFRO_FURO, c - 2 * CHANFRO_FURO * CONE_K)])


FOLGAS_TESTE = (0.1, 0.2, 0.3, 0.4)  # teste de encaixe dos pinos: uma folga por furo


def teste_placa():
    """Pedaço da placa da morsa (5 mm) com 4 furos, um para cada FOLGAS_TESTE (da esquerda para a direita).
    Marca: 1 a 4 pontinhos na face de cima ao lado de cada furo (= 0,1 a 0,4). Imprime como a morsa: entrada na mesa."""
    xs = [(i - 1.5) * 12 for i in range(4)]
    p = caixa(-25, Y_COSTAS, 0, 25, Y_COSTAS + PLACA_T, 12)
    for i, (x, f) in enumerate(zip(xs, FOLGAS_TESTE)):
        p = furo_pino(p, x, 6, f)
        for k in range(i + 1):                                   # pontinhos na face de trás (fica para cima na impressão)
            p -= cil_y(x + 4.5, 2 + k * 2.2, Y_COSTAS + PLACA_T - 0.5, Y_COSTAS + PLACA_T + 1, 1.2)
    return p


def teste_pino():
    """Plaquinha de 3 mm (como o suporte) com 1 pino; imprime em pé, como o suporte (pino deitado)."""
    return caixa(-6, Y_COSTAS - ST, 0, 6, Y_COSTAS, 12) + pino_conico(0, 6)


def furos_placa(p):
    for x, z in PINOS:
        p = furo_pino(p, x, z)
    for x, z in IMAS:
        p -= cil_y(x, z, Y_COSTAS - 1, Y_COSTAS + IMA_H + FOLGA_IMA_H, IMA_D + FOLGA_IMA_D)
    return p


ZB_CAB = ZT - CABECA_H                                   # borda de baixo da caixa do cabeçote
PARAF_TAMPA = [(x, y) for x in (XL + 5, XR - 5) for y in (Y_CAB + 5, Y_CAB + CABECA_D - 5)]  # MEDIR: parafusos do topo
Y_C = (Y_COSTAS + PLACA_T, Y_CAB + JAW_D)               # trecho em Y das mandíbulas em C (atrás da placa: os postes da doca ficam na frente)


YS_GARRA = Y_CAB + 21                                    # eixo do M8 das garras: atrás do carro e do botão do M8 da morsa
CALCO_Y = (Y_CAB + 12, Y_CAB + 28)                      # calço sobre o topo da caixa, onde a ponta do M8 da garra empurra
                                                         # (começa em 12: encosta por face na barra e no carro; por aresta a malha falha)


def x_garra(s):
    """Face de dentro da mandíbula (encosta na caixa) e eixo do M8 da garra. s = +1 direita (fixa), -1 esquerda (móvel)."""
    xf = XR if s > 0 else XL - JOGO
    return xf, xf - s * 5


def calco(s):
    """Calço sobre o topo da caixa, na mandíbula, com rebaixo onde assenta a ponta do M8 da garra."""
    xf, xs = x_garra(s)
    a, b = sorted((xf, xf - s * 11))
    return caixa(a, CALCO_Y[0], ZT + (0 if s > 0 else 0.3), b, CALCO_Y[1], Z_BARRA) - cil_z(xs, YS_GARRA, Z_BARRA - REBAIXO_GARRA, Z_BARRA + 1, 9)


def garra(s):
    """Garra ajustável (v5.1, pedido do usuário), atrás da mandíbula: tira vertical colada na lateral da caixa, gancho embaixo
    (entra GANCHO_M sob a borda) e aba em cima com rosca M8. O M8 empurra o calço da mandíbula: apertar sobe a garra e prende
    a caixa entre o gancho e a morsa. Posição nominal: gancho encostado na caixa de CABECA_H."""
    xf, xs = x_garra(s)
    y0, y1 = Y_C[1], Y_C[1] + GARRA_D
    z_tab = Z_BARRA + GARRA_FOLGA
    a, b = sorted((xf, xf + s * JT))
    p = caixa(a, y0, ZB_CAB - GANCHO_M_T, b, y1, z_tab + GARRA_TAB_T)                       # tira
    a, b = sorted((xf - s * GANCHO_M, xf + s * JT))
    p += caixa(a, y0, ZB_CAB - GANCHO_M_T, b, y1, ZB_CAB)                                  # gancho sob a caixa
    a, b = sorted((xf, xs - s * 6.25))
    p += caixa(a, YS_GARRA - 6.25, z_tab, b, y1, z_tab + GARRA_TAB_T)                       # aba sobre a caixa (por fora só a tira)
    return rosca_femea(p, Pos(xs, YS_GARRA, z_tab), GARRA_TAB_T)


def livra_parafusos(p):
    """Rebaixo na peça que pousa no topo sobre a cabeça dos parafusos da tampa (v4: a barra assentava num deles e ficava torta)."""
    for x, y in PARAF_TAMPA:
        p -= cil_z(x, y, ZT - 1, ZT + PARAF_TAMPA_H + 0.5, PARAF_TAMPA_D + 2)
    return p


def parafuso_garra_montado(s, paraf):
    """M8 da garra na posição nominal: botão em cima, ponta no fundo do rebaixo do calço."""
    _, xs = x_garra(s)
    return Pos(xs, YS_GARRA, Z_BARRA - REBAIXO_GARRA + L_PARAF_GARRA + 5) * Rot(180, 0, 0) * paraf


def morsa_parafuso():
    """v5: mandíbulas da altura toda da caixa + garras ajustáveis atrás (gancho sob a borda). v4 só apertava as laterais e girava em X."""
    x0, x1 = X_MORSA
    p = caixa(-SW / 2, Y_COSTAS, 0, SW / 2, Y_COSTAS + PLACA_T, Z_BARRA)                 # placa negativa: só atrás do suporte
    p += caixa(SW / 2 - 0.01, Y_COSTAS, Z_MANDIB, x1, Y_COSTAS + PLACA_T, Z_BARRA)      # liga a mandíbula direita à placa
    p -= caixa(-SW / 2 + 6, Y_COSTAS - 1, SH + 3, SW / 2 - 6, Y_COSTAS + PLACA_T + 1, ZT - 3)  # janela: acima do suporte a placa só liga à barra
    p += caixa(X_RABO0, Y_COSTAS, ZT, x1, Y_BARRA[1], Z_BARRA)                          # barra sobre o topo
    p += caixa(XR, Y_COSTAS, Z_MANDIB, x1, Y_CAB + JAW_D, Z_BARRA)                      # mandíbula direita (fixa), em cima
    p += caixa(XR, Y_C[0], ZB_CAB, x1, Y_C[1], Z_MANDIB + 0.01)                          # ... desce até a borda de baixo
    p += calco(1)                                                                        # a garra direita empurra aqui
    p += caixa(X_BATENTE, Y_COSTAS, Z_BARRA, X_BATENTE + BATENTE_W, Y_BARRA[1] + 2, Z_BARRA + CARRO_H)  # batente
    p += rabo(X_RABO0, X_BATENTE)
    p -= cil_x(YS, ZS, X_BATENTE - 1, X_BATENTE + BATENTE_W + 1, 8 + 0.8)               # passagem do M8
    return livra_parafusos(furos_placa(p))


def mandibula():
    """Mandíbula esquerda móvel, na posição nominal (face interna a JOGO mm do cabeçote); leva a garra esquerda junto."""
    xa, xb = X_CARRO
    p = caixa(xa, Y_COSTAS, Z_BARRA, xb, Y_BARRA[1] + 2, Z_BARRA + CARRO_H)              # carro (passa por cima da placa)
    p += caixa(xa, Y_C[0], ZB_CAB, xa + JT, Y_C[1], Z_BARRA + CARRO_H)                  # mandíbula até a borda de baixo
    p += calco(-1)                                                                       # a garra esquerda empurra aqui
    p -= rabo(xa + JT, xb + 1, FOLGA_RABO)
    return rosca_femea(p, Pos(xb, YS, ZS) * Rot(0, -90, 0), xb - (xa + JT), 8, 1.25)


def morsa_cunha():
    x0, x1 = X_MORSA
    p = caixa(x0, Y_COSTAS, 0, x1, Y_COSTAS + PLACA_T, ZT + LIP_T)                      # placa negativa
    for a, b in ((x0 - 1, -SW / 2), (SW / 2, x1 + 1)):                                   # embaixo, só atrás do suporte: os postes da doca passam ao lado
        p -= caixa(a, Y_COSTAS - 1, -1, b, Y_COSTAS + PLACA_T + 1, POSTE_H + 1)
    p += caixa(x0, Y_COSTAS, ZT, x1, Y_CAB + LIP, ZT + LIP_T)                           # aba sobre a borda da frente do topo
    p += caixa(XR, Y_COSTAS, Z_MANDIB, x1, Y_CAB + JAW_D, ZT + LIP_T)                   # mandíbula direita
    p += caixa(XR - LIP, Y_CAB, ZT, XR, Y_CAB + JAW_D, ZT + LIP_T)                      # aba sobre o topo, direita
    p += caixa(x0, Y_COSTAS, Z_MANDIB, XL, Y_CAB + JAW_D, ZT + LIP_T)                   # mandíbula esquerda (maciça)
    z0, z1 = Z_MANDIB - 1, ZT + LIP_T + 1
    p -= prisma(Plane.XZ, [(XL + 0.01, z0), (x_canal_morsa(z0), z0), (x_canal_morsa(z1), z1), (XL + 0.01, z1)], *Y_CANAL)
    return livra_parafusos(furos_placa(p))


def cunha_morsa():
    """Na posição apertada: encosta no cabeçote (x = XL) e na parede inclinada; puxador de 4 mm acima da morsa."""
    xi, za, zt = XL + 0.05, Z_MANDIB + 1, ZT + LIP_T + 4
    pts = [(xi, za), (x_canal_morsa(za), za), (x_canal_morsa(zt), zt), (x_canal_morsa(zt) - 3, zt), (x_canal_morsa(zt) - 3, zt + 3), (xi, zt + 3)]
    return prisma(Plane.XZ, pts, Y_CANAL[0] + FOLGA, Y_CANAL[1] - FOLGA)


XS = [(i - (VAGAS - 1) / 2) * PASSO for i in range(VAGAS)]
BX0, BX1 = XS[0] - POSTE_X1 - 1, XS[-1] + POSTE_X1 + 1
ZB = -BASE_H - MESA_T - 3            # topo da mandíbula de baixo (3 mm de folga sob a mesa)
YC = BY0 + GRAMPO_D - 6.5            # eixo do parafuso do grampo (logo depois da borda da mesa)
GRAMPOS = [(BX0, BX0 + GRAMPO_W), (BX1 - GRAMPO_W, BX1)]
L_PARAF_MESA = GRAMPO_ROSCA + 3 + 7  # rosca + folga + 7 mm p/ mesas mais finas


def base():
    """Barra com 2 postes por vaga. Cada poste tem um "U" aberto em cima (com entrada chanfrada) onde desce o munhão do suporte.
    O "U" segura o suporte em Y quando a cabeça vai para trás (ímãs soltam) e quando volta (pinos entram); folga FOLGA_MUNHAO por lado."""
    p = caixa(BX0, BY0, -BASE_H, BX1, BY0 + BASE_D, 0)
    for xc in XS:
        p -= caixa(xc - 5.5, BY0 - 1, -BASE_H - 1, xc + 5.5, R_CANETA + 1, 0.01)            # rasgo: a caneta pousada passa na frente da barra
    for x0, x1 in zip(XS, XS[1:]):                                                         # entre as vagas a barra vira uma tira de 4 mm
        p -= caixa(x0 + POSTE_X1 + 2, BY0 - 1, -BASE_H - 1, x1 - POSTE_X1 - 2, BY0 + BASE_D + 1, -4)
    m = MUNHAO_D / 2 + FOLGA_MUNHAO                                                        # meia largura do "U"
    y0, y1 = MUNHAO_Y - m - PAREDE, MUNHAO_Y + m + PAREDE
    u = [(MUNHAO_Y - m, -1), (MUNHAO_Y + m, -1), (MUNHAO_Y + m, POSTE_H - 1.5), (MUNHAO_Y + m + 1.2, POSTE_H + 0.01),
         (MUNHAO_Y - m - 1.2, POSTE_H + 0.01), (MUNHAO_Y - m, POSTE_H - 1.5)]              # "U" com entrada chanfrada
    for xc in XS:
        for s in (-1, 1):
            a, b = sorted((xc + s * POSTE_X0, xc + s * POSTE_X1))
            p += caixa(a, min(y0, BY0), -BASE_H, b, max(y1, BY0 + BASE_D), POSTE_H)
            p -= prisma(Plane.YZ, u, a - 1, b + 1)
    # grampos: abraçam a borda da frente da mesa (a mesa fica em +Y, topo em z = -BASE_H)
    for a, b in GRAMPOS:
        p += caixa(a, BY0, ZB - GRAMPO_ROSCA, b, BY0 + 5, -BASE_H)                         # costas do C
        p += caixa(a, BY0, ZB - GRAMPO_ROSCA, b, BY0 + GRAMPO_D, ZB)                       # mandíbula de baixo
        p = rosca_femea(p, Pos((a + b) / 2, YC, ZB - GRAMPO_ROSCA), GRAMPO_ROSCA)
    return p


# ---------- Anycubic i3 Mega S (só para o visor e as conferências; MEDIR = lido nas fotos de 2026-11-24) ----------
VARETA_X_D = 8                   # varetas lisas do eixo X (LM8UU)
VARETAS_X_Z = (10, -28)          # MEDIR: eixos das varetas X em relação ao topo da caixa (ZT)
CARRO_T = 3                      # MEDIR: placa do carro atrás da tampa
ROL_D, ROL_L, ROL_X = 15, 24, 18 # rolamentos LM8UU e posição em X (2 por vareta)
CORREIA_Z = (-2, -10)            # MEDIR: as 2 voltas da correia GT2 (6 mm), em relação a ZT
CURSO_X = 210                    # o bico anda ±105 em volta do centro da mesa


PARAF_TAMPA_D, PARAF_TAMPA_H = 5.5, 2.5  # MEDIR: cabeça dos 4 parafusos da tampa, a 5 mm das bordas


def impressora():
    """Cabeçote e pórtico em coordenadas do sistema (cabeça no centro). Devolve (caixa, detalhes, carro, portico):
    caixa = tampa + peça de baixo + bico; detalhes = parafusos, engate do bowden e conector (posições MEDIR);
    carro = placa + 4 rolamentos; portico = 2 varetas X, correia e as pontas do X (motor e polia) no fim do curso."""
    import math
    y1 = Y_CAB + CABECA_D
    caixa_ = caixa(XL, Y_CAB, ZB_CAB, XR, y1, ZT)
    yg, zg = Y_CAB + 34, ZT - 33                                     # grade da ventoinha na lateral esquerda (centro)
    for r, n in ((0, 1), (7, 6), (13, 12)):
        for i in range(n):
            t = 2 * math.pi * i / n
            caixa_ -= cil_x(yg + r * math.cos(t), zg + r * math.sin(t), XL - 1, XL + 1.5, 4.5)
    caixa_ += caixa(-20, Y_CAB + 35, ZB_CAB - 2.5, 20, y1 - 2, ZB_CAB + 0.01)  # peça de baixo (duto da ventoinha), metade de trás (MEDIR)
    caixa_ += cil_z(0, Y_CAB + BICO_Y, Z_BICO, ZB_CAB - 2.49, 3)             # bico
    det = [cil_z(x, y, ZT - 0.01, ZT + PARAF_TAMPA_H, PARAF_TAMPA_D) for x, y in PARAF_TAMPA]  # parafusos da tampa
    det += [cil_z(10, Y_CAB + 50, ZT - 0.01, ZT + 7, 10), cil_z(10, Y_CAB + 50, ZT + 7, ZT + 40, 4)]     # engate e tubo do bowden
    det += [caixa(-6.5, Y_CAB + 12, ZT - 0.01, 9, Y_CAB + 20, ZT + 8)]                                     # conector verde
    carro = caixa(XL, y1, ZB_CAB + 8, XR, y1 + CARRO_T, ZT + VARETAS_X_Z[0] + 9)
    yv = y1 + CARRO_T + ROL_D / 2 + 1
    for zr in VARETAS_X_Z:
        for x in (-ROL_X, ROL_X):
            carro += cil_x(yv, ZT + zr, x - ROL_L / 2, x + ROL_L / 2, ROL_D)
    xe = CURSO_X / 2 + CABECA_W / 2 + FOLGA_X_FIM                    # face de dentro das pontas do X com o bico no fim do curso
    port = [cil_x(yv, ZT + zr, -xe - 20, xe + 20, VARETA_X_D) for zr in VARETAS_X_Z]
    port += [caixa(-xe, y1 + 5, ZT + zc - 3, xe, y1 + 6.5, ZT + zc + 3) for zc in CORREIA_Z]
    for s in (-1, 1):
        xa, xb = sorted((s * xe, s * (xe + 42)))
        port.append(caixa(xa, y1 - 10, ZT + VARETAS_X_Z[1] - 15, xb, yv + 25, ZT + VARETAS_X_Z[0] + 15))
    return caixa_, Compound(det), carro, Compound(port)


def caneta():
    """Só para o visor, em coordenadas do bloco: BIC com a ponta CANETA_SAI mm abaixo do bloco."""
    return cil_z(0, 0, 2 - CANETA_SAI, 110, CANETA_D) + Pos(0, 0, 1 - CANETA_SAI) * Cylinder(1.2, 2)


def exportar(s, nome, imprimir=True):
    """STL fino para imprimir em saida/<variante>/ e cópia grossa (leve) para o visor em saida/<variante>/visor/."""
    export_stl(s, str(SAIDA / "visor" / f"{nome}.stl"), tolerance=0.3, angular_tolerance=0.6)  # a grossa antes: o OCC guarda a malha
    if imprimir:
        export_stl(s, str(SAIDA / f"{nome}.stl"), tolerance=0.05, angular_tolerance=0.3)


# ---------- desenhos cotados (aba Desenhos do visor) ----------
VISTAS = {"Frente": ((0, -1, 0), (0, 0, 1)), "Lado direito": ((1, 0, 0), (0, 0, 1)), "Topo": ((0, 0, 1), (0, 1, 0)),
          "3D": ((1, -1.2, 0.9), (0, 0, 1))}          # direção de onde se olha e "para cima" da vista


def _n(v):
    return f"{v:.1f}".replace(".", ",").replace(",0", "")


def _cota(x0, y0, x1, y1, off, txt, fs):
    """Cota com linhas de chamada, linha de cota com setas e texto. (x0,y0)-(x1,y1) em coordenadas do SVG; off = deslocamento."""
    import math
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L * off, dx / L * off
    a, b = (x0 + nx, y0 + ny), (x1 + nx, y1 + ny)
    tx, ty = (a[0] + b[0]) / 2 + nx / abs(off) * fs * 0.4, (a[1] + b[1]) / 2 + ny / abs(off) * fs * 0.4
    rot = -90 if abs(dx) < abs(dy) else 0
    return (f'<path class="ch" d="M{x0:.2f},{y0:.2f}L{a[0]:.2f},{a[1]:.2f}M{x1:.2f},{y1:.2f}L{b[0]:.2f},{b[1]:.2f}"/>'
            f'<path class="co" d="M{a[0]:.2f},{a[1]:.2f}L{b[0]:.2f},{b[1]:.2f}" marker-start="url(#s)" marker-end="url(#s)"/>'
            f'<text x="{tx:.2f}" y="{ty:.2f}" font-size="{fs:.2f}" transform="rotate({rot} {tx:.2f} {ty:.2f})" dominant-baseline="middle">{txt}</text>')


def _caminhos(arestas):
    d = []
    for e in arestas:
        n = 2 if e.geom_type.name == "LINE" else max(4, min(24, int(e.length / 1.0)))
        pts = [e.position_at(i / (n - 1)) for i in range(n)]
        d.append("M" + "L".join(f"{q.X:.1f},{-q.Y:.1f}" for q in pts))
    return "".join(d)


def desenho(s):
    """Vistas ortogonais (frente, lado, topo) e isométrica de uma peça, com arestas ocultas tracejadas,
    cotas totais e os diâmetros de cada furo/pino redondo visto de frente naquela vista. Devolve {vista: svg}."""
    from build123d import GeomType, Vector
    bb = s.bounding_box()
    c = bb.center()
    tam = max(bb.size.X, bb.size.Y, bb.size.Z)
    fs = max(2.2, tam * 0.042)                                    # tamanho da letra acompanha a peça
    out = {}
    circs, centros = [], []                                       # círculos 3D únicos (raio, aresta)
    for e in s.edges().filter_by(GeomType.CIRCLE):
        cc, r = e.arc_center, e.radius
        if not any(abs(r - r2) < 0.01 and (cc - c2).length < 0.01 for r2, c2 in centros):
            centros.append((r, cc))
            circs.append((r, e))
    for nome, (d, up) in VISTAS.items():
        d = Vector(*d).normalized()
        vis, hid = s.project_to_viewport(c + d * 1000, up, c)
        xs = [q.X for e in vis for q in (e.position_at(0), e.position_at(0.5), e.position_at(1))]
        ys = [-q.Y for e in vis for q in (e.position_at(0), e.position_at(0.5), e.position_at(1))]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        g = [f'<path class="oc" d="{_caminhos(hid)}"/>' if hid else "", f'<path class="vi" d="{_caminhos(vis)}"/>']
        if nome != "3D":
            g.append(_cota(x0, y1, x1, y1, 2.2 * fs, _n(x1 - x0), fs))          # largura (embaixo)
            g.append(_cota(x1, y1, x1, y0, 2.2 * fs, _n(y1 - y0), fs))          # altura (à direita)
            vistos = {}
            for r, e in circs:                                               # furos e pinos redondos vistos de frente
                if abs(abs(e.normal().dot(d)) - 1) < 1e-3 and r >= 0.3:
                    q = e.arc_center - d * e.arc_center.dot(d)       # mesmo eixo (as 2 bordas de um furo) conta uma vez
                    lst = vistos.setdefault(round(2 * r, 1), [])
                    if not any((q - (f.arc_center - d * f.arc_center.dot(d))).length < 0.05 for f in lst):
                        lst.append(e)
            for i, (k, es) in enumerate(sorted(vistos.items())):
                pv, _ = es[0].project_to_viewport(c + d * 1000, up, c)      # o próprio círculo projetado: centro = centro da caixa
                if not pv:
                    continue
                q = Compound(pv).bounding_box().center()
                cx, cy, rr = q.X, -q.Y, k / 2
                tx, ty = x0 - fs * 1.2, y0 - fs * (1.4 + 1.3 * i)
                g.append(f'<path class="ch" d="M{cx - rr * 0.7:.2f},{cy - rr * 0.7:.2f}L{tx + fs * 4:.2f},{ty:.2f}L{tx:.2f},{ty:.2f}"/>'
                         f'<text x="{tx:.2f}" y="{ty - fs * 0.2:.2f}" font-size="{fs:.2f}">Ø{_n(k)}' + (f' ×{len(es)}' if len(es) > 1 else "") + "</text>")
            n_d = len(vistos)
        else:
            n_d = 0
        m = fs * 4
        vb = (x0 - m, y0 - m - fs * 1.3 * n_d, x1 - x0 + 2 * m + fs * 2, y1 - y0 + 2 * m + fs * 1.3 * n_d)
        out[nome] = (f'<svg viewBox="{vb[0]:.1f} {vb[1]:.1f} {vb[2]:.1f} {vb[3]:.1f}" data-w="{vb[2]:.1f}" role="img" aria-label="{nome}">'
                     f'<defs><marker id="s" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="{fs * 1.4:.1f}" markerHeight="{fs * 1.4:.1f}" '
                     f'markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,2L10,5L0,8z" class="seta"/></marker></defs>'
                     + "".join(g) + "</svg>")
    return out


def cotas():
    """Cotas de projeto de cada peça (as que não aparecem só pelo contorno). [texto, valor em mm ou graus]."""
    n = _n
    return {
        "bloco": [["altura (guia nas varetas)", n(BH)], ["furo das varetas", f"Ø{n(TRILHO_D + FOLGA_TRILHO)} a x=±{n(TRILHO_X)}"],
                  ["furo da caneta", f"Ø{n(2 * R_FURO)}, {n(-Y_FURO)} à frente do eixo"], ["parede", n(PAREDE_BLOCO)],
                  ["canal da cunha", f"{n(CUNHA_W + FOLGA)} de largura; vão {n(CUNHA_B)} embaixo → {n(CUNHA_T)} em cima"],
                  ["assento do elástico", f"z={n(ASSENTO_BLOCO)}, x=±{n(SW / 2 + FOLGA_ORELHA + ORELHA_T)}…{n(SW / 2 + FOLGA_ORELHA + GANCHO - FARPA_W)}"],
                  ["farpa do gancho", f"{n(FARPA)} acima do assento, {FARPA_ANG}° para dentro"]],
        "cunha": [["largura", n(CUNHA_W - FOLGA)], ["inclinação", f"{n(K_CUNHA * 57.3)}°"],
                  ["trava caneta de", f"{n(CANETA_MIN)} (no fundo) a {n(CANETA_D)} ({n(DZ_CUNHA)} acima do fundo)"]],
        "vareta": [["meio liso", f"Ø{n(TRILHO_D)}"], ["rosca de baixo", f"M{n(TRILHO_D)}×{VARETA_P}"],
                   ["rosca de cima", f"Ø{n(VARETA_TOPO)}×{VARETA_P}"], ["cabeça", f"Ø{n(CABECA_VARETA_D)} × {n(CABECA_VARETA_H)}"]],
        "suporte": [["placa", f"{n(SW)} × {n(SH)} × {n(ST)}"], ["abas", f"{n(BRACO_W)} × {n(BRACO_H)} a x=±{n(TRILHO_X)}"],
                    ["vão do bloco", f"{n(VAO)} (curso {n(CURSO)})"],
                    ["pinos losango", f"lado {n(PINO)} → {n(PINO - 2 * PINO_L * CONE_K)}, comprimento {n(PINO_L)}, x=±{n(PINO_X)}, z={', '.join(n(z) for z in sorted({z for _, z in PINOS}))}"],
                    ["cavas dos ímãs", f"Ø{n(IMA_D + FOLGA_IMA_D)} × {n(IMA_H + FOLGA_IMA_H)}, x=±{n(IMA_X)}"],
                    ["munhões", f"Ø{n(MUNHAO_D)} × {n(MUNHAO_L)}, y={n(MUNHAO_Y)}, z={', '.join(n(z) for z in MUNHOES_Z)}"],
                    ["assento do elástico", f"z={n(ASSENTO_SUP)}"]],
        "morsa": [["placa negativa", f"{n(PLACA_T)} de espessura"], ["furo dos pinos", f"folga {n(FOLGA_CONE)} por face, chanfro {n(CHANFRO_FURO)}"],
                  ["mandíbulas", f"parede {n(JT)}, {n(JAW_D)} de fundo a partir da frente"],
                  ["calço da garra", f"rebaixo Ø9 × {n(REBAIXO_GARRA)} para a ponta do M8, a {n(YS_GARRA - Y_CAB)} da frente"],
                  ["cabeçote", f"{n(CABECA_W)} × {n(CABECA_H)} (L × A)"]],
        "mandibula": [["carro", f"{n(CARRO_W)} × {n(CARRO_H)}"], ["rabo-de-andorinha", f"{n(RABO[0])}/{n(RABO[1])} × {n(RABO[2])}, folga {n(FOLGA_RABO)}"],
                      ["rosca", "M8×1,25"], ["curso", n(CURSO_M)]],
        "garra_dir": [["tira", f"{n(JT)} × {n(GARRA_D)}, atrás da mandíbula ({n(JAW_D)} da frente)"],
                      ["gancho", f"entra {n(GANCHO_M)} sob a caixa, {n(GANCHO_M_T)} de espessura"],
                      ["aba", f"{n(GARRA_TAB_T)} com rosca M8×1,25"],
                      ["ajuste", f"sobe {n(GARRA_FOLGA)}, desce {n(L_PARAF_GARRA - GARRA_TAB_T - GARRA_FOLGA - REBAIXO_GARRA - 1)}"]],
        "parafuso_garra": [["rosca", f"M8×1,25 × {n(L_PARAF_GARRA)}"], ["botão", "Ø14 × 5"]],
        "parafuso_morsa": [["rosca", f"M8×1,25 × {n(L_PARAF_MORSA)}"], ["botão", "Ø14 × 5"]],
        "cunha_morsa": [["inclinação", f"{n((CM_T - CM_B) / JAW_H * 57.3)}°"]],
        "base": [["vagas", f"{VAGAS} × passo {n(PASSO)}"], ["barra", f"{n(BASE_D)} × {n(BASE_H)}"], ["postes", f"altura {n(POSTE_H)}, U de {n(MUNHAO_D + 2 * FOLGA_MUNHAO)}"],
                 ["grampos", f"{n(GRAMPO_W)} × {n(GRAMPO_D)}, rosca M8×1,25"]],
        "parafuso_mesa": [["rosca", f"M8×1,25 × {n(L_PARAF_MESA)}"], ["botão", "Ø16 × 5"]],
        "cabecote": [["caixa (L × A × P)", f"{n(CABECA_W)} × {n(CABECA_H)} × {n(CABECA_D)}  (MEDIR P)"], ["bico", f"{n(BICO_Y)} atrás da frente, {n(BICO_ABAIXO)} abaixo da caixa (MEDIR)"],
                     ["varetas X", f"Ø{VARETA_X_D}, z = topo {'+'.join(n(z) for z in VARETAS_X_Z[:1])} e {n(VARETAS_X_Z[1])} (MEDIR)"],
                     ["correia", f"GT2 6 mm, z = topo {n(CORREIA_Z[0])} e {n(CORREIA_Z[1])} (MEDIR)"]],
    }


def visor(cenas, info, des=None):
    """Junta as malhas do visor e as medidas no modelo HTML (three.js) -> saida/<variante>/visor.html."""
    import base64, json
    stls = {n: base64.b64encode((SAIDA / "visor" / f"{n}.stl").read_bytes()).decode() for n in cenas}
    dados = dict(XS=XS, BASE_H=BASE_H, BASE_Y0=BY0, MESA_T=MESA_T, BRACO_H=BRACO_H, CURSO=CURSO, Z_PONTA=Z_PONTA,
                 GUIA=dict(VARETA=TRILHO_D, FURO=TRILHO_D + FOLGA_TRILHO, BH=BH, SAI=CANETA_SAI, BW=BW, X=TRILHO_X),
                 Y_COSTAS=Y_COSTAS, IMAS=IMAS, IMA_D=IMA_D,
                 ELASTICO=dict(X=SW / 2 + FOLGA_ORELHA + (ORELHA_T + GANCHO - FARPA_W) / 2, Z_SUP=ASSENTO_SUP, Z_BLOCO=ASSENTO_BLOCO),
                 V4=dict(furo=TRILHO_D + FOLGA_TRILHO, vareta=TRILHO_D, BH=BH, sai=CANETA_SAI, dy=Y_COSTAS, SH=SH, braco=BRACO_H,
                         pinosZ=sorted({z for x, z in PINOS}), pinoFolga=FOLGA_CONE, pinoL=PINO_L, imasZ=sorted({z for x, z in IMAS}),
                         parede=PAREDE_BLOCO, cunhaB=CUNHA_B, cunhaT=CUNHA_T, vaoCaneta=2 * R_FURO, bw=BW, sw=SW, st=ST, pinoX=PINO_X, curso=CURSO),
                 PINO_BASE_H=POSTE_H, Y_CAB=Y_CAB, ZT=ZT, CABECA_W=CABECA_W, CABECA_D=CABECA_D, CABECA_H=CABECA_H, Z_BICO=Z_BICO,
                 TITULO=f"Porta-caneta · Mega S · {VAR}", INFO=info, DES=des or {})
    html = (AQUI / "visor_modelo.html").read_text(encoding="utf8")
    html = html.replace("/*DADOS*/", json.dumps(dados)).replace("/*STLS*/", json.dumps(stls))
    (SAIDA / "visor.html").write_text(html, encoding="utf8")


# ---------- impressão (variante parafuso) ----------
MESA_IMP = 200                   # área útil da mesa da Mega S (210 mm menos a saia)
DEITAR = {                       # posição de impressão de cada peça (sem rotação = como no modelo)
    "morsa": Rot(90, 0, 0),             # deitada na placa negativa: furos dos pinos e dos ímãs virados para a mesa
    "teste_placa": Rot(90, 0, 0),       # igual à morsa: entrada dos furos na mesa
    "mandibula": Rot(0, -90, 0),        # deitada na face de fora: M8 e canal do rabo-de-andorinha ficam na vertical
    "base": Rot(90, 0, 0),              # deitada na frente: grampos sem suporte
    "vareta": Rot(180, 0, 0),           # em pé, cabeça na mesa
    "cunha": Rot(0, 90, 0),             # de lado: a rampa fica na vertical
}
MESAS = {                        # mesa -> [(peça, quantidade)]
    "0_validacao": [("morsa", 1), ("mandibula", 1), ("parafuso_morsa", 1),     # v5: morsa nova (a mandíbula da v4 não serve)
                    ("garra_dir", 1), ("garra_esq", 1), ("parafuso_garra", 2),   # v5.1: garras ajustáveis (imprimem em pé)
                    ("suporte", 1), ("bloco", 1), ("vareta", 2), ("cunha", 1)],
    "1_caneta": [("suporte", 1), ("bloco", 1), ("cunha", 1), ("vareta", 2)],  # imprimir 4x, uma em cada cor
    "2_morsa": [("morsa", 1), ("mandibula", 1), ("parafuso_morsa", 1), ("garra_dir", 1), ("garra_esq", 1), ("parafuso_garra", 2),
                ("parafuso_mesa", 2)],
    "3_base": [("base", 1)],
    "4_teste_pinos": [("teste_placa", 1), ("teste_pino", 2)],  # ~10 min: qual FOLGA_CONE deixa as placas encostarem
}


def mesas(pecas):
    """Arruma as peças em fileiras e grava saida/<variante>/impressao/<mesa>.3mf (um objeto por peça, já na posição de impressão)."""
    pasta = SAIDA / "impressao"
    pasta.mkdir(exist_ok=True)
    for nome, itens in MESAS.items():
        x = y = fila = larg = 0
        m, vol = Mesher(), 0
        for peca, qtd in itens:
            for i in range(qtd):
                s = DEITAR.get(peca, Rot(0, 0, 0)) * pecas[peca]
                bb = s.bounding_box()
                if x + bb.size.X > MESA_IMP:
                    x, y, fila = 0, y + fila + 6, 0
                s = Pos(x - bb.min.X, y - bb.min.Y, -bb.min.Z) * s
                s.label = peca if qtd == 1 else f"{peca}_{i + 1}"
                m.add_shape(s, linear_deflection=0.05, angular_deflection=0.3)
                x, fila, vol = x + bb.size.X + 6, max(fila, bb.size.Y), vol + s.volume
                larg = max(larg, x - 6)
        assert y + fila <= MESA_IMP, f"mesa {nome} não cabe na Mega S"
        m.write(str(pasta / f"{nome}.3mf"))
        print(f"mesa {nome:9s} {larg:5.0f} x {y + fila:5.0f} mm  {vol / 1000 * 1.24:5.1f} g de PLA maciço")


ABAS = {"parafuso": "Parafuso (escolhida)", "cunha": "Cunha"}


def visor_unico():
    """visor.html: uma aba por variante; cada aba carrega o visor da variante num iframe."""
    from html import escape
    feitos = {v: AQUI / "saida" / v / "visor.html" for v in ABAS}
    if not all(f.exists() for f in feitos.values()):
        return False
    botoes = "".join(f'<button role="tab" data-v="{v}">{t}</button>' for v, t in ABAS.items())
    quadros = "".join(f'<iframe data-v="{v}" title="{t}" srcdoc="{escape(f.read_text(encoding="utf8"))}" hidden></iframe>'
                      for (v, t), f in zip(ABAS.items(), feitos.values()))
    (AQUI / "visor.html").write_text(f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Porta-caneta · Mega S</title>
<style>
  :root {{ --bg: #eceae6; --ink: #1d1d1f; --line: #c9c6c0; --card: #fff; }}
  @media (prefers-color-scheme: dark) {{ :root {{ --bg: #18181a; --ink: #ececee; --line: #3a3a3e; --card: #232326; }} }}
  html, body {{ margin: 0; height: 100%; background: var(--bg); color: var(--ink); font: 14px system-ui, sans-serif; }}
  body {{ display: flex; flex-direction: column; }}
  nav {{ display: flex; gap: 6px; padding: 8px 12px; border-bottom: 1px solid var(--line); }}
  nav button {{ flex: 1; min-height: 44px; font: inherit; border-radius: 10px; border: 1px solid var(--line); background: var(--card); color: var(--ink); cursor: pointer; }}
  nav button[aria-selected="true"] {{ border-color: var(--ink); font-weight: 600; }}
  iframe {{ flex: 1; width: 100%; border: 0; }}
</style></head>
<body><nav role="tablist">{botoes}</nav>{quadros}
<script>
  const abas = [...document.querySelectorAll("[role=tab]")], quadros = [...document.querySelectorAll("iframe")];
  function abrir(v) {{
    abas.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.v === v)));
    quadros.forEach((f) => (f.hidden = f.dataset.v !== v));
    history.replaceState(null, "", "#" + v);
  }}
  abas.forEach((b) => b.addEventListener("click", () => abrir(b.dataset.v)));
  abrir(abas.some((b) => b.dataset.v === location.hash.slice(1)) ? location.hash.slice(1) : abas[0].dataset.v);
</script></body></html>
""", encoding="utf8")
    return True


def informacoes(sobra):
    """Rótulos da vista de peças do visor: [stl, título, descrição, cor]."""
    info = [["bloco", "① Bloco", "segura a caneta, corre nas varetas", "PLA"],
            ["cunha", "Cunha da caneta", "entra por cima e trava a caneta", "SCREW"]]
    info += [["vareta", "Vareta ×2", "trilho do bloco, Ø4", "ROD"], ["suporte", "② Suporte", "pinos cônicos, ímãs e munhões", "BLUE"]]
    if VAR == "cunha":
        info += [["morsa", "Morsa do cabeçote", f"U pela frente; {sobra}", "GREY"],
                 ["cunha_morsa", "Cunha da morsa", "aperta pela esquerda, por cima", "SCREW"]]
    else:
        info += [["morsa", "Morsa do cabeçote", f"barra no topo; {sobra}", "GREY"],
                 ["mandibula", "Mandíbula móvel", "corre no rabo-de-andorinha", "GREY"],
                 ["garra_dir", "Garra direita", "gancho ajustável sob a caixa", "GREY"],
                 ["garra_esq", "Garra esquerda", "gancho ajustável sob a caixa", "GREY"],
                 ["parafuso_garra", "Botão M8 da garra ×2", "sobe a garra até prender a caixa", "SCREW"],
                 ["parafuso_morsa", "Botão M8", "puxa a mandíbula, por cima do cabeçote", "SCREW"]]
    return info + [["parafuso_mesa", "Borboleta M10 ×2", "aperta os grampos", "SCREW"],
                   ["base", "Base de troca", f"{VAGAS} vagas com garfos em U, grampos na mesa", "DARKG"]]


if __name__ == "__main__":
    # conferências mínimas
    sobra_esq, sobra_dir = XL - X_MORSA[0], X_MORSA[1] - XR
    assert max(sobra_esq, sobra_dir) <= FOLGA_X_FIM, f"morsa sai {max(sobra_esq, sobra_dir):.1f} mm da lateral: bate na estrutura"
    assert max(SW, BW) <= CABECA_W and SW / 2 >= TRILHO_X + BRACO_W / 2, "suporte mais largo que o cabeçote ou estreito para as abas"
    assert VAO >= BH + CURSO, "curso do bloco"
    assert ST - IMA_H - FOLGA_IMA_H >= 1.2, "placa fina demais para a cava do ímã"
    assert MUNHAO_Y - MUNHAO_D / 2 >= -5 and MUNHAO_Y + MUNHAO_D / 2 <= Y_COSTAS, "munhão fora da lateral do suporte"
    assert GANCHO - ORELHA_T - FARPA_W - FARPA * 0.364 >= 2.5, "boca do gancho estreita para 2 voltas de elástico"
    assert POSTE_H < Z_MANDIB - 0.5, "poste da doca bate na mandíbula da morsa"
    assert BY0 + BASE_D > Y_COSTAS, "suporte não apoia na barra da base"
    assert SW / 2 - IMA_X - IMA_D / 2 >= PAREDE, "parede fina na borda do suporte"
    assert BASE_D > 5 + 2 and YC - (ROSCA_D + FOLGA_ROSCA) / 2 > BY0 + 5, "base não apoia na mesa ou a borboleta não pega embaixo da mesa"
    assert VAGAS <= VAGAS_MAX, f"só cabem {VAGAS_MAX} vagas"
    assert BRACO_H > 3, "orelha do bloco em repouso bate no gancho do suporte"
    assert TRILHO_X + CABECA_VARETA_D / 2 < SW / 2 + FOLGA_ORELHA and TRILHO_X - CABECA_VARETA_D / 2 > CANETA_D / 2, "cabeça da vareta pega na orelha ou na caneta"
    r_topo = (VARETA_TOPO + FOLGA_ROSCA) / 2
    assert min(SW / 2 - TRILHO_X, TRILHO_X - CANETA_D / 2 - 0.4) - r_topo >= PAREDE - 0.01, "parede fina em volta da rosca de cima"
    assert TRILHO_X - BRACO_W / 2 >= CANETA_D / 2 + 0.4 - 0.01, "aba encosta na caneta"
    assert TRILHO_D + 0.2 <= VARETA_TOPO + FOLGA_ROSCA - 2 * 0.5413 * VARETA_P, "meio Ø4 da vareta não passa pela rosca da aba de cima"
    assert IMA_X - (IMA_D + FOLGA_IMA_D) / 2 - PINO_X - (PINO + 2 * FOLGA_CONE + 2 * CHANFRO_FURO) * 0.7071 >= 0.3, "cava do ímã encosta no chanfro do furo do pino"
    r_trilho = (TRILHO_D + FOLGA_TRILHO) / 2
    assert (TRILHO_X ** 2 + Y_FURO ** 2) ** 0.5 - R_FURO - r_trilho >= PAREDE_BLOCO - 0.01 and BY_TRAS - r_trilho >= PAREDE_BLOCO, "parede fina entre a caneta e a vareta"
    assert CURSO >= 6, "curso do bloco menor que 6 mm"
    assert Z_BICO >= -BASE_H + 4, "bico perto demais da mesa ao largar a caneta"
    assert BX1 - BX0 <= BASE_MAX, "base de troca maior que a mesa"
    assert GRAMPO_W - ROSCA_D - FOLGA_ROSCA >= 6, "grampo estreito para a rosca"
    assert y_canal(BH) - BY_FRENTE >= PAREDE_BLOCO - 0.01 and Y_FURO - R_FURO > y_canal(0), "parede da frente fina ou furo da caneta invade a parede do canal"
    assert DZ_CUNHA <= 14, f"cunha precisa de {DZ_CUNHA:.0f} mm de curso: aumente CUNHA_T"
    assert K_CUNHA < 0.2 and (CM_T - CM_B) / JAW_H < 0.2, "cunha inclinada demais: não trava sozinha"
    assert BY_TRAS - TRILHO_D / 2 - FOLGA_TRILHO / 2 >= PAREDE, "parede fina atrás da vareta no bloco"
    assert PINO_L <= PLACA_T, "pino passa da placa da morsa e bate no cabeçote"
    if VAR == "parafuso":
        assert ZS - 4.5 - (Z_BARRA + RABO[2] + FOLGA) >= 0.8 and Z_BARRA + CARRO_H - ZS - 4.5 >= 2, "M8 fura o rabo ou o topo do carro"
        assert X_BATENTE + BATENTE_W + 6 <= XR, "botão do M8 passa da lateral direita do cabeçote"
        assert X_RABO0 >= X_CARRO[0] + JT + CURSO_M and X_CARRO[1] - X_RABO0 >= 6, "mandíbula bate na barra ou o carro sai do rabo"
        assert L_PARAF_MORSA - BATENTE_W - CURSO_M >= 6, "M8 com pouca rosca no carro aberto"
        assert X_RABO0 < -SW / 2, "barra não liga na placa"
    (SAIDA / "visor").mkdir(parents=True, exist_ok=True)
    for f in [*SAIDA.glob("*.stl"), *(SAIDA / "visor").glob("*.stl")]:
        f.unlink()
    pecas = {"bloco": bloco(), "cunha": cunha(), "vareta": vareta(), "suporte": suporte(), "morsa": morsa()}
    if VAR == "cunha":
        pecas |= {"cunha_morsa": cunha_morsa()}
    else:
        pecas |= {"mandibula": mandibula(), "parafuso_morsa": parafuso(L_PARAF_MORSA, 8, 1.25, 14, 5),
                  "garra_dir": garra(1), "garra_esq": garra(-1), "parafuso_garra": parafuso(L_PARAF_GARRA, 8, 1.25, 14, 5)}
    pecas |= {"base": base(), "parafuso_mesa": parafuso(L_PARAF_MESA, botao=16, botao_h=5)}
    choque = (pecas["suporte"] & Pos(TRILHO_X, 0, 0) * pecas["vareta"]).volume   # roscas na mesma hélice: vareta montada não invade a aba
    assert choque < 0.5, f"rosca da vareta fora de fase com a da aba ({choque:.2f} mm3)"
    fixo = Compound([pecas["suporte"], *(Pos(x, 0, 0) * pecas["vareta"] for x in (-TRILHO_X, TRILHO_X))])
    for dz in (BRACO_H + 0.05, BRACO_H + CURSO - 0.05):          # bloco em repouso e no topo do curso
        assert (fixo & Pos(0, 0, dz) * pecas["bloco"]).volume < 0.01, f"bloco bate no suporte/varetas em z={dz:.1f}"
    for nome, s in pecas.items():
        bb = s.bounding_box()
        assert s.is_valid and s.volume > 0, nome
        assert max(bb.size.X, bb.size.Y) <= 210, f"{nome} não cabe na mesa"
        exportar(s, nome, False)
        print(f"{nome:15s} {bb.size.X:6.1f} x {bb.size.Y:5.1f} x {bb.size.Z:5.1f} mm  {s.volume / 1000:5.1f} cm3")
    pousado = Pos(XS[0], 0, 0) * Compound([pecas["suporte"], Pos(0, 0, BRACO_H) * pecas["bloco"]])  # caneta largada na vaga 1
    assert (pousado & pecas["base"]).volume < 0.01, "suporte pousado bate na base (munhão no fundo do U ou poste no gancho)"
    for dy in (-FOLGA_MUNHAO + 0.05, FOLGA_MUNHAO - 0.05):       # munhão corre no "U" com folga nos 2 sentidos
        assert (Pos(XS[0], dy, 0) * pecas["suporte"] & pecas["base"]).volume < 0.01, "munhão sem folga no U"
    cabeca = [pecas["morsa"]] + [pecas[n] for n in ("mandibula", "garra_dir", "garra_esq") if n in pecas]
    for i, a in enumerate(cabeca):                               # peças da cabeça não se invadem (encostar pode)
        for b in cabeca[i + 1:]:
            assert (a & b).volume < 0.01, f"peças da morsa se invadem ({(a & b).volume:.2f} mm3)"
    for dy in (0, 6, 12):                                        # largando: a cabeça desce até a base e vai 12 mm para trás
        assert (Pos(XS[0], dy, 0) * Compound(cabeca) & pecas["base"]).volume < 0.01, f"morsa bate nos postes da doca (y+{dy})"
    imp_caixa, imp_det, imp_carro, imp_port = impressora()
    cabeca_toda = Compound(cabeca + [pecas["suporte"], Pos(0, 0, BRACO_H) * pecas["bloco"]])
    for nome, corpo, lim in (("tampa do cabeçote", imp_caixa, 0.05), ("carro e rolamentos", imp_carro, 0.01)):
        v = (cabeca_toda & corpo).volume
        assert v < lim, f"morsa/porta-caneta bate em {nome} ({v:.2f} mm3)"
    for x in (-CURSO_X / 2, 0, CURSO_X / 2):                     # cabeça nas 2 pontas e no meio: varetas X, correia e pontas do X
        v = (Pos(x, 0, 0) * cabeca_toda & imp_port).volume
        assert v < 0.01, f"morsa/porta-caneta bate nas varetas, correia ou ponta do X com a cabeça em x={x:+.0f} ({v:.2f} mm3)"
    v = (cabeca_toda & imp_det).volume
    if v > 0.01:
        print(f"AVISO: a morsa encosta em parafuso/engate/conector do topo ({v:.1f} mm3): posições MEDIR, conferir na impressora")
    print(f"caneta a {Y_CAB + BICO_Y:.1f} mm do bico em Y (BICO_Y = {BICO_Y} MEDIR; o app usa esse número)")
    print(f"doca: 2 munhões por lado a {MUNHOES_Z[-1] - MUNHOES_Z[0]:.0f} mm um do outro; giro máximo {GIRO_MAX * 57.3:.1f}° pela folga; "
          f"postes de {POSTE_H:.0f} mm (a cabeça passa sobre a base a {POSTE_H + 6:.0f} mm)")
    print(f"base: {VAGAS} vagas, passo {PASSO:.1f} mm, {BX1 - BX0:.0f} mm de comprimento; cabem no máximo {VAGAS_MAX} na mesa de {BASE_MAX} mm")
    print(f"[{VAR}] morsa: sobra {sobra_esq:.1f} mm à esquerda e {sobra_dir:.1f} mm à direita do cabeçote (limite {FOLGA_X_FIM} mm)")
    export_step(Compound(list(pecas.values())), str(SAIDA / "pecas.step"))
    # malhas montadas para o visor: v_cabeca (laranja), v_cabeca_cinza, v_bloco (laranja), v_mesa, v_varetas
    exportar(Pos(0, CANETA_MIN - CANETA_D, DZ_CUNHA) * pecas["cunha"], "v_bloco", False)  # visor: cunha onde para com a caneta de Ø8
    if VAR == "cunha":
        exportar(pecas["cunha_morsa"], "v_cabeca", False)
    else:
        exportar(Compound([Pos(X_BATENTE + BATENTE_W + 6, YS, ZS) * Rot(0, -90, 0) * pecas["parafuso_morsa"],
                           *(parafuso_garra_montado(s, pecas["parafuso_garra"]) for s in (1, -1))]), "v_cabeca", False)
        exportar(Compound([pecas["mandibula"], pecas["garra_dir"], pecas["garra_esq"]]), "v_cabeca_cinza", False)
    exportar(Compound([Pos((a + b) / 2, YC, -BASE_H - MESA_T - 8 - L_PARAF_MESA) * pecas["parafuso_mesa"] for a, b in GRAMPOS]), "v_mesa", False)
    exportar(Compound([Pos(x, 0, 0) * pecas["vareta"] for x in (-TRILHO_X, TRILHO_X)]), "v_varetas", False)
    exportar(caneta(), "caneta", False)
    exportar(Compound([imp_caixa, imp_det, imp_carro]), "v_cabecote", False)
    exportar(imp_port, "v_portico", False)
    for nome, s in pecas.items():                               # por último: o OCC guarda a malha fina e o visor ficaria pesado
        export_stl(s, str(SAIDA / f"{nome}.stl"), tolerance=0.05, angular_tolerance=0.3)
    if VAR == "parafuso":
        mesas(pecas | {"teste_placa": teste_placa(), "teste_pino": teste_pino()})  # suportes de impressão: o fatiador
    extras = [n for n in ("v_cabeca", "v_cabeca_cinza", "v_bloco", "v_mesa", "v_varetas", "caneta", "v_cabecote", "v_portico")
              if (SAIDA / "visor" / f"{n}.stl").exists()]
    cts, des = cotas(), {}
    for nome, sol in [*pecas.items(), ("cabecote", Compound([imp_caixa, imp_det, imp_carro]))]:
        des[nome] = dict(vistas=desenho(sol), cotas=cts.get(nome, []))
    visor(list(pecas) + extras, informacoes(f"sai {sobra_esq:.1f} / {sobra_dir:.1f} mm das laterais"), des)
    print(f"ok: saida/{VAR}/" + (" e visor.html (as duas variantes)" if visor_unico() else " (gere a outra variante para o visor.html)"))
