using SharedKernel.Entities;

namespace LeaseService.Domain.Entities;

public class LeaseAgreement : BaseEntity
{
    public Guid TenantId { get; private set; } // Keycloak / UserService'den
    public Guid LandlordId { get; private set; }
    public Guid PropertyId { get; private set; }
    public Guid UnitId { get; private set; } // Hangi daire

    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }
    
    public decimal MonthlyRentAmount { get; private set; }
    public decimal DepositAmount { get; private set; }
    
    // Status: PENDING (Saga başladı), ACTIVE (Saga başarılı oldu), COMPLETED, CANCELLED
    public string Status { get; private set; } = "PENDING"; 

    protected LeaseAgreement() { } // For EF Core

    public static LeaseAgreement Create(Guid tenantId, Guid landlordId, Guid propertyId, Guid unitId, DateTime startDate, DateTime endDate, decimal monthlyRent, decimal deposit)
    {
        if (tenantId == Guid.Empty || landlordId == Guid.Empty || propertyId == Guid.Empty || unitId == Guid.Empty)
            throw new ArgumentException("Tenant, landlord, property, and unit IDs are required.");
        if (startDate >= endDate)
            throw new ArgumentException("The lease end date must be after its start date.");
        if (monthlyRent <= 0 || deposit < 0)
            throw new ArgumentOutOfRangeException(nameof(monthlyRent), "Rent must be positive and deposit cannot be negative.");

        return new LeaseAgreement
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            LandlordId = landlordId,
            PropertyId = propertyId,
            UnitId = unitId,
            StartDate = startDate.ToUniversalTime(),
            EndDate = endDate.ToUniversalTime(),
            MonthlyRentAmount = monthlyRent,
            DepositAmount = deposit,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Activate()
    {
        if (Status != "PENDING")
            throw new InvalidOperationException("Only a pending lease can be activated.");
        Status = "ACTIVE";
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        if (Status == "CANCELLED")
            return;
        if (Status is "CANCELLED" or "COMPLETED")
            throw new InvalidOperationException("A completed or cancelled lease cannot be cancelled.");
        Status = "CANCELLED";
        UpdatedAt = DateTime.UtcNow;
    }

    public void Complete()
    {
        Status = "COMPLETED";
        UpdatedAt = DateTime.UtcNow;
    }
}
