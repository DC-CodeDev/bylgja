export interface PropagationElement {
  id: string;
  x: number;
  y: number;
}

export interface PropagationOrigin {
  x: number;
  y: number;
}

export interface WavePropagationConfig {
  propagationSpeed?: number;
  minAmplitude?: number;
  maxAmplitude?: number;
}

export interface PropagationResult {
  id: string;
  delay: number;
  amplitude: number;
}

const DEFAULT_PROPAGATION_SPEED = 800;
const DEFAULT_MIN_AMPLITUDE = 0.3;
const DEFAULT_MAX_AMPLITUDE = 1;

const NEAR_ZERO = 1e-10;

export function createWavePropagation(
  elements: PropagationElement[],
  origin: PropagationOrigin,
  config?: WavePropagationConfig,
): PropagationResult[] {
  if (elements.length === 0) {
    throw new Error(
      "createWavePropagation requires at least one element to compute propagation.",
    );
  }

  const propagationSpeed = config?.propagationSpeed ?? DEFAULT_PROPAGATION_SPEED;
  const minAmplitude = config?.minAmplitude ?? DEFAULT_MIN_AMPLITUDE;
  const maxAmplitude = config?.maxAmplitude ?? DEFAULT_MAX_AMPLITUDE;

  if (config?.propagationSpeed !== undefined) {
    if (!Number.isFinite(propagationSpeed) || propagationSpeed <= 0) {
      throw new Error(
        "createWavePropagation requires propagationSpeed to be a finite number greater than zero.",
      );
    }
  }

  if (config?.minAmplitude !== undefined || config?.maxAmplitude !== undefined) {
    if (!Number.isFinite(minAmplitude)) {
      throw new Error("createWavePropagation requires minAmplitude to be finite.");
    }
    if (!Number.isFinite(maxAmplitude)) {
      throw new Error("createWavePropagation requires maxAmplitude to be finite.");
    }
    if (minAmplitude > maxAmplitude) {
      throw new Error(
        "createWavePropagation requires minAmplitude to be less than or equal to maxAmplitude.",
      );
    }
  }

  const distances = elements.map((el) => {
    const dx = el.x - origin.x;
    const dy = el.y - origin.y;
    return Math.sqrt(dx * dx + dy * dy);
  });

  const maxDist = Math.max(...distances);

  if (maxDist === 0) {
    return elements.map((el) => ({ id: el.id, delay: 0, amplitude: maxAmplitude }));
  }

  return elements.map((el, i) => {
    const dist = distances[i];
    const delay = dist / propagationSpeed;

    let amplitude: number;
    if (dist < NEAR_ZERO) {
      amplitude = maxAmplitude;
    } else {
      const normDist = dist / maxDist;
      amplitude = maxAmplitude - (maxAmplitude - minAmplitude) * Math.sqrt(normDist);
    }

    return { id: el.id, delay, amplitude };
  });
}
