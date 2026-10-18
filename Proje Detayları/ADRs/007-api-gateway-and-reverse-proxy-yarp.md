# ADR 007: API Gateway ve Ters Dizin (Reverse Proxy) Mimarisi (Microsoft YARP)

## Durum
**Kabul Edildi (Accepted) / Uygulandı (Implemented)**

## Tarih
2026-10-18

## Bağlam ve Sorun Tanımı (Context)
RentFlow sistemi 8 bağımsız iş mikroservisi, 1 saga orkestratörü ve frontend SPA uygulamasından oluşur. Her mikroservisin kendine ait bağımsız bir portu (5001-5009) ve iç ağ adresi bulunur.

İstemcilerin (Angular SPA, mobil uygulamalar, test araçları) doğrudan her bir mikroservise ayrı portlar üzerinden bağlanması şu ciddi sorunları doğurur:
- **Güvenlik Açığı:** İç ağdaki mikroservislerin doğrudan dış dünyaya maruz kalması.
- **CORS ve Ağ Karmaşıklığı:** Tarayıcıların onlarca farklı kökene (origin) ayrı ayrı CORS preflight istekleri atması.
- **Bölünmüş Dokümantasyon:** Her servisin Swagger arayüzünün ayrı portlarda olması ve geliştiricilerin tek bir merkezden API'leri inceleyememesi.
- **Yetki ve Trafik Yönetimi Eksikliği:** Hız sınırlama (Rate Limiting), merkezi loglama ve distributed tracing başlatma noktalarının olmaması.

## Karar (Decision)

1. **Gateway Teknolojisi: Microsoft YARP (Yet Another Reverse Proxy):**
   Yüksek performanslı, modern, ASP.NET Core ile yerel uyumlu ve Microsoft tarafından aktif olarak geliştirilen **YARP 2.3** seçilmiştir. Ocelot gibi eskiyen kütüphaneler yerine YARP'ın tercih edilme nedeni:
   - Çok daha yüksek throughput ve düşük bellek tüketimi,
   - .NET 10 ve C# ekosistemiyle %100 uyumluluk,
   - OpenTelemetry ve W3C TraceContext başlıklarını otomatik iletmesi.

2. **Dış Kapı ve Port:**
   API Gateway dış dünyaya **Port 5555** üzerinden hizmet verir (Container içinde Port 80). Kök adrese (`/`) gelen istekler otomatik olarak `/swagger` dokümantasyon merkezine yönlendirilir.

3. **Rotalama Yapılandırması (Path-based Routing):**
   `appsettings.json` üzerinden deklaratif olarak tanımlanan rotalar:

   | Yol Kalıbı (Path Pattern) | Hedef Küme (Cluster) | Hedef Servis ve İç Port |
   |---|---|---|
   | `/api/users/{**catch-all}` | `user-cluster` | `http://userservice:80` |
   | `/api/properties/{**catch-all}` | `property-cluster` | `http://propertyservice:80` |
   | `/api/leases/{**catch-all}` | `lease-cluster` | `http://leaseservice:80` |
   | `/api/payments/{**catch-all}` | `payment-cluster` | `http://paymentservice:80` |
   | `/api/maintenancerequests/{**catch-all}` | `maintenance-cluster` | `http://maintenanceservice:80` |
   | `/api/documents/{**catch-all}` | `document-cluster` | `http://documentservice:80` |
   | `/api/notifications/{**catch-all}` | `notification-cluster` | `http://notificationservice:80` |
   | `/api/reports/{**catch-all}` | `report-cluster` | `http://reportservice:80` |
   | `/api/sagas/{**catch-all}` | `saga-cluster` | `http://sagaorchestrator:80` |

4. **Merkezi Swagger Dokümantasyon Agregasyonu:**
   Geliştirici deneyimini maksimize etmek için API Gateway, tüm downstream servislerin Swagger JSON şemalarını dinamik route transformasyonları (`/swagger/{service}/{**catch-all}` -> `/swagger/{**catch-all}`) ile tek bir Swagger UI ekranında toplar:
   - Geliştirici `http://localhost:5555/swagger` adresine gittiğinde sağ üstteki açılır menüden istediği mikroservisi seçerek tüm uç noktaları interaktif olarak test edebilir.
   - Gateway üzerinde `PersistAuthorization` aktiftir; Keycloak Bearer token bir kez girildiğinde tüm servis dokümanlarında geçerli kalır.

5. **Güvenlik Politikası ve Hız Sınırlama (Rate Limiting):**
   - Gateway düzeyinde `FallbackPolicy = null` yapılarak Swagger dokümantasyonu ve genel sağlık kontrolleri (`/health`) anonim erişime açık bırakılmıştır.
   - Her mikroservis kendi iş kuralları gereği kimlik doğrulama ve yetkilendirmeyi bağımsız denetler (`Defense-in-Depth`).
   - `AddRentFlowRateLimiting()` ile API Gateway seviyesinde aşırı yüklenmelere ve brute-force saldırılarına karşı IP bazlı rate limit uygulanır.

## Sonuçlar ve Değerlendirme (Consequences)

### Olumlu Etkiler (Positive)
- **Tek Giriş Kapısı:** İstemciler sadece tek bir port (5555) ile konuşur; iç mimarideki servislerin port ve IP değişimleri dış istemcileri etkilemez.
- **Kusursuz Geliştirici Deneyimi:** Tüm mikroservis dokümantasyonu tek bir web sayfasında toplanmıştır.
- **Uçtan Uca Dağıtık İzleme:** Gateway'e giren istekte otomatik bir `TraceId` üretilir ve tüm mikroservislere HTTP başlığı ile aktarılır.

### Olumsuz Etkiler ve Yönetilen Riskler (Trade-offs)
- **Tek Hata Noktası (Single Point of Failure):** API Gateway çökerse hiçbir servis dışarıdan erişilemez. Üretim ortamında Kubernetes Ingress veya DNS yük dengeleyici arkasında birden fazla replika olarak çalıştırılmalıdır.
