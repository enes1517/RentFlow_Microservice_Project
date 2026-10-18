using SharedKernel.Entities;

namespace MaintenanceService.Domain.Entities;

public class MaintenanceRequest : BaseEntity
{
    public Guid TenantId { get; private set; }
    public Guid PropertyId { get; private set; }
    public Guid UnitId { get; private set; }
    
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    
    // Priority: LOW, MEDIUM, HIGH, CRITICAL
    public string Priority { get; private set; } = "LOW";
    
    // Status: OPEN, IN_PROGRESS, RESOLVED, CLOSED
    public string Status { get; private set; } = "OPEN";
    
    // Optional: Damage cost for LeaseTerminationSaga
    public decimal? EstimatedCost { get; private set; }

    protected MaintenanceRequest() { }

    public static MaintenanceRequest Create(Guid tenantId, Guid propertyId, Guid unitId, string title, string description, string priority)
    {
        if (tenantId == Guid.Empty || propertyId == Guid.Empty || unitId == Guid.Empty)
            throw new ArgumentException("Tenant, property, and unit IDs are required.");
        if (string.IsNullOrWhiteSpace(title) || title.Length > 150)
            throw new ArgumentException("A title of at most 150 characters is required.", nameof(title));
        if (string.IsNullOrWhiteSpace(description) || description.Length > 5000)
            throw new ArgumentException("A description of at most 5000 characters is required.", nameof(description));
        if (priority is not ("LOW" or "MEDIUM" or "HIGH" or "CRITICAL"))
            throw new ArgumentException("Maintenance priority is not supported.", nameof(priority));

        return new MaintenanceRequest
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            PropertyId = propertyId,
            UnitId = unitId,
            Title = title,
            Description = description,
            Priority = priority,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void UpdateStatus(string status, decimal? estimatedCost = null)
    {
        var allowed = Status switch
        {
            "OPEN" => status == "IN_PROGRESS",
            "IN_PROGRESS" => status is "RESOLVED" or "OPEN",
            "RESOLVED" => status == "CLOSED",
            _ => false
        };
        if (!allowed)
            throw new InvalidOperationException($"Status cannot transition from {Status} to {status}.");
        if (estimatedCost < 0)
            throw new ArgumentOutOfRangeException(nameof(estimatedCost), "Estimated cost cannot be negative.");

        Status = status;
        if (estimatedCost.HasValue)
        {
            EstimatedCost = estimatedCost;
        }
        UpdatedAt = DateTime.UtcNow;
    }
}
