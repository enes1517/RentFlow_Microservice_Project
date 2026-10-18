using SharedKernel.Entities;

namespace NotificationService.Domain.Entities;

public class NotificationLog : BaseEntity
{
    public Guid UserId { get; private set; } // Hedef kullanıcı (Tenant/Landlord vb.)
    
    // Currently supported: EMAIL.
    public string Type { get; private set; } = string.Empty;
    
    public string Subject { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;
    
    public string Status { get; private set; } = "PENDING";
    
    public string? ErrorMessage { get; private set; }

    protected NotificationLog() { }

    public static NotificationLog Create(Guid userId, string type, string subject, string content)
    {
        return new NotificationLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            Subject = subject,
            Content = content,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void MarkAsFailed(string error)
    {
        Status = "FAILED";
        ErrorMessage = error;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAsSent()
    {
        Status = "SENT";
        ErrorMessage = null;
        UpdatedAt = DateTime.UtcNow;
    }
}
