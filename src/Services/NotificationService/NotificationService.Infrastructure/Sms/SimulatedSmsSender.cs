using NotificationService.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace NotificationService.Infrastructure.Sms;

public class SimulatedSmsSender : ISmsSender
{
    private readonly ILogger<SimulatedSmsSender> _logger;

    public SimulatedSmsSender(ILogger<SimulatedSmsSender> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string phoneNumber, string message, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("SIMULATED SMS to {PhoneNumber}: {Message}", phoneNumber, message);
        return Task.CompletedTask;
    }
}
