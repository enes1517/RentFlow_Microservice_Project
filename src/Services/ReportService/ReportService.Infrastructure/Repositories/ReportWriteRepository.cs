using ReportService.Application.Interfaces;
using ReportService.Domain.Entities;
using ReportService.Infrastructure.Data;
using SharedKernel.Common;

namespace ReportService.Infrastructure.Repositories;

public sealed class ReportWriteRepository(ReportDbContext context) : IReportWriteRepository
{
    public async Task<CommandOutcome> CreateMonthlyIncomeReportAsync(
        Guid landlordId, int year, int month, decimal totalIncome, decimal totalLateFees,
        decimal maintenanceCosts, CancellationToken cancellationToken = default)
    {
        var report = MonthlyIncomeReport.Create(landlordId, year, month, totalIncome, totalLateFees, maintenanceCosts);
        context.MonthlyIncomeReports.Add(report);
        await context.SaveChangesAsync(cancellationToken);
        return new CommandOutcome(report.Id, "CREATED");
    }
}
