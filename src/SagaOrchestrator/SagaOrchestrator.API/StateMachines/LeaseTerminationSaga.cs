using MassTransit;
using SagaOrchestrator.API.SagaStates;
using SharedKernel.Contracts.Commands;
using SharedKernel.Contracts.Events;

namespace SagaOrchestrator.API.StateMachines;

public class LeaseTerminationSaga : MassTransitStateMachine<LeaseTerminationSagaState>
{
    public Event<LeaseTerminationRequestedEvent> TerminationRequested { get; private set; } = null!;
    public Event<DamageAssessedEvent> DamageAssessed { get; private set; } = null!;
    public Event<DepositRefundedEvent> DepositRefunded { get; private set; } = null!;
    public Event<PropertyReleasedEvent> PropertyReleased { get; private set; } = null!;

    public State AssessingDamage { get; private set; } = null!;
    public State RefundingDeposit { get; private set; } = null!;
    public State ReleasingProperty { get; private set; } = null!;
    public State Completed { get; private set; } = null!;

    public LeaseTerminationSaga()
    {
        InstanceState(x => x.CurrentState);

        Event(() => TerminationRequested, x => x.CorrelateById(context => context.Message.CorrelationId).SelectId(context => context.Message.CorrelationId));
        Event(() => DamageAssessed, x => x.CorrelateById(context => context.Message.CorrelationId));
        Event(() => DepositRefunded, x => x.CorrelateById(context => context.Message.CorrelationId));
        Event(() => PropertyReleased, x => x.CorrelateById(context => context.Message.CorrelationId));

        Initially(
            When(TerminationRequested)
                .Then(context =>
                {
                    context.Saga.LeaseId = context.Message.LeaseId;
                    context.Saga.PropertyId = context.Message.PropertyId;
                    context.Saga.TenantId = context.Message.TenantId;
                    context.Saga.LandlordId = context.Message.LandlordId;
                    context.Saga.DepositAmount = context.Message.DepositAmount;
                    context.Saga.TerminationDate = context.Message.TerminationDate;
                    context.Saga.Reason = context.Message.Reason;
                    context.Saga.CreatedAt = DateTime.UtcNow;
                    context.Saga.UpdatedAt = context.Saga.CreatedAt;
                })
                .Publish(context => new AssessDamageCommand(
                    context.Saga.CorrelationId,
                    context.Saga.LeaseId,
                    context.Saga.PropertyId,
                    context.Saga.TenantId
                ))
                .TransitionTo(AssessingDamage)
        );

        During(AssessingDamage,
            When(DamageAssessed)
                .Then(context =>
                {
                    context.Saga.DamageCost = context.Message.DamageCost;
                    context.Saga.RefundAmount = context.Saga.DepositAmount - context.Saga.DamageCost;
                    if (context.Saga.RefundAmount < 0)
                        context.Saga.RefundAmount = 0;
                        
                    context.Saga.UpdatedAt = DateTime.UtcNow;
                })
                .Publish(context => new RefundDepositCommand(
                    context.Saga.CorrelationId,
                    context.Saga.LeaseId,
                    context.Saga.TenantId,
                    context.Saga.DepositAmount,
                    context.Saga.DamageCost,
                    context.Saga.RefundAmount
                ))
                .TransitionTo(RefundingDeposit)
        );

        During(RefundingDeposit,
            When(DepositRefunded)
                .Then(context =>
                {
                    context.Saga.UpdatedAt = DateTime.UtcNow;
                })
                .Publish(context => new ReleasePropertyCommand(
                    context.Saga.CorrelationId,
                    context.Saga.PropertyId
                ))
                .TransitionTo(ReleasingProperty)
        );

        During(ReleasingProperty,
            When(PropertyReleased)
                .Then(context =>
                {
                    context.Saga.UpdatedAt = DateTime.UtcNow;
                })
                .TransitionTo(Completed)
        );
    }
}
