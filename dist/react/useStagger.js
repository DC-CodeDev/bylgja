const STAGGER_FACTOR_PROPERTY = "--bylgja-stagger-factor";
const DEFAULT_STAGGER_DELAY = 0.12;
export function linearStagger(index, count) {
    if (count <= 1) {
        return 0;
    }
    return index / (count - 1);
}
export function centerOutStagger(index, count) {
    if (count <= 1) {
        return 0;
    }
    const center = (count - 1) / 2;
    const distanceFromCenter = Math.abs(index - center);
    const maxDistance = center;
    if (maxDistance === 0) {
        return 0;
    }
    return distanceFromCenter / maxDistance;
}
export function useStagger(options) {
    const { count, curve = linearStagger, staggerDelay = DEFAULT_STAGGER_DELAY, } = options;
    validateCount(count);
    validateStaggerDelay(staggerDelay);
    const bindings = [];
    for (let index = 0; index < count; index += 1) {
        const factor = curve(index, count);
        validateFactor(factor, index, count);
        bindings.push({
            style: {
                [STAGGER_FACTOR_PROPERTY]: String(factor),
            },
        });
    }
    return bindings;
}
function validateCount(count) {
    if (!Number.isInteger(count) || count < 0) {
        throw new Error("useStagger requires count to be a non-negative integer.");
    }
}
function validateStaggerDelay(staggerDelay) {
    if (!Number.isFinite(staggerDelay) || staggerDelay < 0) {
        throw new Error("useStagger requires staggerDelay to be a finite number greater than or equal to zero.");
    }
}
function validateFactor(factor, index, count) {
    if (!Number.isFinite(factor)) {
        throw new Error(`useStagger curve returned a non-finite factor for index ${index} of ${count}.`);
    }
    if (factor < 0 || factor > 1) {
        throw new Error(`useStagger curve must return a normalized factor between 0 and 1. Received ${factor} for index ${index} of ${count}.`);
    }
}
//# sourceMappingURL=useStagger.js.map