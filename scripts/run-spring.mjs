/**
 * Run Maven against backend/pom.xml using a repo-local Maven under .tools/ if present,
 * so `npm run spring:start` works when `mvn` is not on PATH (Windows-friendly).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const toolsDir = path.join(root, ".tools");

function findLocalMvn() {
  if (!fs.existsSync(toolsDir)) return null;
  const dirs = fs
    .readdirSync(toolsDir)
    .filter((d) => d.startsWith("apache-maven-"))
    .sort();
  const latest = dirs[dirs.length - 1];
  if (!latest) return null;
  const mvnBin = path.join(toolsDir, latest, "bin", process.platform === "win32" ? "mvn.cmd" : "mvn");
  return fs.existsSync(mvnBin) ? mvnBin : null;
}

const mode = process.argv[2] === "test" ? "test" : "start";
const mvnArgs =
  mode === "test"
    ? ["-q", "-f", "backend/pom.xml", "test"]
    : ["-q", "-f", "backend/pom.xml", "spring-boot:run"];

const local = findLocalMvn();
const command = local ?? "mvn";

const child = spawn(command, mvnArgs, {
  cwd: root,
  stdio: "inherit",
  // Windows: needed for .cmd and for `mvn` on PATH
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 0));
