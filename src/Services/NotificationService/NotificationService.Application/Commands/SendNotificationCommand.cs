using MediatR;
using NotificationService.Application.Exceptions;
using NotificationService.Application.Interfaces;
using SharedKernel.Common;
using System.Net.Mail;

namespace NotificationService.Application.Commands;

public sealed record SendNotificationCommand(Guid UserId, string ToEmail, string Type, string Subject, string Content)
    : IRequest<CommandOutcome>;

public sealed class SendNotificationCommandHandler(
    INotificationWriteRepository repository,
    IEmailSender emailSender,
    ISmsSender smsSender,
    IPushSender pushSender)
    : IRequestHandler<SendNotificationCommand, CommandOutcome>
{
    public async Task<CommandOutcome> Handle(SendNotificationCommand request, CancellationToken cancellationToken)
    {
        var type = request.Type.ToUpperInvariant();
        if (type != "EMAIL" && type != "SMS" && type != "PUSH")
            throw new NotSupportedException($"Notification type '{request.Type}' is not supported.");

        var notificationId = await repository.CreateAsync(
            request.UserId, type, request.Subject, request.Content, cancellationToken);

        try
        {
            if (type == "EMAIL")
            {
                if (!MailAddress.TryCreate(request.ToEmail, out _))
                    throw new ArgumentException("A valid recipient email address is required.", nameof(request));
                await emailSender.SendAsync(request.ToEmail, request.Subject, request.Content, cancellationToken);
            }
            else if (type == "SMS")
            {
                await smsSender.SendAsync(request.ToEmail, request.Content, cancellationToken);
            }
            else if (type == "PUSH")
            {
                await pushSender.SendAsync(request.ToEmail, request.Subject, request.Content, cancellationToken);
            }
            
            return await repository.MarkAsSentAsync(notificationId, cancellationToken);
        }
        catch (Exception ex)
        {
            return await repository.MarkAsFailedAsync(
                notificationId, $"{type} delivery failed: {ex.Message}", cancellationToken);
        }
    }
}
