import { createRafSpringDriver, } from "./raf-driver.js";
import { stripUndefined } from "./object-utils.js";
import { SPRING_SNAPPY } from "../tokens/springs.js";
function applyFlipTransform(element, deltaX, deltaY, scaleX, scaleY, progress) {
    const remaining = 1 - progress;
    const translateX = deltaX * remaining;
    const translateY = deltaY * remaining;
    const renderedScaleX = 1 + (scaleX - 1) * remaining;
    const renderedScaleY = 1 + (scaleY - 1) * remaining;
    if (Math.abs(translateX) < 0.001 &&
        Math.abs(translateY) < 0.001 &&
        Math.abs(renderedScaleX - 1) < 0.001 &&
        Math.abs(renderedScaleY - 1) < 0.001) {
        element.style.transform = "none";
        return;
    }
    element.style.transform =
        `translate(${translateX}px, ${translateY}px) ` +
            `scale(${renderedScaleX}, ${renderedScaleY})`;
}
function resetFlipInlineStyles(element) {
    element.style.transform = "none";
    element.style.transition = "";
    element.style.transformOrigin = "";
    element.style.willChange = "";
}
export function startFlipInvert(element, from, to, options) {
    const deltaX = from.x - to.x;
    const deltaY = from.y - to.y;
    const scaleX = to.width === 0 ? 1 : from.width / to.width;
    const scaleY = to.height === 0 ? 1 : from.height / to.height;
    const amplitude = options?.amplitude ?? 1;
    const delay = options?.delay ?? 0;
    const effectiveDeltaX = deltaX * amplitude;
    const effectiveDeltaY = deltaY * amplitude;
    element.style.transition = "none";
    element.style.transformOrigin = "top left";
    element.style.willChange = "transform";
    applyFlipTransform(element, deltaX, deltaY, scaleX, scaleY, 0);
    void element.offsetHeight;
    const driver = createRafSpringDriver(stripUndefined({
        initialValue: 0,
        startDelay: delay,
        targetValue: 1,
        ...SPRING_SNAPPY,
    }));
    const unsubscribe = driver.subscribe((snapshot) => {
        const progress = snapshot.settled ? snapshot.target : snapshot.value;
        applyFlipTransform(element, effectiveDeltaX, effectiveDeltaY, scaleX, scaleY, progress);
        if (snapshot.settled) {
            resetFlipInlineStyles(element);
            options?.onSettled?.();
        }
    });
    driver.start();
    return {
        driver,
        unsubscribe,
    };
}
//# sourceMappingURL=flip-invert.js.map