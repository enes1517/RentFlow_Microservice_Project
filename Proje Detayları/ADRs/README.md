# RentFlow — Mimari Karar Kayıtları (Architecture Decision Records - ADR)

Bu dizin, **RentFlow (Akıllı Kira Yönetim Sistemi)** projesinin mimarisini, teknik stratejilerini, tasarım kalıplarını ve teknoloji seçimlerini belirleyen tüm resmi Mimari Karar Kayıtlarını (ADR) içerir.

Tüm kayıtlar Michael Nygard formatı ve endüstri standardı şablonlara uygun olarak belgelenmiştir.

---

## 📋 ADR Dizin ve Durum Tablosu

| No | Mimari Karar Başlığı | Durum | Kategori | Belge Linki |
|:---:|---|:---:|:---:|---|
| **001** | **Mikroservis Mimarisi, DDD ve Clean Architecture** | `Kabul Edildi` | Mimari & Tasarım | [001-microservices-and-clean-architecture.md](001-microservices-and-clean-architecture.md) |
| **002** | **Çoklu Veri Depolama Stratejisi (Polyglot Persistence)** | `Kabul Edildi` | Veri & Depolama | [002-polyglot-persistence.md](002-polyglot-persistence.md) |
| **003** | **Dağıtık İşlemler ve Saga Orkestrasyon Mimarisi** | `Kabul Edildi` | İşlem & Tutarlılık | [003-distributed-transactions-saga-orchestrator.md](003-distributed-transactions-saga-orchestrator.md) |
| **004** | **Olay Güdümlü Mimari ve Transactional Outbox Deseni** | `Kabul Edildi` | Mesajlaşma & Dayanıklılık | [004-event-driven-architecture-and-outbox-pattern.md](004-event-driven-architecture-and-outbox-pattern.md) |
| **005** | **Merkezi Kimlik ve Yetkilendirme Mimarisi (Keycloak & OIDC)** | `Kabul Edildi` | Güvenlik & Kimlik | [005-centralized-identity-and-access-management.md](005-centralized-identity-and-access-management.md) |
| **006** | **Redis Dağıtık Önbellekleme, Kilitleme ve Eşzamanlılık Stratejisi** | `Kısmen Uygulandı` | Performans & Önbellek | [006-redis-strategy.md](006-redis-strategy.md) |
| **007** | **API Gateway ve Ters Dizin Mimarisi (Microsoft YARP)** | `Kabul Edildi` | Ağ & Ağ Geçidi | [007-api-gateway-and-reverse-proxy-yarp.md](007-api-gateway-and-reverse-proxy-yarp.md) |
| **008** | **CQRS ve Olay Güdümlü Raporlama Projeksiyonları Mimarisi** | `Kabul Edildi` | CQRS & Raporlama | [008-cqrs-and-reporting-projections.md](008-cqrs-and-reporting-projections.md) |
| **009** | **Modern Frontend Mimarisi (Angular 22 & NgRx)** | `Kabul Edildi` | Frontend & İstemci | [009-modern-frontend-angular-ngrx.md](009-modern-frontend-angular-ngrx.md) |
| **010** | **Kapsamlı Gözlemlenebilirlik, Dağıtık İzleme ve Telemetri** | `Kabul Edildi` | DevOps & Telemetri | [010-observability-telemetry-and-monitoring.md](010-observability-telemetry-and-monitoring.md) |

---

## 🎯 Mimari Karar Süreci ve İlkeler

1. **İzolasyon ve Bağımsızlık:** Her mikroservis kendi etki alanının (Bounded Context) mutlak sahibidir. Servisler arası veritabanı paylaşımı kesinlikle yasaktır.
2. **Nihai Tutarlılık (Eventual Consistency):** Dağıtık işlemler 2PC kilitleriyle değil, MassTransit Saga durum makineleri ve telafi edici işlemler (compensations) ile yönetilir.
3. **Veri Kaybı Sıfır:** İkili yazma (dual-write) hatalarını önlemek için tüm kritik olaylar Transactional Outbox deseni ile yerel transaction'a bağlanır.
4. **Çift Katmanlı Güvenlik (Defense-in-Depth):** İstemci katmanında route guard'lar, Gateway katmanında rate limiting ve downstream servislerde JWT rol denetimleri (`ROLE_ADMIN`, `ROLE_LANDLORD`, `ROLE_TENANT`) uygulanır.
5. **Açık Standartlar ve Gözlemlenebilirlik:** W3C TraceContext, OpenTelemetry, OIDC/OAuth2 ve Prometheus metrikleri ile sistem her an şeffaf ve denetlenebilir durumdadır.
