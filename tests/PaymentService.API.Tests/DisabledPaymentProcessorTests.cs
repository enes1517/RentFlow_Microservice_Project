using PaymentService.API.Payments;

namespace PaymentService.API.Tests;

public sealed class DisabledPaymentProcessorTests
{
    [Fact]
    public async Task ProcessAsync_ReturnsUnavailableWithoutCharging()
    {
        var processor = new DisabledPaymentProcessor();

        var result = await processor.ProcessAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            1250m,
            "TRY",
            "RENT",
            CancellationToken.None);

        Assert.False(result.IsAvailable);
        Assert.False(result.IsSuccessful);
        Assert.Contains("disabled", result.FailureReason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SimulatedProcessor_ReturnsSuccessWithoutCollectingCardDetails()
    {
        var processor = new SimulatedPaymentProcessor();

        var result = await processor.ProcessAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            1250m,
            "TRY",
            "RENT",
            CancellationToken.None);

        Assert.True(result.IsAvailable);
        Assert.True(result.IsSuccessful);
        Assert.Null(result.FailureReason);
    }

    [Fact]
    public async Task SimulatedProcessor_RespectsCancellation()
    {
        var processor = new SimulatedPaymentProcessor();
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            processor.ProcessAsync(
                Guid.NewGuid(),
                Guid.NewGuid(),
                1250m,
                "TRY",
                "RENT",
                cancellation.Token));
    }
}
