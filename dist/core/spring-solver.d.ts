export interface SpringSolverConfig {
    stiffness: number;
    damping: number;
    mass: number;
    timestep?: number;
    velocityThreshold?: number;
    positionThreshold?: number;
}
export interface SpringSnapshot {
    value: number;
    target: number;
    velocity: number;
    settled: boolean;
}
export declare class SpringSolver {
    private readonly stiffness;
    private readonly damping;
    private readonly mass;
    private readonly timestep;
    private readonly velocityThreshold;
    private readonly positionThreshold;
    private value;
    private target;
    private velocity;
    private accumulator;
    constructor(initialValue: number, targetValue: number, config: SpringSolverConfig, initialVelocity?: number);
    getValue(): number;
    getTarget(): number;
    setTarget(targetValue: number): void;
    getVelocity(): number;
    setVelocity(velocity: number): void;
    advance(deltaTime: number): SpringSnapshot;
    isSettled(): boolean;
    snapshot(): SpringSnapshot;
    private integrateStep;
}
export declare function createSpringSolver(initialValue: number, targetValue: number, config: SpringSolverConfig, initialVelocity?: number): SpringSolver;
//# sourceMappingURL=spring-solver.d.ts.map