using LeaseService.Domain.Entities;
using SharedKernel.Messaging;

namespace LeaseService.Application.Interfaces;

public interface ILeaseWriteRepository
{
    Task<LeaseAgreement?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(LeaseAgreement lease, OutboxMessage outboxMessage, CancellationToken cancellationToken = default);
    Task UpdateAsync(
        LeaseAgreement lease,
        OutboxMessage? outboxMessage = null,
        CancellationToken cancellationToken = default);
}
