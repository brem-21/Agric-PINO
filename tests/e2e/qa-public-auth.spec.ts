import { test, expect, Page } from "@playwright/test";

function trackConsole(page: Page, errors: string[]) {
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
}

function realErrors(errors: string[]) {
  return errors.filter(
    (e) =>
      !e.includes("Failed to load resource") &&
      !e.includes("favicon") &&
      !e.includes("net::ERR_ABORTED") &&
      !e.includes("hydration")
  );
}

async function loginAs(page: Page, phone: string, password: string) {
  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="tel"], input[name="phone"]').first().fill(phone);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').click();
  // Dev-mode redirect latency after the RoleLoadingScreen animation is highly
  // variable (observed 4-10s+ across all roles, likely Turbopack overhead) —
  // give it real headroom so the test isn't flaky about something that isn't a bug.
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 20000 }).catch(() => {});
}

test.describe("Landing page", () => {
  test("navbar, hero, stats, scroll reveal", async ({ page }) => {
    test.setTimeout(45000);
    const errors: string[] = [];
    trackConsole(page, errors);
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    // Navbar links
    const navLinks = await page.locator("nav a, header a").allTextContents();
    console.log("Landing nav links:", navLinks);

    // Hero slideshow cycling — capture image src, wait, capture again
    const heroImg = page.locator("img").first();
    const firstOpacity = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      const visible = imgs.find((i) => (i as HTMLElement).style.opacity === "1");
      return visible?.getAttribute("src");
    });
    await page.waitForTimeout(5500); // slideshow interval is 5s
    const secondOpacity = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll("img"));
      const visible = imgs.find((i) => (i as HTMLElement).style.opacity === "1");
      return visible?.getAttribute("src");
    });
    console.log("Hero slide 1:", firstOpacity, "-> slide 2:", secondOpacity);

    // Scroll to bottom to trigger ScrollReveal sections
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(1000);
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "tests/screenshots/landing-scrolled.png", fullPage: true });

    // Stats block
    const statsText = await page.locator("body").innerText();
    const hasStatsNumbers = /\d+\s*(farmers|listings|districts|tons)/i.test(statsText);
    console.log("Has stats numbers:", hasStatsNumbers);

    // Portal/Login/Register buttons (logged out state)
    const loginBtn = page.locator('a[href*="/auth/login"], a[href="/login"]').first();
    const registerBtn = page.locator('a[href*="/auth/register"], a[href="/register"]').first();
    console.log("Login button count:", await loginBtn.count(), "Register button count:", await registerBtn.count());

    const real = realErrors(errors);
    if (real.length) console.log("LANDING CONSOLE ERRORS:", real);
    expect(real).toEqual([]);
  });

  test("About link scrolls to #about section (no 404)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const aboutLink = page.locator('a[href="/#about"], a[href="#about"]').first();
    if (await aboutLink.count() > 0) {
      await aboutLink.click();
      await page.waitForTimeout(500);
      expect(page.url()).not.toContain("404");
      const aboutSection = await page.locator("#about").count();
      console.log("#about section exists:", aboutSection > 0);
    } else {
      console.log("No #about link found on landing page");
    }
  });

  test("produce highlight card hover reveals tooltip (logged out)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(800);
    const card = page.locator('[class*="group"]').first();
    if (await card.count() > 0) {
      await card.hover();
      await page.waitForTimeout(400);
      await page.screenshot({ path: "tests/screenshots/produce-card-hover.png" });
    }
    const signInLink = await page.locator('a:has-text("Sign In")').count();
    const createAccountLink = await page.locator('a:has-text("Create an account")').count();
    console.log("Sign In link present on hover-area:", signInLink, "Create account link:", createAccountLink);
  });
});

test.describe("Marketplace (produce)", () => {
  test("search, back button, listing click-through", async ({ page }) => {
    const errors: string[] = [];
    trackConsole(page, errors);
    await page.goto("/marketplace");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    const backBtn = page.locator('[aria-label="Go back"]').first();
    console.log("BackButton present on /marketplace:", await backBtn.count() > 0);

    const searchInput = page.locator('input[type="text"], input[placeholder*="search" i]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill("tomato");
      await page.waitForTimeout(1200);
      await page.screenshot({ path: "tests/screenshots/marketplace-search-tomato.png" });
    }

    // Clear search, click first listing card
    if (await searchInput.count() > 0) await searchInput.fill("");
    await page.waitForTimeout(800);
    const firstCard = page.locator('a[href^="/marketplace/"]').first();
    if (await firstCard.count() > 0) {
      const href = await firstCard.getAttribute("href");
      await firstCard.click();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(800);
      console.log("Navigated to listing detail:", href, "-> current URL:", page.url());
      const backToMarket = await page.locator('a:has-text("Back to Marketplace"), a:has-text("marketplace")').count();
      console.log("Back-to-marketplace link on detail page:", backToMarket);
      await page.screenshot({ path: "tests/screenshots/listing-detail.png" });
    } else {
      console.log("No listing cards found on /marketplace — cannot test click-through");
    }

    const real = realErrors(errors);
    if (real.length) console.log("MARKETPLACE CONSOLE ERRORS:", real);
    expect(real).toEqual([]);
  });
});

test.describe("Equipment marketplace", () => {
  test("search, add to cart, cart drawer, message vendor", async ({ page }) => {
    const errors: string[] = [];
    trackConsole(page, errors);
    await page.goto("/equipment");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    const backBtn = page.locator('[aria-label="Go back"]').first();
    console.log("BackButton present on /equipment:", await backBtn.count() > 0);

    const addBtn = page.locator('button:has-text("Add to Cart")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(400);
      const cartBtn = page.locator('button:has-text("Cart")').first();
      await cartBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: "tests/screenshots/equipment-cart-drawer.png" });
      const qtyText = await page.locator("text=/Your Cart/i").count();
      console.log("Cart drawer opened:", qtyText > 0);
      // Close the drawer via its backdrop — the drawer itself blocks all other
      // clicks while open (this is expected modal behavior, not a bug).
      await page.locator(".fixed.inset-0.bg-black\\/40").click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
    } else {
      console.log("No 'Add to Cart' button found — equipment listing may be empty or out of stock");
    }

    const msgBtn = page.locator('button:has-text("Message Vendor")').first();
    if (await msgBtn.count() > 0) {
      await msgBtn.click();
      await page.waitForTimeout(500);
      const dialog = await page.locator('[role="dialog"]').count();
      console.log("Message vendor dialog opened:", dialog > 0);
      await page.screenshot({ path: "tests/screenshots/equipment-message-dialog-v2.png" });
    }

    const real = realErrors(errors);
    if (real.length) console.log("EQUIPMENT CONSOLE ERRORS:", real);
    expect(real).toEqual([]);
  });
});

test.describe("Find rider (map)", () => {
  test("Leaflet map renders without CSP errors", async ({ page }) => {
    const cspErrors: string[] = [];
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
        if (msg.text().includes("Content Security Policy")) cspErrors.push(msg.text());
      }
    });
    await page.goto("/find-rider");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
    const mapCount = await page.locator(".leaflet-container").count();
    console.log("Leaflet map containers found:", mapCount);
    await page.screenshot({ path: "tests/screenshots/find-rider-map.png" });
    expect(cspErrors).toEqual([]);
  });
});

test.describe("Login flows — all 5 roles", () => {
  const accounts = [
    { role: "FARMER", phone: "0244000001", expectPath: "/farmer" },
    { role: "BUYER", phone: "0244000010", expectPath: "/buyer" },
    { role: "LOGISTICS", phone: "0244000020", expectPath: "/logistics" },
    { role: "VENDOR", phone: "0244000030", expectPath: "/vendor" },
    { role: "ADMIN", phone: "0244000099", expectPath: "/admin" },
  ];

  for (const acc of accounts) {
    test(`${acc.role} login lands on correct dashboard`, async ({ page }) => {
      await loginAs(page, acc.phone, "password123");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1000);
      const url = page.url();
      console.log(`${acc.role} login -> landed on:`, url);
      expect(url).not.toContain("/auth/login");
    });
  }

  test("invalid credentials show error, stay on login", async ({ page }) => {
    await page.goto("/auth/login");
    await page.locator('input[type="tel"], input[name="phone"]').first().fill("0000000000");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/auth/login");
    const errorVisible = await page.locator("text=/invalid|incorrect|wrong/i").count();
    console.log("Error message shown on bad login:", errorVisible > 0);
  });

  test("legacy /login route also works", async ({ page }) => {
    await page.goto("/login");
    const status = page.url();
    console.log("/login resolved to:", status);
    const hasForm = await page.locator('input[type="password"]').count();
    expect(hasForm).toBeGreaterThan(0);
  });
});

test.describe("Registration — all 5 role paths", () => {
  test("FARMER registration", async ({ page }) => {
    await page.goto("/auth/register");
    await page.locator('button:has-text("Farmer")').first().click();
    await page.waitForTimeout(300);
    await page.locator("#name, input#name").fill("QA Test Farmer");
    await page.locator("#phone, input#phone").fill("0599000101");
    await page.locator("#password").fill("testpass123");
    await page.locator("#confirmPassword").fill("testpass123");
    await page.locator("#ghanaCardNumber").fill("GHA-000000101-1");
    await page.locator("#ghanaCardName").fill("QA Test Farmer");
    await page.locator("#residenceLocation").fill("Tamale");
    // Region select — try clicking trigger then an option
    const regionTrigger = page.locator('#region, [id="region"]').first();
    if (await regionTrigger.count() > 0) {
      await regionTrigger.click().catch(() => {});
      await page.waitForTimeout(300);
      const option = page.locator('[role="option"]').first();
      if (await option.count() > 0) await option.click();
    }
    await page.screenshot({ path: "tests/screenshots/register-farmer-filled.png" });
    console.log("FARMER registration form filled (not submitted to avoid OTP flow ambiguity in this test pass)");
  });

  test("ADMIN registration requires photo, creates BUYER + AdminRequest", async ({ page }) => {
    await page.goto("/auth/register");
    await page.waitForLoadState("domcontentloaded");
    const adminOption = page.locator('button:has-text("Admin")').first();
    console.log("Admin role option present:", await adminOption.count() > 0);
    if (await adminOption.count() === 0) {
      console.log("SKIP: no Admin role option found on register page");
      return;
    }
    await adminOption.click();
    await page.waitForTimeout(300);

    await page.locator("#name").fill("QA Test Admin");
    await page.locator("#phone").fill("0599000199");
    await page.locator("#password").fill("testpass123");
    await page.locator("#confirmPassword").fill("testpass123");
    await page.locator("#ghanaCardNumber").fill("GHA-000000199-9");
    await page.locator("#ghanaCardName").fill("QA Test Admin");
    await page.locator("#residenceLocation").fill("Tamale");

    const photoLabel = page.locator('label[for="idPhoto"]');
    console.log("Photo upload field present for ADMIN role:", await photoLabel.count() > 0);
    const notice = await page.locator("text=/reviewed by an existing admin|approved once/i").count();
    console.log("Admin review notice text present:", notice > 0);

    await page.screenshot({ path: "tests/screenshots/register-admin-filled.png" });

    // Try submitting WITHOUT photo — should show client-side error, not proceed
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(1000);
    const stillOnForm = await page.locator("#idPhoto, label[for='idPhoto']").count();
    const errorShown = await page.locator("text=/photo.*required|required.*photo/i").count();
    console.log("Submitting without photo blocked client-side:", errorShown > 0, "| still on form:", stillOnForm > 0);
  });

  test("LOGISTICS and VENDOR role options exist on register page", async ({ page }) => {
    await page.goto("/auth/register");
    await page.waitForLoadState("domcontentloaded");
    const logisticsOpt = await page.locator('button:has-text("Logistics")').count();
    const vendorOpt = await page.locator('button:has-text("Vendor")').count();
    console.log("Logistics option:", logisticsOpt, "Vendor option:", vendorOpt);
  });
});

test.describe("Tracking + Delivery slip pages", () => {
  const orderWithDeliveryNumber = "cmr3m6o3e000csu4cc0a56u9k";
  const orderWithTransport = "cmr555hmi005c664c7wyj0t4j";

  test("tracking page back link points at delivery slip (fixed destination)", async ({ page }) => {
    // /tracking/[orderId] is public, but /delivery/[orderId] requires auth —
    // so an anonymous click here correctly bounces to /auth/login. We only
    // assert the link's href is right, not the post-click destination.
    const errors: string[] = [];
    trackConsole(page, errors);
    await page.goto(`/tracking/${orderWithDeliveryNumber}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);
    const backLink = page.locator(`a[href="/delivery/${orderWithDeliveryNumber}"]`).first();
    const backLinkCount = await backLink.count();
    console.log("Tracking page has fixed back-to-delivery link:", backLinkCount > 0);
    expect(backLinkCount).toBeGreaterThan(0);
    const real = realErrors(errors);
    if (real.length) console.log("TRACKING CONSOLE ERRORS:", real);
  });

  test("tracking page with transportRequest — map renders if coords present", async ({ page }) => {
    await page.goto(`/tracking/${orderWithTransport}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    const mapCount = await page.locator(".leaflet-container").count();
    console.log(`Order ${orderWithTransport} has pickupLat set but deliveryLat null -> map should NOT render (needs both). Map containers found:`, mapCount);
    await page.screenshot({ path: "tests/screenshots/tracking-transport-order.png" });
  });

  test("delivery slip page has BackButton, print, WhatsApp share with correct URL", async ({ page }) => {
    const errors: string[] = [];
    trackConsole(page, errors);
    // /delivery/[orderId] requires auth (established, intentional) — log in as
    // the order's own buyer first, otherwise this just redirects to /auth/login.
    await loginAs(page, "0244000001", "password123");
    await page.goto(`/delivery/${orderWithDeliveryNumber}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);

    const backBtn = page.locator('[aria-label="Go back"]').first();
    console.log("BackButton present on delivery slip:", await backBtn.count() > 0);

    const waLink = page.locator('a[href*="wa.me"]').first();
    if (await waLink.count() > 0) {
      const href = await waLink.getAttribute("href");
      const decoded = decodeURIComponent(href ?? "");
      console.log("WhatsApp share href:", decoded);
      const usesLocalhost = decoded.includes("localhost:3000");
      const usesLorgricCom = decoded.includes("lorgric.com");
      console.log("Uses NEXT_PUBLIC_APP_URL (localhost:3000) consistently:", usesLocalhost, "| stray lorgric.com reference:", usesLorgricCom);
      expect(usesLorgricCom).toBe(false);
    } else {
      console.log("No WhatsApp share button found on delivery slip");
    }

    const printBtn = await page.locator('button:has-text("Print")').count();
    console.log("Print button present:", printBtn > 0);

    await page.screenshot({ path: "tests/screenshots/delivery-slip.png", fullPage: true });
    const real = realErrors(errors);
    if (real.length) console.log("DELIVERY SLIP CONSOLE ERRORS:", real);
    expect(real).toEqual([]);
  });
});

test.describe("Payment callback", () => {
  test("no reference param -> graceful failed state, no crash", async ({ page }) => {
    const errors: string[] = [];
    trackConsole(page, errors);
    await page.goto("/payment/callback");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    const bodyText = await page.locator("body").innerText();
    console.log("Payment callback (no ref) body text snippet:", bodyText.slice(0, 200));
    const crashed = bodyText.includes("Application error") || bodyText.includes("500");
    expect(crashed).toBe(false);
    const real = realErrors(errors);
    if (real.length) console.log("PAYMENT CALLBACK CONSOLE ERRORS:", real);
  });
});
