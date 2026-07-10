import { cp, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const sourceDirectory = new URL("../src/variants/", import.meta.url);
const outputDirectory = new URL("../dist/variants/", import.meta.url);

await mkdir(outputDirectory, { recursive: true });

for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".css")) {
    await cp(join(sourceDirectory.pathname, entry.name), join(outputDirectory.pathname, entry.name));
  }
}
