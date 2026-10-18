# ADR 008: CQRS ve Olay Güdümlü Raporlama Projeksiyonları Mimarisi

## Durum
**Kabul Edildi (Accepted) / Uygulandı (Implemented)**

## Tarih
2026-10-18

## Bağlam ve Sorun Tanımı (Context)
RentFlow platformunda mülk sahiplerinin (Landlord) ve yöneticilerin en kritik ihtiyaçlarından biri finansal raporlardır:
- Yıllık ve aylık toplam kira geliri,
- Tahsilat başarı oranları,
- Mülklerin doluluk oranları ve boş geçen süreler,
- Bakım ve onarım giderlerinin kira gelirine oranı.

Geleneksel mikroservis mimarilerinde bu raporları üretmek için iki yaygın ama kusurlu yöntem vardır:
1. **Senkron REST Agregasyonu (API Composition):** Rapor servisi her istekte LeaseService, PaymentService, PropertyService ve MaintenanceService'e ayrı ayrı HTTP istekleri atıp bellekte birleştirir. Bu yöntem muazzam ağ gecikmesine, zincirleme arıza (cascading failure) riskine ve yüksek CPU kullanımına yol açar.
2. **Dağıtık Veritabanı Sorguları:** Farklı sunuculardaki SQL Server ve MongoDB arasında bağlantı kurmaya çalışmak mikroservis bağımsızlığını ve güvenlik sınırlarını tamamen yok eder.

## Karar (Decision)

1. **CQRS ve Olay Güdümlü Okuma Modelleri (Event-Driven Read Model Projections):**
   Yazma modeli (Command/OLTP) ile okuma modeli (Query/OLAP) tamamen birbirinden ayrılmıştır.
   - Bağımsız `ReportService` mikroservisi (Port 5009, `ReportDb`) hayata geçirilmiştir.
   - `ReportService`, diğer servislerin veritabanlarına asla doğrudan erişmez ve onlara anlık REST sorguları atmaz.

2. **Asenkron Olay Tüketimi (Event Projections):**
   `ReportService`, RabbitMQ üzerinden yayınlanan domain event'lerini tüketir (`ReportProjectionConsumers`) ve kendi optimize edilmiş SQL tablolarına projeksiyon olarak yazar:
   - **Kira Sözleşmesi Olayları:** `ILeaseAgreementCreatedEvent`, `ILeaseCancelledEvent`.
   - **Ödeme Olayları:** `IRentPaymentCompletedEvent` (kira ve depozito tahsilatları, para birimi, işlem tarihi), `IRentPaymentFailedEvent`.
   - **Mülk Olayları:** `PropertyCreatedProjectionEvent`, `PropertyUpdatedProjectionEvent`.
   - **Bakım Olayları:** `MaintenanceCreatedProjectionEvent`, `MaintenanceResolvedProjectionEvent`.

3. **Idempotency ve Sıralama Garantisi:**
   - Projeksiyon satırları kaynak varlık kimliklerine (`SourceEntityId` / `Guid`) göre anahtarlanır.
   - Olaylar üzerindeki zaman damgaları (`SourceTimestamp`) karşılaştırılarak, gecikmeli veya mükerrer gelen eski olayların güncel veriyi ezmesi engellenir.

4. **Veri Doğruluğu ve Güvenilirlik İlkeleri (Fail-Safe Reporting):**
   - Henüz projeksiyonu tamamlanmamış veya başlatılmamış bir mülk için `GET /api/reports/income/{landlordId}?year={year}` çağrıldığında sahte "0 TL" raporu dönmek yerine, HTTP `503 Service Unavailable` ve `Income report projection is not ready` RFC 7807 problem detayı döndürülür.
   - Para birimi denetimi: Raporlama Türk Lirası (TRY) bazlıdır. Bilinmeyen veya farklı bir para birimi içeren tahsilat tespit edilirse raporda tutarsızlık oluşmaması için istek 503 ile korumaya alınır.

## Uygulama Detayları

```mermaid
flowchart LR
    subgraph Yazma Modelleri (Command Sources)
        LS[LeaseService] -- Lease Events --> RMQ((RabbitMQ Broker))
        PS[PaymentService] -- Payment Events --> RMQ
        PropS[PropertyService] -- Property Events --> RMQ
        MS[MaintenanceService] -- Maintenance Events --> RMQ
    end

    subgraph Okuma Modeli (CQRS Read Model)
        RMQ -- Event Stream --> RPC[ReportProjectionConsumers]
        RPC -- Idempotent Upsert --> RDB[(ReportDb SQL Server)]
        Client([İstemci / Angular]) -->|GET /api/reports/income| RAPI[ReportsController]
        RAPI -->|Hızlı Tekil SQL Okuma| RDB
    end
```

## Sonuçlar ve Değerlendirme (Consequences)

### Olumlu Etkiler (Positive)
- **Milisaniyelik Yanıt Süreleri:** Rapor sorguları arka planda önceden hesaplanıp hazırlandığı için karmaşık hesaplamalar anında (sub-50ms) döner.
- **Sıfır Çalışma Zamanı Bağımlılığı (Zero Runtime Coupling):** LeaseService veya PaymentService kapalı veya bakımda olsa dahi mülk sahipleri mevcut raporlarını kesintisiz okumaya devam edebilir.
- **Operasyonel Veritabanlarının Korunması:** Ağır analitik ve toplama (aggregation) sorguları ana operasyonel veritabanlarına hiçbir yük bindirmez.

### Olumsuz Etkiler ve Yönetilen Riskler (Trade-offs)
- **Nihai Tutarlılık Gecikmesi (Eventual Consistency):** Yeni bir ödeme yapıldığında rapor ekranına yansıması saniyeler düzeyinde bir gecikmeyle gerçekleşir.
- **Olay Yeniden Oynatma (Replay) İhtiyacı:** Yeni bir rapor tipi eklendiğinde geçmiş verilerin projeksiyonlara aktarılması için event replay veya snapshot mekanizması işletilmelidir.
