namespace SharedKernel.Locking;

/// <summary>
/// Distributed lock (RedLock) servis interface'i.
/// Saga Orchestrator'da race condition önlemek için kullanılır.
/// </summary>
public interface IDistributedLockService
{
    /// <summary>
    /// Distributed lock alır.
    /// </summary>
    /// <param name="lockKey">Lock key'i (CacheKeys.PropertyLock kullanın)</param>
    /// <param name="expiry">Lock süresi. Bu süre sonunda otomatik serbest bırakılır.</param>
    /// <param name="waitTime">Lock almak için maksimum bekleme süresi.</param>
    /// <returns>Lock handle. using bloğunda kullanın — dispose edilince lock serbest kalır. Alınamazsa null döner.</returns>
    Task<IDisposable?> AcquireLockAsync(
        string lockKey,
        TimeSpan expiry,
        TimeSpan waitTime,
        CancellationToken ct = default);
}
