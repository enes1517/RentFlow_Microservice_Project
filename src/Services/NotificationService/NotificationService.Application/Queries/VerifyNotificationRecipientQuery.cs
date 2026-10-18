using MediatR;
using NotificationService.Application.Interfaces;

namespace NotificationService.Application.Queries;

public sealed record VerifyNotificationRecipientQuery(
    Guid UserId,
    string Authorization,
    string ExpectedEmail,
    Guid? LandlordId = null) : IRequest<NotificationRecipientVerification>;

public sealed record NotificationRecipientVerification(
    NotificationRecipientLookup? Recipient,
    bool RecipientUnavailable,
    bool? LandlordHasLease);

public sealed class VerifyNotificationRecipientQueryHandler(INotificationRecipientLookup lookup)
    : IRequestHandler<VerifyNotificationRecipientQuery, NotificationRecipientVerification>
{
    public async Task<NotificationRecipientVerification> Handle(
        VerifyNotificationRecipientQuery request, CancellationToken cancellationToken)
    {
        var recipient = await lookup.GetRecipientAsync(
            request.UserId, request.Authorization, cancellationToken);
        if (recipient is null)
            return new NotificationRecipientVerification(null, true, null);
        if (recipient.Role != "TENANT" ||
            !string.Equals(recipient.Email, request.ExpectedEmail, StringComparison.OrdinalIgnoreCase) ||
            request.LandlordId is not Guid landlordId)
            return new NotificationRecipientVerification(recipient, false, null);

        var hasLease = await lookup.HasTenantLeaseAsync(
            landlordId, request.UserId, request.Authorization, cancellationToken);
        return new NotificationRecipientVerification(recipient, false, hasLease);
    }
}
