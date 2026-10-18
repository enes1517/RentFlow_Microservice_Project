using LeaseService.Application.Interfaces;
using LeaseService.Domain.Entities;
using LeaseService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using SharedKernel.Messaging;

namespace LeaseService.Infrastructure.Repositories;

public sealed class LeaseWriteRepository(LeaseDbContext context) : ILeaseWriteRepository
{
    public Task<LeaseAgreement?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.LeaseAgreements.FirstOrDefaultAsync(lease => lease.Id == id, cancellationToken);

    public async Task AddAsync(
        LeaseAgreement lease,
        OutboxMessage outboxMessage,
        CancellationToken cancellationToken = default)
    {
        context.LeaseAgreements.Add(lease);
        context.OutboxMessages.Add(outboxMessage);
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(
        LeaseAgreement lease,
        OutboxMessage? outboxMessage = null,
        CancellationToken cancellationToken = default)
    {
        context.LeaseAgreements.Update(lease);
        if (outboxMessage is not null)
            context.OutboxMessages.Add(outboxMessage);
        await context.SaveChangesAsync(cancellationToken);
    }
}
