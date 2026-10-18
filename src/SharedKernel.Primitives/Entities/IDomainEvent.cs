namespace SharedKernel.Entities;

/// <summary>
/// Domain event marker interface'i.
/// Tüm domain event'leri bu interface'i implement eder.
/// </summary>
public interface IDomainEvent
{
    Guid EventId { get; }
    DateTime OccurredAt { get; }
}

/// <summary>
/// Domain event base record — Record kullanımı immutability sağlar.
/// </summary>
public abstract record DomainEventBase : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}
