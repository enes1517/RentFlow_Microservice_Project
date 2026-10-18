using MassTransit;
using SharedKernel.Contracts.Events;
using NotificationService.Application.Interfaces;
using NotificationService.Domain.Entities;
using System.Threading.Tasks;
using System.Text.Json;
using System.Collections.Generic;

namespace NotificationService.API.Messaging;

public class TenantInvitedEventConsumer : IConsumer<TenantInvitedEvent>
{
    private readonly IEmailSender _emailProvider;
    private readonly INotificationWriteRepository _repository;

    public TenantInvitedEventConsumer(IEmailSender emailProvider, INotificationWriteRepository repository)
    {
        _emailProvider = emailProvider;
        _repository = repository;
    }

    public async Task Consume(ConsumeContext<TenantInvitedEvent> context)
    {
        var message = context.Message;
        
        string subject = "RentFlow: Kiracı Davetiyesi";
        string body = $@"
            <h2>Merhaba {message.FirstName} {message.LastName},</h2>
            <p>RentFlow platformuna kiracı olarak davet edildiniz.</p>
            <p>Sözleşmenizi incelemek ve onaylamak için aşağıdaki bağlantıya tıklayarak kayıt işleminizi tamamlayabilirsiniz:</p>
            <br/>
            <a href='http://localhost:4200/onboarding?token={message.InvitationToken}' style='background-color:#4CAF50;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;'>Sisteme Katıl ve Sözleşmeyi İncele</a>
            <br/><br/>
            <p>Teşekkürler,<br/>RentFlow Ekibi</p>";

        await _emailProvider.SendAsync(message.Email, subject, body);

        var notificationId = await _repository.CreateAsync(
            Guid.Empty, // Target UserId is not known yet
            "EMAIL",
            "Davetiye Gönderildi",
            JsonSerializer.Serialize(new { message.Email, message.InvitationToken })
        );
        await _repository.MarkAsSentAsync(notificationId);
    }
}
