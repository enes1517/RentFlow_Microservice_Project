using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Prometheus;
using SharedKernel.Metrics;
using StackExchange.Redis;

namespace SharedKernel.Caching;

public class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly IConnectionMultiplexer _connectionMultiplexer;
    private readonly ILogger<RedisCacheService> _logger;

    public RedisCacheService(
        IDistributedCache cache, 
        IConnectionMultiplexer connectionMultiplexer,
        ILogger<RedisCacheService> logger)
    {
        _cache = cache;
        _connectionMultiplexer = connectionMultiplexer;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        try
        {
            var data = await _cache.GetStringAsync(key, ct);
            var keyType = key.Split(':').FirstOrDefault() ?? "unknown";
            
            if (data == null)
            {
                AppMetrics.RedisCacheMisses.WithLabels("SharedKernel", keyType).Inc();
                return default;
            }
            
            AppMetrics.RedisCacheHits.WithLabels("SharedKernel", keyType).Inc();
            return JsonSerializer.Deserialize<T>(data);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex, "Redis connection failed. Bypassing cache for GetAsync. Key: {Key}", key);
            return default;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Cached value could not be deserialized. Key: {Key}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default)
    {
        try
        {
            var options = new DistributedCacheEntryOptions();
            if (expiry.HasValue)
            {
                options.AbsoluteExpirationRelativeToNow = expiry.Value;
            }

            var json = JsonSerializer.Serialize(value);
            await _cache.SetStringAsync(key, json, options, ct);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex, "Redis connection failed. Bypassing cache for SetAsync. Key: {Key}", key);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        try
        {
            await _cache.RemoveAsync(key, ct);
        }
        catch (RedisException ex)
        {
            _logger.LogWarning(ex, "Redis connection failed. Bypassing cache for RemoveAsync. Key: {Key}", key);
        }
    }

    public async Task<bool> ExistsAsync(string key, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        var db = _connectionMultiplexer.GetDatabase();
        return await db.KeyExistsAsync(key);
    }

    public async Task<bool> SetIfNotExistsAsync(string key, string value, TimeSpan expiry, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        var db = _connectionMultiplexer.GetDatabase();
        return await db.StringSetAsync(key, value, expiry, When.NotExists);
    }

    public async Task RemoveByPatternAsync(string pattern, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        var endpoints = _connectionMultiplexer.GetEndPoints();
        if (endpoints.Length == 0)
        {
            throw new InvalidOperationException("Redis has no configured endpoints.");
        }

        var server = _connectionMultiplexer.GetServer(endpoints[0]);
        var keys = server.Keys(pattern: pattern);
        var db = _connectionMultiplexer.GetDatabase();
        foreach (var key in keys)
        {
            ct.ThrowIfCancellationRequested();
            await db.KeyDeleteAsync(key);
        }
    }
}
