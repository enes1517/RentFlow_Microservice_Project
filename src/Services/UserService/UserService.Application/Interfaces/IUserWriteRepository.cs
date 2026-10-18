using UserService.Domain.Entities;

namespace UserService.Application.Interfaces;

public interface IUserWriteRepository
{
    Task<UserProfile?> GetForUpdateByIdentityIdAsync(string identityId, CancellationToken cancellationToken = default);
    Task AddAsync(UserProfile user, CancellationToken cancellationToken = default);
    Task UpdateAsync(UserProfile user, CancellationToken cancellationToken = default);
    Task AddTenantInvitationAsync(TenantInvitation invitation, CancellationToken cancellationToken = default);
    Task AddOutboxMessageAsync(SharedKernel.Messaging.OutboxMessage message, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
