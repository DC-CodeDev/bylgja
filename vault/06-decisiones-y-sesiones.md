# Decisiones y sesiones

## 2026-07-20

### Cierre del Pilar 1 — propagación (sesión del 20 de julio de 2026)

**Estado final: primitiva de core y mecanismo de consumo terminados. Orquestación de React explícitamente fuera del alcance de la librería.**

#### Lo que se construyó

**`core/raf-driver.ts` — soporte de `startDelay`.** El driver acepta un campo opcional `startDelay` (segundos, default 0) en `RafSpringDriverOptions`. Mientras el delay no se cumple, el loop de RAF sigue pidiendo frames pero no llama a `solver.advance()` ni emite snapshots a los listeners — evita costo de notificación innecesario con muchos elementos esperando delays distintos en simultáneo. El frame que cruza el umbral del delay avanza el solver en el mismo tick, sin perder ni duplicar tiempo. El estado de delay se reinicia en cada llamada a `start()`, no solo en la creación del driver, para que una animación reiniciada vuelva a esperar el delay completo. Sin impacto en ningún consumidor existente que no use el campo nuevo.

**`react/useSpring.ts` — migración de firma.** Cambio de ruptura deliberado, sin capa de compatibilidad hacia atrás: la firma pasó de parámetros posicionales (`useSpring(targetValue, config, initialValue?, onSettled?)`) a un único objeto `UseSpringOptions` (`targetValue`, `config`, `initialValue?`, `onSettled?`, `startDelay?`). Se eliminó el tipo `UseSpringConfig`, que era un alias redundante de `SpringSolverConfig` sin valor agregado; `useSpring` ahora usa `SpringSolverConfig` directamente. `startDelay` forma parte del `configKey` que decide cuándo recrear el driver, así que un cambio de `startDelay` entre renders dispara recreación igual que cualquier otro parámetro físico. Decisión de alcance: el cambio se hizo ahora, con solo tres consumidores directos (`Presence`, `pressable`, `selectedHighlight`) y sin consumidores externos comprometidos con la firma vieja, para no arrastrar la deuda a futuro cuando el catálogo de variants y de plantillas sea más grande.

**`core/wave-propagation.ts` — primitiva de cálculo.** Función pura `createWavePropagation(elements, origin, config?)`, sin dependencias de React ni del DOM. Recibe una lista de `PropagationElement` (`id`, `x`, `y`) y un `PropagationOrigin` (`x`, `y`), devuelve una lista de `PropagationResult` (`id`, `delay` en segundos, `amplitude`) en el mismo orden de entrada.

- `delay`: lineal, distancia dividida `propagationSpeed` (default 800 unidades/segundo). Sin normalizar — es tiempo real de espera.
- `amplitude`: caída no lineal en función de la distancia normalizada al elemento más lejano del conjunto, usando raíz cuadrada de la distancia normalizada (`amplitude = maxAmplitude - (maxAmplitude - minAmplitude) * sqrt(normalizedDistance)`). Se eligió esta curva en vez de inverso al cuadrado porque la metáfora de Bylgja es una onda circular bidimensional (energía repartida sobre el perímetro de un círculo, que crece linealmente con el radio), no una fuente puntual irradiando en tres dimensiones (donde sí aplicaría el inverso al cuadrado, caso de radiación, luz o gravedad).
- Caso especial: un elemento con distancia prácticamente cero al origen recibe `amplitude = maxAmplitude` y `delay = 0` directo, sin pasar por la fórmula, para evitar comportamiento indefinido en el límite.
- Caso especial de conjunto degenerado: si todos los elementos coinciden exactamente con el origen (distancia máxima del conjunto es cero), se evita la división por cero asignando a todos `amplitude = maxAmplitude` y `delay = 0` directamente, sin calcular una distancia normalizada.
- Lista de elementos vacía lanza error explícito, no devuelve lista vacía en silencio.
- Validación de configuración: `propagationSpeed` debe ser finito y mayor a cero; `minAmplitude` y `maxAmplitude` deben ser finitos y `minAmplitude` no puede superar a `maxAmplitude`.

**Corrección de calidad durante la construcción:** una primera versión de la función incluía una tercera rama especial (`dist === maxDist` para el elemento más lejano) agregada para hacer pasar un test con igualdad estricta de punto flotante (`toBe(0.3)`). Se identificó como una compensación incorrecta — el problema era del test, no de la función — y se corrigió eliminando la rama de producción (con comparación frágil de igualdad entre floats) y ajustando el test a `toBeCloseTo`, consistente con el resto del archivo. Queda como precedente de proceso: un test que falla por precisión de punto flotante es señal de revisar el test, no de agregar casos especiales a la función.

#### Decisión de alcance: sin hook orquestador dentro de Bylgja

Se evaluó construir un hook de React que combine `createWavePropagation` con múltiples instancias de `useSpring` para animar un conjunto de N elementos automáticamente. Se decidió explícitamente no construirlo dentro de la librería, por tres razones:

1. Cómo se miden las posiciones de los elementos (DOM real vía `getBoundingClientRect`, o estado propio del consumidor como el canvas de nodos de Huginn) varía por consumidor y no tiene una respuesta única correcta.
2. Cómo se determina el punto de origen (un click, un elemento fuente fijo, el centro de la pantalla) es una decisión de producto y de diseño de cada proyecto, no una decisión de física ni de motion.
3. El destino principal de Bylgja hoy incluye plantillas web de venta con necesidades de layout muy distintas entre sí (portfolios de fotografía, arquitectura, y eventualmente rubros barriales). Imponer una forma de orquestación dentro de la librería generaría acoplamiento que limitaría el diseño de futuras plantillas en vez de habilitarlo.

Consecuencia práctica: Bylgja expone la primitiva de cálculo pura y el mecanismo de consumo (`startDelay`), pero no un hook de alto nivel para propagación. La conexión entre `amplitude` calculada y el `targetValue` real de cada `useSpring` (por ejemplo, si `amplitude` multiplica el `targetValue`, o modula otra propiedad visual) queda completamente en manos de cada consumidor.

#### Validación visual con múltiples elementos

Se armó un segundo spike en el playground (`WavePropagationView.tsx`, alternable con el spike de `offset-path` de la sesión anterior mediante un toggle en el header), con una grilla de 36 elementos. Al hacer click en cualquier celda, esta actúa como origen: se miden las posiciones reales de todas las celdas con `getBoundingClientRect`, se llama a `createWavePropagation` con los valores por defecto sin modificar, y cada celda usa su propio `useSpring` con el `delay` recibido como `startDelay` y una escala visual (`1 + amplitude`) como `targetValue`, volviendo a tamaño normal vía `onSettled` una vez asentada.

Resultado: la propagación se percibe efectivamente como una ola viajando hacia afuera desde el punto de origen, sin necesidad de ajustar `propagationSpeed` respecto al valor por defecto (800). El regreso inmediato a tamaño normal al asentarse, sin pausa en el punto máximo, se sintió bien tal cual quedó implementado. Que la celda de origen también anime (consecuencia matemática de la fórmula, no una decisión visual deliberada) no se percibió como un problema.

Durante este spike se encontró y corrigió una regresión no relacionada: `playground/src/App.tsx` (el spike de `offset-path` de la sesión anterior) seguía usando la firma posicional vieja de `useSpring`, rota desde la migración a firma de objeto de la misma sesión de hoy. Quedó como recordatorio de que un cambio de firma en el núcleo puede dejar código periférico (playgrounds, ejemplos, demos) roto en silencio si no se revisa explícitamente después del cambio.

#### Pilar 1 — estado final

Terminado en el alcance decidido, y validado visualmente con múltiples elementos, no solo con un caso aislado. No queda pendiente ninguna pieza de infraestructura para que un consumidor real empiece a construir propagación sobre sus propios elementos.

### Pilar 2 — tracking de puntero (sesión del 20 de julio de 2026)

**Estado: primitiva construida, probada, y validada visualmente con un caso de uso real. No conectada todavía a `index.ts` como API pública.**

#### Qué es y para qué sirve

Antes de construir, se aclaró el propósito del pilar: no es una animación en sí misma, es una primitiva de datos — la posición del cursor relativa a un elemento, expuesta de forma eficiente para que distintos efectos la consuman. Dos categorías de uso identificadas: algo que sigue al cursor (estela, resplandor), y algo que reacciona según la cercanía o posición del cursor sin moverse hacia él (tilt, paralaje, inflado sutil de botones). La segunda categoría es la más relevante para el destino actual de Bylgja (plantillas de portfolio visual).

#### Decisiones de diseño

**Hook puro en `react/`, sin capa `core/` separada.** A diferencia de `createWavePropagation`, que es matemática pura sin vínculo obligado al DOM, el tracking de puntero es inherentemente DOM — no hay una versión útil de esto separada de eventos reales del navegador. Se descartó forzar una separación arquitectónica que no aporta nada acá.

**Sin re-renders de React.** Mismo patrón que `useSpring`: la posición se escribe directo como custom properties CSS sobre el elemento (`--pointer-x`, `--pointer-y`, `--pointer-normalized-x`, `--pointer-normalized-y`, `--pointer-inside`), sin pasar por `useState`. `pointermove` puede dispararse decenas de veces por segundo; forzar un re-render de React en cada evento sería el problema de rendimiento más serio de todo el roadmap si se hiciera mal.

**Rect del elemento cacheado, no remedido en cada evento.** `getBoundingClientRect()` fuerza recálculo de layout si el navegador lo considera necesario. Medir en cada `pointermove` sería constante y en gran parte redundante. Se mide una vez en `pointerenter` y se reutiliza durante todo el movimiento posterior. Para cubrir el caso de un elemento que cambia de tamaño mientras el cursor sigue encima (por ejemplo, una tarjeta que crece al hacer hover), se agregó un `ResizeObserver` que remide y actualiza el rect cacheado cuando detecta un cambio real de tamaño, sin esperar a un nuevo `pointerenter`.

**Comportamiento en `pointerleave`.** La custom property `--pointer-inside` cambia a `0` explícitamente, permitiendo que el CSS consumidor reaccione al cambio (por ejemplo, para que un efecto vuelva a su estado neutral). Los valores de posición (`x`, `y`, `normalizedX`, `normalizedY`) no se resetean, quedan en su último valor real conocido — decisión consciente, coherente con dar al consumidor la información completa de dónde estaba el cursor antes de salir, en vez de borrarla.

#### Corrección de calidad durante la construcción

La primera versión conectaba correctamente este comportamiento en las custom properties CSS, pero el callback opcional `onMove` (para consumidores que necesitan lógica en JS además de CSS) reportaba `x: 0, y: 0, normalizedX: 0, normalizedY: 0` en el evento de salida, en vez del último valor real — una inconsistencia entre las dos vías de lectura del hook que no estaba especificada explícitamente en el diseño original y que CC resolvió por su cuenta de forma incorrecta respecto a la intención ya acordada para el lado CSS. Se corrigió agregando una referencia interna que guarda el último `PointerPosition` calculado en cada `pointermove`, para que `pointerleave` lo reutilice en vez de reconstruir un objeto con ceros. El caso borde de `pointerleave` sin ningún `pointermove` previo sí reporta ceros correctamente, al no existir ningún valor real anterior que preservar.

#### Validación visual

Spike en el playground (`PointerTrackerTiltView.tsx`, tercera vista alternable junto a las de `offset-path` y `wave-propagation`): una tarjeta que se inclina en 3D (`rotateX`/`rotateY` vía CSS) según la posición del cursor dentro de ella, usando directamente `--pointer-normalized-x` y `--pointer-normalized-y`, con `--pointer-inside` como multiplicador de la rotación para que la tarjeta vuelva suavemente a plano al salir el cursor, mediante una transición CSS simple sin `useSpring`. Ángulo máximo de inclinación de 15 grados. Panel de texto mostrando los valores en vivo de `normalizedX`, `normalizedY`, `isInside` para confirmación numérica además de visual.

Resultado: la dirección de la inclinación se percibió correcta e intuitiva en las cuatro esquinas (la esquina hacia la que se acerca el cursor se levanta hacia él), sin necesidad de corregir el signo de la fórmula. El retorno a plano al salir el cursor funcionó como se esperaba.

#### Pilar 2 — estado final

Primitiva terminada, probada con 10 tests unitarios, y validada visualmente con un caso de uso representativo (tilt). Pendiente, sin urgencia: decidir si y cuándo se conecta a `index.ts` como parte de la API pública del paquete — mismo criterio de espera deliberada ya aplicado con `createWavePropagation`.

### Pilar 3 — observación de scroll (sesión del 20 de julio de 2026)

**Estado: primitiva construida, probada, auditada, y validada visualmente con un caso de uso real. No conectada todavía a `index.ts` como API pública.**

#### Qué es y para qué sirve

Mismo patrón que los pilares 1 y 2: primitiva de datos, no un efecto en sí misma. Expone en qué posición de scroll está un elemento respecto al viewport, para que distintos efectos reaccionen a eso. Casos de uso identificados para el futuro cercano: reveal on scroll (elementos que aparecen al entrar en viewport) y parallax (elementos que se desplazan a distinta velocidad que el scroll de la página). Se construyó pensando en ambos desde el diseño, aunque el spike de esta sesión solo valida el primero.

#### Decisiones de diseño

**Tres valores expuestos, no solo uno.** `--scroll-visible` (booleano, si el elemento intersecta el viewport según un threshold configurable, default 0.1), `--scroll-visible-ratio` (0 a 1, dato crudo de `IntersectionObserver`, prácticamente gratis de obtener), y `--scroll-progress` (0 a 1, calculado, el más costoso de los tres en términos de diseño). Se decidió construir `progress` ya en esta sesión en vez de posponerlo para cuando se construya parallax, porque los otros dos campos no requerían trabajo adicional real más allá de leer `IntersectionObserver` — el costo de diseño estaba concentrado en `progress`, y tenerlo ya resuelto evita tener que volver a este archivo cuando se aborde parallax más adelante.

**Definición de `progress` acordada explícitamente.** El recorrido considerado es la suma de la altura del viewport más la altura del elemento — no solo uno de los dos — para que el cálculo tenga sentido tanto para elementos más chicos que el viewport como para elementos más grandes. `progress = 0` en el instante en que el borde inferior del elemento coincide con el borde inferior del viewport (recién asoma desde abajo). `progress = 1` en el instante en que el borde superior del elemento coincide con el borde superior del viewport (terminó de salir por arriba). Resultado siempre clampeado entre 0 y 1 inclusive, para que ningún consumidor reciba valores fuera de rango en escenarios extremos de posición.

**Cálculo inmediato al montar, no solo reactivo a scroll.** Un elemento parcialmente visible al cargar la página (antes de cualquier scroll del usuario) debe mostrar su `progress` correcto desde el primer render, no arrancar en 0 artificialmente hasta el primer evento.

**Un cálculo por frame, no por evento crudo.** El evento `scroll` puede dispararse muchas veces por frame. Se agenda el recálculo real (`getBoundingClientRect` + fórmula de progreso) vía `requestAnimationFrame`, con una referencia que actúa de bandera para no agendar un segundo frame si ya hay uno pendiente. Mismo principio de eficiencia ya aplicado en `usePointerTracker` para `pointermove`, adaptado a la naturaleza distinta del evento de scroll (acá no hay un rect cacheable de forma útil, porque lo que cambia es justamente la posición relativa al viewport).

**Listener de scroll pasivo.** Se agregó `{ passive: true }` al listener de `scroll`, no solicitado explícitamente en el diseño pero correcto por buena práctica: le indica al navegador que este listener nunca llama `preventDefault()`, permitiendo optimizar el scroll sin esperar a que el código de Bylgja termine de ejecutarse.

#### Auditoría

Se auditó el código completo línea por línea, en particular la fórmula de `progress` verificada con números concretos (viewport de 1000px, elemento de 200px, confirmando que da exactamente 0 y exactamente 1 en los dos casos límite de la definición), el mecanismo de una sola ejecución por frame, y la ubicación del clamp. Sin hallazgos — la implementación coincidió con el diseño acordado sin desviaciones, a diferencia de los dos hooks anteriores de esta misma sesión donde la auditoría sí encontró comportamiento no especificado.

#### Validación visual

Spike en el playground (cuarta vista alternable junto a las de `offset-path`, `wave-propagation` y `pointer-tracker-tilt`): página de scroll vertical con ocho bloques distribuidos con espacio entre sí. Cada bloque usa `useScrollProgress` para un efecto de reveal compuesto — no un aparece/desaparece binario, sino opacidad y desplazamiento vertical controlados de forma continua por `--scroll-progress` durante el primer 30% del recorrido de cada elemento, con opacidad completa y posición final estable durante el resto. Panel fijo en pantalla mostrando en vivo los tres valores del elemento más activo mientras se scrollea.

Resultado: efecto validado sin ajustes, sin discontinuidad visible en el punto de quiebre donde termina el tramo de aparición.

#### Pilar 3 — estado final

Primitiva terminada, probada con 8 tests unitarios, auditada sin hallazgos, y validada visualmente con reveal on scroll. Parallax queda como caso de uso futuro sin fecha, ya habilitado por el campo `progress` sin necesidad de rediseñar la primitiva cuando se aborde. Pendiente, sin urgencia: decisión de si y cuándo conectar a `index.ts`, mismo criterio ya aplicado a `createWavePropagation` y `usePointerTracker`.

---

## 2026-07-19

### Validación del spike visual del pilar de propagación

Quedó registrado en `playground/` un spike aislado para validar la manifestación visual del Pilar 1 con `offset-path` y `useSpring`, no como feature final del paquete sino como prueba controlada.

Hallazgo documentado en `playground/src/styles.css`:

- usar `border-box` solo en Chromium llevaba a una interpretación visual incorrecta del recorrido;
- la solución aplicada fue definir la forma explícitamente con `offset-path: inset(0 round var(--card-radius)) border-box;`
- el radio se comparte mediante la custom property `--card-radius`, usada tanto por la card como por la traza

Conclusión de la sesión: la ruta explícita con `inset round` más una custom property compartida corrige la inconsistencia observada y deja el spike en estado utilizable para seguir evaluando la metáfora de propagación.

### Formalización de tokens de timing

En el árbol de trabajo actual:

- `src/tokens/tweens.ts` fue eliminado;
- `FADE_QUICK` salió de `src/index.ts`;
- `src/tokens/timing.css` se incorporó como token CSS central;
- `src/variants/fade.css` pasó a leer `--bylgja-duration-quick` y `--bylgja-ease-out`.

Decisión consolidada: para animaciones CSS puras, `timing.css` es la fuente de verdad y `FADE_QUICK` deja de formar parte de la API pública.

### Corrección del pipeline de build para CSS en `tokens`

El diff local de `scripts/copy-variant-css.mjs` muestra la ampliación del paso de copia:

- antes copiaba solo CSS desde `src/variants/`
- ahora también copia CSS desde `src/tokens/` a `dist/tokens/`

Motivo: el CSS distribuido del paquete ahora depende de `timing.css`.

### Verificación práctica de tree shaking

Se ejecutó `node tree-shake-check/run-check.mjs` el 19 de julio de 2026.

Resultado:

- bundle mínimo `pressable-only`: `6357` bytes minificados
- bundle `all-exports`: `14727` bytes minificados
- diferencia: `8370` bytes
- los términos `ModalPanel`, `ModalBackdrop`, `SelectedHighlight` y `Tooltip` no aparecieron en el bundle mínimo inspeccionado

Conclusión: el chequeo práctico disponible en el repo arrojó resultado positivo para tree shaking del JS.

### Criterio de priorización para pilares pendientes

El documento `Bylgja_Roadmap_Pilares_Animaciones.md` ya fija la decisión marco:

- el Pilar 1 de propagación es la prioridad principal por identidad y por cobertura funcional;
- la diferenciación de Bylgja no debe concentrarse en manipulación directa sino en movimiento iniciado por el sistema;
- el orden de pilares utilitarios debe leerse en función del nicho real de negocio de la Suite, orientado a plantillas web con alto peso visual para portfolios y superficies similares

Síntesis operativa de la sesión: la priorización favorece primero las primitivas que aportan lenguaje visual propio y utilidad transversal para ese nicho, antes que utilidades genéricas menos distintivas.
