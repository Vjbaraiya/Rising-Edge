// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Authentication', () => {
  // ── Login page ───────────────────────────────────────────────────────────
  test.describe('Login page', () => {
    test('renders login form', async ({ page }) => {
      await page.goto(`${BASE}/Login-pages/login.html`);
      await expect(page.locator('input[type="email"], input[name="email"], #email')).toBeVisible();
      await expect(page.locator('input[type="password"], #password')).toBeVisible();
      await expect(page.locator('button[type="submit"], .btn-primary')).toBeVisible();
    });

    test('shows error for empty submission', async ({ page }) => {
      await page.goto(`${BASE}/Login-pages/login.html`);
      await page.click('button[type="submit"], .btn-primary');
      // Either browser validation or JS error message
      const emailField = page.locator('input[type="email"], #email');
      const isRequired = await emailField.getAttribute('required');
      if (isRequired !== null) {
        // HTML5 validation — field becomes invalid
        const valid = await emailField.evaluate(el => el.validity.valid);
        expect(valid).toBe(false);
      } else {
        await expect(page.locator('[class*="error"], [class*="toast"], [id*="error"]')).toBeVisible(
          { timeout: 3000 }
        );
      }
    });

    test('shows error toast for wrong credentials', async ({ page }) => {
      await page.goto(`${BASE}/Login-pages/login.html`);
      await page.fill('input[type="email"], #email', 'nobody@example.com');
      await page.fill('input[type="password"], #password', 'wrongpassword');
      await page.click('button[type="submit"], .btn-primary');
      // Should see an error — either toast or inline message
      await expect(
        page.locator('[class*="error"], [class*="toast-error"], [class*="danger"]')
      ).toBeVisible({ timeout: 5000 });
    });

    test('page title references Rising Edge', async ({ page }) => {
      await page.goto(`${BASE}/Login-pages/login.html`);
      await expect(page).toHaveTitle(/rising edge/i);
    });
  });

  // ── Auth guard ───────────────────────────────────────────────────────────
  test.describe('Route guard', () => {
    test('dashboard redirects unauthenticated users to login', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();
      await page.evaluate(() => localStorage.clear());

      await page.goto(`${BASE}/User/dashboard.html`);
      // Should end up at a login page
      await expect(page).toHaveURL(/login/i, { timeout: 5000 });
    });
  });
});
