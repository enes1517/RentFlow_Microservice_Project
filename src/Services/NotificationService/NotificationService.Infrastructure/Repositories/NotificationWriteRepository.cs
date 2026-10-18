using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NotificationService.Application.Interfaces;
using NotificationService.Domain.Entities;
using NotificationService.Infrastructure.Data;
using SharedKernel.Common;

namespace NotificationService.Infrastructure.Repositories;

public sealed class NotificationWriteRepository(
    NotificationDbContext context,
    ILogger<NotificationWriteRepository> logger) : INotificationWriteRepository
{
    public async Task<Guid> CreateAsync(
        Guid userId, string type, string subject, string content, CancellationToken cancellationToken = default)
    {
        var log = NotificationLog.Create(userId, type, subject, content);
        context.NotificationLogs.Add(log);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Notification {NotificationId} queued for delivery", log.Id);
        return log.Id;
    }

    public async Task<CommandOutcome> MarkAsSentAsync(Guid notificationId, CancellationToken cancellationToken = default)
    {
        var notification = await GetNotificationAsync(notificationId, cancellationToken);
        notification.MarkAsSent();
        await context.SaveChangesAsync(cancellationToken);
        return new CommandOutcome(notification.Id, notification.Status);
    }

    public async Task<CommandOutcome> MarkAsFailedAsync(
        Guid notificationId, string error, CancellationToken cancellationToken = default)
    {
        var notification = await GetNotificationAsync(notificationId, cancellationToken);
        notification.MarkAsFailed(error);
        await context.SaveChangesAsync(cancellationToken);
        return new CommandOutcome(notification.Id, notification.Status, notification.ErrorMessage);
    }

    private Task<NotificationLog> GetNotificationAsync(Guid notificationId, CancellationToken cancellationToken) =>
        context.NotificationLogs.SingleAsync(log => log.Id == notificationId, cancellationToken);
}
