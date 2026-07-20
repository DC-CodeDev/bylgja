// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { useCallback, useRef, useState } from "react";
import { usePointerTracker, type PointerPosition } from "./usePointerTracker.js";

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

const DEFAULT_RECT: MockRect = {
  bottom: 400,
  height: 300,
  left: 50,
  right: 350,
  top: 100,
  width: 300,
  x: 50,
  y: 100,
};

function createMockRect(overrides?: Partial<MockRect>): MockRect {
  return { ...DEFAULT_RECT, ...overrides };
}

function stubGetBoundingClientRect(rect: MockRect): void {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect as DOMRect);
}

type ResizeObserverCallback = (entries: ResizeObserverEntry[]) => void;

type ManualResizeObserverInstance = {
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  simulateResize: (target: Element, newRect: MockRect) => void;
};

function createResizeObserverMock(): {
  ResizeObserver: new (callback: ResizeObserverCallback) => ManualResizeObserverInstance;
  getLatestInstance: () => ManualResizeObserverInstance | null;
} {
  let latestInstance: ManualResizeObserverInstance | null = null;

  const MockResizeObserver = function (
    this: ManualResizeObserverInstance,
    callback: ResizeObserverCallback,
  ) {
    const instance: ManualResizeObserverInstance = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      simulateResize(target: Element, newRect: MockRect): void {
        const entry = {
          contentRect: newRect as unknown as DOMRectReadOnly,
          target,
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        } as unknown as ResizeObserverEntry;
        callback([entry]);
      },
    };
    latestInstance = instance;
    return instance;
  } as unknown as new (callback: ResizeObserverCallback) => ManualResizeObserverInstance;

  return {
    ResizeObserver: MockResizeObserver,
    getLatestInstance: () => latestInstance,
  };
}

let resizeObserverMock: ReturnType<typeof createResizeObserverMock> | null = null;

function stubResizeObserver(): void {
  resizeObserverMock = createResizeObserverMock();
  vi.stubGlobal("ResizeObserver", resizeObserverMock.ResizeObserver);
}

function PointerTrackerComponent({
  onMove,
}: {
  onMove?: (position: PointerPosition) => void;
}) {
  const ref = usePointerTracker<HTMLDivElement>(onMove ? { onMove } : undefined);

  return <div ref={ref} data-testid="pointer-target" />;
}

function readCssProperty(element: HTMLElement, name: string): string {
  return element.style.getPropertyValue(name);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resizeObserverMock = null;
});

describe("usePointerTracker", () => {
  it("sets pointer-inside to 1 on pointerenter", () => {
    stubGetBoundingClientRect(createMockRect());
    stubResizeObserver();

    const { getByTestId } = render(<PointerTrackerComponent />);
    const element = getByTestId("pointer-target");

    act(() => {
      element.dispatchEvent(new PointerEvent("pointerenter"));
    });

    expect(readCssProperty(element, "--pointer-inside")).toBe("1");
  });

  it("sets pointer-inside to 0 on pointerleave", () => {
    stubGetBoundingClientRect(createMockRect());
    stubResizeObserver();

    const { getByTestId } = render(<PointerTrackerComponent />);
    const element = getByTestId("pointer-target");

    act(() => {
      element.dispatchEvent(new PointerEvent("pointerenter"));
    });

    expect(readCssProperty(element, "--pointer-inside")).toBe("1");

    act(() => {
      element.dispatchEvent(new PointerEvent("pointerleave"));
    });

    expect(readCssProperty(element, "--pointer-inside")).toBe("0");
  });

  it("calculates correct positional custom properties on pointermove after pointerenter", () => {
    const rect = createMockRect({ left: 50, top: 100, width: 300, height: 200 });
    stubGetBoundingClientRect(rect);
    stubResizeObserver();

    const { getByTestId } = render(<PointerTrackerComponent />);
    const element = getByTestId("pointer-target");

    act(() => {
      element.dispatchEvent(new PointerEvent("pointerenter"));
    });

    act(() => {
      element.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 200, clientY: 200 }),
      );
    });

    // clientX 200 - left 50 = 150
    // clientY 200 - top 100 = 100
    expect(readCssProperty(element, "--pointer-x")).toBe("150");
    expect(readCssProperty(element, "--pointer-y")).toBe("100");
    // 150 / 300 = 0.5
    expect(readCssProperty(element, "--pointer-normalized-x")).toBe("0.5");
    // 100 / 200 = 0.5
    expect(readCssProperty(element, "--pointer-normalized-y")).toBe("0.5");
  });

  it("calls onMove with the correct PointerPosition on pointermove", () => {
    const rect = createMockRect({ left: 50, top: 100, width: 300, height: 200 });
    stubGetBoundingClientRect(rect);
    stubResizeObserver();

    const onMove = vi.fn();
    const { getByTestId } = render(<PointerTrackerComponent onMove={onMove} />);
    const element = getByTestId("pointer-target");

    act(() => {
      element.dispatchEvent(new PointerEvent("pointerenter"));
    });

    act(() => {
      element.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 200, clientY: 200 }),
      );
    });

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith({
      x: 150,
      y: 100,
      normalizedX: 0.5,
      normalizedY: 0.5,
      isInside: true,
    });
  });

  it("removes event listeners on unmount", () => {
    const rect = createMockRect();
    stubGetBoundingClientRect(rect);
    stubResizeObserver();

    const removeEventListenerSpy = vi.spyOn(
      HTMLElement.prototype,
      "removeEventListener",
    );

    const { unmount, getByTestId } = render(<PointerTrackerComponent />);
    const element = getByTestId("pointer-target");

    // Mount expected to add 3 listeners + 1 observe
    act(() => {
      element.dispatchEvent(new PointerEvent("pointerenter"));
    });

    unmount();

    // Should have removed all three event listeners
    const pointerenterRemovals = removeEventListenerSpy.mock.calls.filter(
      ([type]) => type === "pointerenter",
    );
    const pointermoveRemovals = removeEventListenerSpy.mock.calls.filter(
      ([type]) => type === "pointermove",
    );
    const pointerleaveRemovals = removeEventListenerSpy.mock.calls.filter(
      ([type]) => type === "pointerleave",
    );

    expect(pointerenterRemovals.length).toBeGreaterThanOrEqual(1);
    expect(pointermoveRemovals.length).toBeGreaterThanOrEqual(1);
    expect(pointerleaveRemovals.length).toBeGreaterThanOrEqual(1);
  });

  it("updates rect cache via ResizeObserver before next pointermove", () => {
    const initialRect = createMockRect({ left: 0, top: 0, width: 100, height: 100 });
    stubGetBoundingClientRect(initialRect);
    stubResizeObserver();

    const { getByTestId } = render(<PointerTrackerComponent />);
    const element = getByTestId("pointer-target");

    act(() => {
      element.dispatchEvent(new PointerEvent("pointerenter"));
    });

    act(() => {
      element.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 50, clientY: 50 }),
      );
    });

    // With 100x100 rect, 50/100 = 0.5
    expect(readCssProperty(element, "--pointer-normalized-x")).toBe("0.5");
    expect(readCssProperty(element, "--pointer-normalized-y")).toBe("0.5");

    // Element grows to 200x200 — simulate resize
    const newRect = createMockRect({ left: 0, top: 0, width: 200, height: 200 });
    stubGetBoundingClientRect(newRect);

    act(() => {
      resizeObserverMock!.getLatestInstance()!.simulateResize(element, newRect);
    });

    act(() => {
      element.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 50, clientY: 50 }),
      );
    });

    // After resize, 50/200 = 0.25
    expect(readCssProperty(element, "--pointer-normalized-x")).toBe("0.25");
    expect(readCssProperty(element, "--pointer-normalized-y")).toBe("0.25");
  });

  it("does not throw when element ref is null on mount", () => {
    stubResizeObserver();

    function NullRefComponent() {
      const ref = useRef<HTMLDivElement | null>(null);
      // Simulate a ref that never gets attached
      return <div data-testid="null-target">no ref</div>;
    }

    expect(() => {
      render(<NullRefComponent />);
    }).not.toThrow();
  });

  it("disconnects ResizeObserver on unmount", () => {
    const rect = createMockRect();
    stubGetBoundingClientRect(rect);
    stubResizeObserver();

    const { unmount, getByTestId } = render(<PointerTrackerComponent />);
    const element = getByTestId("pointer-target");

    act(() => {
      element.dispatchEvent(new PointerEvent("pointerenter"));
    });

    const instance = resizeObserverMock!.getLatestInstance()!;
    expect(instance).not.toBeNull();
    const disconnectSpy = vi.spyOn(instance, "disconnect");

    unmount();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
