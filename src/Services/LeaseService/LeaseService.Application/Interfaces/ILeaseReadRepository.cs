using LeaseService.Application.ReadModels;
using SharedKernel.Common;

namespace LeaseService.Application.Interfaces;

public interface ILeaseReadRepository
{
    Task<PagedResult<LeaseReadModel>> GetAllAsync(PagedQuery pagination, CancellationToken cancellationToken = default);
    Task<LeaseReadModel?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PagedResult<LeaseReadModel>> GetByTenantAsync(Guid tenantId, PagedQuery pagination, CancellationToken cancellationToken = default);
    Task<PagedResult<LeaseReadModel>> GetByLandlordAsync(Guid landlordId, PagedQuery pagination, CancellationToken cancellationToken = default);
    Task<List<Guid>> FilterRelatedTenantsAsync(Guid landlordId, IEnumerable<Guid> tenantIds, CancellationToken cancellationToken = default);
}
