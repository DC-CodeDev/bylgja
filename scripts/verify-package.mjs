import { access, readFile } from "node:fs/promises";
import assert from "node:assert/strict";

import * as bylgja from "bylgja";

for (const name of ["Tooltip", "useTooltip"]) {
  assert.ok(name in bylgja, `Missing runtime export: ${name}`);
}

const cssUrl = import.meta.resolve("bylgja/variants/tooltip.css");
await access(new URL(cssUrl));
const timingCssUrl = import.meta.resolve("bylgja/tokens/timing.css");
await access(new URL(timingCssUrl));

const declarations = await readFile(new URL("../dist/index.d.ts", import.meta.url), "utf8");
for (const name of ["Tooltip", "useTooltip", "TooltipPlacement", "UseTooltipOptions"]) {
  assert.match(declarations, new RegExp(`\\b${name}\\b`), `Missing type declaration: ${name}`);
}

console.log("Package exports OK");
