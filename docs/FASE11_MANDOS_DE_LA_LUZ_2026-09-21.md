# Fase 11 · la lógica de luz vuelve a tener mandos

**21-sep-2026. Publicada**: `dbe731b` (la fase) y `37bed9c` (la salida a producción,
con la caché del service worker en **v17**). Cierra lo que dejó abierto la fase 10 y
es lo último que faltaba para que la planilla única no fuera un recorte de lo que
había antes.

## Qué estaba roto

Al retirar el editor viejo, la configuración de cada grupo se quedó **sin pantalla**:
`circPodsConfigPoner` existía, tenía pruebas y no lo llamaba nadie. Modo, colores,
intervalo, encendido, respuesta, simultáneos y objetivo corrían **siempre** con el
valor de fábrica, y no había forma de cambiarlos desde la app.

Y una consecuencia peor, que no se veía por ningún lado: **un grupo en «Secuencia» o
«Personalizado» no encendía nada y no daba error.** `blzEstimulos` devuelve la lista
vacía cuando no hay pasos, así que los Pods se quedaban apagados el bloque entero sin
que fallara nada. La configuración del grupo ni siquiera guardaba los pasos, de modo
que un plan del editor viejo los perdía al migrar.

## Qué se añadió

**En el modelo** (`circPodsConfig`), tres campos que antes solo vivían en el plan:
`objetivo`, `probObjetivo` y `secuencia`, esta última con tope `CIRC_MAX_PASOS = 60`.
Viajan solos por donde ya viajaba la configuración —el circuito, el respaldo y el
enlace compartido— porque todos esos caminos copian el objeto entero.

**En la pantalla** (`circPodsPanelHtml`), al tocar un Pod sale la luz de **su grupo**:
la estación a la que está atado, o el montón de los sueltos, que es un grupo más.

- los seis modos, cada uno con su explicación debajo;
- cada cuánto, cuánto dura el encendido, la respuesta y cuántos a la vez;
- con qué cambia, sin repetir Pod, sonido y semilla;
- los colores del grupo y, en «Foco», el objetivo y cada cuánto sale;
- en «Secuencia» y «Personalizado», los pasos: qué Pods, de qué color y cuántos
  segundos — con aviso en pantalla cuando no hay ninguno;
- «valores de fábrica», para volver atrás sin tocar nada más.

En los dos modos por pasos se esconden los tiempos generales: ahí los lleva cada paso,
y dejarlos a la vista invitaba a cambiarlos para nada.

## Tres cosas que no se ven y sujetan lo demás

**1. Las posiciones no son los números del plano.** Los Pods de un paso se guardan
como **posición dentro del grupo (1..N)**, que es como los numera `circPodsPlan` al
armar el plan; el número que se pinta en el botón es el del Pod en el plano. Es la
misma trampa que el `colores` en paralelo de la fase 10, y por eso está comentada en
los dos sitios. Que coincidan en la migración no es casualidad: el plan viejo numeraba
sus Pods en el mismo orden en que la planilla los copia a un solo grupo.

**2. El objetivo y el color de cada paso se filtran contra la paleta del grupo.**
`blzNormalizar` tira lo que no esté en `plan.colores`, y «Foco» se quedaría sin
objetivo sin decir nada. Se comprueba al guardar, no al pintar.

**3. Un grupo no puede quedarse sin con qué encender.** No se deja quitar el último
color ni dejar un paso sin Pods: las dos cosas apagan la clase en silencio.

Las acciones son `window.circLuz*` y las funciones del módulo se llaman distinto a
propósito — `circLuzCampo` contra `circLuzCfg`, y nunca el mismo nombre. Es la trampa
de `blzPodBase`, que dejó una tarjeta en blanco y no la vio ningún validador; ahora
hay una prueba que cruza las dos listas.

## El banco

| | antes | ahora |
|---|---|---|
| `tools/planilla.js` | 149 | **198** comprobaciones |
| `tools/blazepod.js` | 259 | **269** |
| `tools/mutantes_planilla.json` | — | **8**, los 8 caen |
| `tools/mutantes_blazepod.json` | 45 | **48**, los 48 caen |

Dos secciones nuevas en la planilla: una para el modelo y otra que vigila que la
pantalla **siga existiendo** —que el panel se pinte desde el Pod seleccionado, que no
salga en un circuito de solo lectura y que ninguna acción pise a una función—, porque
lo que falló aquí no fue una fórmula: fue que nadie llamaba a la función.

En BlazePod, además de que los campos nuevos lleguen al motor, la prueba que enseña el
fallo: una secuencia sin pasos da **cero** estímulos, y con dos pasos da dos, el
segundo empezando cuando acaba el primero.

## Probado a mano

Las 14 barreras en verde. En Chrome, sobre un circuito de verdad: el panel se pinta,
los seis modos responden, el objetivo aparece solo en «Foco», los pasos se construyen
y llegan al motor —un estímulo por paso, con sus Pods y su color—, no hay errores de
consola y a **412 px** (el teléfono de Diego) no desborda: los modos se reparten en
dos filas y los campos se envuelven.

## Lo que sigue sin panel

El **peso por Pod** y el **retardo de luz**: el motor los entiende, nadie los toca
desde la app y **no están pedidos**. Y sigue pendiente de confirmar que las medidas de
Gym US19 (10 × 4,5 m) y Sala cardio (4,5 × 5 m) sean reales: salieron del briefing, no
de una medición, y el plano las enseña en metros.
