using MongoDB.Driver;
using PropertyService.Application.Interfaces;
using PropertyService.Application.ReadModels;
using PropertyService.Infrastructure.Data;
using SharedKernel.Common;

namespace PropertyService.Infrastructure.Repositories;

public sealed class PropertyReadRepository(PropertyContext context) : IPropertyReadRepository
{
    public async Task<PagedResult<PropertyReadModel>> GetAllAsync(
        PagedQuery pagination,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<PropertyService.Domain.Entities.Property>.Filter.Empty;
        var totalCount = await context.Properties.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        var properties = await context.Properties.Find(filter)
            .SortBy(property => property.Id)
            .Skip(pagination.Skip)
            .Limit(pagination.PageSize)
            .ToListAsync(cancellationToken);
        return PagedResult<PropertyReadModel>.Create(
            properties.Select(ToReadModel).ToList(), (int)totalCount, pagination.Page, pagination.PageSize);
    }

    public async Task<PropertyReadModel?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var property = await context.Properties.Find(item => item.Id == id).FirstOrDefaultAsync(cancellationToken);
        return property is null ? null : ToReadModel(property);
    }

    public async Task<PagedResult<PropertyReadModel>> GetByLandlordAsync(
        Guid landlordId,
        PagedQuery pagination,
        CancellationToken cancellationToken = default)
    {
        var filter = Builders<PropertyService.Domain.Entities.Property>.Filter.Eq(item => item.LandlordId, landlordId);
        var totalCount = await context.Properties.CountDocumentsAsync(filter, cancellationToken: cancellationToken);
        var properties = await context.Properties.Find(filter)
            .SortBy(property => property.Id)
            .Skip(pagination.Skip)
            .Limit(pagination.PageSize)
            .ToListAsync(cancellationToken);
        return PagedResult<PropertyReadModel>.Create(
            properties.Select(ToReadModel).ToList(), (int)totalCount, pagination.Page, pagination.PageSize);
    }

    private static PropertyReadModel ToReadModel(PropertyService.Domain.Entities.Property property) =>
        new(property.Id, property.Name, property.Description, property.LandlordId,
            property.Address.Street, property.Address.City, property.Address.State, property.Address.ZipCode,
            property.Address.Country,
            property.Units.Select(unit => new UnitReadModel(unit.UnitId, unit.UnitNumber, unit.Floor,
                unit.SquareMeters, unit.RentAmount, unit.Currency, unit.Status)).ToList(),
            property.CreatedAt, property.UpdatedAt);
}
