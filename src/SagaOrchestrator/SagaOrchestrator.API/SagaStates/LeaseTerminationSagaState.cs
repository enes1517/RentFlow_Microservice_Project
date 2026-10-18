using MassTransit;

namespace SagaOrchestrator.API.SagaStates;

public class LeaseTerminationSagaState : SagaStateMachineInstance
{
    public Guid CorrelationId { get; set; }
    
    // MassTransit State
    public string CurrentState { get; set; } = string.Empty;

    // Saga data
    public Guid LeaseId { get; set; }
    public Guid PropertyId { get; set; }
    public Guid TenantId { get; set; }
    public Guid LandlordId { get; set; }
    
    public decimal DepositAmount { get; set; }
    public decimal DamageCost { get; set; }
    public decimal RefundAmount { get; set; }
    
    public DateTime TerminationDate { get; set; }
    public string Reason { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
