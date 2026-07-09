// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import * as rafDriverModule from "../core/raf-driver.js";
import { useFadeScale } from "./fadeScale.js";
import { ManualRafScheduler, advanceUntilIdle } from "../test/manualRafScheduler.js";
import type { SpringSolverConfig } from "../core/spring-solver.js";

function FadeScaleTarget({
  className,
  onSettled,
  show,
  springConfig,
}: {
  className?: string;
  onSettled?: () => void;
  show: boolean;
  springConfig?: SpringSolverConfig;
}) {
  const fadeScale = useFadeScale({ className, show, onSettled, springConfig });
  return fadeScale.render(<span data-testid="fade-scale-child">content</span>);
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

describe("useFadeScale", () => {
  it("applies custom className and visible state by default", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId } = render(<FadeScaleTarget show className="custom-fade-scale" />);
    const wrapper = getByTestId("fade-scale-child").parentElement;

    expect(wrapper?.className).toContain("bylgja-fade-scale");
    expect(wrapper?.className).toContain("custom-fade-scale");
    expect(wrapper?.getAttribute("data-state")).toBe("visible");
  });

  it("passes a custom springConfig to Presence", () => {
    const scheduler = new ManualRafScheduler();
    const springConfig = { stiffness: 123, damping: 17, mass: 2 };
    const createSpy = vi.spyOn(rafDriverModule, "createRafSpringDriver");
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    render(<FadeScaleTarget show springConfig={springConfig} />);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining(springConfig),
    );
  });

  it("animates opacity and scale through Presence and unmounts after settling", () => {
    const scheduler = new ManualRafScheduler();
    const onSettled = vi.fn();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId, queryByTestId, rerender } = render(
      <FadeScaleTarget show onSettled={onSettled} />,
    );

    expect(getByTestId("fade-scale-child").parentElement?.className).toContain(
      "bylgja-fade-scale",
    );

    rerender(<FadeScaleTarget show={false} onSettled={onSettled} />);

    const wrapper = queryByTestId("fade-scale-child")?.parentElement;
    expect(Number(wrapper?.style.getPropertyValue("--spring-progress"))).toBeCloseTo(1, 12);

    const safety = advanceUntilIdle(scheduler);
    expect(safety).toBeLessThan(200);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(queryByTestId("fade-scale-child")).toBeNull();
  });

  it("jumps directly to the exit state when reduced motion is active", async () => {
    const scheduler = new ManualRafScheduler();
    const onSettled = vi.fn();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);
    stubReducedMotion(true);

    const { queryByTestId, rerender } = render(<FadeScaleTarget show onSettled={onSettled} />);

    await act(async () => {
      await Promise.resolve();
    });
    onSettled.mockClear();

    rerender(<FadeScaleTarget show={false} onSettled={onSettled} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(scheduler.pendingCount()).toBe(0);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(queryByTestId("fade-scale-child")).toBeNull();
  });
});
