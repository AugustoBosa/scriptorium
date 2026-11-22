"""Porta-caneta com troca automática para a Anycubic i3 Mega S (Scriptorium). v3, 2026-11-21.

Duas variantes (mesmas peças, muda só como a caneta e a morsa apertam):
  python pen_holder.py            -> "cunha" (padrão): cunhas na caneta e na morsa
  python pen_holder.py parafuso   -> parafusos impressos: M6 na caneta, morsa com mandíbula móvel e M8
Saída: saida/<variante>/ (STLs, STEP, visor da variante) e visor.html (as duas variantes em abas, quando as duas já foram geradas)
Dependências: pip install build123d bd_warehouse
Eixos: X = largura (esquerda/direita), Y = profundidade (frente da caneta = -Y, cabeça da impressora = +Y), Z = para cima.
Origem: eixo da caneta (x=0, y=0, centro do cabeçote em X), base do suporte (z=0).
Valores com "MEDIR" são provisórios. Tudo impresso, menos ímãs e elástico.

Peças (quantidade por sistema):
  bloco (1/caneta)      segura a caneta, corre em 2 varetas, puxado para baixo por elástico
  cunha (1/caneta)      [cunha] entra por cima do bloco e trava a caneta
  parafuso_caneta       [parafuso] botão M6 pela frente do bloco
  vareta (2/caneta)     trilho do bloco, entra justa nas abas do suporte
  suporte (1/caneta)    placa traseira com 2 "C"; costas com 4 pinos quadrados, 4 ímãs, 2 furos p/ pinos da base
  morsa (1)             "U" pela frente do cabeçote: placa negativa (encaixes + ímãs) + 2 mandíbulas nas laterais
  cunha_morsa (1)       [cunha] entra por cima na mandíbula esquerda e aperta o cabeçote (nada sai para os lados)
  mandibula (1)         [parafuso] mandíbula esquerda móvel, corre num rabo-de-andorinha em cima da barra
  parafuso_morsa (1)    [parafuso] botão M8 por cima do cabeçote: puxa a mandíbula (nada sai para os lados)
  base (1)              base de troca: 4 vagas com pinos, 2 grampos na frente da mesa
  parafuso_mesa (2)     borboleta M10 dos grampos (fica embaixo da mesa)
"""
import sys
from pathlib import Path
from bd_warehouse.thread import IsoThread
from build123d import (Axis, Box, Compound, Cone, Cylinder, Mesher, Plane, Polygon, Pos, Rot, chamfer, export_step, export_stl, extrude)

# ---------- medidas provisórias (MEDIR) ----------
IMA_D, IMA_H = 3.0, 3.0          # CONFIRMADO: ímã de disco 3x1 mm (±0,1), 3 empilhados por cava
CANETA_D = 8.0                   # MEDIR: BIC Cristal 1,0 (corpo sextavado, medida entre cantos)
CABECA_W, CABECA_D, CABECA_H = 64.3, 50.3, 52.5  # MEDIR: caixa do cabeçote da Mega S (fonte: tampas da comunidade)
BICO_ABAIXO = 5                  # MEDIR: quanto o bico sai abaixo da caixa
FOLGA_X_FIM = 6                  # MEDIR: menor vão entre a lateral do cabeçote e a estrutura no fim do curso X
MESA_T = 8                       # MEDIR: espessura da mesa (alumínio + Ultrabase)
FOLGA = 0.3                      # folga de encaixe (ajustar após imprimir um teste)
PAREDE = 1.6                     # parede mínima: 4 voltas do bico 0,4
GANCHO = 4                       # quanto o gancho do elástico sai da face
ROSCA_D, ROSCA_P, FOLGA_ROSCA = 8, 1.25, 0.5  # borboletas dos grampos M8x1,25; a rosca fêmea fica 0,5 mm maior

# ---------- (1) bloco + cunha + varetas ----------
BW, BD, BH = 24, 18, 12          # largura, profundidade, altura (BD: rosca M6 de ~5 mm; BH: guia nas varetas)
TRILHO_X, TRILHO_D = 8, 4        # varetas impressas em x = ±8 (o mais perto da caneta que a parede deixa)
CURSO = 6                        # quanto o bloco pode subir quando a ponta toca o papel
CUNHA_W = 8                      # largura do canal da cunha (X)
CUNHA_B, CUNHA_T = 1.2, 2.6      # vão entre a caneta e a parede do canal, embaixo e em cima (~7°: trava sozinha)

# ---------- (2) suporte ----------
SW, ST = 24, 8                   # largura e espessura da placa traseira (= largura do bloco)
BRACO_W, BRACO_H = 7, 4          # abas do "C" (largura em X, altura em Z)
VAO = BH + CURSO                 # vão entre as abas
SH = 2 * BRACO_H + VAO           # altura do suporte
Y_PLACA = BD / 2 + 1             # face da frente da placa traseira (1 mm de folga para o bloco)
Y_COSTAS = Y_PLACA + ST          # costas do suporte (encosta na placa da morsa)
PINO, PINO_L = 4, 3              # pinos quadrados das costas
PINO_X = 3.5
PINOS = [(x, z) for x in (-PINO_X, PINO_X) for z in (9, SH - 9)]
IMA_X = 8.5
IMAS = [(x, z) for x in (-IMA_X, IMA_X) for z in (6, SH - 6)]
FURO2_X, FURO2_Y = 3.5, Y_PLACA + ST / 2     # furos verticais p/ os pinos da base de troca (entre os ímãs: a placa fica estreita)

# ---------- morsa ----------
JT, JAW_D, JAW_H = 2.5, 20, 20     # parede, profundidade e altura das mandíbulas (descem pela lateral do cabeçote)
PLACA_T, RECUO = 5, 2            # placa negativa; vão até a frente do cabeçote (grade da ventoinha)
LIP, LIP_T = 5, 3                # abas que apoiam no topo do cabeçote (referência de altura)
CM_B, CM_T = 1.0, 2.5            # vão da cunha da morsa embaixo e em cima (~2,9°: trava sozinha)
MARGEM_BICO = 5                  # o bico fica 5 mm acima da ponta da caneta
# variante parafuso: barra por cima da borda da frente do cabeçote, mandíbula esquerda corre num rabo-de-andorinha
BARRA_T, BARRA_D = 4, 12         # barra apoiada no topo (espessura, profundidade a partir da frente)
RABO = (5, 11, 3)                # rabo-de-andorinha no topo da barra: base, topo, altura (45°: imprime deitado sem suporte)
CARRO_W, CARRO_H = 18, 17        # carro da mandíbula móvel
JOGO, CURSO_M = 1, 4             # folga nominal da mandíbula e quanto ela ainda pode apertar
BATENTE_W = 6

# ---------- base de troca ----------
VAGAS, PASSO = 4, max(SW, BW) + 4  # 4 mm entre canetas vizinhas
BASE_D, BASE_H = 8, 14           # altura: o bico não chega perto da mesa ao largar a caneta; 5 mm apoiados na mesa
PINO_BASE_D, PINO_BASE_H = 4, 6  # pinos impressos que entram nos furos do suporte
GRAMPO_W, GRAMPO_D = 16, 18      # grampos ficam embaixo das vagas das pontas (nada além do comprimento da base)
GRAMPO_ROSCA = 8                 # espessura da mandíbula de baixo (comprimento da rosca)

VAR = sys.argv[1] if len(sys.argv) > 1 else "cunha"
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


def gancho(x, y, z):
    """Gancho p/ elástico: pino com cabeça saindo da face da frente (y) para -Y; não aumenta a largura da peça."""
    return cil_y(x, z, y - GANCHO + 1, y + 0.01, 2.5) + cil_y(x, z, y - GANCHO, y - GANCHO + 1, 3.6)


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
R_FURO = (CANETA_D + FOLGA) / 2
K_CUNHA = (CUNHA_T - CUNHA_B) / BH


def y_canal(z):
    """Parede da frente do canal da cunha (y negativo), mais longe da caneta em cima."""
    return -(R_FURO + CUNHA_B + K_CUNHA * z)


def bloco():
    p = caixa(-BW / 2, -BD / 2, 0, BW / 2, BD / 2, BH)
    p -= cil_z(0, 0, -1, BH + 1, CANETA_D + FOLGA)
    for x in (-TRILHO_X, TRILHO_X):
        p -= cil_z(x, 0, -1, BH + 1, TRILHO_D + 0.4)             # corre na vareta
    if VAR == "cunha":
        p -= prisma(Plane.YZ, [(0, -1), (y_canal(-1), -1), (y_canal(BH + 1), BH + 1), (0, BH + 1)], -(CUNHA_W + FOLGA) / 2, (CUNHA_W + FOLGA) / 2)
    else:
        p = rosca_femea(p, Pos(0, -BD / 2, BH / 2) * Rot(-90, 0, 0), BD / 2 - R_FURO + 0.01, 6, 1)  # M6 pela frente até a caneta
    for s in (-1, 1):
        p += gancho(s * (BW / 2 - 2.5), -BD / 2, BH / 2)
    return p


def cunha():
    """Na posição travada (coordenadas do bloco): encosta na caneta e na parede inclinada do canal."""
    yi, zt = -CANETA_D / 2 + 0.05, BH + 5
    pts = [(yi, 1), (y_canal(1), 1), (y_canal(zt), zt), (y_canal(zt) - 3, zt), (y_canal(zt) - 3, zt + 2.5), (yi, zt + 2.5)]
    return prisma(Plane.YZ, pts, -(CUNHA_W - FOLGA) / 2, (CUNHA_W - FOLGA) / 2)


L_PARAF_CANETA = BD / 2 - R_FURO + 2.5  # atravessa a parede e ainda tem 2,5 mm para apertar


def vareta():
    v = cil_z(0, 0, 0, SH, TRILHO_D)
    return chamfer(v.edges(), 0.4)


def suporte():
    p = caixa(-SW / 2, Y_PLACA, 0, SW / 2, Y_COSTAS, SH)
    for x in (-TRILHO_X, TRILHO_X):
        for z0 in (0, SH - BRACO_H):
            p += caixa(x - BRACO_W / 2, -5, z0, x + BRACO_W / 2, Y_PLACA + 0.01, z0 + BRACO_H)
        p -= cil_z(x, 0, -1, SH + 1, TRILHO_D - 0.1)            # vareta entra justa nas abas
    for s in (-1, 1):
        p += gancho(s * TRILHO_X, -5, BRACO_H / 2)
        p -= cil_z(s * FURO2_X, FURO2_Y, -1, SH + 1, PINO_BASE_D + 0.6)  # pinos da base de troca
    for x, z in PINOS:
        pino = caixa(x - PINO / 2, Y_COSTAS - 0.01, z - PINO / 2, x + PINO / 2, Y_COSTAS + PINO_L, z + PINO / 2)
        p += chamfer(pino.edges().group_by(Axis.Y)[-1], 0.6)
    for x, z in IMAS:
        p -= cil_y(x, z, Y_COSTAS - IMA_H - 0.2, Y_COSTAS + 1, IMA_D + 0.2)
    return p


# morsa: "U" pela frente do cabeçote; nada passa da lateral além da parede (JT) e da cunha
CANETA_SAI = 18                                          # quanto a ponta sai abaixo do bloco (ajusta ao prender a caneta)
Z_PONTA = BRACO_H - CANETA_SAI                           # ponta da caneta, bloco em repouso
ZT = Z_PONTA + MARGEM_BICO + BICO_ABAIXO + CABECA_H      # topo do cabeçote
Z_BICO = ZT - CABECA_H - BICO_ABAIXO
Y_CAB = Y_COSTAS + PLACA_T + RECUO                       # frente do cabeçote
XL, XR = -CABECA_W / 2, CABECA_W / 2                     # laterais do cabeçote
Z_MANDIB = ZT - JAW_H
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
L_PARAF_MORSA = BATENTE_W + CURSO_M + (CARRO_W - 4)     # passa o batente e entra 14 mm no carro


def rabo(x0, x1, folga=0.0):
    """Rabo-de-andorinha ao longo de X sobre a barra."""
    b, t, h = RABO[0] / 2 + folga, RABO[1] / 2 + folga, RABO[2] + folga
    yc = sum(Y_BARRA) / 2
    return prisma(Plane.YZ, [(yc - b, Z_BARRA - 0.01), (yc + b, Z_BARRA - 0.01), (yc + t, Z_BARRA + h), (yc - t, Z_BARRA + h)], x0, x1)


def morsa():
    return morsa_cunha() if VAR == "cunha" else morsa_parafuso()


def furos_placa(p):
    for x, z in PINOS:
        c = PINO + 2 * FOLGA
        p -= caixa(x - c / 2, Y_COSTAS - 1, z - c / 2, x + c / 2, Y_COSTAS + PINO_L + 0.5, z + c / 2)
    for x, z in IMAS:
        p -= cil_y(x, z, Y_COSTAS - 1, Y_COSTAS + IMA_H + 0.2, IMA_D + 0.2)
    return p


def morsa_parafuso():
    x0, x1 = X_MORSA
    p = caixa(-SW / 2, Y_COSTAS, 0, SW / 2, Y_COSTAS + PLACA_T, Z_BARRA)                 # placa negativa: só atrás do suporte
    p += caixa(SW / 2 - 0.01, Y_COSTAS, Z_MANDIB, x1, Y_COSTAS + PLACA_T, Z_BARRA)      # liga a mandíbula direita à placa
    p -= caixa(-SW / 2 + 6, Y_COSTAS - 1, SH + 3, SW / 2 - 6, Y_COSTAS + PLACA_T + 1, ZT - 3)  # janela: acima do suporte a placa só liga à barra
    p += caixa(XL + 0.5, Y_COSTAS, ZT, x1, Y_BARRA[1], Z_BARRA)                         # barra sobre o topo
    p += caixa(XR, Y_COSTAS, Z_MANDIB, x1, Y_CAB + JAW_D, Z_BARRA)                      # mandíbula direita (fixa)
    p += caixa(X_BATENTE, Y_COSTAS, Z_BARRA, X_BATENTE + BATENTE_W, Y_BARRA[1] + 2, Z_BARRA + CARRO_H)  # batente
    p += rabo(XL + 0.5, X_BATENTE)
    p -= cil_x(YS, ZS, X_BATENTE - 1, X_BATENTE + BATENTE_W + 1, 8 + 0.8)               # passagem do M8
    return furos_placa(p)


def mandibula():
    """Mandíbula esquerda móvel, na posição nominal (face interna a JOGO mm do cabeçote)."""
    xa, xb = X_CARRO
    p = caixa(xa, Y_COSTAS, Z_BARRA, xb, Y_BARRA[1] + 2, Z_BARRA + CARRO_H)              # carro (passa por cima da placa)
    p += caixa(xa, Y_CAB + 0.5, Z_MANDIB, xa + JT, Y_CAB + JAW_D, Z_BARRA + CARRO_H)    # mandíbula
    p -= rabo(xa + JT, xb + 1, FOLGA)
    return rosca_femea(p, Pos(xb, YS, ZS) * Rot(0, -90, 0), xb - (xa + JT), 8, 1.25)


def morsa_cunha():
    x0, x1 = X_MORSA
    p = caixa(x0, Y_COSTAS, 0, x1, Y_COSTAS + PLACA_T, ZT + LIP_T)                      # placa negativa
    p += caixa(x0, Y_COSTAS, ZT, x1, Y_CAB + LIP, ZT + LIP_T)                           # aba sobre a borda da frente do topo
    p += caixa(XR, Y_COSTAS, Z_MANDIB, x1, Y_CAB + JAW_D, ZT + LIP_T)                   # mandíbula direita
    p += caixa(XR - LIP, Y_CAB, ZT, XR, Y_CAB + JAW_D, ZT + LIP_T)                      # aba sobre o topo, direita
    p += caixa(x0, Y_COSTAS, Z_MANDIB, XL, Y_CAB + JAW_D, ZT + LIP_T)                   # mandíbula esquerda (maciça)
    z0, z1 = Z_MANDIB - 1, ZT + LIP_T + 1
    p -= prisma(Plane.XZ, [(XL + 0.01, z0), (x_canal_morsa(z0), z0), (x_canal_morsa(z1), z1), (XL + 0.01, z1)], *Y_CANAL)
    return furos_placa(p)


def cunha_morsa():
    """Na posição apertada: encosta no cabeçote (x = XL) e na parede inclinada; puxador de 4 mm acima da morsa."""
    xi, za, zt = XL + 0.05, Z_MANDIB + 1, ZT + LIP_T + 4
    pts = [(xi, za), (x_canal_morsa(za), za), (x_canal_morsa(zt), zt), (x_canal_morsa(zt) - 3, zt), (x_canal_morsa(zt) - 3, zt + 3), (xi, zt + 3)]
    return prisma(Plane.XZ, pts, Y_CANAL[0] + FOLGA, Y_CANAL[1] - FOLGA)


XS = [(i - (VAGAS - 1) / 2) * PASSO for i in range(VAGAS)]
BX0, BX1 = XS[0] - SW / 2 - 1, XS[-1] + SW / 2 + 1
BY0 = FURO2_Y - BASE_D / 2
ZB = -BASE_H - MESA_T - 3            # topo da mandíbula de baixo (3 mm de folga sob a mesa)
YC = BY0 + GRAMPO_D - 6.5            # eixo do parafuso do grampo (logo depois da borda da mesa)
GRAMPOS = [(BX0, BX0 + GRAMPO_W), (BX1 - GRAMPO_W, BX1)]
L_PARAF_MESA = GRAMPO_ROSCA + 3 + 7  # rosca + folga + 7 mm p/ mesas mais finas


def base():
    p = caixa(BX0, BY0, -BASE_H, BX1, BY0 + BASE_D, 0)
    for x0, x1 in zip(XS, XS[1:]):                                                         # entre as vagas a barra vira uma tira de 5 mm
        p -= caixa(x0 + FURO2_X + 4, BY0 - 1, -BASE_H - 1, x1 - FURO2_X - 4, BY0 + BASE_D + 1, -4)
    for xc in XS:
        for s in (-1, 1):
            x = xc + s * FURO2_X
            p += cil_z(x, FURO2_Y, -0.01, PINO_BASE_H - 2, PINO_BASE_D)
            quilha = [(-0.63, -2.2), (0.63, -2.2), (1.2, -1.2), (-1.2, -1.2)]  # lado -Y vira o de baixo na impressão; cabe no furo (raio 2,3)
            p += extrude(Pos(x, FURO2_Y, -0.01) * Polygon(*quilha, align=None), amount=PINO_BASE_H - 2)
            p += Pos(x, FURO2_Y, PINO_BASE_H - 1) * Cone(PINO_BASE_D / 2, 1, 2)          # ponta cônica centraliza
    # grampos: abraçam a borda da frente da mesa (a mesa fica em +Y, topo em z = -BASE_H)
    for a, b in GRAMPOS:
        p += caixa(a, BY0, ZB - GRAMPO_ROSCA, b, BY0 + 5, -BASE_H)                         # costas do C
        p += caixa(a, BY0, ZB - GRAMPO_ROSCA, b, BY0 + GRAMPO_D, ZB)                       # mandíbula de baixo
        p = rosca_femea(p, Pos((a + b) / 2, YC, ZB - GRAMPO_ROSCA), GRAMPO_ROSCA)
    return p


def caneta():
    """Só para o visor, em coordenadas do bloco: BIC com a ponta CANETA_SAI mm abaixo do bloco."""
    return cil_z(0, 0, 2 - CANETA_SAI, 110, CANETA_D) + Pos(0, 0, 1 - CANETA_SAI) * Cylinder(1.2, 2)


def exportar(s, nome, imprimir=True):
    """STL fino para imprimir em saida/<variante>/ e cópia grossa (leve) para o visor em saida/<variante>/visor/."""
    export_stl(s, str(SAIDA / "visor" / f"{nome}.stl"), tolerance=0.3, angular_tolerance=0.6)  # a grossa antes: o OCC guarda a malha
    if imprimir:
        export_stl(s, str(SAIDA / f"{nome}.stl"), tolerance=0.05, angular_tolerance=0.3)


def visor(cenas, info):
    """Junta as malhas do visor e as medidas no modelo HTML (three.js) -> saida/<variante>/visor.html."""
    import base64, json
    stls = {n: base64.b64encode((SAIDA / "visor" / f"{n}.stl").read_bytes()).decode() for n in cenas}
    dados = dict(XS=XS, FURO2_Y=FURO2_Y, BASE_H=BASE_H, BASE_Y0=BY0, MESA_T=MESA_T, BRACO_H=BRACO_H, CURSO=CURSO,
                 PINO_BASE_H=PINO_BASE_H, Y_CAB=Y_CAB, ZT=ZT, CABECA_W=CABECA_W, CABECA_D=CABECA_D, CABECA_H=CABECA_H, Z_BICO=Z_BICO,
                 TITULO=f"Porta-caneta · Mega S · {VAR}", INFO=info)
    html = (AQUI / "visor_modelo.html").read_text(encoding="utf8")
    html = html.replace("/*DADOS*/", json.dumps(dados)).replace("/*STLS*/", json.dumps(stls))
    (SAIDA / "visor.html").write_text(html, encoding="utf8")


# ---------- impressão (variante parafuso) ----------
MESA_IMP = 200                   # área útil da mesa da Mega S (210 mm menos a saia)
DEITAR = {                       # posição de impressão de cada peça (sem rotação = como no modelo)
    "morsa": Rot(90, 0, 0),             # deitada na placa negativa: furos dos pinos e dos ímãs virados para a mesa
    "mandibula": Rot(0, -90, 0),        # deitada na face de fora: M8 e canal do rabo-de-andorinha ficam na vertical
    "base": Rot(90, 0, 0),              # deitada na frente: grampos sem suporte
}
MESAS = {                        # mesa -> [(peça, quantidade)]
    "1_caneta": [("suporte+apoio", 1), ("bloco", 1), ("parafuso_caneta", 1), ("vareta", 2)],  # imprimir 4x, uma em cada cor
    "2_morsa": [("morsa", 1), ("mandibula", 1), ("parafuso_morsa", 1), ("parafuso_mesa", 2)],
    "3_base": [("base", 1)],
}


APOIO_VAO = 0.2                  # vão de 1 camada (0,2 mm) entre o apoio e a peça: o apoio sai com a mão


def apoio_suporte():
    """Apoio descartável sob as 2 abas de cima do suporte: tubo de parede 0,8 mm, solto da peça (vão de 1 camada em cima e embaixo)."""
    z0, z1 = BRACO_H + APOIO_VAO, SH - BRACO_H - APOIO_VAO
    tubos = []
    for x in (-TRILHO_X, TRILHO_X):
        fora = caixa(x - BRACO_W / 2 + 0.4, -5 + 0.4, z0, x + BRACO_W / 2 - 0.4, Y_PLACA - 0.4, z1)
        tubos.append(fora - caixa(x - BRACO_W / 2 + 1.2, -5 + 1.2, z0 - 1, x + BRACO_W / 2 - 1.2, Y_PLACA - 1.2, z1 + 1))
    return tubos


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


ABAS = {"cunha": "Cunha (padrão)", "parafuso": "Parafuso"}


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
    info = [["bloco", "① Bloco", "segura a caneta, corre nas varetas", "PLA"]]
    if VAR == "cunha":
        info += [["cunha", "Cunha da caneta", "entra por cima e trava a caneta", "SCREW"]]
    else:
        info += [["parafuso_caneta", "Botão M6", "aperta a caneta pela frente", "SCREW"]]
    info += [["vareta", "Vareta ×2", "trilho do bloco, Ø4", "ROD"], ["suporte", "② Suporte", "pinos e ímãs atrás", "BLUE"]]
    if VAR == "cunha":
        info += [["morsa", "Morsa do cabeçote", f"U pela frente; {sobra}", "GREY"],
                 ["cunha_morsa", "Cunha da morsa", "aperta pela esquerda, por cima", "SCREW"]]
    else:
        info += [["morsa", "Morsa do cabeçote", f"barra no topo; {sobra}", "GREY"],
                 ["mandibula", "Mandíbula móvel", "corre no rabo-de-andorinha", "GREY"],
                 ["parafuso_morsa", "Botão M8", "puxa a mandíbula, por cima do cabeçote", "SCREW"]]
    return info + [["parafuso_mesa", "Borboleta M10 ×2", "aperta os grampos", "SCREW"],
                   ["base", "Base de troca", "4 vagas com pinos, grampos na mesa", "DARKG"]]


if __name__ == "__main__":
    # conferências mínimas
    sobra_esq, sobra_dir = XL - X_MORSA[0], X_MORSA[1] - XR
    assert max(sobra_esq, sobra_dir) <= FOLGA_X_FIM, f"morsa sai {max(sobra_esq, sobra_dir):.1f} mm da lateral: bate na estrutura"
    assert max(SW, BW) <= CABECA_W and SW / 2 >= TRILHO_X + BRACO_W / 2, "suporte mais largo que o cabeçote ou estreito para as abas"
    assert VAO >= BH + CURSO, "curso do bloco"
    assert IMA_X - IMA_D / 2 - FURO2_X - (PINO_BASE_D + 0.6) / 2 >= 1, "ímã encosta no furo do pino da base"
    assert SW / 2 - IMA_X - IMA_D / 2 >= PAREDE, "parede fina na borda do suporte"
    assert BASE_D > 5 + 2 and YC - (ROSCA_D + FOLGA_ROSCA) / 2 > BY0 + 5, "base não apoia na mesa ou a borboleta não pega embaixo da mesa"
    assert PASSO - max(SW, BW) >= 3 and BW / 2 - 2.5 - 2 >= 11 / 2 + 1, "canetas vizinhas se tocam ou o gancho pega no botão M6"
    assert IMA_X - IMA_D / 2 - (PINO_X + PINO / 2) >= 1.5, "ímã encosta no pino quadrado"
    assert (ST - PINO_BASE_D - 0.6) / 2 >= PAREDE, "parede fina em volta do furo do pino da base"
    assert TRILHO_X - R_FURO - (TRILHO_D + 0.4) / 2 >= PAREDE and BW / 2 - TRILHO_X - (TRILHO_D + 0.4) / 2 >= PAREDE, "parede fina entre a caneta e a vareta"
    assert Z_BICO >= -BASE_H + 4, "bico perto demais da mesa ao largar a caneta"
    assert BX1 - BX0 <= 210, "base de troca maior que a mesa"
    assert GRAMPO_W - ROSCA_D - FOLGA_ROSCA >= 6, "grampo estreito para a rosca"
    if VAR == "cunha":
        assert BD / 2 + y_canal(BH) >= 2, "parede da frente do bloco fina demais"
        assert K_CUNHA < 0.2 and (CM_T - CM_B) / JAW_H < 0.2, "cunha inclinada demais: não trava sozinha"
    else:
        assert (BH - 6 - FOLGA_ROSCA) / 2 >= 2.5, "parede fina em volta do M6 do bloco"
        assert ZS - 4.5 - (Z_BARRA + RABO[2] + FOLGA) >= 0.8 and Z_BARRA + CARRO_H - ZS - 4.5 >= 2, "M8 fura o rabo ou o topo do carro"
        assert X_BATENTE + BATENTE_W + 6 <= XR, "botão do M8 passa da lateral direita do cabeçote"
    (SAIDA / "visor").mkdir(parents=True, exist_ok=True)
    for f in [*SAIDA.glob("*.stl"), *(SAIDA / "visor").glob("*.stl")]:
        f.unlink()
    pecas = {"bloco": bloco(), "vareta": vareta(), "suporte": suporte(), "morsa": morsa()}
    if VAR == "cunha":
        pecas |= {"cunha": cunha(), "cunha_morsa": cunha_morsa()}
    else:
        pecas |= {"parafuso_caneta": parafuso(L_PARAF_CANETA, 6, 1, 11, 4), "mandibula": mandibula(),
                  "parafuso_morsa": parafuso(L_PARAF_MORSA, 8, 1.25, 14, 5)}
    pecas |= {"base": base(), "parafuso_mesa": parafuso(L_PARAF_MESA, botao=16, botao_h=5)}
    for nome, s in pecas.items():
        bb = s.bounding_box()
        assert s.is_valid and s.volume > 0, nome
        assert max(bb.size.X, bb.size.Y) <= 210, f"{nome} não cabe na mesa"
        exportar(s, nome, False)
        print(f"{nome:15s} {bb.size.X:6.1f} x {bb.size.Y:5.1f} x {bb.size.Z:5.1f} mm  {s.volume / 1000:5.1f} cm3")
    print(f"[{VAR}] morsa: sobra {sobra_esq:.1f} mm à esquerda e {sobra_dir:.1f} mm à direita do cabeçote (limite {FOLGA_X_FIM} mm)")
    export_step(Compound(list(pecas.values())), str(SAIDA / "pecas.step"))
    # malhas montadas para o visor: v_cabeca (laranja), v_cabeca_cinza, v_bloco (laranja), v_mesa, v_varetas
    if VAR == "cunha":
        exportar(pecas["cunha_morsa"], "v_cabeca", False)
        exportar(pecas["cunha"], "v_bloco", False)
    else:
        exportar(Pos(X_BATENTE + BATENTE_W + 6, YS, ZS) * Rot(0, -90, 0) * pecas["parafuso_morsa"], "v_cabeca", False)
        exportar(pecas["mandibula"], "v_cabeca_cinza", False)
        exportar(Pos(0, -CANETA_D / 2 - L_PARAF_CANETA - 5, BH / 2) * Rot(-90, 0, 0) * pecas["parafuso_caneta"], "v_bloco", False)
    exportar(Compound([Pos((a + b) / 2, YC, -BASE_H - MESA_T - 8 - L_PARAF_MESA) * pecas["parafuso_mesa"] for a, b in GRAMPOS]), "v_mesa", False)
    exportar(Compound([Pos(x, 0, 0) * pecas["vareta"] for x in (-TRILHO_X, TRILHO_X)]), "v_varetas", False)
    exportar(caneta(), "caneta", False)
    for nome, s in pecas.items():                               # por último: o OCC guarda a malha fina e o visor ficaria pesado
        export_stl(s, str(SAIDA / f"{nome}.stl"), tolerance=0.05, angular_tolerance=0.3)
    if VAR == "parafuso":
        mesas(pecas | {"suporte+apoio": Compound([pecas["suporte"], *apoio_suporte()])})
    extras = [n for n in ("v_cabeca", "v_cabeca_cinza", "v_bloco", "v_mesa", "v_varetas", "caneta") if (SAIDA / "visor" / f"{n}.stl").exists()]
    visor(list(pecas) + extras, informacoes(f"sai {sobra_esq:.1f} / {sobra_dir:.1f} mm das laterais"))
    print(f"ok: saida/{VAR}/" + (" e visor.html (as duas variantes)" if visor_unico() else " (gere a outra variante para o visor.html)"))
