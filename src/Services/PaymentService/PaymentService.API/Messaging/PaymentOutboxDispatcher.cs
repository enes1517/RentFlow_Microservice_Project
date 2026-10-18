using System.Text.Json;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using PaymentService.Infrastructure.Data;
using SharedKernel.Contracts;
using SharedKernel.Messaging;

namespace PaymentService.API.Messaging;

public sealed class PaymentOutboxDispatcher(
    IServiceScopeFactory scopeFactory,
    ILogger<PaymentOutboxDispatcher> logger) : BackgroundService
{
    private const int BatchSize = 50;
    private const int ClaimLeaseSeconds = 300;
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(PollInterval);

        do
        {
            try
            {
                await DispatchBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Payment outbox batch failed; the dispatcher will retry.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task DispatchBatchAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<PaymentDbContext>();
        var publisher = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();

        for (var index = 0; index < BatchSize; index++)
        {
            var claim = await ClaimNextMessageAsync(db, cancellationToken);
            if (claim is null)
                break;
            var message = claim.Message;

            try
            {
                await PublishAsync(publisher, message, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                // Leave the lease in place: an in-flight publish may have reached RabbitMQ.
                throw;
            }
            catch (Exception exception)
            {
                var retryCount = message.RetryCount + 1;
                var shouldRetry = retryCount < OutboxMessage.MaximumRetryCount;
                await MarkAsFailedAsync(db, message.Id, claim.ClaimToken, exception.Message, retryCount, cancellationToken);

                if (!shouldRetry)
                {
                    logger.LogCritical(exception, "Payment outbox message {MessageId} exhausted its retries and requires operator replay.", message.Id);
                }
                else
                {
                    logger.LogError(exception, "Failed to publish payment outbox message {MessageId} ({MessageType}); attempt {RetryCount} of {MaxRetryCount}.",
                        message.Id, message.MessageType, retryCount, OutboxMessage.MaximumRetryCount);
                }
                continue;
            }

            await MarkAsProcessedAsync(db, message.Id, claim.ClaimToken, cancellationToken);
        }
    }

    private static async Task<ClaimedOutboxMessage?> ClaimNextMessageAsync(
        PaymentDbContext db,
        CancellationToken cancellationToken)
    {
        var claimToken = Guid.NewGuid();
        return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
            var messages = await db.OutboxMessages
                .FromSqlRaw("""
                    ;WITH [Candidate] AS
                    (
                        SELECT TOP (1) *
                        FROM [OutboxMessages] WITH (UPDLOCK, READPAST, ROWLOCK, READCOMMITTEDLOCK)
                        WHERE [ProcessedAt] IS NULL
                          AND
                          (
                              [ClaimToken] = {1}
                              OR
                              (
                                  [RetryCount] < {0}
                                  AND ([NextAttemptAt] IS NULL OR [NextAttemptAt] <= SYSUTCDATETIME())
                                  AND ([ClaimedUntil] IS NULL OR [ClaimedUntil] <= SYSUTCDATETIME())
                              )
                          )
                        ORDER BY CASE WHEN [ClaimToken] = {1} THEN 0 ELSE 1 END, [CreatedAt], [Id]
                    )
                    UPDATE [Candidate]
                    SET [ClaimToken] = {1},
                        [ClaimedUntil] = DATEADD(SECOND, {2}, SYSUTCDATETIME())
                    OUTPUT INSERTED.[Id], INSERTED.[MessageType], INSERTED.[Payload],
                           INSERTED.[Topic], INSERTED.[CreatedAt], INSERTED.[ProcessedAt],
                           INSERTED.[RetryCount], INSERTED.[LastError], INSERTED.[ClaimToken],
                           INSERTED.[ClaimedUntil], INSERTED.[NextAttemptAt]
                    """,
                    OutboxMessage.MaximumRetryCount,
                    claimToken,
                    ClaimLeaseSeconds)
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);
            return messages.FirstOrDefault() is { } message ? new ClaimedOutboxMessage(message, claimToken) : null;
        });
    }

    private static async Task MarkAsProcessedAsync(
        PaymentDbContext db,
        Guid messageId,
        Guid claimToken,
        CancellationToken cancellationToken)
    {
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE [OutboxMessages]
            SET [ProcessedAt] = SYSUTCDATETIME(),
                [ClaimToken] = NULL,
                [ClaimedUntil] = NULL,
                [NextAttemptAt] = NULL
            WHERE [Id] = {messageId} AND [ClaimToken] = {claimToken}
            """, cancellationToken);
    }

    private static async Task MarkAsFailedAsync(
        PaymentDbContext db,
        Guid messageId,
        Guid claimToken,
        string error,
        int retryCount,
        CancellationToken cancellationToken)
    {
        var retryDelaySeconds = Math.Min(60, Math.Pow(2, retryCount - 1));
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE [OutboxMessages]
            SET [RetryCount] = [RetryCount] + 1,
                [LastError] = {error},
                [NextAttemptAt] = CASE
                    WHEN [RetryCount] + 1 < {OutboxMessage.MaximumRetryCount}
                    THEN DATEADD(SECOND, {retryDelaySeconds}, SYSUTCDATETIME())
                    ELSE NULL
                END,
                [ClaimToken] = NULL,
                [ClaimedUntil] = NULL
            WHERE [Id] = {messageId} AND [ClaimToken] = {claimToken}
            """, cancellationToken);
    }

    private static Task PublishAsync(
        IPublishEndpoint publisher,
        OutboxMessage message,
        CancellationToken cancellationToken)
    {
        return message.MessageType switch
        {
            "RentPaymentCompletedEvent" => PublishRentCompletedAsync(publisher, message, cancellationToken),
            "RentPaymentFailedEvent" => PublishRentFailedAsync(publisher, message, cancellationToken),
            "DepositPaymentCompletedEvent" => PublishDepositCompletedAsync(publisher, message, cancellationToken),
            "DepositPaymentFailedEvent" => PublishDepositFailedAsync(publisher, message, cancellationToken),
            _ => throw new InvalidOperationException($"Unsupported payment outbox event type '{message.MessageType}'.")
        };
    }

    private static Task PublishRentCompletedAsync(
        IPublishEndpoint publisher,
        OutboxMessage message,
        CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<PaymentPayload>(message.Payload)
            ?? throw new InvalidOperationException("Rent-payment outbox payload is invalid.");
        return publisher.Publish<IRentPaymentCompletedEvent>(new
        {
            payload.PaymentId,
            payload.LeaseId,
            payload.TenantId,
            payload.Amount,
            Currency = payload.Currency ?? "UNKNOWN",
            CreatedAt = payload.CreatedAt
        }, MessageIdPipe<IRentPaymentCompletedEvent>(message.Id), cancellationToken);
    }

    private static Task PublishRentFailedAsync(
        IPublishEndpoint publisher,
        OutboxMessage message,
        CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<PaymentPayload>(message.Payload)
            ?? throw new InvalidOperationException("Rent-payment outbox payload is invalid.");
        return publisher.Publish<IRentPaymentFailedEvent>(new
        {
            payload.PaymentId,
            payload.LeaseId,
            payload.TenantId,
            payload.Amount,
            Currency = payload.Currency ?? "UNKNOWN",
            CreatedAt = payload.CreatedAt,
            Reason = payload.Reason ?? "Payment failed."
        }, MessageIdPipe<IRentPaymentFailedEvent>(message.Id), cancellationToken);
    }

    private static Task PublishDepositCompletedAsync(
        IPublishEndpoint publisher,
        OutboxMessage message,
        CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<PaymentPayload>(message.Payload)
            ?? throw new InvalidOperationException("Deposit-payment outbox payload is invalid.");
        return publisher.Publish<IDepositPaymentCompletedEvent>(new
        {
            payload.PaymentId,
            payload.LeaseId,
            payload.TenantId,
            payload.Amount,
            Currency = payload.Currency ?? "UNKNOWN",
            CreatedAt = payload.CreatedAt
        }, MessageIdPipe<IDepositPaymentCompletedEvent>(message.Id), cancellationToken);
    }

    private static Task PublishDepositFailedAsync(
        IPublishEndpoint publisher,
        OutboxMessage message,
        CancellationToken cancellationToken)
    {
        var payload = JsonSerializer.Deserialize<PaymentPayload>(message.Payload)
            ?? throw new InvalidOperationException("Deposit-payment outbox payload is invalid.");
        return publisher.Publish<IDepositPaymentFailedEvent>(new
        {
            payload.PaymentId,
            payload.LeaseId,
            payload.TenantId,
            payload.Amount,
            Currency = payload.Currency ?? "UNKNOWN",
            CreatedAt = payload.CreatedAt,
            Reason = payload.Reason ?? "Deposit payment failed."
        }, MessageIdPipe<IDepositPaymentFailedEvent>(message.Id), cancellationToken);
    }

    private static IPipe<PublishContext<T>> MessageIdPipe<T>(Guid messageId)
        where T : class
    {
        return Pipe.Execute<PublishContext<T>>(context => context.MessageId = messageId);
    }

    private sealed record ClaimedOutboxMessage(OutboxMessage Message, Guid ClaimToken);

    private sealed record PaymentPayload(
        Guid PaymentId,
        Guid LeaseId,
        Guid TenantId,
        decimal Amount,
        string? Reason = null,
        string? Currency = null,
        DateTime CreatedAt = default);
}
