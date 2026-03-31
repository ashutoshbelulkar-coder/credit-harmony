import { defineConfig } from "@playwright/test";

/**
 * E2E against Spring Boot API (8090) + Vite on 4173 (no mock fallback).
 * Requires: Maven on PATH (`mvn`), npm install, npx playwright install chromium
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
      command: "npm run spring:start",
      url: "http://127.0.0.1:8090/api/v1/health",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: "npm run dev:e2e",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_USE_MOCK_FALLBACK: "false",
        VITE_API_PROXY_TARGET: "http://127.0.0.1:8090",
      },
    },
  ],
});
