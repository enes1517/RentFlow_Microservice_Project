namespace ReportService.Application.ReadModels;

public sealed record MonthlyIncomeReportReadModel(
    Guid Id, Guid LandlordId, int Year, int Month, decimal TotalIncome,
    decimal TotalLateFees, decimal TotalMaintenanceCosts, decimal NetIncome, DateTime CreatedAt);
