// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import * as rafDriverModule from "../core/raf-driver.js";
import { useSelectedHighlight } from "./selectedHighlight.js";
import { ManualRafScheduler, advanceUntilIdle } from "../test/manualRafScheduler.js";
import { SPRING_SNAPPY } from "../tokens/springs.js";
import type { SpringSolverConfig } from "../core/spring-solver.js";

function SelectedHighlightTarget({
  className,
  onSettled,
  selected,
  springConfig,
}: {
  className?: string;
  onSettled?: () => void;
  selected: boolean;
  springConfig?: SpringSolverConfig;
}) {
  const highlight = useSelectedHighlight<HTMLDivElement>({
    className,
    onSettled,
    selected,
    springConfig,
  });
  return <div data-testid="selected-highlight-target" {...highlight} />;
}

function readProgress(element: HTMLElement): number {
  return Number(element.style.getPropertyValue("--spring-progress"));
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

describe("useSelectedHighlight", () => {
  it("applies custom className with the base variant class", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId } = render(
      <SelectedHighlightTarget selected={false} className="custom-highlight" />,
    );
    const target = getByTestId("selected-highlight-target");

    expect(target.className).toContain("bylgja-selected-highlight");
    expect(target.className).toContain("custom-highlight");
    expect(target.getAttribute("data-selected")).toBe("false");
  });

  it("passes a custom springConfig instead of the default", () => {
    const scheduler = new ManualRafScheduler();
    const createSpy = vi.spyOn(rafDriverModule, "createRafSpringDriver");
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    render(<SelectedHighlightTarget selected={false} springConfig={SPRING_SNAPPY} />);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining(SPRING_SNAPPY),
    );
  });

  it("transitions into and out of the selected state", () => {
    const scheduler = new ManualRafScheduler();
    const onSettled = vi.fn();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId, rerender } = render(
      <SelectedHighlightTarget selected={false} onSettled={onSettled} />,
    );
    const target = getByTestId("selected-highlight-target");

    expect(target.getAttribute("data-selected")).toBe("false");
    expect(readProgress(target)).toBeCloseTo(0, 12);

    rerender(<SelectedHighlightTarget selected onSettled={onSettled} />);

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
      scheduler.step(16);
    });

    expect(readProgress(target)).toBeGreaterThan(0);
    expect(target.getAttribute("data-selected")).toBe("true");

    let safety = advanceUntilIdle(scheduler);
    expect(safety).toBeLessThan(200);
    expect(readProgress(target)).toBeCloseTo(1, 2);

    rerender(<SelectedHighlightTarget selected={false} onSettled={onSettled} />);

    safety = advanceUntilIdle(scheduler);
    expect(safety).toBeLessThan(200);
    expect(readProgress(target)).toBeCloseTo(0, 2);
    expect(target.getAttribute("data-selected")).toBe("false");
    expect(onSettled).toHaveBeenCalledTimes(2);
  });

  it("jumps directly to the selected state when reduced motion is active", async () => {
    const scheduler = new ManualRafScheduler();
    const onSettled = vi.fn();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);
    stubReducedMotion(true);

    const { getByTestId, rerender } = render(
      <SelectedHighlightTarget selected={false} onSettled={onSettled} />,
    );
    const target = getByTestId("selected-highlight-target");

    await act(async () => {
      await Promise.resolve();
    });
    onSettled.mockClear();

    rerender(<SelectedHighlightTarget selected onSettled={onSettled} />);

    expect(readProgress(target)).toBeCloseTo(1, 12);
    expect(target.getAttribute("data-selected")).toBe("true");
    expect(scheduler.pendingCount()).toBe(0);

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});
