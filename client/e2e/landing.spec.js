import { expect, test } from '@playwright/test';

test('landing navigation opens the About and Pricing sections', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page).toHaveURL(/#about$/);
  await expect(page.getByRole('heading', { name: 'Less tool switching. More teamwork.' })).toBeVisible();

  await page.getByRole('link', { name: 'Pricing', exact: true }).click();
  await expect(page).toHaveURL(/#pricing$/);
  await expect(page.getByRole('heading', { name: 'Free to try while SyncSpace is in preview.' })).toBeVisible();
});

test('landing page resolves a direct Pricing hash', async ({ page }) => {
  await page.goto('/#pricing');

  await expect(page.getByRole('heading', { name: 'Free to try while SyncSpace is in preview.' })).toBeVisible();
  await expect(page).toHaveURL(/#pricing$/);
});
