#!/bin/sh
# Hook de pre-commit de US19-APP: valida los bloques <script> de index.html antes de cada commit.
# Se instala con tools/instalar_hook.sh (los hooks no viajan con el repo).
RAIZ="$(git rev-parse --show-toplevel)"
if git diff --cached --name-only | grep -q "^index.html$"; then
  node "$RAIZ/tools/validar_bloques.js" "$RAIZ/index.html" || { echo "index.html no pasa el validador de bloques: commit cancelado."; exit 1; }
fi
exit 0
