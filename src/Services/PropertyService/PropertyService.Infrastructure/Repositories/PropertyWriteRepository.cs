using MongoDB.Driver;
using PropertyService.Application.Interfaces;
using PropertyService.Domain.Entities;
using PropertyService.Infrastructure.Data;

namespace PropertyService.Infrastructure.Repositories;

public sealed class PropertyWriteRepository(PropertyContext context) : IPropertyWriteRepository
{
    public async Task<Property?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken = default) =>
        await context.Properties.Find(property => property.Id == id).FirstOrDefaultAsync(cancellationToken);

    public Task AddAsync(Property property, CancellationToken cancellationToken = default) =>
        context.Properties.InsertOneAsync(property, null, cancellationToken);

    public Task UpdateAsync(Property property, CancellationToken cancellationToken = default) =>
        context.Properties.ReplaceOneAsync(item => item.Id == property.Id, property, new ReplaceOptions(), cancellationToken);

    public async Task<bool> ReserveUnitAsync(
        Guid propertyId,
        Guid unitId,
        Guid landlordId,
        Guid leaseId,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<Property>.Filter.Eq(property => property.Id, propertyId) &
                     Builders<Property>.Filter.Eq(property => property.LandlordId, landlordId) &
                     Builders<Property>.Filter.ElemMatch(
                         property => property.Units,
                         unit => unit.UnitId == unitId &&
                             (unit.Status == "AVAILABLE" ||
                              (unit.Status == "RESERVED" && unit.ReservedForLeaseId == leaseId)));
        var update = Builders<Property>.Update
            .Set("Units.$.Status", "RESERVED")
            .Set("Units.$.ReservedForLeaseId", leaseId)
            .Set(property => property.UpdatedAt, DateTime.UtcNow);
        var result = await context.Properties.UpdateOneAsync(filter, update, cancellationToken: cancellationToken);
        return result.MatchedCount == 1;
    }

    public async Task ReleaseUnitReservationAsync(
        Guid propertyId,
        Guid unitId,
        Guid? leaseId = null,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<Property>.Filter.Eq(property => property.Id, propertyId) &
                     Builders<Property>.Filter.ElemMatch(
                         property => property.Units,
                         unit => unit.UnitId == unitId &&
                             (unit.Status == "RESERVED" || unit.Status == "RENTED") &&
                             (leaseId == null || unit.ReservedForLeaseId == leaseId));
        var update = Builders<Property>.Update
            .Set("Units.$.Status", "AVAILABLE")
            .Unset("Units.$.ReservedForLeaseId")
            .Set(property => property.UpdatedAt, DateTime.UtcNow);
        await context.Properties.UpdateOneAsync(filter, update, cancellationToken: cancellationToken);
    }

    public async Task<bool> MarkUnitRentedAsync(
        Guid propertyId,
        Guid unitId,
        Guid leaseId,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<Property>.Filter.Eq(property => property.Id, propertyId) &
                     Builders<Property>.Filter.ElemMatch(
                         property => property.Units,
                         unit => unit.UnitId == unitId &&
                             (unit.Status == "RESERVED" && unit.ReservedForLeaseId == leaseId ||
                              unit.Status == "RENTED" && unit.ReservedForLeaseId == leaseId));
        var update = Builders<Property>.Update
            .Set("Units.$.Status", "RENTED")
            .Set(property => property.UpdatedAt, DateTime.UtcNow);
        var result = await context.Properties.UpdateOneAsync(filter, update, cancellationToken: cancellationToken);
        return result.MatchedCount == 1;
    }
}
