# Legacy Fastify dev API (`server/`)

This directory is a **Node/Fastify** prototype used historically as the SPA’s default contract. **Product development now targets Spring Boot** in [`backend/`](../backend/); Vite proxies to port **8090** by default.

Use `npm run server` or `npm run server:legacy` only when you need to compare behaviour or run the remaining **Vitest** unit tests under `server/src/*.test.ts`. Do not treat in-memory Fastify state as durable storage.

For **which routes exist on Spring vs this server**, see [`docs/technical/Spring-SPA-Route-Inventory.md`](../docs/technical/Spring-SPA-Route-Inventory.md) and run **`npm run check:route-parity`** from the repo root (heuristic scan).
