using PropertyService.Domain.Entities;

namespace RentFlow.Domain.Tests;

public sealed class PropertyTests
{
    [Fact]
    public void CreateRequiresAddressAndLandlord()
    {
        Assert.Throws<ArgumentException>(() =>
            Property.Create("Home", "", Guid.Empty, new Address { Street = "1", City = "A", Country = "TR" }));
        Assert.Throws<ArgumentException>(() =>
            Property.Create("Home", "", Guid.NewGuid(), new Address()));
    }

    [Fact]
    public void AddUnitRejectsDuplicateUnitNumberIgnoringCase()
    {
        var property = Property.Create("Home", "", Guid.NewGuid(),
            new Address { Street = "1", City = "A", Country = "TR" });
        property.AddUnit(Unit.Create("A-1", 1, 80, 1000, "TRY"));

        Assert.Throws<InvalidOperationException>(() =>
            property.AddUnit(Unit.Create("a-1", 2, 90, 1200, "TRY")));
    }
}
