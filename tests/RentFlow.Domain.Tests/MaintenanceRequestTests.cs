using MaintenanceService.Domain.Entities;

namespace RentFlow.Domain.Tests;

public sealed class MaintenanceRequestTests
{
    [Fact]
    public void StatusMustFollowAllowedTransitions()
    {
        var request = MaintenanceRequest.Create(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "Leak", "Kitchen sink is leaking.", "HIGH");

        Assert.Throws<InvalidOperationException>(() => request.UpdateStatus("RESOLVED"));
        request.UpdateStatus("IN_PROGRESS");
        request.UpdateStatus("RESOLVED", 200);
        request.UpdateStatus("CLOSED");
        Assert.Equal("CLOSED", request.Status);
        Assert.Equal(200, request.EstimatedCost);
    }

    [Fact]
    public void CreateRejectsUnsupportedPriority()
    {
        Assert.Throws<ArgumentException>(() =>
            MaintenanceRequest.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "Issue", "Details", "URGENT"));
    }
}
