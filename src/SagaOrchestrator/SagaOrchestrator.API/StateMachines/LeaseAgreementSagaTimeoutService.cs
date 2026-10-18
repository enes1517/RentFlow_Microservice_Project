using MassTransit;
using Microsoft.EntityFrameworkCore;
using SagaOrchestrator.API.Data;
using SagaOrchestrator.API.SagaStates;

namespace SagaOrchestrator.API.StateMachines;

public sealed class LeaseAgreementSagaTimeoutService(
    IServiceScopeFactory scopeFactory,
    ILogger<LeaseAgreementSagaTimeoutService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(LeaseAgreementSagaTimeoutPolicy.SweepInterval);

        do
        {
            try
            {
                await PublishExpiredTimeouts(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Failed to scan lease saga timeouts; the next sweep will retry.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task PublishExpiredTimeouts(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SagaDbContext>();
        var publisher = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();
        var activeStates = new[]
        {
            nameof(LeaseAgreementSaga.ReservingProperty),
            nameof(LeaseAgreementSaga.GeneratingContract),
            nameof(LeaseAgreementSaga.ActivatingLease),
            nameof(LeaseAgreementSaga.MarkingUnitRented)
        };

        var sagas = await dbContext.Set<LeaseAgreementSagaState>()
            .AsNoTracking()
            .Where(saga => activeStates.Contains(saga.CurrentState))
            .Select(saga => new
            {
                saga.LeaseId,
                saga.CurrentState,
                saga.CreatedAt,
                saga.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var saga in sagas)
        {
            if (!LeaseAgreementSagaTimeoutPolicy.IsExpired(
                    saga.CurrentState,
                    saga.UpdatedAt ?? saga.CreatedAt,
                    now))
                continue;

            await publisher.Publish(
                new LeaseAgreementSagaStageTimedOut(saga.LeaseId, saga.CurrentState),
                cancellationToken);
        }
    }
}
