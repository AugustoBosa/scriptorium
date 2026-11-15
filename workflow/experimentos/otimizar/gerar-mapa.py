"""Vetoriza um mapa raster (webp/png) em polilinhas SVG, 210 mm de largura. Gera mapa-A.svg (paredes e texto)
e mapa-B.svg (A + rachaduras do piso, ~1,3 MB, por isso não versionado). Requer opencv-python e numpy.
Fonte usada: dnd/tools/5etools/5etools-2014-src/img/adventure/CoS/map-4.03-main-floor.webp (Ravenloft, térreo).
Uso: python gerar-mapa.py <imagem> """
import sys, cv2, numpy as np
im = cv2.imread(sys.argv[1], cv2.IMREAD_GRAYSCALE)
W = 1500; s = W / im.shape[1]; im = cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
mm = 210 / W
def contornos(mask, min_len, eps):
    cs, _ = cv2.findContours(mask.astype(np.uint8) * 255, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if len(c) < min_len: continue
        a = cv2.approxPolyDP(c, eps, True)[:, 0, :]
        if len(a) >= 2: out.append(np.vstack([a, a[:1]]))
    return out
def salvar(nome, cs):
    h = im.shape[0] * mm
    with open(nome, 'w') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="{h:.1f}mm" viewBox="0 0 210 {h:.1f}">\n')
        for c in cs: f.write('<polyline points="' + ' '.join(f'{x*mm:.2f},{y*mm:.2f}' for x, y in c) + '"/>\n')
        f.write('</svg>')
A = contornos(im < 95, 12, 1.0)
salvar('mapa-A.svg', A)
salvar('mapa-B.svg', A + contornos(cv2.Canny(cv2.GaussianBlur(im, (3, 3), 0), 40, 110) > 0, 10, 1.0))
