using MassTransit;
using PropertyService.Application.Interfaces;
using SharedKernel.Contracts;

namespace PropertyService.API.Messaging;

public sealed class ReservePropertyConsumer(IPropertyWriteRepository repository)
    : IConsumer<IReservePropertyCommand>
{
    public async Task Consume(ConsumeContext<IReservePropertyCommand> context)
    {
        var reserved = await repository.ReserveUnitAsync(
            context.Message.PropertyId,
            context.Message.UnitId,
            context.Message.LandlordId,
            context.Message.LeaseId,
            context.CancellationToken);

        if (reserved)
        {
            await context.Publish<IPropertyReservedEvent>(new
            {
                context.Message.PropertyId,
                LeaseId = context.Message.LeaseId
            });
            return;
        }

        await context.Publish<IPropertyReservationFailedEvent>(new
        {
            context.Message.PropertyId,
            LeaseId = context.Message.LeaseId,
            Reason = "The property is not owned by the landlord or the requested unit is missing or unavailable."
        });
    }
}

public sealed class ReleasePropertyReservationConsumer(IPropertyWriteRepository repository)
    : IConsumer<IReleasePropertyReservationCommand>
{
    public Task Consume(ConsumeContext<IReleasePropertyReservationCommand> context) =>
        repository.ReleaseUnitReservationAsync(
            context.Message.PropertyId,
            context.Message.UnitId,
            context.Message.LeaseId,
            context.CancellationToken);
}

public sealed class MarkUnitRentedConsumer(IPropertyWriteRepository repository)
    : IConsumer<IMarkUnitRentedCommand>
{
    public async Task Consume(ConsumeContext<IMarkUnitRentedCommand> context)
    {
        var updated = await repository.MarkUnitRentedAsync(
            context.Message.PropertyId,
            context.Message.UnitId,
            context.Message.LeaseId,
            context.CancellationToken);
        if (!updated)
            throw new InvalidOperationException("The reserved unit could not be marked as rented.");

        await context.Publish<IUnitMarkedRentedEvent>(new
        {
            context.Message.LeaseId
        });
    }
}
