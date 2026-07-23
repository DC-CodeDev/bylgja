import { useEffect, useRef, useState, type PointerEventHandler } from "react";
import type { MutableRefObject, MouseEventHandler } from "react";
import {
  createRafSpringDriver,
  type RafSpringDriver,
} from "../core/raf-driver.js";
import type { SpringSolverConfig } from "../core/spring-solver.js";
import { SPRING_SNAPPY } from "../tokens/springs.js";
import { usePressable } from "../variants/pressable.js";

interface DragSample {
  x: number;
  y: number;
  timestamp: number;
}

export interface DragVelocity {
  x: number;
  y: number;
}

export interface DragPosition {
  x: number;
  y: number;
}

export type DraggableBehavior = "return" | "settle";

export interface UseDraggableOptions {
  behavior: DraggableBehavior;
  className?: string;
  pressableSpringConfig?: SpringSolverConfig;
  springConfig?: SpringSolverConfig;
}

export interface DraggableBinding<T extends HTMLElement = HTMLElement> {
  className: string;
  isDragging: boolean;
  onMouseDown: MouseEventHandler<T>;
  onMouseUp: MouseEventHandler<T>;
  onPointerCancel: PointerEventHandler<T>;
  onPointerDown: PointerEventHandler<T>;
  onPointerUp: PointerEventHandler<T>;
  position: DragPosition;
  ref: MutableRefObject<T | null>;
  releaseVelocity: DragVelocity;
}

function createSampleBuffer(capacity: number) {
  const samples: DragSample[] = [];

  return {
    clear(): void {
      samples.length = 0;
    },
    push(sample: DragSample): void {
      if (samples.length === capacity) {
        samples.shift();
      }
      samples.push(sample);
    },
    read(): readonly DragSample[] {
      return samples;
    },
  };
}

function calculateReleaseVelocity(samples: readonly DragSample[]): DragVelocity {
  if (samples.length < 2) {
    return { x: 0, y: 0 };
  }

  const first = samples[0];
  const last = samples[samples.length - 1];
  const deltaTimeMs = last.timestamp - first.timestamp;
  if (deltaTimeMs <= 0) {
    return { x: 0, y: 0 };
  }

  const deltaTimeSeconds = deltaTimeMs / 1000;
  return {
    x: (last.x - first.x) / deltaTimeSeconds,
    y: (last.y - first.y) / deltaTimeSeconds,
  };
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(" ");
}

export function useDraggable<T extends HTMLElement = HTMLElement>({
  behavior,
  className,
  pressableSpringConfig = SPRING_SNAPPY,
  springConfig = SPRING_SNAPPY,
}: UseDraggableOptions): DraggableBinding<T> {
  const pressable = usePressable<T>({
    className,
    springConfig: pressableSpringConfig,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<DragPosition>({ x: 0, y: 0 });
  const [releaseVelocity, setReleaseVelocity] = useState<DragVelocity>({ x: 0, y: 0 });

  const activePointerIdRef = useRef<number | null>(null);
  const currentPositionRef = useRef<DragPosition>({ x: 0, y: 0 });
  const dragOriginPointerRef = useRef<DragPosition>({ x: 0, y: 0 });
  const dragOriginElementRef = useRef<DragPosition>({ x: 0, y: 0 });
  const sampleBufferRef = useRef(createSampleBuffer(4));
  const xDriverRef = useRef<RafSpringDriver | null>(null);
  const yDriverRef = useRef<RafSpringDriver | null>(null);
  const xUnsubscribeRef = useRef<(() => void) | null>(null);
  const yUnsubscribeRef = useRef<(() => void) | null>(null);

  const writeTransform = (nextPosition: DragPosition): void => {
    currentPositionRef.current = nextPosition;
    const element = pressable.ref.current;
    if (element) {
      element.style.transform = `translate3d(${nextPosition.x}px, ${nextPosition.y}px, 0)`;
    }
    setPosition(nextPosition);
  };

  const stopDrivers = (): void => {
    xUnsubscribeRef.current?.();
    yUnsubscribeRef.current?.();
    xUnsubscribeRef.current = null;
    yUnsubscribeRef.current = null;
    xDriverRef.current?.stop();
    yDriverRef.current?.stop();
    xDriverRef.current = null;
    yDriverRef.current = null;
  };

  const startReleaseAnimation = (
    initialPosition: DragPosition,
    initialVelocity: DragVelocity,
  ): void => {
    stopDrivers();

    const xTarget = behavior === "return" ? 0 : initialPosition.x;
    const yTarget = behavior === "return" ? 0 : initialPosition.y;

    const xDriver = createRafSpringDriver({
      ...springConfig,
      initialValue: initialPosition.x,
      targetValue: xTarget,
      initialVelocity: initialVelocity.x,
    });
    const yDriver = createRafSpringDriver({
      ...springConfig,
      initialValue: initialPosition.y,
      targetValue: yTarget,
      initialVelocity: initialVelocity.y,
    });

    xDriverRef.current = xDriver;
    yDriverRef.current = yDriver;

    xUnsubscribeRef.current = xDriver.subscribe((snapshot) => {
      writeTransform({
        x: snapshot.settled ? snapshot.target : snapshot.value,
        y: currentPositionRef.current.y,
      });
    });
    yUnsubscribeRef.current = yDriver.subscribe((snapshot) => {
      writeTransform({
        x: currentPositionRef.current.x,
        y: snapshot.settled ? snapshot.target : snapshot.value,
      });
    });

    xDriver.start();
    yDriver.start();
  };

  const finishDrag = (): void => {
    if (activePointerIdRef.current === null) {
      return;
    }

    const velocity = calculateReleaseVelocity(sampleBufferRef.current.read());
    setReleaseVelocity(velocity);
    setIsDragging(false);
    activePointerIdRef.current = null;
    sampleBufferRef.current.clear();
    startReleaseAnimation(currentPositionRef.current, velocity);
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent): void => {
      if (!isDragging || activePointerIdRef.current !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragOriginPointerRef.current.x;
      const deltaY = event.clientY - dragOriginPointerRef.current.y;
      const nextPosition = {
        x: dragOriginElementRef.current.x + deltaX,
        y: dragOriginElementRef.current.y + deltaY,
      };

      sampleBufferRef.current.push({
        x: nextPosition.x,
        y: nextPosition.y,
        timestamp: event.timeStamp,
      });
      writeTransform(nextPosition);
    };

    const handlePointerUp = (event: PointerEvent): void => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }
      finishDrag();
    };

    const handleMouseUp = (): void => {
      finishDrag();
    };

    const handlePointerCancel = (event: PointerEvent): void => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }
      finishDrag();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const element = pressable.ref.current;
    if (!element) {
      return;
    }

    element.style.transform = "translate3d(0px, 0px, 0)";
    element.style.willChange = "transform";

    return () => {
      stopDrivers();
    };
  }, []);

  return {
    className: joinClassNames(pressable.className, "draggable"),
    isDragging,
    onMouseDown: (event) => {
      pressable.onMouseDown(event);
    },
    onMouseUp: (event) => {
      pressable.onMouseUp(event);
    },
    onPointerCancel: (event) => {
      pressable.onPointerCancel(event);
      finishDrag();
    },
    onPointerDown: (event) => {
      pressable.onPointerDown(event);
      stopDrivers();
      setIsDragging(true);
      activePointerIdRef.current = event.pointerId;
      dragOriginPointerRef.current = { x: event.clientX, y: event.clientY };
      dragOriginElementRef.current = currentPositionRef.current;
      sampleBufferRef.current.clear();
      sampleBufferRef.current.push({
        x: currentPositionRef.current.x,
        y: currentPositionRef.current.y,
        timestamp: event.timeStamp,
      });
    },
    onPointerUp: (event) => {
      pressable.onPointerUp(event);
      if (activePointerIdRef.current === event.pointerId) {
        finishDrag();
      }
    },
    position,
    ref: pressable.ref,
    releaseVelocity,
  };
}
