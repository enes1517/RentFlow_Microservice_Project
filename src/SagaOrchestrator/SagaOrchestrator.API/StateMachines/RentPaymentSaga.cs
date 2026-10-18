using MassTransit;
using SagaOrchestrator.API.SagaStates;
using SharedKernel.Contracts;

namespace SagaOrchestrator.API.StateMachines;

public class RentPaymentSaga : MassTransitStateMachine<RentPaymentSagaState>
{
    public Event<IRentPaymentCompletedEvent> PaymentCompleted { get; private set; } = null!;
    public Event<IRentPaymentFailedEvent> PaymentFailed { get; private set; } = null!;

    public State ProcessingSuccess { get; private set; } = null!;
    public State ProcessingFailure { get; private set; } = null!;

    public RentPaymentSaga()
    {
        InstanceState(x => x.CurrentState);

        Event(() => PaymentCompleted, x => x.CorrelateById(context => context.Message.PaymentId));
        Event(() => PaymentFailed, x => x.CorrelateById(context => context.Message.PaymentId));

        Initially(
            When(PaymentCompleted)
                .Then(context =>
                {
                    context.Saga.PaymentId = context.Message.PaymentId;
                    context.Saga.LeaseId = context.Message.LeaseId;
                    context.Saga.TenantId = context.Message.TenantId;
                    context.Saga.Amount = context.Message.Amount;
                    context.Saga.CreatedAt = DateTime.UtcNow;
                    context.Saga.UpdatedAt = context.Saga.CreatedAt;
                })
                .TransitionTo(ProcessingSuccess),
            When(PaymentFailed)
                .Then(context =>
                {
                    context.Saga.PaymentId = context.Message.PaymentId;
                    context.Saga.LeaseId = context.Message.LeaseId;
                    context.Saga.TenantId = context.Message.TenantId;
                    context.Saga.Amount = context.Message.Amount;
                    context.Saga.FailureReason = context.Message.Reason;
                    context.Saga.CreatedAt = DateTime.UtcNow;
                    context.Saga.UpdatedAt = context.Saga.CreatedAt;
                })
                .TransitionTo(ProcessingFailure)
        );

        // These events report terminal payment outcomes; this saga has no in-flight
        // command to time out or a safe refund command with which to compensate.
        // Retaining the outcome prevents a late duplicate/opposite event from
        // creating a second saga for the same payment.
        During(ProcessingSuccess,
            Ignore(PaymentCompleted),
            Ignore(PaymentFailed));

        During(ProcessingFailure,
            Ignore(PaymentCompleted),
            Ignore(PaymentFailed));
    }
}
