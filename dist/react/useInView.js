import { useEffect, useRef, useState } from "react";
export function useInView(options) {
    const threshold = options?.threshold ?? 0.25;
    const once = options?.once ?? true;
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry?.isIntersecting) {
                setInView(true);
                if (once)
                    observer.disconnect();
            }
            else if (!once) {
                setInView(false);
            }
        }, { threshold });
        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold, once]);
    return [ref, inView];
}
//# sourceMappingURL=useInView.js.map