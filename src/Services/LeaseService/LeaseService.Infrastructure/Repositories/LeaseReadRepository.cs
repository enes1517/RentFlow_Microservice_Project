using LeaseService.Application.Interfaces;
using LeaseService.Application.ReadModels;
using LeaseService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using SharedKernel.Common;

namespace LeaseService.Infrastructure.Repositories;

public sealed class LeaseReadRepository(LeaseDbContext context) : ILeaseReadRepository
{
    private static readonly System.Linq.Expressions.Expression<Func<LeaseService.Domain.Entities.LeaseAgreement, LeaseReadModel>> Projection =
        lease => new LeaseReadModel(lease.Id, lease.TenantId, lease.LandlordId, lease.PropertyId, lease.UnitId,
            lease.StartDate, lease.EndDate, lease.MonthlyRentAmount, lease.DepositAmount, lease.Status,
            lease.CreatedAt, lease.UpdatedAt);

    public Task<PagedResult<LeaseReadModel>> GetAllAsync(
        PagedQuery pagination,
        CancellationToken cancellationToken = default) =>
        PageAsync(context.LeaseAgreements.AsNoTracking().OrderBy(lease => lease.Id)
            .Select(Projection), pagination, cancellationToken);

    public Task<LeaseReadModel?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.LeaseAgreements.AsNoTracking().Where(lease => lease.Id == id)
            .Select(Projection).FirstOrDefaultAsync(cancellationToken);

    public Task<PagedResult<LeaseReadModel>> GetByTenantAsync(
        Guid tenantId,
        PagedQuery pagination,
        CancellationToken cancellationToken = default) =>
        PageAsync(context.LeaseAgreements.AsNoTracking().Where(lease => lease.TenantId == tenantId)
            .OrderBy(lease => lease.Id).Select(Projection), pagination, cancellationToken);

    public Task<PagedResult<LeaseReadModel>> GetByLandlordAsync(
        Guid landlordId,
        PagedQuery pagination,
        CancellationToken cancellationToken = default) =>
        PageAsync(context.LeaseAgreements.AsNoTracking().Where(lease => lease.LandlordId == landlordId)
            .OrderBy(lease => lease.Id).Select(Projection), pagination, cancellationToken);

    private static async Task<PagedResult<LeaseReadModel>> PageAsync(
        IQueryable<LeaseReadModel> query,
        PagedQuery pagination,
        CancellationToken cancellationToken)
    {
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync(cancellationToken);
        return PagedResult<LeaseReadModel>.Create(items, totalCount, pagination.Page, pagination.PageSize);
    }

    public Task<List<Guid>> FilterRelatedTenantsAsync(
        Guid landlordId,
        IEnumerable<Guid> tenantIds,
        CancellationToken cancellationToken = default)
    {
        var ids = tenantIds.ToList();
        return context.LeaseAgreements.AsNoTracking()
            .Where(l => l.LandlordId == landlordId && ids.Contains(l.TenantId))
            .Select(l => l.TenantId)
            .Distinct()
            .ToListAsync(cancellationToken);
    }
}
