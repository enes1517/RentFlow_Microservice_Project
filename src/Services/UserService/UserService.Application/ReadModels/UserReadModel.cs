namespace UserService.Application.ReadModels;

public sealed record UserReadModel(
    Guid Id,
    string IdentityId,
    string Email,
    string FirstName,
    string LastName,
    string Role,
    string? PhoneNumber,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public sealed record TenantLookupReadModel(Guid Id, string FirstName, string LastName, string Email);
