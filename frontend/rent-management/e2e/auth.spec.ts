import { expect, test } from '@playwright/test';

const demoAccounts = [
  {
    role: 'ROLE_ADMIN',
    username: 'admin@demo.com',
    password: process.env['KEYCLOAK_DEMO_ADMIN_PASSWORD'],
    portalPath: '/admin/dashboard',
  },
  {
    role: 'ROLE_LANDLORD',
    username: 'landlord@demo.com',
    password: process.env['KEYCLOAK_DEMO_LANDLORD_PASSWORD'],
    portalPath: '/landlord/dashboard',
  },
  {
    role: 'ROLE_TENANT',
    username: 'tenant@demo.com',
    password: process.env['KEYCLOAK_DEMO_TENANT_PASSWORD'],
    portalPath: '/tenant/dashboard',
  },
];

const adminAccount = demoAccounts[0];

async function loginAsAdmin(page: import('@playwright/test').Page) {
  test.skip(!adminAccount.password, 'Set KEYCLOAK_DEMO_ADMIN_PASSWORD in the repository-root .env to test admin pages.');

  await loginAs(page, adminAccount);
}

async function loginAsLandlord(page: import('@playwright/test').Page) {
  const account = demoAccounts[1];
  test.skip(!account.password, 'Set KEYCLOAK_DEMO_LANDLORD_PASSWORD in the repository-root .env to test landlord pages.');

  await loginAs(page, account);
}

async function loginAs(
  page: import('@playwright/test').Page,
  account: typeof demoAccounts[number]
) {
  await page.goto('/auth/login');
  await page.getByRole('button', { name: /Güvenli giriş için devam et/i }).click();
  await page.locator('input[name="username"]').fill(account.username);
  await page.locator('input[name="password"]').fill(account.password!);
  await page.getByRole('button', { name: /Sign In/i }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 60_000 }).toBe(account.portalPath);
}

test('serves runtime configuration and opens the login screen', async ({ page }) => {
  const configResponse = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/assets/app-config.json');

  await page.goto('/');

  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(page.getByRole('button', { name: /Güvenli giriş için devam et/i })).toBeVisible();
  expect((await configResponse).ok()).toBe(true);
});

test('starts the OIDC authorization-code flow against the configured realm', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByRole('button', { name: /Güvenli giriş için devam et/i }).click();

  await expect(page).toHaveURL(/\/realms\/rent-management\/protocol\/openid-connect\/auth/);
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

for (const account of demoAccounts) {
  test(`authenticates the ${account.role} demo account and routes to its portal`, async ({ page }) => {
    test.skip(!account.password, `Set the matching local .env password variable to test ${account.role}.`);

    await page.goto('/auth/login');
    await page.getByRole('button', { name: /Güvenli giriş için devam et/i }).click();
    await page.locator('input[name="username"]').fill(account.username);
    await page.locator('input[name="password"]').fill(account.password!);
    await page.getByRole('button', { name: /Sign In/i }).click();

    await expect.poll(() => new URL(page.url()).pathname, { timeout: 60_000 }).toBe(account.portalPath);
  });
}

test('loads administrative statistics and exits its loading state', async ({ page }) => {
  await loginAsAdmin(page);

  await expect(page.locator('.stat-card__value').first()).not.toHaveText('…', { timeout: 30_000 });
  await expect(page.locator('.alert--danger')).toBeHidden();
});

test('loads the admin user list and exits its loading state', async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole('link', { name: /Kullanıcı Yönetimi/ }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);

  await expect(page.getByRole('button', { name: /Yenile/ })).toBeEnabled({ timeout: 30_000 });
  await expect(page.locator('.alert--danger')).toBeHidden();
  await expect(page.getByText('Henüz kullanıcı kaydı bulunmuyor.')
    .or(page.locator('tbody tr').first())).toBeVisible();
});

test('loads the saga monitor and exits its loading state', async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole('link', { name: /Saga Monitor/ }).click();
  await expect(page).toHaveURL(/\/admin\/saga-monitor$/);

  await expect(page.getByRole('button', { name: /Yenile/ })).toBeEnabled({ timeout: 30_000 });
  await expect(page.locator('.alert--danger')).toBeHidden();
  await expect(page.getByText('İzlenecek saga kaydı bulunmuyor.')
    .or(page.locator('.saga-card').first())).toBeVisible();
});

for (const target of [
  { path: '/landlord/properties', link: /Mülklerim/, heading: 'Mülklerim', loading: 'Mülkler yükleniyor...' },
  { path: '/landlord/tenants', link: /Kiracılarım/, heading: 'Kiracılarım', loading: 'Kiracılar yükleniyor...' },
  { path: '/landlord/maintenance', link: /Bakım Talepleri/, heading: 'Bakım talepleri', loading: 'Bakım talepleri yükleniyor...' },
  { path: '/landlord/income-report', link: /Gelir Raporu/, heading: 'Gelir Raporu', loading: 'Gelir raporu yükleniyor...' },
]) {
  test(`completes the landlord page loading state at ${target.path}`, async ({ page }) => {
    await loginAsLandlord(page);
    await page.getByRole('link', { name: target.link }).click();
    await expect(page).toHaveURL(new RegExp(`${target.path}$`));

    await expect(page.getByRole('heading', { name: target.heading })).toBeVisible();
    await expect(page.getByText(target.loading, { exact: true })).toBeHidden({ timeout: 30_000 });
    await expect(page.locator('.alert--danger')).toBeHidden();
    if (target.path === '/landlord/income-report') {
      await expect(page.getByText('Gerçekleşen tahsilat')).toBeVisible();
      await expect(page.locator('tbody tr')).toHaveCount(12);
    }
  });
}

test('shows landlord lease details in Turkish locale without truncating identifiers', async ({ page }) => {
  await loginAsLandlord(page);
  const leaseResponsePromise = page.waitForResponse(response =>
    new URL(response.url()).pathname.includes('/api/leases/landlord/'));
  await page.getByRole('link', { name: /Sözleşmeler/ }).click();
  await expect(page).toHaveURL(/\/landlord\/leases$/);

  const leaseResponse = await leaseResponsePromise;
  expect(leaseResponse.ok()).toBe(true);
  const leases = await leaseResponse.json() as Array<Record<string, unknown>>;
  expect(Number(leases[0]?.['monthlyRentAmount'])).toBeGreaterThan(0);
  expect(Number(leases[0]?.['depositAmount'])).toBeGreaterThanOrEqual(0);
  expect(leases[0]?.['startDate']).toBeTruthy();
  expect(leases[0]?.['endDate']).toBeTruthy();

  const leaseCard = page.locator('.lease-card').first();
  await expect(leaseCard).toBeVisible({ timeout: 30_000 });
  await expect(leaseCard.getByText('Mülk ID:', { exact: true })).toBeVisible();
  await expect(leaseCard.getByText('Kiracı ID:', { exact: true })).toBeVisible();
  await expect(leaseCard.locator('.value--id')).toHaveCount(2);
  await expect(leaseCard.locator('.value--id').first()).toHaveText(/^[0-9a-f-]{36}$/i);
  await expect(leaseCard.getByText(/^\d{2}\.\d{2}\.\d{4}$/).first()).toBeVisible();
  await expect(leaseCard.locator('.value.currency').first()).toHaveText('24.000,00 ₺');
});

test('downloads an active landlord lease as a PDF', async ({ page }) => {
  await loginAsLandlord(page);
  await page.getByRole('link', { name: /Sözleşmeler/ }).click();
  await expect(page).toHaveURL(/\/landlord\/leases$/);

  const downloadButton = page.getByRole('button', { name: 'PDF İndir' }).first();
  await expect(downloadButton).toBeEnabled({ timeout: 30_000 });
  const downloadPromise = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^kira-sozlesmesi-[0-9a-f-]+\.pdf$/i);
  await expect(page.getByText('Sözleşme PDF olarak indirildi.')).toBeVisible();
});

test('loads tenant notifications and clears the notification loading message', async ({ page }) => {
  const tenantAccount = demoAccounts[2];
  test.skip(!tenantAccount.password, 'Set KEYCLOAK_DEMO_TENANT_PASSWORD in the repository-root .env to test tenant notifications.');

  await loginAs(page, tenantAccount);
  await page.getByRole('button', { name: 'Bildirimleri görüntüle' }).click();

  await expect(page.getByText('Bildirimler yükleniyor...', { exact: true })).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText('Bildirimler şu anda yüklenemiyor.').or(
    page.getByText('Henüz uygulama bildiriminiz yok.').or(page.locator('.notification-item').first())
  )).toBeVisible();
});

test('requires tenant confirmation before creating a simulated rent payment', async ({ page }) => {
  const tenantAccount = demoAccounts[2];
  test.skip(!tenantAccount.password, 'Set KEYCLOAK_DEMO_TENANT_PASSWORD in the repository-root .env to test tenant payments.');

  let paymentRequests = 0;
  await page.route('**/api/payments/rent', async route => {
    paymentRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ paymentId: 'e2e-payment', status: 'SUCCESS', isSimulated: true })
    });
  });

  await loginAs(page, tenantAccount);
  await page.getByRole('link', { name: /Kira Öde/ }).click();
  const leaseSelector = page.locator('#payment-lease');
  await expect(leaseSelector).toBeVisible({ timeout: 30_000 });
  await leaseSelector.selectOption({ index: 1 });

  await page.getByRole('button', { name: 'Kira ödemesini simüle et' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Ödemeyi onaylıyor musunuz?' });
  await expect(confirmation).toContainText('tutarında demo kaydı oluşturulacak');
  await expect(confirmation).toContainText('gerçek para tahsil edilmeyecek');
  await confirmation.getByRole('button', { name: 'İptal' }).click();
  await expect(confirmation).toBeHidden();
  expect(paymentRequests).toBe(0);

  await page.getByRole('button', { name: 'Kira ödemesini simüle et' }).click();
  await confirmation.getByRole('button', { name: 'Evet, onayla' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Demo ödeme başarıyla kaydedildi' })).toBeVisible();
  await expect(page.getByText('Demo ödeme kaydedildi', { exact: true })).toBeVisible();
  expect(paymentRequests).toBe(1);
});

for (const target of [
  { path: '/tenant/dashboard', link: /Dashboard/, loading: 'Gösterge paneli yükleniyor...' },
  { path: '/tenant/payment', link: /Kira Öde/, loading: 'Sözleşmeleriniz yükleniyor...' },
  { path: '/tenant/payment-history', link: /Ödeme Geçmişi/, loading: 'Ödeme geçmişi yükleniyor...' },
  { path: '/tenant/maintenance', link: /Bakım Talepleri/, loading: 'Bakım talepleri yükleniyor...' },
]) {
  test(`completes the tenant page loading state at ${target.path}`, async ({ page }) => {
    const tenantAccount = demoAccounts[2];
    test.skip(!tenantAccount.password, 'Set KEYCLOAK_DEMO_TENANT_PASSWORD in the repository-root .env to test tenant pages.');

    await loginAs(page, tenantAccount);
    if (target.path !== '/tenant/dashboard') {
      await page.getByRole('link', { name: target.link }).click();
    }
    await expect(page).toHaveURL(new RegExp(`${target.path}$`));

    await expect(page.getByText(target.loading, { exact: true })).toBeHidden({ timeout: 30_000 });
    await expect(page.locator('.alert--danger')).toBeHidden();
    if (target.path === '/tenant/payment') {
      await expect(page.getByText('Sözleşme bilgileri yüklenemedi.').or(page.getByText('Ödeme yapılabilecek aktif sözleşme bulunamadı.'))
        .or(page.locator('#payment-lease'))).toBeVisible();
    } else if (target.path === '/tenant/payment-history') {
      await expect(page.getByText('Henüz ödeme kaydı bulunmuyor.')
        .or(page.locator('tbody tr').first())).toBeVisible();
    } else if (target.path === '/tenant/maintenance') {
      await expect(page.getByText('Henüz bakım talebiniz yok.')
        .or(page.locator('.grid > .card').first())).toBeVisible();
    } else {
      await expect(page.getByText('Sözleşme kaydı bulunamadı')
        .or(page.locator('.stat-card__value').first())).toBeVisible();
    }
  });
}
