using MassTransit;
using SharedKernel.Contracts.Commands;
using SharedKernel.Contracts.Events;

namespace MaintenanceService.API.Messaging;

public class AssessDamageCommandConsumer : IConsumer<AssessDamageCommand>
{
    private readonly ILogger<AssessDamageCommandConsumer> _logger;

    public AssessDamageCommandConsumer(ILogger<AssessDamageCommandConsumer> logger)
    {
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<AssessDamageCommand> context)
    {
        _logger.LogInformation("Assessing damage for LeaseId: {LeaseId}", context.Message.LeaseId);
        
        // Simulate damage assessment. 0 damage for happy path.
        await Task.Delay(100);
        
        await context.Publish(new DamageAssessedEvent(
            context.Message.CorrelationId,
            context.Message.LeaseId,
            0m,
            "No damage detected"
        ));
    }
}
