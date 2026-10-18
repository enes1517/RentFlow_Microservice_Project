using SharedKernel.Messaging;

namespace RentFlow.Domain.Tests;

public sealed class OutboxMessageTests
{
    [Fact]
    public void FailedMessagesRemainRetryableUntilMaximumAttempts()
    {
        var message = OutboxMessage.Create("example", "{}", "events");

        for (var attempt = 1; attempt < OutboxMessage.MaximumRetryCount; attempt++)
        {
            message.MarkAsFailed("temporary");
            Assert.True(message.ShouldRetry);
        }

        message.MarkAsFailed("permanent");
        Assert.False(message.ShouldRetry);
    }
}
