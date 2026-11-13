// Registers the "@/…" -> project-root resolver so the TypeScript sources can be
// imported by plain `node` (type stripping) without a bundler. See alias-hooks.mjs.
import { register } from "node:module";

register("./alias-hooks.mjs", import.meta.url);
