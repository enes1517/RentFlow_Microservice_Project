using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ReportService.Infrastructure.Data;

public sealed class ReportDbContextFactory : IDesignTimeDbContextFactory<ReportDbContext>
{
    public ReportDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Server=localhost;Database=RentFlowReports;Trusted_Connection=True;TrustServerCertificate=True";
        var options = new DbContextOptionsBuilder<ReportDbContext>()
            .UseSqlServer(connectionString)
            .Options;
        return new ReportDbContext(options);
    }
}
