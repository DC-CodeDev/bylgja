import { describe, expect, it } from "vitest";
import { SpringSolver } from "./spring-solver.js";
import { SPRING_GENTLE, SPRING_SNAPPY } from "../tokens/springs.js";

const TOLERANCE = 1e-9;

function expectClose(actual: number, expected: number, tolerance = TOLERANCE): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

function advanceUntilSettled(
  solver: SpringSolver,
  deltaTime: number,
  maxSteps: number,
): number {
  let steps = 0;
  while (!solver.isSettled() && steps < maxSteps) {
    solver.advance(deltaTime);
    steps += 1;
  }
  return steps;
}

describe("SpringSolver", () => {
  it("converges monotonically without overshooting on an overdamped spring", () => {
    const solver = new SpringSolver(0, 1, {
      stiffness: 200,
      damping: 100,
      mass: 1,
    });

    let previousValue = solver.getValue();
    let steps = 0;
    while (!solver.isSettled() && steps < 1000) {
      solver.advance(1 / 120);
      const value = solver.getValue();

      expect(value).toBeGreaterThanOrEqual(previousValue - TOLERANCE);
      expect(value).toBeLessThanOrEqual(1 + TOLERANCE);

      previousValue = value;
      steps += 1;
    }

    expect(steps).toBeLessThan(1000);
    expect(solver.isSettled()).toBe(true);
  });

  it("settles in finite time on the snappy token and overshoots at least once", () => {
    const solver = new SpringSolver(0, 1, SPRING_SNAPPY);
    let overshot = false;
    let steps = 0;

    while (!solver.isSettled() && steps < 1000) {
      solver.advance(1 / 60);
      if (solver.getValue() > 1 + TOLERANCE) {
        overshot = true;
      }
      steps += 1;
    }

    expect(steps).toBeLessThan(1000);
    expect(solver.isSettled()).toBe(true);
    expect(overshot).toBe(true);
  });

  it("eventually settles for the real spring tokens", () => {
    for (const config of [SPRING_GENTLE, SPRING_SNAPPY]) {
      const solver = new SpringSolver(0, 1, config);
      const steps = advanceUntilSettled(solver, 1 / 60, 5000);

      expect(solver.isSettled()).toBe(true);
      expect(steps).toBeGreaterThan(0);
      expect(steps).toBeLessThan(5000);
    }
  });

  it("produces the same result for the same total time regardless of delta chunking", () => {
    const config = {
      stiffness: 200,
      damping: 28,
      mass: 1,
    };

    const largeDelta = new SpringSolver(0, 1, config);
    largeDelta.advance(1);

    const chunked = new SpringSolver(0, 1, config);
    for (let step = 0; step < 4; step += 1) {
      chunked.advance(0.25);
    }

    expectClose(chunked.getValue(), largeDelta.getValue());
    expectClose(chunked.getVelocity(), largeDelta.getVelocity());
  });

  it("rejects invalid physical parameters", () => {
    expect(() => new SpringSolver(0, 1, { stiffness: 0, damping: 1, mass: 0 })).toThrow(
      /positive mass/i,
    );
    expect(() => new SpringSolver(0, 1, { stiffness: -1, damping: 1, mass: 1 })).toThrow(
      /stiffness/i,
    );
    expect(() => new SpringSolver(0, 1, { stiffness: 1, damping: -1, mass: 1 })).toThrow(
      /damping/i,
    );
    expect(() => new SpringSolver(0, 1, { stiffness: 1, damping: 1, mass: 1, timestep: 0 })).toThrow(
      /timestep/i,
    );
    expect(() =>
      new SpringSolver(0, 1, { stiffness: 1, damping: 1, mass: 1, timestep: -0.01 }),
    ).toThrow(/timestep/i);
  });

  it("rejects non-finite constructor inputs", () => {
    const config = { stiffness: 1, damping: 1, mass: 1 };
    const cases: Array<{
      create: () => SpringSolver;
      message: RegExp;
    }> = [
      { create: () => new SpringSolver(Number.NaN, 1, config), message: /initialValue.*finite/i },
      { create: () => new SpringSolver(Number.POSITIVE_INFINITY, 1, config), message: /initialValue.*finite/i },
      { create: () => new SpringSolver(0, Number.NaN, config), message: /targetValue.*finite/i },
      { create: () => new SpringSolver(0, Number.NEGATIVE_INFINITY, config), message: /targetValue.*finite/i },
      { create: () => new SpringSolver(0, 1, config, Number.NaN), message: /initialVelocity.*finite/i },
      { create: () => new SpringSolver(0, 1, config, Number.POSITIVE_INFINITY), message: /initialVelocity.*finite/i },
      { create: () => new SpringSolver(0, 1, { stiffness: Number.NaN, damping: 1, mass: 1 }), message: /stiffness.*finite/i },
      { create: () => new SpringSolver(0, 1, { stiffness: Number.POSITIVE_INFINITY, damping: 1, mass: 1 }), message: /stiffness.*finite/i },
      { create: () => new SpringSolver(0, 1, { stiffness: 1, damping: Number.NaN, mass: 1 }), message: /damping.*finite/i },
      { create: () => new SpringSolver(0, 1, { stiffness: 1, damping: Number.NEGATIVE_INFINITY, mass: 1 }), message: /damping.*finite/i },
      { create: () => new SpringSolver(0, 1, { stiffness: 1, damping: 1, mass: Number.NaN }), message: /mass.*finite/i },
      { create: () => new SpringSolver(0, 1, { stiffness: 1, damping: 1, mass: Number.POSITIVE_INFINITY }), message: /mass.*finite/i },
      { create: () => new SpringSolver(0, 1, { stiffness: 1, damping: 1, mass: 1, timestep: Number.NaN }), message: /timestep.*finite/i },
      { create: () => new SpringSolver(0, 1, { stiffness: 1, damping: 1, mass: 1, timestep: Number.POSITIVE_INFINITY }), message: /timestep.*finite/i },
    ];

    for (const testCase of cases) {
      expect(testCase.create).toThrow(testCase.message);
    }
  });

  it("rejects non-finite target updates", () => {
    const solver = new SpringSolver(0, 1, SPRING_GENTLE);

    expect(() => {
      solver.setTarget(Number.NaN);
    }).toThrow(/targetValue.*finite/i);
    expect(() => {
      solver.setTarget(Number.POSITIVE_INFINITY);
    }).toThrow(/targetValue.*finite/i);
  });

  it("treats velocity and position thresholds as a conjunction", () => {
    const config = {
      stiffness: 100,
      damping: 20,
      mass: 1,
      velocityThreshold: 0.01,
      positionThreshold: 0.01,
    };

    expect(new SpringSolver(0.995, 1, config, 0.005).isSettled()).toBe(true);
    expect(new SpringSolver(0.995, 1, config, 0.02).isSettled()).toBe(false);
    expect(new SpringSolver(0.9, 1, config, 0.005).isSettled()).toBe(false);
    expect(new SpringSolver(0.9, 1, config, 0.02).isSettled()).toBe(false);
  });

  it("is deterministic across independent runs with the same time sequence", () => {
    const config = SPRING_SNAPPY;
    const deltas = [0.07, 0.13, 0.31, 0.49, 0.2];

    const first = new SpringSolver(0, 1, config);
    const second = new SpringSolver(0, 1, config);

    for (const delta of deltas) {
      first.advance(delta);
      second.advance(delta);
    }

    expectClose(first.getValue(), second.getValue(), 1e-12);
    expectClose(first.getVelocity(), second.getVelocity(), 1e-12);
    expect(first.snapshot()).toEqual(second.snapshot());
  });

  it("ignores zero delta time without changing state", () => {
    const solver = new SpringSolver(0, 1, SPRING_GENTLE);
    const before = solver.snapshot();
    const afterZero = solver.advance(0);

    expect(afterZero).toEqual(before);

    const afterZeroThenStep = solver.advance(1 / 120);
    const control = new SpringSolver(0, 1, SPRING_GENTLE).advance(1 / 120);

    expectClose(afterZeroThenStep.value, control.value);
    expectClose(afterZeroThenStep.velocity, control.velocity);
    expect(afterZeroThenStep.settled).toBe(control.settled);
  });

  it("remains unchanged at the exact target with zero velocity", () => {
    const solver = new SpringSolver(1, 1, SPRING_GENTLE, 0);
    const before = solver.snapshot();
    const after = solver.advance(1);

    expect(after.value).toBe(before.value);
    expect(after.velocity).toBe(before.velocity);
    expect(after.target).toBe(before.target);
    expect(after.settled).toBe(true);
    expect(solver.getValue()).toBe(1);
    expect(solver.getVelocity()).toBe(0);
  });
});
