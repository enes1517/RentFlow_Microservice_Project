using NotificationService.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace NotificationService.Infrastructure.Push;

public class SimulatedPushSender : IPushSender
{
    private readonly ILogger<SimulatedPushSender> _logger;

    public SimulatedPushSender(ILogger<SimulatedPushSender> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string deviceToken, string title, string message, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("SIMULATED PUSH to {DeviceToken} - Title: {Title}, Body: {Message}", deviceToken, title, message);
        return Task.CompletedTask;
    }
}
