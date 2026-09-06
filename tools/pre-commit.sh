#!/bin/sh
# Hook de pre-commit de US19-APP. Se instala con tools/instalar_hook.sh
# (los hooks no viajan con el repo, hay que instalarlos en cada clon).
#
# Dos barreras antes de cada commit que toque index.html:
#   1. validar_bloques.js - sintaxis de cada bloque <script> por separado.
#   2. pruebas.js         - banco de pruebas: video, lista blanca, secretos.
RAIZ="$(git rev-parse --show-toplevel)"

if git diff --cached --name-only | grep -q "^index.html$"; then

  node "$RAIZ/tools/validar_bloques.js" "$RAIZ/index.html" \
    || { echo ""; echo "index.html no pasa el validador de bloques: commit cancelado."; exit 1; }

  node "$RAIZ/tools/pruebas.js" "$RAIZ/index.html" \
    || { echo ""; echo "index.html no pasa el banco de pruebas: commit cancelado."; exit 1; }

fi
exit 0
