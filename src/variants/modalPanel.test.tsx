// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import * as rafDriverModule from "../core/raf-driver.js";
import { useModalPanel } from "./modalPanel.js";
import { ManualRafScheduler, advanceUntilIdle } from "../test/manualRafScheduler.js";
import type { SpringSolverConfig } from "../core/spring-solver.js";

function ModalPanelTarget({
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
  const panel = useModalPanel({ className, show, onSettled, springConfig });
  return panel.render(<div data-testid="modal-panel-child">panel</div>);
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

describe("useModalPanel", () => {
  it("applies custom className and visible state by default", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId } = render(<ModalPanelTarget show className="custom-panel" />);
    const wrapper = getByTestId("modal-panel-child").parentElement;

    expect(wrapper?.className).toContain("bylgja-modal-panel");
    expect(wrapper?.className).toContain("custom-panel");
    expect(wrapper?.getAttribute("data-state")).toBe("visible");
  });

  it("passes a custom springConfig to Presence", () => {
    const scheduler = new ManualRafScheduler();
    const springConfig = { stiffness: 123, damping: 17, mass: 2 };
    const createSpy = vi.spyOn(rafDriverModule, "createRafSpringDriver");
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    render(<ModalPanelTarget show springConfig={springConfig} />);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining(springConfig),
    );
  });

  it("keeps the panel mounted until the exit animation settles", () => {
    const scheduler = new ManualRafScheduler();
    const onSettled = vi.fn();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { queryByTestId, rerender } = render(<ModalPanelTarget show onSettled={onSettled} />);

    rerender(<ModalPanelTarget show={false} onSettled={onSettled} />);

    const wrapper = queryByTestId("modal-panel-child")?.parentElement;
    expect(wrapper?.className).toContain("bylgja-modal-panel");
    expect(Number(wrapper?.style.getPropertyValue("--spring-progress"))).toBeCloseTo(1, 12);

    const safety = advanceUntilIdle(scheduler);
    expect(safety).toBeLessThan(200);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(queryByTestId("modal-panel-child")).toBeNull();
  });

  it("jumps directly to the exit state when reduced motion is active", async () => {
    const scheduler = new ManualRafScheduler();
    const onSettled = vi.fn();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);
    stubReducedMotion(true);

    const { queryByTestId, rerender } = render(<ModalPanelTarget show onSettled={onSettled} />);

    await act(async () => {
      await Promise.resolve();
    });
    onSettled.mockClear();

    rerender(<ModalPanelTarget show={false} onSettled={onSettled} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(scheduler.pendingCount()).toBe(0);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(queryByTestId("modal-panel-child")).toBeNull();
  });
});
