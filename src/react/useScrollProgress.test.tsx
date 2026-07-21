// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { useScrollProgress } from "./useScrollProgress.js";

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

type IntersectionObserverCallback = (entries: IntersectionObserverEntry[]) => void;

type ManualIntersectionObserverInstance = {
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  simulateIntersection: (isIntersecting: boolean, intersectionRatio: number) => void;
};

let latestObserverInstance: ManualIntersectionObserverInstance | null = null;

function createIntersectionObserverMock(): {
  IntersectionObserver: new (
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) => ManualIntersectionObserverInstance;
} {
  const MockIntersectionObserver = function (
    this: ManualIntersectionObserverInstance,
    callback: IntersectionObserverCallback,
  ) {
    const instance: ManualIntersectionObserverInstance = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      simulateIntersection(isIntersecting: boolean, intersectionRatio: number): void {
        const entry = {
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio,
          intersectionRect: {} as DOMRectReadOnly,
          isIntersecting,
          rootBounds: null,
          target: document.createElement("div"),
          time: performance.now(),
        } as IntersectionObserverEntry;

        callback([entry]);
      },
    };

    latestObserverInstance = instance;
    return instance;
  } as unknown as new (
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) => ManualIntersectionObserverInstance;

  return { IntersectionObserver: MockIntersectionObserver };
}

interface MockRect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
  x: number;
  y: number;
}

function createMockRect(overrides?: Partial<MockRect>): MockRect {
  return {
    bottom: 0,
    height: 200,
    left: 0,
    right: 300,
    top: 0,
    width: 300,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function stubGetBoundingClientRect(rect: MockRect): void {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect as DOMRect);
}

function ScrollProgressComponent({
  threshold,
}: {
  threshold?: number;
}) {
  const ref = useScrollProgress<HTMLDivElement>(threshold !== undefined ? { threshold } : undefined);

  return <div ref={ref} data-testid="scroll-target" style={{ height: "200px" }} />;
}

function readCssProperty(element: HTMLElement, name: string): string {
  return element.style.getPropertyValue(name);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  latestObserverInstance = null;
});

describe("useScrollProgress", () => {
  it("sets scroll-visible to 1 and scroll-visible-ratio when IntersectionObserver reports intersection", () => {
    vi.stubGlobal("IntersectionObserver", createIntersectionObserverMock().IntersectionObserver);

    const { getByTestId } = render(<ScrollProgressComponent />);
    const element = getByTestId("scroll-target");

    act(() => {
      latestObserverInstance!.simulateIntersection(true, 0.45);
    });

    expect(readCssProperty(element, "--scroll-visible")).toBe("1");
    expect(readCssProperty(element, "--scroll-visible-ratio")).toBe("0.45");
  });

  it("sets scroll-visible to 0 when IntersectionObserver reports non-intersection", () => {
    vi.stubGlobal("IntersectionObserver", createIntersectionObserverMock().IntersectionObserver);

    const { getByTestId } = render(<ScrollProgressComponent />);
    const element = getByTestId("scroll-target");

    act(() => {
      latestObserverInstance!.simulateIntersection(true, 1);
    });

    expect(readCssProperty(element, "--scroll-visible")).toBe("1");

    act(() => {
      latestObserverInstance!.simulateIntersection(false, 0);
    });

    expect(readCssProperty(element, "--scroll-visible")).toBe("0");
    expect(readCssProperty(element, "--scroll-visible-ratio")).toBe("0");
  });

  it("computes scroll-progress immediately on mount without waiting for a scroll event", () => {
    vi.stubGlobal("IntersectionObserver", createIntersectionObserverMock().IntersectionObserver);

    // Element top at 400, element height 200, viewport height 800
    // (800 - 400) / (800 + 200) = 400 / 1000 = 0.4
    stubGetBoundingClientRect(createMockRect({ top: 400, height: 200 }));
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    const { getByTestId } = render(<ScrollProgressComponent />);
    const element = getByTestId("scroll-target");

    expect(readCssProperty(element, "--scroll-progress")).toBe("0.4");
  });

  it("recalculates scroll-progress via requestAnimationFrame on scroll", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("IntersectionObserver", createIntersectionObserverMock().IntersectionObserver);
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    // Element at top=1200 (below viewport). Progress = (800 - 1200) / (800 + 200) = -0.4 → clamp to 0
    stubGetBoundingClientRect(createMockRect({ top: 1200, height: 200 }));
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    const { getByTestId } = render(<ScrollProgressComponent />);
    const element = getByTestId("scroll-target");

    // Immediate compute: (800 - 1200) / (800 + 200) = -0.4 → clamp to 0
    expect(readCssProperty(element, "--scroll-progress")).toBe("0");

    // After scrolling, element moves up to top=200 → (800 - 200) / (800 + 200) = 0.6
    stubGetBoundingClientRect(createMockRect({ top: 200, height: 200 }));

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(scheduler.pendingCount()).toBe(1);

    act(() => {
      scheduler.step(16);
    });

    expect(scheduler.pendingCount()).toBe(0);
    expect(readCssProperty(element, "--scroll-progress")).toBe("0.6");
  });

  it("does not schedule multiple redundant RAF frames for concurrent scroll events", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("IntersectionObserver", createIntersectionObserverMock().IntersectionObserver);
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    stubGetBoundingClientRect(createMockRect({ top: 400, height: 200 }));
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    render(<ScrollProgressComponent />);

    expect(scheduler.pendingCount()).toBe(0);

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(scheduler.pendingCount()).toBe(1);

    // Second scroll event before RAF executes: should NOT add another frame
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(scheduler.pendingCount()).toBe(1);

    // Third scroll event before RAF executes: still only 1 pending
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(scheduler.pendingCount()).toBe(1);
  });

  it("clamps scroll-progress to 0 when the element is far below the viewport", () => {
    vi.stubGlobal("IntersectionObserver", createIntersectionObserverMock().IntersectionObserver);

    // Element far below: top = 5000 → (800 - 5000) / (800 + 200) = -4.2 → clamp to 0
    stubGetBoundingClientRect(createMockRect({ top: 5000, height: 200 }));
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    const { getByTestId } = render(<ScrollProgressComponent />);
    const element = getByTestId("scroll-target");

    expect(readCssProperty(element, "--scroll-progress")).toBe("0");
  });

  it("clamps scroll-progress to 1 when the element is far above the viewport", () => {
    vi.stubGlobal("IntersectionObserver", createIntersectionObserverMock().IntersectionObserver);

    // Element far above: top = -5000 → (800 - (-5000)) / (800 + 200) = 5800/1000 = 5.8 → clamp to 1
    stubGetBoundingClientRect(createMockRect({ top: -5000, height: 200 }));
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    const { getByTestId } = render(<ScrollProgressComponent />);
    const element = getByTestId("scroll-target");

    expect(readCssProperty(element, "--scroll-progress")).toBe("1");
  });

  it("removes scroll listener, disconnects observer, and cancels pending RAF on unmount", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("IntersectionObserver", createIntersectionObserverMock().IntersectionObserver);
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    stubGetBoundingClientRect(createMockRect({ top: 400, height: 200 }));
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);

    const { unmount } = render(<ScrollProgressComponent />);

    // Dispatch a scroll to schedule a RAF frame
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(scheduler.pendingCount()).toBe(1);

    const disconnectSpy = vi.spyOn(latestObserverInstance!, "disconnect");

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(scheduler.pendingCount()).toBe(0);
  });
});
