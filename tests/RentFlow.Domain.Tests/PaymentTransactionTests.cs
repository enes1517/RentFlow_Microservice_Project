using PaymentService.Domain.Entities;

namespace RentFlow.Domain.Tests;

public sealed class PaymentTransactionTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void CreateRejectsNonPositiveAmount(decimal amount)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            PaymentTransaction.Create(Guid.NewGuid(), Guid.NewGuid(), amount, "RENT"));
    }

    [Fact]
    public void CreateRejectsUnsupportedPaymentType()
    {
        Assert.Throws<ArgumentException>(() =>
            PaymentTransaction.Create(Guid.NewGuid(), Guid.NewGuid(), 100, "TRANSFER"));
    }

    [Fact]
    public void CreateAcceptsSupportedRentPayment()
    {
        var payment = PaymentTransaction.Create(Guid.NewGuid(), Guid.NewGuid(), 100, "RENT");
        Assert.Equal("PENDING", payment.Status);
        Assert.Equal("TRY", payment.Currency);
    }
}
