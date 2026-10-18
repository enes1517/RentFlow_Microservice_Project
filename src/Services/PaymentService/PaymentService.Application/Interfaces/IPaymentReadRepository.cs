using PaymentService.Application.ReadModels;
using SharedKernel.Common;

namespace PaymentService.Application.Interfaces;

public interface IPaymentReadRepository
{
    Task<PagedResult<PaymentReadModel>> GetAllAsync(PagedQuery pagination, CancellationToken cancellationToken = default);
    Task<PaymentReadModel?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> HasTenantMismatchAsync(Guid leaseId, Guid tenantId, CancellationToken cancellationToken = default);
    Task<PagedResult<PaymentReadModel>> GetByLeaseAsync(Guid leaseId, PagedQuery pagination, CancellationToken cancellationToken = default);
    Task<PagedResult<PaymentReadModel>> GetByTenantAsync(Guid tenantId, PagedQuery pagination, CancellationToken cancellationToken = default);
}
