import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));

const EXTENSIONS = ["", ".ts", ".tsx", ".mts", ".js"];

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = path.join(root, specifier.slice(2));
    for (const ext of EXTENSIONS) {
      const candidate = base + ext;
      if (existsSync(candidate) && !candidate.endsWith(path.sep)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
    const index = path.join(base, "index.ts");
    if (existsSync(index)) return nextResolve(pathToFileURL(index).href, context);
  }
  return nextResolve(specifier, context);
}
