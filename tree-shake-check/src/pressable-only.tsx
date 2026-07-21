import { createElement } from "react";
import { usePressable } from "bylgja";

export function PressableOnlyExample() {
  const pressable = usePressable<HTMLButtonElement>();

  return createElement(
    "button",
    {
      ...pressable,
      type: "button",
    },
    "Pressable only",
  );
}
