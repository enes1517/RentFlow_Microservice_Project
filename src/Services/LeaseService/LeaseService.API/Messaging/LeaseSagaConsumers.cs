using MassTransit;
using MediatR;
using LeaseService.Application.Commands;
using SharedKernel.Contracts;

namespace LeaseService.API.Messaging;

public sealed class ActivateLeaseConsumer(IMediator mediator)
    : IConsumer<IActivateLeaseCommand>
{
    public async Task Consume(ConsumeContext<IActivateLeaseCommand> context)
    {
        var result = await mediator.Send(
            new ActivateLeaseCommand(context.Message.LeaseId),
            context.CancellationToken);
        if (result.IsFailure)
        {
            throw new InvalidOperationException($"Lease activation failed: {result.Error.Message}");
        }

        await context.Publish<ILeaseActivatedEvent>(new { context.Message.LeaseId });
    }
}

public sealed class CancelLeaseConsumer(IMediator mediator)
    : IConsumer<ILeaseCancelledEvent>
{
    public async Task Consume(ConsumeContext<ILeaseCancelledEvent> context)
    {
        var result = await mediator.Send(
            new CancelLeaseCommand(context.Message.LeaseId),
            context.CancellationToken);
        if (result.IsFailure && result.Error.Code != "NOT_FOUND")
        {
            throw new InvalidOperationException($"Lease cancellation failed: {result.Error.Message}");
        }

        await context.Publish<IReleasePropertyReservationCommand>(new
        {
            context.Message.PropertyId,
            context.Message.UnitId,
            context.Message.LeaseId
        });
    }
}
