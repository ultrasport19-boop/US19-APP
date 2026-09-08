#!/bin/sh
# Hook de pre-commit de US19-APP. Se instala con tools/instalar_hook.sh
# (los hooks no viajan con el repo, hay que instalarlos en cada clon).
#
# Seis barreras antes de cada commit que toque index.html:
#   1. validar_bloques.js - sintaxis de cada bloque <script> por separado.
#   2. pruebas.js         - estructura, vídeo, lista blanca, secretos y lo que sale del navegador.
#   3. taxonomia.js       - tipo, patrón y nivel de 22 ejercicios conocidos.
#   4. circuitos.js       - reparto de grupos, plan del cronómetro y motor de búsqueda.
#   5. cifrado.js         - cifra y descifra de verdad: activar, desbloquear, migrar sobres viejos.
#   6. escalera.js        - «cómo construirlo» contra el catálogo real: que la progresión ordene de
#                           menos a más, que no mezcle gestos distintos y que la guía no use
#                           lenguaje clínico.
RAIZ="$(git rev-parse --show-toplevel)"

if git diff --cached --name-only | grep -q "^index.html$"; then

  node "$RAIZ/tools/validar_bloques.js" "$RAIZ/index.html" \
    || { echo ""; echo "index.html no pasa el validador de bloques: commit cancelado."; exit 1; }

  node "$RAIZ/tools/pruebas.js" "$RAIZ/index.html" \
    || { echo ""; echo "index.html no pasa el banco de pruebas: commit cancelado."; exit 1; }

  node "$RAIZ/tools/taxonomia.js" "$RAIZ/index.html" \
    || { echo ""; echo "la clasificación de ejercicios no pasa la prueba: commit cancelado."; exit 1; }

  node "$RAIZ/tools/circuitos.js" "$RAIZ/index.html" \
    || { echo ""; echo "los circuitos o la búsqueda no pasan la prueba: commit cancelado."; exit 1; }

  node "$RAIZ/tools/cifrado.js" "$RAIZ/index.html" \
    || { echo ""; echo "el cifrado de la sincronización no pasa la prueba: commit cancelado."; exit 1; }

  node "$RAIZ/tools/escalera.js" "$RAIZ/index.html" \n    || { echo ""; echo "la escalera de ejercicios no pasa la prueba: commit cancelado."; exit 1; }

fi
exit 0
