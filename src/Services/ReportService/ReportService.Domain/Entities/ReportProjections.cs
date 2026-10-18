namespace ReportService.Domain.Entities;

public sealed class PropertyReportProjection
{
    private PropertyReportProjection() { }

    public Guid PropertyId { get; private set; }
    public Guid LandlordId { get; private set; }
    public DateTime ChangedAt { get; private set; }

    public static PropertyReportProjection Create(Guid propertyId, Guid landlordId, DateTime changedAt) =>
        new() { PropertyId = propertyId, LandlordId = landlordId, ChangedAt = changedAt };

    public void Update(Guid landlordId, DateTime changedAt)
    {
        if (changedAt < ChangedAt) return;
        LandlordId = landlordId;
        ChangedAt = changedAt;
    }
}

public sealed class LeaseReportProjection
{
    private LeaseReportProjection() { }

    public Guid LeaseId { get; private set; }
    public Guid LandlordId { get; private set; }
    public Guid PropertyId { get; private set; }
    public string Status { get; private set; } = string.Empty;
    public DateTime ChangedAt { get; private set; }

    public static LeaseReportProjection Create(Guid leaseId, Guid landlordId, Guid propertyId, string status, DateTime changedAt) =>
        new() { LeaseId = leaseId, LandlordId = landlordId, PropertyId = propertyId, Status = status, ChangedAt = changedAt };

    public void Update(string status, DateTime changedAt)
    {
        if (changedAt < ChangedAt) return;
        Status = status;
        ChangedAt = changedAt;
    }
}

public sealed class PaymentReportProjection
{
    private PaymentReportProjection() { }

    public Guid PaymentId { get; private set; }
    public Guid LeaseId { get; private set; }
    public decimal Amount { get; private set; }
    public string PaymentType { get; private set; } = string.Empty;
    public string Status { get; private set; } = string.Empty;
    public string Currency { get; private set; } = "UNKNOWN";
    public DateTime OccurredAt { get; private set; }

    public static PaymentReportProjection Create(
        Guid paymentId, Guid leaseId, decimal amount, string paymentType, string status, DateTime occurredAt, string currency = "UNKNOWN") =>
        new() { PaymentId = paymentId, LeaseId = leaseId, Amount = amount, PaymentType = paymentType, Status = status, Currency = currency, OccurredAt = occurredAt };

    public void Update(string status, DateTime occurredAt, string currency)
    {
        if (occurredAt < OccurredAt) return;
        Status = status;
        OccurredAt = occurredAt;
        Currency = currency;
    }
}

public sealed class MaintenanceReportProjection
{
    private MaintenanceReportProjection() { }

    public Guid MaintenanceId { get; private set; }
    public Guid PropertyId { get; private set; }
    public string Status { get; private set; } = string.Empty;
    public decimal? EstimatedCost { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }

    public static MaintenanceReportProjection Create(
        Guid id, Guid propertyId, string status, decimal? cost, DateTime createdAt, DateTime? updatedAt) =>
        new() { MaintenanceId = id, PropertyId = propertyId, Status = status, EstimatedCost = cost, CreatedAt = createdAt, UpdatedAt = updatedAt };

    public void Update(string status, decimal? cost, DateTime createdAt, DateTime? updatedAt)
    {
        if ((updatedAt ?? createdAt) < (UpdatedAt ?? CreatedAt)) return;
        Status = status;
        EstimatedCost = cost;
        CreatedAt = createdAt;
        UpdatedAt = updatedAt;
    }
}
