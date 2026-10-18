# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> downloads an active landlord lease as a PDF
- Location: e2e\auth.spec.ts:160:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForEvent: Test timeout of 60000ms exceeded.
=========================== logs ===========================
waiting for event "download"
============================================================
```

# Page snapshot

```yaml
- generic [ref=f2e4]:
  - complementary [ref=f2e5]:
    - generic [ref=f2e6]:
      - generic [ref=f2e7]:
        - generic [ref=f2e8]: 🏢
        - generic [ref=f2e9]: RentFlow
      - button "«" [ref=f2e10] [cursor=pointer]
    - navigation [ref=f2e11]:
      - link "📈 Dashboard" [ref=f2e12] [cursor=pointer]:
        - /url: /landlord/dashboard
        - generic [ref=f2e13]: 📈
        - generic [ref=f2e14]: Dashboard
      - link "🏠 Mülklerim" [ref=f2e15] [cursor=pointer]:
        - /url: /landlord/properties
        - generic [ref=f2e16]: 🏠
        - generic [ref=f2e17]: Mülklerim
      - link "👥 Kiracılarım" [ref=f2e18] [cursor=pointer]:
        - /url: /landlord/tenants
        - generic [ref=f2e19]: 👥
        - generic [ref=f2e20]: Kiracılarım
      - link "📄 Sözleşmeler" [ref=f2e21] [cursor=pointer]:
        - /url: /landlord/leases
        - generic [ref=f2e22]: 📄
        - generic [ref=f2e23]: Sözleşmeler
      - link "🔧 Bakım Talepleri" [ref=f2e24] [cursor=pointer]:
        - /url: /landlord/maintenance
        - generic [ref=f2e25]: 🔧
        - generic [ref=f2e26]: Bakım Talepleri
      - link "💰 Gelir Raporu" [ref=f2e27] [cursor=pointer]:
        - /url: /landlord/income-report
        - generic [ref=f2e28]: 💰
        - generic [ref=f2e29]: Gelir Raporu
    - button "🚪 Çıkış Yap" [ref=f2e31] [cursor=pointer]:
      - generic [ref=f2e32]: 🚪
      - generic [ref=f2e33]: Çıkış Yap
  - main [ref=f2e34]:
    - generic [ref=f2e38] [cursor=pointer]:
      - generic [ref=f2e39]: D
      - generic [ref=f2e40]:
        - generic [ref=f2e41]: Demo Landlord
        - generic [ref=f2e42]: Ev Sahibi
      - generic [ref=f2e43]: ▼
    - generic [ref=f2e46]:
      - generic [ref=f2e47]:
        - generic [ref=f2e48]:
          - heading "Kira Sözleşmeleri" [level=1] [ref=f2e49]
          - paragraph [ref=f2e50]: Tüm kira sözleşmelerinizi buradan görüntüleyip yönetebilirsiniz.
        - button "📄 Yeni Sözleşme (Wizard)" [ref=f2e51] [cursor=pointer]:
          - generic [ref=f2e52]: 📄
          - text: Yeni Sözleşme (Wizard)
      - generic [ref=f2e54]:
        - generic [ref=f2e55]:
          - heading "Yeni Sözleşme Oluştur" [level=3] [ref=f2e56]
          - button "✕" [ref=f2e57] [cursor=pointer]
        - generic [ref=f2e58]:
          - generic [ref=f2e59]:
            - generic [ref=f2e60]: Kiracı ara
            - generic [ref=f2e61]:
              - textbox "Kiracı ara" [ref=f2e62]:
                - /placeholder: Ad, soyad veya e-posta (en az 2 karakter)
              - button "Ara" [disabled] [ref=f2e63]
            - generic [ref=f2e64]: Sonuçlar
            - combobox "Sonuçlar" [disabled] [ref=f2e65]:
              - option "Kiracı seçin" [selected]
            - generic [ref=f2e66]: Kiracı aramak için en az 2 karakter girin. Kiracının önce RentFlow’a giriş yapması gerekir.
          - generic [ref=f2e67]:
            - generic [ref=f2e68]: İlgili Mülk
            - combobox "İlgili Mülk" [ref=f2e69]:
              - option "Mülk seçin" [selected]
          - generic [ref=f2e70]:
            - generic [ref=f2e71]: Boş Bağımsız Bölüm
            - combobox "Boş Bağımsız Bölüm" [disabled] [ref=f2e72]:
              - option "Birim seçin" [selected]
          - generic [ref=f2e73]:
            - generic [ref=f2e74]:
              - generic [ref=f2e75]: Aylık Kira (₺)
              - spinbutton "Aylık Kira (₺)" [ref=f2e76]
            - generic [ref=f2e77]:
              - generic [ref=f2e78]: Depozito (₺)
              - spinbutton "Depozito (₺)" [ref=f2e79]: "0"
          - generic [ref=f2e80]:
            - generic [ref=f2e81]:
              - generic [ref=f2e82]: Başlangıç tarihi
              - textbox "Başlangıç tarihi" [ref=f2e83]: 2026-10-09
            - generic [ref=f2e84]:
              - generic [ref=f2e85]: Bitiş tarihi
              - textbox "Bitiş tarihi" [ref=f2e86]: 2027-10-09
        - generic [ref=f2e87]:
          - button "İptal" [ref=f2e88] [cursor=pointer]
          - button "Sözleşmeyi Başlat" [disabled] [ref=f2e89]
      - article [ref=f2e91]:
        - generic [ref=f2e92]:
          - generic [ref=f2e93]: Aktif
          - generic "30000000-0000-0000-0000-000000000001" [ref=f2e94]: "#30000000-0000-0000-0000-000000000001"
        - generic [ref=f2e95]:
          - generic [ref=f2e96]:
            - generic [ref=f2e97]: "Mülk ID:"
            - generic "10000000-0000-0000-0000-000000000001" [ref=f2e98]
          - generic [ref=f2e99]:
            - generic [ref=f2e100]: "Kiracı ID:"
            - generic "954eaa2c-6f3c-4d2b-84a3-f3948e071795" [ref=f2e101]
          - generic [ref=f2e102]:
            - generic [ref=f2e103]: "Kira Bedeli:"
            - generic [ref=f2e104]: 24.000,00 ₺
          - generic [ref=f2e105]:
            - generic [ref=f2e106]: "Depozito:"
            - generic [ref=f2e107]: 24.000,00 ₺
          - generic [ref=f2e108]:
            - generic [ref=f2e109]: "Başlangıç:"
            - generic [ref=f2e110]: 01.01.2026
          - generic [ref=f2e111]:
            - generic [ref=f2e112]: "Bitiş:"
            - generic [ref=f2e113]: 01.01.2027
        - generic [ref=f2e114]:
          - button "Hazırlanıyor..." [disabled] [ref=f2e115]
          - button "Sözleşmeyi Sonlandır" [ref=f2e116] [cursor=pointer]
```

# Test source

```ts
  67  |   await expect(page.locator('input[name="username"]')).toBeVisible();
  68  |   await expect(page.locator('input[name="password"]')).toBeVisible();
  69  | });
  70  | 
  71  | for (const account of demoAccounts) {
  72  |   test(`authenticates the ${account.role} demo account and routes to its portal`, async ({ page }) => {
  73  |     test.skip(!account.password, `Set the matching local .env password variable to test ${account.role}.`);
  74  | 
  75  |     await page.goto('/auth/login');
  76  |     await page.getByRole('button', { name: /Güvenli giriş için devam et/i }).click();
  77  |     await page.locator('input[name="username"]').fill(account.username);
  78  |     await page.locator('input[name="password"]').fill(account.password!);
  79  |     await page.getByRole('button', { name: /Sign In/i }).click();
  80  | 
  81  |     await expect.poll(() => new URL(page.url()).pathname, { timeout: 60_000 }).toBe(account.portalPath);
  82  |   });
  83  | }
  84  | 
  85  | test('loads administrative statistics and exits its loading state', async ({ page }) => {
  86  |   await loginAsAdmin(page);
  87  | 
  88  |   await expect(page.locator('.stat-card__value').first()).not.toHaveText('…', { timeout: 30_000 });
  89  |   await expect(page.locator('.alert--danger')).toBeHidden();
  90  | });
  91  | 
  92  | test('loads the admin user list and exits its loading state', async ({ page }) => {
  93  |   await loginAsAdmin(page);
  94  |   await page.getByRole('link', { name: /Kullanıcı Yönetimi/ }).click();
  95  |   await expect(page).toHaveURL(/\/admin\/users$/);
  96  | 
  97  |   await expect(page.getByRole('button', { name: /Yenile/ })).toBeEnabled({ timeout: 30_000 });
  98  |   await expect(page.locator('.alert--danger')).toBeHidden();
  99  |   await expect(page.getByText('Henüz kullanıcı kaydı bulunmuyor.')
  100 |     .or(page.locator('tbody tr').first())).toBeVisible();
  101 | });
  102 | 
  103 | test('loads the saga monitor and exits its loading state', async ({ page }) => {
  104 |   await loginAsAdmin(page);
  105 |   await page.getByRole('link', { name: /Saga Monitor/ }).click();
  106 |   await expect(page).toHaveURL(/\/admin\/saga-monitor$/);
  107 | 
  108 |   await expect(page.getByRole('button', { name: /Yenile/ })).toBeEnabled({ timeout: 30_000 });
  109 |   await expect(page.locator('.alert--danger')).toBeHidden();
  110 |   await expect(page.getByText('İzlenecek saga kaydı bulunmuyor.')
  111 |     .or(page.locator('.saga-card').first())).toBeVisible();
  112 | });
  113 | 
  114 | for (const target of [
  115 |   { path: '/landlord/properties', link: /Mülklerim/, heading: 'Mülklerim', loading: 'Mülkler yükleniyor...' },
  116 |   { path: '/landlord/tenants', link: /Kiracılarım/, heading: 'Kiracılarım', loading: 'Kiracılar yükleniyor...' },
  117 |   { path: '/landlord/maintenance', link: /Bakım Talepleri/, heading: 'Bakım talepleri', loading: 'Bakım talepleri yükleniyor...' },
  118 |   { path: '/landlord/income-report', link: /Gelir Raporu/, heading: 'Gelir Raporu', loading: 'Gelir raporu yükleniyor...' },
  119 | ]) {
  120 |   test(`completes the landlord page loading state at ${target.path}`, async ({ page }) => {
  121 |     await loginAsLandlord(page);
  122 |     await page.getByRole('link', { name: target.link }).click();
  123 |     await expect(page).toHaveURL(new RegExp(`${target.path}$`));
  124 | 
  125 |     await expect(page.getByRole('heading', { name: target.heading })).toBeVisible();
  126 |     await expect(page.getByText(target.loading, { exact: true })).toBeHidden({ timeout: 30_000 });
  127 |     await expect(page.locator('.alert--danger')).toBeHidden();
  128 |     if (target.path === '/landlord/income-report') {
  129 |       await expect(page.getByText('Gerçekleşen tahsilat')).toBeVisible();
  130 |       await expect(page.locator('tbody tr')).toHaveCount(12);
  131 |     }
  132 |   });
  133 | }
  134 | 
  135 | test('shows landlord lease details in Turkish locale without truncating identifiers', async ({ page }) => {
  136 |   await loginAsLandlord(page);
  137 |   const leaseResponsePromise = page.waitForResponse(response =>
  138 |     new URL(response.url()).pathname.includes('/api/leases/landlord/'));
  139 |   await page.getByRole('link', { name: /Sözleşmeler/ }).click();
  140 |   await expect(page).toHaveURL(/\/landlord\/leases$/);
  141 | 
  142 |   const leaseResponse = await leaseResponsePromise;
  143 |   expect(leaseResponse.ok()).toBe(true);
  144 |   const leases = await leaseResponse.json() as Array<Record<string, unknown>>;
  145 |   expect(Number(leases[0]?.['monthlyRentAmount'])).toBeGreaterThan(0);
  146 |   expect(Number(leases[0]?.['depositAmount'])).toBeGreaterThanOrEqual(0);
  147 |   expect(leases[0]?.['startDate']).toBeTruthy();
  148 |   expect(leases[0]?.['endDate']).toBeTruthy();
  149 | 
  150 |   const leaseCard = page.locator('.lease-card').first();
  151 |   await expect(leaseCard).toBeVisible({ timeout: 30_000 });
  152 |   await expect(leaseCard.getByText('Mülk ID:', { exact: true })).toBeVisible();
  153 |   await expect(leaseCard.getByText('Kiracı ID:', { exact: true })).toBeVisible();
  154 |   await expect(leaseCard.locator('.value--id')).toHaveCount(2);
  155 |   await expect(leaseCard.locator('.value--id').first()).toHaveText(/^[0-9a-f-]{36}$/i);
  156 |   await expect(leaseCard.getByText(/^\d{2}\.\d{2}\.\d{4}$/).first()).toBeVisible();
  157 |   await expect(leaseCard.locator('.value.currency').first()).toHaveText('24.000,00 ₺');
  158 | });
  159 | 
  160 | test('downloads an active landlord lease as a PDF', async ({ page }) => {
  161 |   await loginAsLandlord(page);
  162 |   await page.getByRole('link', { name: /Sözleşmeler/ }).click();
  163 |   await expect(page).toHaveURL(/\/landlord\/leases$/);
  164 | 
  165 |   const downloadButton = page.getByRole('button', { name: 'PDF İndir' }).first();
  166 |   await expect(downloadButton).toBeEnabled({ timeout: 30_000 });
> 167 |   const downloadPromise = page.waitForEvent('download');
      |                                ^ Error: page.waitForEvent: Test timeout of 60000ms exceeded.
  168 |   await downloadButton.click();
  169 |   const download = await downloadPromise;
  170 | 
  171 |   expect(download.suggestedFilename()).toMatch(/^kira-sozlesmesi-[0-9a-f-]+\.pdf$/i);
  172 |   await expect(page.getByText('Sözleşme PDF olarak indirildi.')).toBeVisible();
  173 | });
  174 | 
  175 | test('loads tenant notifications and clears the notification loading message', async ({ page }) => {
  176 |   const tenantAccount = demoAccounts[2];
  177 |   test.skip(!tenantAccount.password, 'Set KEYCLOAK_DEMO_TENANT_PASSWORD in the repository-root .env to test tenant notifications.');
  178 | 
  179 |   await loginAs(page, tenantAccount);
  180 |   await page.getByRole('button', { name: 'Bildirimleri görüntüle' }).click();
  181 | 
  182 |   await expect(page.getByText('Bildirimler yükleniyor...', { exact: true })).toBeHidden({ timeout: 30_000 });
  183 |   await expect(page.getByText('Bildirimler şu anda yüklenemiyor.').or(
  184 |     page.getByText('Henüz uygulama bildiriminiz yok.').or(page.locator('.notification-item').first())
  185 |   )).toBeVisible();
  186 | });
  187 | 
  188 | test('requires tenant confirmation before creating a simulated rent payment', async ({ page }) => {
  189 |   const tenantAccount = demoAccounts[2];
  190 |   test.skip(!tenantAccount.password, 'Set KEYCLOAK_DEMO_TENANT_PASSWORD in the repository-root .env to test tenant payments.');
  191 | 
  192 |   let paymentRequests = 0;
  193 |   await page.route('**/api/payments/rent', async route => {
  194 |     paymentRequests += 1;
  195 |     await route.fulfill({
  196 |       status: 200,
  197 |       contentType: 'application/json',
  198 |       body: JSON.stringify({ paymentId: 'e2e-payment', status: 'SUCCESS', isSimulated: true })
  199 |     });
  200 |   });
  201 | 
  202 |   await loginAs(page, tenantAccount);
  203 |   await page.getByRole('link', { name: /Kira Öde/ }).click();
  204 |   const leaseSelector = page.locator('#payment-lease');
  205 |   await expect(leaseSelector).toBeVisible({ timeout: 30_000 });
  206 |   await leaseSelector.selectOption({ index: 1 });
  207 | 
  208 |   await page.getByRole('button', { name: 'Kira ödemesini simüle et' }).click();
  209 |   const confirmation = page.getByRole('dialog', { name: 'Ödemeyi onaylıyor musunuz?' });
  210 |   await expect(confirmation).toContainText('tutarında demo kaydı oluşturulacak');
  211 |   await expect(confirmation).toContainText('gerçek para tahsil edilmeyecek');
  212 |   await confirmation.getByRole('button', { name: 'İptal' }).click();
  213 |   await expect(confirmation).toBeHidden();
  214 |   expect(paymentRequests).toBe(0);
  215 | 
  216 |   await page.getByRole('button', { name: 'Kira ödemesini simüle et' }).click();
  217 |   await confirmation.getByRole('button', { name: 'Evet, onayla' }).click();
  218 |   await expect(page.getByRole('status').filter({ hasText: 'Demo ödeme başarıyla kaydedildi' })).toBeVisible();
  219 |   await expect(page.getByText('Demo ödeme kaydedildi', { exact: true })).toBeVisible();
  220 |   expect(paymentRequests).toBe(1);
  221 | });
  222 | 
  223 | for (const target of [
  224 |   { path: '/tenant/dashboard', link: /Dashboard/, loading: 'Gösterge paneli yükleniyor...' },
  225 |   { path: '/tenant/payment', link: /Kira Öde/, loading: 'Sözleşmeleriniz yükleniyor...' },
  226 |   { path: '/tenant/payment-history', link: /Ödeme Geçmişi/, loading: 'Ödeme geçmişi yükleniyor...' },
  227 |   { path: '/tenant/maintenance', link: /Bakım Talepleri/, loading: 'Bakım talepleri yükleniyor...' },
  228 | ]) {
  229 |   test(`completes the tenant page loading state at ${target.path}`, async ({ page }) => {
  230 |     const tenantAccount = demoAccounts[2];
  231 |     test.skip(!tenantAccount.password, 'Set KEYCLOAK_DEMO_TENANT_PASSWORD in the repository-root .env to test tenant pages.');
  232 | 
  233 |     await loginAs(page, tenantAccount);
  234 |     if (target.path !== '/tenant/dashboard') {
  235 |       await page.getByRole('link', { name: target.link }).click();
  236 |     }
  237 |     await expect(page).toHaveURL(new RegExp(`${target.path}$`));
  238 | 
  239 |     await expect(page.getByText(target.loading, { exact: true })).toBeHidden({ timeout: 30_000 });
  240 |     await expect(page.locator('.alert--danger')).toBeHidden();
  241 |     if (target.path === '/tenant/payment') {
  242 |       await expect(page.getByText('Sözleşme bilgileri yüklenemedi.').or(page.getByText('Ödeme yapılabilecek aktif sözleşme bulunamadı.'))
  243 |         .or(page.locator('#payment-lease'))).toBeVisible();
  244 |     } else if (target.path === '/tenant/payment-history') {
  245 |       await expect(page.getByText('Henüz ödeme kaydı bulunmuyor.')
  246 |         .or(page.locator('tbody tr').first())).toBeVisible();
  247 |     } else if (target.path === '/tenant/maintenance') {
  248 |       await expect(page.getByText('Henüz bakım talebiniz yok.')
  249 |         .or(page.locator('.grid > .card').first())).toBeVisible();
  250 |     } else {
  251 |       await expect(page.getByText('Sözleşme kaydı bulunamadı')
  252 |         .or(page.locator('.stat-card__value').first())).toBeVisible();
  253 |     }
  254 |   });
  255 | }
  256 | 
```