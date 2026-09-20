# Fase 10 · se retira el editor BlazePod viejo

**Rama `planilla-unica`, 19-sep-2026. Sin publicar.** Cierra el camino que abrieron
las fases 1 a 8: si los Pods ya son piezas del plano único, el editor que los
dibujaba en su propio lienzo sobra.

## Qué se fue

Las 1.258 líneas del editor de antes: su lienzo, el asistente de tres pasos
(`blzPaso1Html` / `blzPaso2Html` / `blzPaso3Html`), la paleta flotante, la hoja de
montaje, las distancias entre Pods, la vista de solo lectura, la hoja impresa propia
y el reloj de su simulación (`blzSimParar`, `blzSimPintar`, `blzSimPaso`). También la
bandera `CIRC_BLZ_VIEJO`, que lo mantenía apagado mientras se validaba.

**Lo que queda es el motor, y sigue entero**: `blzEstimulos` / `blzGenerar`, puros y
con semilla. Quien le arma un plan es `circPodsPlan`, a partir del plano y de la
configuración del grupo; quien lo hace correr es el subcronómetro de la vista en
vivo. `c.blazePlan` ya no lo escribe nadie: `circMigrarUno` lo lee para traer los
circuitos guardados de antes, y por eso un respaldo viejo sigue abriendo igual.

## Dos fallos que salieron al apuntar el banco al código nuevo

**1. El Pod se encendía siempre del color de reposo.** En `circPodsEstado`, dos cosas
en la misma línea: `colores` va en paralelo a `pods` **por posición** (`colores[k]` es
el color de `pods[k]`) y se estaba leyendo por el **número** del Pod; y lo que guarda
es el **id** del color (`"verde"`), no su hex, que es lo que necesita la variable CSS
`--cm-pod-on`. Con cualquiera de las dos el navegador descarta la regla. Arreglado:
cada corredor guarda su plan, y de ahí sale el hex.

**2. Fuera del bloque de trabajo se podía pintar el primer estímulo.** `circPodsT`
devuelve 0 cuando la fase no es de trabajo, y un 0 sin guarda es «acaba de empezar».
Hoy no pasaba porque `circPodsParar` corre antes, pero eso es una cadena de tres
llamadas: ahora lo decide la función que decide qué se enciende. Los Pods **sueltos**
son la excepción a propósito — los enciende el usuario y llevan su propio reloj.

## El banco

`tools/blazepod.js` pasó de probar un editor que ya no existe a probar el motor y el
subcronómetro: **259 comprobaciones** y **45 mutantes, los 45 caen**. Se fueron los 14
mutantes cuya ancla había muerto —un mutante con ancla muerta no prueba nada— y
entraron 17 sobre la vista en vivo. Las garantías que protegía el tramo viejo siguen
protegidas, pero sobre el código que hoy las cumple: escapar lo que escribe Diego, que
el enlace compartido no edite ni encienda nada, que el plano vuelva entero de un
respaldo, los 44 px del Pod en pantalla estrecha, y que ninguna acción `window.circ*`
pise a una función del mismo nombre.

Un mutante escapó —quitar `plan: q.plan` del corredor— porque la prueba del color
monta su propio corredor. Se añadió la comprobación que faltaba. **La regla de la casa
otra vez: cuando un mutante escapa, la primera sospecha es que falta una prueba.**

## Lo que queda sin pantalla, y es decisión de Diego

Con el editor viejo se fue también **la única pantalla desde la que se tocaba la lógica
de luz**. Hoy `circPodsConfigPoner` no lo llama nadie: cada grupo corre con lo que
dejó la migración o con los valores de fábrica.

| Se puede tocar hoy | No se puede tocar desde ninguna pantalla |
|---|---|
| Dónde va cada Pod, su etiqueta, su color fijo, si es base | Modo (aleatorio, foco, base y periferia…) |
| Cuántos Pods y de qué estación | Intervalo, duración de la luz, tiempo de respuesta |
| | Cuántos se encienden a la vez, colores del grupo |
| | Distractores, probabilidad del objetivo, peso del Pod, retardo de luz |

El motor sigue entendiéndolo todo y hay pruebas de cada cosa: falta el panel que lo
escriba en `podsConfig`. **Es lo que tendría que ser la fase 11**, y no se ha hecho
porque no estaba pedido.
