// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { getReducedMotionPreference, useReducedMotion } from "./reducedMotion.js";

interface MockMediaQueryList {
  addEventListener: ReturnType<typeof vi.fn>;
  dispatchChange: (matches: boolean) => void;
  matches: boolean;
  media: string;
  onchange: null;
  removeEventListener: ReturnType<typeof vi.fn>;
}

function createMatchMediaMock(initialMatches: boolean): {
  matchMedia: ReturnType<typeof vi.fn>;
  mediaQueryList: MockMediaQueryList;
} {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQueryList: MockMediaQueryList = {
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    }),
    dispatchChange: (matches: boolean) => {
      mediaQueryList.matches = matches;
      const event = { matches, media: mediaQueryList.media } as MediaQueryListEvent;
      for (const listener of listeners) {
        listener(event);
      }
    },
    matches: initialMatches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    removeEventListener: vi.fn(
      (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
    ),
  };

  return {
    matchMedia: vi.fn(() => mediaQueryList),
    mediaQueryList,
  };
}

function ReducedMotionTarget() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <div data-testid="reduced-motion-target" data-reduced-motion={prefersReducedMotion ? "true" : "false"} />
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("reducedMotion", () => {
  it("reads the initial hook value from matchMedia", () => {
    const { matchMedia } = createMatchMediaMock(true);
    vi.stubGlobal("matchMedia", matchMedia);

    const { getByTestId } = render(<ReducedMotionTarget />);

    expect(getByTestId("reduced-motion-target").getAttribute("data-reduced-motion")).toBe("true");
    expect(getReducedMotionPreference()).toBe(true);
  });

  it("reacts to change events from the media query list", () => {
    const { matchMedia, mediaQueryList } = createMatchMediaMock(false);
    vi.stubGlobal("matchMedia", matchMedia);

    const { getByTestId } = render(<ReducedMotionTarget />);
    expect(getByTestId("reduced-motion-target").getAttribute("data-reduced-motion")).toBe("false");

    act(() => {
      mediaQueryList.dispatchChange(true);
    });

    expect(getByTestId("reduced-motion-target").getAttribute("data-reduced-motion")).toBe("true");
  });

  it("returns false safely when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);

    const { getByTestId } = render(<ReducedMotionTarget />);

    expect(getReducedMotionPreference()).toBe(false);
    expect(getByTestId("reduced-motion-target").getAttribute("data-reduced-motion")).toBe("false");
  });

  it("cleans up the media query listener on unmount", () => {
    const { matchMedia, mediaQueryList } = createMatchMediaMock(false);
    vi.stubGlobal("matchMedia", matchMedia);

    const { unmount } = render(<ReducedMotionTarget />);

    expect(mediaQueryList.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    unmount();

    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
