namespace MaintenanceService.Application.Interfaces;

public interface IMaintenanceServiceLookup
{
    Task<IReadOnlyList<MaintenanceLeaseLookup>?> GetTenantLeasesAsync(
        Guid tenantId, string authorization, CancellationToken cancellationToken);
    Task<bool?> LandlordOwnsPropertyAsync(
        Guid landlordId, Guid propertyId, string authorization, CancellationToken cancellationToken);
}

public sealed record MaintenanceLeaseLookup(Guid PropertyId, Guid UnitId, string Status);
