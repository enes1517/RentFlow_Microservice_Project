namespace SharedKernel.Messaging;

/// <summary>
/// Outbox Pattern için mesaj entity'si.
/// RabbitMQ'ya gönderilmeden önce aynı DB transaction'ında yazılır.
/// At-least-once delivery garantisi sağlar.
/// </summary>
public sealed class OutboxMessage
{
    public const int MaximumRetryCount = 10;

    public Guid Id { get; private set; } = Guid.NewGuid();

    /// <summary>Mesaj sözleşmesinin türü.</summary>
    public string MessageType { get; private set; } = null!;

    /// <summary>JSON serialize edilmiş mesaj içeriği</summary>
    public string Payload { get; private set; } = null!;

    /// <summary>İlgili event grubu.</summary>
    public string Topic { get; private set; } = null!;

    /// <summary>Mesajın oluşturulduğu zaman</summary>
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    /// <summary>İşlendiği zaman. Null ise henüz gönderilmedi.</summary>
    public DateTime? ProcessedAt { get; private set; }

    /// <summary>Gönderim denemesi sayısı</summary>
    public int RetryCount { get; private set; }

    /// <summary>Son hata mesajı</summary>
    public string? LastError { get; private set; }

    private OutboxMessage() { }

    public static OutboxMessage Create(string messageType, string payload, string topic)
    {
        return new OutboxMessage
        {
            MessageType = messageType,
            Payload = payload,
            Topic = topic
        };
    }

    public void MarkAsProcessed()
    {
        ProcessedAt = DateTime.UtcNow;
    }

    public void MarkAsFailed(string error)
    {
        LastError = error;
        RetryCount++;
    }

    public bool ShouldRetry => RetryCount < MaximumRetryCount && ProcessedAt is null;
}
