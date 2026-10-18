using LeaseService.Application.Interfaces;
using LeaseService.Application.Queries;

namespace RentFlow.Application.Tests;

public sealed class LeaseCreationVerificationTests
{
    private static readonly Guid TenantId = Guid.NewGuid();
    private static readonly Guid LandlordId = Guid.NewGuid();
    private static readonly Guid PropertyId = Guid.NewGuid();
    private static readonly Guid UnitId = Guid.NewGuid();

    [Fact]
    public async Task Handle_RejectsNonTenantWithoutRequestingProperty()
    {
        var lookup = new FakeLeaseServiceLookup
        {
            UserRole = new UserRoleLookup(TenantId, "LANDLORD")
        };

        var result = await CreateHandler(lookup).Handle(
            CreateQuery(), CancellationToken.None);

        Assert.Equal(LeaseCreationVerificationFailure.TenantIsNotTenant, result.Failure);
        Assert.Equal(0, lookup.PropertyCalls);
    }

    [Fact]
    public async Task Handle_RejectsPropertyOwnedByAnotherLandlord()
    {
        var lookup = new FakeLeaseServiceLookup
        {
            UserRole = new UserRoleLookup(TenantId, "TENANT"),
            Property = new PropertyLeaseLookup(
                Guid.NewGuid(),
                [new LeaseUnitLookup(UnitId, 1200m, "TRY", "AVAILABLE")])
        };

        var result = await CreateHandler(lookup).Handle(
            CreateQuery(), CancellationToken.None);

        Assert.Equal(LeaseCreationVerificationFailure.LandlordMismatch, result.Failure);
    }

    [Fact]
    public async Task Handle_UsesAvailableTryUnitRent()
    {
        var result = await CreateHandler(ValidLookup()).Handle(
            CreateQuery(), CancellationToken.None);

        Assert.Equal(LeaseCreationVerificationFailure.None, result.Failure);
        Assert.Equal(1200m, result.MonthlyRentAmount);
    }

    private static VerifyLeaseCreationQuery CreateQuery() =>
        new(TenantId, PropertyId, UnitId, LandlordId, "Bearer token");

    private static VerifyLeaseCreationQueryHandler CreateHandler(FakeLeaseServiceLookup lookup) => new(lookup);

    private static FakeLeaseServiceLookup ValidLookup() => new()
    {
        UserRole = new UserRoleLookup(TenantId, "TENANT"),
        Property = new PropertyLeaseLookup(
            LandlordId,
            [new LeaseUnitLookup(UnitId, 1200m, "TRY", "AVAILABLE")])
    };

    private sealed class FakeLeaseServiceLookup : ILeaseServiceLookup
    {
        public UserRoleLookup? UserRole { get; init; }
        public PropertyLeaseLookup? Property { get; init; }
        public int PropertyCalls { get; private set; }

        public Task<UserRoleLookup?> GetUserRoleAsync(
            Guid userId, string authorization, CancellationToken cancellationToken) =>
            Task.FromResult(UserRole);

        public Task<PropertyLeaseLookup?> GetPropertyAsync(
            Guid propertyId, string authorization, CancellationToken cancellationToken)
        {
            PropertyCalls++;
            return Task.FromResult(Property);
        }
    }
}
