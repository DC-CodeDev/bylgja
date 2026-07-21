import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

type BuildMode =
  | "pressable-inspect"
  | "pressable-min"
  | "all-min"
  | "fade-css-subpath-min";

const builds: Record<
  BuildMode,
  {
    entry: string;
    fileName: string;
    minify: boolean;
    outDir: string;
    sourcemap: boolean;
    resolveBylgjaBareOnly: boolean;
  }
> = {
  "pressable-inspect": {
    entry: "./src/pressable-only.tsx",
    fileName: "pressable-only.inspect.js",
    minify: false,
    outDir: "./out/pressable-inspect",
    sourcemap: true,
    resolveBylgjaBareOnly: false,
  },
  "pressable-min": {
    entry: "./src/pressable-only.tsx",
    fileName: "pressable-only.min.js",
    minify: true,
    outDir: "./out/pressable-min",
    sourcemap: false,
    resolveBylgjaBareOnly: false,
  },
  "all-min": {
    entry: "./src/all-exports.tsx",
    fileName: "all-exports.min.js",
    minify: true,
    outDir: "./out/all-min",
    sourcemap: false,
    resolveBylgjaBareOnly: false,
  },
  "fade-css-subpath-min": {
    entry: "./src/fade-css-subpath.ts",
    fileName: "fade-css-subpath.min.js",
    minify: true,
    outDir: "./out/fade-css-subpath-min",
    sourcemap: false,
    resolveBylgjaBareOnly: true,
  },
};

export default defineConfig(({ mode }) => {
  const buildMode = mode as BuildMode;
  const selectedBuild = builds[buildMode];

  if (!selectedBuild) {
    throw new Error(
      `Unsupported mode "${mode}". Expected one of: ${Object.keys(builds).join(", ")}`,
    );
  }

  return {
    root: fileURLToPath(new URL(".", import.meta.url)),
    plugins: [react()],
    resolve: {
      alias: selectedBuild.resolveBylgjaBareOnly
        ? [
            {
              find: /^bylgja$/,
              replacement: fileURLToPath(new URL("../dist/index.js", import.meta.url)),
            },
          ]
        : {
            bylgja: fileURLToPath(new URL("../dist/index.js", import.meta.url)),
          },
    },
    build: {
      emptyOutDir: true,
      lib: {
        entry: fileURLToPath(new URL(selectedBuild.entry, import.meta.url)),
        fileName: () => selectedBuild.fileName,
        formats: ["es"],
      },
      minify: selectedBuild.minify,
      outDir: selectedBuild.outDir,
      rollupOptions: {
        external: ["react", "react-dom", "react/jsx-runtime"],
      },
      sourcemap: selectedBuild.sourcemap,
    },
  };
});
