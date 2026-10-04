import { expect, test } from '@playwright/test';

const token = 'e2e-access-token';
const initialUser = {
  _id: 'user-e2e',
  name: 'Demo User',
  email: 'demo@example.test',
  role: 'member',
  bio: '',
  avatar: '',
};

test('login restores the authenticated profile and safe redirect', async ({ page }) => {
  let submittedCredentials;
  await page.route('**/api/auth/login', async (route) => {
    submittedCredentials = route.request().postDataJSON();
    await route.fulfill({
      json: {
        success: true,
        data: { accessToken: token, user: initialUser },
      },
    });
  });
  await page.route('**/api/workspaces**', (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  );
  await page.route('**/api/notifications**', (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  );

  await page.goto('/login?redirect=%2Fprofile');
  await page.getByLabel('Email').fill(initialUser.email);
  await page.getByRole('textbox', { name: 'Password' }).fill('A-test-password-123');
  await page.getByRole('button', { name: 'Login', exact: true }).click();

  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { name: initialUser.name })).toBeVisible();
  expect(submittedCredentials).toEqual({
    email: initialUser.email,
    password: 'A-test-password-123',
  });
});

async function openProfile(page) {
  await page.addInitScript((accessToken) => {
    localStorage.setItem('syncspace_access_token', accessToken);
  }, token);

  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { success: true, data: { user: initialUser } } }),
  );
  await page.route('**/api/workspaces**', (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  );
  await page.route('**/api/notifications**', (route) =>
    route.fulfill({ json: { success: true, data: [] } }),
  );

  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Demo User' })).toBeVisible();
}

test('profile edits persist the name and bio in auth state', async ({ page }) => {
  await openProfile(page);

  let savedProfile;
  await page.route('**/api/auth/profile', async (route) => {
    savedProfile = route.request().postDataJSON();
    await route.fulfill({
      json: {
        success: true,
        data: { user: { ...initialUser, ...savedProfile } },
      },
    });
  });

  await page.getByLabel('Full Name').fill('Updated User');
  await page.getByLabel('Bio').fill('Ready for the next launch.');
  await page.getByRole('button', { name: 'Update Profile' }).click();

  await expect(page.getByRole('heading', { name: 'Updated User' })).toBeVisible();
  await expect(page.getByText('Profile updated')).toBeVisible();
  expect(savedProfile).toEqual({ name: 'Updated User', bio: 'Ready for the next launch.' });
});

test('account menu logs out, clears the saved token, and returns to login', async ({ page }) => {
  await openProfile(page);
  let logoutRequested = false;
  await page.route('**/api/auth/logout', async (route) => {
    logoutRequested = true;
    await route.fulfill({ json: { success: true, message: 'Logged out', data: {} } });
  });

  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  expect(logoutRequested).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('syncspace_access_token'))).toBeNull();
});

test('uploaded profile photo is rendered by the profile and app header', async ({ page }) => {
  await openProfile(page);

  await page.route('**/api/auth/profile/avatar', async (route) => {
    const request = route.request();
    expect(request.method()).toBe('POST');
    expect(request.headers()['content-type']).toContain('multipart/form-data');
    await route.fulfill({
      json: {
        success: true,
        data: {
          user: { ...initialUser, avatar: 'https://cdn.syncspace.test/demo-avatar.png' },
        },
      },
    });
  });
  await page.route('https://cdn.syncspace.test/**', (route) =>
    route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=',
        'base64',
      ),
    }),
  );

  await page.getByLabel('Choose profile photo').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from('valid test image'),
  });

  await expect(page.getByText('Profile photo updated')).toBeVisible();
  await expect(page.locator('img[src="https://cdn.syncspace.test/demo-avatar.png"]')).toHaveCount(2);
});

test('profile photo picker rejects non-image files without an upload request', async ({ page }) => {
  await openProfile(page);
  let uploadRequested = false;
  await page.route('**/api/auth/profile/avatar', (route) => {
    uploadRequested = true;
    return route.fulfill({ status: 500 });
  });

  await page.getByLabel('Choose profile photo').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  });

  await expect(page.getByText('Choose an image file')).toBeVisible();
  expect(uploadRequested).toBe(false);
});
