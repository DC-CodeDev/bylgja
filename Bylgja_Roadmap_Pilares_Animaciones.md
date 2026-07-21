# Bylgja — Reorganización de roadmap de animaciones en pilares reutilizables

## Contexto

Este documento nace de una lista extensa de ideas de animaciones generada externamente (GPT), organizada por categoría visual (texto, scroll, cursor, gestos, morphing, etc). Esa organización sirve para pensar como usuario final, pero no sirve como plan de construcción: agrupar por categoría visual lleva a reinventar la misma primitiva técnica muchas veces con nombres distintos.

Este documento reclasifica la misma lista, pero por capa arquitectónica y primitiva técnica compartida, siguiendo la lógica ya establecida en Bylgja (`core/` matemática pura, `react/` bindings, `variants/` patrones de alto nivel, `a11y/`). El objetivo es identificar qué primitivas nuevas conviene construir, en qué orden, y qué ítems de la lista original son en realidad el mismo mecanismo con nombre distinto.

Estado de partida real de Bylgja al momento de este documento:

- `core/spring-solver.ts` — oscilador armónico amortiguado (stiffness, damping, mass), integración por Euler semi-implícito, paso fijo con acumulador.
- `core/raf-driver.ts` — loop de requestAnimationFrame con clamp de deltaTime, se detiene al asentarse.
- `react/useSpring` — hook que escribe `--spring-progress` como CSS custom property sin forzar re-render.
- `react/Presence` — componente wrapper que resuelve exit animations, maneja cancelación de salida y reentrada.
- `variants/` — fade, fadeScale, modalBackdrop, modalPanel, pressable, selectedHighlight.
- `a11y/reducedMotion` — elimina animaciones (no las acorta) si el usuario tiene la preferencia activada.

---

## Identidad: por qué Bylgja no debe ser un calco de iOS

Bylgja nació con un modelo de spring físico similar al de UIKit/Core Animation, y en una revisión de identidad se detectó el riesgo de que terminara sintiéndose como una copia del lenguaje de motion de iOS. Se decidió tratar el problema en tres ejes separados, porque cada uno se corrige con una herramienta distinta y no conviene resolverlos como si fueran lo mismo:

1. **Carácter matemático del movimiento** (spring físico en sí). Descartado como problema real: usar un oscilador stiffness/damping/mass no es "ser iOS", es el estándar de facto de cualquier librería de motion seria. El parecido real vendría de calibrar los valores por defecto para imitar el rebote exacto de iOS, no de usar springs en general. No se toca este eje.
2. **Vocabulario visual** (blur/vidrio, sheets, rubber-banding). Eje estético, independiente del motor de física.
3. **Filosofía subyacente** (qué historia cuenta el movimiento). Eje conceptual: la métrica de éxito de iOS es "sentirse conectado al dedo, responsivo". La filosofía elegida para Bylgja es distinta: el movimiento tiene un origen físico y se propaga desde ahí, coherente con el significado de "ola" en el nombre.

Decisión: el énfasis de identidad está en el eje 3, con el eje 2 subordinado a él — el vocabulario visual no se elige por gusto estético aislado, se deriva de la misma metáfora física que sostiene el eje 3. El eje 1 no requiere cambios.

### Distinción entre manipulación directa y movimiento iniciado por el sistema

No toda animación necesita identidad propia. Se separan dos categorías:

- **Manipulación directa** (drag, pull, press, swipe): el usuario está tocando el elemento en ese instante. El estándar de seguir 1:1 al puntero sin latencia es honestidad física básica, no un rasgo de iOS. Esta categoría se deja sin cambios, buscar diferenciación acá sería forzado y probablemente peor UX.
- **Movimiento iniciado por el sistema** (entradas de página, listas, modales, la animación firma Wave): el elemento se mueve sin que nadie lo esté tocando en ese momento. Acá vive la mayor parte de lo reconocible como "estilo iOS" (origen único tratado como bloque, mismo envelope de rebote sin importar tamaño o posición). Esta es la categoría donde se concentra el trabajo de identidad, y coincide directamente con el Pilar 1 (propagación).

---

## Pilar 0 — Ya resuelto, es configuración, no trabajo nuevo

Estos ítems de la lista original no requieren ninguna primitiva nueva. Son el mismo variant existente con otro parámetro.

| Ítem de la lista original | Variant que ya lo resuelve | Qué cambia |
|---|---|---|
| Fade, Fade Out | `fade` | nada, ya existe |
| Scale, Scale In | `fadeScale` | nada, ya existe |
| Press, Card Press, Lift (hover) | `pressable` | trigger o intensidad de compresión |
| Modal Scale In, Drop In, Sheet, Center Lift | `modalPanel` | punto de origen y salida |
| Backdrop Blur, Glass Fade | `modalBackdrop` | CSS del overlay |
| Dissolve | `fade` | blur agregado |
| Collapse (in/out) | `Presence` | animar height/scale en vez de opacity |

Conclusión: diez ítems de la lista original ya están cubiertos. No entran en el roadmap de arquitectura.

---

## Pilar 1 — Propagación por índice o posición

**Primitiva a construir:** función de orquestación que, dado un conjunto de N elementos, calcula un delay de arranque por elemento en función de su índice o de su distancia física a un punto de origen. Cada elemento sigue animando con su propio spring existente; lo nuevo es solo el cálculo del delay.

**Ítems que colapsan en esta primitiva:**

- Character Reveal
- Word Reveal
- Line Reveal
- Random Fade
- Grid Shuffle (parcialmente, ver Pilar 6)
- Flow
- Tide
- Wave (animación firma)

Wave, Tide y Flow no son primitivas distintas entre sí: son presets de la misma función de propagación con distinta curva de delay y distinta dirección. Character/Word/Line Reveal son la misma primitiva aplicada a texto; lo único adicional que requieren es un splitter de texto (utilidad, no primitiva de animación).

**Decisión de diseño — resuelta.** Se descartó acoplar springs entre sí de forma literal (sistema de ecuaciones acopladas entre nodos vecinos): es frágil y caro de mantener. Se adopta un camino intermedio, que preserva la sensación de ola real sin la complejidad de acoplar osciladores:

- Cada elemento sigue teniendo su propio spring independiente (reusa el `spring-solver` existente sin cambios).
- Delay de arranque y amplitud de rebote son ambos función pura de la distancia al punto de origen y del tiempo transcurrido — no solo el delay, también la fuerza del rebote se atenúa con la distancia. Esto es lo que diferencia una ola real de un simple stagger con retraso: en un stagger todos rebotan igual, en una ola el elemento lejano al origen apenas se mueve.
- **Origen de la propagación:** por defecto es el punto donde ocurrió la interacción del usuario (metáfora: una gota que cae en un estanque). Queda abierta la posibilidad de pasar un origen explícito distinto (por ejemplo la esquina de un div) como parámetro opcional, no como un segundo sistema paralelo — la primitiva siempre recibe un punto de origen, solo cambia de dónde sale ese valor.

**Prioridad:** primer pilar a construir. Es el que destraba más ítems por unidad de esfuerzo, y es además el pilar donde se concentra la identidad conceptual de la librería (ver sección de Identidad).

### Manifestación visual de la propagación (reemplazo del vocabulario glass/iOS)

Se decidió reemplazar el vocabulario visual heredado de iOS (blur/vidrio en `modalBackdrop`/`modalPanel`) por algo derivado de la misma metáfora física de propagación, en vez de elegir una estética nueva de forma aislada. Efecto colateral positivo: sacar el blur probablemente elimina el bug de compositing GPU ya conocido en los paneles de modal, dado que ese bug era producto del costo de blur.

Se evaluaron tres direcciones:

- **Opción A — traza de luz que viaja.** Un brillo/reflejo fino recorre el contorno del elemento en el instante en que la energía de propagación lo alcanza, y se apaga. Implementación con `transform`/`opacity` sobre un pseudo-elemento, sin filtros pesados. Costo de GPU mínimo.
- **Opción B — desplazamiento geométrico real mediante puntos de control.** Un `clip-path` poligonal con pocos puntos de control, animados con la misma función de propagación (los puntos cerca del origen se desplazan más). Deformación real del borde, pero interpolación de coordenadas en vez de recalcular cada píxel. Costo medio, fuerza repintado.
- **Opción C — pulso en el trazo del borde.** Un contorno SVG delgado con `stroke-dashoffset` animado que recorre el borde en el instante del impacto. Reutiliza directo la primitiva del Pilar 4 (familia barata: Draw Path/Stroke Reveal). Costo de implementación casi nulo.

Se descartó explícitamente la alternativa técnica más obvia para lograr distorsión real (`feTurbulence` + `feDisplacementMap`, filtros SVG de desplazamiento por píxel) por ser costosa de GPU en la mayoría de navegadores — el mismo tipo de problema que motivó sacar el blur en primer lugar, no una solución al problema sino el mismo problema con otro nombre.

**Decisión: se arranca con la Opción A.** Motivos: es la más sutil, la más barata de validar, y conceptualmente encaja mejor con la metáfora de ola real — la superficie del agua no solo se deforma, también refleja luz en la cresta. Se define además el criterio de escalado: si tras validar la Opción A se necesita más fidelidad geométrica, se sube a la Opción B con la confianza de que el concepto ya fue validado en movimiento.

Las tres opciones son manifestaciones intercambiables del mismo Pilar 1: reciben el mismo origen y la misma función de atenuación por distancia, solo cambia qué hacen con ese valor (mover un brillo, mover puntos de un polígono, mover un dashoffset). No son tres sistemas de efectos distintos.

**Plan de validación:** tratar la Opción A como spike aislado, no como parte directa del roadmap de pilares — probarla en un elemento de prueba chico y controlado antes de comprometerse a reemplazar el blur en `modalPanel`/`modalBackdrop`. El Pilar 1 (delay y amplitud) avanza en paralelo sin esperar al resultado del spike, porque sirve a otros variants aunque el tema visual no esté resuelto todavía. Preguntas a responder en el spike: fluidez real en un área grande tipo panel de modal; si la distorsión debe ser continua durante todo el trayecto o solo un pulso corto en el instante de impacto (la segunda opción es más barata y probablemente más intencional); confirmar que el efecto puede modelarse como una segunda salida del mismo Pilar 1 en vez de un sistema aparte.

---

## Pilar 2 — Tracking de puntero

**Primitiva a construir:** hook/utilidad que expone posición (x, y) del puntero relativa a un elemento o a la pantalla, y opcionalmente su velocidad.

**Ítems que colapsan en esta primitiva:**

- Magnetic
- Tilt
- Cursor Follow
- Spotlight
- Cursor Glow
- Cursor Scale
- Cursor Spring
- Mouse Follow
- Mouse Repel
- Mouse Attraction
- Mouse Velocity

Once ítems, una sola primitiva. La diferencia entre ellos es qué se hace con el dato de posición: rotar (Tilt), trasladar (Magnetic/Follow), gradiente radial (Glow/Spotlight), invertir signo (Repel), atraer (Attraction). Cursor Spring es enchufar el spring-solver existente al resultado del tracking, sin trabajo adicional. Mouse Velocity comparte el cálculo de velocidad con el Pilar 3.

---

## Pilar 3 — Observación de scroll

**Primitiva a construir:** utilidad que expone progreso de scroll normalizado (0 a 1) y opcionalmente velocidad/dirección.

**Ítems que colapsan en esta primitiva:**

- Scroll Reveal
- Scroll Progress
- Sticky Progress
- Parallax
- Velocity (scroll)
- Direction
- Momentum
- Magnetic Snap

Scroll Reveal no es una animación nueva: es un trigger nuevo que dispara `fade`/`fadeScale` existentes al cruzar un umbral. Parallax es el mismo progreso mapeado a translateY con distinto factor por capa. El cálculo de velocity debería ser una función compartida con el Pilar 2 (mismo cálculo de delta-posición sobre delta-tiempo, aplicado a otro eje), no una segunda implementación.

---

## Pilar 4 — Interpolación de valores no numéricos

Este pilar tiene dos familias internas, de dificultad muy distinta.

**Familia A — barata, extensión de lo existente:**

- Draw Path
- Undraw
- Stroke Reveal
- Trim Path

Las cuatro son la misma técnica (stroke-dashoffset animado vía `Presence`), cambiando el signo de dirección.

**Familia B — primitiva nueva, no trivial:**

- Shape Morph
- Morph Path
- Number Morph
- Border Radius Morph

Shape Morph y Morph Path requieren interpolar de verdad la forma de un atributo `d` de SVG — primitiva nueva y compleja, no una extensión menor. Number Morph y Border Radius Morph son interpolación de un valor escalar, cercana a lo que ya hace el spring-solver, con la diferencia de que el consumidor final es texto o border-radius en vez de opacity/transform.

---

## Pilar 5 — Gestos con inercia

**No requiere primitiva nueva.** Es composición de piezas ya existentes.

**Ítems que colapsan acá:**

- Drag
- Swipe
- Pull
- Throw
- Momentum Drag
- Snap Back

La captura de puntero ya está resuelta en `pressable` (incluye el fix del bug de soltar fuera del elemento). El rebote elástico al soltar es el spring-solver tal cual existe hoy. Lo único a agregar es el cálculo de velocidad al soltar (reutiliza la función compartida de los Pilares 2 y 3) y decidir si hay resistencia al arrastre (Pull) o vuelo con decay (Throw).

---

## Pilar 6 — Layout (técnica FLIP)

**Primitiva a construir:** medición de posición y tamaño de un elemento antes y después de un cambio en el DOM, animando la diferencia con el spring existente.

**Ítems que colapsan en esta primitiva:**

- Auto Layout Transition
- Shared Layout
- Reorder
- Grid Shuffle
- Masonry Rearrange
- Shared Element
- Crossfade

Shared Layout y Shared Element son la misma técnica aplicada entre dos vistas en vez de dentro de la misma vista. Reorder y Grid Shuffle dependen también del Pilar 1 si se quiere que el reacomodo tenga delay escalonado en vez de que todos los elementos se muevan simultáneamente.

Nota de riesgo: este es probablemente el pilar técnicamente más difícil de toda la lista.

---

## Pilar 7 — Loop CSS puro (aparte del motor físico)

Estos ítems no tocan el spring-solver ni `Presence`. Son keyframes CSS de loop infinito. Se recomienda tratarlos como pilar separado, casi una hoja de utilidades CSS, en vez de forzarlos dentro del sistema de springs.

- Skeleton Pulse
- Skeleton Wave
- Orbit
- Dot Bounce
- Wave Loader
- Morph Loader
- Pulse
- Float
- Breathing
- Wiggle
- Glow
- Bounce

---

## Descartes directos — presets, no primitivas

Estos ítems no son primitivas nuevas. Son combinaciones de blur, fade, scale y timing particular montadas sobre pilares que ya van a existir. Se listan para no perderlos, pero no ocupan lugar en el roadmap de arquitectura — se arman solos una vez construidos los Pilares 0 a 4.

- Mist
- Frost
- Depth
- Settle
- Eclipse
- Drift
- Liquid Text
- Stretch
- Blur Focus
- Perspective Reveal
- Ripple físico
- Route Transition
- Fade Through
- Type / Scramble (ya existe en Bylgja)

---

## Resumen de reducción

La lista original de aproximadamente ochenta y pico de ítems se reduce a:

- 1 pilar ya construido (Pilar 0)
- 6 pilares reales de arquitectura nueva o extensión (Pilares 1 a 6)
- 1 pilar aparte de utilidades CSS sin relación con el motor físico (Pilar 7)
- 1 bolsa de presets que se resuelven solos una vez construidos los pilares base (Descartes)

## Principios de proceso, inspirados en estudios de referencia (Dogstudio, Active Theory, Locomotive)

Bylgja va a ser el corazón del funcionamiento de toda la Suite, por lo que no solo importa qué se construye sino por qué se decide construirlo así. Esta sección documenta la disciplina de proceso adoptada, separando lo que es imitable sin presupuesto de estudio grande de lo que es específico de sus recursos.

### Uno — motion como sistema de tokens, no animaciones sueltas

Un puñado chico de curvas y timings con nombre (ya existe el embrión con GENTLE/SNAPPY) debe ser lo que casi todo componente consume. Cada pilar nuevo no debería inventar sus propias constantes de spring — todos tiran de la misma paleta de timings. Esto es lo que hace que la Suite entera se sienta como un solo lenguaje en vez de una colección de efectos independientes.

### Dos — distinción explícita entre momentos firma y momentos utilitarios

No todos los pilares merecen el mismo nivel de pulido ni el mismo presupuesto de tiempo. Un estudio de referencia no le da el mismo nivel de detalle a un botón que a la animación de entrada de un hero: el momento firma se prototipa aislado, se itera a mano, se prueba en dispositivos débiles; el momento utilitario usa una receta genérica del sistema y no necesita atención especial. Tratar todo con la misma ambición hace que no alcance el tiempo para nada; tratar todo como genérico hace que nada se recuerde.

Clasificación aplicada a los pilares de este documento:

| Pilar | Clasificación | Razón |
|---|---|---|
| Pilar 1 — Propagación | Firma | Es donde vive la identidad conceptual de Bylgja (ola, energía, atenuación). Merece iteración lenta y cuidadosa, incluyendo el spike de manifestación visual. |
| Pilar 2 — Tracking de puntero | Utilitario | Necesita funcionar bien y consistente, no necesita identidad visual propia. |
| Pilar 3 — Observación de scroll | Utilitario | Ídem Pilar 2. |
| Pilar 4 — Interpolación de valores | Mixto | Familia A (stroke) utilitaria y barata; Familia B (morph real) requiere más cuidado por ser primitiva nueva no trivial, pero no es un momento firma en sí mismo. |
| Pilar 5 — Gestos con inercia | Utilitario | Estándar de honestidad física (manipulación directa), no busca diferenciación de marca. |
| Pilar 6 — Layout (FLIP) | Utilitario, alto riesgo técnico | Prioridad técnica de robustez, no de identidad visual. |
| Pilar 7 — Loop CSS | Utilitario | Aparte del motor físico por completo. |

Esta distinción también resuelve parcialmente el criterio de priorización que había quedado abierto: los pilares utilitarios pueden construirse más rápido y genéricos; el pilar firma se merece el tiempo lento que ya se le está dando.

### Tres — un único orquestador central, costo medido antes de comprometerse

Bylgja ya cumple la primera mitad de este principio: `raf-driver` es el punto único que coordina los loops de animación, no hay múltiples loops sueltos compitiendo. La segunda mitad es de proceso: antes de integrar un efecto nuevo a un componente real (por ejemplo la Opción A dentro de `modalPanel`), se prueba aislado en un elemento de control para medir el costo real, no se asume. El spike de la Opción A definido en el Pilar 1 es la aplicación directa de este principio.

### Cuatro — degradación consciente según capacidad del dispositivo (pendiente, no urgente)

Distinto de respetar `prefers-reduced-motion` (que ya resuelve `a11y/reducedMotion`, una preferencia explícita del usuario). Este principio es sobre capacidad real de hardware: detectar si el dispositivo es débil y bajar la ambición del efecto antes de que se note lento — menos precisión en la propagación, sin distorsión de borde en equipos flojos, etcétera. Bylgja hoy no resuelve esto. No es urgente, pero es una pieza que en algún momento del roadmap le va a faltar a la librería para que el pilar firma no rompa la experiencia en hardware limitado.

---

## Pendiente de decisión antes de construir

1. Resultado del spike de la Opción A (traza de luz) sobre un elemento de control — validar fluidez, decidir si la distorsión es continua o un pulso puntual, y confirmar que se modela como segunda salida del Pilar 1 antes de tocar `modalPanel`/`modalBackdrop` en serio.
2. Formalizar la paleta de tokens de timing (principio Uno) como documento o módulo propio dentro de `core/`, para que los pilares 2 en adelante no inventen constantes sueltas.
3. Criterio de priorización entre pilares utilitarios restantes (2, 3, 5, 6, 7): orden de construcción según necesidad inmediata de Huginn vs relevancia para la librería pública. Sigue abierto, aunque la clasificación firma/utilitario ya reduce su impacto porque los utilitarios se asumen más rápidos y genéricos en cualquier orden.
4. Degradación por capacidad de hardware (principio Cuatro): sin resolver, no bloqueante para el trabajo inmediato.
