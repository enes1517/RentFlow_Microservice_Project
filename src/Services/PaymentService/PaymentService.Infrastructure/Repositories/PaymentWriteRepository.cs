using Microsoft.EntityFrameworkCore;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.Entities;
using PaymentService.Infrastructure.Data;
using SharedKernel.Messaging;

namespace PaymentService.Infrastructure.Repositories;

public sealed class PaymentWriteRepository(PaymentDbContext context) : IPaymentWriteRepository
{
    public async Task AddAsync(
        PaymentTransaction payment,
        OutboxMessage outboxMessage,
        CancellationToken cancellationToken = default)
    {
        context.PaymentTransactions.Add(payment);
        context.OutboxMessages.Add(outboxMessage);
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(PaymentTransaction payment, CancellationToken cancellationToken = default)
    {
        context.PaymentTransactions.Update(payment);
        await context.SaveChangesAsync(cancellationToken);
    }
}
