using MassTransit;
using SagaOrchestrator.API.SagaStates;
using SharedKernel.Contracts;

namespace SagaOrchestrator.API.StateMachines;

public class LeaseAgreementSaga : MassTransitStateMachine<LeaseAgreementSagaState>
{
    public Event<ILeaseAgreementCreatedEvent> LeaseCreated { get; private set; } = null!;
    public Event<IPropertyReservedEvent> PropertyReserved { get; private set; } = null!;
    public Event<IPropertyReservationFailedEvent> PropertyReservationFailed { get; private set; } = null!;
    public Event<ILeaseContractGeneratedEvent> ContractGenerated { get; private set; } = null!;
    public Event<ILeaseActivatedEvent> LeaseActivated { get; private set; } = null!;
    public Event<IUnitMarkedRentedEvent> UnitMarkedRented { get; private set; } = null!;
    public Event<LeaseAgreementSagaStageTimedOut> StageTimedOut { get; private set; } = null!;

    public State ReservingProperty { get; private set; } = null!;
    public State GeneratingContract { get; private set; } = null!;
    public State ActivatingLease { get; private set; } = null!;
    public State MarkingUnitRented { get; private set; } = null!;
    public State PropertyReservationFailure { get; private set; } = null!;
    public State PropertyReservationTimedOut { get; private set; } = null!;
    public State ContractGenerationTimedOut { get; private set; } = null!;
    public State LeaseActivationTimedOut { get; private set; } = null!;
    public State UnitFinalizationTimedOut { get; private set; } = null!;
    public State Completed { get; private set; } = null!;

    public LeaseAgreementSaga()
    {
        InstanceState(x => x.CurrentState);

        Event(() => LeaseCreated, x => x.CorrelateById(context => context.Message.LeaseId));
        Event(() => PropertyReserved, x => x.CorrelateById(context => context.Message.LeaseId));
        Event(() => PropertyReservationFailed, x => x.CorrelateById(context => context.Message.LeaseId));
        Event(() => ContractGenerated, x => x.CorrelateById(context => context.Message.LeaseId));
        Event(() => LeaseActivated, x => x.CorrelateById(context => context.Message.LeaseId));
        Event(() => UnitMarkedRented, x => x.CorrelateById(context => context.Message.LeaseId));
        Event(() => StageTimedOut, x => x.CorrelateById(context => context.Message.LeaseId));

        Initially(
            When(LeaseCreated)
                .Then(context =>
                {
                    context.Saga.LeaseId = context.Message.LeaseId;
                    context.Saga.TenantId = context.Message.TenantId;
                    context.Saga.LandlordId = context.Message.LandlordId;
                    context.Saga.PropertyId = context.Message.PropertyId;
                    context.Saga.UnitId = context.Message.UnitId;
                    context.Saga.MonthlyRentAmount = context.Message.MonthlyRentAmount;
                    context.Saga.DepositAmount = context.Message.DepositAmount;
                    context.Saga.CreatedAt = DateTime.UtcNow;
                    context.Saga.UpdatedAt = context.Saga.CreatedAt;
                })
                .PublishAsync(context => context.Init<IReservePropertyCommand>(new
                {
                    PropertyId = context.Message.PropertyId,
                    LeaseId = context.Message.LeaseId,
                    UnitId = context.Message.UnitId,
                    context.Message.LandlordId
                }))
                .TransitionTo(ReservingProperty)
        );

        During(ReservingProperty,
            When(PropertyReserved)
                .Then(context =>
                {
                    context.Saga.IsPropertyChecked = true;
                    context.Saga.UpdatedAt = DateTime.UtcNow;
                })
                .PublishAsync(context => context.Init<IGenerateLeaseContractCommand>(new
                {
                    context.Saga.LeaseId,
                    context.Saga.TenantId,
                    context.Saga.PropertyId,
                    MonthlyRent = context.Saga.MonthlyRentAmount,
                    context.Saga.DepositAmount
                }))
                .TransitionTo(GeneratingContract),
            When(PropertyReservationFailed)
                .Then(context => context.Saga.UpdatedAt = DateTime.UtcNow)
                .PublishAsync(context => context.Init<ILeaseCancelledEvent>(new
                {
                    LeaseId = context.Saga.LeaseId,
                    Reason = context.Message.Reason,
                    context.Saga.PropertyId,
                    context.Saga.UnitId
                }))
                .TransitionTo(PropertyReservationFailure),
            When(StageTimedOut)
                .If(context => context.Message.ExpectedState == nameof(ReservingProperty),
                    binder => binder
                        .Then(context => context.Saga.UpdatedAt = DateTime.UtcNow)
                        .PublishAsync(context => context.Init<ILeaseCancelledEvent>(new
                        {
                            LeaseId = context.Saga.LeaseId,
                            Reason = "Property reservation timed out.",
                            context.Saga.PropertyId,
                            context.Saga.UnitId
                        }))
                        .TransitionTo(PropertyReservationTimedOut))
        );

        During(GeneratingContract,
            When(ContractGenerated)
                .Then(context =>
                {
                    context.Saga.IsContractGenerated = true;
                    context.Saga.UpdatedAt = DateTime.UtcNow;
                })
                .PublishAsync(context => context.Init<IActivateLeaseCommand>(new
                {
                    context.Saga.LeaseId
                }))
                .TransitionTo(ActivatingLease),
            When(StageTimedOut)
                .If(context => context.Message.ExpectedState == nameof(GeneratingContract),
                    binder => binder
                        .Then(context => context.Saga.UpdatedAt = DateTime.UtcNow)
                        .PublishAsync(context => context.Init<ILeaseCancelledEvent>(new
                        {
                            LeaseId = context.Saga.LeaseId,
                            Reason = "Contract generation timed out.",
                            context.Saga.PropertyId,
                            context.Saga.UnitId
                        }))
                        .TransitionTo(ContractGenerationTimedOut))
        );

        During(ActivatingLease,
            When(LeaseActivated)
                .Then(context => context.Saga.UpdatedAt = DateTime.UtcNow)
                .PublishAsync(context => context.Init<IMarkUnitRentedCommand>(new
                {
                    context.Saga.PropertyId,
                    context.Saga.UnitId,
                    context.Saga.LeaseId
                }))
                .TransitionTo(MarkingUnitRented),
            When(StageTimedOut)
                .If(context => context.Message.ExpectedState == nameof(ActivatingLease),
                    binder => binder
                        .Then(context => context.Saga.UpdatedAt = DateTime.UtcNow)
                        .TransitionTo(LeaseActivationTimedOut))
        );

        During(MarkingUnitRented,
            When(UnitMarkedRented)
                .Then(context => context.Saga.UpdatedAt = DateTime.UtcNow)
                .TransitionTo(Completed),
            When(StageTimedOut)
                .If(context => context.Message.ExpectedState == nameof(MarkingUnitRented),
                    binder => binder
                        .Then(context => context.Saga.UpdatedAt = DateTime.UtcNow)
                        .PublishAsync(context => context.Init<IMarkUnitRentedCommand>(new
                        {
                            context.Saga.PropertyId,
                            context.Saga.UnitId,
                            context.Saga.LeaseId
                        }))
                        .TransitionTo(UnitFinalizationTimedOut))
        );

        During(PropertyReservationFailure,
            When(PropertyReserved)
                .Then(context => context.Saga.UpdatedAt = DateTime.UtcNow)
                .PublishAsync(context => context.Init<ILeaseCancelledEvent>(new
                {
                    LeaseId = context.Saga.LeaseId,
                    Reason = "A late property reservation was released after reservation failure.",
                    context.Saga.PropertyId,
                    context.Saga.UnitId
                }))
        );

        During(PropertyReservationTimedOut, ContractGenerationTimedOut,
            When(PropertyReserved)
                .Then(context => context.Saga.UpdatedAt = DateTime.UtcNow)
                .PublishAsync(context => context.Init<ILeaseCancelledEvent>(new
                {
                    LeaseId = context.Saga.LeaseId,
                    Reason = "A late property reservation was released after saga timeout.",
                    context.Saga.PropertyId,
                    context.Saga.UnitId
                }))
        );

        During(LeaseActivationTimedOut,
            When(LeaseActivated)
                .Then(context => context.Saga.UpdatedAt = DateTime.UtcNow)
                .PublishAsync(context => context.Init<IMarkUnitRentedCommand>(new
                {
                    context.Saga.PropertyId,
                    context.Saga.UnitId,
                    context.Saga.LeaseId
                })),
            When(UnitMarkedRented)
                .Then(context => context.Saga.UpdatedAt = DateTime.UtcNow)
                .TransitionTo(Completed)
        );

        During(UnitFinalizationTimedOut,
            When(LeaseActivated)
                .Then(context => context.Saga.UpdatedAt = DateTime.UtcNow)
                .PublishAsync(context => context.Init<IMarkUnitRentedCommand>(new
                {
                    context.Saga.PropertyId,
                    context.Saga.UnitId,
                    context.Saga.LeaseId
                })),
            When(UnitMarkedRented)
                .Then(context => context.Saga.UpdatedAt = DateTime.UtcNow)
                .TransitionTo(Completed)
        );
    }
}

public sealed record LeaseAgreementSagaStageTimedOut(Guid LeaseId, string ExpectedState);
