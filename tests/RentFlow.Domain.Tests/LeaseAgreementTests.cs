using LeaseService.Domain.Entities;

namespace RentFlow.Domain.Tests;

public sealed class LeaseAgreementTests
{
    [Fact]
    public void CreateRejectsNonPositiveRent()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            LeaseAgreement.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
                DateTime.UtcNow, DateTime.UtcNow.AddMonths(1), 0, 0));
    }

    [Fact]
    public void CreateRejectsEndDateBeforeStartDate()
    {
        var start = DateTime.UtcNow;
        Assert.Throws<ArgumentException>(() =>
            LeaseAgreement.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
                start, start.AddDays(-1), 1000, 0));
    }

    [Fact]
    public void CancelIsIdempotentAndCompletedLeaseCannotBeCancelled()
    {
        var lease = CreateLease();
        lease.Cancel();
        lease.Cancel();
        Assert.Equal("CANCELLED", lease.Status);

        var completed = CreateLease();
        completed.Complete();
        Assert.Throws<InvalidOperationException>(completed.Cancel);
    }

    private static LeaseAgreement CreateLease() =>
        LeaseAgreement.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            DateTime.UtcNow, DateTime.UtcNow.AddMonths(12), 1000, 0);
}
