import { type SpringSnapshot, type SpringSolverConfig } from "./spring-solver.js";
export interface RafSpringDriverOptions extends SpringSolverConfig {
    initialValue: number;
    targetValue: number;
    initialVelocity?: number;
    maxDeltaTime?: number;
    startDelay?: number;
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
export declare function createRafSpringDriver(options: RafSpringDriverOptions, scheduler?: {
    requestAnimationFrame?: RequestFrame;
    cancelAnimationFrame?: CancelFrame;
}): RafSpringDriver;
export {};
//# sourceMappingURL=raf-driver.d.ts.map