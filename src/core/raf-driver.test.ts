import { describe, expect, it } from "vitest";
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
