# Loops CSS puros

`src/loops` es una categoría separada de `src/variants`: no depende de `spring-solver` ni de React, y agrupa animaciones CSS puras de loop infinito. Corresponde al Pilar 7 del roadmap de animaciones, pensado para cubrir movimientos ambientales o de señalización que no requieren un motor físico ni escritura de estado frame a frame desde JavaScript.

## Primitiva base

- Archivo: `src/loops/oscillate.css`
- Núcleo actual:
  - declaración `@property --loop-progress`
  - keyframe `loop-oscillate`
  - clase base `.bylgja-loop`

### Registro de la custom property

```css
@property --loop-progress {
  syntax: "<number>";
  inherits: true;
  initial-value: 0;
}
```

`--loop-progress` queda registrada como una custom property animable de tipo numérico. Hereda hacia descendientes y arranca en `0`.

### Keyframe base

```css
@keyframes loop-oscillate {
  from {
    --loop-progress: 0;
  }

  to {
    --loop-progress: 1;
  }
}
```

El keyframe `loop-oscillate` no anima una propiedad visual final directamente: anima la primitiva `--loop-progress` de `0` a `1`, y cada preset decide cómo mapear ese valor a `transform`, `opacity` o `filter`.

### Clase base

```css
.bylgja-loop {
  --bylgja-loop-duration: 2.4s;
  --bylgja-loop-easing: ease-in-out;
  --loop-progress: 0;

  animation-duration: var(--bylgja-loop-duration);
  animation-direction: alternate;
  animation-iteration-count: infinite;
  animation-name: loop-oscillate;
  animation-timing-function: var(--bylgja-loop-easing);
}
```

La clase `.bylgja-loop` aplica el keyframe base con:

- `animation-direction: alternate`
- `animation-iteration-count: infinite`
- `animation-duration` configurable vía `--bylgja-loop-duration` con default `2.4s`
- `animation-timing-function` configurable vía `--bylgja-loop-easing` con default `ease-in-out`

La intención del default es sutileza ambiental: ni demasiado rápido ni demasiado enfático, para que cada preset pueda reutilizar la misma base y sobreescribir solo lo necesario.

## Presets actuales

### `float`

- Clase: `.bylgja-loop--float`
- Custom property propia: `--bylgja-loop-float-distance`
- Propiedad visual animada: `transform: translateY(...)`

Mueve el elemento verticalmente hacia arriba con un recorrido corto y sutil.

### `breathing`

- Clase: `.bylgja-loop--breathing`
- Custom property propia: `--bylgja-loop-breathing-scale`
- Propiedad visual animada: `transform: scale(...)`

Valor actual documentado tras ajuste visual:

- `--bylgja-loop-breathing-scale: 0.040`

Expande el elemento desde `1` hacia un valor levemente mayor, como una respiración suave.

### `wiggle`

- Clase: `.bylgja-loop--wiggle`
- Custom property propia: `--bylgja-loop-wiggle-angle`
- Propiedad visual animada: `transform: rotate(...)`

Rota el elemento algunos grados a cada lado, usando el mismo `--loop-progress` como entrada.

### `pulse`

- Clase: `.bylgja-loop--pulse`
- Custom property propia: `--bylgja-loop-pulse-opacity-drop`
- Propiedad visual animada: `opacity`

Reduce la opacidad desde `1` hacia un valor menor, sin apagar el elemento por completo.

### `glow`

- Clase: `.bylgja-loop--glow`
- Custom properties propias:
  - `--bylgja-loop-glow-blur`
  - `--bylgja-loop-glow-alpha`
  - `--bylgja-loop-glow-color`
- Propiedad visual animada: `filter: drop-shadow(...)`

Incrementa el blur radius de un `drop-shadow` para producir un resplandor sutil alrededor del elemento.

### `bounce`

- Clase: `.bylgja-loop--bounce`
- Custom property propia: `--bylgja-loop-bounce-distance`
- Propiedad visual animada: `transform: translateY(...)`
- Overrides locales:
  - `--bylgja-loop-duration: 1.1s`
  - `--bylgja-loop-easing: cubic-bezier(0.34, 0.04, 0.3, 1)`

Usa un recorrido vertical corto, pero no se comporta como efecto ambiental sino como señal de scroll. Por eso sobreescribe localmente `duration` y `easing` para sentirse más rápido y con más caída que el resto del grupo.

## Preset separado: `orbit`

- Clase: `.bylgja-loop--orbit`
- Grupo conceptual: mecanismo separado del Grupo A
- Custom properties propias:
  - `--bylgja-loop-orbit-radius`
  - `--bylgja-loop-orbit-duration`
- Propiedad visual animada: `transform`
- Keyframe propio: `loop-orbit`
- Timing: `linear`

`orbit` no reutiliza `--loop-progress`, no depende de la declaración `@property`, y tampoco comparte el keyframe `loop-oscillate`. En su lugar define un keyframe separado, `loop-orbit`, que combina `rotate(...)`, `translateX(var(--bylgja-loop-orbit-radius))` y `translate(-50%, -50%)` dentro de la misma `transform` de cada frame.

Ese detalle es importante: como `transform` se sobrescribe como valor completo, la traslación fija del radio y la rotación orbital tienen que convivir explícitamente en el keyframe para producir traslación circular real alrededor del centro del contenedor.

Valores por defecto actuales:

- `--bylgja-loop-orbit-radius: 1rem`
- `--bylgja-loop-orbit-duration: 1.8s`
- `animation-timing-function: linear`

Requisitos de posicionamiento:

- el elemento con `.bylgja-loop--orbit` usa `position: absolute`
- el contenedor padre debe usar `position: relative`
- el preset se autocentra con `top: 50%` y `left: 50%`

A diferencia de los presets del Grupo A, `orbit` no es un modificador visual aplicable sobre cualquier caja ya posicionada: presupone una relación geométrica explícita con su contenedor para que el pivote real coincida con el centro orbital.

## Preset separado: `skeleton-pulse`

- Clase: `.bylgja-loop--skeleton-pulse`
- Grupo conceptual: shimmer autocontenido, separado del Grupo A
- Custom properties propias:
  - `--bylgja-loop-skeleton-base`
  - `--bylgja-loop-skeleton-highlight`
  - `--bylgja-loop-skeleton-duration`
- Propiedades visuales animadas:
  - `background-position`
  - `background-image`
  - `background-size`
- Keyframe propio: `loop-skeleton-shimmer`
- Timing: `linear`

`skeleton-pulse` no reutiliza `--loop-progress`, no depende de la declaración `@property`, y tampoco comparte el keyframe `loop-oscillate`. En su lugar usa un gradiente deslizante sobre el fondo del elemento, animando `background-position` de izquierda a derecha con un shimmer continuo.

El mecanismo actual:

- aplica `background-color` con `--bylgja-loop-skeleton-base`
- superpone `background-image: linear-gradient(...)` con una franja de highlight en el centro
- usa `background-size: 200% 100%` para dar margen de recorrido al gradiente
- anima `background-position` con el keyframe `loop-skeleton-shimmer`

Valores por defecto actuales:

- `--bylgja-loop-skeleton-base: rgb(58 58 58)`
- `--bylgja-loop-skeleton-highlight: rgb(98 98 98 / 0.7)`
- `--bylgja-loop-skeleton-duration: 1.6s`

El resultado visual es un placeholder tipo skeleton con reflejo continuo, pensado para ser sobreescrito por el consumidor mediante custom properties de color y duración.

## Hook auxiliar: `useStagger`

- Archivo: `src/react/useStagger.ts`
- Propósito: calcular factores normalizados por elemento para presets que necesitan desfase distribuido sobre una secuencia

`useStagger` recibe:

- `count` requerido
- `staggerDelay` opcional
- `curve` opcional

Devuelve un array de bindings de longitud `count`, donde cada binding expone un `style` con una sola custom property:

- `--bylgja-stagger-factor`

Ese factor siempre queda normalizado entre `0` y `1`, y se calcula por índice a partir de la curva elegida.

La implementación actual valida:

- que `count` sea un entero no negativo
- que `staggerDelay` sea finito y no negativo
- que la curva devuelva un factor finito entre `0` y `1`

Curvas exportadas actuales:

### `linearStagger`

Distribuye los factores de forma lineal entre el primer elemento (`0`) y el último (`1`).

Caso borde:

- si `count <= 1`, devuelve `0` para evitar división por cero

### `centerOutStagger`

Ubica factor `0` en el centro de la secuencia y hace crecer el factor hacia los extremos hasta `1` en el elemento más alejado del centro. En secuencias pares produce un par central con el mismo valor mínimo; en secuencias impares produce un único centro exacto.

También contempla el caso borde:

- si `count <= 1`, devuelve `0`

## Presets que consumen `--bylgja-stagger-factor`

### Movimiento reusable: `stagger-bounce`

- Clase de movimiento: `.bylgja-loop--stagger-bounce`
- Dependencia: se combina con la clase base `.bylgja-loop`
- Custom properties propias:
  - `--bylgja-loop-duration`
  - `--bylgja-loop-easing`
  - `--bylgja-loop-bounce-distance`
  - `--bylgja-loop-stagger-delay`
- Mecanismo:
  - reutiliza `--loop-progress` de la clase base
  - aplica `animation-delay: calc(var(--bylgja-stagger-factor) * var(--bylgja-loop-stagger-delay))`
  - mapea el progreso a `transform: translateY(...)`

La intención actual es separar movimiento y forma:

- `.bylgja-loop--stagger-bounce` define solo la oscilación vertical con delay escalonado
- `.bylgja-loop-shape--dot` define una forma de punto circular pequeño
- `.bylgja-loop-shape--bar` define una forma de barra vertical angosta

Esto permite construir dos variantes visuales distintas con la misma lógica de movimiento:

- dot bounce: `bylgja-loop bylgja-loop--stagger-bounce bylgja-loop-shape--dot`
- wave loader: `bylgja-loop bylgja-loop--stagger-bounce bylgja-loop-shape--bar`

Valores por defecto actuales de las formas:

- `.bylgja-loop-shape--dot`
  - `width: 0.5rem`
  - `height: 0.5rem`
  - `border-radius: 50%`
- `.bylgja-loop-shape--bar`
  - `width: 0.25rem`
  - `height: 1rem`
  - `border-radius: 0.125rem`

### Preset autocontenido: `ripple`

- Clase: `.bylgja-loop--ripple`
- Dependencia: autocontenido como preset visual, pero pensado para reutilizar `useStagger`
- Inspiración visual: ondas concéntricas como gotas cayendo en un estanque
- Custom properties propias:
  - `--bylgja-loop-ripple-size`
  - `--bylgja-loop-ripple-border-width`
  - `--bylgja-loop-ripple-color`
  - `--bylgja-loop-ripple-start-scale`
  - `--bylgja-loop-ripple-start-opacity`
  - `--bylgja-loop-ripple-duration`
  - `--bylgja-loop-stagger-delay`
- Keyframe propio: `loop-ripple`
- Mecanismo:
  - se usa en múltiples anillos que nacen desde el mismo origen central
  - reutiliza el hook `useStagger` con `linearStagger` para escalonar el nacimiento de cada anillo
  - aplica `animation-delay: calc(var(--bylgja-stagger-factor) * var(--bylgja-loop-stagger-delay))`
  - usa `animation-direction: normal`
  - usa `animation-timing-function: ease-out`
  - usa `animation-iteration-count: infinite`

El keyframe `loop-ripple` actual está dividido en tres tramos:

- `0%`: estado inicial ya visible, con `scale` chico y `opacity` alta
- `40%`: estado final, con `scale: 1` y `opacity: 0`, indicando que la onda ya se expandió y desvaneció por completo
- `40%` a `100%`: calma total, sin cambios visuales, simulando que el estanque se estabiliza antes de la próxima gota

Valores configurables documentados:

- `--bylgja-loop-ripple-start-scale`
- `--bylgja-loop-ripple-start-opacity`
- `--bylgja-loop-ripple-duration: 4.1s`
- `--bylgja-loop-stagger-delay`

La forma visual es un círculo sin relleno, con `border` fino y `border-radius: 50%`, para leerse como el borde de una onda en vez de como un disco sólido.

### Preset autocontenido: `skeleton-wave`

- Clase: `.bylgja-loop--skeleton-wave`
- Dependencia: autocontenido, no requiere `.bylgja-loop`
- Custom properties propias:
  - `--bylgja-loop-skeleton-wave-growth`
  - `--bylgja-loop-skeleton-wave-duration`
  - `--bylgja-loop-stagger-delay`
- Keyframe propio: `loop-stagger-wave`
- Mecanismo:
  - anima `transform: scaleY(...)` en tres pasos
  - usa `transform-origin: bottom` para que el crecimiento ocurra hacia arriba desde una base fija
  - aplica `animation-delay: calc(var(--bylgja-stagger-factor) * var(--bylgja-loop-stagger-delay))`
  - usa `animation-direction: normal` porque el ida y vuelta ya vive dentro del keyframe

Valores por defecto actuales:

- `--bylgja-loop-skeleton-wave-growth: 1.3`
- `--bylgja-loop-skeleton-wave-duration: 1.8s`
- `--bylgja-loop-stagger-delay: 0.3s`

El preset actual sirve para barras horizontales tipo placeholder que crecen en el eje vertical, pero ya no depende de `--loop-progress` ni de la clase base.

### Nota de estado: soluciones provisorias

Tanto `.bylgja-loop--skeleton-wave` como el preset pensado para wave loader, hoy implementado combinando `stagger-bounce` con la forma de barra, son versiones provisorias.

El objetivo visual real no es simplemente un arranque escalonado con `animation-delay` fijo por elemento, sino una ola viajera que forme una campana de alturas desplazándose en el tiempo. Esa necesidad ya quedó anotada como pendiente del motor: requiere una primitiva nueva de física con un origen de influencia en movimiento continuo, calculado frame a frame desde JavaScript, no una aproximación puramente temporal por stagger.

Cuando esa primitiva exista:

- `skeleton-wave` será refactorizado por completo
- `wave loader` también será refactorizado por completo

El mecanismo actual basado en stagger fijo es una aproximación temporal, no la solución final.

## Por qué existe la declaración `@property`

Sin la declaración `@property`, el navegador no interpola `--loop-progress` como número. La custom property se trata como un valor opaco no interpolable, y el resultado visible no es una transición continua sino un salto discreto entre estados.

La decisión actual es depender de soporte moderno nativo:

- Chromium modernos
- Firefox modernos
- Safari 16.4 en adelante

No existe capa de compatibilidad para navegadores más viejos. Es una decisión consciente: estos loops viven en una categoría de realce visual no crítica, y el costo de introducir una estrategia paralela solo para fallback no se justificó en esta etapa.

## Estado final

- Grupo A:
  - `float`
  - `breathing`
  - `wiggle`
  - `pulse`
  - `glow`
  - `bounce`
  - Estado: completo
- Grupo B:
  - `orbit`
  - Estado: completo
- Grupo C:
  - `skeleton pulse`
  - Estado: completo
  - `ripple`
  - Estado: completo
  - `skeleton wave`
  - Estado: versión provisoria, pendiente de refactor futuro
  - `dot bounce`
  - Estado: completo
  - `wave loader`
  - Estado: versión provisoria, pendiente de refactor futuro
- Grupo D:
  - `morph loader`
  - Estado: pendiente y fuera de alcance de CSS puro
