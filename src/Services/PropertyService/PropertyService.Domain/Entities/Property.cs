namespace PropertyService.Domain.Entities;

public class Property
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    
    // Ev Sahibinin (Landlord) UserId'si (Keycloak veya UserService'den gelen)
    public Guid LandlordId { get; private set; }
    
    public Address Address { get; private set; } = null!;
    
    public List<Unit> Units { get; private set; } = new();

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; private set; }

    protected Property() { }

    public static Property Create(string name, string description, Guid landlordId, Address address)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Length > 150)
            throw new ArgumentException("Property name is required and cannot exceed 150 characters.", nameof(name));
        if (landlordId == Guid.Empty)
            throw new ArgumentException("A landlord is required.", nameof(landlordId));
        if (address is null || string.IsNullOrWhiteSpace(address.Street) ||
            string.IsNullOrWhiteSpace(address.City) || string.IsNullOrWhiteSpace(address.Country))
            throw new ArgumentException("A complete property address is required.", nameof(address));

        return new Property
        {
            Name = name,
            Description = description,
            LandlordId = landlordId,
            Address = address
        };
    }

    public void AddUnit(Unit unit)
    {
        if (Units.Any(existing => string.Equals(existing.UnitNumber, unit.UnitNumber, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("A unit with this number already exists in the property.");
        Units.Add(unit);
        UpdatedAt = DateTime.UtcNow;
    }
}

public class Address
{
    public string Street { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

public class Unit
{
    public Guid UnitId { get; private set; } = Guid.NewGuid();
    public string UnitNumber { get; private set; } = string.Empty;
    public int Floor { get; private set; }
    public decimal SquareMeters { get; private set; }
    public decimal RentAmount { get; private set; }
    public string Currency { get; private set; } = "TRY";
    
    // Status: AVAILABLE, RENTED, MAINTENANCE
    public string Status { get; private set; } = "AVAILABLE";
    public Guid? ReservedForLeaseId { get; private set; }

    protected Unit() { }

    public static Unit Create(string unitNumber, int floor, decimal squareMeters, decimal rentAmount, string currency)
    {
        if (string.IsNullOrWhiteSpace(unitNumber) || unitNumber.Length > 30)
            throw new ArgumentException("Unit number is required and cannot exceed 30 characters.", nameof(unitNumber));
        if (squareMeters <= 0 || rentAmount <= 0)
            throw new ArgumentOutOfRangeException(nameof(squareMeters), "Unit area and rent must be positive.");
        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3 ||
            currency.Any(character => !char.IsAsciiLetterUpper(character)))
            throw new ArgumentException("Currency must be a three-letter uppercase code.", nameof(currency));

        return new Unit
        {
            UnitNumber = unitNumber,
            Floor = floor,
            SquareMeters = squareMeters,
            RentAmount = rentAmount,
            Currency = currency
        };
    }
    
    public void UpdateStatus(string newStatus)
    {
        Status = newStatus;
    }
}
