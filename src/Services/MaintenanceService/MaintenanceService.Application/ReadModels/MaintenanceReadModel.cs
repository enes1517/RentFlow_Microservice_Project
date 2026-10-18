namespace MaintenanceService.Application.ReadModels;

public sealed record MaintenanceReadModel(
    Guid Id, Guid TenantId, Guid PropertyId, Guid UnitId, string Title, string Description,
    string Priority, string Status, decimal? EstimatedCost, DateTime CreatedAt, DateTime? UpdatedAt);
