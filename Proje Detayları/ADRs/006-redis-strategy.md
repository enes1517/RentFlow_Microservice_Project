# ADR 006: Redis Dağıtık Önbellekleme, Kilitleme ve Eşzamanlılık Stratejisi

## Durum
**Kabul Edildi (Accepted) / Kısmen Uygulandı (Partially Implemented - Cache-Aside & Metrikler Aktif; RedLock & Blacklist Hedef)**

## Tarih
2026-10-18

## Bağlam ve Sorun Tanımı (Context)
Dağıtık mikroservis mimarisinde, servislerin birbirinden bağımsız çalışırken ortak verilere yüksek hızda erişmesi ve yüksek trafik altında ilişkisel/doküman veritabanlarını gereksiz I/O yükünden koruması gerekir.

Ayrıca RentFlow özelinde:
- **Sık Okunan Statik/Yarı Statik Veriler:** Kullanıcı profilleri, onaylanmış kira sözleşmeleri, mülk listeleme detayları her istekte veritabanından çekilmemelidir.
- **Race Condition Riski:** Aynı mülk biriminin eşzamanlı iki farklı kiralama isteğiyle aynı anda rezerve edilmesini önlemek için hızlı bir dağıtık kilit (distributed lock) mekanizmasına ihtiyaç duyulabilir.
- **Tekrar Eden İstekler (Duplicate Requests):** Broker'dan veya dış ödeme gateway'lerinden gelebilecek tekrarlı isteklerin filtrelenmesi gereklidir.
- **Stateless Token İptali:** Kullanıcı oturumu kapattığında (logout) stateless JWT token'ların geçersiz kılınması gereksinimi bulunur.

## Karar (Decision)

1. **Dağıtık Önbellekleme Motoru: Redis 7 (Alpine):**
   Yüksek okuma/yazma performansı ve zengin veri yapıları nedeniyle in-memory veri deposu olarak Redis 7 seçilmiştir.

2. **Cache-Aside Deseni (Uygulandı):**
   `SharedKernel.Caching` altında `ICacheService` ve `RedisCacheService` sınıfları geliştirilmiştir:
   - İstek geldiğinde önce Redis sorgulanır (Cache Hit).
   - Veri Redis'te yoksa veritabanından okunur (Cache Miss), Redis'e yazılır ve istemciye döndürülür.
   - Veri güncellendiğinde veya silindiğinde ilgili Redis anahtarı geçersiz kılınır (Invalidate).
   - Tip güvenli standart anahtar üretimi için `CacheKeys` sınıfı tanımlanmıştır:
     - `CacheKeys.UserProfile(id)`
     - `CacheKeys.Property(id)`
     - `CacheKeys.ActiveLease(id)`
     - `CacheKeys.UpcomingPayments(date)`

3. **Önbellek Yaşam Döngüsü (TTL Kararları):**
   Veri tazeliği ile performans dengesi gözetilerek iş senaryolarına özel TTL süreleri belirlenmiştir:
   - **User Profile:** 30 dakika (kullanıcı bilgileri nadiren değişir).
   - **Property Search / Detail:** 5 dakika (mülk kiralandığında hızla yansımalı).
   - **Active Lease:** 10 dakika (sözleşme durumu değiştiğinde otomatik invalidate edilir).
   - **Upcoming Payments:** 5 dakika (günlük ödeme listesi hızlı okunmalı).
   - **Saga Stats:** 30 saniye (yönetici dashboard tazeleme oranı).

4. **Hata Toleransı (Graceful Degradation):**
   Redis sunucusu geçici olarak erişilemez olduğunda sistemin çökmemesi esastır:
   - `RedisCacheService` hata fırlatmak yerine loglama yapar ve işlemi doğrudan veritabanına yönlendirir.
   - Böylece Redis kesintisi bir servis kesintisine (outage) değil, sadece geçici bir gecikme artışına (latency spike) neden olur.

5. **Gözlemlenebilirlik ve Metrikler:**
   `AppMetrics` altında Prometheus için önbellek performans sayaçları tanımlanmıştır:
   - `redis_cache_hits_total{service, key_type}`
   - `redis_cache_misses_total{service, key_type}`
   - `redis_lock_acquired_total{service, lock_key}`
   - `redis_lock_failed_total{service, lock_key}`
   Grafana üzerinde `redis-performance.json` paneli ile cache isabet oranları gerçek zamanlı izlenir.

6. **Hedef/Gelecek Yaklaşımlar (Target Roadmap):**
   - **RedLock Dağıtık Kilitleme:** `IDistributedLockService` arayüzü tanımlanmış olup, mülk rezervasyonlarında çok düğümlü yarış durumlarını önlemek için ileri aşamada aktifleştirilecektir.
   - **JWT Blacklist:** Çıkış yapan kullanıcıların kalan token süreleri boyunca Redis üzerinde saklanarak Gateway katmanında reddedilmesi hedeflenmektedir.
   - **Idempotency Store:** API seviyesinde `IdempotencyFilter` tarafından Redis kullanılarak mükerrer HTTP POST isteklerinin filtrelenmesi altyapısı mevcuttur.

## Sonuçlar ve Değerlendirme (Consequences)

### Olumlu Etkiler (Positive)
- **Veritabanı Yükünde %70+ Azalma:** Sık okunan profiller ve sözleşme detayları doğrudan bellekten milisaniyeler altında sunulur.
- **Standart Anahtar Yönetimi:** `CacheKeys` merkezi sınıfı sayesinde geliştiricilerin hatalı veya çakışan anahtarlar üretmesi engellenmiştir.
- **Dayanıklılık:** Redis çökse bile veritabanı doğrudan istekleri karşılayarak iş sürekliliğini korur.

### Olumsuz Etkiler ve Yönetilen Riskler (Trade-offs)
- **Bellek Yönetimi:** Redis sunucusunda `maxmemory 512mb` ve `maxmemory-policy allkeys-lru` yapılandırması yapılarak hafızanın kontrolsüz büyümesi sınırlandırılmıştır.
- **Veri Tutarsızlığı (Stale Data):** TTL süreleri ve mutasyon anında invalidation uygulanarak eski veri gösterilme riski en aza indirilmiştir.
