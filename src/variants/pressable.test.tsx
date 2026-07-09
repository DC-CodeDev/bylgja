// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { usePressable } from "./pressable.js";
import { ManualRafScheduler, advanceUntilIdle } from "../test/manualRafScheduler.js";

function PressableTarget({ onSettled }: { onSettled?: () => void }) {
  const pressable = usePressable<HTMLButtonElement>({ onSettled });
  return (
    <button data-testid="pressable-target" type="button" {...pressable}>
      press
    </button>
  );
}

function readProgress(element: HTMLElement): number {
  return Number(element.style.getPropertyValue("--spring-progress"));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("usePressable", () => {
  it("activates the pressed spring on pointerdown", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId } = render(<PressableTarget />);
    const button = getByTestId("pressable-target");
    button.setPointerCapture = vi.fn();

    fireEvent.pointerDown(button, { pointerId: 7 });

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
      scheduler.step(16);
    });

    expect(button.setPointerCapture).toHaveBeenCalledWith(7);
    expect(readProgress(button)).toBeGreaterThan(0);
  });

  it("returns to rest on pointerup over the element", () => {
    const scheduler = new ManualRafScheduler();
    const onSettled = vi.fn();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId } = render(<PressableTarget onSettled={onSettled} />);
    const button = getByTestId("pressable-target");
    button.setPointerCapture = vi.fn();

    fireEvent.pointerDown(button, { pointerId: 3 });

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
      scheduler.step(16);
    });

    expect(readProgress(button)).toBeGreaterThan(0);

    fireEvent.pointerUp(button, { pointerId: 3 });

    const safety = advanceUntilIdle(scheduler);
    expect(safety).toBeLessThan(200);
    expect(readProgress(button)).toBeCloseTo(0, 2);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("stays pressed after leaving and reentering until pointerup arrives", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId } = render(<PressableTarget />);
    const button = getByTestId("pressable-target");
    button.setPointerCapture = vi.fn();

    fireEvent.pointerDown(button, { pointerId: 5 });

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
    });

    const pressedProgress = readProgress(button);
    expect(pressedProgress).toBeGreaterThan(0);

    fireEvent.pointerLeave(button, { pointerId: 5 });

    act(() => {
      scheduler.step(16);
    });

    expect(readProgress(button)).toBeGreaterThan(0);

    fireEvent.pointerEnter(button, { pointerId: 5 });

    act(() => {
      scheduler.step(16);
    });

    expect(readProgress(button)).toBeGreaterThan(0);

    fireEvent.pointerUp(button, { pointerId: 5 });

    const safety = advanceUntilIdle(scheduler);
    expect(safety).toBeLessThan(200);
    expect(readProgress(button)).toBeCloseTo(0, 2);
  });

  it("releases on pointercancel", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId } = render(<PressableTarget />);
    const button = getByTestId("pressable-target");
    button.setPointerCapture = vi.fn();

    fireEvent.pointerDown(button, { pointerId: 11 });

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
    });

    expect(readProgress(button)).toBeGreaterThan(0);

    fireEvent.pointerCancel(button, { pointerId: 11 });

    const safety = advanceUntilIdle(scheduler);
    expect(safety).toBeLessThan(200);
    expect(readProgress(button)).toBeCloseTo(0, 2);
  });

  it("releases on window mouseup after leaving the element", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { getByTestId } = render(<PressableTarget />);
    const button = getByTestId("pressable-target");

    fireEvent.mouseDown(button);

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
    });

    expect(readProgress(button)).toBeGreaterThan(0);

    fireEvent.mouseLeave(button, { buttons: 1 });

    act(() => {
      scheduler.step(16);
    });

    expect(readProgress(button)).toBeGreaterThan(0);

    fireEvent(
      window,
      new MouseEvent("mouseup", {
        bubbles: true,
      }),
    );

    const safety = advanceUntilIdle(scheduler);
    expect(safety).toBeLessThan(200);
    expect(readProgress(button)).toBeCloseTo(0, 2);
  });

  it("removes the window mouseup listener if unmounted while pressed", () => {
    const scheduler = new ManualRafScheduler();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { getByTestId, unmount } = render(<PressableTarget />);
    const button = getByTestId("pressable-target");

    fireEvent.mouseDown(button);

    act(() => {
      scheduler.step(0);
      scheduler.step(16);
    });

    expect(readProgress(button)).toBeGreaterThan(0);
    expect(addEventListenerSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));
  });
});
