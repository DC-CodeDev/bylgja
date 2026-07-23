# Shared Element

Este documento resume el estado del primer pilar de la familia de transiciones **between-view** del Pilar 6 del roadmap de animaciones: shared element transitions dentro de una misma página React, reutilizando el motor físico ya existente de Bylgja y coordinando dos nodos DOM distintos que representan la misma identidad visual.

## Contexto y alcance

Este trabajo corresponde al primer pilar de la familia:

- Shared Layout
- Shared Element
- Crossfade

A diferencia de la familia **within-view** documentada en `09-layout-flip.md`, aquí el problema no es “el mismo nodo cambia de layout”, sino “dos nodos distintos deben sentirse como la misma entidad visual durante una transición”.

Esa diferencia es estructural.

En `useFlip`, el modelo es un FLIP clásico de un solo nodo persistente:

- el nodo existe antes
- el mismo nodo existe después
- cambia su caja de layout

En shared element, el modelo es otro:

- existe un nodo origen
- el consumidor captura su geometría
- React monta otro nodo destino
- la librería coordina la ilusión de continuidad entre ambos

Por eso el diseño siguió deliberadamente el modelo mental de `layoutId` de Framer Motion, no un FLIP clásico de un único elemento persistente. La identidad visual persiste, pero el DOM no.

También quedó definida una decisión de producto importante: el caso de uso real de esta primitiva son transiciones dentro de la misma página, sin cambio de ruta. El ejemplo que guió el diseño fue el patrón de Instagram al abrir una foto desde una grilla hacia un modal o vista expandida dentro del mismo contexto visual.

No se construyó en esta sesión una solución general para navegación entre rutas ni para árboles separados por infraestructura de routing. El alcance real fue shared element intra-página, coordinado por estado React local.

## Extracción de `flip-invert.ts`

Antes de construir la nueva primitiva se extrajo la lógica compartida de inversión FLIP desde `src/react/useFlip.ts` hacia:

- `src/core/flip-invert.ts`

La motivación fue evitar que Bylgja terminara con dos implementaciones paralelas de la misma mecánica geométrica.

La lógica extraída concentra:

- la estructura de medición `FlipInvertMeasurement`
- el cálculo de `deltaX` y `deltaY`
- el cálculo de `scaleX` y `scaleY`
- la aplicación del transform invertido inicial
- el reflow forzado
- la animación con spring desde progreso `0` hasta `1`
- la limpieza final de estilos inline

Con esa extracción, tanto `useFlip` como `useSharedElementFlip` reutilizan el mismo mecanismo base de:

- medir
- calcular diferencia geométrica
- invertir visualmente
- animar hacia identidad

La decisión fue importante porque mantiene una sola fuente de verdad para el comportamiento FLIP invertido de la librería, evitando duplicación y riesgo de drift entre primitivas que conceptualmente deben sentirse iguales.

## Primitiva base: `useSharedElementFlip`

- Archivo: `src/react/useSharedElementFlip.ts`
- Firma actual: `useSharedElementFlip(elementRef, sourceRect)`

La primitiva construida en esta sesión es un hook de bajo nivel orientado a un único elemento destino.

### Contrato de entrada

`useSharedElementFlip` recibe:

- `elementRef`: ref al elemento que acaba de montarse y debe animar hacia su posición final
- `sourceRect`: una medición externa del elemento origen

Ese `sourceRect` no es calculado por el hook. Debe ser capturado por el consumidor en el momento del click o interacción sobre el elemento origen, antes de cualquier cambio de estado de React que provoque el montaje del destino.

Ese contrato también es estructural. A diferencia de `useFlip`, aquí no existe un “render anterior del mismo nodo destino” del cual el hook pueda derivar su estado inicial. El punto de partida de la transición vive fuera del hook y viene de otro nodo, potencialmente ya oculto o reemplazado cuando el destino entra en escena.

### Diferencia con `useFlip`

`useSharedElementFlip` no compara:

- medición previa del mismo contenedor
- contra medición nueva del mismo contenedor

En cambio compara:

- una medición externa capturada por el consumidor
- contra la caja real del elemento recién montado

Eso significa que la primitiva no es un hook de reconciliación de layout entre renders, sino un hook de entrada coordinada desde una geometría externa.

### Un solo elemento, sin stagger

La primitiva no soporta stagger.

La razón no es una omisión accidental, sino que aquí siempre se anima un único elemento visual. No existe una colección de hijos persistentes ni una propagación entre múltiples nodos como en `useFlip`. El problema geométrico es singular:

- un origen
- un destino
- una sola trayectoria visual

Por eso el hook se mantuvo deliberadamente pequeño y específico.

## Patrón de apertura y cierre

El patrón implementado en el playground usa dos caminos distintos:

### Apertura

La apertura usa `useSharedElementFlip`.

El flujo es:

1. el usuario hace click en una miniatura
2. el consumidor mide el rectángulo del origen con `getBoundingClientRect()`
3. el consumidor guarda ese valor como `sourceRect`
4. React monta el overlay y el elemento destino
5. `useSharedElementFlip` mide el destino ya montado
6. la primitiva anima desde `sourceRect` hacia la caja final real

### Cierre

El cierre no usa un camino inverso de FLIP.

En su lugar reutiliza el variant `fade` ya existente para desmontar el overlay. Esa decisión fue deliberada por simplicidad y por reutilización de primitivas que Bylgja ya tenía resueltas. El objetivo de esta sesión no era construir una solución completa de ida y vuelta geométrica, sino validar el pilar de entrada shared element y confirmar que la coordinación base entre origen y destino estaba bien modelada.

Eso deja abierta la posibilidad de que en el futuro se construya:

- un cierre FLIP inverso
- una composición con crossfade
- una coordinación más rica entre salida del origen y entrada del destino

Pero ninguna de esas capas fue necesaria para cerrar correctamente esta fase.

## Bug de StrictMode

Durante la implementación apareció un bug sutil en `src/react/useSharedElementFlip.ts`.

La primitiva mantiene un ref:

- `previousSourceRectRef`

Su propósito es recordar si el `sourceRect` actual ya fue consumido por un ciclo de animación previo. La condición central del hook era:

- si `sourceRect` es `null`, no hay transición que arrancar
- si `previousSourceRectRef.current` ya no es `null`, se asume que ese `sourceRect` ya fue procesado

El problema era que el `useLayoutEffect` principal no reseteaba `previousSourceRectRef.current` en su cleanup.

En producción eso no se manifestaba, porque el montaje persistente del componente ocurría una sola vez y la animación se ejecutaba correctamente.

En desarrollo bajo React StrictMode sí aparecía un fallo real:

1. React montaba el componente
2. el `useLayoutEffect` veía `previousSourceRectRef.current === null`
3. la animación arrancaba
4. StrictMode desmontaba sintéticamente el componente para detectar side effects inseguros
5. React lo montaba otra vez
6. el ref conservaba el valor previo del ciclo sintético
7. el segundo montaje, que era el que persistía visualmente, asumía erróneamente que ese `sourceRect` ya había sido animado
8. la animación real quedaba bloqueada

La corrección fue explícita:

- resetear `previousSourceRectRef.current = null` en el cleanup del `useLayoutEffect` principal

Además, ese cleanup también detiene cualquier animación activa, alineándose con la misma lógica defensiva que ya existía en el efecto de desmontaje global.

Esta corrección fue especialmente importante porque el bug solo se manifestaba en desarrollo bajo StrictMode y hubiera quedado invisible en producción. Justamente por eso era peligroso: podía ser interpretado como “el patrón es inestable” o “hay un problema en el cálculo geométrico”, cuando en realidad la falla estaba en memoria residual entre el ciclo sintético y el montaje persistente.

## Metodología de diagnóstico

El bug no se corrigió por intuición sino por instrumentación incremental.

La metodología real usada en esta sesión fue medir en cada capa sospechosa en lugar de asumir la causa:

- logs en `SharedOverlayCard` para observar mount, unmount y comparación entre `sourceRect` y el rectángulo real del nodo montado
- logs dentro de `startFlipInvert` para verificar creación del driver y progreso frame a frame
- logs al inicio del `useLayoutEffect` de `useSharedElementFlip` para inspeccionar el estado exacto de `sourceRect`, `previousSourceRectRef.current` y la presencia del nodo destino

El hallazgo decisivo fue usar `console.trace` en el momento del unmount inesperado del overlay card. Ese stack trace reveló que el desmontaje no venía de una lógica incorrecta del playground ni de un cierre accidental del overlay, sino del remount sintético que React StrictMode hace en desarrollo.

Ese dato cambió el diagnóstico:

- dejó de ser un supuesto problema de coordinación entre estados del consumidor
- pasó a ser un problema de cleanup incompleto dentro del hook

La sesión confirmó así una regla de trabajo útil para esta familia de animaciones: cuando hay varios niveles de coordinación entre medición, montaje, refs y efectos, conviene instrumentar cada capa y seguir el dato real antes de tocar la lógica.

## Estado final

El estado final del pilar al cerrar esta sesión es:

- `useSharedElementFlip` está implementado
- la lógica invertida compartida fue extraída a `src/core/flip-invert.ts`
- el bug de StrictMode fue corregido
- el playground valida el caso con una grilla que abre un overlay a pantalla completa
- el cierre reutiliza `fade`
- toda la instrumentación temporal de diagnóstico ya fue removida

En términos prácticos, la primitiva quedó completa, corregida y validada para el caso de uso objetivo de esta fase: shared element transitions intra-página, con dos nodos DOM distintos coordinados para producir continuidad visual.
