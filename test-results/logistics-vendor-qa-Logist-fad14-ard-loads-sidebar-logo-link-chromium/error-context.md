# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: logistics-vendor-qa.spec.ts >> Logistics portal >> dashboard loads, sidebar, logo link
- Location: tests/e2e/logistics-vendor-qa.spec.ts:19:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('a:has-text("Lorgric")').first()
    - locator resolved to <a href="/logistics/dashboard" class="flex items-center gap-2">…</a>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    40 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - link "Lorgric●" [ref=e5] [cursor=pointer]:
          - /url: /logistics/dashboard
          - img [ref=e7]
          - generic [ref=e10]: Lorgric●
        - button "Collapse menu" [ref=e11]:
          - img [ref=e12]
      - navigation [ref=e13]:
        - link "Dashboard" [ref=e14] [cursor=pointer]:
          - /url: /logistics/dashboard
          - img [ref=e15]
          - generic [ref=e20]: Dashboard
          - img [ref=e21]
        - link "Transport Requests" [ref=e23] [cursor=pointer]:
          - /url: /logistics/requests
          - img [ref=e24]
          - generic [ref=e29]: Transport Requests
        - link "Active Deliveries" [ref=e30] [cursor=pointer]:
          - /url: /logistics/deliveries
          - img [ref=e31]
          - generic [ref=e36]: Active Deliveries
        - link "Report Incident" [ref=e37] [cursor=pointer]:
          - /url: /logistics/complaints
          - img [ref=e38]
          - generic [ref=e40]: Report Incident
      - generic [ref=e41]:
        - link "AR Abdul Razak 0244000020" [ref=e42] [cursor=pointer]:
          - /url: /profile
          - generic [ref=e44]: AR
          - generic [ref=e46]:
            - paragraph [ref=e47]: Abdul Razak
            - paragraph [ref=e48]: "0244000020"
        - button "Online" [ref=e49]:
          - img [ref=e50]
          - text: Online
        - button "Sign out" [ref=e54]:
          - img [ref=e55]
          - text: Sign Out
    - button "Notifications" [ref=e60]:
      - img [ref=e61]
      - generic [ref=e64]: "1"
    - main [ref=e66]:
      - generic [ref=e67]:
        - generic [ref=e68]:
          - heading "Welcome back, Abdul" [level=1] [ref=e69]
          - paragraph [ref=e70]: Razak Fast Delivery — MOTORBIKE Portal
        - generic [ref=e71]:
          - generic [ref=e72]:
            - img [ref=e74]
            - generic [ref=e79]:
              - paragraph [ref=e80]: "0"
              - paragraph [ref=e81]: Active Deliveries
          - generic [ref=e82]:
            - img [ref=e84]
            - generic [ref=e87]:
              - paragraph [ref=e88]: "1"
              - paragraph [ref=e89]: Completed
          - generic [ref=e90]:
            - img [ref=e92]
            - generic [ref=e94]:
              - paragraph [ref=e95]: GH₵0.00
              - paragraph [ref=e96]: Total Earnings
          - generic [ref=e97]:
            - img [ref=e99]
            - generic [ref=e101]:
              - paragraph [ref=e102]: 4.7 / 5
              - paragraph [ref=e103]: Rating
        - generic [ref=e104]:
          - generic [ref=e105]:
            - heading "Available Transport Requests" [level=2] [ref=e106]
            - paragraph [ref=e107]: Accept requests to earn money on deliveries
          - generic [ref=e108]:
            - generic [ref=e110]:
              - generic [ref=e111]:
                - generic [ref=e113]: PENDING
                - generic [ref=e114]:
                  - generic [ref=e115]:
                    - img [ref=e116]
                    - generic [ref=e119]: "From: Tamale Central Market"
                  - generic [ref=e120]:
                    - img [ref=e121]
                    - generic [ref=e124]: "To: Bolgatanga"
                  - generic [ref=e125]:
                    - img [ref=e126]
                    - generic [ref=e128]: 5 Jul 2026
                  - generic [ref=e130]: "Requester: Kofi Mensah"
              - button "Accept" [ref=e132]
            - generic [ref=e134]:
              - generic [ref=e135]:
                - generic [ref=e136]:
                  - generic [ref=e137]: PENDING
                  - generic [ref=e138]: ~GH₵807.60
                - generic [ref=e139]:
                  - generic [ref=e140]:
                    - img [ref=e141]
                    - generic [ref=e144]: "From: My location"
                  - generic [ref=e145]:
                    - img [ref=e146]
                    - generic [ref=e149]: "To: 9.0885, -1.8210"
                  - generic [ref=e150]:
                    - img [ref=e151]
                    - generic [ref=e153]: 1 Jul 2026
                  - generic [ref=e155]: "Requester: Christian"
              - button "Accept" [ref=e157]
  - button "Open Next.js Dev Tools" [ref=e163] [cursor=pointer]:
    - img [ref=e164]
  - alert [ref=e167]
```

# Test source

```ts
  1   | import { test, expect, Page } from "@playwright/test";
  2   | 
  3   | async function loginAs(page: Page, phone: string, password: string) {
  4   |   await page.goto("/auth/login");
  5   |   await page.locator('input[type="tel"], input[name="phone"]').first().fill(phone);
  6   |   await page.locator('input[type="password"]').first().fill(password);
  7   |   await page.locator('button[type="submit"]').click();
  8   |   await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 15000 }).catch(() => {});
  9   | }
  10  | 
  11  | function collectErrors(page: Page) {
  12  |   const errors: string[] = [];
  13  |   page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  14  |   page.on("pageerror", (err) => errors.push("PAGEERROR: " + err.message));
  15  |   return errors;
  16  | }
  17  | 
  18  | test.describe("Logistics portal", () => {
  19  |   test("dashboard loads, sidebar, logo link", async ({ page }) => {
  20  |     const errors = collectErrors(page);
  21  |     await loginAs(page, "0244000020", "password123");
  22  |     await page.goto("/logistics/dashboard");
  23  |     await page.waitForLoadState("domcontentloaded");
  24  |     await page.waitForTimeout(1500);
  25  |     await page.screenshot({ path: "tests/screenshots/logistics-dashboard-full.png", fullPage: true });
  26  |     expect(page.url()).toContain("/logistics/dashboard");
  27  |     console.log("DASHBOARD ERRORS:", errors);
  28  | 
  29  |     // Logo link
  30  |     const logo = page.locator('a:has-text("Lorgric")').first();
  31  |     if (await logo.count() > 0) {
> 32  |       await logo.click();
      |                  ^ Error: locator.click: Test timeout of 30000ms exceeded.
  33  |       await page.waitForTimeout(800);
  34  |       console.log("Logo click landed on:", page.url());
  35  |     }
  36  |   });
  37  | 
  38  |   test("sidebar collapse toggle", async ({ page }) => {
  39  |     await loginAs(page, "0244000020", "password123");
  40  |     await page.goto("/logistics/dashboard");
  41  |     await page.waitForTimeout(1000);
  42  |     const collapseBtn = page.locator('button[aria-label*="ollapse" i], button[aria-label*="xpand" i]').first();
  43  |     const found = await collapseBtn.count();
  44  |     console.log("Collapse button found:", found);
  45  |     if (found > 0) {
  46  |       await collapseBtn.click();
  47  |       await page.waitForTimeout(400);
  48  |       await page.screenshot({ path: "tests/screenshots/logistics-sidebar-collapsed.png" });
  49  |       await collapseBtn.click();
  50  |       await page.waitForTimeout(400);
  51  |     }
  52  |   });
  53  | 
  54  |   test("requests page: timing + accept/reject flow", async ({ page }) => {
  55  |     const errors = collectErrors(page);
  56  |     await loginAs(page, "0244000020", "password123");
  57  |     const start = Date.now();
  58  |     await page.goto("/logistics/requests");
  59  |     try {
  60  |       await page.waitForLoadState("networkidle", { timeout: 15000 });
  61  |       console.log(`requests page reached networkidle in ${Date.now() - start}ms`);
  62  |     } catch {
  63  |       console.log(`requests page did NOT reach networkidle within 15s (took full timeout). Console errors so far:`, errors);
  64  |     }
  65  |     await page.waitForTimeout(1000);
  66  |     await page.screenshot({ path: "tests/screenshots/logistics-requests-full.png", fullPage: true });
  67  | 
  68  |     const pendingCards = page.locator("text=/PENDING/");
  69  |     const pendingCount = await pendingCards.count();
  70  |     console.log("Pending request cards visible:", pendingCount);
  71  | 
  72  |     const acceptBtn = page.locator('button:has-text("Accept")').first();
  73  |     if (await acceptBtn.count() > 0) {
  74  |       await acceptBtn.click();
  75  |       await page.waitForTimeout(500);
  76  |       // Accept dialog should appear with a date field
  77  |       const dialogVisible = await page.locator('[role="dialog"], input[type="date"]').count();
  78  |       console.log("Accept dialog/date input visible after clicking Accept:", dialogVisible);
  79  |       await page.screenshot({ path: "tests/screenshots/logistics-accept-dialog.png" });
  80  |       const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Accept")').last();
  81  |       if (await confirmBtn.count() > 0) {
  82  |         await confirmBtn.click();
  83  |         await page.waitForTimeout(1500);
  84  |         await page.screenshot({ path: "tests/screenshots/logistics-after-accept.png", fullPage: true });
  85  |       }
  86  |     } else {
  87  |       console.log("No PENDING request with an Accept button found — nothing to accept.");
  88  |     }
  89  |     console.log("REQUESTS PAGE ERRORS:", errors);
  90  |   });
  91  | 
  92  |   test("deliveries page: map + handoff dialog", async ({ page }) => {
  93  |     const errors = collectErrors(page);
  94  |     await loginAs(page, "0244000020", "password123");
  95  |     await page.goto("/logistics/deliveries");
  96  |     await page.waitForLoadState("domcontentloaded");
  97  |     await page.waitForTimeout(2000);
  98  |     await page.screenshot({ path: "tests/screenshots/logistics-deliveries-full.png", fullPage: true });
  99  | 
  100 |     const mapEl = await page.locator(".leaflet-container").count();
  101 |     console.log("Leaflet map containers on deliveries page:", mapEl);
  102 | 
  103 |     const handoffBtn = page.locator('button:has-text("Hand off")').first();
  104 |     if (await handoffBtn.count() > 0) {
  105 |       await handoffBtn.click();
  106 |       await page.waitForTimeout(800);
  107 |       await page.screenshot({ path: "tests/screenshots/logistics-handoff-dialog.png" });
  108 |       const riderOptions = await page.locator('[role="dialog"] button').count();
  109 |       console.log("Rider option buttons in handoff dialog:", riderOptions);
  110 |       // Try selecting first rider option and confirming
  111 |       const riderBtn = page.locator('[role="dialog"] button').filter({ hasText: /./ }).nth(0);
  112 |       if (await riderBtn.count() > 0) {
  113 |         await riderBtn.click().catch(() => {});
  114 |         await page.waitForTimeout(300);
  115 |         const confirmHandoff = page.locator('button:has-text("Confirm hand-off")');
  116 |         if (await confirmHandoff.count() > 0) {
  117 |           await confirmHandoff.click();
  118 |           await page.waitForTimeout(1500);
  119 |           await page.screenshot({ path: "tests/screenshots/logistics-after-handoff.png", fullPage: true });
  120 |         }
  121 |       }
  122 |     } else {
  123 |       console.log("No 'Hand off' button found — no active delivery to hand off.");
  124 |     }
  125 |     console.log("DELIVERIES PAGE ERRORS:", errors);
  126 |   });
  127 | 
  128 |   test("complaints page reachable", async ({ page }) => {
  129 |     const errors = collectErrors(page);
  130 |     await loginAs(page, "0244000020", "password123");
  131 |     await page.goto("/logistics/complaints");
  132 |     await page.waitForTimeout(1500);
```