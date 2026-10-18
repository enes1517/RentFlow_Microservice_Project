using ReportService.Domain.Entities;

namespace RentFlow.Domain.Tests;

public sealed class ReportProjectionTests
{
    [Fact]
    public void Duplicate_property_event_is_idempotent_and_stale_event_is_ignored()
    {
        var propertyId = Guid.NewGuid();
        var landlordId = Guid.NewGuid();
        var changedAt = new DateTime(2026, 10, 1, 10, 0, 0, DateTimeKind.Utc);
        var projection = PropertyReportProjection.Create(propertyId, landlordId, changedAt);

        projection.Update(landlordId, changedAt);
        projection.Update(Guid.NewGuid(), changedAt.AddMinutes(-1));

        Assert.Equal(propertyId, projection.PropertyId);
        Assert.Equal(landlordId, projection.LandlordId);
        Assert.Equal(changedAt, projection.ChangedAt);
    }

    [Fact]
    public void Newer_maintenance_event_updates_projected_values_once()
    {
        var id = Guid.NewGuid();
        var propertyId = Guid.NewGuid();
        var createdAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var updatedAt = createdAt.AddDays(1);
        var projection = MaintenanceReportProjection.Create(id, propertyId, "IN_PROGRESS", null, createdAt, null);

        projection.Update("CLOSED", 125m, createdAt, updatedAt);
        projection.Update("IN_PROGRESS", null, createdAt, createdAt);

        Assert.Equal(id, projection.MaintenanceId);
        Assert.Equal(propertyId, projection.PropertyId);
        Assert.Equal("CLOSED", projection.Status);
        Assert.Equal(125m, projection.EstimatedCost);
        Assert.Equal(updatedAt, projection.UpdatedAt);
    }

    [Fact]
    public void Repeated_payment_event_does_not_duplicate_or_change_amount()
    {
        var paymentId = Guid.NewGuid();
        var leaseId = Guid.NewGuid();
        var occurredAt = new DateTime(2026, 8, 15, 12, 0, 0, DateTimeKind.Utc);
        var projection = PaymentReportProjection.Create(paymentId, leaseId, 100m, "RENT", "SUCCESS", occurredAt, "TRY");

        projection.Update("SUCCESS", occurredAt, "TRY");
        projection.Update("FAILED", occurredAt.AddMinutes(-1), "USD");

        Assert.Equal(paymentId, projection.PaymentId);
        Assert.Equal(leaseId, projection.LeaseId);
        Assert.Equal(100m, projection.Amount);
        Assert.Equal("SUCCESS", projection.Status);
        Assert.Equal("TRY", projection.Currency);
        Assert.Equal(occurredAt, projection.OccurredAt);
    }
}
