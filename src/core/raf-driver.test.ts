import { afterEach, describe, expect, it, vi } from "vitest";
import { createRafSpringDriver } from "./raf-driver.js";
import { SpringSolver } from "./spring-solver.js";
import { SPRING_GENTLE, SPRING_SNAPPY } from "../tokens/springs.js";

class ManualRafScheduler {
  private now = 0;
  private nextHandle = 1;
  private readonly pending = new Map<number, FrameRequestCallback>();

  requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const handle = this.nextHandle;
    this.nextHandle += 1;
    this.pending.set(handle, callback);
    return handle;
  };

  cancelAnimationFrame = (handle: number): void => {
    this.pending.delete(handle);
  };

  step(deltaMilliseconds: number): void {
    this.now += deltaMilliseconds;
    const callbacks = [...this.pending.entries()].sort(([left], [right]) => left - right);
    this.pending.clear();

    for (const [, callback] of callbacks) {
      callback(this.now);
    }
  }

  pendingCount(): number {
    return this.pending.size;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createRafSpringDriver", () => {
  it("stops automatically when the solver becomes settled", () => {
    const scheduler = new ManualRafScheduler();
    const driver = createRafSpringDriver(
      {
        ...SPRING_SNAPPY,
        initialValue: 0,
        targetValue: 1,
      },
      scheduler,
    );

    let emissions = 0;
    driver.subscribe(() => {
      emissions += 1;
    });

    driver.start();
    expect(driver.isRunning()).toBe(true);
    expect(scheduler.pendingCount()).toBe(1);

    scheduler.step(0);

    let safety = 0;
    while (scheduler.pendingCount() > 0 && safety < 1000) {
      scheduler.step(16);
      safety += 1;
    }

    expect(safety).toBeLessThan(1000);
    expect(driver.isRunning()).toBe(false);
    expect(scheduler.pendingCount()).toBe(0);
    expect(emissions).toBeGreaterThan(1);
  });

  it("cancels the pending frame and stops emitting after stop()", () => {
    const scheduler = new ManualRafScheduler();
    const driver = createRafSpringDriver(
      {
        ...SPRING_GENTLE,
        initialValue: 0,
        targetValue: 1,
      },
      scheduler,
    );

    let emissions = 0;
    driver.subscribe(() => {
      emissions += 1;
    });

    driver.start();
    scheduler.step(0);
    scheduler.step(16);

    const emissionsBeforeStop = emissions;
    expect(scheduler.pendingCount()).toBe(1);

    driver.stop();

    expect(driver.isRunning()).toBe(false);
    expect(scheduler.pendingCount()).toBe(0);

    scheduler.step(16);
    expect(emissions).toBe(emissionsBeforeStop);
  });

  it("clamps large frame gaps to maxDeltaTime", () => {
    const scheduler = new ManualRafScheduler();
    const driver = createRafSpringDriver(
      {
        ...SPRING_GENTLE,
        initialValue: 0,
        targetValue: 1,
        maxDeltaTime: 0.25,
      },
      scheduler,
    );

    driver.start();
    scheduler.step(0);
    scheduler.step(1000);

    const actual = driver.getSnapshot();
    const expectedClamped = new SpringSolver(0, 1, SPRING_GENTLE).advance(0.25);
    const expectedUnclamped = new SpringSolver(0, 1, SPRING_GENTLE).advance(1);

    expect(actual.value).toBeCloseTo(expectedClamped.value, 12);
    expect(actual.velocity).toBeCloseTo(expectedClamped.velocity, 12);
    expect(Math.abs(actual.value - expectedUnclamped.value)).toBeGreaterThan(1e-3);
  });

  it("rejects non-finite maxDeltaTime", () => {
    const scheduler = new ManualRafScheduler();

    expect(() =>
      createRafSpringDriver(
        {
          ...SPRING_GENTLE,
          initialValue: 0,
          targetValue: 1,
          maxDeltaTime: Number.NaN,
        },
        scheduler,
      ),
    ).toThrow(/maxDeltaTime.*finite/i);
    expect(() =>
      createRafSpringDriver(
        {
          ...SPRING_GENTLE,
          initialValue: 0,
          targetValue: 1,
          maxDeltaTime: Number.POSITIVE_INFINITY,
        },
        scheduler,
      ),
    ).toThrow(/maxDeltaTime.*finite/i);
  });

  it("waits for startDelay before advancing the solver or emitting snapshots", () => {
    const scheduler = new ManualRafScheduler();
    const advanceSpy = vi.spyOn(SpringSolver.prototype, "advance");
    const driver = createRafSpringDriver(
      {
        ...SPRING_GENTLE,
        initialValue: 0,
        targetValue: 1,
        startDelay: 0.05,
      },
      scheduler,
    );

    let emissions = 0;
    driver.subscribe(() => {
      emissions += 1;
    });

    driver.start();
    scheduler.step(0);
    scheduler.step(16);
    scheduler.step(16);
    scheduler.step(16);

    expect(advanceSpy).not.toHaveBeenCalled();
    expect(emissions).toBe(0);
    expect(driver.isRunning()).toBe(true);
    expect(scheduler.pendingCount()).toBe(1);
  });

  it("starts animating after startDelay and still settles normally", () => {
    const scheduler = new ManualRafScheduler();
    const driver = createRafSpringDriver(
      {
        ...SPRING_SNAPPY,
        initialValue: 0,
        targetValue: 1,
        startDelay: 0.032,
      },
      scheduler,
    );

    let emissions = 0;
    driver.subscribe(() => {
      emissions += 1;
    });

    driver.start();
    scheduler.step(0);
    scheduler.step(16);
    expect(emissions).toBe(0);

    let safety = 0;
    while (scheduler.pendingCount() > 0 && safety < 1000) {
      scheduler.step(16);
      safety += 1;
    }

    expect(safety).toBeLessThan(1000);
    expect(emissions).toBeGreaterThan(1);
    expect(driver.getSnapshot().target).toBe(1);
    expect(Math.abs(driver.getSnapshot().value - driver.getSnapshot().target)).toBeLessThan(0.01);
    expect(driver.isRunning()).toBe(false);
  });

  it("defaults to the previous behavior when startDelay is omitted", () => {
    const schedulerWithoutDelay = new ManualRafScheduler();
    const schedulerZeroDelay = new ManualRafScheduler();
    const driverWithoutDelay = createRafSpringDriver(
      {
        ...SPRING_GENTLE,
        initialValue: 0,
        targetValue: 1,
      },
      schedulerWithoutDelay,
    );
    const driverZeroDelay = createRafSpringDriver(
      {
        ...SPRING_GENTLE,
        initialValue: 0,
        targetValue: 1,
        startDelay: 0,
      },
      schedulerZeroDelay,
    );

    const snapshotsWithoutDelay: Array<{ value: number; velocity: number; target: number }> = [];
    const snapshotsZeroDelay: Array<{ value: number; velocity: number; target: number }> = [];

    driverWithoutDelay.subscribe((snapshot) => {
      snapshotsWithoutDelay.push(snapshot);
    });
    driverZeroDelay.subscribe((snapshot) => {
      snapshotsZeroDelay.push(snapshot);
    });

    driverWithoutDelay.start();
    driverZeroDelay.start();

    schedulerWithoutDelay.step(0);
    schedulerZeroDelay.step(0);
    schedulerWithoutDelay.step(16);
    schedulerZeroDelay.step(16);
    schedulerWithoutDelay.step(16);
    schedulerZeroDelay.step(16);

    expect(snapshotsWithoutDelay).toHaveLength(snapshotsZeroDelay.length);

    for (const [index, snapshot] of snapshotsWithoutDelay.entries()) {
      expect(snapshot.value).toBeCloseTo(snapshotsZeroDelay[index].value, 12);
      expect(snapshot.velocity).toBeCloseTo(snapshotsZeroDelay[index].velocity, 12);
      expect(snapshot.target).toBe(snapshotsZeroDelay[index].target);
    }
  });

  it("rejects invalid startDelay values", () => {
    const scheduler = new ManualRafScheduler();

    expect(() =>
      createRafSpringDriver(
        {
          ...SPRING_GENTLE,
          initialValue: 0,
          targetValue: 1,
          startDelay: Number.NaN,
        },
        scheduler,
      ),
    ).toThrow(/startDelay.*finite/i);
    expect(() =>
      createRafSpringDriver(
        {
          ...SPRING_GENTLE,
          initialValue: 0,
          targetValue: 1,
          startDelay: Number.POSITIVE_INFINITY,
        },
        scheduler,
      ),
    ).toThrow(/startDelay.*finite/i);
    expect(() =>
      createRafSpringDriver(
        {
          ...SPRING_GENTLE,
          initialValue: 0,
          targetValue: 1,
          startDelay: -0.01,
        },
        scheduler,
      ),
    ).toThrow(/startDelay.*non-negative/i);
  });

  it("resets startDelay when start is called again on a reused driver", () => {
    const scheduler = new ManualRafScheduler();
    const advanceSpy = vi.spyOn(SpringSolver.prototype, "advance");
    const driver = createRafSpringDriver(
      {
        ...SPRING_GENTLE,
        initialValue: 0,
        targetValue: 1,
        startDelay: 0.05,
      },
      scheduler,
    );

    let emissions = 0;
    driver.subscribe(() => {
      emissions += 1;
    });

    driver.start();
    scheduler.step(0);
    scheduler.step(16);
    scheduler.step(16);
    driver.stop();

    expect(advanceSpy).not.toHaveBeenCalled();
    expect(emissions).toBe(0);

    driver.start();
    scheduler.step(0);
    scheduler.step(16);
    scheduler.step(16);
    scheduler.step(16);

    expect(advanceSpy).not.toHaveBeenCalled();
    expect(emissions).toBe(0);

    scheduler.step(16);

    expect(advanceSpy).toHaveBeenCalledTimes(1);
    expect(emissions).toBe(1);
  });

  it("emits snapshots to subscribers and supports unsubscribe", () => {
    const scheduler = new ManualRafScheduler();
    const driver = createRafSpringDriver(
      {
        ...SPRING_GENTLE,
        initialValue: 0,
        targetValue: 1,
      },
      scheduler,
    );

    const snapshots: Array<{ value: number; target: number }> = [];
    const unsubscribe = driver.subscribe((snapshot) => {
      snapshots.push({ value: snapshot.value, target: snapshot.target });
    });

    driver.setTarget(2);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].target).toBe(2);

    unsubscribe();
    driver.setTarget(3);

    expect(snapshots).toHaveLength(1);
  });

  it("emits an immediate snapshot when setTarget is called while stopped", () => {
    const scheduler = new ManualRafScheduler();
    const driver = createRafSpringDriver(
      {
        ...SPRING_GENTLE,
        initialValue: 0,
        targetValue: 1,
      },
      scheduler,
    );

    const snapshots: number[] = [];
    driver.subscribe((snapshot) => {
      snapshots.push(snapshot.target);
    });

    driver.setTarget(4);

    expect(snapshots).toEqual([4]);
    expect(driver.getSnapshot().target).toBe(4);
    expect(driver.isRunning()).toBe(false);
  });

  it("clears all pending work when many drivers are started and stopped immediately", () => {
    const scheduler = new ManualRafScheduler();
    const drivers = Array.from({ length: 500 }, () =>
      createRafSpringDriver(
        {
          ...SPRING_GENTLE,
          initialValue: 0,
          targetValue: 1,
        },
        scheduler,
      ),
    );

    for (const driver of drivers) {
      driver.start();
    }

    expect(scheduler.pendingCount()).toBe(500);

    for (const driver of drivers) {
      driver.stop();
    }

    expect(scheduler.pendingCount()).toBe(0);
    for (const driver of drivers) {
      expect(driver.isRunning()).toBe(false);
    }
  });
});
