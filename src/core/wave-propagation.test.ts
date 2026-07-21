import { describe, expect, it } from "vitest";
import { createWavePropagation } from "./wave-propagation.js";
import type { PropagationElement, PropagationOrigin } from "./wave-propagation.js";

const ORIGIN: PropagationOrigin = { x: 0, y: 0 };

describe("createWavePropagation", () => {
  it("assigns maxAmplitude and zero delay to an element at the origin", () => {
    const elements: PropagationElement[] = [{ id: "a", x: 0, y: 0 }];
    const [result] = createWavePropagation(elements, ORIGIN);

    expect(result.id).toBe("a");
    expect(result.delay).toBe(0);
    expect(result.amplitude).toBe(1);
  });

  it("produces delays proportional to distance and amplitudes inversely proportional", () => {
    const elements: PropagationElement[] = [
      { id: "near", x: 100, y: 0 },
      { id: "mid", x: 200, y: 0 },
      { id: "far", x: 400, y: 0 },
    ];
    const results = createWavePropagation(elements, ORIGIN);
    const near = results[0];
    const mid = results[1];
    const far = results[2];

    expect(near.delay).toBeLessThan(mid.delay);
    expect(mid.delay).toBeLessThan(far.delay);

    expect(near.amplitude).toBeGreaterThan(mid.amplitude);
    expect(mid.amplitude).toBeGreaterThan(far.amplitude);
  });

  it("assigns exactly minAmplitude to the farthest element", () => {
    const elements: PropagationElement[] = [
      { id: "close", x: 100, y: 0 },
      { id: "far", x: 400, y: 0 },
    ];
    const results = createWavePropagation(elements, ORIGIN);
    const far = results[1];

    expect(far.amplitude).toBeCloseTo(0.3, 12);
  });

  it("produces delays in seconds matching distance / propagationSpeed", () => {
    const elements: PropagationElement[] = [{ id: "a", x: 400, y: 0 }];
    const [result] = createWavePropagation(elements, ORIGIN);

    expect(result.delay).toBeCloseTo(400 / 800, 12);
  });

  it("uses euclidean distance for diagonal elements", () => {
    const elements: PropagationElement[] = [{ id: "a", x: 3, y: 4 }];
    const [result] = createWavePropagation(elements, ORIGIN);

    expect(result.delay).toBeCloseTo(5 / 800, 12);
  });

  it("assigns maxAmplitude and zero delay to all elements when all coincide with the origin", () => {
    const elements: PropagationElement[] = [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 0, y: 0 },
      { id: "c", x: 0, y: 0 },
    ];
    const results = createWavePropagation(elements, ORIGIN);

    for (const result of results) {
      expect(result.delay).toBe(0);
      expect(result.amplitude).toBe(1);
      expect(Number.isNaN(result.amplitude)).toBe(false);
      expect(Number.isNaN(result.delay)).toBe(false);
    }
  });

  it("assigns maxAmplitude to an element at the origin when other elements are farther away", () => {
    const elements: PropagationElement[] = [
      { id: "at-origin", x: 0, y: 0 },
      { id: "away", x: 300, y: 0 },
    ];
    const results = createWavePropagation(elements, ORIGIN);

    expect(results[0].amplitude).toBe(1);
    expect(results[0].delay).toBe(0);
  });

  it("preserves input order, length, and ids in the output", () => {
    const elements: PropagationElement[] = [
      { id: "z", x: 500, y: 0 },
      { id: "a", x: 10, y: 0 },
      { id: "m", x: 250, y: 0 },
    ];
    const results = createWavePropagation(elements, ORIGIN);

    expect(results).toHaveLength(3);
    expect(results[0].id).toBe("z");
    expect(results[1].id).toBe("a");
    expect(results[2].id).toBe("m");
  });

  it("throws when the elements array is empty", () => {
    expect(() => createWavePropagation([], ORIGIN)).toThrow(/at least one element/i);
  });

  it("throws when propagationSpeed is zero", () => {
    const elements: PropagationElement[] = [{ id: "a", x: 100, y: 0 }];
    expect(() =>
      createWavePropagation(elements, ORIGIN, { propagationSpeed: 0 }),
    ).toThrow(/propagationSpeed/i);
  });

  it("throws when propagationSpeed is negative", () => {
    const elements: PropagationElement[] = [{ id: "a", x: 100, y: 0 }];
    expect(() =>
      createWavePropagation(elements, ORIGIN, { propagationSpeed: -1 }),
    ).toThrow(/propagationSpeed/i);
  });

  it("throws when propagationSpeed is NaN", () => {
    const elements: PropagationElement[] = [{ id: "a", x: 100, y: 0 }];
    expect(() =>
      createWavePropagation(elements, ORIGIN, { propagationSpeed: Number.NaN }),
    ).toThrow(/propagationSpeed/i);
  });

  it("throws when propagationSpeed is Infinity", () => {
    const elements: PropagationElement[] = [{ id: "a", x: 100, y: 0 }];
    expect(() =>
      createWavePropagation(elements, ORIGIN, { propagationSpeed: Number.POSITIVE_INFINITY }),
    ).toThrow(/propagationSpeed/i);
  });

  it("throws when minAmplitude is greater than maxAmplitude", () => {
    const elements: PropagationElement[] = [{ id: "a", x: 100, y: 0 }];
    expect(() =>
      createWavePropagation(elements, ORIGIN, { minAmplitude: 0.8, maxAmplitude: 0.2 }),
    ).toThrow(/minAmplitude.*maxAmplitude|minAmplitude.*less than or equal/i);
  });

  it("throws when minAmplitude is non-finite", () => {
    const elements: PropagationElement[] = [{ id: "a", x: 100, y: 0 }];
    expect(() =>
      createWavePropagation(elements, ORIGIN, { minAmplitude: Number.NaN }),
    ).toThrow(/minAmplitude.*finite/i);
  });

  it("throws when maxAmplitude is non-finite", () => {
    const elements: PropagationElement[] = [{ id: "a", x: 100, y: 0 }];
    expect(() =>
      createWavePropagation(elements, ORIGIN, { maxAmplitude: Number.POSITIVE_INFINITY }),
    ).toThrow(/maxAmplitude.*finite/i);
  });

  it("respects a custom propagationSpeed", () => {
    const elements: PropagationElement[] = [{ id: "a", x: 200, y: 0 }];
    const [result] = createWavePropagation(elements, ORIGIN, { propagationSpeed: 400 });

    expect(result.delay).toBeCloseTo(200 / 400, 12);
  });

  it("respects custom minAmplitude and maxAmplitude", () => {
    const elements: PropagationElement[] = [
      { id: "close", x: 50, y: 0 },
      { id: "far", x: 200, y: 0 },
    ];
    const results = createWavePropagation(elements, ORIGIN, {
      minAmplitude: 0.5,
      maxAmplitude: 0.9,
    });
    const far = results[1];

    expect(far.amplitude).toBeCloseTo(0.5, 12);
  });
});
