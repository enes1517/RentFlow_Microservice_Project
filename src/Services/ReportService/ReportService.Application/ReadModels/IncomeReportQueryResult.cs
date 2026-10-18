namespace ReportService.Application.ReadModels;

public sealed record IncomeReportQueryResult(
    bool HasProjectedProperties,
    bool HasUnclassifiedRentCurrency,
    AnnualIncomeReportReadModel Report);

public sealed record AnnualIncomeReportReadModel(
    Guid LandlordId,
    int Year,
    string Currency,
    decimal TotalReceivedIncome,
    decimal TotalEstimatedMaintenanceCosts,
    decimal NetAfterEstimatedMaintenance,
    bool LateFeesTracked,
    IReadOnlyList<IncomeReportMonthReadModel> Months);

public sealed record IncomeReportMonthReadModel(
    int Month,
    decimal ReceivedIncome,
    decimal EstimatedMaintenanceCosts,
    decimal NetAfterEstimatedMaintenance,
    int PaymentCount);
