import { cp, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const cssDirectories = [
  {
    sourceDirectory: new URL("../src/variants/", import.meta.url),
    outputDirectory: new URL("../dist/variants/", import.meta.url),
  },
  {
    sourceDirectory: new URL("../src/loops/", import.meta.url),
    outputDirectory: new URL("../dist/loops/", import.meta.url),
  },
  {
    sourceDirectory: new URL("../src/tokens/", import.meta.url),
    outputDirectory: new URL("../dist/tokens/", import.meta.url),
  },
];

for (const { sourceDirectory, outputDirectory } of cssDirectories) {
  await mkdir(outputDirectory, { recursive: true });

  for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".css")) {
      await cp(join(sourceDirectory.pathname, entry.name), join(outputDirectory.pathname, entry.name));
    }
  }
}
