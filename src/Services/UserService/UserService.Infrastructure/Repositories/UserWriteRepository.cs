using Microsoft.EntityFrameworkCore;
using UserService.Application.Interfaces;
using UserService.Domain.Entities;
using UserService.Infrastructure.Data;

namespace UserService.Infrastructure.Repositories;

public sealed class UserWriteRepository(UserDbContext context) : IUserWriteRepository
{
    public Task<UserProfile?> GetForUpdateByIdentityIdAsync(string identityId, CancellationToken cancellationToken = default) =>
        context.UserProfiles.FirstOrDefaultAsync(user => user.IdentityId == identityId, cancellationToken);

    public Task AddAsync(UserProfile user, CancellationToken cancellationToken = default)
    {
        context.UserProfiles.Add(user);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(UserProfile user, CancellationToken cancellationToken = default)
    {
        context.UserProfiles.Update(user);
        return Task.CompletedTask;
    }

    public Task AddTenantInvitationAsync(TenantInvitation invitation, CancellationToken cancellationToken = default)
    {
        context.TenantInvitations.Add(invitation);
        return Task.CompletedTask;
    }

    public Task AddOutboxMessageAsync(SharedKernel.Messaging.OutboxMessage message, CancellationToken cancellationToken = default)
    {
        context.OutboxMessages.Add(message);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        context.SaveChangesAsync(cancellationToken);
}
