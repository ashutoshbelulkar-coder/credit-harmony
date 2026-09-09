import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@hcb.com";
const ADMIN_PASSWORD = "Admin@1234";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.getByLabel("Email Address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hybrid Credit Bureau" })).toBeVisible({ timeout: 20_000 });
}

test.describe("Datasource Onboarding wizard", () => {
  test("opens the 3-step POC wizard from the Schema Mapper page", async ({ page }) => {
    await login(page);

    await page.goto("/data-governance/auto-mapping-review");
    await expect(page.getByRole("heading", { name: /Schema Registry|Auto-?Mapping/i })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Create New Mapping/i }).click();

    // Step 1 — Datasource Details (POC step 1).
    await expect(page.getByText("Datasource Details", { exact: false })).toBeVisible();
    await expect(page.getByText("Profile Generation", { exact: false })).toBeVisible();
    await expect(page.getByText("Profile Review", { exact: false })).toBeVisible();
  });

  test("Master Schema Management opens the new tree-based editor", async ({ page }) => {
    await login(page);

    await page.goto("/data-governance/master-schema");
    await expect(page.getByRole("heading", { name: /Master Schema|Master Schema Management/i })).toBeVisible({ timeout: 15_000 });

    // Open the create flow which should now render the new MasterModelEditorPage.
    await page.goto("/data-governance/master-schema/new");
    await expect(page.getByRole("heading", { name: /Create Master Data Model/i })).toBeVisible({ timeout: 15_000 });

    // Tree tab is the default and visible.
    await expect(page.getByRole("tab", { name: /Attributes/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /JSON View/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Approvals/i })).toBeVisible();
  });
});
