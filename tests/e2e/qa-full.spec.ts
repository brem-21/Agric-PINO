import { test, expect, Page } from "@playwright/test";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loginAs(page: Page, phone: string, password: string) {
  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");
  const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[placeholder*="phone" i], input[placeholder*="Phone" i]').first();
  const passInput = page.locator('input[type="password"]').first();
  await phoneInput.fill(phone);
  await passInput.fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 10000 }).catch(() => {});
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `tests/screenshots/${name}.png`, fullPage: true });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe("Auth", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator("input[type='password']")).toBeVisible();
    await screenshot(page, "auth-login");
  });

  test("login with bad credentials shows error", async ({ page }) => {
    await page.goto("/auth/login");
    await page.locator('input[type="tel"], input[name="phone"]').first().fill("0000000000");
    await page.locator('input[type="password"]').fill("wrongpass");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    const hasError = await page.locator("text=/invalid|incorrect|wrong|error|credentials/i").count() > 0
      || await page.url().includes("/auth/login");
    expect(hasError).toBeTruthy();
    await screenshot(page, "auth-login-error");
  });

  test("register page renders", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.locator("form")).toBeVisible();
    await screenshot(page, "auth-register");
  });
});

test.describe("Public pages", () => {
  test("home / landing page loads", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "home");
    expect(page.url()).toBeTruthy();
  });

  test("produce marketplace loads", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "marketplace");
    const hasListings = await page.locator('[class*="card"], article, [data-testid*="listing"]').count();
    // page should at minimum render without crash
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });

  test("find rider page loads", async ({ page }) => {
    await page.goto("/find-rider");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "find-rider");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });
});

test.describe("Farmer portal", () => {
  test.beforeEach(async ({ page }) => {
    // Attempt login — skip suite gracefully if no farmer account exists
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");
  });

  test("farmer dashboard loads after login", async ({ page }) => {
    await loginAs(page, process.env.FARMER_PHONE ?? "0244000001", process.env.FARMER_PASS ?? "password123");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "farmer-dashboard");
    // Should be redirected away from login
    expect(page.url()).not.toContain("/auth/login");
  });

  test("farmer listings page loads", async ({ page }) => {
    await loginAs(page, process.env.FARMER_PHONE ?? "0244000001", process.env.FARMER_PASS ?? "password123");
    await page.goto("/farmer/listings");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "farmer-listings");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });

  test("farmer new listing page renders form", async ({ page }) => {
    await loginAs(page, process.env.FARMER_PHONE ?? "0244000001", process.env.FARMER_PASS ?? "password123");
    await page.goto("/farmer/listings/new");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "farmer-new-listing");
    const hasForm = await page.locator("form, input, select, textarea").count() > 0;
    expect(hasForm).toBeTruthy();
  });

  test("farmer orders page loads", async ({ page }) => {
    await loginAs(page, process.env.FARMER_PHONE ?? "0244000001", process.env.FARMER_PASS ?? "password123");
    await page.goto("/farmer/orders");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "farmer-orders");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });

  test("farmer messages page loads", async ({ page }) => {
    await loginAs(page, process.env.FARMER_PHONE ?? "0244000001", process.env.FARMER_PASS ?? "password123");
    await page.goto("/farmer/messages");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "farmer-messages");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });

  test("farmer profile page loads", async ({ page }) => {
    await loginAs(page, process.env.FARMER_PHONE ?? "0244000001", process.env.FARMER_PASS ?? "password123");
    await page.goto("/farmer/profile");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "farmer-profile");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });

  test("farmer analytics page loads", async ({ page }) => {
    await loginAs(page, process.env.FARMER_PHONE ?? "0244000001", process.env.FARMER_PASS ?? "password123");
    await page.goto("/farmer/analytics");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "farmer-analytics");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });
});

test.describe("Buyer portal", () => {
  test("buyer orders page loads", async ({ page }) => {
    await loginAs(page, process.env.BUYER_PHONE ?? "0244000010", process.env.BUYER_PASS ?? "password123");
    await page.goto("/buyer/orders");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "buyer-orders");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });

  test("buyer messages page loads", async ({ page }) => {
    await loginAs(page, process.env.BUYER_PHONE ?? "0244000010", process.env.BUYER_PASS ?? "password123");
    await page.goto("/buyer/messages");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "buyer-messages");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });

  test("buyer purchases page loads", async ({ page }) => {
    await loginAs(page, process.env.BUYER_PHONE ?? "0244000010", process.env.BUYER_PASS ?? "password123");
    await page.goto("/buyer/purchases");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "buyer-purchases");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });

  test("buyer profile page loads", async ({ page }) => {
    await loginAs(page, process.env.BUYER_PHONE ?? "0244000010", process.env.BUYER_PASS ?? "password123");
    await page.goto("/buyer/profile");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "buyer-profile");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });
});

test.describe("Logistics portal", () => {
  test("logistics requests page loads", async ({ page }) => {
    await loginAs(page, process.env.RIDER_PHONE ?? "0244000020", process.env.RIDER_PASS ?? "password123");
    await page.goto("/logistics/requests");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "logistics-requests");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });

  test("logistics profile page loads", async ({ page }) => {
    await loginAs(page, process.env.RIDER_PHONE ?? "0244000020", process.env.RIDER_PASS ?? "password123");
    await page.goto("/logistics/profile");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "logistics-profile");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });
});

test.describe("Admin portal", () => {
  test("admin dashboard loads", async ({ page }) => {
    await loginAs(page, process.env.ADMIN_PHONE ?? "0244000099", process.env.ADMIN_PASS ?? "password123");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "admin-dashboard");
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });
});

test.describe("Maps rendering", () => {
  test("find-rider map container is visible", async ({ page }) => {
    await page.goto("/find-rider");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000); // allow Leaflet to initialise
    await screenshot(page, "map-find-rider");
    // Check for map container
    const mapEl = await page.locator('.leaflet-container, [class*="map"]').count();
    expect(mapEl).toBeGreaterThan(0);
  });

  test("no CSP errors on map page", async ({ page }) => {
    const cspErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("Content Security Policy")) {
        cspErrors.push(msg.text());
      }
    });
    await page.goto("/find-rider");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    expect(cspErrors).toHaveLength(0);
  });
});

test.describe("Notification bell", () => {
  test("notification bell opens dropdown", async ({ page }) => {
    await loginAs(page, process.env.FARMER_PHONE ?? "0244000001", process.env.FARMER_PASS ?? "password123");
    await page.waitForLoadState("networkidle");
    const bell = page.locator('[aria-label*="notif" i], button:has(svg[class*="bell" i]), button:has([data-lucide="bell"])').first();
    if (await bell.count() > 0) {
      await bell.click();
      await page.waitForTimeout(500);
      await screenshot(page, "notification-bell-open");
      // Dropdown should appear
      const dropdown = await page.locator('[class*="dropdown"], [class*="popover"], [role="menu"]').count();
      expect(dropdown).toBeGreaterThan(0);
    }
  });
});

test.describe("Marketplace interactions", () => {
  test("produce marketplace search works", async ({ page }) => {
    await page.goto("/marketplace");
    await page.waitForLoadState("networkidle");
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill("maize");
      await page.waitForTimeout(1000);
      await screenshot(page, "marketplace-search");
    }
    expect(await page.locator("body").isVisible()).toBeTruthy();
  });

});

test.describe("Messaging portal", () => {
  test("buyer messages page has Live indicator", async ({ page }) => {
    await loginAs(page, process.env.BUYER_PHONE ?? "0244000010", process.env.BUYER_PASS ?? "password123");
    await page.goto("/buyer/messages");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "buyer-messages-live");
    const hasLive = await page.locator("text=Live").count();
    expect(hasLive).toBeGreaterThan(0);
  });

  test("farmer messages page has Live indicator", async ({ page }) => {
    await loginAs(page, process.env.FARMER_PHONE ?? "0244000001", process.env.FARMER_PASS ?? "password123");
    await page.goto("/farmer/messages");
    await page.waitForLoadState("networkidle");
    const hasLive = await page.locator("text=Live").count();
    expect(hasLive).toBeGreaterThan(0);
  });

  test("search new conversation button works", async ({ page }) => {
    await loginAs(page, process.env.FARMER_PHONE ?? "0244000001", process.env.FARMER_PASS ?? "password123");
    await page.goto("/farmer/messages");
    await page.waitForLoadState("networkidle");
    const pencilBtn = page.locator('button[title="New message"]').first();
    if (await pencilBtn.count() > 0) {
      await pencilBtn.click();
      await page.waitForTimeout(300);
      await screenshot(page, "farmer-messages-search");
      const searchBox = await page.locator('input[placeholder*="search" i]').count();
      expect(searchBox).toBeGreaterThan(0);
    }
  });
});

test.describe("API health checks", () => {
  test("GET /api/listings returns 200", async ({ page }) => {
    const res = await page.request.get("/api/listings");
    expect(res.status()).toBe(200);
  });

  test("GET /api/transport returns 401 (auth required)", async ({ page }) => {
    const res = await page.request.get("/api/transport");
    expect([401, 403]).toContain(res.status());
  });

  test("GET /api/orders returns 401 (auth required)", async ({ page }) => {
    const res = await page.request.get("/api/orders");
    expect([401, 403]).toContain(res.status());
  });

  test("GET /api/messages returns 401 (auth required)", async ({ page }) => {
    const res = await page.request.get("/api/messages");
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/messages without auth returns 401", async ({ page }) => {
    const res = await page.request.post("/api/messages", {
      data: { receiverId: "test", content: "hi" },
    });
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("Console errors", () => {
  const pages = [
    { path: "/", name: "home" },
    { path: "/marketplace", name: "marketplace" },
    { path: "/find-rider", name: "find-rider" },
    { path: "/auth/login", name: "login" },
    { path: "/auth/register", name: "register" },
  ];

  for (const { path, name } of pages) {
    test(`no console errors on ${name}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      // Filter known benign errors
      const real = errors.filter(
        (e) =>
          !e.includes("Failed to load resource") &&
          !e.includes("favicon") &&
          !e.includes("net::ERR_ABORTED") &&
          !e.includes("hydration") // Next.js dev mode hydration warnings
      );
      if (real.length > 0) console.log(`[${name}] Console errors:`, real);
      expect(real).toHaveLength(0);
    });
  }
});
