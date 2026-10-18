using Microsoft.EntityFrameworkCore;
using NotificationService.Application.Interfaces;
using NotificationService.Application.ReadModels;
using NotificationService.Infrastructure.Data;
using SharedKernel.Common;

namespace NotificationService.Infrastructure.Repositories;

public sealed class NotificationReadRepository(NotificationDbContext context) : INotificationReadRepository
{
    public Task<PagedResult<NotificationReadModel>> GetAllAsync(
        PagedQuery pagination,
        CancellationToken cancellationToken = default) =>
        PageAsync(Project(context.NotificationLogs.AsNoTracking()
            .OrderByDescending(log => log.CreatedAt).ThenBy(log => log.Id)), pagination, cancellationToken);

    public Task<PagedResult<NotificationReadModel>> GetByUserAsync(
        Guid userId,
        PagedQuery pagination,
        CancellationToken cancellationToken = default) =>
        PageAsync(Project(context.NotificationLogs.AsNoTracking()
                .Where(log => log.UserId == userId)
                .OrderByDescending(log => log.CreatedAt).ThenBy(log => log.Id)),
            pagination, cancellationToken);

    private static async Task<PagedResult<NotificationReadModel>> PageAsync(
        IQueryable<NotificationReadModel> query,
        PagedQuery pagination,
        CancellationToken cancellationToken)
    {
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync(cancellationToken);
        return PagedResult<NotificationReadModel>.Create(items, totalCount, pagination.Page, pagination.PageSize);
    }

    private static IQueryable<NotificationReadModel> Project(
        IQueryable<NotificationService.Domain.Entities.NotificationLog> logs) =>
        logs
            .Select(log => new NotificationReadModel(log.Id, log.UserId, log.Type, log.Subject,
                log.Content, log.Status, log.ErrorMessage, log.CreatedAt, log.UpdatedAt));
}
