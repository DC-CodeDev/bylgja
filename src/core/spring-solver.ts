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

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`SpringSolver requires ${name} to be finite.`);
  }
}

export class SpringSolver {
  private readonly stiffness: number;
  private readonly damping: number;
  private readonly mass: number;
  private readonly timestep: number;
  private readonly velocityThreshold: number;
  private readonly positionThreshold: number;

  private value: number;
  private target: number;
  private velocity: number;
  private accumulator = 0;

  constructor(
    initialValue: number,
    targetValue: number,
    config: SpringSolverConfig,
    initialVelocity = 0,
  ) {
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

  getValue(): number {
    return this.value;
  }

  getTarget(): number {
    return this.target;
  }

  setTarget(targetValue: number): void {
    assertFinite(targetValue, "targetValue");
    this.target = targetValue;
  }

  getVelocity(): number {
    return this.velocity;
  }

  setVelocity(velocity: number): void {
    this.velocity = velocity;
  }

  advance(deltaTime: number): SpringSnapshot {
    if (deltaTime > 0) {
      this.accumulator += deltaTime;
    }

    while (this.accumulator >= this.timestep) {
      this.integrateStep();
      this.accumulator -= this.timestep;
    }

    return this.snapshot();
  }

  isSettled(): boolean {
    return (
      Math.abs(this.velocity) < this.velocityThreshold &&
      Math.abs(this.target - this.value) < this.positionThreshold
    );
  }

  snapshot(): SpringSnapshot {
    return {
      value: this.value,
      target: this.target,
      velocity: this.velocity,
      settled: this.isSettled(),
    };
  }

  private integrateStep(): void {
    const displacement = this.value - this.target;
    const acceleration =
      (-this.stiffness * displacement - this.damping * this.velocity) /
      this.mass;

    this.velocity += acceleration * this.timestep;
    this.value += this.velocity * this.timestep;
  }
}

export function createSpringSolver(
  initialValue: number,
  targetValue: number,
  config: SpringSolverConfig,
  initialVelocity = 0,
): SpringSolver {
  return new SpringSolver(initialValue, targetValue, config, initialVelocity);
}
