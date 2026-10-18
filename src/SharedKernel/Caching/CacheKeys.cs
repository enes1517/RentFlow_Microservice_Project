namespace SharedKernel.Caching;

/// <summary>
/// Merkezi cache key sabitleri.
/// Magic string kullanımını önler, key çakışmalarını engeller.
/// </summary>
public static class CacheKeys
{
    private const string Prefix = "rent-mgmt";

    // ─── User Service ────────────────────────────────
    /// <summary>Kullanıcı profili — 30 dk TTL</summary>
    public static string UserProfile(Guid userId) =>
        $"{Prefix}:user:profile:{userId}";

    /// <summary>Keycloak ID → User ID eşleşmesi — 60 dk TTL</summary>
    public static string UserByKeycloak(string keycloakId) =>
        $"{Prefix}:user:keycloak:{keycloakId}";

    // ─── Property Service ────────────────────────────
    /// <summary>Mülk arama sonuçları — 5 dk TTL (filtre hash'i ile)</summary>
    public static string PropertySearch(string filterHash) =>
        $"{Prefix}:property:search:{filterHash}";

    /// <summary>Tek mülk detayı — 10 dk TTL</summary>
    public static string PropertyDetail(Guid propertyId) =>
        $"{Prefix}:property:detail:{propertyId}";

    // ─── Lease Service ───────────────────────────────
    /// <summary>Kiracının aktif sözleşmesi — 10 dk TTL</summary>
    public static string ActiveLease(Guid tenantId) =>
        $"{Prefix}:lease:active:{tenantId}";

    /// <summary>Ödeme takvimi — 30 dk TTL</summary>
    public static string PaymentSchedule(Guid leaseId) =>
        $"{Prefix}:lease:schedule:{leaseId}";

    // ─── Payment Service ─────────────────────────────
    /// <summary>Yaklaşan ödemeler — 5 dk TTL</summary>
    public static string UpcomingPayments(string date) =>
        $"{Prefix}:payment:upcoming:{date}";

    // ─── Notification Service ────────────────────────
    /// <summary>Bildirim şablonu — 1 saat TTL</summary>
    public static string NotificationTemplate(string templateId) =>
        $"{Prefix}:notification:template:{templateId}";

    // ─── Report Service ──────────────────────────────
    /// <summary>Landlord aylık gelir raporu — 15 dk TTL</summary>
    public static string MonthlyReport(Guid landlordId, int year, int month) =>
        $"{Prefix}:report:monthly:{landlordId}:{year}:{month:D2}";

    // ─── Saga Orchestrator ───────────────────────────
    /// <summary>Saga istatistikleri — 30 sn TTL (admin dashboard)</summary>
    public static string SagaStats() =>
        $"{Prefix}:saga:stats";

    // ─── Redis RedLock ───────────────────────────────
    /// <summary>Mülk müsaitlik kilidi — Race condition önleme</summary>
    public static string PropertyLock(Guid propertyId) =>
        $"{Prefix}:lock:property:{propertyId}";

    // ─── Idempotency ─────────────────────────────────
    /// <summary>Kafka mesaj idempotency key — 24 saat TTL</summary>
    public static string ProcessedMessage(string messageId) =>
        $"{Prefix}:idempotency:{messageId}";

    // ─── JWT Blacklist ───────────────────────────────
    /// <summary>Logout edilen token — Token süresi kadar TTL</summary>
    public static string JwtBlacklist(string jti) =>
        $"{Prefix}:jwt:blacklist:{jti}";
}
