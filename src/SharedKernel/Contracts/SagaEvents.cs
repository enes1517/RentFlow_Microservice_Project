namespace SharedKernel.Contracts;

// --- Lease Events ---
public interface ILeaseAgreementCreatedEvent
{
    Guid LeaseId { get; }
    Guid TenantId { get; }
    Guid LandlordId { get; }
    Guid PropertyId { get; }
    Guid UnitId { get; }
    decimal MonthlyRentAmount { get; }
    decimal DepositAmount { get; }
}

public interface ILeaseActivatedEvent
{
    Guid LeaseId { get; }
}

public interface ILeaseCancelledEvent
{
    Guid LeaseId { get; }
    string Reason { get; }
    Guid PropertyId { get; }
    Guid UnitId { get; }
}

public interface IMarkUnitRentedCommand
{
    Guid PropertyId { get; }
    Guid UnitId { get; }
    Guid LeaseId { get; }
}

public interface IUnitMarkedRentedEvent
{
    Guid LeaseId { get; }
}

public interface IActivateLeaseCommand
{
    Guid LeaseId { get; }
}

public interface IGenerateLeaseContractCommand
{
    Guid LeaseId { get; }
    Guid TenantId { get; }
    Guid PropertyId { get; }
    decimal MonthlyRent { get; }
    decimal DepositAmount { get; }
}

public interface ILeaseContractGeneratedEvent
{
    Guid LeaseId { get; }
    Guid DocumentId { get; }
}

public interface IPayDepositCommand
{
    Guid LeaseId { get; }
    Guid TenantId { get; }
    decimal Amount { get; }
}

public interface IDepositPaymentFailedEvent
{
    Guid PaymentId { get; }
    Guid LeaseId { get; }
    Guid TenantId { get; }
    decimal Amount { get; }
    string Currency { get; }
    DateTime CreatedAt { get; }
    string Reason { get; }
}

// --- Payment Events ---
public interface IRentPaymentCompletedEvent
{
    Guid PaymentId { get; }
    Guid LeaseId { get; }
    Guid TenantId { get; }
    decimal Amount { get; }
    string Currency { get; }
    DateTime CreatedAt { get; }
}

public interface IRentPaymentFailedEvent
{
    Guid PaymentId { get; }
    Guid LeaseId { get; }
    Guid TenantId { get; }
    decimal Amount { get; }
    string Currency { get; }
    DateTime CreatedAt { get; }
    string Reason { get; }
}

public interface IDepositPaymentCompletedEvent
{
    Guid PaymentId { get; }
    Guid LeaseId { get; }
    Guid TenantId { get; }
    decimal Amount { get; }
    string Currency { get; }
    DateTime CreatedAt { get; }
}

// --- Property Events ---
public interface IReservePropertyCommand
{
    Guid PropertyId { get; }
    Guid LeaseId { get; }
    Guid UnitId { get; }
    Guid LandlordId { get; }
}

public interface IReleasePropertyReservationCommand
{
    Guid PropertyId { get; }
    Guid UnitId { get; }
    Guid LeaseId { get; }
}

public interface IPropertyReservedEvent
{
    Guid PropertyId { get; }
    Guid LeaseId { get; }
}

public interface IPropertyReservationFailedEvent
{
    Guid PropertyId { get; }
    Guid LeaseId { get; }
    string Reason { get; }
}
