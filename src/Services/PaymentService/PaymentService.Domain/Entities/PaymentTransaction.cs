using SharedKernel.Entities;

namespace PaymentService.Domain.Entities;

public class PaymentTransaction : BaseEntity
{
    public Guid LeaseId { get; private set; }
    public Guid TenantId { get; private set; }
    
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = "TRY";
    
    // Type: RENT, DEPOSIT, LATE_FEE
    public string PaymentType { get; private set; } = string.Empty;
    
    // Status: PENDING, SUCCESS, FAILED
    public string Status { get; private set; } = "PENDING";
    
    public string? FailureReason { get; private set; }

    protected PaymentTransaction() { } // EF Core

    public static PaymentTransaction Create(Guid leaseId, Guid tenantId, decimal amount, string paymentType, string currency = "TRY")
    {
        if (leaseId == Guid.Empty || tenantId == Guid.Empty)
            throw new ArgumentException("Lease and tenant IDs are required.");
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Payment amount must be positive.");
        if (paymentType is not ("RENT" or "DEPOSIT" or "LATE_FEE"))
            throw new ArgumentException("Payment type is not supported.", nameof(paymentType));
        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3 ||
            currency.Any(character => !char.IsAsciiLetterUpper(character)))
            throw new ArgumentException("Currency must be a three-letter uppercase code.", nameof(currency));

        return new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            LeaseId = leaseId,
            TenantId = tenantId,
            Amount = amount,
            PaymentType = paymentType,
            Currency = currency,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void MarkAsSuccess()
    {
        Status = "SUCCESS";
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsFailed(string reason)
    {
        Status = "FAILED";
        FailureReason = reason;
        UpdatedAt = DateTime.UtcNow;
    }
}
