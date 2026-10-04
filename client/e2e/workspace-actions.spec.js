import { expect, test } from '@playwright/test';

const token = 'e2e-workspace-actions-token';
const user = {
  _id: 'user-workspace-actions',
  name: 'Workspace Owner',
  email: 'owner@example.test',
  role: 'member',
  avatar: '',
};
const workspace = {
  _id: 'workspace-actions',
  name: 'Actions Workspace',
  owner: user._id,
  members: [{ user, role: 'OWNER' }],
};

async function authenticate(page) {
  await page.addInitScript((accessToken) => {
    localStorage.setItem('syncspace_access_token', accessToken);
  }, token);
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { success: true, data: { user } } }),
  );
  await page.route('**/api/notifications**', (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  );
}

test('workspace card actions open workspace settings and delete for the owner', async ({ page }) => {
  await authenticate(page);
  let deleted = false;
  await page.route('**/api/workspaces**', async (route) => {
    if (route.request().method() === 'DELETE') {
      deleted = true;
      await route.fulfill({ json: { success: true, data: {} } });
      return;
    }
    if (route.request().method() === 'GET' && route.request().url().endsWith('/workspace-actions')) {
      await route.fulfill({ json: { success: true, data: workspace } });
      return;
    }
    await route.fulfill({
      json: { success: true, data: deleted ? [] : [workspace] },
    });
  });
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/workspaces');
  const actions = page.getByLabel('Actions for Actions Workspace');
  await actions.click();
  await expect(page.getByRole('menuitem', { name: 'Open workspace' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Workspace settings' })).toHaveAttribute(
    'href',
    '/workspace/workspace-actions/settings',
  );
  await page.getByRole('menuitem', { name: 'Delete workspace' }).click();
  await expect.poll(() => deleted).toBe(true);
  await expect(page.getByText('Actions Workspace')).toHaveCount(0);
});

test('member row actions let the owner open the invite form', async ({ page }) => {
  await authenticate(page);
  await page.route('**/api/workspaces**', (route) => {
    const data = route.request().url().endsWith('/workspace-actions') ? workspace : [workspace];
    return route.fulfill({ json: { success: true, data } });
  });

  await page.goto('/workspace/workspace-actions/members');
  await expect(page.getByRole('heading', { name: 'Workspace Members' })).toBeVisible();
  await page.getByLabel('Actions for Workspace Owner').click();
  await page.getByRole('menuitem', { name: 'Invite member' }).click();
  await expect(page.getByRole('dialog', { name: 'Invite member' })).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
});
