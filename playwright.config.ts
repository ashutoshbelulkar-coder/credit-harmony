import { defineConfig } from "@playwright/test";

/**
 * E2E against real Fastify API + Vite (no mock fallback).
 * Requires: npm install && npx playwright install chromium
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm run server:start",
      url: "http://127.0.0.1:8091/api/v1/health",
      reuseExistingServer: !process.env.CI,
      timeout: 90_000,
    },
    {
      command: "npm run dev:e2e",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_USE_MOCK_FALLBACK: "false",
      },
    },
  ],
});
