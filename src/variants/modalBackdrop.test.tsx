// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import * as rafDriverModule from "../core/raf-driver.js";
import { useModalBackdrop } from "./modalBackdrop.js";
import { ManualRafScheduler, advanceUntilIdle } from "../test/manualRafScheduler.js";
import type { SpringSolverConfig } from "../core/spring-solver.js";

function ModalBackdropTarget({
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
  const backdrop = useModalBackdrop({ className, show, onSettled, springConfig });
  return backdrop.render(<span data-testid="modal-backdrop-child" />);
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

describe("useModalBackdrop", () => {
  it("applies custom className and visible state by default", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId } = render(<ModalBackdropTarget show className="custom-backdrop" />);
    const wrapper = getByTestId("modal-backdrop-child").parentElement;

    expect(wrapper?.className).toContain("bylgja-modal-backdrop");
    expect(wrapper?.className).toContain("custom-backdrop");
    expect(wrapper?.getAttribute("data-state")).toBe("visible");
  });

  it("passes a custom springConfig to Presence", () => {
    const scheduler = new ManualRafScheduler();
    const springConfig = { stiffness: 123, damping: 17, mass: 2 };
    const createSpy = vi.spyOn(rafDriverModule, "createRafSpringDriver");
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    render(<ModalBackdropTarget show springConfig={springConfig} />);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining(springConfig),
    );
  });

  it("holds the backdrop in the DOM until the fade-out settles", () => {
    const scheduler = new ManualRafScheduler();
    const onSettled = vi.fn();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { queryByTestId, rerender } = render(<ModalBackdropTarget show onSettled={onSettled} />);

    rerender(<ModalBackdropTarget show={false} onSettled={onSettled} />);

    const wrapper = queryByTestId("modal-backdrop-child")?.parentElement;
    expect(wrapper?.className).toContain("bylgja-modal-backdrop");
    expect(wrapper?.getAttribute("data-state")).toBe("hidden");

    const safety = advanceUntilIdle(scheduler);
    expect(safety).toBeLessThan(200);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(queryByTestId("modal-backdrop-child")).toBeNull();
  });

  it("jumps directly to the exit state when reduced motion is active", async () => {
    const scheduler = new ManualRafScheduler();
    const onSettled = vi.fn();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);
    stubReducedMotion(true);

    const { queryByTestId, rerender } = render(<ModalBackdropTarget show onSettled={onSettled} />);

    await act(async () => {
      await Promise.resolve();
    });
    onSettled.mockClear();

    rerender(<ModalBackdropTarget show={false} onSettled={onSettled} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(scheduler.pendingCount()).toBe(0);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(queryByTestId("modal-backdrop-child")).toBeNull();
  });
});
