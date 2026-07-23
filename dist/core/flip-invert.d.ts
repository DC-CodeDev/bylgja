import { type RafSpringDriver } from "./raf-driver.js";
export interface FlipInvertMeasurement {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface FlipInvertAnimation {
    driver: RafSpringDriver;
    unsubscribe: () => void;
}
interface FlipInvertOptions {
    amplitude?: number;
    delay?: number;
    onSettled?: () => void;
}
export declare function startFlipInvert(element: HTMLElement, from: FlipInvertMeasurement, to: FlipInvertMeasurement, options?: FlipInvertOptions): FlipInvertAnimation;
export {};
//# sourceMappingURL=flip-invert.d.ts.map