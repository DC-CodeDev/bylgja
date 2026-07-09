function assertFinite(value, name) {
    if (!Number.isFinite(value)) {
        throw new Error(`SpringSolver requires ${name} to be finite.`);
    }
}
export class SpringSolver {
    stiffness;
    damping;
    mass;
    timestep;
    velocityThreshold;
    positionThreshold;
    value;
    target;
    velocity;
    accumulator = 0;
    constructor(initialValue, targetValue, config, initialVelocity = 0) {
        assertFinite(initialValue, "initialValue");
        assertFinite(targetValue, "targetValue");
        assertFinite(initialVelocity, "initialVelocity");
        assertFinite(config.mass, "mass");
        assertFinite(config.stiffness, "stiffness");
        assertFinite(config.damping, "damping");
        if (config.timestep !== undefined) {
            assertFinite(config.timestep, "timestep");
        }
        if (config.mass <= 0) {
            throw new Error("SpringSolver requires a positive mass.");
        }
        if (config.stiffness < 0) {
            throw new Error("SpringSolver requires stiffness to be greater than or equal to zero.");
        }
        if (config.damping < 0) {
            throw new Error("SpringSolver requires damping to be greater than or equal to zero.");
        }
        if (config.timestep === undefined ? 1 / 120 <= 0 : config.timestep <= 0) {
            throw new Error("SpringSolver requires a positive timestep.");
        }
        this.stiffness = config.stiffness;
        this.damping = config.damping;
        this.mass = config.mass;
        this.timestep = config.timestep ?? 1 / 120;
        this.velocityThreshold = config.velocityThreshold ?? 0.01;
        this.positionThreshold = config.positionThreshold ?? 0.01;
        this.value = initialValue;
        this.target = targetValue;
        this.velocity = initialVelocity;
    }
    getValue() {
        return this.value;
    }
    getTarget() {
        return this.target;
    }
    setTarget(targetValue) {
        assertFinite(targetValue, "targetValue");
        this.target = targetValue;
    }
    getVelocity() {
        return this.velocity;
    }
    setVelocity(velocity) {
        this.velocity = velocity;
    }
    advance(deltaTime) {
        if (deltaTime > 0) {
            this.accumulator += deltaTime;
        }
        while (this.accumulator >= this.timestep) {
            this.integrateStep();
            this.accumulator -= this.timestep;
        }
        return this.snapshot();
    }
    isSettled() {
        return (Math.abs(this.velocity) < this.velocityThreshold &&
            Math.abs(this.target - this.value) < this.positionThreshold);
    }
    snapshot() {
        return {
            value: this.value,
            target: this.target,
            velocity: this.velocity,
            settled: this.isSettled(),
        };
    }
    integrateStep() {
        const displacement = this.value - this.target;
        const acceleration = (-this.stiffness * displacement - this.damping * this.velocity) /
            this.mass;
        this.velocity += acceleration * this.timestep;
        this.value += this.velocity * this.timestep;
    }
}
export function createSpringSolver(initialValue, targetValue, config, initialVelocity = 0) {
    return new SpringSolver(initialValue, targetValue, config, initialVelocity);
}
//# sourceMappingURL=spring-solver.js.map