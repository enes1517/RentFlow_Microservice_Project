using Microsoft.EntityFrameworkCore;
using PaymentService.Application.Interfaces;
using PaymentService.Application.ReadModels;
using PaymentService.Infrastructure.Data;
using SharedKernel.Common;

namespace PaymentService.Infrastructure.Repositories;

public sealed class PaymentReadRepository(PaymentDbContext context) : IPaymentReadRepository
{
    private static readonly System.Linq.Expressions.Expression<Func<PaymentService.Domain.Entities.PaymentTransaction, PaymentReadModel>> Projection =
        payment => new PaymentReadModel(payment.Id, payment.LeaseId, payment.TenantId, payment.Amount,
            payment.Currency, payment.PaymentType, payment.Status, payment.FailureReason,
            payment.CreatedAt, payment.UpdatedAt);

    public Task<PagedResult<PaymentReadModel>> GetAllAsync(
        PagedQuery pagination,
        CancellationToken cancellationToken = default) =>
        PageAsync(context.PaymentTransactions.AsNoTracking()
            .OrderByDescending(payment => payment.CreatedAt).ThenBy(payment => payment.Id)
            .Select(Projection), pagination, cancellationToken);

    public Task<PaymentReadModel?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.PaymentTransactions.AsNoTracking().Where(payment => payment.Id == id)
            .Select(Projection).FirstOrDefaultAsync(cancellationToken);

    public Task<bool> HasTenantMismatchAsync(
        Guid leaseId,
        Guid tenantId,
        CancellationToken cancellationToken = default) =>
        context.PaymentTransactions.AsNoTracking()
            .AnyAsync(payment => payment.LeaseId == leaseId && payment.TenantId != tenantId, cancellationToken);

    public Task<PagedResult<PaymentReadModel>> GetByLeaseAsync(
        Guid leaseId,
        PagedQuery pagination,
        CancellationToken cancellationToken = default) =>
        PageAsync(context.PaymentTransactions.AsNoTracking().Where(payment => payment.LeaseId == leaseId)
            .OrderByDescending(payment => payment.CreatedAt).ThenBy(payment => payment.Id)
            .Select(Projection), pagination, cancellationToken);

    public Task<PagedResult<PaymentReadModel>> GetByTenantAsync(
        Guid tenantId,
        PagedQuery pagination,
        CancellationToken cancellationToken = default) =>
        PageAsync(context.PaymentTransactions.AsNoTracking().Where(payment => payment.TenantId == tenantId)
            .OrderByDescending(payment => payment.CreatedAt).ThenBy(payment => payment.Id)
            .Select(Projection), pagination, cancellationToken);

    private static async Task<PagedResult<PaymentReadModel>> PageAsync(
        IQueryable<PaymentReadModel> query,
        PagedQuery pagination,
        CancellationToken cancellationToken)
    {
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync(cancellationToken);
        return PagedResult<PaymentReadModel>.Create(items, totalCount, pagination.Page, pagination.PageSize);
    }
}
