# Funciones generales

Esta sección agrupa piezas de la librería que no nacieron del roadmap de pilares (Pilares 1–7) sino de un caso de uso real concreto surgido durante el desarrollo del portafolio de Bylgja Labs. Se documentan aquí en lugar de forzar un pilar nuevo que no les corresponde. Si alguna de estas piezas aparece como necesidad en un segundo proyecto de la Suite, ese momento sería el indicado para promoverla a primitiva formal con su propio pilar.

---

## `SmoothScrollProvider`

- Archivo: `src/react/SmoothScrollProvider.tsx`
- API pública: `SmoothScrollProvider`, `useSmoothScrollProgress`, `SmoothScrollProviderProps`

### Problema que resuelve

El scroll nativo del navegador tiene una respuesta inmediata y lineal: el contenido sigue al gesto sin inercia. Para el portafolio de Bylgja Labs se quería un scroll con física de resorte, donde el contenido persigue el destino del gesto con deceleración suave y sin rebote visible al detenerse. Ese comportamiento es parte del gesto de marca del portafolio, no una preferencia estética secundaria.

La solución más directa habría sido una librería externa especializada en smooth scroll. Se descartó porque Bylgja ya tiene un motor físico determinista (`spring-solver.ts` y `raf-driver.ts`) que resuelve exactamente ese problema, y agregar una dependencia externa para algo que el motor ya puede hacer sería incoherente con la arquitectura del paquete.

### Por qué no es una primitiva más genérica todavía

El diseño actual tiene un solo consumidor conocido: el portafolio de Bylgja Labs. Promover una primitiva a la API pública antes de que exista un segundo caso de uso real implica diseñar una API general sin datos suficientes sobre qué necesita un consumidor distinto. Eso casi siempre produce abstracciones que después necesitan romper compatibilidad.

La decisión fue construir lo que el portafolio necesita, documentarlo aquí, y revisitar el diseño si aparece un segundo proyecto de la Suite que necesite algo similar. En ese momento habrá información real sobre qué varía entre consumidores y qué puede permanecer fijo.

### Mecanismo

`SmoothScrollProvider` es un componente React que toma control del scroll de la página completa. Al montarse:

1. Intercepta los eventos `wheel` con `{ passive: false }` para poder llamar `preventDefault()` y anular el scroll nativo.
2. Cada evento acumula `deltaY * sensitivity` en un `scrollTarget` interno, clampeado entre `0` y `contenidoHeight - viewportHeight`.
3. Un `RafSpringDriver` persigue ese `scrollTarget` frame a frame. El driver se instancia una sola vez al montar y vive durante toda la vida del componente.
4. En cada frame, el subscriber del driver aplica `transform: translateY(-valor)` al contenedor del contenido.
5. En paralelo, llama a `window.scrollTo(0, valor)` para que la scrollbar nativa del navegador se mueva en sincronía con el contenido animado.

La clave arquitectónica es que el driver persigue un **target dinámico** en vez de uno fijo. Cada evento de wheel mueve el destino; el resorte decide cómo llegar ahí. Eso es lo que produce la inercia: el contenido sigue al gesto con la física del spring configurado, no con la respuesta lineal del sistema operativo.

El motor (`spring-solver.ts`, `raf-driver.ts`) no fue modificado para este propósito.

### El gotcha de settled y el reinicio del driver

El `RafSpringDriver` se autodetiene cuando el spring llega a su estado de reposo (`settled`). Eso es correcto en general, pero en este contexto produce un comportamiento incorrecto si se ignora.

Cuando el usuario para de scrollear, el driver termina de animar y se detiene automáticamente. Si el usuario scrollea de nuevo, `driver.setTarget()` actualiza el objetivo del solver interno pero **no reinicia el loop de RAF**. El driver queda con un target nuevo pero sin correr.

La corrección, igual a la que ya usa `useSpring` internamente para el mismo problema:

```ts
driver.setTarget(scrollTargetRef.current);
if (!driver.isRunning() && !driver.getSnapshot().settled) {
  driver.start();
}
```

Sin ese check, el primer giro de wheel después de un periodo de inactividad no produce ninguna animación visible. El contenido permanece quieto aunque el target haya cambiado.

### Nota de accesibilidad

El fallback de accesibilidad es binario: `getReducedMotionPreference()` se evalúa una sola vez dentro del `useEffect` de montaje. Si la preferencia `prefers-reduced-motion: reduce` está activa, el provider no registra el listener de `wheel`, no instancia el driver, no aplica transforms ni modifica `window.scrollTo`. La página cae a comportamiento de scroll nativo estándar sin ninguna de estas transformaciones activas.

Se usó `getReducedMotionPreference()` síncrono en lugar de `useReducedMotion()` porque no se necesita reactividad a cambios de la preferencia durante una sesión ya iniciada. Reaccionar a ese cambio en caliente requeriría desmontar y remontar el mecanismo completo, y ese caso no fue identificado como una necesidad real del portafolio.

### Dos detalles que surgieron durante la construcción

Ambos surgieron durante la implementación, no estaban en el diseño inicial.

**ResizeObserver para el spacer**

El contenido real de la página se renderiza con `position: fixed`, lo que lo saca del flujo normal del documento. Para que el navegador calcule correctamente la longitud scrolleable y muestre una scrollbar funcional, se agrega un elemento spacer vacío cuya altura refleja la altura real del contenido.

Esa altura no puede calcularse una sola vez al montar y olvidarse. Si el contenido cambia de altura después del montaje (fuentes que terminan de cargar, imágenes que llegan, contenido dinámico), el spacer quedaría desfasado y la scrollbar mostraría un largo incorrecto.

La solución fue un `ResizeObserver` sobre el contenedor de contenido que actualiza la altura del spacer cada vez que el contenedor cambia de tamaño.

**Aislamiento del eco de scroll programático**

Cada frame, el driver llama a `window.scrollTo(0, valor)` para mover la scrollbar nativa. Ese llamado dispara un evento `scroll` nativo en `window`. Si el provider estuviera escuchando eventos `scroll` para algo (teclado, TouchPad, u otras fuentes de input), ese eco programático sería indistinguible de input real del usuario y contaminaría el cálculo de `scrollTarget`.

Para aislar ese eco se usa un ref booleano `isProgrammaticScrollRef` que se activa antes del `scrollTo` y se desactiva inmediatamente después. Cualquier listener de `scroll` que se agregue en el futuro puede consultar ese ref para saber si el evento es genuino o un eco del driver.

En el estado actual el provider solo escucha `wheel`, no `scroll`, así que el eco no tiene ningún efecto práctico. El aislamiento se incluyó como defensa explícita ante extensiones futuras del componente.

### Valores de calibración

Los valores del spring se confirmaron en el playground de Bylgja (`?view=smooth-scroll`) sin necesidad de ajuste:

| Constante | Valor |
|---|---|
| `STIFFNESS` | `120` |
| `DAMPING` | `20` |
| `MASS` | `1` |
| `MAX_DELTA_TIME` | `0.1` |

Las cuatro constantes viven al tope de `src/react/SmoothScrollProvider.tsx` para facilitar iteraciones futuras de calibración sin necesidad de buscarlas en el medio de la lógica.

### API pública

Exportado desde `src/index.ts`:

- `SmoothScrollProvider` — componente provider, envuelve la página completa
- `useSmoothScrollProgress` — hook que devuelve el progreso de scroll normalizado (0–1) via Context; requiere estar dentro del árbol del provider
- `SmoothScrollProviderProps` — tipo de las props del provider (`children`, `sensitivity?`)

---

## `useOverlapTrigger`

- Archivo: `src/react/useOverlapTrigger.ts`
- API pública: `useOverlapTrigger`

### Problema que resuelve

Al encadenar dos elementos animados en secuencia, la opción más sencilla es esperar al settle completo del primero y entonces disparar el segundo. Eso produce una pausa perceptible: el usuario ve el primer elemento quieto antes de que el segundo arranque.

`useOverlapTrigger` resuelve esto permitiendo que el segundo elemento arranque cuando el primero ha completado un porcentaje configurable de su recorrido, no cuando ha terminado del todo. El overlap resultante hace que la transición compuesta se perciba como fluida y continua, en vez de dos movimientos separados.

La necesidad apareció en más de un proyecto de la Suite antes de ser construida, lo que la califica como primitiva de la librería en lugar de utilidad local de un consumidor.

### Mecanismo: driver shadow

El hook arranca un `RafSpringDriver` interno que **no controla ningún elemento del DOM**. Su única función es correr la física del spring con la misma configuración que la transición CSS real que se está monitoreando. El driver simula un recorrido de `0` a `1` — el mismo rango normalizado que usa `--spring-progress` en las transiciones de Bylgja.

Al suscribirse al driver, el hook observa `snapshot.value` en cada frame. Cuando ese valor supera `threshold` (por ejemplo `0.4` para disparar al 40 % del recorrido), llama a `onTrigger` una sola vez y se desuscribe. A partir de ahí el driver ya no corre.

Cuando `active` pasa a `false`, el cleanup del `useEffect` detiene el driver y cancela la suscripción si el trigger aún no se había disparado.

### Advertencia: acople manual entre config y duración CSS

El `SpringSolverConfig` que se pasa a `useOverlapTrigger` debe coincidir exactamente con el config que usa la transición CSS real del elemento que se está monitoreando. El driver shadow no tiene acceso al elemento ni a su CSS — confiar en que corren en paralelo con el mismo config es lo que garantiza que el porcentaje de progreso representado por `threshold` corresponda al porcentaje visual real.

Si se ajusta la duración o la física de la transición visual, el config del driver shadow debe actualizarse en paralelo. Si se desfasan, el trigger se disparará antes o después de lo que el consumidor espera visualmente, produciendo solapamientos incorrectos.

### Firma

```ts
function useOverlapTrigger(
  config: SpringSolverConfig,
  active: boolean,
  threshold: number,
  onTrigger: () => void,
): void
```

- `config` — config del spring que espeja la transición CSS monitorizada
- `active` — cuando pasa a `true` el driver shadow arranca; cuando vuelve a `false` se cancela
- `threshold` — valor entre `0` y `1`; el trigger se dispara cuando `snapshot.value` cruza este umbral
- `onTrigger` — callback de un solo disparo; se llama máximo una vez por activación

### API pública

Exportado desde `src/index.ts`:

- `useOverlapTrigger` — hook (no tiene tipos propios; usa `SpringSolverConfig` ya exportado)
