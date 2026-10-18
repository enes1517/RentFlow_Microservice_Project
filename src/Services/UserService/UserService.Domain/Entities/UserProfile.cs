using SharedKernel.Entities;

namespace UserService.Domain.Entities;

public class UserProfile : BaseEntity
{
    public string IdentityId { get; private set; } = string.Empty; // Keycloak Subject (sub)
    public string Email { get; private set; } = string.Empty;
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string Role { get; private set; } = string.Empty; // TENANT, LANDLORD, ADMIN
    public string? PhoneNumber { get; private set; }
    public string? IdentityNumber { get; private set; } // TCKN veya Pasaport
    public bool IsActive { get; private set; } = true;

    protected UserProfile() { } // For EF Core

    public static UserProfile Create(string identityId, string email, string firstName, string lastName, string role, string? phoneNumber, string? identityNumber)
    {
        if (string.IsNullOrWhiteSpace(identityId))
            throw new ArgumentException("An identity-provider subject is required.", nameof(identityId));
        ValidateEmail(email);
        ValidateRole(role);

        return new UserProfile
        {
            Id = Guid.NewGuid(),
            IdentityId = identityId,
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            Role = role,
            PhoneNumber = phoneNumber,
            IdentityNumber = identityNumber,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void UpdateProfile(string email, string firstName, string lastName, string role, string? phoneNumber)
    {
        ValidateEmail(email);
        ValidateRole(role);

        Email = email;
        FirstName = firstName;
        LastName = lastName;
        Role = role;
        PhoneNumber = phoneNumber;
        UpdatedAt = DateTime.UtcNow;
    }

    private static void ValidateEmail(string email)
    {
        if (!System.Net.Mail.MailAddress.TryCreate(email, out _))
            throw new ArgumentException("A valid email address is required.", nameof(email));
    }

    private static void ValidateRole(string role)
    {
        if (role is not ("ADMIN" or "LANDLORD" or "TENANT" or "USER"))
            throw new ArgumentException("The user role is not supported.", nameof(role));
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }
}
