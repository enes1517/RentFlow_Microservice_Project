using MediatR;
using NotificationService.Application.Interfaces;
using NotificationService.Application.ReadModels;
using SharedKernel.Common;

namespace NotificationService.Application.Queries;

public sealed class GetNotificationsQueryHandler(INotificationReadRepository repository)
    : IRequestHandler<GetNotificationsQuery, PagedResult<NotificationReadModel>>
{
    public Task<PagedResult<NotificationReadModel>> Handle(GetNotificationsQuery request, CancellationToken cancellationToken) =>
        request.UserId is { } userId
            ? repository.GetByUserAsync(userId, request.Pagination, cancellationToken)
            : repository.GetAllAsync(request.Pagination, cancellationToken);
}
