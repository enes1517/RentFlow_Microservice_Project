using PaymentService.Domain.Entities;
using SharedKernel.Messaging;

namespace PaymentService.Application.Interfaces;

public interface IPaymentWriteRepository
{
    Task AddAsync(PaymentTransaction payment, OutboxMessage outboxMessage, CancellationToken cancellationToken = default);
    Task UpdateAsync(PaymentTransaction payment, CancellationToken cancellationToken = default);
}
