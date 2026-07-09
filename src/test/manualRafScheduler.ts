import { act } from "@testing-library/react";

export class ManualRafScheduler {
  private now = 0;
  private nextHandle = 1;
  private readonly pending = new Map<number, FrameRequestCallback>();

  requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const handle = this.nextHandle;
    this.nextHandle += 1;
    this.pending.set(handle, callback);
    return handle;
  };

  cancelAnimationFrame = (handle: number): void => {
    this.pending.delete(handle);
  };

  step(deltaMilliseconds: number): void {
    this.now += deltaMilliseconds;
    const callbacks = [...this.pending.entries()].sort(([left], [right]) => left - right);
    this.pending.clear();

    for (const [, callback] of callbacks) {
      callback(this.now);
    }
  }

  pendingCount(): number {
    return this.pending.size;
  }
}

export function advanceUntilIdle(
  scheduler: ManualRafScheduler,
  maxSteps = 200,
  deltaMilliseconds = 16,
): number {
  let safety = 0;
  while (scheduler.pendingCount() > 0 && safety < maxSteps) {
    act(() => {
      scheduler.step(deltaMilliseconds);
    });
    safety += 1;
  }

  return safety;
}
