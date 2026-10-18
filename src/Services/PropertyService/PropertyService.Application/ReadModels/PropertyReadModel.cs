namespace PropertyService.Application.ReadModels;

public sealed record UnitReadModel(Guid Id, string UnitNumber, int Floor, decimal SquareMeters, decimal RentAmount, string Currency, string Status);

public sealed record PropertyReadModel(
    Guid Id, string Name, string Description, Guid LandlordId, string Street, string City,
    string State, string ZipCode, string Country, IReadOnlyList<UnitReadModel> Units,
    DateTime CreatedAt, DateTime? UpdatedAt);
