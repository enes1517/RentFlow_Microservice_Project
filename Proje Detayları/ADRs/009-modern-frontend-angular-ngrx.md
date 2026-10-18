# ADR 009: Modern Frontend Mimarisi (Angular 22 & NgRx)

## Durum
**Kabul Edildi (Accepted) / Uygulandı (Implemented)**

## Tarih
2026-10-18

## Bağlam ve Sorun Tanımı (Context)
RentFlow sistemi, aynı anda farklı beklentilere sahip üç ana kullanıcı kitlesine hizmet verir:
1. **Kiracılar (Tenant Portal):** Aktif kira sözleşmelerini inceleme, kira ödeme geçmişi, kartla kira ödeme, dekont indirme ve arıza talebi açma.
2. **Mülk Sahipleri (Landlord Portal):** Mülk portföyü ekleme, daire birimleri tanımlama, yeni kiracı davet etme, sözleşme oluşturma ve gelir/gider grafiklerini izleme.
3. **Yöneticiler (Admin Portal):** Sistem genelinde kullanıcı yönetimi, dağıtık saga orkestrasyon akışlarının takibi ve operasyonel sağlık izleme.

Bu karmaşık rollerin tek bir monolitik veya düzensiz JavaScript kod tabanında yönetilmesi; yetkisiz erişim açıklarına, tutarsız arayüz durumlarına (state bugs), yavaş sayfa geçişlerine ve zor test edilebilirliğe sebep olur.

## Karar (Decision)

1. **Framework: Angular 22 (Standalone Components):**
   - Eski `NgModule` mimarisi yerine modern, ağaç sallama (tree-shaking) dostu, hızlı ve modüler **Standalone Component** yapısı seçilmiştir.
   - Tip güvenliği için TypeScript 5+ ve modern RxJS reaktif programlama prensipleri uygulanmıştır.

2. **Reaktif Durum Yönetimi (State Management): NgRx 22:**
   Karmaşık uygulama durumlarını (kullanıcı profili, mülk listesi, aktif sözleşmeler, bildirimler ve filtreler) öngörülebilir ve tek bir doğruluk kaynağından (Single Source of Truth) yönetmek için **NgRx Store** ve yan etkiler (HTTP istekleri) için **NgRx Effects** tercih edilmiştir. Geliştirme sürecinde durum geçmişini izlemek için **NgRx Store DevTools** entegre edilmiştir.

3. **Rol Tabanlı Rota Güvenliği (Functional Route Guards):**
   Angular Route tanımlarında fonksiyonel guard'lar kullanılmıştır:
   - `rootRedirectGuard`: Kullanıcı kök dizine (`/`) geldiğinde oturum durumuna ve rolüne bakarak anında doğru portala yönlendirir (`/tenant`, `/landlord` veya `/admin`).
   - `authGuard`: Sayfaya erişmeden önce geçerli bir Keycloak oturumu olup olmadığını denetler.
   - `roleGuard('ROLE_NAME')`: Kullanıcının JWT token'ındaki rollerini kontrol ederek yetkisiz erişimleri engeller ve `403 Forbidden` / Login ekranına yönlendirir.

4. **Çalışma Zamanı Yapılandırması (Runtime Configuration):**
   Frontend uygulamasının farklı ortamlarda (Local Dev, Docker Compose, Kubernetes, Staging, Prod) yeniden derlenmeye (rebuild) gerek kalmaksızın çalışabilmesi için:
   - Keycloak adresi ve API Gateway URL'si `assets/app-config.json` dosyasında tutulur.
   - Uygulama başlatılırken `APP_INITIALIZER` ile bu dosya dinamik olarak çekilir ve OIDC istemcisi yapılandırılır.
   - Docker container'ında bu dosya bir volume mount ile anında ezilebilir.

5. **Görselleştirme ve Sunum:**
   Finansal gelir ve doluluk oranları için `chart.js` ve `ng2-charts` kütüphaneleri ile etkileşimli, responsive grafik bileşenleri kullanılmıştır.

6. **Dağıtım ve Test Stratejisi:**
   - Çok aşamalı (multi-stage) `Dockerfile` ile optimize edilmiş Nginx imajı üretilir (`nginx.conf` HTML5 client-side pushState routing'i destekler).
   - Birim testler için yüksek hızlı **Vitest**,
   - Uçtan uca tarayıcı testleri için **Playwright** (`playwright.config.ts`) yapılandırılmıştır.

## Sonuçlar ve Değerlendirme (Consequences)

### Olumlu Etkiler (Positive)
- **Kusursuz Kullanıcı Deneyimi:** SPA mimarisi sayesinde sayfa yenilenmeksizin akıcı geçişler sağlanır.
- **Güçlü Güvenlik Duvarı:** Rol kontrolleri hem frontend rotalarında hem de backend API seviyesinde çift katmanlı denetlenir.
- **Ortam Bağımsız Dağıtım:** Tek bir Docker imajı tüm ortamlarda `app-config.json` değiştirilerek çalıştırılabilir.

### Olumsuz Etkiler ve Yönetilen Riskler (Trade-offs)
- **İlk Yükleme Boyutu:** Zengin arayüz kütüphaneleri ilk yükleme boyutunu bir miktar artırır; bu durum rota bazlı tembel yükleme (Lazy Loading: `loadChildren`, `loadComponent`) ile çözülmüştür.
