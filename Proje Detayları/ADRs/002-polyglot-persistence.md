# ADR 002: Çoklu Veri Depolama Stratejisi (Polyglot Persistence)

## Durum
**Kabul Edildi (Accepted) / Uygulandı (Implemented)**

## Tarih
2026-10-18

## Bağlam ve Sorun Tanımı (Context)
Mikroservis mimarisinde en temel prensiplerden biri **"Database-per-Service"** (Her servisin kendi bağımsız veritabanına sahip olması) yaklaşımıdır. RentFlow sisteminde farklı servislerin veri karakteristikleri ve tutarlılık beklentileri birbirinden radikal biçimde ayrışmaktadır:

1. **Finansal ve Yasal Kayıtlar (Lease & Payment):** Kesin ACID garantisi, kuruşu kuruşuna bakiye tutarlılığı, katı ilişkisel bütünlük ve denetim izi (audit trail) gerektirir.
2. **Kullanıcı ve Orkestrasyon Durumları (User & Saga):** Güçlü ilişkisel yapı, satır düzeyinde pesimistik kilitleme (`SELECT FOR UPDATE`), JSON desteği ve açık kaynak ekosistem avantajı gerektirir.
3. **Mülk Kataloğu (Property):** Gayrimenkul tipleri (apartman dairesi, villa, ticari dükkan) birbirinden çok farklı niteliklere (oda sayısı, metrekare, ısıtma türü, otopark, balkon, bina yaşı, dinamik metadata) sahiptir. Katı ilişkisel şema bu esnekliği kısıtlar ve çok sayıda `JOIN` veya `NULL` alan üretir.
4. **Büyük İkili Dosyalar (Documents & Media):** PDF kira sözleşmeleri, ödeme dekontları ve mülk görselleri yüz binlerce bayt yer kaplar. Bu verilerin ilişkisel veritabanlarında `VARBINARY(MAX)` / `BLOB` olarak tutulması veritabanı I/O performansını, yedekleme sürelerini ve bellek kullanımını felç eder.

## Karar (Decision)
Sistemde "tek tip veritabanı" yerine, her iş alanının doğasına en uygun veritabanı motorunun seçildiği **Polyglot Persistence** mimarisi benimsenmiştir:

| Veritabanı Motoru | Kullanılan Servisler | Veritabanı Adı | Gerekçe ve Avantajları |
|---|---|---|---|
| **Microsoft SQL Server 2022** | `LeaseService`, `PaymentService`, `MaintenanceService`, `DocumentService`, `NotificationService`, `ReportService` | `lease_service_db`, `payment_service_db`, `MaintenanceDb`, `DocumentDb`, `NotificationDb`, `ReportDb` | Kurumsal finansal işlemler, yüksek ACID garantisi, finansal denetlenebilirlik ve Transactional Outbox güvenilirliği. |
| **PostgreSQL 16 (Alpine)** | `UserService`, `SagaOrchestrator`, `Keycloak` | `user_service_db`, `saga_db`, `keycloak_db`, `hangfire_db` | MassTransit State Machine için optimize edilmiş pesimistik kilitleme (`FOR UPDATE`), yüksek eşzamanlılık (concurrency) performansı, Keycloak IAM tam uyumluluğu. |
| **MongoDB 7 (Jammy)** | `PropertyService` | `property_service_db` | Belge tabanlı (Document-based) esnek şema yapısı. Mülk ve ünitelerin dinamik niteliklerinin (JSON/BSON) hızlı sorgulanması, yüksek okuma verimi ve kolay yatay ölçeklenebilirlik. |
| **MinIO (S3 Compatible)** | `DocumentService`, Statik Medya | `documents`, `images` bucket'ları | İkili büyük nesnelerin (PDF, resim) veritabanı dışına taşınması; S3 API uyumluluğu sayesinde buluta (AWS S3) geçiş kolaylığı; doğrudan URL ile güvenli belge erişimi. |
| **Redis 7 (Alpine)** | Tüm Servisler (Shared) | In-Memory Key-Value Store | Cache-Aside önbellekleme, dağıtık kilit (RedLock), API Gateway rate limiting ve at-least-once mesaj deduplication desteği. |

## Uygulama Detayları

1. **Servisler Arası Veritabanı İzolasyonu:**
   Hiçbir mikroservis başka bir mikroservisin veritabanına SQL sorgusu veya connection string aracılığıyla erişemez. Veri paylaşımı yalnızca:
   - Asenkron domain event'leri (RabbitMQ / MassTransit)
   - İhtiyaç duyulduğunda API Gateway üzerinden yetkilendirilmiş REST API çağrıları
   ile gerçekleştirilir.

2. **Docker Compose ve Altyapı Başlatımı:**
   `docker-compose.yml` içinde tüm veri kaynakları için otomatik başlatma script'leri (`infrastructure/postgres/init`, `infrastructure/sqlserver/init`, `infrastructure/mongodb/init`, `minio-init`) tanımlanmıştır. Sistem ilk ayağa kalkışta veritabanlarını ve gerekli bucket'ları otomatik olarak oluşturur.

3. **Veritabanı Migrasyonları:**
   Geliştirme ortamında `Database:MigrateOnStartup=true` ile Entity Framework Core migrasyonları otomatik uygulanırken; üretim ortamında güvenlik nedeniyle otomatik migrasyon engellenmiş (`InvalidOperationException` fırlatılır) ve `infrastructure/migrations/build-migration-bundles.ps1` ile derlenen idempotent migration bundle'larının kullanılması zorunlu kılınmıştır.

## Sonuçlar ve Değerlendirme (Consequences)

### Olumlu Etkiler (Positive)
- **Doğru İşe Doğru Araç:** Finansta katı ACID, mülk kataloğunda esnek doküman şeması, dosyalarda nesne depolama verimliliği sağlanmıştır.
- **Performans Optimizasyonu:** Büyük BLOB dosyaların veritabanını şişirmesi engellenmiştir; MongoDB ile mülk sorguları yüksek hızda cevaplanır.
- **Hata İzolasyonu:** PostgreSQL'deki bir kesinti LeaseService veya PaymentService'i doğrudan etkilemez.

### Olumsuz Etkiler ve Yönetilen Riskler (Trade-offs)
- **Geliştirici Ortamı Yükü:** Yerel ortamda PostgreSQL, SQL Server ve MongoDB'nin aynı anda çalışması RAM tüketimini artırır (~3.5 GB - 4 GB). Docker resource limitleri ve optimize image'lar ile dengelenmiştir.
- **Yedekleme ve Bakım Operasyonu:** Üretim ortamında 3 farklı veritabanı motoru için ayrı ayrı backup/restore ve replikasyon stratejileri işletilmelidir.
