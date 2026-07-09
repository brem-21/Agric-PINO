import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Lorgric/i);
});

test("login page is accessible", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});
