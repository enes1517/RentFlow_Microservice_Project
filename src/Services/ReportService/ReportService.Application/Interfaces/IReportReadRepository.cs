using ReportService.Application.ReadModels;

namespace ReportService.Application.Interfaces;

public interface IReportReadRepository
{
    Task<IncomeReportQueryResult> GetIncomeByLandlordAsync(
        Guid landlordId,
        int year,
        CancellationToken cancellationToken = default);
}
