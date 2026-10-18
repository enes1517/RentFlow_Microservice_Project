using MediatR;
using MaintenanceService.Application.Interfaces;

namespace MaintenanceService.Application.Queries;

public sealed record GetTenantLeasesQuery(Guid TenantId, string Authorization)
    : IRequest<IReadOnlyList<MaintenanceLeaseLookup>?>;

public sealed class GetTenantLeasesQueryHandler(IMaintenanceServiceLookup lookup)
    : IRequestHandler<GetTenantLeasesQuery, IReadOnlyList<MaintenanceLeaseLookup>?>
{
    public Task<IReadOnlyList<MaintenanceLeaseLookup>?> Handle(
        GetTenantLeasesQuery request, CancellationToken cancellationToken) =>
        lookup.GetTenantLeasesAsync(request.TenantId, request.Authorization, cancellationToken);
}

public sealed record CheckPropertyOwnershipQuery(Guid LandlordId, Guid PropertyId, string Authorization)
    : IRequest<bool?>;

public sealed class CheckPropertyOwnershipQueryHandler(IMaintenanceServiceLookup lookup)
    : IRequestHandler<CheckPropertyOwnershipQuery, bool?>
{
    public Task<bool?> Handle(CheckPropertyOwnershipQuery request, CancellationToken cancellationToken) =>
        lookup.LandlordOwnsPropertyAsync(
            request.LandlordId, request.PropertyId, request.Authorization, cancellationToken);
}
