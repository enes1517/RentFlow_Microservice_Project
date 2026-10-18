using PropertyService.Domain.Entities;

namespace PropertyService.Application.Interfaces;

public interface IPropertyWriteRepository
{
    Task<Property?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(Property property, CancellationToken cancellationToken = default);
    Task UpdateAsync(Property property, CancellationToken cancellationToken = default);
    Task<bool> ReserveUnitAsync(Guid propertyId, Guid unitId, Guid landlordId, Guid leaseId, CancellationToken cancellationToken = default);
    Task ReleaseUnitReservationAsync(Guid propertyId, Guid unitId, Guid? leaseId = null, CancellationToken cancellationToken = default);
    Task<bool> MarkUnitRentedAsync(Guid propertyId, Guid unitId, Guid leaseId, CancellationToken cancellationToken = default);
}
