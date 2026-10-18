using MaintenanceService.Application.ReadModels;
using SharedKernel.Common;

namespace MaintenanceService.Application.Interfaces;

public interface IMaintenanceReadRepository
{
    Task<PagedResult<MaintenanceReadModel>> GetAllAsync(bool sortByPriority, PagedQuery pagination, CancellationToken cancellationToken = default);
    Task<MaintenanceReadModel?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PagedResult<MaintenanceReadModel>> GetByTenantAsync(Guid tenantId, PagedQuery pagination, CancellationToken cancellationToken = default);
    Task<PagedResult<MaintenanceReadModel>> GetByPropertyAsync(Guid propertyId, PagedQuery pagination, CancellationToken cancellationToken = default);
}
