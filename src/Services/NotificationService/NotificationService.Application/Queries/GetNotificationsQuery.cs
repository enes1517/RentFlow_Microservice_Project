using MediatR;
using NotificationService.Application.ReadModels;
using SharedKernel.Common;

namespace NotificationService.Application.Queries;

public sealed record GetNotificationsQuery(PagedQuery Pagination, Guid? UserId = null) : IRequest<PagedResult<NotificationReadModel>>;
