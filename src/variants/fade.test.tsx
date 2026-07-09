// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useFade } from "./fade.js";
import { ManualRafScheduler, advanceUntilIdle } from "../test/manualRafScheduler.js";

function FadeTarget({
  show,
  strategy = "presence",
  onSettled,
}: {
  onSettled?: () => void;
  show: boolean;
  strategy?: "presence" | "tween";
}) {
  const fade = useFade({ show, strategy, onSettled });
  return fade.render(<span data-testid="fade-child">content</span>);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useFade", () => {
  it("keeps the child mounted until the Presence-backed fade settles", () => {
    const scheduler = new ManualRafScheduler();
    const onSettled = vi.fn();
    vi.stubGlobal("requestAnimationFrame", scheduler.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", scheduler.cancelAnimationFrame);

    const { queryByTestId, rerender } = render(<FadeTarget show onSettled={onSettled} />);

    rerender(<FadeTarget show={false} onSettled={onSettled} />);

    const wrapper = queryByTestId("fade-child")?.parentElement;
    expect(wrapper?.className).toContain("bylgja-fade--spring");
    expect(wrapper?.getAttribute("data-state")).toBe("hidden");

    const safety = advanceUntilIdle(scheduler);
    expect(safety).toBeLessThan(200);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(queryByTestId("fade-child")).toBeNull();
  });

  it("can run as a pure tween wrapper without Presence", () => {
    const { getByTestId, rerender } = render(<FadeTarget show strategy="tween" />);

    const wrapper = getByTestId("fade-child").parentElement;
    expect(wrapper?.className).toContain("bylgja-fade--tween");
    expect(wrapper?.getAttribute("data-state")).toBe("visible");

    rerender(<FadeTarget show={false} strategy="tween" />);

    expect(getByTestId("fade-child").parentElement?.getAttribute("data-state")).toBe("hidden");
  });
});
