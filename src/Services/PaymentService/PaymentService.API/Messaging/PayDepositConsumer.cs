using MassTransit;
using MediatR;
using PaymentService.Application.Commands;
using SharedKernel.Contracts;

namespace PaymentService.API.Messaging;

public sealed class PayDepositConsumer(IMediator mediator)
    : IConsumer<IPayDepositCommand>
{
    public async Task Consume(ConsumeContext<IPayDepositCommand> context)
    {
        var result = await mediator.Send(
            new PayDepositCommand(
                context.Message.LeaseId,
                context.Message.TenantId,
                context.Message.Amount),
            context.CancellationToken);

        if (result.IsFailure)
        {
            await context.Publish<IDepositPaymentFailedEvent>(new
            {
                PaymentId = Guid.NewGuid(),
                context.Message.LeaseId,
                context.Message.TenantId,
                context.Message.Amount,
                Currency = "TRY",
                CreatedAt = DateTime.UtcNow,
                Reason = result.Error.Message
            });
        }
    }
}
