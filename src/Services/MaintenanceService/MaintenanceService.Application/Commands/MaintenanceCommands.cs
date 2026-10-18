using MediatR;
using SharedKernel.Common;
using MaintenanceService.Domain.Entities;
using MaintenanceService.Application.Interfaces;
using MassTransit;
using SharedKernel.Contracts.Events;

namespace MaintenanceService.Application.Commands;

// ─── CreateMaintenanceRequest ─────────────────────────────────────────────────

public record CreateMaintenanceRequestCommand(
    Guid TenantId,
    Guid PropertyId,
    Guid UnitId,
    string Title,
    string Description,
    string Priority = "LOW"
) : IRequest<Result<CommandOutcome>>;

public class CreateMaintenanceRequestCommandHandler : IRequestHandler<CreateMaintenanceRequestCommand, Result<CommandOutcome>>
{
    private readonly IMaintenanceWriteRepository _repository;
    private readonly IPublishEndpoint _publisher;
    public CreateMaintenanceRequestCommandHandler(IMaintenanceWriteRepository repository, IPublishEndpoint publisher)
    {
        _repository = repository;
        _publisher = publisher;
    }

    public async Task<Result<CommandOutcome>> Handle(CreateMaintenanceRequestCommand request, CancellationToken cancellationToken)
    {
        MaintenanceRequest maintenance;
        try
        {
            maintenance = MaintenanceRequest.Create(
                request.TenantId,
                request.PropertyId,
                request.UnitId,
                request.Title,
                request.Description,
                request.Priority);
        }
        catch (ArgumentException exception)
        {
            return Result.Failure<CommandOutcome>(Error.Custom("VALIDATION_FAILED", exception.Message));
        }

        await PublishProjectionAsync(maintenance, cancellationToken);
        await _repository.AddAsync(maintenance, cancellationToken);
        return Result.Success(new CommandOutcome(maintenance.Id, maintenance.Status));
    }

    private Task PublishProjectionAsync(MaintenanceRequest maintenance, CancellationToken cancellationToken) =>
        _publisher.Publish(new MaintenanceReportDataChangedEvent(
            maintenance.Id, maintenance.Id, maintenance.PropertyId, maintenance.Status,
            maintenance.EstimatedCost, maintenance.CreatedAt, maintenance.UpdatedAt), cancellationToken);
}

// ─── UpdateMaintenanceStatus ──────────────────────────────────────────────────

public record UpdateMaintenanceStatusCommand(
    Guid Id,
    string Status,
    decimal? EstimatedCost = null
) : IRequest<Result<CommandOutcome>>;

public class UpdateMaintenanceStatusCommandHandler : IRequestHandler<UpdateMaintenanceStatusCommand, Result<CommandOutcome>>
{
    private readonly IMaintenanceWriteRepository _repository;
    private readonly IPublishEndpoint _publisher;
    public UpdateMaintenanceStatusCommandHandler(IMaintenanceWriteRepository repository, IPublishEndpoint publisher)
    {
        _repository = repository;
        _publisher = publisher;
    }

    public async Task<Result<CommandOutcome>> Handle(UpdateMaintenanceStatusCommand request, CancellationToken cancellationToken)
    {
        var maintenance = await _repository.GetForUpdateAsync(request.Id, cancellationToken);
        if (maintenance == null) return Result.Failure<CommandOutcome>(Error.NotFound);

        try
        {
            maintenance.UpdateStatus(request.Status, request.EstimatedCost);
        }
        catch (ArgumentOutOfRangeException exception)
        {
            return Result.Failure<CommandOutcome>(Error.Custom("VALIDATION_FAILED", exception.Message));
        }
        catch (InvalidOperationException exception)
        {
            return Result.Failure<CommandOutcome>(Error.Custom("INVALID_TRANSITION", exception.Message));
        }

        await _publisher.Publish(new MaintenanceReportDataChangedEvent(
            maintenance.Id, maintenance.Id, maintenance.PropertyId, maintenance.Status,
            maintenance.EstimatedCost, maintenance.CreatedAt, maintenance.UpdatedAt), cancellationToken);
        await _repository.UpdateAsync(maintenance, cancellationToken);
        return Result.Success(new CommandOutcome(maintenance.Id, maintenance.Status));
    }
}
