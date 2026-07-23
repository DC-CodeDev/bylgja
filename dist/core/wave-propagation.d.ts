export interface PropagationElement {
    id: string;
    x: number;
    y: number;
}
export interface PropagationOrigin {
    x: number;
    y: number;
}
export interface WavePropagationConfig {
    propagationSpeed?: number;
    minAmplitude?: number;
    maxAmplitude?: number;
}
export interface PropagationResult {
    id: string;
    delay: number;
    amplitude: number;
}
export declare function createWavePropagation(elements: PropagationElement[], origin: PropagationOrigin, config?: WavePropagationConfig): PropagationResult[];
//# sourceMappingURL=wave-propagation.d.ts.map