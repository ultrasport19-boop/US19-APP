#!/bin/sh
# Hook de pre-commit de US19-APP. Se instala con tools/instalar_hook.sh
# (los hooks no viajan con el repo, hay que instalarlos en cada clon).
#
# Una barrera que corre SIEMPRE, y siete mas cuando el commit toca index.html.
#
#   0. secretos.js  - va fuera del `if` a proposito. Las otras siete
#                     comprueban la app, y solo tiene sentido correrlas si
#                     la app cambio. Una credencial no respeta esa
#                     frontera: puede aterrizar en tools/, en el .gs del
#                     puente o en una nota. Y este repositorio es publico
#                     — las fichas de los socios ya estuvieron ocho semanas
#                     en claro aqui, y borrar el archivo no bastaba.
#
# Y las siete que miran index.html:
#   1. validar_bloques.js - sintaxis de cada bloque <script> por separado.
#   2. pruebas.js         - estructura, vídeo, lista blanca, secretos y lo que sale del navegador.
#   3. taxonomia.js       - tipo, patrón y nivel de 22 ejercicios conocidos.
#   4. circuitos.js       - reparto de grupos, plan del cronómetro y motor de búsqueda.
#   5. cifrado.js         - cifra y descifra de verdad: activar, desbloquear, migrar sobres viejos.
#   6. escalera.js        - «cómo construirlo» contra el catálogo real: que la progresión ordene de
#                           menos a más, que no mezcle gestos distintos y que la guía no use
#                           lenguaje clínico.
#   7. finanzas.js  - las cifras con las que Diego decide: de cuanta gente
#                     depende el ingreso, cuanto vence este mes, cuanto dinero
#                     es de gente que dejo de venir. Una formula mal tocada no
#                     da error: da un numero distinto, y un numero distinto se
#                     cree.
#   8. arranque.js        - carga los TRES bloques en orden y en el mismo contexto, como hace
#                           el navegador, y dispara DOMContentLoaded. Es lo unico que ve el
#                           fallo del hoisting entre bloques, que ya dejo el Panel en blanco
#                           en produccion: las otras seis aplanan justo esa diferencia.
RAIZ="$(git rev-parse --show-toplevel)"

node "$RAIZ/tools/secretos.js" \
  || { echo ""; echo "hay algo con forma de credencial en el repositorio: commit cancelado."; exit 1; }

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

  node "$RAIZ/tools/escalera.js" "$RAIZ/index.html" \
    || { echo ""; echo "la escalera de ejercicios no pasa la prueba: commit cancelado."; exit 1; }

  node "$RAIZ/tools/finanzas.js" "$RAIZ/index.html" \
    || { echo ""; echo "los numeros de Finanzas no pasan la prueba: commit cancelado."; exit 1; }

  node "$RAIZ/tools/arranque.js" "$RAIZ/index.html" \
    || { echo ""; echo "la app no arranca: commit cancelado."; exit 1; }

  # 9. series.js - el contador de sesiones y el bloqueo de la orden medica.
  #    Existia desde el 10-sep y no la corria nadie (11-sep-2026).
  node "$RAIZ/tools/series.js" "$RAIZ/index.html" \
    || { echo ""; echo "el apartado Series no pasa la prueba: commit cancelado."; exit 1; }

  # 10. socio.js - que nada de la readaptacion llegue a lo que ve un socio:
  #     enlaces, fases compartidas, WhatsApp, tablas e informes impresos.
  node "$RAIZ/tools/socio.js" "$RAIZ/index.html" \
    || { echo ""; echo "algo de la readaptacion llega a lo que ve el socio: commit cancelado."; exit 1; }

fi
exit 0
