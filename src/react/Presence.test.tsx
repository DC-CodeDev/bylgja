// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { act, cleanup, render } from "@testing-library/react";
import * as rafDriverModule from "../core/raf-driver.js";
import { Presence } from "./Presence.js";
import { SPRING_GENTLE, SPRING_SNAPPY } from "../tokens/springs.js";
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

function PresenceTarget({
  show,
  exitTarget = 0,
}: {
  show: boolean;
  exitTarget?: number;
}) {
  return (
    <Presence show={show} exitConfig={SPRING_GENTLE} exitTarget={exitTarget}>
      <span data-testid="presence-child">content</span>
    </Presence>
  );
}

function readSpringProgressFromChild(): number | null {
  const child = document.querySelector("[data-testid='presence-child']");
  const wrapper = child?.parentElement;
  if (!wrapper) {
    return null;
  }

  return Number(wrapper.style.getPropertyValue("--spring-progress"));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Presence", () => {
  it("renders children immediately when show is true", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId } = render(<PresenceTarget show />);

    expect(getByTestId("presence-child")).toBeTruthy();
    expect(readSpringProgressFromChild()).toBeCloseTo(1, 12);
  });

  it("keeps children mounted until the exit spring settles", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { queryByTestId, rerender } = render(<PresenceTarget show />);

    rerender(<PresenceTarget show={false} />);

    expect(queryByTestId("presence-child")).toBeTruthy();
    expect(scheduler.pendingCount()).toBe(1);

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
    });

    expect(queryByTestId("presence-child")).toBeTruthy();

    let safety = 0;
    while (scheduler.pendingCount() > 0 && safety < 200) {
      act(() => {
        scheduler.step(16);
      });
      safety += 1;
    }

    expect(safety).toBeLessThan(200);
    expect(queryByTestId("presence-child")).toBeNull();
  });

  it("cancels exit when show returns to true before the spring settles", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { queryByTestId, rerender } = render(<PresenceTarget show />);

    rerender(<PresenceTarget show={false} />);

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
      scheduler.step(16);
    });

    const progressDuringExit = readSpringProgressFromChild();
    expect(progressDuringExit).not.toBeNull();
    expect(progressDuringExit as number).toBeLessThan(1);

    rerender(<PresenceTarget show />);

    act(() => {
      scheduler.step(16);
    });

    const progressAfterReturn = readSpringProgressFromChild();
    expect(queryByTestId("presence-child")).toBeTruthy();
    expect(progressAfterReturn).not.toBeNull();
    expect(progressAfterReturn as number).toBeGreaterThan(0.5);

    let safety = 0;
    while (scheduler.pendingCount() > 0 && safety < 200) {
      act(() => {
        scheduler.step(16);
      });
      safety += 1;
    }

    expect(queryByTestId("presence-child")).toBeTruthy();
    expect(readSpringProgressFromChild()).toBeCloseTo(1, 2);
  });

  it("cleans up StrictMode drivers so only the remounted instance remains active", () => {
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
        <PresenceTarget show />
      </StrictMode>,
    );

    expect(getByTestId("presence-child")).toBeTruthy();
    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(lifecycleEvents.slice(0, 3)).toEqual(["create:1", "stop:1", "create:2"]);
    expect(createdDrivers[0].stopSpy).toHaveBeenCalledTimes(1);
    expect(createdDrivers[1].stopSpy).not.toHaveBeenCalled();
    expect(scheduler.pendingCount()).toBeLessThanOrEqual(1);

    unmount();

    expect(createdDrivers[1].stopSpy).toHaveBeenCalledTimes(1);
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("does not leak pending frames when the parent unmounts during exit", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { rerender, unmount } = render(<PresenceTarget show />);

    rerender(<PresenceTarget show={false} />);

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

  it("re-enters from exitTarget after a full unmount instead of appearing already settled", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { queryByTestId, rerender } = render(<PresenceTarget show exitTarget={0.2} />);

    rerender(<PresenceTarget show={false} exitTarget={0.2} />);

    let safety = 0;
    while (scheduler.pendingCount() > 0 && safety < 200) {
      act(() => {
        scheduler.step(safety === 0 ? 0 : 16);
      });
      safety += 1;
    }

    expect(safety).toBeLessThan(200);
    expect(queryByTestId("presence-child")).toBeNull();

    rerender(<PresenceTarget show exitTarget={0.2} />);

    const childAfterReentry = queryByTestId("presence-child");
    expect(childAfterReentry).toBeTruthy();
    expect(readSpringProgressFromChild()).toBeCloseTo(0.2, 12);

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
    });

    const progressDuringReentry = readSpringProgressFromChild();
    expect(progressDuringReentry).not.toBeNull();
    expect(progressDuringReentry as number).toBeGreaterThan(0.2);
    expect(progressDuringReentry as number).toBeLessThan(1);

    safety = 0;
    while (scheduler.pendingCount() > 0 && safety < 200) {
      act(() => {
        scheduler.step(16);
      });
      safety += 1;
    }

    expect(safety).toBeLessThan(200);
    expect(readSpringProgressFromChild()).toBeCloseTo(1, 2);
  });
});
