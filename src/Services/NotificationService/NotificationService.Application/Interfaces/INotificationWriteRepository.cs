using SharedKernel.Common;

namespace NotificationService.Application.Interfaces;

public interface INotificationWriteRepository
{
    Task<Guid> CreateAsync(Guid userId, string type, string subject, string content, CancellationToken cancellationToken = default);
    Task<CommandOutcome> MarkAsSentAsync(Guid notificationId, CancellationToken cancellationToken = default);
    Task<CommandOutcome> MarkAsFailedAsync(Guid notificationId, string error, CancellationToken cancellationToken = default);
}
