using UserService.Application.ReadModels;
using SharedKernel.Common;

namespace UserService.Application.Interfaces;

public interface IUserReadRepository
{
    Task<PagedResult<UserReadModel>> GetAllAsync(PagedQuery pagination, CancellationToken cancellationToken = default);
    Task<PagedResult<TenantLookupReadModel>> GetTenantsAsync(
        string? search,
        PagedQuery pagination,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TenantLookupReadModel>> GetTenantsByIdsAsync(
        IReadOnlyCollection<Guid> ids,
        CancellationToken cancellationToken = default);
    Task<UserReadModel?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<UserReadModel?> GetByIdentityIdAsync(string identityId, CancellationToken cancellationToken = default);
}
