using MaintenanceService.Application.Interfaces;
using MaintenanceService.Application.ReadModels;
using MaintenanceService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using SharedKernel.Common;

namespace MaintenanceService.Infrastructure.Repositories;

public sealed class MaintenanceReadRepository(MaintenanceDbContext context) : IMaintenanceReadRepository
{
    private static readonly System.Linq.Expressions.Expression<Func<MaintenanceService.Domain.Entities.MaintenanceRequest, MaintenanceReadModel>> Projection =
        request => new MaintenanceReadModel(request.Id, request.TenantId, request.PropertyId, request.UnitId,
            request.Title, request.Description, request.Priority, request.Status, request.EstimatedCost,
            request.CreatedAt, request.UpdatedAt);

    public async Task<PagedResult<MaintenanceReadModel>> GetAllAsync(
        bool sortByPriority,
        PagedQuery pagination,
        CancellationToken cancellationToken = default)
    {
        var query = context.MaintenanceRequests.AsNoTracking();
        if (sortByPriority)
            query = query.OrderBy(request => request.Priority == "CRITICAL" ? 1 :
                request.Priority == "HIGH" ? 2 : request.Priority == "MEDIUM" ? 3 :
                request.Priority == "LOW" ? 4 : 5)
                .ThenByDescending(request => request.CreatedAt).ThenBy(request => request.Id);
        else
            query = query.OrderByDescending(request => request.CreatedAt).ThenBy(request => request.Id);

        return await PageAsync(query.Select(Projection), pagination, cancellationToken);
    }

    public Task<MaintenanceReadModel?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.MaintenanceRequests.AsNoTracking().Where(request => request.Id == id)
            .Select(Projection).FirstOrDefaultAsync(cancellationToken);

    public Task<PagedResult<MaintenanceReadModel>> GetByTenantAsync(
        Guid tenantId,
        PagedQuery pagination,
        CancellationToken cancellationToken = default) =>
        PageAsync(context.MaintenanceRequests.AsNoTracking().Where(request => request.TenantId == tenantId)
            .OrderByDescending(request => request.CreatedAt).ThenBy(request => request.Id)
            .Select(Projection), pagination, cancellationToken);

    public Task<PagedResult<MaintenanceReadModel>> GetByPropertyAsync(
        Guid propertyId,
        PagedQuery pagination,
        CancellationToken cancellationToken = default) =>
        PageAsync(context.MaintenanceRequests.AsNoTracking().Where(request => request.PropertyId == propertyId)
            .OrderByDescending(request => request.CreatedAt).ThenBy(request => request.Id)
            .Select(Projection), pagination, cancellationToken);

    private static async Task<PagedResult<MaintenanceReadModel>> PageAsync(
        IQueryable<MaintenanceReadModel> query,
        PagedQuery pagination,
        CancellationToken cancellationToken)
    {
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync(cancellationToken);
        return PagedResult<MaintenanceReadModel>.Create(items, totalCount, pagination.Page, pagination.PageSize);
    }
}
