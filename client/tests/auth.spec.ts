import { test, expect } from '@playwright/test';

test('login as admin and see dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'admin@clienthub.com');
  await page.fill('input[name="password"]', 'Admin@ClientHub.Passcode');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/.*admin/);
  await expect(page.locator('h1')).toContainText('Admin Dashboard');
});

test('login as client and see client dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'oscorp@clienthub.com');
  await page.fill('input[name="password"]', 'Oscorp@ClientHub.Passcode');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/.*client/);
  await expect(page.locator('h1')).toContainText('My Dashboard');
});