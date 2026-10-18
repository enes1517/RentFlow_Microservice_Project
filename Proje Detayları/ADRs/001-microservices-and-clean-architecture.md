# ADR 001: Mikroservis Mimarisi, Domain-Driven Design (DDD) ve Clean Architecture

## Durum
**Kabul Edildi (Accepted) / Uygulandı (Implemented)**

## Tarih
2026-10-18

## Bağlam ve Sorun Tanımı (Context)
RentFlow (Akıllı Kira Yönetim Sistemi), emlak sahipleri (Landlord), kiracılar (Tenant) ve sistem yöneticilerini (Admin) aynı platformda buluşturan; mülk yönetimi, kira sözleşmeleri, periyodik ödemeler, bakım/arıza talepleri, resmi belge oluşturma (PDF kontrat/makbuz) ve finansal raporlama gibi karmaşık iş süreçlerini barındıran bir platformdur.

Monolitik bir mimari tercih edildiğinde karşılaşılabilecek başlıca riskler:
- Farklı iş alanlarının (örn. finansal ödemeler vs. bakım talepleri vs. belge üretimi) birbirine sıkı sıkıya bağlanması (tight coupling).
- Bakım veya raporlama servisindeki anlık bir bellek/işlemci darboğazının, kritik kira tahsilatlarını veya sözleşme akışlarını kilitlemesi.
- Ekiplerin eşzamanlı bağımsız geliştirme, test etme ve dağıtım yapamaması.
- Farklı veri saklama ihtiyaçlarına (ilişkisel finansal tablolar, esnek mülk nitelikleri, ikili belge depolama) tek tip veritabanı dayatılması.

## Karar (Decision)
1. **Mikroservis Mimarisi (Microservices Architecture):**
   Uygulama, iş yeteneklerine (Business Capabilities) ve Bounded Context sınırlarına göre 8 bağımsız mikroservis + 1 API Gateway + 1 Saga Orchestrator olarak tasarlanmıştır:
   - **ApiGateway:** YARP tabanlı tek giriş kapısı, rotalama ve güvenlik ön katmanı.
   - **UserService:** Kimlik senkronizasyonu, kiracı davetleri ve kullanıcı profilleri.
   - **PropertyService:** Mülk, bina, daire birimleri ve dinamik niteliklerin kataloğu.
   - **LeaseService:** Kira sözleşmelerinin yaşam döngüsü yönetimi.
   - **PaymentService:** Kira ve depozito tahsilatları, iade süreçleri, ödeme simülatörü ve sağlayıcı entegrasyonları.
   - **MaintenanceService:** Kiracı arıza bildirimleri ve servis takip süreci.
   - **DocumentService:** Dinamik PDF sözleşme/makbuz üretimi ve MinIO object storage entegrasyonu.
   - **NotificationService:** E-posta, SMS ve Push bildirim loglama ve gönderimi.
   - **ReportService:** Finansal gelir ve mülk durum raporları için CQRS Read Model projeksiyonları.
   - **SagaOrchestrator:** Dağıtık iş süreçlerinin durum makineleri (State Machine) ile orkestrasyonu.

2. **Clean Architecture (Onion / Hexagonal Architecture):**
   Her bir .NET mikroservisi 4 standart katmana ayrılmıştır:
   - **Domain:** İş nesneleri (`Entities`), Değer Nesneleri (`Value Objects`), `AggregateRoot`, `IDomainEvent` ve domain kuralları. Hiçbir dış bağımlılığı yoktur.
   - **Application:** CQRS komut ve sorguları (`Commands`, `Queries`), `MediatR` işleyicileri, arayüzler (`IRepository`, `IService`) ve DTO'lar.
   - **Infrastructure:** Veritabanı DbContext'leri, ORM eşlemeleri (EF Core / MongoDB Driver), dış HTTP istemcileri ve 3. parti entegrasyonlar.
   - **API:** REST Controller / Minimal API uç noktaları, Swagger yapılandırması, middleware ve Dependency Injection konfigürasyonları.

3. **Paylaşılan Çekirdek (SharedKernel & SharedKernel.Primitives):**
   Tüm servislerin ortak kullandığı temel yapı taşları (Sonuç tipleri `Result<T>`, sayfalama `PagedResult<T>`, JWT kimlik çözümleyicisi, OpenTelemetry izleme ve hata yönetimi middleware'i) `SharedKernel` kütüphanesinde toplanmıştır. Ancak servisler birbirlerinin Domain sınıflarına veya veritabanlarına asla doğrudan erişemez.

## Sonuçlar ve Değerlendirme (Consequences)

### Olumlu Etkiler (Positive)
- **Yüksek İzolasyon ve Bağımsız Dağıtım:** Her servis kendi Docker container'ında izole çalışır ve bağımsız olarak ölçeklendirilebilir veya güncellenebilir.
- **Odaklanmış Bounded Context:** Her bir mikroservis sadece kendi iş alanından sorumludur (Single Responsibility Principle).
- **Test Edilebilirlik:** Domain ve Application katmanları harici bağımlılıklardan (DB, Message Broker) arındırıldığı için mock nesnelerle saniyeler içinde %100 birim testten geçirilebilir.
- **Teknoloji Esnekliği:** Servislerin veri saklama modelleri iş ihtiyaçlarına göre optimize edilmiştir (Polyglot Persistence).

### Olumsuz Etkiler ve Yönetilen Riskler (Trade-offs)
- **İşletim Karmaşıklığı:** 15+ container'lık Docker ortamı ve ağ yönetimi gerektirir (Docker Compose ve ortam değişkenleri ile standartlaştırılmıştır).
- **Ağ Gecikmesi ve Dağıtık Hatalar:** Servisler arası iletişimde oluşabilecek ağ kopmaları için Transactional Outbox, Polly dayanıklılık politikaları ve MassTransit retry mekanizmaları devreye alınmıştır.
