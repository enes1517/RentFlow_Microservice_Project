using MediatR;
using Microsoft.EntityFrameworkCore;
using SagaOrchestrator.API.Data;
using SagaOrchestrator.API.SagaStates;
using SagaOrchestrator.API.StateMachines;

namespace SagaOrchestrator.API.Queries;

public sealed class GetSagaSummariesQueryHandler(SagaDbContext context)
    : IRequestHandler<GetSagaSummariesQuery, IReadOnlyList<SagaSummaryReadModel>>
{
    public async Task<IReadOnlyList<SagaSummaryReadModel>> Handle(
        GetSagaSummariesQuery request, CancellationToken cancellationToken)
    {
        var leaseSagas = await context.Set<LeaseAgreementSagaState>()
            .AsNoTracking().ToListAsync(cancellationToken);
        var paymentSagas = await context.Set<RentPaymentSagaState>()
            .AsNoTracking().ToListAsync(cancellationToken);
        var terminationSagas = await context.Set<LeaseTerminationSagaState>()
            .AsNoTracking().ToListAsync(cancellationToken);

        var summaries = leaseSagas.Select(lease => new SagaSummaryReadModel(
            lease.CorrelationId,
            "LeaseAgreementSaga",
            lease.CurrentState,
            new[]
            {
                new SagaStepReadModel("Check Property", PropertyStepStatus(lease.CurrentState)),
                new SagaStepReadModel("Create Contract", ContractStepStatus(lease.CurrentState)),
                new SagaStepReadModel("Activate Lease", ActivationStepStatus(lease.CurrentState)),
                new SagaStepReadModel("Mark Unit Rented", UnitStepStatus(lease.CurrentState))
            }))
            .Concat(paymentSagas.Select(payment => new SagaSummaryReadModel(
                payment.CorrelationId,
                "RentPaymentSaga",
                payment.CurrentState,
                new[]
                {
                    new SagaStepReadModel(
                        "Process Payment",
                        payment.CurrentState == nameof(RentPaymentSaga.ProcessingFailure) ? "FAILED" : "DONE")
                })))
            .Concat(terminationSagas.Select(term => new SagaSummaryReadModel(
                term.CorrelationId,
                "LeaseTerminationSaga",
                term.CurrentState,
                new[]
                {
                    new SagaStepReadModel("Assess Damage", DamageStepStatus(term.CurrentState)),
                    new SagaStepReadModel("Refund Deposit", RefundStepStatus(term.CurrentState)),
                    new SagaStepReadModel("Release Property", ReleaseStepStatus(term.CurrentState))
                })))
            .ToList();

        return summaries;
    }

    private static string DamageStepStatus(string state) => state switch
    {
        nameof(LeaseTerminationSaga.AssessingDamage) => "ACTIVE",
        _ => "DONE"
    };

    private static string RefundStepStatus(string state) => state switch
    {
        nameof(LeaseTerminationSaga.AssessingDamage) => "PENDING",
        nameof(LeaseTerminationSaga.RefundingDeposit) => "ACTIVE",
        _ => "DONE"
    };

    private static string ReleaseStepStatus(string state) => state switch
    {
        nameof(LeaseTerminationSaga.AssessingDamage) or
        nameof(LeaseTerminationSaga.RefundingDeposit) => "PENDING",
        nameof(LeaseTerminationSaga.ReleasingProperty) => "ACTIVE",
        _ => "DONE"
    };

    private static string PropertyStepStatus(string state) => state switch
    {
        nameof(LeaseAgreementSaga.ReservingProperty) => "ACTIVE",
        nameof(LeaseAgreementSaga.PropertyReservationFailure) or
        nameof(LeaseAgreementSaga.PropertyReservationTimedOut) => "FAILED",
        _ => "DONE"
    };

    private static string ContractStepStatus(string state) => state switch
    {
        nameof(LeaseAgreementSaga.ReservingProperty) or
        nameof(LeaseAgreementSaga.PropertyReservationFailure) or
        nameof(LeaseAgreementSaga.PropertyReservationTimedOut) => "PENDING",
        nameof(LeaseAgreementSaga.GeneratingContract) => "ACTIVE",
        nameof(LeaseAgreementSaga.ContractGenerationTimedOut) => "FAILED",
        _ => "DONE"
    };

    private static string ActivationStepStatus(string state) => state switch
    {
        nameof(LeaseAgreementSaga.ReservingProperty) or
        nameof(LeaseAgreementSaga.PropertyReservationFailure) or
        nameof(LeaseAgreementSaga.PropertyReservationTimedOut) or
        nameof(LeaseAgreementSaga.GeneratingContract) or
        nameof(LeaseAgreementSaga.ContractGenerationTimedOut) => "PENDING",
        nameof(LeaseAgreementSaga.ActivatingLease) => "ACTIVE",
        nameof(LeaseAgreementSaga.LeaseActivationTimedOut) => "FAILED",
        _ => "DONE"
    };

    private static string UnitStepStatus(string state) => state switch
    {
        nameof(LeaseAgreementSaga.ReservingProperty) or
        nameof(LeaseAgreementSaga.PropertyReservationFailure) or
        nameof(LeaseAgreementSaga.PropertyReservationTimedOut) or
        nameof(LeaseAgreementSaga.GeneratingContract) or
        nameof(LeaseAgreementSaga.ContractGenerationTimedOut) or
        nameof(LeaseAgreementSaga.ActivatingLease) => "PENDING",
        nameof(LeaseAgreementSaga.MarkingUnitRented) => "ACTIVE",
        nameof(LeaseAgreementSaga.UnitFinalizationTimedOut) => "FAILED",
        _ => "DONE"
    };
}
