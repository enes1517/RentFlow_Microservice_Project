namespace PaymentService.Application.Interfaces;

public interface IPaymentProcessor
{
    Task<PaymentProcessingResult> ProcessAsync(
        Guid leaseId,
        Guid tenantId,
        decimal amount,
        string currency,
        string paymentType,
        CancellationToken cancellationToken);
}

public sealed record PaymentProcessingResult(bool IsAvailable, bool IsSuccessful, string? FailureReason)
{
    public static PaymentProcessingResult Unavailable(string reason) => new(false, false, reason);
    public static PaymentProcessingResult Succeeded() => new(true, true, null);
    public static PaymentProcessingResult Failed(string reason) => new(true, false, reason);
}
