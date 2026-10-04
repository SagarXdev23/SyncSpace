import { expect, test } from '@playwright/test';

const token = 'e2e-messages-token';
const existingWorkspace = {
  _id: 'workspace-existing',
  name: 'Existing Workspace',
  members: [{ user: 'user-messages' }],
};

test('messages plus button creates and selects a workspace channel', async ({ page }) => {
  await page.addInitScript((accessToken) => {
    localStorage.setItem('syncspace_access_token', accessToken);
  }, token);

  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          user: {
            _id: 'user-messages',
            name: 'Message Tester',
            email: 'messages@example.test',
            role: 'member',
            avatar: '',
          },
        },
      },
    }),
  );
  let createdWorkspace;
  let createRequest;
  await page.route('**/api/workspaces', async (route) => {
    if (route.request().method() === 'POST') {
      createRequest = {
        contentType: route.request().headers()['content-type'],
        body: route.request().postData(),
      };
      createdWorkspace = {
        _id: 'workspace-created',
        name: 'New Message Space',
        logo: 'https://res.cloudinary.com/example/workspace.png',
        members: [{ user: 'user-messages' }],
      };
      await route.fulfill({
        json: { success: true, data: createdWorkspace },
      });
      return;
    }
    await route.fulfill({ json: { success: true, data: [existingWorkspace] } });
  });
  await page.route('**/api/notifications', (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  );
  await page.route('**/api/messages/**', (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  );

  await page.goto('/messages');
  await expect(page.getByRole('heading', { name: 'All Messages' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create workspace channel' })).toBeVisible();

  await page.getByRole('button', { name: 'Create workspace channel' }).click();
  await expect(page.getByRole('heading', { name: 'Create Workspace' })).toBeVisible();
  await page.getByLabel('Workspace Name').fill('New Message Space');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'workspace-logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from('test image'),
  });
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  await expect(page.getByRole('img', { name: 'New Message Space' })).toBeVisible();
  await expect(page.getByRole('button', { name: /New Message Space/ })).toBeVisible();
  expect(createdWorkspace?._id).toBe('workspace-created');
  expect(createRequest.contentType).toMatch(/^multipart\/form-data; boundary=/);
  expect(createRequest.body).toContain('workspace-logo.png');
});
