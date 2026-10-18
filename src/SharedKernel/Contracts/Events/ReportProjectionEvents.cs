namespace SharedKernel.Contracts.Events;

public sealed record PropertyReportDataChangedEvent(
    Guid EventId,
    Guid PropertyId,
    Guid LandlordId,
    DateTime ChangedAt);

public sealed record MaintenanceReportDataChangedEvent(
    Guid EventId,
    Guid MaintenanceId,
    Guid PropertyId,
    string Status,
    decimal? EstimatedCost,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
