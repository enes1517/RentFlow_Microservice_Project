using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SagaOrchestrator.API.Data;

public sealed class SagaDbContextFactory : IDesignTimeDbContextFactory<SagaDbContext>
{
    public SagaDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? throw new InvalidOperationException(
                "Set ConnectionStrings__DefaultConnection when creating Saga database migrations.");

        var options = new DbContextOptionsBuilder<SagaDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new SagaDbContext(options);
    }
}
