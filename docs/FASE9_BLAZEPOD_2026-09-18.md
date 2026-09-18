# Fase 9 · Planificador visual BlazePod en Circuitos

Entrega del 18-sep-2026. Pedido en la página de Notion «🧩 Prompts para Claude — Bot US19».

> **Esta fase planifica y simula. No controla los Pods.** No hay SDK, API ni integración
> oficial de BlazePod en este repositorio, así que la app no enciende nada ni lee un toque.
> Lo dice en pantalla, en la hoja impresa y en el enlace compartido, con la misma frase:
> «Simulación visual. Configura esta actividad manualmente en la aplicación oficial de BlazePod».

---

## 1 · Lo que se investigó de BlazePod

La app oficial organiza una actividad alrededor de una **lógica de luz**. Las que aparecen
documentadas, y que son las que se han modelado, son estas:

| Lógica | Qué hace | Cómo está en la app |
|---|---|---|
| Random | Un Pod al azar; el siguiente sale al tocarlo o al agotarse el tiempo | `random` |
| Focus | Hay uno o más colores objetivo; los demás son distractores | `focus` + lista `objetivo` |
| Home Base | Un Pod es la base; se vuelve a él entre estímulos periféricos | `base` (alterna par/impar) |
| Sequence | Los Pods se encienden en un orden fijo, con su color y su paso | `secuencia` + línea temporal |
| All At Once | Varios o todos a la vez: elección, competencia, acciones por color | `todos` |
| — | Combinación libre de pasos, colores, tiempos y repeticiones | `libre` (personalizado) |

Además: la app tiene **tests de rendimiento** con resultados comparables (eso ya lo cubre
`MODULO_BLAZE.js` del asistente, que lee la tarjeta de resultados y arma el informe), y
**actividades** configurables con intervalo, duración de luz, tiempo de respuesta y series.
Aquí solo se ha modelado la parte de **planificación**.

Fuentes consultadas: el manual de usuario de la app de BlazePod y las guías de uso clínico y
deportivo publicadas por terceros. **Nada de esto es una API**: los nombres de color y las
consignas son de la casa y se editan, y así se dice en la interfaz.

## 2 · Diseño implementado

Dentro del editor de un circuito, una tarjeta nueva con una casilla **«Usar BlazePod»**.
Apagada, el circuito se comporta exactamente como antes. Encendida, aparece el planificador
en cinco secciones plegables:

1. **Lienzo y Pods** — cancha editable (5 superficies, dimensiones en metros, cuadrícula y
   escala visual), de 1 a 12 Pods arrastrables con ratón y con dedo, numerados solos,
   etiqueta opcional, marca de **base**, duplicar y quitar. Elementos auxiliares: inicio del
   deportista, conos, balón, miniarcos, zona de finalización, flechas de desplazamiento y
   líneas de pase (estas dos con las dos puntas arrastrables). Todo son símbolos hechos con
   HTML, CSS y SVG propios: **ni una imagen remota, ni un recurso de terceros**.
2. **Configuración** — modalidad, alcance (circuito o una estación), tipo de sesión,
   duración, series, descanso, preparación, intervalo, duración de la luz, tiempo máximo de
   respuesta, cómo avanza (toque / tiempo agotado / intervalo fijo / manual), cuántos Pods a
   la vez, no repetir el mismo Pod seguido, sonido y **semilla**. Paleta de ocho colores
   contrastados, cada uno con su consigna editable, y marca de color objetivo en modo foco.
3. **Constructor de secuencia** (en `secuencia` y `libre`) — una fila por paso con su tramo
   de tiempo calculado (`00:00–00:03`), Pods, color, duración, condición para continuar e
   instrucción; reordenar, duplicar y borrar. La duración total sale sola.
4. **Simulación** — reproducir, pausar, reiniciar, un paso atrás y adelante, repetir,
   velocidad 0,5× / 1× / 2× / 4×, línea temporal con cursor, tiempo transcurrido, serie,
   paso, siguiente evento y la consigna del color encendido. **Reproducir no modifica el
   circuito.**
5. **Cómo montarlo en cancha** — se genera solo: número y distribución de Pods, distancias
   aproximadas entre ellos y a los laterales, Pod base, colores y significado, modalidad,
   ritmo, series y descansos, secuencia o número de estímulos con su semilla, material,
   acción del deportista y observaciones de seguridad. Botones para copiar, imprimir y
   duplicar la planificación.

Y **13 plantillas** editables: 7 de fútbol (reacción y cambio de dirección, escaneo antes de
recibir, conducción aleatoria, pase según color, slalom y remate, base y periferia,
competencia entre dos jugadores) y 6 de control motor y reacción (alcance multidireccional,
transferencia de peso, marcha y reacción, apoyo unipodal con estímulo, reacción con el brazo,
toma de decisiones con baja carga). Aplicar una plantilla **solo toca el blazePlan**: las
estaciones y los tiempos del circuito no se mueven, y se pregunta antes de reemplazar.

### Decisión de vocabulario

El prompt pedía llamar «KINESIOLOGÍA» al segundo grupo de plantillas y «zona kinésica» a una
de las superficies. **Este repositorio es público** y hay una regla en pie de no publicar
nada de kinesiología hasta el título. Se han dejado en vocabulario neutro —«Control motor y
reacción», «Zona de trabajo», «Sesión de trabajo individual»— igual que se hizo con la
proyección por sesión. Es la única desviación del prompt y se revierte cambiando tres
cadenas si Diego prefiere lo contrario.

## 3 · Archivos y secciones modificadas

| Archivo | Qué cambió |
|---|---|
| `index.html` · CSS (bloque de estilos) | El bloque `/* --- Planificador BlazePod --- */`, justo antes del cierre del `<style>` de la app |
| `index.html` · bloque 1 | El módulo entero entre `/* --- BlazePod --- */` y `/* --- Plantillas --- */`: motor, interfaz y acciones |
| `index.html` · `circEditorHtml` | `<div id="blz-box">` con la tarjeta, antes de las clases registradas |
| `index.html` · `circEditorMontar` | `blzEditorMontar()` |
| `index.html` · `renderCircuitos`, `circVolver` | `blzSimParar()`: al repintar o salir no queda un temporizador vivo |
| `index.html` · `circShareData`, `showCircuitoView` | El plan viaja en el enlace y se pinta en **modo lectura** |
| `index.html` · `circImprimirObj` | Sección «Planificación BlazePod» en la hoja |
| `index.html` · `circCardHtml` | Etiqueta con el resumen corto en la tarjeta del circuito |
| `index.html` · `pizarraCircuitoObj` | Sección BlazePod con una consigna por color |
| `tools/blazepod.js` | **Nuevo.** 166 comprobaciones |
| `tools/mutantes_blazepod.json` | **Nuevo.** 24 mutantes |
| `tools/pre-commit.sh` | `blazepod.js` como barrera 13 |

No se tocó `SEED_VERSION`, ni se añadió ninguna dependencia, build o servidor. No se movió
ninguna función entre bloques `<script>`: todo el módulo vive en el bloque 1, junto a los
circuitos.

## 4 · Modelo de datos

Cuelga del circuito, en `c.blazePlan`. Nombres en español, como el resto de la app.

```js
c.blazePlan = {
  activo: true, version: 1,
  alcance: "circuito",            // "circuito" | "estacion"
  estacion: "",                   // id de la estación, si alcance === "estacion"
  contexto: "futbol",             // "futbol" | "kine" | "general"
  superficie: { tipo: "media", anchoM: 25, altoM: 20, rejilla: true },
  pods:    [ { id, n, x, y, etiqueta, base } ],        // x, y normalizados 0–1
  adornos: [ { id, tipo, x, y, etiqueta, x2?, y2? } ], // x2/y2 solo en flecha y pase
  logica: { modo, duracion, preparacion, intervalo, luz, respuesta,
            disparo, simultaneos, sinRepetir, semilla, sonido },
  colores:  [ { id, hex, consigna } ],
  objetivo: [ "verde" ],          // solo cuenta en modo foco
  secuencia:[ { id, pods:[n], color, dur, condicion, consigna } ],
  series: 1, descanso: 30, notas: ""
};
```

`blzNormalizar(plan)` trabaja **sobre una copia**, rellena lo que falte, acota números,
recorta textos, renumera los Pods, deja una sola base y **no borra un campo que no conozca**:
un plan guardado por una versión más nueva sobrevive a pasar por una más vieja.

## 5 · Compatibilidad

- Un circuito sin `blazePlan` carga, se edita, se comparte, se imprime y se lleva en vivo
  **exactamente igual que antes**. `blzActivo()` devuelve `false` y no se pinta nada.
- `circNuevo()` no crea `blazePlan`: solo aparece al encender la casilla.
- `circGrupoEn`, `circPlan`, `circDuracion` y `circTrabajoDe` **no saben que BlazePod
  existe**: la suite lo comprueba buscando la cadena `blz` dentro de cada una.
- Respaldo, importación, sincronización (subir y bajar), carga desde disco y borrado total
  mueven **el circuito entero**, así que el plan viaja solo por los seis caminos. No hizo
  falta tocar ninguno.
- El enlace compartido lleva el plan y lo enseña en lectura; **la simulación no arranca
  sola** al abrirlo.

## 6 · Pruebas ejecutadas

Todo sobre `index.html`, el 18-sep-2026.

| Suite | Resultado |
|---|---|
| `validar_bloques.js` | 3 bloques OK · 1.235 funciones top-level · 0 duplicadas · 0 caracteres de control |
| `pruebas.js` | 117 · sin fallos |
| `taxonomia.js` | 65 · sin fallos |
| `circuitos.js` | 27 · sin fallos |
| **`blazepod.js`** | **166 · sin fallos** |
| `cifrado.js` | 130 · sin fallos |
| `escalera.js` | 158 · sin fallos |
| `finanzas.js` | 147 · sin fallos |
| `arranque.js` | 41 · sin fallos |
| `series.js` | 217 · sin fallos |
| `socio.js` | 130 · sin fallos |
| `fichas.js` | 88 · sin fallos |
| `historia.js` | 179 · sin fallos |
| `secretos.js` | 4 · sin fallos |
| `navegador.js` | 9 · sin fallos · **0 errores de consola** |
| **Total** | **1.478 comprobaciones sin fallos** |

Mutantes: **72 de 72 caen**, en seis listas (`blazepod` 24, `escalera` 24, `circuitos` 7,
`guardas` 7, `arranque` 8, `navegador` 2).

Los seis mutantes que el prompt exigía, y qué comprobación los caza:

| Mutante | Lo caza |
|---|---|
| Se permite repetición inmediata | «ningún Pod se repite dos veces seguidas» |
| Se ignora la semilla | «una semilla distinta da otra serie» |
| Se pierde blazePlan al respaldar | «exportar y subir copian state.circuitos completo» |
| Queda un temporizador activo al cerrar | «blzSimParar hace clearInterval de verdad» |
| Se activa un Pod eliminado | «el paso que apunta a un Pod inexistente se salta» |
| Se inserta una instrucción sin escapar | «el montaje escapa clave y valor» |

## 7 · Revisión visual

En Chrome, con la app servida en local. **La app no tiene tema claro**: `:root` define una
sola paleta oscura y no hay `prefers-color-scheme`. Lo que sí es claro es la hoja impresa, y
ahí se revisó aparte.

- **Escritorio 1440×900** — lienzo 698×558 centrado, cancha con sus líneas, 6 Pods en
  semicírculo, flecha, inicio y balón, escala «6,3 m».
- **Teléfono 390×844** — lienzo 284×228, Pods de 40 px (el mínimo cómodo con el dedo), sin
  desplazamiento horizontal, editor por secciones plegables.
- **Simulación** — el Pod encendido toma el color programado y late; el HUD dice
  «00:09 / 00:35 · Serie 1 de 1 · Paso 2 · P1 · Pase · Siguiente: P2 en 3 s».
- **Circuito existente** sin plan: se pinta y se imprime sin cambios.
- **Vista compartida**: 6 Pods, todos deshabilitados, 0 controles editables, el aviso
  presente y la simulación parada.
- **Impresión**: la sección BlazePod sale con su esquema en SVG y la tabla de montaje.
  **Ningún `background`** en el SVG, por la trampa conocida del conversor.
- **Arrastre**: comprobado con eventos de puntero táctiles; tocar sin mover selecciona, y
  las flechas ◀▲▼▶ mueven el Pod seleccionado un 2 % por pulsación.
- **Escapado**: con una consigna `<img src=x onerror=alert(1)>` el HTML sale escapado y no
  queda ningún `img[onerror]` vivo.

### El fallo que solo se vio ejecutando

`function blzPodBase(plan)` (motor) y `window.blzPodBase = function(n, on)` (acción de la
interfaz) son **la misma propiedad de `window`** en un `<script>` clásico. La acción pisaba
al motor: `blzMontaje` llamaba a la acción, la acción repintaba, el repintado volvía a
llamar a `blzMontaje` — pila llena y tarjeta en blanco. **No lo veía nada**: ni
`validar_bloques.js` (solo cuenta `function X(`), ni una suite que evalúe el motor aislado.
La acción pasó a llamarse `blzPodMarcarBase`, y `blazepod.js` tiene ahora una comprobación
que cruza las dos listas y un mutante que la reintroduce.

## 8 · Riesgos y limitaciones

- **No controla hardware.** Es lo primero de este documento y está escrito en tres sitios de
  la app. Si algún día aparece un SDK oficial, el modelo de datos ya está listo para
  mandarle la secuencia, pero hoy no existe.
- El modo **«al tocar el Pod»** es una etiqueta de planificación: en cancha lo decide el
  toque, y la simulación usa el intervalo como referencia porque no hay toques que leer.
- La **pizarra** enseña el plan como lista de consignas, no como esquema: está hecha para
  medios en movimiento y meterle un lienzo sería otra fase.
- Las plantillas son **puntos de partida**, no prescripciones. No prometen resultados ni
  sustituyen el criterio de quien dirige la sesión.
- Doce Pods es el tope de la app. No viene de ningún límite del fabricante: viene de que
  más de doce en un lienzo de teléfono no se distinguen.
- Nada de esto se ha probado con Pods reales en cancha. Las distancias que calcula salen de
  las dimensiones que se escriban en la superficie: si están mal medidas, el montaje también.

## 9 · Qué falta

Publicar. El cambio queda en el repositorio, listo para revisión; **no se ha desplegado
nada**.
