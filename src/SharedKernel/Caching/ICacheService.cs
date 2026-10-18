namespace SharedKernel.Caching;

/// <summary>
/// Distributed cache servis interface'i.
/// Redis implementasyonu ile tüm servislerde kullanılır.
/// </summary>
public interface ICacheService
{
    /// <summary>
    /// Cache'den değer okur. Key yoksa veya Redis cache-aside okuma sırasında erişilemiyorsa null döner.
    /// Cancellation ve serileştirme dışı beklenmeyen hatalar çağırana taşınır.
    /// </summary>
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);

    /// <summary>Cache'e değer yazar; Redis kaynaklı cache-aside hataları loglanıp yutulur.</summary>
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default);

    /// <summary>Cache'den key siler; Redis kaynaklı cache-aside hataları loglanıp yutulur.</summary>
    Task RemoveAsync(string key, CancellationToken ct = default);

    /// <summary>Key var mı kontrol eder; Redis hataları çağırana taşınır.</summary>
    Task<bool> ExistsAsync(string key, CancellationToken ct = default);

    /// <summary>
    /// SET NX (Set If Not Exists) — Idempotency key için kullanılır.
    /// true: key yeni oluşturuldu (ilk işlem), false: zaten vardı (duplicate).
    /// </summary>
    Task<bool> SetIfNotExistsAsync(string key, string value, TimeSpan expiry, CancellationToken ct = default);

    /// <summary>Pattern ile eşleşen tüm key'leri siler. Dikkatli kullanılmalı!</summary>
    Task RemoveByPatternAsync(string pattern, CancellationToken ct = default);
}
