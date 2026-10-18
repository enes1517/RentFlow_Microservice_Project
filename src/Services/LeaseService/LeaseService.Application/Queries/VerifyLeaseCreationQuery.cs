using LeaseService.Application.Interfaces;
using MediatR;

namespace LeaseService.Application.Queries;

public sealed record VerifyLeaseCreationQuery(
    Guid TenantId,
    Guid PropertyId,
    Guid UnitId,
    Guid LandlordId,
    string Authorization) : IRequest<LeaseCreationVerification>;

public enum LeaseCreationVerificationFailure
{
    None,
    TenantUnavailable,
    TenantIsNotTenant,
    PropertyUnavailable,
    LandlordMismatch,
    UnitUnavailable,
    UnsupportedCurrency
}

public sealed record LeaseCreationVerification(
    LeaseCreationVerificationFailure Failure,
    decimal MonthlyRentAmount);

public sealed class VerifyLeaseCreationQueryHandler(ILeaseServiceLookup lookup)
    : IRequestHandler<VerifyLeaseCreationQuery, LeaseCreationVerification>
{
    public async Task<LeaseCreationVerification> Handle(
        VerifyLeaseCreationQuery request, CancellationToken cancellationToken)
    {
        var tenant = await lookup.GetUserRoleAsync(request.TenantId, request.Authorization, cancellationToken);
        if (tenant is null)
            return new LeaseCreationVerification(LeaseCreationVerificationFailure.TenantUnavailable, 0);
        if (tenant.Role != "TENANT")
            return new LeaseCreationVerification(LeaseCreationVerificationFailure.TenantIsNotTenant, 0);

        var property = await lookup.GetPropertyAsync(request.PropertyId, request.Authorization, cancellationToken);
        if (property is null)
            return new LeaseCreationVerification(LeaseCreationVerificationFailure.PropertyUnavailable, 0);
        if (property.LandlordId != request.LandlordId)
            return new LeaseCreationVerification(LeaseCreationVerificationFailure.LandlordMismatch, 0);

        var unit = property.Units.FirstOrDefault(candidate => candidate.Id == request.UnitId);
        if (unit is null || unit.Status != "AVAILABLE")
            return new LeaseCreationVerification(LeaseCreationVerificationFailure.UnitUnavailable, 0);
        if (unit.Currency != "TRY")
            return new LeaseCreationVerification(LeaseCreationVerificationFailure.UnsupportedCurrency, 0);

        return new LeaseCreationVerification(LeaseCreationVerificationFailure.None, unit.RentAmount);
    }
}
