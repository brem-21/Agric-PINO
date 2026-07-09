# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: example.spec.ts >> login page is accessible
- Location: tests/e2e/example.spec.ts:8:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /sign in/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: /sign in/i })

```

```yaml
- img "Farmer preparing his oxen to plough a field in Ghana"
- img "Farmer with a freshly harvested pile of maize"
- img "Woman milking a cow at a Northern Ghana homestead"
- img "Farmer setting up irrigation for his field"
- img "Farmer harvesting cucumbers by hand"
- img "Farmer standing in a cleared field, hoe in hand"
- img "Vegetable seller at a market in Tamale, Northern Ghana"
- img "Motorbike rider ready for a delivery run in Northern Ghana"
- heading "Lorgric" [level=1]
- paragraph: Northern Ghana's Agricultural Marketplace
- heading "Welcome back" [level=3]
- paragraph: Sign in with your phone number
- text: Phone Number
- textbox "Phone Number":
  - /placeholder: 0244 000 000
- text: Password
- textbox "Password":
  - /placeholder: Enter your password
- button
- button "Sign In"
- paragraph:
  - text: Don't have an account?
  - link "Create one for free":
    - /url: /auth/register
- paragraph: Lorgric · Northern Savannah Zone, Ghana
- alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("homepage loads", async ({ page }) => {
  4  |   await page.goto("/");
  5  |   await expect(page).toHaveTitle(/Lorgric/i);
  6  | });
  7  | 
  8  | test("login page is accessible", async ({ page }) => {
  9  |   await page.goto("/auth/login");
> 10 |   await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
     |                                                                 ^ Error: expect(locator).toBeVisible() failed
  11 | });
  12 | 
```