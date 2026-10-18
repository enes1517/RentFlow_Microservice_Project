using SharedKernel.Common;

namespace ReportService.Application.Interfaces;

public interface IReportWriteRepository
{
    Task<CommandOutcome> CreateMonthlyIncomeReportAsync(
        Guid landlordId, int year, int month, decimal totalIncome, decimal totalLateFees,
        decimal maintenanceCosts, CancellationToken cancellationToken = default);
}
