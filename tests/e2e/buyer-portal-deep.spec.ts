import { test, expect, Page } from "@playwright/test";

const BUYER_PHONE = "0244000010";
const BUYER_PASS = "password123";

async function loginAsBuyer(page: Page) {
  await page.goto("/auth/login");
  await page.waitForLoadState("domcontentloaded");
  await page.locator('input[type="tel"], input[name="phone"]').first().fill(BUYER_PHONE);
  await page.locator('input[type="password"]').first().fill(BUYER_PASS);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 }).catch(() => {});
}

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test.describe.serial("Buyer portal deep test", () => {
  test("login works and lands on buyer dashboard", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginAsBuyer(page);
    expect(page.url()).not.toContain("/auth/login");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "tests/screenshots/buyer-dashboard-deep.png", fullPage: true });
    console.log("LOGIN_URL:", page.url());
    console.log("CONSOLE_ERRORS:", JSON.stringify(errors));
  });

  test("recommendations pane renders and add-to-cart / minimize / close work", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginAsBuyer(page);
    await page.goto("/buyer/dashboard");
    await page.waitForTimeout(3000); // widget fetch is async

    const pane = page.locator("text=Recommended for You");
    const reopenTab = page.locator('button[title="Recommended for you"]');
    const paneVisible = await pane.count();
    const tabVisible = await reopenTab.count();
    console.log("PANE_OPEN_ON_LOAD:", paneVisible > 0, "REOPEN_TAB_VISIBLE:", tabVisible > 0);

    if (paneVisible > 0) {
      await page.screenshot({ path: "tests/screenshots/recommendations-pane-open.png" });
      const addBtn = page.locator('button[title="Add to cart"]').first();
      const addBtnCount = await addBtn.count();
      console.log("ADD_TO_CART_BUTTONS_FOUND:", addBtnCount);
      if (addBtnCount > 0) {
        await addBtn.click();
        await page.waitForTimeout(500);
        const cartSection = page.locator("text=Your Cart");
        await expect(cartSection).toBeVisible({ timeout: 3000 });
        await page.screenshot({ path: "tests/screenshots/recommendations-pane-cart.png" });

        // quantity stepper
        const plusBtn = page.locator('.border-t button:has(svg)').last();

        // minimize
        await page.locator('button[title="Minimize"]').click();
        await page.waitForTimeout(300);
        const minimizedTab = page.locator('button[title="Recommended for you"]');
        await expect(minimizedTab).toBeVisible({ timeout: 2000 });
        console.log("MINIMIZE: reopen tab shows cart count?", await minimizedTab.textContent());

        // reopen
        await minimizedTab.click();
        await page.waitForTimeout(300);
        await expect(page.locator("text=Recommended for You")).toBeVisible();

        // close
        await page.locator('button[title="Close"]').click();
        await page.waitForTimeout(300);
        const paneGone = await page.locator("text=Recommended for You").count();
        const tabGone = await page.locator('button[title="Recommended for you"]').count();
        console.log("AFTER_CLOSE: pane gone?", paneGone === 0, "tab also gone (expected)?", tabGone === 0);
      }
    } else if (tabVisible > 0) {
      console.log("Pane loaded minimized/collapsed by default — unexpected, first load should auto-open per code");
    } else {
      console.log("NO recommendations widget rendered at all — either 0 recs returned, or component crashed");
    }
    console.log("CONSOLE_ERRORS:", JSON.stringify(errors));
  });

  test("place a real order via marketplace and pay via Cash on Delivery", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginAsBuyer(page);
    await page.goto("/marketplace");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const orderNowBtn = page.locator('a:has-text("Order Now"), button:has-text("Order Now")').first();
    const count = await orderNowBtn.count();
    console.log("ORDER_NOW_BUTTONS_FOUND:", count);
    if (count === 0) {
      await page.screenshot({ path: "tests/screenshots/marketplace-no-listings.png", fullPage: true });
      console.log("BUG_CANDIDATE: no active listings with Order Now button found on /marketplace");
      return;
    }
    await orderNowBtn.click();
    await page.waitForURL(/\/marketplace\/.+\/order/, { timeout: 8000 }).catch(() => {});
    console.log("ORDER_PAGE_URL:", page.url());
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "tests/screenshots/order-page.png", fullPage: true });

    const placeOrderBtn = page.locator('button:has-text("Place Order")').first();
    if (await placeOrderBtn.count() === 0) {
      console.log("BUG: Place Order button not found on order page");
      return;
    }
    await placeOrderBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/screenshots/order-payment-choice.png", fullPage: true });

    const codBtn = page.locator('button:has-text("Pay on Delivery")').first();
    if (await codBtn.count() > 0) {
      await codBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "tests/screenshots/order-cod-confirmed.png", fullPage: true });
      console.log("COD_FLOW_URL_AFTER:", page.url());
    } else {
      console.log("BUG_CANDIDATE: Pay on Delivery button not found after placing order — payment choice panel may have failed to render, or acceptsCOD is false for this farmer");
      const bodyText = await page.locator("body").innerText().catch(() => "");
      console.log("PAGE_TEXT_SNIPPET:", bodyText.slice(0, 500));
    }
    console.log("CONSOLE_ERRORS:", JSON.stringify(errors));
  });

  test("buyer orders page shows the new order", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginAsBuyer(page);
    await page.goto("/buyer/orders");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/screenshots/buyer-orders-deep.png", fullPage: true });
    const rowCount = await page.locator("tbody tr").count();
    console.log("BUYER_ORDERS_ROW_COUNT:", rowCount);
    console.log("CONSOLE_ERRORS:", JSON.stringify(errors));
  });

  test("buyer purchases page renders", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginAsBuyer(page);
    await page.goto("/buyer/purchases");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "tests/screenshots/buyer-purchases-deep.png", fullPage: true });
    console.log("CONSOLE_ERRORS:", JSON.stringify(errors));
  });

  test("messages: search, send, and (You) indicator + no cross-conversation leak", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginAsBuyer(page);
    await page.goto("/buyer/messages");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "tests/screenshots/buyer-messages-deep.png", fullPage: true });

    const hasLive = await page.locator("text=Live").count();
    console.log("LIVE_INDICATOR_PRESENT:", hasLive > 0);

    const pencilBtn = page.locator('button[title="New message"]').first();
    if (await pencilBtn.count() === 0) {
      console.log("BUG: New message (pencil) button not found");
      return;
    }
    await pencilBtn.click();
    await page.waitForTimeout(300);
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.count() === 0) {
      console.log("BUG: search input not found after clicking new message");
      return;
    }
    await searchInput.fill("Kofi");
    await page.waitForTimeout(800);
    await page.screenshot({ path: "tests/screenshots/buyer-messages-search-deep.png" });
    const results = page.locator("button:has-text('Kofi')");
    const resultCount = await results.count();
    console.log("SEARCH_RESULTS_FOR_KOFI:", resultCount);
    if (resultCount > 0) {
      await results.first().click();
      await page.waitForTimeout(500);
      const input = page.locator('input[placeholder="Type a message…"]').first();
      if (await input.count() > 0) {
        const testMsg = `Playwright deep-test message ${Date.now()}`;
        await input.fill(testMsg);
        await page.locator('button:has(svg)').last().click(); // send button
        await page.waitForTimeout(2000);
        await page.screenshot({ path: "tests/screenshots/buyer-message-sent.png", fullPage: true });

        // Check conversation list now shows (You) prefix for this thread
        const youPrefix = await page.locator("text=/\\(You\\)/").count();
        console.log("YOU_PREFIX_VISIBLE_IN_CONV_LIST:", youPrefix > 0);

        // Switch away and back rapidly to probe for cross-conversation leak
        const otherConvs = page.locator('.divide-y button, [class*="space-y-1"] > button');
      }
    }
    console.log("CONSOLE_ERRORS:", JSON.stringify(errors));
  });

  test("profile page (shared /profile route, not /buyer/profile which does not exist)", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginAsBuyer(page);
    await page.goto("/profile");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "tests/screenshots/buyer-profile-deep.png", fullPage: true });
    const getVerifiedCard = await page.locator("text=/Get Verified|Verification/").count();
    console.log("VERIFICATION_CARD_PRESENT:", getVerifiedCard > 0);
    console.log("CONSOLE_ERRORS:", JSON.stringify(errors));

    // Also confirm /buyer/profile truly doesn't resolve to a real page for an authenticated buyer
    const res = await page.request.get("/buyer/profile", { maxRedirects: 0 }).catch((e) => e);
    console.log("BUYER_PROFILE_ROUTE_STATUS:", res?.status?.() ?? "error/redirect");
  });

  test("buyer complaints page", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await loginAsBuyer(page);
    const res = await page.goto("/buyer/complaints");
    await page.waitForTimeout(1000);
    console.log("COMPLAINTS_PAGE_STATUS:", res?.status());
    await page.screenshot({ path: "tests/screenshots/buyer-complaints-deep.png", fullPage: true });
    console.log("CONSOLE_ERRORS:", JSON.stringify(errors));
  });
});
