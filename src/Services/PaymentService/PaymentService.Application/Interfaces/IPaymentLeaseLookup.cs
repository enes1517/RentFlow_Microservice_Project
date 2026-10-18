namespace PaymentService.Application.Interfaces;

public interface IPaymentLeaseLookup
{
    Task<PaymentLeaseLookup?> GetLeaseAsync(Guid leaseId, string authorization, CancellationToken cancellationToken);
}

public sealed record PaymentLeaseLookup(
    Guid TenantId,
    Guid LandlordId,
    decimal MonthlyRentAmount,
    decimal DepositAmount,
    string Status);
