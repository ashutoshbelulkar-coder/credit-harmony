#!/usr/bin/env node
/**
 * Heuristic Fastify vs Spring /api/v1 route inventory diff.
 * Run from repo root: node scripts/route-parity-check.mjs
 *
 * Not a formal contract test — catches obvious drift when routes are added on one side only.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function fastifyRoutes() {
  const src = readFileSync(join(root, "server", "src", "index.ts"), "utf8");
  const extra = readFileSync(join(root, "server", "src", "ingestionDriftAlerts.ts"), "utf8");
  const re = /app\.(get|post|patch|put|delete)\(\s*["']([^"']+)["']/g;
  const out = new Map();
  for (const text of [src, extra]) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const method = m[1].toUpperCase();
      let path = m[2];
      if (!path.startsWith("/api/")) continue;
      if (!out.has(path)) out.set(path, new Set());
      out.get(path).add(method);
    }
  }
  return out;
}

function springRoutes() {
  const ctrlDir = join(root, "backend", "src", "main", "java", "com", "hcb", "platform", "controller");
  const files = readdirSync(ctrlDir).filter((f) => f.endsWith("Controller.java"));
  const routes = new Map();
  for (const file of files) {
    const text = readFileSync(join(ctrlDir, file), "utf8");
    const classMatch = text.match(/@RequestMapping\s*\(\s*(?:value\s*=\s*)?["']([^"']+)["']\s*\)/);
    if (!classMatch) continue;
    const base = classMatch[1].replace(/\/$/, "");
    const methodRe =
      /@(GetMapping|PostMapping|PatchMapping|PutMapping|DeleteMapping)\s*\(\s*(?:value\s*=\s*)?(?:\{[^}]*\}\s*,\s*)?(?:["']([^"']*)["'])?\s*\)/g;
    let mm;
    while ((mm = methodRe.exec(text)) !== null) {
      const kind = mm[1];
      const sub = mm[2] == null ? "" : mm[2];
      const method =
        kind === "GetMapping"
          ? "GET"
          : kind === "PostMapping"
            ? "POST"
            : kind === "PatchMapping"
              ? "PATCH"
              : kind === "PutMapping"
                ? "PUT"
                : "DELETE";
      const path = (base + (sub.startsWith("/") ? sub : "/" + sub)).replace(/\/+/g, "/");
      if (!path.startsWith("/api/")) continue;
      const normalized = path
        .replace(/\{[^}]+\}/g, ":param")
        .replace(/\/+$/, "") || path;
      if (!routes.has(normalized)) routes.set(normalized, new Set());
      routes.get(normalized).add(method);
    }
  }
  return routes;
}

function main() {
  const f = fastifyRoutes();
  const s = springRoutes();
  const fastPaths = new Set(f.keys());
  const springPaths = new Set(s.keys());

  const onlyFastify = [...fastPaths].filter((p) => !springPaths.has(p)).sort();
  const onlySpring = [...springPaths].filter((p) => !fastPaths.has(p)).sort();

  console.log("=== Paths in Fastify index + ingestionDriftAlerts but not matched in Spring controllers ===");
  if (onlyFastify.length === 0) console.log("(none)");
  else onlyFastify.forEach((p) => console.log("  ", p, [...f.get(p)].sort().join(",")));

  console.log("\n=== Paths in Spring controllers but not in Fastify scan ===");
  if (onlySpring.length === 0) console.log("(none)");
  else onlySpring.forEach((p) => console.log("  ", p, [...s.get(p)].sort().join(",")));

  const mismatched = [];
  for (const p of fastPaths) {
    if (!springPaths.has(p)) continue;
    const fm = f.get(p);
    const sm = s.get(p);
    const missingInSpring = [...fm].filter((m) => !sm.has(m));
    const extraInSpring = [...sm].filter((m) => !fm.has(m));
    if (missingInSpring.length || extraInSpring.length) {
      mismatched.push({ p, missingInSpring, extraInSpring });
    }
  }
  console.log("\n=== Same path, different HTTP methods (heuristic) ===");
  if (mismatched.length === 0) console.log("(none)");
  else {
    for (const { p, missingInSpring, extraInSpring } of mismatched.sort((a, b) => a.p.localeCompare(b.p))) {
      console.log("  ", p);
      if (missingInSpring.length) console.log("      Fastify-only methods:", missingInSpring.sort().join(", "));
      if (extraInSpring.length) console.log("      Spring-only methods:", extraInSpring.sort().join(", "));
    }
  }
}

main();
