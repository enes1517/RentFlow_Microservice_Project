using Microsoft.EntityFrameworkCore;
using UserService.Application.Interfaces;
using UserService.Application.ReadModels;
using UserService.Infrastructure.Data;
using SharedKernel.Common;

namespace UserService.Infrastructure.Repositories;

public sealed class UserReadRepository(UserDbContext context) : IUserReadRepository
{
    public async Task<PagedResult<UserReadModel>> GetAllAsync(
        PagedQuery pagination,
        CancellationToken cancellationToken = default)
    {
        var query = context.UserProfiles.AsNoTracking();
        var totalCount = await query.CountAsync(cancellationToken);
        var users = await query.OrderBy(user => user.Id)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(user => new UserReadModel(user.Id, user.IdentityId, user.Email, user.FirstName,
                user.LastName, user.Role, user.PhoneNumber, user.IsActive,
                user.CreatedAt, user.UpdatedAt))
            .ToListAsync(cancellationToken);
        return PagedResult<UserReadModel>.Create(users, totalCount, pagination.Page, pagination.PageSize);
    }

    public async Task<PagedResult<TenantLookupReadModel>> GetTenantsAsync(
        string? search,
        PagedQuery pagination,
        CancellationToken cancellationToken = default)
    {
        var tenants = context.UserProfiles.AsNoTracking()
            .Where(user => user.Role == "TENANT" && user.IsActive);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            tenants = tenants.Where(user => user.Email.Contains(term) ||
                user.FirstName.Contains(term) || user.LastName.Contains(term));
        }

        var totalCount = await tenants.CountAsync(cancellationToken);
        var items = await tenants.OrderBy(user => user.LastName).ThenBy(user => user.FirstName).ThenBy(user => user.Id)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(user => new TenantLookupReadModel(user.Id, user.FirstName, user.LastName, user.Email))
            .ToListAsync(cancellationToken);
        return PagedResult<TenantLookupReadModel>.Create(items, totalCount, pagination.Page, pagination.PageSize);
    }

    public async Task<IReadOnlyList<TenantLookupReadModel>> GetTenantsByIdsAsync(
        IReadOnlyCollection<Guid> ids,
        CancellationToken cancellationToken = default)
    {
        if (ids.Count == 0) return [];

        return await context.UserProfiles.AsNoTracking()
            .Where(user => ids.Contains(user.Id) && user.Role == "TENANT" && user.IsActive)
            .OrderBy(user => user.LastName).ThenBy(user => user.FirstName).ThenBy(user => user.Id)
            .Select(user => new TenantLookupReadModel(user.Id, user.FirstName, user.LastName, user.Email))
            .ToListAsync(cancellationToken);
    }

    public Task<UserReadModel?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.UserProfiles.AsNoTracking().Where(user => user.Id == id)
            .Select(user => new UserReadModel(user.Id, user.IdentityId, user.Email, user.FirstName,
                user.LastName, user.Role, user.PhoneNumber, user.IsActive,
                user.CreatedAt, user.UpdatedAt))
            .FirstOrDefaultAsync(cancellationToken);

    public Task<UserReadModel?> GetByIdentityIdAsync(string identityId, CancellationToken cancellationToken = default) =>
        context.UserProfiles.AsNoTracking().Where(user => user.IdentityId == identityId)
            .Select(user => new UserReadModel(user.Id, user.IdentityId, user.Email, user.FirstName,
                user.LastName, user.Role, user.PhoneNumber, user.IsActive,
                user.CreatedAt, user.UpdatedAt))
            .FirstOrDefaultAsync(cancellationToken);
}
