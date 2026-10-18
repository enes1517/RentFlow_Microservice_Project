using MassTransit;
using MediatR;
using SharedKernel.Contracts.Commands;
using SharedKernel.Contracts.Events;

namespace NotificationService.API.Messaging;

public class SendNotificationCommandConsumer : IConsumer<SharedKernel.Contracts.Commands.SendNotificationCommand>
{
    private readonly IMediator _mediator;
    private readonly ILogger<SendNotificationCommandConsumer> _logger;

    public SendNotificationCommandConsumer(IMediator mediator, ILogger<SendNotificationCommandConsumer> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<SharedKernel.Contracts.Commands.SendNotificationCommand> context)
    {
        _logger.LogInformation("Received SendNotificationCommand for {RecipientEmail} of type {NotificationType}", context.Message.RecipientEmail, context.Message.NotificationType);
        
        // Map to Application Command
        var appCommand = new NotificationService.Application.Commands.SendNotificationCommand(
            context.Message.RecipientId,
            context.Message.RecipientEmail, // using email field as target
            context.Message.NotificationType,
            "Notification from RentFlow", // default subject
            $"You have a new {context.Message.NotificationType} notification." // default content
        );

        var result = await _mediator.Send(appCommand);
        
        if (result != null)
        {
            await context.Publish(new NotificationSentEvent(
                context.Message.CorrelationId,
                context.Message.RecipientId,
                context.Message.NotificationType
            ));
        }
    }
}
