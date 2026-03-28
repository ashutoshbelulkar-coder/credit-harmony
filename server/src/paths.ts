import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Repository root (credit-harmony/). */
export const REPO_ROOT = join(__dirname, "..", "..");

export function dataPath(...segments: string[]) {
  return join(REPO_ROOT, "src", "data", ...segments);
}
