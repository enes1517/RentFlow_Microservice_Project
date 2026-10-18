using NotificationService.Application.ReadModels;
using SharedKernel.Common;

namespace NotificationService.Application.Interfaces;

public interface INotificationReadRepository
{
    Task<PagedResult<NotificationReadModel>> GetAllAsync(PagedQuery pagination, CancellationToken cancellationToken = default);
    Task<PagedResult<NotificationReadModel>> GetByUserAsync(Guid userId, PagedQuery pagination, CancellationToken cancellationToken = default);
}
