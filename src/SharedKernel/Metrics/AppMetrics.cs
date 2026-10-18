using Prometheus;

namespace SharedKernel.Metrics;

public static class AppMetrics
{
    public static readonly Counter RedisCacheHits = Prometheus.Metrics.CreateCounter(
        "redis_cache_hits_total",
        "Total number of Redis cache hits",
        new CounterConfiguration
        {
            LabelNames = new[] { "service", "key_type" }
        });

    public static readonly Counter RedisCacheMisses = Prometheus.Metrics.CreateCounter(
        "redis_cache_misses_total",
        "Total number of Redis cache misses",
        new CounterConfiguration
        {
            LabelNames = new[] { "service", "key_type" }
        });

    public static readonly Counter RedLockAcquired = Prometheus.Metrics.CreateCounter(
        "redis_lock_acquired_total",
        "Total number of RedLock acquired successfully",
        new CounterConfiguration
        {
            LabelNames = new[] { "service", "lock_key" }
        });

    public static readonly Counter RedLockFailed = Prometheus.Metrics.CreateCounter(
        "redis_lock_failed_total",
        "Total number of RedLock acquisition failures (contention or timeout)",
        new CounterConfiguration
        {
            LabelNames = new[] { "service", "lock_key" }
        });

    public static readonly Counter KafkaIdempotencyBlocked = Prometheus.Metrics.CreateCounter(
        "kafka_idempotency_blocked_total",
        "Total number of duplicate Kafka messages blocked by idempotency checks",
        new CounterConfiguration
        {
            LabelNames = new[] { "service", "message_type" }
        });

    public static readonly Counter SagaCompleted = Prometheus.Metrics.CreateCounter(
        "saga_completed_total",
        "Total number of successfully completed Sagas",
        new CounterConfiguration
        {
            LabelNames = new[] { "saga_type" }
        });

    public static readonly Counter SagaFailed = Prometheus.Metrics.CreateCounter(
        "saga_failed_total",
        "Total number of failed Sagas (including compensations)",
        new CounterConfiguration
        {
            LabelNames = new[] { "saga_type" }
        });

    public static readonly Histogram SagaDuration = Prometheus.Metrics.CreateHistogram(
        "saga_duration_seconds",
        "Duration of saga execution in seconds",
        new HistogramConfiguration
        {
            LabelNames = new[] { "saga_type" }
        });
}
