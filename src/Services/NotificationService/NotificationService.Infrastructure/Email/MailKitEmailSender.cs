using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using NotificationService.Application.Exceptions;
using NotificationService.Application.Interfaces;
using NotificationService.Infrastructure.Options;
using System.Net.Sockets;

namespace NotificationService.Infrastructure.Email;

public sealed class MailKitEmailSender(
    IOptions<SmtpOptions> options,
    ILogger<MailKitEmailSender> logger) : IEmailSender
{
    private readonly SmtpOptions _options = options.Value;

    public async Task SendAsync(
        string toEmail, string subject, string content, CancellationToken cancellationToken = default)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.SenderName, _options.SenderAddress));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = content };

        using var client = new SmtpClient();
        try
        {
            await client.ConnectAsync(
                _options.Host,
                _options.Port,
                _options.EnableSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None,
                cancellationToken);

            if (!string.IsNullOrWhiteSpace(_options.Username))
                await client.AuthenticateAsync(_options.Username, _options.Password, cancellationToken);

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
        }
        catch (Exception exception) when (exception is IOException
            or SocketException
            or SmtpCommandException
            or SmtpProtocolException
            or ServiceNotConnectedException
            or AuthenticationException
            or FormatException)
        {
            logger.LogError(exception, "SMTP delivery failed using host {SmtpHost}", _options.Host);
            throw new EmailDeliveryException("The SMTP server could not deliver the email.", exception);
        }
    }
}
