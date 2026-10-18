using MassTransit;

namespace SagaOrchestrator.API.SagaStates;

public class LeaseAgreementSagaState : SagaStateMachineInstance
{
    public Guid CorrelationId { get; set; }
    
    // MassTransit State
    public string CurrentState { get; set; } = string.Empty;

    // Saga data
    public Guid LeaseId { get; set; }
    public Guid TenantId { get; set; }
    public Guid LandlordId { get; set; }
    public Guid PropertyId { get; set; }
    public Guid UnitId { get; set; }
    
    public decimal MonthlyRentAmount { get; set; }
    public decimal DepositAmount { get; set; }

    // Flags for completed steps
    public bool IsPropertyChecked { get; set; }
    public bool IsDepositCollected { get; set; }
    public bool IsContractGenerated { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
