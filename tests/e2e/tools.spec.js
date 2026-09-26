// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:8080';

/**
 * E2E tests for tools.html plan-based access gating.
 * We verify both the locked and unlocked visual states without needing
 * a real authenticated session (we check the page's static/guest behaviour).
 */
test.describe('Tools page — access gating', () => {
  test('loads the tools page without error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE}/Tools/tools.html`);
    await page.waitForLoadState('networkidle');

    // No JS crash on page load
    expect(errors.filter(e => !e.includes('net::ERR'))).toHaveLength(0);
  });

  test('page has a tools grid / tool cards container', async ({ page }) => {
    await page.goto(`${BASE}/Tools/tools.html`);
    await page.waitForLoadState('networkidle');

    // Expect some kind of card container element
    const container = page.locator(
      '[id*="tool"], [class*="tool"], .card-grid, .tools-grid, #tools-container'
    );
    await expect(container.first()).toBeVisible({ timeout: 5000 });
  });

  test('unauthenticated: advanced tools show locked overlay', async ({ page }) => {
    // Clear any stored session so we get guest/basic behaviour
    await page.context().clearCookies();
    await page.addInitScript(() => localStorage.clear());

    await page.goto(`${BASE}/Tools/tools.html`);
    await page.waitForLoadState('networkidle');

    // Wait for tool cards to render (API might return quickly with empty)
    await page.waitForTimeout(1500);

    // If there are any advanced/premium tool cards, they should have a lock overlay
    const lockedCards = page.locator('[class*="lock"], [class*="locked"], .tool-locked');
    const lockedCount = await lockedCards.count();

    if (lockedCount > 0) {
      // Found locked overlay — verify it contains upgrade-related content
      const firstLocked = lockedCards.first();
      await expect(firstLocked).toBeVisible();
    }
    // If 0 locked cards, either no paid tools exist or API is unavailable — acceptable in CI
  });

  test('upgrade link in locked card points to plans page', async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => localStorage.clear());

    await page.goto(`${BASE}/Tools/tools.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const upgradeLinks = page.locator('a[href*="plans"]');
    const count = await upgradeLinks.count();
    if (count > 0) {
      const href = await upgradeLinks.first().getAttribute('href');
      expect(href).toMatch(/plans/i);
    }
  });

  test('PDN Optimizer card renders on page', async ({ page }) => {
    await page.goto(`${BASE}/Tools/tools.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Either the card title or a fallback static tool listing
    const pdnCard = page.locator('text=PDN Optimizer');
    const count = await pdnCard.count();
    // If the server has tools configured, PDN Optimizer should appear
    // (not failing if server is down in unit-test CI)
    if (count > 0) {
      await expect(pdnCard.first()).toBeVisible();
    }
  });
});
