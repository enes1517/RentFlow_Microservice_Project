namespace LeaseService.Application.Interfaces;

public interface ILeaseServiceLookup
{
    Task<UserRoleLookup?> GetUserRoleAsync(Guid userId, string authorization, CancellationToken cancellationToken);
    Task<PropertyLeaseLookup?> GetPropertyAsync(Guid propertyId, string authorization, CancellationToken cancellationToken);
}

public sealed record UserRoleLookup(Guid Id, string Role);
public sealed record PropertyLeaseLookup(Guid LandlordId, IReadOnlyList<LeaseUnitLookup> Units);
public sealed record LeaseUnitLookup(Guid Id, decimal RentAmount, string Currency, string Status);
