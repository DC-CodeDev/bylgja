// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import * as rafDriverModule from "../../core/raf-driver.js";
import { useModalPanel } from "../../variants/modalPanel.js";
import { usePressable } from "../../variants/pressable.js";
import { ManualRafScheduler } from "../manualRafScheduler.js";
import type { RafSpringDriver } from "../../core/raf-driver.js";

function NestedMotionTarget({ open }: { open: boolean }) {
  const panel = useModalPanel({ show: open });
  const pressable = usePressable<HTMLButtonElement>();

  return panel.render(
    <button data-testid="nested-pressable" type="button" {...pressable}>
      nested
    </button>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("nested motion integration", () => {
  it("does not leak active drivers when pressable is nested inside modalPanel under StrictMode", () => {
    const scheduler = new ManualRafScheduler();
    const originalCreate = rafDriverModule.createRafSpringDriver;
    const createdDrivers: RafSpringDriver[] = [];
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);
    vi.spyOn(rafDriverModule, "createRafSpringDriver").mockImplementation((options, customScheduler) => {
      const driver = originalCreate(options, customScheduler);
      createdDrivers.push(driver);
      return driver;
    });

    const { getByTestId, rerender, unmount } = render(
      <StrictMode>
        <NestedMotionTarget open />
      </StrictMode>,
    );
    const button = getByTestId("nested-pressable");
    button.setPointerCapture = vi.fn();

    fireEvent.pointerDown(button, { pointerId: 3 });

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
    });

    expect(button.setPointerCapture).toHaveBeenCalledWith(3);
    expect(scheduler.pendingCount()).toBeGreaterThan(0);

    rerender(
      <StrictMode>
        <NestedMotionTarget open={false} />
      </StrictMode>,
    );

    act(() => {
      scheduler.step(16);
    });

    unmount();

    expect(scheduler.pendingCount()).toBe(0);
    expect(createdDrivers.every((driver) => !driver.isRunning())).toBe(true);
  });
});
