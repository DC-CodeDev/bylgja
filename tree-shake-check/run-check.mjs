import { readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configFile = path.join(__dirname, "vite.config.ts");
const outDir = path.join(__dirname, "out");

const builds = [
  {
    label: "pressable-min",
    mode: "pressable-min",
    outputFile: path.join(outDir, "pressable-min", "pressable-only.min.js"),
  },
  {
    label: "pressable-inspect",
    mode: "pressable-inspect",
    outputFile: path.join(outDir, "pressable-inspect", "pressable-only.inspect.js"),
  },
  {
    label: "all-min",
    mode: "all-min",
    outputFile: path.join(outDir, "all-min", "all-exports.min.js"),
  },
  {
    label: "fade-css-subpath-min",
    mode: "fade-css-subpath-min",
    outputFile: path.join(outDir, "fade-css-subpath-min", "fade-css-subpath.min.js"),
  },
];

const searchTerms = ["ModalPanel", "ModalBackdrop", "SelectedHighlight", "Tooltip"];

await rm(outDir, { force: true, recursive: true });

for (const currentBuild of builds) {
  await build({
    configFile,
    mode: currentBuild.mode,
    logLevel: "error",
  });
}

const sizeByLabel = new Map();

for (const currentBuild of builds) {
  const fileStats = await stat(currentBuild.outputFile);
  sizeByLabel.set(currentBuild.label, fileStats.size);
}

const inspectBundle = await readFile(builds[1].outputFile, "utf8");
const searchResults = Object.fromEntries(
  searchTerms.map((term) => [term, inspectBundle.includes(term)]),
);

const pressableSize = sizeByLabel.get("pressable-min");
const allExportsSize = sizeByLabel.get("all-min");
const fadeCssAssets = await readdir(path.join(outDir, "fade-css-subpath-min"));
const fadeCssFile = fadeCssAssets.find((entry) => entry.endsWith(".css"));
const fadeCssOutputFile = fadeCssFile
  ? path.join(outDir, "fade-css-subpath-min", fadeCssFile)
  : null;
const fadeCssOutput = fadeCssOutputFile
  ? await readFile(fadeCssOutputFile, "utf8")
  : null;

console.log("Tree-shake verification");
console.log(`pressable-only minified bytes: ${pressableSize}`);
console.log(`all-exports minified bytes: ${allExportsSize}`);
console.log(`difference bytes: ${allExportsSize - pressableSize}`);
console.log("text search in pressable-only inspect bundle:");

for (const term of searchTerms) {
  console.log(`- ${term}: ${searchResults[term] ? "FOUND" : "not found"}`);
}

console.log("fade css subpath build:");
console.log(`- emitted css file: ${fadeCssOutputFile ?? "not found"}`);
console.log(`- contains --bylgja-duration-quick: ${fadeCssOutput?.includes("--bylgja-duration-quick")}`);
console.log(`- contains --bylgja-ease-out: ${fadeCssOutput?.includes("--bylgja-ease-out")}`);

if (fadeCssOutput) {
  console.log("fade css output:");
  console.log(fadeCssOutput);
}
