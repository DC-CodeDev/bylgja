import { SpringSolver } from "./spring-solver.js";
export function createRafSpringDriver(options, scheduler) {
    const maxDeltaTime = options.maxDeltaTime ?? 0.25;
    const startDelay = options.startDelay ?? 0;
    if (!Number.isFinite(maxDeltaTime)) {
        throw new Error("createRafSpringDriver requires maxDeltaTime to be finite.");
    }
    if (maxDeltaTime <= 0) {
        throw new Error("createRafSpringDriver requires maxDeltaTime to be positive.");
    }
    if (!Number.isFinite(startDelay)) {
        throw new Error("createRafSpringDriver requires startDelay to be finite.");
    }
    if (startDelay < 0) {
        throw new Error("createRafSpringDriver requires startDelay to be non-negative.");
    }
    const solver = new SpringSolver(options.initialValue, options.targetValue, options, options.initialVelocity ?? 0);
    const requestFrame = scheduler?.requestAnimationFrame ??
        globalThis.requestAnimationFrame?.bind(globalThis);
    const cancelFrame = scheduler?.cancelAnimationFrame ??
        globalThis.cancelAnimationFrame?.bind(globalThis);
    if (!requestFrame || !cancelFrame) {
        throw new Error("createRafSpringDriver requires requestAnimationFrame support.");
    }
    const listeners = new Set();
    let frameHandle = null;
    let running = false;
    let previousTimestamp = null;
    let delayElapsed = 0;
    let delayCompleted = startDelay === 0;
    const emit = () => {
        const snapshot = solver.snapshot();
        for (const listener of listeners) {
            listener(snapshot);
        }
    };
    const stop = () => {
        if (frameHandle !== null) {
            cancelFrame(frameHandle);
            frameHandle = null;
        }
        running = false;
        previousTimestamp = null;
    };
    const tick = (timestamp) => {
        if (!running) {
            return;
        }
        frameHandle = null;
        if (previousTimestamp === null) {
            previousTimestamp = timestamp;
            if (!delayCompleted) {
                frameHandle = requestFrame(tick);
                return;
            }
        }
        else {
            const deltaTimeSeconds = Math.min(maxDeltaTime, Math.max(0, (timestamp - previousTimestamp) / 1000));
            previousTimestamp = timestamp;
            if (!delayCompleted) {
                delayElapsed += deltaTimeSeconds;
                if (delayElapsed < startDelay) {
                    frameHandle = requestFrame(tick);
                    return;
                }
                delayCompleted = true;
            }
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
            delayElapsed = 0;
            delayCompleted = startDelay === 0;
            if (solver.isSettled()) {
                emit();
                running = false;
                return;
            }
            frameHandle = requestFrame(tick);
        },
        stop,
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        setTarget(targetValue) {
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
//# sourceMappingURL=raf-driver.js.map