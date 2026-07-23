import { centerOutStagger, linearStagger, useStagger } from "../../src/index.js";
import "../../src/loops/oscillate.css";

const LOOP_PRESETS = [
  { name: "float", className: "bylgja-loop--float" },
  { name: "breathing", className: "bylgja-loop--breathing" },
  { name: "wiggle", className: "bylgja-loop--wiggle" },
  { name: "pulse", className: "bylgja-loop--pulse" },
  { name: "glow", className: "bylgja-loop--glow" },
  { name: "bounce", className: "bylgja-loop--bounce" },
] as const;

export function LoopPresetsView() {
  const dotBounceItems = useStagger({ count: 3 });
  const waveLoaderItems = useStagger({ count: 5, curve: centerOutStagger });
  const skeletonWaveItems = useStagger({ count: 4, curve: linearStagger });
  const rippleItems = useStagger({ count: 4, curve: linearStagger });

  return (
    <section className="loop-view" aria-label="Loop CSS presets">
      <div className="loop-grid">
        {LOOP_PRESETS.map((preset) => (
          <div key={preset.name} className="loop-card">
            <div className="loop-stage">
              <div className={`loop-swatch bylgja-loop ${preset.className}`} />
            </div>
            <p className="loop-label">{preset.name}</p>
          </div>
        ))}
        <div className="loop-card">
          <div className="loop-stage loop-stage--orbit">
            <div className="loop-orbit-center" />
            <div className="loop-orbit-dot bylgja-loop--orbit" />
          </div>
          <p className="loop-label">orbit</p>
        </div>
        <div className="loop-card">
          <div className="loop-stage">
            <div className="loop-skeleton bylgja-loop--skeleton-pulse" />
          </div>
          <p className="loop-label">skeleton-pulse</p>
        </div>
        <div className="loop-card">
          <div className="loop-stage">
            <div className="loop-dot-row">
              {dotBounceItems.map((item, index) => (
                <div
                  key={index}
                  className="bylgja-loop bylgja-loop--stagger-bounce bylgja-loop-shape--dot loop-dot"
                  style={item.style}
                />
              ))}
            </div>
          </div>
          <p className="loop-label">dot bounce</p>
        </div>
        <div className="loop-card">
          <div className="loop-stage">
            <div className="loop-bar-row">
              {waveLoaderItems.map((item, index) => (
                <div
                  key={index}
                  className="bylgja-loop bylgja-loop--stagger-bounce bylgja-loop-shape--bar loop-bar"
                  style={item.style}
                />
              ))}
            </div>
          </div>
          <p className="loop-label">wave loader</p>
        </div>
        <div className="loop-card loop-card--wide">
          <div className="loop-stage">
            <div className="loop-skeleton-wave">
              {skeletonWaveItems.map((item, index) => (
                <div
                  key={index}
                  className={`bylgja-loop--skeleton-wave loop-skeleton-line loop-skeleton-line--${index + 1}`}
                  style={item.style}
                />
              ))}
            </div>
          </div>
          <p className="loop-label">skeleton wave</p>
        </div>
        <div className="loop-card">
          <div className="loop-stage">
            <div className="loop-ripple-stage">
              {rippleItems.map((item, index) => (
                <div
                  key={index}
                  className="bylgja-loop--ripple loop-ripple-ring"
                  style={item.style}
                />
              ))}
            </div>
          </div>
          <p className="loop-label">ripple</p>
        </div>
      </div>
    </section>
  );
}
