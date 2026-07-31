# Variants

Auditoría directa de `src/variants` al 31 de julio de 2026: existen ocho variants reales y actuales.

## `fade`

- Archivo: `src/variants/fade.ts`
- Export principal: `useFade(options: UseFadeOptions): FadeBinding`
- Soporta dos estrategias:
  - `"presence"`
  - `"tween"`

### API principal

```ts
interface UseFadeOptions {
  show: boolean;
  strategy?: "presence" | "tween";
  className?: string;
  springConfig?: SpringSolverConfig;
  exitTarget?: number;
  onSettled?: () => void;
}
```

```ts
interface FadeBinding {
  className: string;
  props: {
    className: string;
    "data-state": "visible" | "hidden";
  };
  render: (children: ReactNode) => ReactElement | null;
  state: "visible" | "hidden";
}
```

### Propósito

- En modo `"tween"` devuelve un `div` simple con transición CSS.
- En modo `"presence"` usa `Presence` para coordinar salida con spring.

## `fadeScale`

- Archivo: `src/variants/fadeScale.ts`
- Export principal: `useFadeScale(options: UseFadeScaleOptions): FadeScaleBinding`

### API principal

```ts
interface UseFadeScaleOptions {
  show: boolean;
  className?: string;
  springConfig?: SpringSolverConfig;
  exitTarget?: number;
  onSettled?: () => void;
}
```

```ts
interface FadeScaleBinding {
  className: string;
  render: (children: ReactNode) => ReactElement | null;
  state: "visible" | "hidden";
}
```

### Propósito

- Variant de entrada/salida con opacidad y escala, siempre apoyado en `Presence`.

## `modalBackdrop`

- Archivo: `src/variants/modalBackdrop.ts`
- Export principal: `useModalBackdrop(options: UseModalBackdropOptions): ModalBackdropBinding`

### API principal

```ts
interface UseModalBackdropOptions {
  show: boolean;
  className?: string;
  springConfig?: SpringSolverConfig;
  exitTarget?: number;
  onSettled?: () => void;
}
```

```ts
interface ModalBackdropBinding {
  className: string;
  render: (children?: ReactNode) => ReactElement | null;
  state: "visible" | "hidden";
}
```

### Propósito

- Backdrop de modal con presencia y control de salida desacoplado del panel.

## `modalPanel`

- Archivo: `src/variants/modalPanel.ts`
- Export principal: `useModalPanel(options: UseModalPanelOptions): ModalPanelBinding`

### API principal

```ts
interface UseModalPanelOptions {
  show: boolean;
  className?: string;
  springConfig?: SpringSolverConfig;
  exitTarget?: number;
  onSettled?: () => void;
}
```

```ts
interface ModalPanelBinding {
  className: string;
  render: (children: ReactNode) => ReactElement | null;
  state: "visible" | "hidden";
}
```

### Propósito

- Panel de modal con `Presence`, separado del backdrop y pensado para estilado CSS externo.

## `pressable`

- Archivo: `src/variants/pressable.ts`
- Export principal: `usePressable<T>(options?: UsePressableOptions): PressableBinding<T>`

### API principal

```ts
interface UsePressableOptions {
  className?: string;
  onSettled?: () => void;
  springConfig?: SpringSolverConfig;
}
```

```ts
interface PressableBinding<T extends HTMLElement = HTMLElement> {
  className: string;
  onMouseDown: MouseEventHandler<T>;
  onMouseUp: MouseEventHandler<T>;
  onPointerCancel: PointerEventHandler<T>;
  onPointerDown: PointerEventHandler<T>;
  onPointerUp: PointerEventHandler<T>;
  ref: MutableRefObject<T | null>;
}
```

### Propósito

- Primitive de presionado.
- Maneja `isPressed` internamente.
- Usa `useSpring` para llevar `--spring-progress` entre `0` y `1`.
- Captura puntero en `onPointerDown`.
- Además agrega un listener global de `mouseup` mientras está presionado.

## `selectedHighlight`

- Archivo: `src/variants/selectedHighlight.ts`
- Export principal: `useSelectedHighlight<T>(options: UseSelectedHighlightOptions): SelectedHighlightBinding<T>`

### API principal

```ts
interface UseSelectedHighlightOptions {
  className?: string;
  onSettled?: () => void;
  selected: boolean;
  springConfig?: SpringSolverConfig;
}
```

```ts
interface SelectedHighlightBinding<T extends HTMLElement = HTMLElement> {
  className: string;
  "data-selected": "false" | "true";
  ref: MutableRefObject<T | null>;
}
```

### Propósito

- Highlight de selección binaria controlado por `selected`.
- Usa `useSpring` con `selected ? 1 : 0`.

## `tooltip`

- Archivo: `src/variants/tooltip.tsx`
- Existe y forma parte de la API pública actual.
- Exports principales:
  - `useTooltip<T>(options?: UseTooltipOptions): TooltipBinding<T>`
  - `Tooltip(props: TooltipProps): ReactElement`
  - `TOOLTIP_CLASS_NAME`
  - tipos públicos asociados

### API principal del hook

```ts
interface UseTooltipOptions {
  className?: string;
  closeDelay?: number;
  defaultOpen?: boolean;
  disabled?: boolean;
  offset?: number;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  openDelay?: number;
  placement?: TooltipPlacement;
  viewportPadding?: number;
}
```

```ts
type TooltipPlacement =
  | "top" | "top-start" | "top-end"
  | "right" | "right-start" | "right-end"
  | "bottom" | "bottom-start" | "bottom-end"
  | "left" | "left-start" | "left-end";
```

```ts
interface TooltipBinding<T extends HTMLElement = HTMLElement> {
  className: string;
  mounted: boolean;
  onExitComplete: () => void;
  open: boolean;
  placement: TooltipPlacement;
  tooltipProps: TooltipContentProps<T>;
  tooltipStyle: CSSProperties;
  triggerProps: TooltipTriggerProps<T>;
}
```

### API principal del componente

```ts
interface TooltipProps extends UseTooltipOptions {
  children: ReactElement<TooltipChildProps>;
  content: ReactNode;
}
```

### Propósito

- Primitive headless accesible para tooltip.

## `navSlide`

- Archivo: `src/variants/navSlide.ts` + `src/variants/navSlide.css`
- Export principal: `useNavSlide(options: UseNavSlideOptions): NavSlideBinding`
- Constante de clase: `NAV_SLIDE_CLASS_NAME = "bylgja-nav-slide"`
- Commit de introducción: `afcd8e7`

### API principal

```ts
interface UseNavSlideOptions {
  show: boolean;
  className?: string;
  springConfig?: SpringSolverConfig;
  exitTarget?: number;
  onSettled?: () => void;
}
```

```ts
interface NavSlideBinding {
  className: string;
  render: (children: ReactNode) => ReactElement | null;
  state: "visible" | "hidden";
}
```

### CSS

```css
.bylgja-nav-slide {
  transform: translateY(calc((1 - var(--spring-progress, 0)) * -100%));
}
```

### Propósito

- Variant para elementos que entran desde arriba (navbars fijos, banners deslizantes).
- Usa `Presence` para mount/unmount — el elemento se desmonta cuando el spring se asienta en 0.
- El CSS mapea `--spring-progress` (0→1) a `translateY(-100%→0)`.
- **Sin `will-change` estático.** A diferencia de las otras variants, navSlide es un elemento de larga vida (visible durante toda la sesión de scroll activa). Declarar `will-change: transform` permanentemente crea un layer GPU separado que desalinea subpixels con `SmoothScrollProvider`, causando parpadeo en borders de 1px. Las otras variants son overlays temporales que se desmontan rápido — ahí el `will-change` es transitorio y aceptable.
- Soporta modo controlado y no controlado.
- Abre por foco o `pointerenter`, cierra por blur, `pointerleave` y `Escape`.
- Ignora `pointerType === "touch"`.
- Calcula posición con flip básico al lado opuesto si no hay espacio.
- Observa `resize`, `scroll` y `ResizeObserver` mientras está abierto.
- El componente `Tooltip` es un adaptador que:
  - clona el child trigger;
  - compone handlers con los del child original;
  - hace portal a `document.body`;
  - anima el contenido con `Presence` y `SPRING_SNAPPY`.
