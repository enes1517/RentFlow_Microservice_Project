using PaymentService.Application.Interfaces;
using Hangfire.Dashboard;
using Stripe;

namespace PaymentService.API.Payments;

public sealed class SimulatedPaymentProcessor : IPaymentProcessor
{
    public Task<PaymentProcessingResult> ProcessAsync(
        Guid leaseId,
        Guid tenantId,
        decimal amount,
        string currency,
        string paymentType,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(PaymentProcessingResult.Succeeded());
    }
}

public sealed class DisabledPaymentProcessor : IPaymentProcessor
{
    public Task<PaymentProcessingResult> ProcessAsync(
        Guid leaseId,
        Guid tenantId,
        decimal amount,
        string currency,
        string paymentType,
        CancellationToken cancellationToken) =>
        Task.FromResult(PaymentProcessingResult.Unavailable(
            "Payments are disabled until a payment provider is configured."));
}

public sealed class StripePaymentProcessor : IPaymentProcessor
{
    private readonly string _secretKey;

    public StripePaymentProcessor(IConfiguration configuration)
    {
        _secretKey = configuration["Stripe:SecretKey"] ?? "sk_test_dummy";
        StripeConfiguration.ApiKey = _secretKey;
    }

    public async Task<PaymentProcessingResult> ProcessAsync(
        Guid leaseId,
        Guid tenantId,
        decimal amount,
        string currency,
        string paymentType,
        CancellationToken cancellationToken)
    {
        try
        {
            var options = new ChargeCreateOptions
            {
                Amount = (long)(amount * 100),
                Currency = currency.ToLower(),
                Source = "tok_visa", // Default test token for demo purposes
                Description = $"Payment for Lease {leaseId} ({paymentType})"
            };

            var service = new ChargeService();
            var charge = await service.CreateAsync(options, cancellationToken: cancellationToken);

            if (charge.Paid)
            {
                return PaymentProcessingResult.Succeeded();
            }
            
            return PaymentProcessingResult.Failed(charge.FailureMessage ?? "Payment declined by Stripe.");
        }
        catch (StripeException e)
        {
            return PaymentProcessingResult.Failed(e.StripeError.Message);
        }
        catch (Exception e)
        {
            return PaymentProcessingResult.Failed(e.Message);
        }
    }
}

public sealed class PaymentDashboardAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var user = context.GetHttpContext().User;
        return user.Identity?.IsAuthenticated == true && user.IsInRole("ROLE_ADMIN");
    }
}
