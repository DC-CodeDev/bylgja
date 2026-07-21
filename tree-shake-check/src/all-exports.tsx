import { createElement } from "react";
import {
  Presence,
  SPRING_GENTLE,
  SPRING_SNAPPY,
  useFade,
  useFadeScale,
  useModalBackdrop,
  useModalPanel,
  usePressable,
  useSelectedHighlight,
  useSpring,
  useTooltip,
} from "bylgja";

export function AllExportsExample() {
  const springRef = useSpring<HTMLDivElement>(1, SPRING_GENTLE, 0);
  const fade = useFade({ show: true });
  const fadeScale = useFadeScale({ show: true });
  const modalBackdrop = useModalBackdrop({ show: true });
  const modalPanel = useModalPanel({ show: true, springConfig: SPRING_SNAPPY });
  const pressable = usePressable<HTMLButtonElement>({ springConfig: SPRING_SNAPPY });
  const selectedHighlight = useSelectedHighlight<HTMLDivElement>({ selected: true });
  const tooltip = useTooltip<HTMLButtonElement>({ defaultOpen: true });

  return createElement(
    "section",
    null,
    createElement("div", { ref: springRef }, "spring"),
    fade.render("fade"),
    fadeScale.render("fade-scale"),
    modalBackdrop.render(),
    modalPanel.render("modal-panel"),
    createElement(
      "button",
      {
        ...pressable,
        type: "button",
      },
      "pressable",
    ),
    createElement(
      "button",
      {
        ...tooltip.triggerProps,
        type: "button",
      },
      "tooltip-trigger",
    ),
    tooltip.mounted
      ? createElement(
          "div",
          {
            ...tooltip.tooltipProps,
            style: tooltip.tooltipStyle,
          },
          "tooltip",
        )
      : null,
    createElement("div", selectedHighlight, "selected-highlight"),
    createElement(
      Presence,
      {
        show: true,
        exitConfig: SPRING_GENTLE,
      },
      "presence",
    ),
  );
}
