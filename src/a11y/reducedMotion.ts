import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type MediaQueryListWithOptionalLegacy = MediaQueryList & {
  addListener?: ((listener: (event: MediaQueryListEvent) => void) => void) | undefined;
  removeListener?: ((listener: (event: MediaQueryListEvent) => void) => void) | undefined;
};

function getReducedMotionMediaQueryList(): MediaQueryListWithOptionalLegacy | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }

  return window.matchMedia(REDUCED_MOTION_QUERY) as MediaQueryListWithOptionalLegacy;
}

export function getReducedMotionPreference(): boolean {
  return getReducedMotionMediaQueryList()?.matches ?? false;
}

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getReducedMotionPreference);

  useEffect(() => {
    const mediaQueryList = getReducedMotionMediaQueryList();
    if (!mediaQueryList) {
      setPrefersReducedMotion(false);
      return;
    }

    setPrefersReducedMotion(mediaQueryList.matches);

    const handleChange = (event: MediaQueryListEvent): void => {
      setPrefersReducedMotion(event.matches);
    };

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", handleChange);
      return () => {
        mediaQueryList.removeEventListener("change", handleChange);
      };
    }

    mediaQueryList.addListener?.(handleChange);
    return () => {
      mediaQueryList.removeListener?.(handleChange);
    };
  }, []);

  return prefersReducedMotion;
}
