using Microsoft.EntityFrameworkCore;
using ReportService.Application.Interfaces;
using ReportService.Application.ReadModels;
using ReportService.Infrastructure.Data;

namespace ReportService.Infrastructure.Repositories;

public sealed class ReportReadRepository(ReportDbContext context) : IReportReadRepository
{
    public async Task<IncomeReportQueryResult> GetIncomeByLandlordAsync(
        Guid landlordId,
        int year,
        CancellationToken cancellationToken = default)
    {
        var leaseIds = context.Leases.AsNoTracking()
            .Where(lease => lease.LandlordId == landlordId)
            .Select(lease => lease.LeaseId);
        var propertyIds = context.Properties.AsNoTracking()
            .Where(property => property.LandlordId == landlordId)
            .Select(property => property.PropertyId);
        var hasProjectedProperties = await propertyIds.AnyAsync(cancellationToken);

        var hasUnclassifiedRentCurrency = await context.Payments.AsNoTracking()
            .AnyAsync(payment => leaseIds.Contains(payment.LeaseId) &&
                payment.PaymentType == "RENT" && payment.Status == "SUCCESS" &&
                payment.OccurredAt.Year == year && payment.Currency == "UNKNOWN", cancellationToken);

        var paymentMonths = await context.Payments.AsNoTracking()
            .Where(payment => leaseIds.Contains(payment.LeaseId) &&
                payment.PaymentType == "RENT" && payment.Status == "SUCCESS" &&
                payment.Currency == "TRY" && payment.OccurredAt.Year == year)
            .GroupBy(payment => payment.OccurredAt.Month)
            .Select(group => new
            {
                Month = group.Key,
                Income = group.Sum(payment => payment.Amount),
                Count = group.Count()
            })
            .ToDictionaryAsync(month => month.Month, cancellationToken);

        var maintenanceMonths = await context.MaintenanceRequests.AsNoTracking()
            .Where(request => propertyIds.Contains(request.PropertyId) &&
                request.Status == "CLOSED" && request.EstimatedCost > 0 &&
                request.UpdatedAt.HasValue && request.UpdatedAt.Value.Year == year)
            .GroupBy(request => request.UpdatedAt!.Value.Month)
            .Select(group => new
            {
                Month = group.Key,
                Cost = group.Sum(request => request.EstimatedCost!.Value)
            })
            .ToDictionaryAsync(month => month.Month, cancellationToken);

        var months = Enumerable.Range(1, 12)
            .Select(month =>
            {
                paymentMonths.TryGetValue(month, out var payments);
                maintenanceMonths.TryGetValue(month, out var costs);
                return new IncomeReportMonthReadModel(
                    month,
                    payments?.Income ?? 0m,
                    costs?.Cost ?? 0m,
                    (payments?.Income ?? 0m) - (costs?.Cost ?? 0m),
                    payments?.Count ?? 0);
            })
            .ToArray();

        var totalIncome = months.Sum(month => month.ReceivedIncome);
        var totalMaintenanceCosts = months.Sum(month => month.EstimatedMaintenanceCosts);
        return new IncomeReportQueryResult(
            hasProjectedProperties,
            hasUnclassifiedRentCurrency,
            new AnnualIncomeReportReadModel(
                landlordId,
                year,
                "TRY",
                totalIncome,
                totalMaintenanceCosts,
                totalIncome - totalMaintenanceCosts,
                LateFeesTracked: false,
                months));
    }
}
