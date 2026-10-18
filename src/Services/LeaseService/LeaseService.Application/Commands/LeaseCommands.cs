using MediatR;
using SharedKernel.Common;
using SharedKernel.Messaging;
using LeaseService.Domain.Entities;
using LeaseService.Application.Interfaces;
using System.Text.Json;

namespace LeaseService.Application.Commands;

// ─── CreateLease ─────────────────────────────────────────────────────────────

public record CreateLeaseCommand(
    Guid TenantId,
    Guid LandlordId,
    Guid PropertyId,
    Guid UnitId,
    DateTime StartDate,
    DateTime EndDate,
    decimal MonthlyRentAmount,
    decimal DepositAmount
) : IRequest<Result<CommandOutcome>>;

public class CreateLeaseCommandHandler : IRequestHandler<CreateLeaseCommand, Result<CommandOutcome>>
{
    private readonly ILeaseWriteRepository _leaseRepository;

    public CreateLeaseCommandHandler(ILeaseWriteRepository leaseRepository) =>
        _leaseRepository = leaseRepository;

    public async Task<Result<CommandOutcome>> Handle(CreateLeaseCommand request, CancellationToken cancellationToken)
    {
        // 1. Domain nesnesi oluştur
        var lease = LeaseAgreement.Create(
            request.TenantId,
            request.LandlordId,
            request.PropertyId,
            request.UnitId,
            request.StartDate,
            request.EndDate,
            request.MonthlyRentAmount,
            request.DepositAmount);

        var payload = JsonSerializer.Serialize(new
        {
            LeaseId = lease.Id,
            TenantId = lease.TenantId,
            LandlordId = lease.LandlordId,
            PropertyId = lease.PropertyId,
            UnitId = lease.UnitId,
            MonthlyRentAmount = lease.MonthlyRentAmount,
            DepositAmount = lease.DepositAmount
        });

        var outboxMessage = OutboxMessage.Create("LeaseAgreementCreatedEvent", payload, "lease-events");
        await _leaseRepository.AddAsync(lease, outboxMessage, cancellationToken);

        return Result.Success(new CommandOutcome(lease.Id, lease.Status));
    }
}

// ─── ActivateLease ───────────────────────────────────────────────────────────

public record ActivateLeaseCommand(Guid LeaseId) : IRequest<Result<CommandOutcome>>;

public class ActivateLeaseCommandHandler : IRequestHandler<ActivateLeaseCommand, Result<CommandOutcome>>
{
    private readonly ILeaseWriteRepository _repository;
    public ActivateLeaseCommandHandler(ILeaseWriteRepository repository) => _repository = repository;

    public async Task<Result<CommandOutcome>> Handle(ActivateLeaseCommand request, CancellationToken cancellationToken)
    {
        var lease = await _repository.GetForUpdateAsync(request.LeaseId, cancellationToken);
        if (lease == null) return Result.Failure<CommandOutcome>(Error.NotFound);
        if (lease.Status == "ACTIVE")
            return Result.Success(new CommandOutcome(lease.Id, lease.Status));

        lease.Activate();
        await _repository.UpdateAsync(lease, cancellationToken: cancellationToken);
        return Result.Success(new CommandOutcome(lease.Id, lease.Status));
    }
}

// ─── CancelLease ─────────────────────────────────────────────────────────────

public record CancelLeaseCommand(Guid LeaseId) : IRequest<Result<CommandOutcome>>;

public class CancelLeaseCommandHandler : IRequestHandler<CancelLeaseCommand, Result<CommandOutcome>>
{
    private readonly ILeaseWriteRepository _repository;
    public CancelLeaseCommandHandler(ILeaseWriteRepository repository) => _repository = repository;

    public async Task<Result<CommandOutcome>> Handle(CancelLeaseCommand request, CancellationToken cancellationToken)
    {
        var lease = await _repository.GetForUpdateAsync(request.LeaseId, cancellationToken);
        if (lease == null) return Result.Failure<CommandOutcome>(Error.NotFound);
        if (lease.Status == "CANCELLED")
            return Result.Success(new CommandOutcome(lease.Id, lease.Status));

        lease.Cancel();
        var outboxMessage = OutboxMessage.Create(
            "LeaseTerminationRequestedEvent",
            JsonSerializer.Serialize(new LeaseTerminationRequestedPayload(
                Guid.NewGuid(),
                lease.Id,
                lease.PropertyId,
                lease.TenantId,
                lease.LandlordId,
                lease.DepositAmount,
                DateTime.UtcNow,
                "Lease cancelled by an authorized user.")),
            "lease-events");
        await _repository.UpdateAsync(lease, outboxMessage, cancellationToken);
        return Result.Success(new CommandOutcome(lease.Id, lease.Status));
    }

    private sealed record LeaseTerminationRequestedPayload(Guid CorrelationId, Guid LeaseId, Guid PropertyId, Guid TenantId, Guid LandlordId, decimal DepositAmount, DateTime TerminationDate, string Reason);
}
