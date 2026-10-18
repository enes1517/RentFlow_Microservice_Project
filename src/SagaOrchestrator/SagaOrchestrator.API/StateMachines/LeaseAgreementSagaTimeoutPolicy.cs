namespace SagaOrchestrator.API.StateMachines;

public static class LeaseAgreementSagaTimeoutPolicy
{
    public static readonly TimeSpan SweepInterval = TimeSpan.FromSeconds(15);

    public static TimeSpan? GetTimeout(string state) => state switch
    {
        nameof(LeaseAgreementSaga.ReservingProperty) => TimeSpan.FromMinutes(2),
        nameof(LeaseAgreementSaga.GeneratingContract) => TimeSpan.FromMinutes(5),
        nameof(LeaseAgreementSaga.ActivatingLease) => TimeSpan.FromMinutes(2),
        nameof(LeaseAgreementSaga.MarkingUnitRented) => TimeSpan.FromMinutes(2),
        _ => null
    };

    public static bool IsExpired(string state, DateTime lastUpdatedAt, DateTime now)
    {
        var timeout = GetTimeout(state);
        return timeout.HasValue && now - lastUpdatedAt >= timeout.Value;
    }
}
