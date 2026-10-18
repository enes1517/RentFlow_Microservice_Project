using DocumentService.Application.Commands;
using MassTransit;
using MediatR;
using SharedKernel.Contracts;

namespace DocumentService.API.Messaging;

public sealed class GenerateContractConsumer(IMediator mediator)
    : IConsumer<IGenerateLeaseContractCommand>
{
    public async Task Consume(ConsumeContext<IGenerateLeaseContractCommand> context)
    {
        var result = await mediator.Send(
            new GenerateLeaseContractCommand(
                context.Message.LeaseId,
                context.Message.TenantId,
                context.Message.PropertyId,
                context.Message.MonthlyRent,
                context.Message.DepositAmount),
            context.CancellationToken);

        await context.Publish<ILeaseContractGeneratedEvent>(new
        {
            context.Message.LeaseId,
            DocumentId = result.Id
        });
    }
}
