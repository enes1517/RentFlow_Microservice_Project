using MassTransit;

namespace SagaOrchestrator.API.SagaStates;

public class RentPaymentSagaState : SagaStateMachineInstance
{
    public Guid CorrelationId { get; set; }
    public string CurrentState { get; set; } = string.Empty;

    public Guid PaymentId { get; set; }
    public Guid LeaseId { get; set; }
    public Guid TenantId { get; set; }
    public decimal Amount { get; set; }
    
    public string? FailureReason { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
