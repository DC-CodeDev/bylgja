// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { useTooltip, Tooltip, type UseTooltipOptions } from "./tooltip.js";

function TooltipHarness({ options = {} }: { options?: UseTooltipOptions }) {
  const tooltip = useTooltip(options);
  return <>
    <button data-testid="trigger" {...tooltip.triggerProps}>Save</button>
    <div data-testid="tooltip" {...tooltip.tooltipProps} className={tooltip.className} style={tooltip.tooltipStyle}>Save changes</div>
    <output data-testid="open">{String(tooltip.open)}</output>
  </>;
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return { bottom: top + height, height, left, right: left + width, top, width, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useTooltip", () => {
  it("starts closed, opens after the pointer delay, and links its ARIA description", () => {
    vi.useFakeTimers();
    const { getByTestId } = render(<TooltipHarness />);
    const trigger = getByTestId("trigger");
    const content = getByTestId("tooltip");

    expect(getByTestId("open").textContent).toBe("false");
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(499));
    expect(getByTestId("open").textContent).toBe("false");
    act(() => vi.advanceTimersByTime(1));
    expect(getByTestId("open").textContent).toBe("true");
    expect(trigger.getAttribute("aria-describedby")).toBe(content.id);
    expect(content.getAttribute("role")).toBe("tooltip");
  });

  it("cancels an opening pointer delay and ignores touch pointers", () => {
    vi.useFakeTimers();
    const { getByTestId } = render(<TooltipHarness />);
    const trigger = getByTestId("trigger");
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    fireEvent.pointerLeave(trigger, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(600));
    expect(getByTestId("open").textContent).toBe("false");
    fireEvent.pointerEnter(trigger, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(600));
    expect(getByTestId("open").textContent).toBe("false");
  });

  it("opens on focus and closes on blur, Escape, and disabled", () => {
    vi.useFakeTimers();
    const { getByTestId, rerender } = render(<TooltipHarness />);
    const trigger = getByTestId("trigger");
    fireEvent.focus(trigger);
    expect(getByTestId("open").textContent).toBe("true");
    fireEvent.blur(trigger);
    act(() => vi.advanceTimersByTime(80));
    expect(getByTestId("open").textContent).toBe("false");
    fireEvent.focus(trigger);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(getByTestId("open").textContent).toBe("false");
    rerender(<TooltipHarness options={{ disabled: true }} />);
    fireEvent.focus(getByTestId("trigger"));
    expect(getByTestId("open").textContent).toBe("false");
  });

  it("supports controlled and uncontrolled state changes", () => {
    vi.useFakeTimers();
    const changes: boolean[] = [];
    const { getByTestId, rerender } = render(<TooltipHarness options={{ open: false, onOpenChange: (value) => changes.push(value) }} />);
    fireEvent.focus(getByTestId("trigger"));
    expect(getByTestId("open").textContent).toBe("false");
    expect(changes).toEqual([true]);
    rerender(<TooltipHarness key="uncontrolled" options={{ defaultOpen: true }} />);
    expect(getByTestId("open").textContent).toBe("true");
  });

  it("calculates placement, flips, clamps, and responds to viewport events", () => {
    let callback: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (next: FrameRequestCallback) => { callback = next; return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperties(window, { innerHeight: { configurable: true, value: 200 }, innerWidth: { configurable: true, value: 300 } });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === "trigger" ? rect(100, 4, 40, 20) : rect(0, 0, 100, 30);
    });
    const { getByTestId } = render(<TooltipHarness options={{ defaultOpen: true, placement: "top" }} />);
    act(() => callback?.(0));
    const content = getByTestId("tooltip");
    expect(content.dataset.placement).toBe("bottom");
    expect(content.style.left).toBe("70px");
    expect(content.style.top).toBe("32px");
    fireEvent.scroll(window);
    act(() => callback?.(16));
  });

  it("cleans timers and window listeners under StrictMode", () => {
    vi.useFakeTimers();
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { getByTestId, unmount } = render(<StrictMode><TooltipHarness /></StrictMode>);
    fireEvent.pointerEnter(getByTestId("trigger"), { pointerType: "mouse" });
    unmount();
    act(() => vi.advanceTimersByTime(600));
    expect(remove.mock.calls.length).toBeGreaterThanOrEqual(add.mock.calls.filter(([name]) => name === "keydown").length);
  });
});

describe("Tooltip", () => {
  it("renders portal content and removes it after unmount", () => {
    const { getByRole, unmount } = render(<Tooltip content="Save changes" defaultOpen><button>Save</button></Tooltip>);
    expect(getByRole("tooltip").parentElement?.parentElement).toBe(document.body);
    unmount();
    expect(document.querySelector("[role='tooltip']")).toBeNull();
  });
});
