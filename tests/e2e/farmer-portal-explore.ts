import { chromium, Page } from "@playwright/test";

const BASE = "http://localhost:3000";
const findings: string[] = [];
const consoleErrors: Record<string, string[]> = {};

function log(msg: string) {
  console.log(msg);
}

async function safe(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    findings.push(`SCRIPT ERROR in "${name}" section (may indicate a real hang/bug, or a flaky selector): ${(e as Error).message.slice(0, 300)}`);
  }
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  function trackConsole(pageName: string) {
    consoleErrors[pageName] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors[pageName].push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors[pageName].push("PAGEERROR: " + err.message));
  }

  await safe("login", async () => {
    trackConsole("login");
    await page.goto(`${BASE}/auth/login`);
    await page.locator('input[type="tel"], input[name="phone"]').first().fill("0244000001");
    await page.locator('input[type="password"]').first().fill("password123");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 }).catch(() => {});
    const afterLoginUrl = page.url();
    log(`After login URL: ${afterLoginUrl}`);
    if (afterLoginUrl.includes("/auth/login")) {
      findings.push("CRITICAL: Login as farmer 0244000001/password123 did not redirect away from /auth/login within 15s.");
    }
  });

  await safe("dashboard", async () => {
    trackConsole("dashboard");
    await page.goto(`${BASE}/farmer/dashboard`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/screenshots/qa-farmer-dashboard.png", fullPage: true });
    const statTiles = await page.locator("text=/Total|Active|Listings|Orders/i").count();
    log(`Dashboard stat-like text count: ${statTiles}`);
    const weatherWidget = await page.locator("text=/weather|°C|forecast/i").count();
    log(`Weather widget indicators: ${weatherWidget}`);
  });

  await safe("sidebar-collapse", async () => {
    const collapseBtn = page.locator('button[aria-label="Collapse menu"], button[aria-label="Expand menu"]').first();
    if (await collapseBtn.count() > 0) {
      await collapseBtn.click({ timeout: 5000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: "tests/screenshots/qa-farmer-sidebar-collapsed.png" });
      await page.goto(`${BASE}/farmer/listings`);
      await page.waitForTimeout(1000);
      const stillCollapsed = await page.locator('button[aria-label="Expand menu"]').count() > 0;
      log(`Sidebar collapse persisted across navigation: ${stillCollapsed}`);
      if (!stillCollapsed) findings.push("MEDIUM: Farmer sidebar collapse state does not persist across navigation.");
      const expandBtn = page.locator('button[aria-label="Expand menu"]').first();
      if (await expandBtn.count() > 0) await expandBtn.click({ timeout: 5000 });
    } else {
      findings.push("LOW: Could not locate the desktop sidebar collapse toggle (aria-label='Collapse menu') on farmer dashboard.");
    }
  });

  await safe("logo-link", async () => {
    await page.goto(`${BASE}/farmer/dashboard`);
    await page.waitForTimeout(500);
    const logoLink = page.locator('a:has-text("Lorgric")').first();
    const logoHref = await logoLink.getAttribute("href").catch(() => null);
    log(`Sidebar logo href: ${logoHref}`);
    if (logoHref !== "/farmer/dashboard") {
      findings.push(`MEDIUM: Farmer sidebar logo href is "${logoHref}", expected "/farmer/dashboard".`);
    }
  });

  await safe("listings", async () => {
    trackConsole("listings");
    await page.goto(`${BASE}/farmer/listings`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/screenshots/qa-farmer-listings.png", fullPage: true });
    const listingRows = await page.locator('tr, [class*="card"]').count();
    log(`Listing rows/cards found: ${listingRows}`);
    if (listingRows === 0) findings.push("MEDIUM: /farmer/listings shows zero rows/cards despite this farmer having 16+ listings in the DB.");
  });

  await safe("new-listing", async () => {
    trackConsole("new-listing");
    await page.goto(`${BASE}/farmer/listings/new`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "tests/screenshots/qa-farmer-new-listing.png", fullPage: true });

    const cropInput = page.locator('input[name="cropType"], input[placeholder*="crop" i], input[placeholder*="tomato" i]').first();
    if (await cropInput.count() > 0) await cropInput.fill("QA Test Crop " + Date.now());
    const qtyInput = page.locator('input[name="quantity"], input[type="number"]').first();
    if (await qtyInput.count() > 0) await qtyInput.fill("100");
    const priceInput = page.locator('input[name="pricePerUnit"], input[placeholder*="price" i]').first();
    if (await priceInput.count() > 0) await priceInput.fill("5");
    const unitInput = page.locator('input[name="unit"], input[placeholder*="unit" i]').first();
    if (await unitInput.count() > 0) await unitInput.fill("kg");
    const locationInput = page.locator('input[name="location"], input[placeholder*="location" i]').first();
    if (await locationInput.count() > 0) await locationInput.fill("Tamale");

    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click({ timeout: 5000 });
      await page.waitForTimeout(3000);
      const urlAfterSubmit = page.url();
      log(`After listing submit URL: ${urlAfterSubmit}`);
      await page.screenshot({ path: "tests/screenshots/qa-farmer-new-listing-after-submit.png", fullPage: true });
      if (urlAfterSubmit.includes("/new")) {
        const errText = await page.locator("text=/error|required|invalid/i").allTextContents();
        findings.push(`MEDIUM: New listing form submit did not navigate away from /farmer/listings/new. Visible error-ish text: ${JSON.stringify(errText).slice(0, 300)}`);
      } else {
        log("New listing appears to have been created successfully.");
      }
    } else {
      findings.push("HIGH: No submit button found on /farmer/listings/new form.");
    }
  });

  await safe("orders", async () => {
    trackConsole("orders");
    await page.goto(`${BASE}/farmer/orders`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/screenshots/qa-farmer-orders.png", fullPage: true });
    const assignDeliveryBtns = await page.locator('a:has-text("Assign Delivery")').count();
    const deliveryStatusBadges = await page.locator('a:has-text("ASSIGNED"), a:has-text("PICKED"), a:has-text("IN TRANSIT"), a:has-text("DELIVERED")').count();
    log(`"Assign Delivery" links: ${assignDeliveryBtns}, delivery-status badges: ${deliveryStatusBadges}`);
    if (assignDeliveryBtns === 0 && deliveryStatusBadges === 0) {
      findings.push("LOW: Could not find either an 'Assign Delivery' link or a delivery-status badge on /farmer/orders.");
    }
  });

  await safe("transport-payment", async () => {
    trackConsole("transport");
    await page.goto(`${BASE}/farmer/transport`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/screenshots/qa-farmer-transport.png", fullPage: true });

    const payWithPaystackBtn = page.locator('button:has-text("Pay with Paystack")').first();
    if (await payWithPaystackBtn.count() > 0) {
      await payWithPaystackBtn.click({ timeout: 5000 });
      await page.waitForTimeout(500);
      const phoneField = page.locator('input[type="tel"], input[placeholder*="mobile" i]').last();
      if (await phoneField.count() > 0) {
        await phoneField.fill("0244000099");
        const payBtn = page.locator('button:has-text("Pay")').last();
        const [response] = await Promise.all([
          page.waitForResponse((r) => r.url().includes("/api/transport/payment"), { timeout: 10000 }).catch(() => null),
          payBtn.click({ timeout: 5000 }),
        ]);
        if (response) {
          const status = response.status();
          const body = await response.json().catch(() => ({}));
          log(`Paystack init response: ${status} ${JSON.stringify(body).slice(0, 300)}`);
          if (status !== 200 || !body.authorizationUrl) {
            findings.push(`HIGH: Clicking "Pay with Paystack" on an ASSIGNED transport request did not return a valid authorizationUrl. Status ${status}, body: ${JSON.stringify(body).slice(0, 300)}`);
          } else {
            log("Paystack payment init for transport request succeeded (authorizationUrl returned).");
          }
        } else {
          findings.push("HIGH: No network response observed for /api/transport/payment after clicking Pay with Paystack + submitting phone.");
        }
      } else {
        findings.push("MEDIUM: Clicking 'Pay with Paystack' did not reveal a phone number input.");
      }
    } else {
      findings.push("LOW: No 'Pay with Paystack' button found on /farmer/transport (known fixture request cmr55ki9q007r664cmn8kl7rd should have one — verify it's still ASSIGNED+UNPAID).");
    }
    await page.screenshot({ path: "tests/screenshots/qa-farmer-transport-payment.png", fullPage: true });
  });

  await safe("transport-new-request", async () => {
    const newRequestBtn = page.locator('button:has-text("New Request")').first();
    if (await newRequestBtn.count() > 0) {
      await newRequestBtn.click({ timeout: 5000 });
      await page.waitForTimeout(500);
      const pickupInput = page.locator('#pickup').first();
      const deliveryInput = page.locator('#delivery').first();
      const dateInput = page.locator('#date').first();
      if (await pickupInput.count() > 0) await pickupInput.fill("Tamale Central Market");
      if (await deliveryInput.count() > 0) await deliveryInput.fill("Bolgatanga");
      if (await dateInput.count() > 0) {
        const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
        await dateInput.fill(tomorrow);
      }
      const submitReq = page.locator('button:has-text("Submit Request")').first();
      if (await submitReq.count() > 0) {
        await submitReq.click({ timeout: 5000 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: "tests/screenshots/qa-farmer-transport-new-request.png", fullPage: true });
        const successBanner = await page.locator("text=/submitted|nearby riders/i").count();
        log(`New transport request success banner present: ${successBanner > 0}`);
        if (successBanner === 0) {
          findings.push("MEDIUM: Submitting a new generic transport request did not show the expected success confirmation.");
        }
      } else {
        findings.push("MEDIUM: 'Submit Request' button not found after opening the new transport request form.");
      }
    } else {
      findings.push("LOW: 'New Request' button not found on /farmer/transport.");
    }
  });

  await safe("messages", async () => {
    trackConsole("messages");
    await page.goto(`${BASE}/farmer/messages`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/screenshots/qa-farmer-messages.png", fullPage: true });

    const pencilBtn = page.locator('button[title="New message"]').first();
    if (await pencilBtn.count() === 0) {
      findings.push("LOW: 'New message' button not found on /farmer/messages.");
      return;
    }
    await pencilBtn.click({ timeout: 5000 });
    await page.waitForTimeout(400);
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.count() === 0) {
      findings.push("MEDIUM: New-message search input did not appear after clicking the pencil/new-message button.");
      return;
    }
    await searchInput.fill("Grace");
    await page.waitForTimeout(800);
    await page.screenshot({ path: "tests/screenshots/qa-farmer-messages-search.png" });
    const results = page.locator('button:has-text("Grace")');
    if (await results.count() === 0) {
      findings.push("LOW: Searching 'Grace' in farmer messages returned no clickable result.");
      return;
    }
    await results.first().click({ timeout: 5000 });
    await page.waitForTimeout(500);
    const msgInput = page.locator('input[placeholder*="message" i]').last();
    if (await msgInput.count() === 0) {
      findings.push("MEDIUM: Could not find the message input box after opening a conversation.");
      return;
    }
    const testMsg = "QA automated test message " + Date.now();
    await msgInput.fill(testMsg);
    await msgInput.press("Enter");
    await page.waitForTimeout(2500);
    const sentBubble = await page.locator(`text=${testMsg}`).count();
    log(`Sent message bubble visible: ${sentBubble > 0}`);
    if (sentBubble === 0) {
      findings.push("HIGH: Sent message text did not appear in the chat thread after pressing Enter on /farmer/messages.");
    }
    // Switch conversation and back to check for leakage
    await page.goto(`${BASE}/farmer/messages`);
    await page.waitForTimeout(1500);
    const convButtons = page.locator('div.overflow-y-auto button');
    const convCount = await convButtons.count();
    log(`Conversation list entries after send: ${convCount}`);
    if (convCount > 1) {
      await convButtons.nth(1).click({ timeout: 5000 });
      await page.waitForTimeout(800);
      const leaked = await page.locator(`text=${testMsg}`).count();
      if (leaked > 0) {
        findings.push(`CRITICAL: Message "${testMsg}" (sent to Grace) leaked into a different conversation thread after switching.`);
      } else {
        log("No message leakage detected across conversation switch — fix holds.");
      }
    }
    const youPrefix = await page.locator("text=/\\(You\\)/").count();
    log(`"(You)" prefix count in conversation list: ${youPrefix}`);
    if (youPrefix === 0) {
      findings.push("MEDIUM: Expected '(You)' prefix on the conversation list preview after sending the last message, but none found.");
    }
  });

  await safe("profile", async () => {
    trackConsole("profile");
    await page.goto(`${BASE}/profile`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "tests/screenshots/qa-farmer-profile.png", fullPage: true });
    const getVerifiedCard = await page.locator("text=/Get Verified|Verification/i").count();
    log(`Profile verification-related text count: ${getVerifiedCard}`);
  });

  await safe("complaints", async () => {
    trackConsole("complaints");
    await page.goto(`${BASE}/farmer/complaints`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "tests/screenshots/qa-farmer-complaints.png", fullPage: true });
    const complaintForm = await page.locator("form, textarea, select").count();
    log(`Complaints page form-like elements: ${complaintForm}`);
    if (complaintForm === 0) {
      findings.push("LOW: /farmer/complaints has no visible form/textarea/select elements.");
    }
  });

  await safe("analytics", async () => {
    trackConsole("analytics");
    await page.goto(`${BASE}/farmer/analytics`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/screenshots/qa-farmer-analytics.png", fullPage: true });
    const chartLike = await page.locator("svg, canvas, [class*='chart']").count();
    log(`Analytics chart-like elements: ${chartLike}`);
    if (chartLike === 0) {
      findings.push("MEDIUM: /farmer/analytics shows no chart/svg/canvas elements.");
    }
  });

  for (const [pageName, errs] of Object.entries(consoleErrors)) {
    const real = errs.filter((e) => !e.includes("favicon") && !e.includes("Failed to load resource") && !e.toLowerCase().includes("hydration"));
    if (real.length > 0) {
      findings.push(`CONSOLE ERRORS on ${pageName}: ${JSON.stringify(real).slice(0, 500)}`);
    }
  }

  await browser.close();

  log("\n\n=== FINDINGS SUMMARY ===");
  if (findings.length === 0) {
    log("No issues found.");
  } else {
    findings.forEach((f) => log("- " + f));
  }
}

main().catch((e) => {
  console.error("SCRIPT FAILED:", e);
  process.exit(1);
});
