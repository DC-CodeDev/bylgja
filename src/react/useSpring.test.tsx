// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import * as rafDriverModule from "../core/raf-driver.js";
import { useSpring } from "./useSpring.js";
import { SPRING_GENTLE, SPRING_SNAPPY } from "../tokens/springs.js";
import type { SpringSolverConfig } from "../core/spring-solver.js";
import type { RafSpringDriver } from "../core/raf-driver.js";

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

function SpringTarget({
  target,
  config,
  initialValue,
}: {
  target: number;
  config: SpringSolverConfig;
  initialValue?: number;
}) {
  const ref = useSpring<HTMLDivElement>({
    config,
    initialValue,
    targetValue: target,
  });

  return <div data-testid="spring-target" ref={ref} />;
}

function readSpringProgress(element: HTMLElement): number {
  return Number(element.style.getPropertyValue("--spring-progress"));
}

function countSpringWrites(spy: { mock: { calls: unknown[][] } }): number {
  return spy.mock.calls.filter(([name]) => name === "--spring-progress").length;
}

function stubReducedMotion(matches: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useSpring", () => {
  it("writes the final target into --spring-progress once the spring settles", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId } = render(<SpringTarget target={1} config={SPRING_SNAPPY} />);
    const element = getByTestId("spring-target");
    expect(scheduler.pendingCount()).toBe(1);

    act(() => {
      scheduler.step(0);
    });

    let safety = 0;
    while (scheduler.pendingCount() > 0 && safety < 200) {
      act(() => {
        scheduler.step(16);
      });
      safety += 1;
    }

    expect(safety).toBeLessThan(200);
    expect(scheduler.pendingCount()).toBe(0);
    expect(readSpringProgress(element)).toBeCloseTo(1, 2);
  });

  it("uses the provided initialValue instead of animating from zero on mount", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const setPropertySpy = vi.spyOn(CSSStyleDeclaration.prototype, "setProperty");
    const { getByTestId } = render(
      <SpringTarget target={1} config={SPRING_GENTLE} initialValue={0.4} />,
    );
    const element = getByTestId("spring-target");

    expect(readSpringProgress(element)).toBeCloseTo(0.4, 12);
    expect(setPropertySpy).toHaveBeenCalledWith("--spring-progress", "0.4");
    expect(countSpringWrites(setPropertySpy)).toBe(1);

    act(() => {
      scheduler.step(0);
    });

    expect(readSpringProgress(element)).toBeCloseTo(0.4, 12);
  });

  it("reuses the same driver when the target changes and continues from the current value", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId, rerender } = render(<SpringTarget target={1} config={SPRING_GENTLE} />);
    const element = getByTestId("spring-target");

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
      scheduler.step(16);
      scheduler.step(16);
    });

    const valueBeforeTargetChange = readSpringProgress(element);
    expect(valueBeforeTargetChange).toBeGreaterThan(0);

    rerender(<SpringTarget target={2} config={SPRING_GENTLE} />);

    act(() => {
      scheduler.step(16);
    });

    const valueAfterTargetChange = readSpringProgress(element);
    expect(valueAfterTargetChange).toBeGreaterThan(valueBeforeTargetChange * 0.5);

    let safety = 0;
    while (scheduler.pendingCount() > 0 && safety < 200) {
      act(() => {
        scheduler.step(16);
      });
      safety += 1;
    }

    expect(safety).toBeLessThan(200);
    expect(readSpringProgress(element)).toBeCloseTo(2, 2);
  });

  it("calls onSettled exactly once when the spring reaches rest", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const onSettled = vi.fn();

    function SpringTargetWithCallback({
      target,
      config,
    }: {
      target: number;
      config: SpringSolverConfig;
    }) {
      const ref = useSpring<HTMLDivElement>({
        config,
        initialValue: 0,
        onSettled,
        targetValue: target,
      });
      return <div data-testid="spring-target-callback" ref={ref} />;
    }

    render(<SpringTargetWithCallback target={1} config={SPRING_SNAPPY} />);

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
      scheduler.step(16);
    });

    expect(onSettled).not.toHaveBeenCalled();

    let safety = 0;
    while (scheduler.pendingCount() > 0 && safety < 200) {
      act(() => {
        scheduler.step(16);
      });
      safety += 1;
    }

    expect(onSettled).toHaveBeenCalledTimes(1);

    act(() => {
      scheduler.step(16);
      scheduler.step(16);
    });

    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("stops the driver and clears pending frames on unmount", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { unmount } = render(<SpringTarget target={1} config={SPRING_GENTLE} />);

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
    });

    expect(scheduler.pendingCount()).toBe(1);

    unmount();

    expect(scheduler.pendingCount()).toBe(0);

    expect(() => {
      act(() => {
        scheduler.step(16);
      });
    }).not.toThrow();
  });

  it("stops the first StrictMode driver before the remounted one becomes active", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const originalCreate = rafDriverModule.createRafSpringDriver;
    const lifecycleEvents: string[] = [];
    const createdDrivers: Array<{
      driver: RafSpringDriver;
      stopSpy: ReturnType<typeof vi.spyOn>;
    }> = [];

    const createSpy = vi
      .spyOn(rafDriverModule, "createRafSpringDriver")
      .mockImplementation((options, customScheduler) => {
        const driver = originalCreate(options, customScheduler);
        const driverId = createdDrivers.length + 1;
        lifecycleEvents.push(`create:${driverId}`);

        const originalStop = driver.stop.bind(driver);
        const stopSpy = vi.spyOn(driver, "stop").mockImplementation(() => {
          lifecycleEvents.push(`stop:${driverId}`);
          originalStop();
        });

        createdDrivers.push({ driver, stopSpy });
        return driver;
      });

    const { getByTestId, unmount } = render(
      <StrictMode>
        <SpringTarget target={1} config={SPRING_GENTLE} />
      </StrictMode>,
    );
    const element = getByTestId("spring-target");

    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(lifecycleEvents.slice(0, 3)).toEqual(["create:1", "stop:1", "create:2"]);
    expect(scheduler.pendingCount()).toBe(1);
    expect(createdDrivers[0].stopSpy).toHaveBeenCalledTimes(1);
    expect(createdDrivers[1].stopSpy).not.toHaveBeenCalled();

    act(() => {
      scheduler.step(0);
    });

    act(() => {
      scheduler.step(16);
    });

    expect(scheduler.pendingCount()).toBe(1);
    expect(readSpringProgress(element)).not.toBeNaN();

    unmount();

    expect(createdDrivers[1].stopSpy).toHaveBeenCalledTimes(1);
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("does not write to the element after it has been unmounted", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const setPropertySpy = vi.spyOn(CSSStyleDeclaration.prototype, "setProperty");

    const { unmount } = render(<SpringTarget target={1} config={SPRING_SNAPPY} />);

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
    });

    const writesBeforeUnmount = countSpringWrites(setPropertySpy);
    unmount();

    expect(() => {
      act(() => {
        scheduler.step(16);
      });
    }).not.toThrow();

    expect(countSpringWrites(setPropertySpy)).toBe(writesBeforeUnmount);
  });

  it("jumps directly to the target and avoids requestAnimationFrame when reduced motion is active", async () => {
    const scheduler = new ManualRafScheduler();
    const onSettled = vi.fn();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);
    stubReducedMotion(true);

    function SpringTargetWithCallback({
      target,
      config,
    }: {
      target: number;
      config: SpringSolverConfig;
    }) {
      const ref = useSpring<HTMLDivElement>({
        config,
        initialValue: 0,
        onSettled,
        targetValue: target,
      });
      return <div data-testid="spring-target-callback" ref={ref} />;
    }

    const { getByTestId } = render(<SpringTargetWithCallback target={1} config={SPRING_SNAPPY} />);
    const element = getByTestId("spring-target-callback");

    expect(readSpringProgress(element)).toBeCloseTo(1, 12);
    expect(scheduler.pendingCount()).toBe(0);
    expect(onSettled).not.toHaveBeenCalled();

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(readSpringProgress(element)).toBeCloseTo(1, 12);
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("applies reduced motion immediately on target changes without intermediate frames", async () => {
    const scheduler = new ManualRafScheduler();
    const onSettled = vi.fn();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);
    stubReducedMotion(true);

    function SpringTargetWithCallback({
      target,
      config,
    }: {
      target: number;
      config: SpringSolverConfig;
    }) {
      const ref = useSpring<HTMLDivElement>({
        config,
        initialValue: 0,
        onSettled,
        targetValue: target,
      });
      return <div data-testid="spring-target-reduced-motion" ref={ref} />;
    }

    const { getByTestId, rerender } = render(
      <SpringTargetWithCallback target={1} config={SPRING_GENTLE} />,
    );
    const element = getByTestId("spring-target-reduced-motion");

    await act(async () => {
      await Promise.resolve();
    });

    expect(readSpringProgress(element)).toBeCloseTo(1, 12);
    expect(scheduler.pendingCount()).toBe(0);

    rerender(<SpringTargetWithCallback target={2} config={SPRING_GENTLE} />);

    expect(readSpringProgress(element)).toBeCloseTo(2, 12);
    expect(scheduler.pendingCount()).toBe(0);

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSettled).toHaveBeenCalledTimes(2);
  });
});
