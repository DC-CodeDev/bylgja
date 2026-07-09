import { SpringSolver, type SpringSnapshot, type SpringSolverConfig } from "./spring-solver.js";

export interface RafSpringDriverOptions extends SpringSolverConfig {
  initialValue: number;
  targetValue: number;
  initialVelocity?: number;
  maxDeltaTime?: number;
}

export type RafSpringSubscriber = (snapshot: SpringSnapshot) => void;

export interface RafSpringDriver {
  start(): void;
  stop(): void;
  subscribe(listener: RafSpringSubscriber): () => void;
  setTarget(targetValue: number): void;
  getSnapshot(): SpringSnapshot;
  isRunning(): boolean;
}

type RequestFrame = (callback: FrameRequestCallback) => number;
type CancelFrame = (handle: number) => void;

export function createRafSpringDriver(
  options: RafSpringDriverOptions,
  scheduler?: {
    requestAnimationFrame?: RequestFrame;
    cancelAnimationFrame?: CancelFrame;
  },
): RafSpringDriver {
  const maxDeltaTime = options.maxDeltaTime ?? 0.25;

  if (!Number.isFinite(maxDeltaTime)) {
    throw new Error("createRafSpringDriver requires maxDeltaTime to be finite.");
  }
  if (maxDeltaTime <= 0) {
    throw new Error("createRafSpringDriver requires maxDeltaTime to be positive.");
  }

  const solver = new SpringSolver(
    options.initialValue,
    options.targetValue,
    options,
    options.initialVelocity ?? 0,
  );

  const requestFrame =
    scheduler?.requestAnimationFrame ??
    globalThis.requestAnimationFrame?.bind(globalThis);
  const cancelFrame =
    scheduler?.cancelAnimationFrame ??
    globalThis.cancelAnimationFrame?.bind(globalThis);

  if (!requestFrame || !cancelFrame) {
    throw new Error("createRafSpringDriver requires requestAnimationFrame support.");
  }

  const listeners = new Set<RafSpringSubscriber>();
  let frameHandle: number | null = null;
  let running = false;
  let previousTimestamp: number | null = null;

  const emit = (): void => {
    const snapshot = solver.snapshot();
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const stop = (): void => {
    if (frameHandle !== null) {
      cancelFrame(frameHandle);
      frameHandle = null;
    }
    running = false;
    previousTimestamp = null;
  };

  const tick: FrameRequestCallback = (timestamp) => {
    if (!running) {
      return;
    }

    frameHandle = null;

    if (previousTimestamp === null) {
      previousTimestamp = timestamp;
    } else {
      const deltaTimeSeconds = Math.min(
        maxDeltaTime,
        Math.max(0, (timestamp - previousTimestamp) / 1000),
      );
      previousTimestamp = timestamp;
      solver.advance(deltaTimeSeconds);
    }

    emit();

    if (solver.isSettled()) {
      stop();
      return;
    }

    frameHandle = requestFrame(tick);
  };

  return {
    start() {
      if (running) {
        return;
      }

      running = true;
      previousTimestamp = null;

      if (solver.isSettled()) {
        emit();
        running = false;
        return;
      }

      frameHandle = requestFrame(tick);
    },
    stop,
    subscribe(listener: RafSpringSubscriber) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setTarget(targetValue: number) {
      solver.setTarget(targetValue);
      if (!running) {
        emit();
      }
    },
    getSnapshot() {
      return solver.snapshot();
    },
    isRunning() {
      return running;
    },
  };
}
