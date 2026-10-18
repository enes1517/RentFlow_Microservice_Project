using SharedKernel.Entities;
using System;

namespace UserService.Domain.Entities;

public class TenantInvitation : BaseEntity
{
    public string Email { get; private set; } = string.Empty;
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    
    public Guid LandlordId { get; private set; }
    public Guid PropertyId { get; private set; }
    public Guid UnitId { get; private set; }
    
    public decimal RentAmount { get; private set; }
    public decimal DepositAmount { get; private set; }
    
    public string InvitationToken { get; private set; } = string.Empty;
    public bool IsUsed { get; private set; }
    public DateTime ExpiresAt { get; private set; }

    protected TenantInvitation() { } // EF Core

    public static TenantInvitation Create(
        string email, 
        string firstName, 
        string lastName, 
        Guid landlordId, 
        Guid propertyId, 
        Guid unitId, 
        decimal rentAmount, 
        decimal depositAmount)
    {
        return new TenantInvitation
        {
            Id = Guid.NewGuid(),
            Email = email.ToLowerInvariant(),
            FirstName = firstName,
            LastName = lastName,
            LandlordId = landlordId,
            PropertyId = propertyId,
            UnitId = unitId,
            RentAmount = rentAmount,
            DepositAmount = depositAmount,
            InvitationToken = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsUsed = false,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void MarkAsUsed()
    {
        if (IsUsed) throw new InvalidOperationException("This invitation is already used.");
        IsUsed = true;
        UpdatedAt = DateTime.UtcNow;
    }
}
