namespace NotificationService.Application.Interfaces;

public interface ISmsSender
{
    Task SendAsync(string phoneNumber, string message, CancellationToken cancellationToken = default);
}

public interface IPushSender
{
    Task SendAsync(string deviceToken, string title, string message, CancellationToken cancellationToken = default);
}
