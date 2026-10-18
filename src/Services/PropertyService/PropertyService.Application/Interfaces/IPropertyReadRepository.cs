using PropertyService.Application.ReadModels;
using SharedKernel.Common;

namespace PropertyService.Application.Interfaces;

public interface IPropertyReadRepository
{
    Task<PagedResult<PropertyReadModel>> GetAllAsync(PagedQuery pagination, CancellationToken cancellationToken = default);
    Task<PropertyReadModel?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PagedResult<PropertyReadModel>> GetByLandlordAsync(Guid landlordId, PagedQuery pagination, CancellationToken cancellationToken = default);
}
