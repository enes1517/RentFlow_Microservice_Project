using MassTransit;
using SharedKernel.Contracts.Commands;
using SharedKernel.Contracts.Events;
using PropertyService.Application.Interfaces;
using MediatR;

namespace PropertyService.API.Messaging;

public class ReleasePropertyCommandConsumer : IConsumer<ReleasePropertyCommand>
{
    private readonly ILogger<ReleasePropertyCommandConsumer> _logger;

    public ReleasePropertyCommandConsumer(ILogger<ReleasePropertyCommandConsumer> logger)
    {
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ReleasePropertyCommand> context)
    {
        _logger.LogInformation("Releasing property: {PropertyId}", context.Message.PropertyId);
        
        // We just publish the event back for now to complete the saga.
        // In a full implementation, we'd update the property/unit status in DB via repository/mediator.
        await Task.Delay(100);
        
        await context.Publish(new PropertyReleasedEvent(
            context.Message.CorrelationId,
            context.Message.PropertyId
        ));
    }
}
