import { test, expect } from '@playwright/test';

test('public demo stays empty and cannot open agency pages', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Public demo login')).toBeVisible();
  await expect(page.getByText(/agency administrator se contact/)).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill('demo@clienthub.example');
  await page.getByLabel('Password', { exact: true }).fill('Demo@ClientHub123');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole('heading', { name: 'Demo Workspace' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Clients', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Change password' })).toHaveCount(0);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/demo$/);
  await page.goto('/invoices');
  await expect(page).toHaveURL(/\/demo$/);
  await page.goto('/change-password');
  await expect(page).toHaveURL(/\/demo$/);
});

test('old reset links explain administrator-managed recovery', async ({ page }) => {
  await page.goto('/reset-password?token=old-link');
  await expect(page.getByRole('heading', { name: 'Need help signing in?' })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('admin creates a team account; first login requires its own password', async ({ page, request }) => {
  test.skip(process.env.CLIENTHUB_ACCOUNT_TESTS !== 'true', 'Run against the disposable account-test database.');
  const api = process.env.TEST_API_URL!;
  const email = `browser-${Date.now()}@account-test.example`;
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@clienthub.com');
  await page.getByLabel('Password', { exact: true }).fill('Admin@ClientHub.Passcode');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByRole('link', { name: /Team & Accounts/ }).click();
  await page.getByLabel('Full name').fill('Browser Team Member');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Create team account', exact: true }).click();
  const temporaryPassword = await page.getByRole('status').locator('code').innerText();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(temporaryPassword);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/change-password$/);
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/change-password$/);
  await page.getByLabel('Temporary password', { exact: true }).fill(temporaryPassword);
  await page.getByLabel('New password', { exact: true }).fill('Browser@Personal123');
  await page.getByLabel('Confirm new password').fill('Browser@Personal123');
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page).toHaveURL(/\/team$/);
  await expect(page.getByText('Nothing assigned to you')).toBeVisible();
  const result = await request.post(api + '/auth/login', { data: { email, password: temporaryPassword } });
  expect(result.status()).toBe(401);
});

test('admin creates and resets a linked client login', async ({ page }) => {
  test.skip(process.env.CLIENTHUB_ACCOUNT_TESTS !== 'true', 'Run against the disposable account-test database.');
  const email = `browser-client-${Date.now()}@account-test.example`;
  async function signIn(address: string, password: string) {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(address);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  }
  async function signOut() {
    await page.getByRole('button', { name: 'Logout', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  }
  async function setPassword(temporary: string, password: string) {
    await expect(page).toHaveURL(/\/change-password$/);
    await page.getByLabel('Temporary password', { exact: true }).fill(temporary);
    await page.getByLabel('New password', { exact: true }).fill(password);
    await page.getByLabel('Confirm new password').fill(password);
    await page.getByRole('button', { name: 'Save password' }).click();
    await expect(page).toHaveURL(/\/client$/);
  }
  await signIn('admin@clienthub.com', 'Admin@ClientHub.Passcode');
  await page.getByRole('link', { name: /Clients$/ }).click();
  await page.getByRole('button', { name: '+ Add Client', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Client' });
  await dialog.getByLabel('Name', { exact: true }).fill('Browser Client');
  await dialog.getByLabel('Contact email').fill(email);
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  const temporary = await page.getByRole('status').locator('code').innerText();
  await signOut();
  await signIn(email, temporary);
  await setPassword(temporary, 'Client@Personal123');
  await expect(page.getByRole('heading', { name: 'My Dashboard' })).toBeVisible();
  await signOut();
  await signIn('admin@clienthub.com', 'Admin@ClientHub.Passcode');
  await page.getByRole('link', { name: /Team & Accounts/ }).click();
  const row = page.getByRole('row').filter({ hasText: email });
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: 'Reset password', exact: true }).click();
  const resetTemporary = await page.getByRole('status').locator('code').innerText();
  expect(resetTemporary).not.toBe(temporary);
  await signOut();
  await signIn(email, resetTemporary);
  await setPassword(resetTemporary, 'Client@Changed123');
});
