namespace SharedKernel.Security;

public sealed record CurrentUserProfile(
    Guid Id,
    string IdentityId,
    string Email,
    string Role);

public interface ICurrentUserProfileResolver
{
    Task<CurrentUserProfile> GetRequiredAsync(CancellationToken cancellationToken = default);
}
