using MassTransit;
using SharedKernel.Contracts.Commands;
using SharedKernel.Contracts.Events;

namespace PaymentService.API.Messaging;

public class RefundDepositCommandConsumer : IConsumer<RefundDepositCommand>
{
    private readonly ILogger<RefundDepositCommandConsumer> _logger;

    public RefundDepositCommandConsumer(ILogger<RefundDepositCommandConsumer> logger)
    {
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<RefundDepositCommand> context)
    {
        _logger.LogInformation("Refunding deposit for LeaseId: {LeaseId}, RefundAmount: {RefundAmount}", context.Message.LeaseId, context.Message.RefundAmount);
        
        // Simulating the refund process
        await Task.Delay(100);
        
        await context.Publish(new DepositRefundedEvent(
            context.Message.CorrelationId,
            context.Message.LeaseId,
            context.Message.RefundAmount
        ));
    }
}
