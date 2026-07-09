import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import type { PublicVariantTypes } from "./publicTypes";
import "./styles.css";
import "bylgja/variants/fade.css";
import "bylgja/variants/fadeScale.css";
import "bylgja/variants/modalBackdrop.css";
import "bylgja/variants/modalPanel.css";
import "bylgja/variants/pressable.css";
import "bylgja/variants/selectedHighlight.css";

type _PublicVariantTypesSmoke = PublicVariantTypes;

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
