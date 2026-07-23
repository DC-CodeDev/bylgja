# Layout FLIP

Este documento resume el estado del Pilar 6 del roadmap de animaciones: transiciones de layout basadas en FLIP dentro de una misma vista React, reutilizando el motor físico ya existente de Bylgja en lugar de introducir un sistema paralelo de transiciones.

## Alcance

El alcance de este pilar se limitó deliberadamente a la familia de transiciones **within-view**:

- Auto Layout Transition
- Reorder
- Grid Shuffle
- Masonry Rearrange

Todas comparten la misma propiedad estructural: el nodo DOM persiste entre el estado anterior y el estado siguiente, pero cambia su caja de layout. Eso las vuelve compatibles con una primitiva FLIP clásica basada en:

- medir la caja anterior
- dejar que React mutile el DOM
- medir la caja nueva
- invertir la diferencia con `transform`
- reproducir la vuelta a identidad

Quedaron explícitamente fuera de alcance:

- Shared Layout
- Shared Element
- Crossfade

La razón no es cosmética sino estructural. Esos casos no consisten en “el mismo nodo cambia de posición”, sino en coordinar el solapamiento temporal entre nodos distintos, a veces en vistas distintas, con montaje y desmontaje desacoplados. Eso requiere otra capa de coordinación sobre identidad visual, timing de entrada/salida y convivencia temporal de dos árboles, que no pertenece a la misma familia de problemas que resuelve `useFlip`.

## Primitiva base: `useFlip`

- Archivo: `src/react/useFlip.ts`
- Firma actual: `useFlip(containerRef, items, options?)`

La primitiva base del pilar es un hook de bajo nivel orientado a contenedores con hijos directos reordenables o relayoutables.

### Contrato de identidad

`useFlip` recibe:

- `containerRef`: ref al elemento contenedor
- `items`: array de items con `id` estable
- `options`: configuración opcional para stagger

El contrato de uso exige que cada **hijo directo** del contenedor tenga un atributo:

```html
data-flip-id="..."
```

Ese valor debe coincidir con el `id` del item correspondiente. El hook no desciende a nietos ni intenta descubrir nodos en profundidad: mide exclusivamente `container.children`.

Ese contrato mantiene la primitiva simple y determinista:

- identidad de datos: `items[i].id`
- identidad DOM: `data-flip-id`
- superficie de medición: hijos directos del contenedor

### First y Last

El mecanismo interno usa dos snapshots de medición basados en `getBoundingClientRect()`:

- **First**: la caja conocida del ciclo anterior, persistida en un ref
- **Last**: la caja actual después de que React ya aplicó el cambio de DOM

Cada medición guarda:

- `x`
- `y`
- `width`
- `height`

El mapa persistido vive en un ref, no en state, porque no es estado declarativo de UI sino memoria operativa para comparar el layout anterior contra el siguiente.

### Cálculo de invert

Para cada `id` que existe tanto en el mapa anterior como en el actual, `useFlip` calcula:

- `deltaX = previous.x - current.x`
- `deltaY = previous.y - current.y`
- `scaleX = previous.width / current.width`
- `scaleY = previous.height / current.height`

Con eso obtiene el estado **invertido**: dejar el nodo visualmente donde estaba antes, aunque el layout real ya cambió.

La aplicación inicial se hace con `transform` inline:

- `translate(deltaX, deltaY)`
- `scale(scaleX, scaleY)`

Luego la animación consiste en interpolar manualmente esa inversión hacia identidad:

- `translate(0, 0)`
- `scale(1, 1)`

### Por qué `useLayoutEffect`

La primitiva está implementada con `useLayoutEffect`, no con `useEffect`.

La razón es que FLIP depende del orden exacto de estas fases:

1. React confirma el nuevo DOM.
2. El hook mide el layout ya mutado.
3. El hook aplica inmediatamente el estado invertido.
4. El navegador pinta ese frame invertido.
5. Recién después arranca la interpolación.

`useEffect` corre demasiado tarde, después del paint. Si la inversión se aplicara ahí, el usuario vería primero el estado final de layout y luego un salto hacia atrás para empezar a animar, rompiendo completamente la ilusión FLIP.

`useLayoutEffect` permite medir y escribir estilos en la ventana correcta: después del commit, antes del paint.

### Reflow forzado

Después de aplicar el frame invertido inicial, `useFlip` fuerza un reflow leyendo:

```ts
element.offsetHeight
```

El objetivo no es “medir altura” sino obligar al navegador a confirmar ese estado invertido como frame real antes de empezar la vuelta a identidad.

Sin ese paso, el navegador puede fusionar:

- la escritura del invert inicial
- la escritura de los frames posteriores

en una sola actualización visual, eliminando la fase intermedia que FLIP necesita para funcionar correctamente.

### Integración con el spring existente

`useFlip` no usa `transition: transform ...` de CSS para reproducir la vuelta a identidad. En su lugar se integra con:

- `src/core/spring-solver.ts`
- `src/core/raf-driver.ts`

igual que `useSpring`.

Cada elemento animado crea un `RafSpringDriver` con progreso de `0` a `1`. En cada snapshot del spring, `useFlip` interpola manualmente:

- `translate`
- `scale`

de vuelta a identidad.

La elección de spring sobre transición CSS fue deliberada por consistencia arquitectónica:

- Bylgja ya tiene un motor físico determinista
- el resto del sistema ya habla en términos de progreso de spring, no de easing CSS
- el driver existente ya resuelve arranque, delay y suscripción frame a frame
- el comportamiento queda alineado con el resto de las primitivas del paquete

Eso evita bifurcar la librería en “unas animaciones con motor físico” y “otras con transitions CSS”, que llevarían a modelos mentales distintos y calibraciones incoherentes.

## Bug corregido: contaminación de medición

Durante la implementación apareció un bug importante de orden de operaciones.

La versión defectuosa medía `currentMeasurements` antes de detener animaciones activas del ciclo anterior. Si `useFlip` se disparaba de nuevo mientras una animación previa todavía estaba en curso, `getBoundingClientRect()` leía la posición visual intermedia contaminada por el `transform` inline todavía aplicado.

Eso producía una mezcla incorrecta:

- `previousMeasurements`: snapshot de layout real anterior
- `currentMeasurements`: snapshot visual intermedio contaminado

en lugar de comparar dos estados de layout reales.

La corrección fue mover la limpieza de animaciones activas **antes** de medir:

1. detener drivers activos
2. limpiar `transform`, `transition`, `transformOrigin` y `willChange`
3. recién entonces medir `currentMeasurements`

Con ese reordenamiento, la medición actual vuelve a representar la caja real de layout y no una posición transitoria de composición.

## Separación de responsabilidades con `Presence`

`useFlip` anima exclusivamente elementos cuyo `id` persiste entre el estado anterior y el estado actual.

Eso significa:

- si un `id` existe en ambos snapshots, `useFlip` puede animarlo
- si un `id` solo existe antes, `useFlip` lo ignora
- si un `id` solo existe después, `useFlip` también lo ignora

Esa decisión no es una limitación accidental sino una frontera de responsabilidad explícita.

Entradas y salidas de nodos no son trabajo de `useFlip`; pertenecen a `Presence`, que ya resuelve montaje diferido, desmontaje diferido y convivencia temporal de estados visibles y salientes. La composición esperada es:

- `useFlip` para persistencias con cambio de layout
- `Presence` para entradas y salidas

Mantener esa separación evita cargar a `useFlip` con una doble responsabilidad:

- animar persistencias geométricas
- coordinar ciclos de vida de nodos que aparecen o desaparecen

## Stagger opcional

`useFlip` soporta un tercer parámetro opcional `options` con:

- `staggerMode`
- `propagationConfig`

### Modos disponibles

#### `none`

Es el valor por defecto y conserva el comportamiento base del hook. No calcula propagación ni amplitud, y cada elemento anima con delay `0`.

#### `index`

Este modo reutiliza `createWavePropagation` sin modificarla. Antes de arrancar los springs, construye un array sintético de `PropagationElement` donde:

- `x` es el índice del item dentro del array `items` actual
- `y` es `0`
- el origen es `{ x: 0, y: 0 }`

Eso convierte el orden de la secuencia en una “geometría lineal” artificial. El resultado es una propagación secuencial por posición lógica, no por distancia espacial real.

#### `distance`

También reutiliza `createWavePropagation` sin tocar su implementación, pero construye las coordenadas de entrada con:

- `x = deltaX`
- `y = deltaY`
- origen `{ x: 0, y: 0 }`

Matemáticamente, la distancia interna que calcula `createWavePropagation` pasa a ser:

```ts
sqrt(deltaX * deltaX + deltaY * deltaY)
```

es decir, la magnitud del desplazamiento FLIP de cada elemento. Con eso, los nodos que recorren trayectos más largos pueden arrancar más tarde y recibir atenuación distinta que los de trayecto corto.

### Reutilización de `createWavePropagation`

El punto clave del diseño es que `useFlip` no introdujo un segundo sistema de stagger. En vez de duplicar lógica, toma una utilidad ya existente pensada para propagación y le entrega coordenadas sintéticas acordes al modo deseado.

La integración actual usa el resultado por `id` para dos cosas:

- `delay`: se pasa al `RafSpringDriver` como `startDelay`
- `amplitude`: modula la distancia de traslación recorrida durante la interpolación

### Sobre `propagationSpeed`

`propagationConfig` se expone sin transformación para que el consumidor pueda pasar:

- `propagationSpeed`
- `minAmplitude`
- `maxAmplitude`

Esto es importante especialmente en `index`. Los defaults de `createWavePropagation` están calibrados para distancias continuas en píxeles. Cuando la “distancia” deja de ser espacial y pasa a medirse en unidades discretas de índice, esos mismos defaults no necesariamente producen delays perceptualmente útiles. Por eso `propagationSpeed` quedó configurable desde el consumidor.

## Bug corregido: amplitud aplicada en el frame inicial

Durante la integración del stagger apareció un segundo bug visual.

La primera versión aplicaba `amplitude` ya en el frame inicial invertido, antes de arrancar el spring. Eso hacía que el elemento no arrancara desde su posición vieja real, sino desde una versión ya atenuada del desplazamiento. Como ese frame inicial se escribe sin transición, el resultado era un salto instantáneo en el momento del reorder.

La corrección fue separar dos responsabilidades:

- el **frame 0** usa `deltaX` y `deltaY` originales, sin escalar
- la interpolación dentro de `driver.subscribe` usa `effectiveDeltaX` y `effectiveDeltaY`, ya modulados por `amplitude`

En otras palabras:

- el punto de partida visual debe ser exacto
- la atenuación solo tiene sentido durante la vuelta progresiva hacia identidad

El reflow forzado con `offsetHeight` se mantuvo después de ese frame inicial sin escalar, para asegurar que el navegador confirme primero la posición vieja real antes de empezar la interpolación atenuada.

## `useBreakpoint`

- Archivo: `src/react/useBreakpoint.ts`
- Propósito: utilidad independiente para derivar buckets de viewport desde media queries

Aunque no forma parte del núcleo de `useFlip`, este pilar incorporó también una utilidad complementaria: `useBreakpoint`.

### Tokens fijos

El hook exporta `BREAKPOINTS` con valores fijos que siguen los defaults estándar de Tailwind:

- `sm: 640`
- `md: 768`
- `lg: 1024`
- `xl: 1280`
- `2xl: 1536`

También define el tipo:

- `Breakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl"`

donde `base` representa cualquier ancho inferior a `640px`.

### Implementación con `matchMedia`

La detección no escucha `resize` crudo ni recalcula manualmente el ancho del viewport en cada evento. En su lugar:

- registra una `MediaQueryList` por breakpoint con `min-width`
- escucha cambios en cada media query
- resuelve el bucket activo como el mayor umbral actualmente en `matched`

Eso tiene dos ventajas:

- delega en el navegador la lógica de umbrales
- reduce renders a cambios semánticos de bucket, no a cada resize intermedio

También contempla entornos sin `window`, devolviendo `"base"` como valor inicial seguro para SSR antes de que el efecto corra en cliente.

### Desacople deliberado respecto de `useFlip`

`useBreakpoint` fue diseñado de forma explícitamente desacoplada de `useFlip`.

La relación entre ambos no es:

- “`useFlip` escucha resize”

sino:

- un consumidor deriva estado React desde `useBreakpoint`
- ese estado cambia el layout
- el cambio de layout vuelve a disparar `useFlip`

Eso mantiene a `useFlip` enfocado en su responsabilidad real: animar diferencias de layout entre dos renders. No necesita saber nada sobre resize, media queries ni breakpoints; solo reacciona a que el consumidor cambió el árbol o las reglas que afectan el layout.

## Estado final

El Pilar 6 quedó resuelto en tres bloques complementarios:

### `useFlip` núcleo

La primitiva base ya existe y cubre:

- medición `First` y `Last`
- cálculo invert con traslación y escala
- aplicación previa al paint con `useLayoutEffect`
- reflow forzado
- reproducción vía spring usando `raf-driver`

### Stagger

El stagger opcional también quedó integrado y corregido:

- `none`
- `index`
- `distance`

Los modos con stagger reutilizan `createWavePropagation` sin modificarla, y ya incorporan las dos correcciones importantes surgidas durante el trabajo:

- limpieza de animaciones activas antes de medir
- amplitud aplicada solo durante la interpolación, no en el frame inicial

### `useBreakpoint`

La utilidad de breakpoint quedó implementada y reutilizable por fuera del caso FLIP. En el playground se usa para derivar columnas reales del grid en función del viewport, validando que un cambio de bucket provoque un cambio de layout auténtico y que ese cambio dispare la transición FLIP esperada.

### Validación en playground

El caso de prueba final del playground combina:

- reorder aleatorio completo
- selector de `staggerMode`
- derivación de columnas por breakpoint real

Eso permite validar visualmente:

- reorders dentro de la misma vista
- stagger lógico por índice
- stagger geométrico por magnitud de desplazamiento
- relayout real al redimensionar la ventana del navegador

En resumen, los tres bloques del pilar:

- `useFlip` núcleo
- stagger opcional
- `useBreakpoint`

quedaron completos, corregidos y validados dentro del playground actual.
