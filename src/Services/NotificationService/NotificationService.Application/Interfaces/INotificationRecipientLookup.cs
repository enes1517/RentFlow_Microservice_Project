namespace NotificationService.Application.Interfaces;

public interface INotificationRecipientLookup
{
    Task<NotificationRecipientLookup?> GetRecipientAsync(
        Guid userId, string authorization, CancellationToken cancellationToken);
    Task<bool?> HasTenantLeaseAsync(
        Guid landlordId, Guid tenantId, string authorization, CancellationToken cancellationToken);
}

public sealed record NotificationRecipientLookup(Guid Id, string Role, string Email);
