#!/bin/sh
# Fatia uma mesa .3mf para a Bambu Lab P2S (bico 0,4, PLA Basic, Textured PEI), sem abrir a interface.
# Uso: sh p2s/fatiar.sh saida/parafuso/impressao/0_validacao.3mf
# Os perfis aqui são completos: herança ("inherits") e templates ("include") já resolvidos.
# Sem os templates, o G-code sai com um início genérico, e a P2S faz barulho e se comporta errado.
set -e
AQUI=$(dirname "$0"); IN="$1"; NOME=$(basename "$IN" .3mf)
OUT=$(dirname "$IN")/p2s; mkdir -p "$OUT"
"$LOCALAPPDATA/Programs/BambuStudio/bambu-studio.exe" --slice 0 --arrange 1 --orient 0 \
  --curr-bed-type "Textured PEI Plate" \
  --load-settings "$AQUI/maquina.json;$AQUI/processo.json" --load-filaments "$AQUI/filamento.json" \
  --outputdir "$OUT" --export-3mf "${NOME}_P2S.gcode.3mf" "$IN"
unzip -p "$OUT/${NOME}_P2S.gcode.3mf" Metadata/plate_1.gcode | grep -q "P2S start gcode" && echo "ok: início oficial da P2S" || { echo "ERRO: início não é o da P2S"; exit 1; }
