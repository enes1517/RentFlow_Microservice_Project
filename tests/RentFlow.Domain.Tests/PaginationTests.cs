using SharedKernel.Common;

namespace RentFlow.Domain.Tests;

public sealed class PaginationTests
{
    [Fact]
    public void PagedQueryUsesStandardDefaults()
    {
        var pagination = new PagedQuery();

        Assert.Equal(1, pagination.Page);
        Assert.Equal(50, pagination.PageSize);
        Assert.Equal(0, pagination.Skip);
        Assert.True(pagination.IsValid);
    }

    [Theory]
    [InlineData(1, 1, true)]
    [InlineData(1, 100, true)]
    [InlineData(0, 50, false)]
    [InlineData(1, 0, false)]
    [InlineData(1, 101, false)]
    [InlineData(42949674, 50, false)]
    public void PagedQueryValidatesBoundsAndSafeSkip(int page, int pageSize, bool isValid)
    {
        Assert.Equal(isValid, new PagedQuery(page, pageSize).IsValid);
    }

    [Fact]
    public void PagedResultCalculatesTotalPages()
    {
        var result = PagedResult<string>.Create(["first"], 101, 2, 50);

        Assert.Equal(3, result.TotalPages);
        Assert.True(result.HasPreviousPage);
        Assert.True(result.HasNextPage);
    }
}
