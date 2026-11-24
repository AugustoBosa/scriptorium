; TROCA1: posições das vagas, a seco (sem caneta no porta-caneta, base de troca na mesa)
; Gerado por scripts/gerar-teste-troca.mjs. Valores: {"eixo":"X","base":33,"afasta":40,"recuo":12,"vagas":[39.599999999999994,83.2,126.8,170.4],"assento":6,"subida":46.5,"fLento":300}
; M0 = a Mega S para e espera um clique no botão.
G21
G91
G0 Z10 F500
G90
M412 S0
G28 X Y
G28 Z
G0 Z6 F500
G0 Z55.5 F500
; vaga 1
G0 Y73.000 F6000
G0 X39.600 F6000
M0 Vaga 1: X certo? bico sobre o centro
G0 Y33.000 F6000
M0 Vaga 1: Y certo? suporte entre os postes
G0 Y73.000 F6000
; vaga 2
G0 Y73.000 F6000
G0 X83.200 F6000
M0 Vaga 2: X certo? bico sobre o centro
G0 Y33.000 F6000
M0 Vaga 2: Y certo? suporte entre os postes
G0 Y73.000 F6000
; vaga 3
G0 Y73.000 F6000
G0 X126.800 F6000
M0 Vaga 3: X certo? bico sobre o centro
G0 Y33.000 F6000
M0 Vaga 3: Y certo? suporte entre os postes
G0 Y73.000 F6000
; vaga 4
G0 Y73.000 F6000
G0 X170.400 F6000
M0 Vaga 4: X certo? bico sobre o centro
G0 Y33.000 F6000
M0 Vaga 4: Y certo? suporte entre os postes
G0 Y73.000 F6000
; descida na vaga 1: confira a altura do assento
G0 X39.600 F6000
G0 Y33.000 F6000
M0 Z: vai descer devagar. Mao no botao!
G1 Z9.000 F300
M0 Z de assento certo? suporte apoiado na base
G1 Z55.500 F300
G0 Y73.000 F6000
G0 Z15 F500
G0 X0 Y200 F6000
M84
