import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@hcb.com";
const ADMIN_PASSWORD = "Admin@1234";

test.describe("Critical flows (live Fastify API, no mock fallback)", () => {
  test("login, member institutions, approval queue, users, new report", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();

    await page.getByLabel("Email Address").fill(ADMIN_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Hybrid Credit Bureau" })).toBeVisible({ timeout: 20_000 });

    await page.goto("/institutions");
    await expect(page.getByRole("heading", { name: "Member Institutions" })).toBeVisible({ timeout: 15_000 });

    await page.goto("/approval-queue");
    await expect(page.getByRole("heading", { name: "Approval Queue" })).toBeVisible({ timeout: 15_000 });

    await page.goto("/user-management/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible({ timeout: 15_000 });

    await page.goto("/reporting/new");
    await expect(page.getByRole("heading", { name: "New Report Request" })).toBeVisible({ timeout: 15_000 });
  });
});
