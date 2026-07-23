# Core

## `spring-solver.ts`

### Qué hace

Define el solver físico base:

- `SpringSolverConfig`
  - `stiffness`
  - `damping`
  - `mass`
  - `timestep?`
  - `velocityThreshold?`
  - `positionThreshold?`
- `SpringSnapshot`
  - `value`
  - `target`
  - `velocity`
  - `settled`
- `SpringSolver`
  - constructor:
    - `new SpringSolver(initialValue, targetValue, config, initialVelocity = 0)`
  - métodos:
    - `getValue()`
    - `getTarget()`
    - `setTarget(targetValue)`
    - `getVelocity()`
    - `setVelocity(velocity)`
    - `advance(deltaTime)`
    - `isSettled()`
    - `snapshot()`
- `createSpringSolver(initialValue, targetValue, config, initialVelocity = 0)`

### Parámetros y defaults reales

- `timestep`: por defecto `1 / 120`
- `velocityThreshold`: por defecto `0.01`
- `positionThreshold`: por defecto `0.01`
- `initialVelocity`: por defecto `0`

### Comportamiento relevante

- Valida que todos los números sean finitos.
- Rechaza `mass <= 0`.
- Rechaza `stiffness < 0`.
- Rechaza `damping < 0`.
- Rechaza `timestep <= 0`.
- Acumula `deltaTime` y avanza en pasos fijos mientras `accumulator >= timestep`.
- Integra con:
  - `acceleration = (-stiffness * displacement - damping * velocity) / mass`
  - luego actualiza velocidad y posición.

### Decisiones de diseño visibles en el archivo

`spring-solver.ts` no tiene comentarios de diseño inline. Lo que sí queda fijado por el código actual es:

- integración por timestep fijo con acumulador, no por timestep variable directo;
- settling por doble umbral: velocidad y distancia al target;
- snapshot explícito con `value`, `target`, `velocity` y `settled`.

## `raf-driver.ts`

### Qué hace

Envuelve `SpringSolver` en un loop de RAF y expone una interfaz de driver:

- `RafSpringDriverOptions extends SpringSolverConfig`
  - `initialValue`
  - `targetValue`
  - `initialVelocity?`
  - `maxDeltaTime?`
- `RafSpringDriver`
  - `start()`
  - `stop()`
  - `subscribe(listener)`
  - `setTarget(targetValue)`
  - `getSnapshot()`
  - `isRunning()`
- `createRafSpringDriver(options, scheduler?)`

### Parámetros y defaults reales

- `maxDeltaTime`: por defecto `0.25` segundos
- `scheduler?`
  - `requestAnimationFrame?`
  - `cancelAnimationFrame?`

### Comportamiento relevante

- Requiere `requestAnimationFrame` y `cancelAnimationFrame`.
- Valida que `maxDeltaTime` sea finito y positivo.
- Clampa cada frame a `maxDeltaTime`.
- En el primer tick solo fija `previousTimestamp`; recién desde el segundo calcula delta.
- Emite snapshot a todos los suscriptores en cada tick.
- Se detiene solo cuando `solver.isSettled()` da `true`.
- Si `setTarget()` se llama con el driver parado, emite snapshot inmediatamente.
- Si `start()` se llama estando ya settled, emite una vez y no entra al loop.

### Decisiones de diseño visibles en el archivo

`raf-driver.ts` tampoco tiene comentarios inline de diseño. Las decisiones que hoy quedan codificadas son:

- clamp defensivo de `deltaTime` para evitar saltos largos de pestaña inactiva o frame stalls;
- separación entre solver puro y scheduler externo opcional para testear sin RAF real;
- modelo push por `subscribe()` en vez de re-render o polling.

## `object-utils.ts`

### Qué hace

Expone `stripUndefined(object)`.

- recibe un objeto;
- devuelve un objeto nuevo sin ninguna clave cuyo valor sea `undefined`.

### Motivo de diseño

El helper existe para trabajar correctamente con `exactOptionalPropertyTypes: true` cuando se arman objetos de opciones con campos opcionales antes de pasarlos a funciones con firmas estrictas. Si una propiedad opcional queda presente con valor `undefined`, TypeScript la considera distinta de una propiedad omitida; `stripUndefined` elimina esa diferencia también en runtime.

### Tipo de retorno

El tipo de retorno está ajustado para:

- preservar las claves cuyo valor nunca puede ser `undefined`;
- volver opcionales las claves cuyo tipo sí admite `undefined`;
- excluir `undefined` del tipo de esas claves opcionales.

Resultado: el objeto devuelto queda alineado con la semántica esperada por `exactOptionalPropertyTypes: true`.

### Uso esperado

Usarlo al construir objetos de opciones con propiedades opcionales antes de pasarlos a funciones con firmas estrictas, por ejemplo cuando `startDelay` o `onSettled` pueden venir ausentes y no deben quedar materializados como `undefined`.
