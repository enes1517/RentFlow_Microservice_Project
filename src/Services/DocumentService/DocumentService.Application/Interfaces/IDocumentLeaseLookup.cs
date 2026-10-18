namespace DocumentService.Application.Interfaces;

public interface IDocumentLeaseLookup
{
    Task<DocumentLeaseLookup?> GetLeaseAsync(Guid leaseId, string authorization, CancellationToken cancellationToken);
}

public sealed record DocumentLeaseLookup(
    Guid TenantId,
    Guid LandlordId,
    Guid PropertyId,
    decimal MonthlyRentAmount,
    decimal DepositAmount,
    string Status,
    Guid? UnitId = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null);
