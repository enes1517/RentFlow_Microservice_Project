namespace LeaseService.Application.ReadModels;

public sealed record LeaseReadModel(
    Guid Id, Guid TenantId, Guid LandlordId, Guid PropertyId, Guid UnitId,
    DateTime StartDate, DateTime EndDate, decimal MonthlyRentAmount,
    decimal DepositAmount, string Status, DateTime CreatedAt, DateTime? UpdatedAt);
