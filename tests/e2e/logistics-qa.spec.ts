import { test, expect, Page } from "@playwright/test";

async function loginAs(page: Page, phone: string, password: string) {
  await page.goto("/auth/login");
  await page.locator('input[type="tel"], input[name="phone"]').first().fill(phone);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 }).catch(() => {});
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push("PAGEERROR: " + err.message));
  return errors;
}

test.describe("Logistics portal", () => {
  test("dashboard loads, sidebar, logo link", async ({ page }) => {
    const errors = collectErrors(page);
    await loginAs(page, "0244000020", "password123");
    await page.goto("/logistics/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "tests/screenshots/logistics-dashboard-full.png", fullPage: true });
    expect(page.url()).toContain("/logistics/dashboard");
    console.log("DASHBOARD ERRORS:", errors);

    // Logo link
    const logo = page.locator('a:has-text("Lorgric")').first();
    if (await logo.count() > 0) {
      await logo.click();
      await page.waitForTimeout(800);
      console.log("Logo click landed on:", page.url());
    }
  });

  test("sidebar collapse toggle", async ({ page }) => {
    await loginAs(page, "0244000020", "password123");
    await page.goto("/logistics/dashboard");
    await page.waitForTimeout(1000);
    const collapseBtn = page.locator('button[aria-label*="ollapse" i], button[aria-label*="xpand" i]').first();
    const found = await collapseBtn.count();
    console.log("Collapse button found:", found);
    if (found > 0) {
      await collapseBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: "tests/screenshots/logistics-sidebar-collapsed.png" });
      await collapseBtn.click();
      await page.waitForTimeout(400);
    }
  });

  test("requests page: timing + accept/reject flow", async ({ page }) => {
    const errors = collectErrors(page);
    await loginAs(page, "0244000020", "password123");
    const start = Date.now();
    await page.goto("/logistics/requests");
    try {
      await page.waitForLoadState("networkidle", { timeout: 15000 });
      console.log(`requests page reached networkidle in ${Date.now() - start}ms`);
    } catch {
      console.log(`requests page did NOT reach networkidle within 15s (took full timeout). Console errors so far:`, errors);
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "tests/screenshots/logistics-requests-full.png", fullPage: true });

    const pendingCards = page.locator("text=/PENDING/");
    const pendingCount = await pendingCards.count();
    console.log("Pending request cards visible:", pendingCount);

    const acceptBtn = page.locator('button:has-text("Accept")').first();
    if (await acceptBtn.count() > 0) {
      await acceptBtn.click();
      await page.waitForTimeout(500);
      // Accept dialog should appear with a date field
      const dialogVisible = await page.locator('[role="dialog"], input[type="date"]').count();
      console.log("Accept dialog/date input visible after clicking Accept:", dialogVisible);
      await page.screenshot({ path: "tests/screenshots/logistics-accept-dialog.png" });
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Accept")').last();
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: "tests/screenshots/logistics-after-accept.png", fullPage: true });
      }
    } else {
      console.log("No PENDING request with an Accept button found — nothing to accept.");
    }
    console.log("REQUESTS PAGE ERRORS:", errors);
  });

  test("deliveries page: map + handoff dialog", async ({ page }) => {
    const errors = collectErrors(page);
    await loginAs(page, "0244000020", "password123");
    await page.goto("/logistics/deliveries");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/screenshots/logistics-deliveries-full.png", fullPage: true });

    const mapEl = await page.locator(".leaflet-container").count();
    console.log("Leaflet map containers on deliveries page:", mapEl);

    const handoffBtn = page.locator('button:has-text("Hand off")').first();
    if (await handoffBtn.count() > 0) {
      await handoffBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: "tests/screenshots/logistics-handoff-dialog.png" });
      const riderOptions = await page.locator('[role="dialog"] button').count();
      console.log("Rider option buttons in handoff dialog:", riderOptions);
      // Try selecting first rider option and confirming
      const riderBtn = page.locator('[role="dialog"] button').filter({ hasText: /./ }).nth(0);
      if (await riderBtn.count() > 0) {
        await riderBtn.click().catch(() => {});
        await page.waitForTimeout(300);
        const confirmHandoff = page.locator('button:has-text("Confirm hand-off")');
        if (await confirmHandoff.count() > 0) {
          await confirmHandoff.click();
          await page.waitForTimeout(1500);
          await page.screenshot({ path: "tests/screenshots/logistics-after-handoff.png", fullPage: true });
        }
      }
    } else {
      console.log("No 'Hand off' button found — no active delivery to hand off.");
    }
    console.log("DELIVERIES PAGE ERRORS:", errors);
  });

  test("complaints page reachable", async ({ page }) => {
    const errors = collectErrors(page);
    await loginAs(page, "0244000020", "password123");
    await page.goto("/logistics/complaints");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "tests/screenshots/logistics-complaints.png", fullPage: true });
    console.log("COMPLAINTS URL:", page.url(), "ERRORS:", errors);
  });

  test("logistics/profile route check", async ({ page }) => {
    await loginAs(page, "0244000020", "password123");
    await page.goto("/logistics/profile");
    await page.waitForTimeout(1000);
    console.log("Navigated to /logistics/profile -> final URL:", page.url(), "status text on page:", await page.locator("body").innerText().then(t => t.slice(0, 200)).catch(() => "N/A"));
  });
});
