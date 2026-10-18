# ADR 005: Merkezi Kimlik ve Yetkilendirme Mimarisi (Keycloak & OIDC)

## Durum
**Kabul Edildi (Accepted) / Uygulandı (Implemented)**

## Tarih
2026-10-18

## Bağlam ve Sorun Tanımı (Context)
RentFlow çok kullanıcılı ve farklı yetki seviyelerine (Tenant, Landlord, Admin) sahip bir platformdur. Dağıtık mikroservis ortamında kimlik doğrulama (Authentication) ve yetkilendirmenin (Authorization) her serviste ayrı ayrı kodlanması veya her istekte merkezi bir veritabanına sorgu atılması:
- Servisler arasında gereksiz bağımlılıklara,
- Güvenlik açığı risklerine,
- Kullanıcı şifrelerinin mikroservis veritabanlarına saçılmasına,
- Her istekte yüksek veritabanı yüküne yol açar.

Ayrıca Single Page Application (Angular SPA) için güvenli Single Sign-On (SSO), Google ile giriş desteği ve sektör standardı güvenlik akışlarına ihtiyaç vardır.

## Karar (Decision)

1. **Merkezi Kimlik Sağlayıcısı (IdP): Keycloak 24:**
   Kimlik yönetimi ve kullanıcı kimlik doğrulama süreçleri için açık kaynak, endüstri standardı **Keycloak 24** seçilmiştir.
   - Keycloak kendi veritabanı olarak PostgreSQL (`keycloak_db`) kullanır.
   - Kurumsal `rentflow` özel giriş teması (`infrastructure/keycloak/themes/rentflow`) ile özelleştirilmiştir.
   - Google Identity Provider federasyonu önceden yapılandırılmıştır.

2. **Protokol ve Akış: OpenID Connect (OIDC) & OAuth 2.0 (PKCE):**
   - Angular frontend uygulaması, tarayıcı tabanlı SPA uygulamaları için en güvenli akış olan **Authorization Code Flow with PKCE (Proof Key for Code Exchange)** kullanır (`angular-oauth2-oidc` kütüphanesi).
   - İstemci şifresi (Client Secret) tarayıcıda asla saklanmaz.

3. **Stateless JWT Bearer Token'lar:**
   - Başarılı kimlik doğrulamanın ardından Keycloak tarafından üretilen ve RS256 ile imzalanan JWT Access Token'lar kullanılır.
   - Token'lar durumsuzdur (stateless); mikroservisler token doğrulamak için Keycloak'a veya veritabanına network isteği yapmaz, sadece Keycloak'un JWKS (JSON Web Key Set) genel anahtarı ile dijital imzayı doğrular.

4. **Rol Tabanlı Erişim Denetimi (RBAC):**
   Keycloak `rent-management` realm'i altında 4 temel rol tanımlanmıştır:
   - `ROLE_ADMIN`: Sistem yönetimi, arka plan saga ve operasyonel metrik izleme.
   - `ROLE_LANDLORD`: Mülk ekleme/güncelleme, kira sözleşmesi başlatma, gelir raporlarını inceleme.
   - `ROLE_TENANT`: Aktif sözleşmelerini görüntüleme, kira ödeme, arıza/bakım talebi açma.
   - `ROLE_USER`: Temel kullanıcı rolü.

5. **.NET Backend Token ve Rol Eşleme:**
   `SharedKernel.Security` altında yer alan `AddRentFlowAuthentication` uzantısı:
   - Keycloak OIDC metadata endpoint'ini (`.well-known/openid-configuration`) dinamik olarak okur.
   - Gelen token'daki `realm_access.roles` JSON dizisini ayrıştırıp ASP.NET Core `ClaimTypes.Role` claim'lerine dönüştürür.
   - `[Authorize(Roles = "ROLE_LANDLORD")]` ve `policy.RequireRole("ROLE_ADMIN")` gibi standart kuralların doğrudan çalışmasını sağlar.

6. **Kullanıcı Profili Senkronizasyonu (UserService):**
   - Kullanıcı Keycloak'ta oturum açtıktan sonra `UserService` token içindeki `sub`, `email`, `given_name` ve `family_name` bilgilerini `UserProfile` tablosuyla senkronize eder.
   - Kiracı davetleri (`TenantInvitation`) e-posta bazlı token'lar ile oluşturulur ve kiracı sisteme ilk girdiğinde mülk-kiracı ilişkisi otomatik tamamlanır.

## Sonuçlar ve Değerlendirme (Consequences)

### Olumlu Etkiler (Positive)
- **Güvenlik Standardizasyonu:** Şifreler hiçbir mikroservis tarafından görülmez veya saklanmaz.
- **Yüksek Performans:** Stateless JWT doğrulaması mikroservislerde yerel olarak mikrosaniyeler içinde gerçekleşir.
- **Zengin Özellikler:** Şifre sıfırlama, iki aşamalı doğrulama (2FA), oturumu hatırla ve sosyal giriş özellikleri doğrudan Keycloak tarafından sağlanır.

### Olumsuz Etkiler ve Yönetilen Riskler (Trade-offs)
- **Token İptali (Revocation):** Stateless JWT'lerin doğası gereği, bir kullanıcı oturumu kapattığında veya yetkisi alındığında token süresi dolana kadar (örn. 5-15 dakika) geçerli kalır. Bu durum Redis tabanlı JWT blacklist stratejisi ile adreslenebilir (Bkz: ADR 006).
